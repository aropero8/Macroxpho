// Fotos que no se pudieron analizar porque Gemini no respondía: la comida se guarda con
// `pendiente: true` y su foto en IndexedDB, y se analiza sola cuando Gemini vuelve.
// App.jsx llama a processPending() al abrir la app, cada pocos minutos, al volver a ella
// y al recuperar la conexión. Con la app cerrada no se analiza nada.
import { analyzeFoodImage } from "./gemini.js";
import { findMeal, listPending, saveMeal } from "./storage.js";
import { deletePhoto, getPhoto, putPhoto } from "./thumbs.js";

export const RETRY_MS = 5 * 60_000;

/** Guarda la foto de una comida para analizarla más tarde. Devuelve true si se guardó. */
export const keepPhoto = (mealId, { base64, mimeType, note }) =>
  putPhoto(mealId, { base64, mimeType, note });

// Cierra la comida con el resultado, si sigue existiendo y pendiente (se ha podido borrar
// o editar mientras Gemini respondía). Los platos apuntados a mano se conservan.
function finish(date, id, platos, extra) {
  const meal = findMeal(date, id);
  if (!meal?.pendiente) return null;
  const { pendiente: _, ...rest } = meal;
  return { date, meal: saveMeal(date, { ...rest, platos: [...platos, ...meal.platos], ...extra }) };
}

async function run(apiKey) {
  const done = [];
  for (const { date, meal } of listPending()) {
    const photo = await getPhoto(meal.id);
    if (!photo) {
      // Por ejemplo, una copia de seguridad importada en otro dispositivo.
      const r = finish(date, meal.id, [], { notas: "La foto ya no estaba para analizarla." });
      if (r) done.push(r);
      continue;
    }
    let data;
    try {
      data = await analyzeFoodImage({ apiKey, ...photo });
    } catch (err) {
      if (!err.blocked) break; // Gemini sigue sin responder: se reintentará más tarde
      data = { es_comida: false, notas: "Gemini no quiso analizar esta foto." };
    }
    const food = data.es_comida && data.platos?.length;
    const r = food
      ? finish(
          date,
          meal.id,
          data.platos.map((p) => ({ ...p, gramosBase: p.gramos })),
          { confianza: data.confianza, notas: data.notas }
        )
      : finish(date, meal.id, [], {
          notas: data.notas || "Gemini no encontró comida en la foto: apunta los platos a mano.",
        });
    if (r) done.push(r);
    await deletePhoto(meal.id);
  }
  return done;
}

let running = null;

/**
 * Intenta analizar las comidas pendientes, de la más antigua a la más nueva. Devuelve las
 * que se han cerrado ([{ date, meal }]). Si ya hay una pasada en marcha, devuelve esa.
 */
export function processPending(apiKey) {
  if (!apiKey || listPending().length === 0) return Promise.resolve([]);
  running ??= run(apiKey).finally(() => {
    running = null;
  });
  return running;
}
