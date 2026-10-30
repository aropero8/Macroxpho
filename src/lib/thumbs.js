// Miniaturas de las comidas en IndexedDB (en localStorage las imágenes lo llenarían enseguida),
// y las fotos que esperan a que Gemini vuelva a funcionar (ver pending.js).
// Todo es "mejor esfuerzo": si IndexedDB no está disponible o falla, las funciones
// devuelven false/null y la app sigue funcionando sin miniaturas.
const DB_NAME = "macrosnap";
const THUMBS = "thumbs";
const PHOTOS = "photos"; // { base64, mimeType, note } por id de comida, y el borrador de "¿Qué pido?"
const STORES = [THUMBS, PHOTOS];

let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 2); // 2: almacén de fotos pendientes
      req.onupgradeneeded = () => {
        for (const s of STORES)
          if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s);
      };
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

async function run(store, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function put(store, id, value) {
  try {
    await run(store, "readwrite", (s) => s.put(value, id));
    return true;
  } catch {
    return false;
  }
}

async function get(store, id) {
  if (!id) return null;
  try {
    return (await run(store, "readonly", (s) => s.get(id))) || null;
  } catch {
    return null;
  }
}

async function remove(store, id) {
  if (!id) return;
  try {
    await run(store, "readwrite", (s) => s.delete(id));
  } catch {}
}

/** Guarda la miniatura (Blob JPEG). Devuelve true si se guardó. */
export const putThumb = (id, blob) => put(THUMBS, id, blob);
export const getThumb = (id) => get(THUMBS, id);
export const deleteThumb = (id) => remove(THUMBS, id);

/** Foto a tamaño de análisis de una comida pendiente: { base64, mimeType, note }. */
export const putPhoto = (id, photo) => put(PHOTOS, id, photo);
export const getPhoto = (id) => get(PHOTOS, id);
export const deletePhoto = (id) => remove(PHOTOS, id);

/** Miniatura de la foto n (desde 1) de una recomendación guardada de "¿Qué pido?". */
export const menuThumbId = (menuId, n) => `${menuId}-f${n}`;

// La recomendación de "¿Qué pido?" en curso, con sus fotos a tamaño de análisis, para no
// perderla al salir de la pantalla o cerrar la app. Solo hay una.
const MENU_DRAFT = "menu-draft";
export const putMenuDraft = (draft) => put(PHOTOS, MENU_DRAFT, draft);
export const getMenuDraft = () => get(PHOTOS, MENU_DRAFT);
export const deleteMenuDraft = () => remove(PHOTOS, MENU_DRAFT);
