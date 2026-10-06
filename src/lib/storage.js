// Acceso a los datos de la app. Es el único módulo que toca localStorage: si más
// adelante se cambia a otro almacenamiento, solo hay que cambiar este archivo.
//
// Formato guardado en DATA_KEY:
//   { version: 1, days: { "YYYY-MM-DD": { desayuno, comida, cena, snacks: [] } } }
import { mealsOf, sumTotals } from "./nutrition.js";

const DATA_KEY = "macrosnap.data";
const SETTINGS_KEY = "macrosnap.settings";
const API_KEY_KEY = "macrosnap.apiKey";
const MODEL_KEY = "macrosnap.model";

export const DATA_VERSION = 1;
export const SLOTS = ["desayuno", "comida", "cena"];
export const MEAL_LABELS = {
  desayuno: "Desayuno",
  comida: "Comida",
  cena: "Cena",
  snack: "Snack",
};
export const DEFAULT_SETTINGS = { proteinGoal: 144, kcalGoal: null };

let cache = null;

function readItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readJSON(key) {
  try {
    return JSON.parse(readItem(key));
  } catch {
    return null;
  }
}

// Punto único para adaptar datos guardados por versiones anteriores de la app.
function migrate(data) {
  if (!data || typeof data.days !== "object" || data.days === null) {
    return { version: DATA_VERSION, days: {} };
  }
  // Ejemplo futuro: if (data.version === 1) { ...convertir...; data = { ...data, version: 2 }; }
  return { ...data, version: data.version ?? DATA_VERSION };
}

function load() {
  if (cache) return cache;
  const raw = readItem(DATA_KEY);
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      // No pisar datos ilegibles: se apartan por si hay que recuperarlos a mano.
      try {
        localStorage.setItem(`${DATA_KEY}.ilegible`, raw);
      } catch {}
    }
  }
  cache = migrate(data);
  return cache;
}

function persist(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
  cache = data;
}

export function newId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  );
}

const emptyDay = () => ({ desayuno: null, comida: null, cena: null, snacks: [] });

/* ---------- Días y comidas ---------- */

export function getDay(key) {
  const day = load().days[key];
  return day ? { ...emptyDay(), ...day } : emptyDay();
}

export function getAllDays() {
  return load().days;
}

export function listDaysWithData() {
  return Object.keys(load().days)
    .filter((k) => mealsOf(getDay(k)).length > 0)
    .sort();
}

export function findMeal(key, id) {
  return mealsOf(getDay(key)).find((m) => m.id === id) || null;
}

/**
 * Crea o actualiza una comida. Recalcula los totales a partir de los platos
 * para que siempre sean coherentes. Devuelve la comida guardada.
 */
export function saveMeal(key, meal) {
  if (meal.tipo !== "snack" && !SLOTS.includes(meal.tipo)) {
    throw new Error(`Tipo de comida desconocido: ${meal.tipo}`);
  }
  const full = {
    ...meal,
    id: meal.id || newId(),
    totales: sumTotals(meal.platos),
    savedAt: new Date().toISOString(),
  };

  const day = getDay(key);
  let next;
  if (full.tipo === "snack") {
    const exists = day.snacks.some((s) => s.id === full.id);
    next = {
      ...day,
      snacks: exists
        ? day.snacks.map((s) => (s.id === full.id ? full : s))
        : [...day.snacks, full],
    };
  } else {
    next = { ...day, [full.tipo]: full };
  }

  const data = load();
  persist({ ...data, days: { ...data.days, [key]: next } });
  return full;
}

/** Borra una comida. La miniatura la borra quien llama (thumbs.js). */
export function deleteMeal(key, id) {
  const day = getDay(key);
  const next = { ...day, snacks: day.snacks.filter((s) => s.id !== id) };
  for (const slot of SLOTS) if (next[slot]?.id === id) next[slot] = null;

  const data = load();
  const days = { ...data.days };
  if (mealsOf(next).length) days[key] = next;
  else delete days[key];
  persist({ ...data, days });
}

/* ---------- Ajustes ---------- */

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...readJSON(SETTINGS_KEY) };
}

export function saveSettings({ proteinGoal, kcalGoal }) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ proteinGoal, kcalGoal }));
}

export function getApiConfig() {
  return { apiKey: readItem(API_KEY_KEY) || "", model: readItem(MODEL_KEY) || "" };
}

export function saveApiConfig({ apiKey, model }) {
  localStorage.setItem(API_KEY_KEY, apiKey);
  localStorage.setItem(MODEL_KEY, model);
}

/* ---------- Copia de seguridad ---------- */

// La API key NO se incluye en la copia a propósito. Las miniaturas tampoco
// (viven en IndexedDB y harían el archivo mucho más grande).
export function exportBackup() {
  return JSON.stringify(
    {
      app: "macrosnap",
      version: DATA_VERSION,
      exportedAt: new Date().toISOString(),
      settings: getSettings(),
      days: load().days,
    },
    null,
    2
  );
}

/** Sustituye todos los datos por los de la copia. Devuelve el número de días importados. */
export function importBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("El archivo no es un JSON válido.");
  }
  if (parsed?.app !== "macrosnap" || typeof parsed.days !== "object" || !parsed.days) {
    throw new Error("El archivo no es una copia de MacroSnap.");
  }
  const data = migrate({ version: parsed.version, days: parsed.days });
  persist(data);
  if (parsed.settings) saveSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
  return Object.keys(data.days).length;
}
