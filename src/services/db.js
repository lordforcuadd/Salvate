import { openDB } from 'idb';

const DB_NAME = 'salvate_db';
const DB_VERSION = 1;

let dbPromise = null;

export function getDBInstance() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('status_history')) {
          db.createObjectStore('status_history', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('broadcast_messages')) {
          db.createObjectStore('broadcast_messages', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('medical_vault')) {
          db.createObjectStore('medical_vault', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('checklists')) {
          db.createObjectStore('checklists', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('hazard_reports')) {
          db.createObjectStore('hazard_reports', { keyPath: 'id' });
        }
      },
    }).catch(err => {
      console.error('Failed to open IndexedDB:', err);
      dbPromise = null; // reset on error so subsequent calls retry
      throw err;
    });
  }
  return dbPromise;
}

export const initDB = getDBInstance;

export async function saveDBItem(storeName, item) {
  try {
    const db = await getDBInstance();
    const plainItem = JSON.parse(JSON.stringify(item));
    return await db.put(storeName, plainItem);
  } catch (e) {
    console.error(`Error saving to IDB store ${storeName}:`, e);
  }
}

export async function getDBItem(storeName, key) {
  try {
    const db = await getDBInstance();
    return await db.get(storeName, key);
  } catch (e) {
    console.error(`Error reading key ${key} from IDB store ${storeName}:`, e);
    return null;
  }
}

export async function getAllDBItems(storeName) {
  try {
    const db = await getDBInstance();
    return await db.getAll(storeName);
  } catch (e) {
    console.error(`Error reading all items from IDB store ${storeName}:`, e);
    return [];
  }
}

export async function deleteDBItem(storeName, key) {
  try {
    const db = await getDBInstance();
    return await db.delete(storeName, key);
  } catch (e) {
    console.error(`Error deleting key ${key} from IDB store ${storeName}:`, e);
  }
}

export async function clearDBStore(storeName) {
  try {
    const db = await getDBInstance();
    return await db.clear(storeName);
  } catch (e) {
    console.error(`Error clearing IDB store ${storeName}:`, e);
  }
}

export async function saveDBItemsBatch(storeName, items = []) {
  if (!items || items.length === 0) return true;
  try {
    const db = await getDBInstance();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const plainItems = JSON.parse(JSON.stringify(items));
    for (const item of plainItems) {
      store.put(item);
    }
    await tx.done;
    return true;
  } catch (e) {
    console.error(`Error saving batch to IDB store ${storeName}:`, e);
    return false;
  }
}

export async function pruneOldDBItems(storeName, maxAgeDays = 14) {
  try {
    const db = await getDBInstance();
    const all = await db.getAll(storeName);
    if (!all || all.length === 0) return;
    const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of all) {
      const itemTime = new Date(item.timestamp || item.updatedAt || item.created_at || 0).getTime();
      if (itemTime > 0 && itemTime < cutoffTime) {
        store.delete(item.id || item.key);
      }
    }
    await tx.done;
  } catch (e) {
    console.error(`Error pruning store ${storeName}:`, e);
  }
}

export async function masterDeleteWholeDB() {
  try {
    if (dbPromise) {
      const db = await dbPromise;
      db.close();
      dbPromise = null;
    }
    indexedDB.deleteDatabase(DB_NAME);
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.error("Error doing master delete of IDB database:", e);
  }
}
