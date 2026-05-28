export interface RequestItem {
    id: string;
    url: string;
    options?: RequestInit;
    timestamp: number;
    retryCount: number;
}
export interface StorageAdapter {
    getItem(key: string): string | null | Promise<string | null>;
    setItem(key: string, value: string): void | Promise<void>;
}
export interface SyncGuardOptions {
    showUI?: boolean;
    retryCount?: number;
    storageKey?: string;
    storageAdapter?: StorageAdapter;
    onSyncSuccess?: (completedRequests: RequestItem[]) => void;
    onSyncError?: (error: any, request: RequestItem) => void;
    onStatusChange?: (isOnline: boolean) => void;
}
export type SyncStatus = 'online' | 'offline' | 'syncing';
//# sourceMappingURL=types.d.ts.map