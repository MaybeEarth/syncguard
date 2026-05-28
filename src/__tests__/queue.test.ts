import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { RequestQueue } from '../queue';
import { IndexedDBAdapter } from '../idb-storage';
import { RequestItem } from '../types';

describe('RequestQueue & IndexedDBAdapter', () => {
  let queue: RequestQueue;
  const storageKey = 'test_queue';

  beforeEach(async () => {
    // We recreate it for each test
    const adapter = new IndexedDBAdapter();
    queue = new RequestQueue(storageKey, adapter);
    await queue.init();
  });

  afterEach(async () => {
    // Clear out items
    while(queue.length > 0) {
      await queue.dequeue();
    }
  });

  it('should initialize empty', () => {
    expect(queue.length).toBe(0);
    expect(queue.getItems()).toEqual([]);
  });

  it('should enqueue items and retrieve them in FIFO order', async () => {
    const item1: RequestItem = { id: '1', url: '/api/1', timestamp: 100, retryCount: 0 };
    const item2: RequestItem = { id: '2', url: '/api/2', timestamp: 200, retryCount: 0 };

    await queue.enqueue(item1);
    await queue.enqueue(item2);

    expect(queue.length).toBe(2);

    const dequeued1 = await queue.dequeue();
    expect(dequeued1).toEqual(item1);
    expect(queue.length).toBe(1);

    const dequeued2 = await queue.dequeue();
    expect(dequeued2).toEqual(item2);
    expect(queue.length).toBe(0);
  });

  it('should push items to the back', async () => {
    const item1: RequestItem = { id: '1', url: '/api/1', timestamp: 100, retryCount: 1 };
    await queue.pushBack(item1);
    expect(queue.length).toBe(1);
    
    const dequeued = await queue.dequeue();
    expect(dequeued?.id).toBe('1');
  });

  it('should persist data across initializations', async () => {
    const item1: RequestItem = { id: 'persist_1', url: '/api/persist', timestamp: 123, retryCount: 0 };
    await queue.enqueue(item1);

    // Create a new queue instance pointing to the same adapter/key
    const newAdapter = new IndexedDBAdapter();
    const newQueue = new RequestQueue(storageKey, newAdapter);
    await newQueue.init();

    expect(newQueue.length).toBe(1);
    const dequeued = await newQueue.dequeue();
    expect(dequeued?.id).toBe('persist_1');
  });
});
