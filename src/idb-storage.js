var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class IndexedDBAdapter {
    constructor() {
        this.dbName = 'SyncGuardDB';
        this.storeName = 'offline_requests';
        this.db = null;
    }
    getDB() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.db)
                return this.db;
            return new Promise((resolve, reject) => {
                // Return null immediately if indexedDB is not available (e.g. Node/SSR environment)
                if (typeof indexedDB === 'undefined') {
                    return reject(new Error('indexedDB is not defined'));
                }
                const request = indexedDB.open(this.dbName, 1);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    this.db = request.result;
                    resolve(this.db);
                };
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        db.createObjectStore(this.storeName);
                    }
                };
            });
        });
    }
    getItem(key) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const db = yield this.getDB();
                return new Promise((resolve, reject) => {
                    const tx = db.transaction(this.storeName, 'readonly');
                    const store = tx.objectStore(this.storeName);
                    const request = store.get(key);
                    request.onsuccess = () => resolve(request.result || null);
                    request.onerror = () => reject(request.error);
                });
            }
            catch (e) {
                console.warn('SyncGuard: IndexedDB getItem failed. Fallback might be needed.', e);
                return null;
            }
        });
    }
    setItem(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const db = yield this.getDB();
                return new Promise((resolve, reject) => {
                    const tx = db.transaction(this.storeName, 'readwrite');
                    const store = tx.objectStore(this.storeName);
                    const request = store.put(value, key);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }
            catch (e) {
                console.warn('SyncGuard: IndexedDB setItem failed.', e);
            }
        });
    }
}
