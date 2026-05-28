var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { IndexedDBAdapter } from './idb-storage';
import { NetworkListener } from './network';
import { RequestQueue } from './queue';
import { SyncGuardUI } from './ui';
import { FetchInterceptor } from './interceptor';
import { generateSWCode } from './sw-template';
export class SyncGuard {
    constructor(options = {}) {
        var _a, _b, _c, _d, _e;
        this.ui = null;
        this.interceptor = null;
        this.isProcessing = false;
        this.options = {
            showUI: (_a = options.showUI) !== null && _a !== void 0 ? _a : true,
            retryCount: (_b = options.retryCount) !== null && _b !== void 0 ? _b : 3,
            storageKey: (_c = options.storageKey) !== null && _c !== void 0 ? _c : 'syncguard_offline_queue',
            storageAdapter: (_d = options.storageAdapter) !== null && _d !== void 0 ? _d : new IndexedDBAdapter(),
            autoIntercept: (_e = options.autoIntercept) !== null && _e !== void 0 ? _e : false,
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
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield this.queue.init();
            // Check initial state
            if (!this.network.isCurrentlyOnline) {
                (_a = this.ui) === null || _a === void 0 ? void 0 : _a.showOffline();
            }
            else if (this.queue.length > 0) {
                // If we start online and have items, process them
                this.processQueue();
            }
        });
    }
    handleStatusChange(isOnline) {
        var _a, _b;
        if (this.options.onStatusChange) {
            this.options.onStatusChange(isOnline);
        }
        if (isOnline) {
            (_a = this.ui) === null || _a === void 0 ? void 0 : _a.hide();
            this.processQueue();
        }
        else {
            (_b = this.ui) === null || _b === void 0 ? void 0 : _b.showOffline();
            this.requestBackgroundSync();
        }
    }
    get isCurrentlyOnline() {
        return this.network.isCurrentlyOnline;
    }
    executeRequest(url, options) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    let originalFetch = globalObj === null || globalObj === void 0 ? void 0 : globalObj.fetch;
                    if (this.interceptor && this.interceptor.originalFetch) {
                        originalFetch = this.interceptor.originalFetch;
                    }
                    const fetchFn = originalFetch || fetch;
                    return yield fetchFn(url, options);
                }
                catch (error) {
                    // Fallback to queue
                    return this.enqueueRequest(url, options);
                }
            }
            else {
                return this.enqueueRequest(url, options);
            }
        });
    }
    enqueueRequest(url, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const item = {
                id: this.generateId(),
                url,
                options,
                timestamp: Date.now(),
                retryCount: 0
            };
            yield this.queue.init();
            yield this.queue.enqueue(item);
            if (this.options.showUI && !this.network.isCurrentlyOnline) {
                (_a = this.ui) === null || _a === void 0 ? void 0 : _a.showOffline();
            }
            this.requestBackgroundSync();
        });
    }
    processQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            if (this.isProcessing || this.queue.length === 0 || !this.network.isCurrentlyOnline) {
                return;
            }
            this.isProcessing = true;
            const totalItems = this.queue.length;
            let processedCount = 0;
            const completedRequests = [];
            if (this.options.showUI) {
                (_a = this.ui) === null || _a === void 0 ? void 0 : _a.showSyncing(processedCount, totalItems);
            }
            const globalObj = typeof window !== 'undefined' ? window : null;
            let originalFetch = globalObj === null || globalObj === void 0 ? void 0 : globalObj.fetch;
            if (this.interceptor && this.interceptor.originalFetch) {
                originalFetch = this.interceptor.originalFetch;
            }
            const fetchFn = originalFetch || fetch;
            while (this.queue.length > 0 && this.network.isCurrentlyOnline) {
                const item = yield this.queue.dequeue();
                if (!item)
                    break;
                try {
                    const response = yield fetchFn(item.url, item.options);
                    if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 409)) {
                        // Success or Client Error
                        completedRequests.push(item);
                    }
                    else if (response.status === 409 && this.options.onConflict) {
                        // Conflict Resolution Phase
                        yield this.options.onConflict(item, response.clone());
                        completedRequests.push(item); // Assume handled by onConflict
                    }
                    else {
                        // Server error or timeout
                        throw new Error(`Server returned status ${response.status}`);
                    }
                }
                catch (error) {
                    item.retryCount++;
                    if (this.options.onSyncError) {
                        this.options.onSyncError(error, item);
                    }
                    if (item.retryCount < this.options.retryCount) {
                        yield this.queue.pushBack(item);
                    }
                    else {
                        console.error(`SyncGuard: Request ${item.id} exceeded retry limit and was dropped.`, error);
                    }
                }
                processedCount++;
                if (this.options.showUI && this.network.isCurrentlyOnline && this.queue.length > 0) {
                    (_b = this.ui) === null || _b === void 0 ? void 0 : _b.showSyncing(processedCount, totalItems);
                }
            }
            this.isProcessing = false;
            if (completedRequests.length > 0) {
                if (this.options.onSyncSuccess) {
                    this.options.onSyncSuccess(completedRequests);
                }
                if (this.options.showUI && this.network.isCurrentlyOnline && this.queue.length === 0) {
                    (_c = this.ui) === null || _c === void 0 ? void 0 : _c.showSuccess();
                }
            }
            else {
                if (this.options.showUI && this.queue.length === 0) {
                    (_d = this.ui) === null || _d === void 0 ? void 0 : _d.hide();
                }
            }
        });
    }
    generateId() {
        return Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    }
    requestBackgroundSync() {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
                try {
                    const registration = yield navigator.serviceWorker.ready;
                    yield registration.sync.register('syncguard-sync');
                }
                catch (e) {
                    // Background sync failed to register, not critical
                }
            }
        });
    }
    getSWCode() {
        return generateSWCode(this.options.storageKey);
    }
    destroy() {
        var _a, _b;
        this.network.destroy();
        (_a = this.ui) === null || _a === void 0 ? void 0 : _a.destroy();
        (_b = this.interceptor) === null || _b === void 0 ? void 0 : _b.disable();
    }
}
export * from './types';
