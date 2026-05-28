import { SyncGuardOptions } from './types';
export declare class SyncGuard {
    private options;
    private network;
    private queue;
    private ui;
    private isProcessing;
    constructor(options?: SyncGuardOptions);
    private init;
    private handleStatusChange;
    executeRequest(url: string, options?: RequestInit): Promise<Response | void>;
    private enqueueRequest;
    private processQueue;
    private generateId;
    destroy(): void;
}
export * from './types';
//# sourceMappingURL=index.d.ts.map