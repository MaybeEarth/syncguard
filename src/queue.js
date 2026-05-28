var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class RequestQueue {
    constructor(storageKey, storageAdapter) {
        this.storageKey = storageKey;
        this.storageAdapter = storageAdapter;
        this.queue = [];
        this.isInitialized = false;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isInitialized)
                return;
            try {
                const data = yield this.storageAdapter.getItem(this.storageKey);
                if (data) {
                    this.queue = JSON.parse(data);
                }
            }
            catch (e) {
                console.error('SyncGuard: Failed to load queue from storage', e);
                this.queue = [];
            }
            finally {
                this.isInitialized = true;
            }
        });
    }
    saveQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.storageAdapter.setItem(this.storageKey, JSON.stringify(this.queue));
            }
            catch (e) {
                console.error('SyncGuard: Failed to save queue to storage', e);
            }
        });
    }
    enqueue(request) {
        return __awaiter(this, void 0, void 0, function* () {
            this.queue.push(request);
            yield this.saveQueue();
        });
    }
    dequeue() {
        return __awaiter(this, void 0, void 0, function* () {
            const item = this.queue.shift();
            if (item) {
                yield this.saveQueue();
            }
            return item;
        });
    }
    pushBack(request) {
        return __awaiter(this, void 0, void 0, function* () {
            this.queue.push(request);
            yield this.saveQueue();
        });
    }
    getItems() {
        return [...this.queue];
    }
    get length() {
        return this.queue.length;
    }
}
