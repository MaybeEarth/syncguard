import { RequestItem, StorageAdapter } from './types';

export class RequestQueue {
  private queue: RequestItem[] = [];
  private isInitialized = false;

  constructor(
    private storageKey: string,
    private storageAdapter: StorageAdapter
  ) {}

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      const data = await this.storageAdapter.getItem(this.storageKey);
      if (data) {
        this.queue = JSON.parse(data);
      }
    } catch (e) {
      console.error('SyncGuard: Failed to load queue from storage', e);
      this.queue = [];
    } finally {
      this.isInitialized = true;
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await this.storageAdapter.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (e) {
      console.error('SyncGuard: Failed to save queue to storage', e);
    }
  }

  public async enqueue(request: RequestItem): Promise<void> {
    this.queue.push(request);
    await this.saveQueue();
  }

  public async dequeue(): Promise<RequestItem | undefined> {
    const item = this.queue.shift();
    if (item) {
      await this.saveQueue();
    }
    return item;
  }

  public async pushBack(request: RequestItem): Promise<void> {
    this.queue.push(request);
    await this.saveQueue();
  }

  public getItems(): RequestItem[] {
    return [...this.queue];
  }

  public get length(): number {
    return this.queue.length;
  }
}
