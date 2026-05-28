import { SyncGuardOptions, RequestItem } from './types';
import { IndexedDBAdapter } from './idb-storage';
import { NetworkListener } from './network';
import { RequestQueue } from './queue';
import { SyncGuardUI } from './ui';
import { FetchInterceptor } from './interceptor';
import { generateSWCode } from './sw-template';

export class SyncGuard {
  private options: Required<Omit<SyncGuardOptions, 'onSyncSuccess' | 'onSyncError' | 'onStatusChange' | 'onConflict'>> & 
    Pick<SyncGuardOptions, 'onSyncSuccess' | 'onSyncError' | 'onStatusChange' | 'onConflict'>;
  
  private network: NetworkListener;
  private queue: RequestQueue;
  private ui: SyncGuardUI | null = null;
  private interceptor: FetchInterceptor | null = null;
  private isProcessing = false;

  constructor(options: SyncGuardOptions = {}) {
    this.options = {
      showUI: options.showUI ?? true,
      retryCount: options.retryCount ?? 3,
      storageKey: options.storageKey ?? 'syncguard_offline_queue',
      storageAdapter: options.storageAdapter ?? new IndexedDBAdapter(),
      autoIntercept: options.autoIntercept ?? false,
      onSyncSuccess: options.onSyncSuccess,
      onSyncError: options.onSyncError,
      onStatusChange: options.onStatusChange,
      onConflict: options.onConflict,
    };

    this.queue = new RequestQueue(this.options.storageKey, this.options.storageAdapter);
    
    if (this.options.showUI) {
      this.ui = new SyncGuardUI();
    }

    if (this.options.autoIntercept) {
        this.interceptor = new FetchInterceptor(this);
        this.interceptor.enable();
    }

    this.network = new NetworkListener();
    this.network.subscribe(this.handleStatusChange.bind(this));

    this.init();
  }

  private async init() {
    await this.queue.init();
    
    // Check initial state
    if (!this.network.isCurrentlyOnline) {
      this.ui?.showOffline();
    } else if (this.queue.length > 0) {
      // If we start online and have items, process them
      this.processQueue();
    }
  }

  private handleStatusChange(isOnline: boolean) {
    if (this.options.onStatusChange) {
      this.options.onStatusChange(isOnline);
    }

    if (isOnline) {
      this.ui?.hide();
      this.processQueue();
    } else {
      this.ui?.showOffline();
      this.requestBackgroundSync();
    }
  }

  public get isCurrentlyOnline() {
      return this.network.isCurrentlyOnline;
  }

  public async executeRequest(url: string, options?: RequestInit): Promise<Response | void> {
    if (this.network.isCurrentlyOnline) {
      try {
        // Since we might have monkey-patched fetch, we should use the original one if we are calling it internally?
        // Actually executeRequest is called by the user or interceptor.
        // Wait, if FetchInterceptor calls executeRequest, and executeRequest calls fetch, it will loop if not careful!
        // We need to ensure we don't loop. The FetchInterceptor only intercepts if it's the global fetch. 
        // But if executeRequest calls fetch, it might trigger the interceptor again!
        // Let's use window.fetch but we need to disable interceptor temporarily or use original fetch.
        // In this architecture, it's safer to just let it call fetch, but interceptor MUST NOT intercept if we are in executeRequest, OR executeRequest uses originalFetch.
        // Since zero-dependency, let's just assume we rely on try/catch.
        
        // However, to prevent looping, we can use a flag or just assume native fetch behavior.
        // If autoIntercept is on, fetch is patched. We must bypass it.
        const globalObj = typeof window !== 'undefined' ? window : null;
        let originalFetch = globalObj?.fetch;
        if (this.interceptor && (this.interceptor as any).originalFetch) {
             originalFetch = (this.interceptor as any).originalFetch;
        }

        const fetchFn = originalFetch || fetch;

        return await fetchFn(url, options);
      } catch (error) {
        // Fallback to queue
        return this.enqueueRequest(url, options);
      }
    } else {
      return this.enqueueRequest(url, options);
    }
  }

  private async enqueueRequest(url: string, options?: RequestInit): Promise<void> {
    const item: RequestItem = {
      id: this.generateId(),
      url,
      options,
      timestamp: Date.now(),
      retryCount: 0
    };

    await this.queue.init();
    await this.queue.enqueue(item);
    
    if (this.options.showUI && !this.network.isCurrentlyOnline) {
      this.ui?.showOffline();
    }
    this.requestBackgroundSync();
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0 || !this.network.isCurrentlyOnline) {
      return;
    }

    this.isProcessing = true;
    const totalItems = this.queue.length;
    let processedCount = 0;
    const completedRequests: RequestItem[] = [];

    if (this.options.showUI) {
      this.ui?.showSyncing(processedCount, totalItems);
    }

    const globalObj = typeof window !== 'undefined' ? window : null;
    let originalFetch = globalObj?.fetch;
    if (this.interceptor && (this.interceptor as any).originalFetch) {
        originalFetch = (this.interceptor as any).originalFetch;
    }
    const fetchFn = originalFetch || fetch;

    while (this.queue.length > 0 && this.network.isCurrentlyOnline) {
      const item = await this.queue.dequeue();
      if (!item) break;

      try {
        const response = await fetchFn(item.url, item.options);
        
        if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 409)) {
          // Success or Client Error
          completedRequests.push(item);
        } else if (response.status === 409 && this.options.onConflict) {
            // Conflict Resolution Phase
            await this.options.onConflict(item, response.clone());
            completedRequests.push(item); // Assume handled by onConflict
        } else {
          // Server error or timeout
          throw new Error(`Server returned status ${response.status}`);
        }
      } catch (error) {
        item.retryCount++;
        
        if (this.options.onSyncError) {
          this.options.onSyncError(error, item);
        }

        if (item.retryCount < this.options.retryCount) {
          await this.queue.pushBack(item);
        } else {
          console.error(`SyncGuard: Request ${item.id} exceeded retry limit and was dropped.`, error);
        }
      }

      processedCount++;
      if (this.options.showUI && this.network.isCurrentlyOnline && this.queue.length > 0) {
        this.ui?.showSyncing(processedCount, totalItems);
      }
    }

    this.isProcessing = false;

    if (completedRequests.length > 0) {
      if (this.options.onSyncSuccess) {
        this.options.onSyncSuccess(completedRequests);
      }
      
      if (this.options.showUI && this.network.isCurrentlyOnline && this.queue.length === 0) {
        this.ui?.showSuccess();
      }
    } else {
      if (this.options.showUI && this.queue.length === 0) {
         this.ui?.hide();
      }
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
  }

  private async requestBackgroundSync() {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
          try {
              const registration = await navigator.serviceWorker.ready;
              await (registration as any).sync.register('syncguard-sync');
          } catch (e) {
              // Background sync failed to register, not critical
          }
      }
  }

  public getSWCode(): string {
      return generateSWCode(this.options.storageKey);
  }

  public destroy() {
    this.network.destroy();
    this.ui?.destroy();
    this.interceptor?.disable();
  }
}

export * from './types';
