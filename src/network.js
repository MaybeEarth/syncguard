export class NetworkListener {
    constructor() {
        this.listeners = new Set();
        this.handleOnline = () => {
            this.isOnline = true;
            this.notifyListeners();
        };
        this.handleOffline = () => {
            this.isOnline = false;
            this.notifyListeners();
        };
        this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        if (typeof window !== 'undefined') {
            window.addEventListener('online', this.handleOnline);
            window.addEventListener('offline', this.handleOffline);
        }
    }
    notifyListeners() {
        this.listeners.forEach((listener) => listener(this.isOnline));
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    get isCurrentlyOnline() {
        return this.isOnline;
    }
    destroy() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.handleOnline);
            window.removeEventListener('offline', this.handleOffline);
        }
        this.listeners.clear();
    }
}
