export class LocalStorageAdapter {
    getItem(key) {
        try {
            return localStorage.getItem(key);
        }
        catch (e) {
            console.warn('SyncGuard: localStorage is not available.', e);
            return null;
        }
    }
    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
        }
        catch (e) {
            console.warn('SyncGuard: localStorage is not available.', e);
        }
    }
}
