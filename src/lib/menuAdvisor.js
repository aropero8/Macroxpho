// Recomendador de menús: recibe fotos de varias opciones (platos, cartas o menús del día)
// y pide a Gemini que las compare y elija la mejor según lo que queda del día.
import { generateJSON } from "./gemini.js";
import { round, sumTotals } from "./nutrition.js";

export const MAX_PHOTOS = 6;

const PROMPT = `Eres un nutricionista que ayuda a elegir qué pedir para comer.
Recibes varias fotos numeradas (Foto 1, Foto 2…). Cada una puede ser un plato ya servido,
la carta de un restaurante o un menú del día (primeros, segundos y postres).

1. Identifica las opciones que el usuario podría pedir:
   - Plato servido: esa es la opción.
   - Carta: los platos que tengan sentido como comida (como mucho los 3 más interesantes de cada carta).
   - Menú del día: la mejor combinación de primero + segundo de ese menú (y postre solo si mejora la elección).
   En total, como mucho 8 opciones.
2. Para cada opción, desglosa sus platos con una ración típica de restaurante en gramos
   y sus kcal, proteína, carbohidratos y grasas (kcal ≈ 4·proteína + 4·carbohidratos + 9·grasas),
   además de fibra, azúcares, grasas saturadas y sal en gramos.
3. Puntúa cada opción de 0 a 10 según lo bien que encaja con el objetivo del usuario:
   prioriza llegar al objetivo de proteína sin pasarse de kcal, la calidad de los alimentos
   (proteína magra, verdura, poco frito y poca salsa) y lo saciante que es.
   Respeta siempre las preferencias o restricciones de la nota del usuario.
4. Devuelve las opciones ordenadas de mejor a peor. "foto" es el número de la foto de donde sale.
   "motivo" es una frase corta con el punto fuerte o débil de la opción.
   "veredicto" explica en 2-3 frases por qué la primera es la mejor frente a las demás
   y, si ayuda, un consejo para pedirla (por ejemplo, la salsa aparte).
Si en las fotos no hay comida ni cartas, devuelve hay_opciones=false y opciones vacío.
Responde en español.`;

const PLATO = {
  type: "OBJECT",
  properties: {
    nombre: { type: "STRING" },
    gramos: { type: "NUMBER" },
    kcal: { type: "NUMBER" },
    proteina_g: { type: "NUMBER" },
    carbohidratos_g: { type: "NUMBER" },
    grasas_g: { type: "NUMBER" },
    fibra_g: { type: "NUMBER" },
    azucares_g: { type: "NUMBER" },
    grasas_sat_g: { type: "NUMBER" },
    sal_g: { type: "NUMBER" },
  },
  required: [
    "nombre",
    "gramos",
    "kcal",
    "proteina_g",
    "carbohidratos_g",
    "grasas_g",
    "fibra_g",
    "azucares_g",
    "grasas_sat_g",
    "sal_g",
  ],
};

const SCHEMA = {
  type: "OBJECT",
  properties: {
    hay_opciones: { type: "BOOLEAN" },
    opciones: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          nombre: { type: "STRING" },
          foto: { type: "INTEGER" },
          platos: { type: "ARRAY", items: PLATO },
          puntuacion: { type: "NUMBER" },
          motivo: { type: "STRING" },
        },
        required: ["nombre", "foto", "platos", "puntuacion", "motivo"],
      },
    },
    veredicto: { type: "STRING" },
    confianza: { type: "STRING", enum: ["baja", "media", "alta"] },
  },
  required: ["hay_opciones", "opciones", "confianza"],
};

/** Describe en una frase lo que lleva el usuario hoy, para que Gemini lo tenga en cuenta. */
function describeDay({ consumed, proteinGoal, kcalGoal }) {
  const lines = [`Hoy lleva ${round(consumed.proteina_g)} g de proteína y ${round(consumed.kcal)} kcal.`];
  if (proteinGoal > 0)
    lines.push(
      `Su objetivo de proteína es ${proteinGoal} g al día (le quedan ${Math.max(0, proteinGoal - round(consumed.proteina_g))} g).`
    );
  if (kcalGoal > 0)
    lines.push(
      `Su objetivo de kcal es ${kcalGoal} al día (le quedan ${Math.max(0, kcalGoal - round(consumed.kcal))} kcal).`
    );
  return lines.join(" ");
}

/**
 * @param {{
 *   apiKey: string,
 *   images: {base64: string, mimeType: string}[],
 *   note?: string,
 *   day: {consumed: object, proteinGoal: number, kcalGoal?: number},
 * }} p
 * @returns {Promise<{options: object[], veredicto?: string, confianza: string} | null>}
 *   null si en las fotos no hay nada que pedir.
 */
export async function recommendMenu({ apiKey, images, note, day }) {
  const parts = images.flatMap((img, i) => [
    { text: `Foto ${i + 1}:` },
    { inlineData: { mimeType: img.mimeType, data: img.base64 } },
  ]);
  let text = `${PROMPT}\n\n${describeDay(day)}`;
  if (note?.trim()) text += `\n\nNota del usuario: ${note.trim()}`;
  parts.push({ text });

  const data = await generateJSON({ apiKey, parts, schema: SCHEMA });
  if (!data.hay_opciones || !data.opciones?.length) return null;

  // Por si Gemini no respeta el orden: la mejor puntuación, primero.
  const options = data.opciones
    .filter((o) => o.platos?.length)
    .map((o) => {
      const platos = o.platos.map((p) => ({ ...p, gramosBase: p.gramos }));
      return { ...o, platos, totales: sumTotals(platos) };
    })
    .sort((a, b) => b.puntuacion - a.puntuacion);
  if (!options.length) return null;

  return { options, veredicto: data.veredicto, confianza: data.confianza };
}
