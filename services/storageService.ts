
import { Persona, CanvasItem } from "../types";

const DB_NAME = 'MuseCaptionDB';
const DB_VERSION = 1;
const STORE_PERSONAS = 'personas';
const STORE_ITEMS = 'canvas_items';

let dbInstance: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PERSONAS)) {
        db.createObjectStore(STORE_PERSONAS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error("IndexedDB error:", event);
      reject("Failed to open database");
    };
  });
};

export const savePersonasToDB = async (personas: Persona[]) => {
  const db = await openDB();
  const tx = db.transaction(STORE_PERSONAS, 'readwrite');
  const store = tx.objectStore(STORE_PERSONAS);
  
  // Clear old data to ensure sync (simple strategy for this app)
  await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
  });

  // Bulk add
  personas.forEach(p => store.put(p));
  
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getPersonasFromDB = async (): Promise<Persona[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PERSONAS, 'readonly');
    const store = tx.objectStore(STORE_PERSONAS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const saveItemsToDB = async (items: CanvasItem[]) => {
  const db = await openDB();
  const tx = db.transaction(STORE_ITEMS, 'readwrite');
  const store = tx.objectStore(STORE_ITEMS);

  // We do NOT clear everything here blindly to avoid flashing, 
  // but for a simple sync, clearing and re-adding is the safest way to handle deletions.
  // Optimization: In a huge app, we would track diffs. For now, clear + add is fine for < 50 items.
  await new Promise<void>((resolve, reject) => {
     const clearReq = store.clear();
     clearReq.onsuccess = () => resolve();
     clearReq.onerror = () => reject(clearReq.error);
  });

  // Prepare items for storage
  // Note: We don't need to change anything, structured clone algorithm handles objects.
  // However, Blob URLs (blob:http://...) expire on page reload.
  // We rely on the 'base64' field in ImagePreview to regenerate the URL on load.
  items.forEach(item => {
      // Create a copy to avoid mutating state if we needed to strip anything
      // But we store the whole object.
      store.put(item);
  });

  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getItemsFromDB = async (): Promise<CanvasItem[]> => {
  const db = await openDB();
  const items: CanvasItem[] = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ITEMS, 'readonly');
    const store = tx.objectStore(STORE_ITEMS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });

  // REHYDRATION: Re-create Blob URLs from Base64
  // IndexedDB stores the data, but the 'url' property (blob:...) is dead after reload.
  // We must revive it.
  const rehydratedItems = await Promise.all(items.map(async (item) => {
      if (item.image && item.image.base64) {
          try {
              // Convert base64 back to Blob to create a fresh URL
              const res = await fetch(`data:${item.image.mimeType};base64,${item.image.base64}`);
              const blob = await res.blob();
              const newUrl = URL.createObjectURL(blob);
              
              // We also need to reconstruct the 'file' object roughly if we want drag/drop consistency,
              // but for display, the URL is enough.
              // Let's just update the URL.
              return {
                  ...item,
                  image: {
                      ...item.image,
                      url: newUrl
                  }
              };
          } catch (e) {
              console.error("Failed to rehydrate image", item.id, e);
              return item;
          }
      }
      return item;
  }));

  return rehydratedItems;
};