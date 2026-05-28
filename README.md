# SyncGuard 🛡️

A zero-dependency, framework-agnostic TypeScript/JavaScript SDK that makes your web and mobile applications resilient to network outages. It automatically queues failed or offline API requests (using `fetch` or `XHR`) and syncs them seamlessly when the connection is restored.

## Features ✨

- **Zero Dependencies:** Extremely lightweight (~5KB). No need for large libraries like Redux Offline or Workbox if you just want simple request queuing.
- **Auto Intercept:** Optionally overrides `window.fetch` and `XMLHttpRequest` to automatically queue requests without changing your existing codebase.
- **Asynchronous Storage:** Uses **IndexedDB** by default to prevent blocking the main thread (with fallback capabilities).
- **Background Sync:** Generates a Service Worker script to ensure queued requests are synced even if the user closes the browser tab.
- **Conflict Resolution:** Built-in hooks (`onConflict`) to handle HTTP 409 (Conflict) scenarios when syncing local and remote data.
- **Built-in Toast UI:** (Optional) Beautiful, zero-CSS-dependency toast notifications that alert users when they are offline, syncing, or successfully synced.
- **Framework Agnostic:** Works perfectly with Vanilla JS, React, Vue, Angular, Svelte, or React Native (by providing a custom storage adapter).

## Installation 📦

```bash
npm install syncguard
# or
yarn add syncguard
# or
pnpm add syncguard
```

## Quick Start 🚀

### 1. The Automatic Way (Interceptor)

The easiest way to use SyncGuard is to enable `autoIntercept`. It will automatically catch all `fetch` and `XHR` requests when the user goes offline.

```typescript
import { SyncGuard } from 'syncguard';

const syncGuard = new SyncGuard({
  showUI: true, // Shows the built-in offline/sync toast
  autoIntercept: true, // Automatically intercepts fetch/XHR
  onSyncSuccess: (completed) => {
    console.log('Successfully synced:', completed);
  },
  onSyncError: (error, request) => {
    console.error('Failed to sync request:', request, error);
  }
});

// Just write your normal fetch code. 
// If the user is offline, this is automatically queued and fake-resolved!
fetch('/api/users', {
  method: 'POST',
  body: JSON.stringify({ name: 'Alice' })
}).then(res => {
  if (res.status === 202) {
    console.log("Optimistic UI: Request was queued for later!");
  }
});
```

### 2. The Manual Way

If you prefer explicit control over which requests are queued, disable `autoIntercept` and use `executeRequest`:

```typescript
import { SyncGuard } from 'syncguard';

const syncGuard = new SyncGuard({ autoIntercept: false });

syncGuard.executeRequest('/api/orders', {
  method: 'POST',
  body: JSON.stringify({ product: 123, qty: 1 })
});
```

## Advanced Features 🛠️

### Conflict Resolution

If a user edits data offline that was also changed on the server, you might get an HTTP 409 response. Handle it easily:

```typescript
const syncGuard = new SyncGuard({
  onConflict: async (localRequest, serverResponse) => {
    const serverData = await serverResponse.json();
    console.log('Data conflict on:', localRequest.url);
    // Custom logic to merge data or prompt the user
  }
});
```

### Background Sync (Service Worker)

To sync data even if the user closes the app, you can inject SyncGuard's Service Worker logic.

```typescript
// 1. Generate the SW code
const swCode = syncGuard.getSWCode();
console.log("Add this to your service-worker.js:", swCode);

// 2. The SDK will automatically trigger 'syncguard-sync' event when offline mode ends.
```

### React Native / Custom Storage

You can pass a custom `StorageAdapter` for non-browser environments like React Native:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const customStorage = {
  getItem: async (key) => AsyncStorage.getItem(key),
  setItem: async (key, val) => AsyncStorage.setItem(key, val)
};

const syncGuard = new SyncGuard({
  storageAdapter: customStorage,
  showUI: false // Disable DOM UI in React Native
});
```

## Configuration Options ⚙️

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showUI` | boolean | `true` | Injects a beautiful DOM-based toast notification banner. |
| `autoIntercept`| boolean | `false` | Monkey-patches `window.fetch` and `XHR`. |
| `retryCount` | number | `3` | How many times a failed sync should be retried. |
| `storageKey` | string | `'syncguard_offline_queue'`| Key used for IndexedDB/LocalStorage. |
| `storageAdapter`| StorageAdapter | `IndexedDBAdapter` | Custom storage implementation. |
| `onSyncSuccess`| function | `undefined` | Callback when requests are synced successfully. |
| `onSyncError` | function | `undefined` | Callback when a request fails to sync. |
| `onConflict` | function | `undefined` | Callback for resolving HTTP 409 Conflicts. |
| `onStatusChange`| function | `undefined` | Callback when network status changes (`isOnline`).|

## License 📄
MIT
