import { StorageAdapter } from './types';

export class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('SyncGuard: localStorage is not available.', e);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('SyncGuard: localStorage is not available.', e);
    }
  }
}
