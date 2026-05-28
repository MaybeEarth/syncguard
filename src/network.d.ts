export declare class NetworkListener {
    private isOnline;
    private listeners;
    constructor();
    private handleOnline;
    private handleOffline;
    private notifyListeners;
    subscribe(listener: (isOnline: boolean) => void): () => void;
    get isCurrentlyOnline(): boolean;
    destroy(): void;
}
//# sourceMappingURL=network.d.ts.map