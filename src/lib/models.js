// Modelos de Gemini con capa gratuita que aceptan imágenes y sirven para analizar fotos.
// Fuente: https://ai.google.dev/gemini-api/docs/pricing y .../docs/models (revisado en octubre de 2026).
// Fuera de la lista a propósito: los 2.5 (Google limita el acceso a quien ya los usaba),
// los preview y los de voz, imagen o embeddings. Si Google cambia la lista, se actualiza aquí.
import { DEFAULT_MODEL } from "./gemini.js";

export const FREE_MODELS = [
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", note: "El Flash más reciente y capaz." },
  { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash", note: "Generación anterior de Flash." },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", note: "Generación anterior; equilibra velocidad y calidad." },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", note: "El Flash más antiguo de la lista." },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", note: "El más rápido y ligero de la familia 3.5." },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", note: "Ligero. Google lo retira el 7 de mayo de 2027." },
];

export const isFreeModel = (id) => FREE_MODELS.some((m) => m.id === id);

// El modelo por defecto (que puede venir de VITE_GEMINI_MODEL) solo vale si es gratuito;
// si no, se usa el valor por defecto de siempre (el mismo que en gemini.js).
export const FALLBACK_MODEL = isFreeModel(DEFAULT_MODEL) ? DEFAULT_MODEL : "gemini-3.5-flash";

/** Devuelve el modelo si es gratuito; si no, el de por defecto. */
export const freeModelOr = (id) => (isFreeModel(id) ? id : FALLBACK_MODEL);
