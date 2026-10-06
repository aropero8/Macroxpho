// Miniaturas de las comidas en IndexedDB (en localStorage las imágenes lo llenarían enseguida).
// Todo es "mejor esfuerzo": si IndexedDB no está disponible o falla, las funciones
// devuelven false/null y la app sigue funcionando sin miniaturas.
const DB_NAME = "macrosnap";
const STORE = "thumbs";

let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("IndexedDB bloqueada"));
    }).catch((err) => {
      dbPromise = null; // permite reintentar más tarde
      throw err;
    });
  }
  return dbPromise;
}

async function run(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Guarda la miniatura (Blob JPEG). Devuelve true si se guardó. */
export async function putThumb(id, blob) {
  try {
    await run("readwrite", (s) => s.put(blob, id));
    return true;
  } catch {
    return false;
  }
}

export async function getThumb(id) {
  if (!id) return null;
  try {
    return (await run("readonly", (s) => s.get(id))) || null;
  } catch {
    return null;
  }
}

export async function deleteThumb(id) {
  if (!id) return;
  try {
    await run("readwrite", (s) => s.delete(id));
  } catch {}
}
