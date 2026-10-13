// Modelos de Gemini con capa gratuita que aceptan imágenes y sirven para analizar fotos.
// Fuente: https://ai.google.dev/gemini-api/docs/pricing y .../docs/models (revisado en octubre de 2026).
// Fuera de la lista a propósito: los 2.5 (Google limita el acceso a quien ya los usaba),
// los preview y los de voz, imagen o embeddings. Si Google cambia la lista, se actualiza aquí.
export const FREE_MODELS = [
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" },
  { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" }, // Google lo retira el 7 de mayo de 2027.
];

export const isFreeModel = (id) => FREE_MODELS.some((m) => m.id === id);

// El modelo por defecto (que puede venir de VITE_GEMINI_MODEL) solo vale si es gratuito;
// si no, se usa el de siempre.
const ENV_MODEL = import.meta.env.VITE_GEMINI_MODEL;
export const DEFAULT_MODEL = isFreeModel(ENV_MODEL) ? ENV_MODEL : "gemini-3.5-flash";

// Orden en que se prueban los modelos: primero el de por defecto y, si falla,
// el resto en el orden de la lista.
export const MODEL_CHAIN = [
  DEFAULT_MODEL,
  ...FREE_MODELS.map((m) => m.id).filter((id) => id !== DEFAULT_MODEL),
];

export const modelLabel = (id) => FREE_MODELS.find((m) => m.id === id)?.label || id;
