import { RequestItem, StorageAdapter } from './types';
export declare class RequestQueue {
    private storageKey;
    private storageAdapter;
    private queue;
    private isInitialized;
    constructor(storageKey: string, storageAdapter: StorageAdapter);
    init(): Promise<void>;
    private saveQueue;
    enqueue(request: RequestItem): Promise<void>;
    dequeue(): Promise<RequestItem | undefined>;
    pushBack(request: RequestItem): Promise<void>;
    getItems(): RequestItem[];
    get length(): number;
}
//# sourceMappingURL=queue.d.ts.map