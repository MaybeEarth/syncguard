export const generateSWCode = (storageKey: string = 'syncguard_offline_queue') => `
// SyncGuard Service Worker for Background Sync
// This file handles syncing queued requests even if the browser tab is closed.

const STORAGE_KEY = '${storageKey}';
const STORE_NAME = 'offline_requests';
const DB_NAME = 'SyncGuardDB';

function getDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

function getItem(db, key) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function setItem(db, key, value) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

self.addEventListener('sync', (event) => {
    if (event.tag === 'syncguard-sync') {
        event.waitUntil(processQueue());
    }
});

async function processQueue() {
    try {
        const db = await getDB();
        const data = await getItem(db, STORAGE_KEY);
        if (!data) return;

        let queue = JSON.parse(data);
        if (queue.length === 0) return;

        const completedIds = [];

        for (const item of queue) {
            try {
                const response = await fetch(item.url, item.options);
                if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 408)) {
                    completedIds.push(item.id);
                } else {
                     item.retryCount = (item.retryCount || 0) + 1;
                }
            } catch (err) {
                 item.retryCount = (item.retryCount || 0) + 1;
            }
        }

        queue = queue.filter(item => !completedIds.includes(item.id) && item.retryCount < 5);
        await setItem(db, STORAGE_KEY, JSON.stringify(queue));

    } catch (e) {
        console.error('SyncGuard SW: Error processing queue', e);
    }
}
`;
