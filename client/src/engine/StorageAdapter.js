const DB_NAME = 'EarthOnline';
const DB_VERSION = 2;
const STORE_GAME = 'gameState';
const STORE_CONFIG = 'config';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_GAME)) {
        db.createObjectStore(STORE_GAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveGameState(state) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_GAME, 'readwrite');
    tx.objectStore(STORE_GAME).put({ id: 'main', ...state, savedAt: Date.now() });
    await tx.done;
    db.close();
    return true;
  } catch (e) {
    console.error('[IndexedDB] saveGameState error:', e);
    return false;
  }
}

export async function loadGameState() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_GAME, 'readonly');
    const store = tx.objectStore(STORE_GAME);
    const result = await new Promise((resolve, reject) => {
      const req = store.get('main');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch (e) {
    console.error('[IndexedDB] loadGameState error:', e);
    return null;
  }
}

export async function clearGameState() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_GAME, 'readwrite');
    tx.objectStore(STORE_GAME).delete('main');
    await tx.done;
    db.close();
    return true;
  } catch (e) {
    return false;
  }
}

export function startAutoSave(engine, intervalMs = 10000) {
  let running = true;
  const tick = async () => {
    if (!running) return;
    await saveGameState(engine.exportState());
    setTimeout(tick, intervalMs);
  };
  setTimeout(tick, intervalMs);
  return () => { running = false; };
}
