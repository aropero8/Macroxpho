// Cliente mínimo de la API de Gemini (REST, sin SDK) para estimar macros desde una foto.
//
// IMPORTANTE: llamar a Gemini directamente desde la app expone la API key en el
// dispositivo. Vale para probar con la capa gratuita; para publicar la app, mueve
// esta llamada a un backend propio (ver README).
import { MODEL_CHAIN } from "./models.js";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const PROMPT = `Eres un nutricionista experto en estimar macronutrientes a partir de fotos de comida.
Analiza la imagen e identifica cada plato o alimento distinto. Para cada uno estima
la porción en gramos y sus kcal, proteína, carbohidratos y grasas de esa porción.
Usa referencias visuales (tamaño del plato, cubiertos, manos) para calibrar las raciones.
Si el usuario añade una nota, tenla en cuenta y respeta cantidades que indique.
Si la imagen no contiene comida, devuelve es_comida=false y platos vacío.
Responde en español. Los números deben ser realistas y coherentes
(kcal ≈ 4·proteína + 4·carbohidratos + 9·grasas).`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    es_comida: { type: "BOOLEAN" },
    platos: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          nombre: { type: "STRING" },
          gramos: { type: "NUMBER" },
          kcal: { type: "NUMBER" },
          proteina_g: { type: "NUMBER" },
          carbohidratos_g: { type: "NUMBER" },
          grasas_g: { type: "NUMBER" },
        },
        required: [
          "nombre",
          "gramos",
          "kcal",
          "proteina_g",
          "carbohidratos_g",
          "grasas_g",
        ],
      },
    },
    confianza: { type: "STRING", enum: ["baja", "media", "alta"] },
    notas: { type: "STRING" },
  },
  required: ["es_comida", "platos", "confianza"],
};

// Error de un intento. `fallback` indica si merece la pena probar con otro modelo
// (límite agotado, modelo retirado o sin permiso, Google saturado, respuesta rara…).
// Con la API key mal, sin conexión o con la petición bloqueada, cambiar de modelo no ayuda.
class GeminiError extends Error {
  constructor(message, { fallback = false, status } = {}) {
    super(message);
    this.fallback = fallback;
    this.status = status;
  }
}

function httpError(status, body) {
  const msg = body?.error?.message || "";
  if ((status === 400 && /api key/i.test(msg)) || status === 401)
    return new GeminiError("La API key no es válida. Revísala en Ajustes.", { status });
  if (status === 429)
    return new GeminiError(
      "Has superado el límite de la capa gratuita (por minuto o por día). Espera un poco e inténtalo de nuevo.",
      { fallback: true, status }
    );
  if (status === 403)
    return new GeminiError(
      "La API key no tiene permiso para usar los modelos de Gemini o está restringida.",
      { fallback: true, status }
    );
  if (status === 404)
    return new GeminiError(
      "No se encuentra el modelo. Puede que Google lo haya renombrado o retirado.",
      { fallback: true, status }
    );
  return new GeminiError(msg || `Error ${status} al llamar a Gemini.`, { fallback: true, status });
}

/**
 * Pide a Gemini una respuesta JSON que cumpla `schema`. Prueba los modelos gratuitos
 * en orden (primero el de por defecto) y devuelve la del primero que funcione.
 * @param {{apiKey: string, parts: object[], schema: object}} p
 */
export async function generateJSON({ apiKey, parts, schema }) {
  if (!apiKey) throw new Error("Falta la API key. Añádela en Ajustes.");

  const errors = [];
  for (const model of MODEL_CHAIN) {
    try {
      return await callModel({ apiKey, model, parts, schema });
    } catch (err) {
      if (!err.fallback) throw err;
      errors.push(err);
    }
  }

  // Han fallado todos. Si todos fueron por límite, se dice así; si no, el último error.
  if (errors.every((e) => e.status === 429))
    throw new Error(
      "Has agotado el límite gratuito de todos los modelos de Gemini. Espera un poco (o hasta mañana) e inténtalo de nuevo."
    );
  throw new Error(`Ningún modelo de Gemini pudo responder. ${errors.at(-1).message}`);
}

/**
 * @param {{apiKey: string, base64: string, mimeType: string, note?: string}} p
 */
export function analyzeFoodImage({ apiKey, base64, mimeType, note }) {
  const parts = [
    { inlineData: { mimeType, data: base64 } },
    {
      text: note?.trim()
        ? `${PROMPT}\n\nNota del usuario: ${note.trim()}`
        : PROMPT,
    },
  ];
  return generateJSON({ apiKey, parts, schema: SCHEMA });
}

async function callModel({ apiKey, model, parts, schema }) {
  let res;
  try {
    res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
    });
  } catch {
    throw new GeminiError("No se pudo conectar. Revisa tu conexión a internet.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw httpError(res.status, data);

  const text = (data.candidates?.[0]?.content?.parts || [])
    .filter((p) => typeof p.text === "string")
    .map((p) => p.text)
    .join("");

  if (!text) {
    const reason = data.promptFeedback?.blockReason;
    if (reason) throw new GeminiError(`Gemini bloqueó la petición (${reason}).`);
    throw new GeminiError("Gemini no devolvió ningún resultado.", { fallback: true });
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new GeminiError(
      "La respuesta de Gemini no tenía el formato esperado. Inténtalo de nuevo.",
      { fallback: true }
    );
  }
}
