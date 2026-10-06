// Cliente mínimo de la API de Gemini (REST, sin SDK) para estimar macros desde una foto.
//
// IMPORTANTE: llamar a Gemini directamente desde la app expone la API key en el
// dispositivo. Vale para probar con la capa gratuita; para publicar la app, mueve
// esta llamada a un backend propio (ver README).

export const DEFAULT_MODEL =
  import.meta.env.VITE_GEMINI_MODEL || "gemini-3.5-flash";

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

function friendlyError(status, body) {
  const msg = body?.error?.message || "";
  if (status === 429)
    return "Has superado el límite de la capa gratuita (por minuto o por día). Espera un poco e inténtalo de nuevo.";
  if (status === 400 && /api key/i.test(msg))
    return "La API key no es válida. Revísala en Ajustes.";
  if (status === 403)
    return "La API key no tiene permiso para usar este modelo o está restringida.";
  if (status === 404)
    return "No se encuentra el modelo. Puede que se haya renombrado o retirado: cámbialo en Ajustes.";
  return msg || `Error ${status} al llamar a Gemini.`;
}

/**
 * @param {{apiKey: string, model?: string, base64: string, mimeType: string, note?: string}} p
 */
export async function analyzeFoodImage({
  apiKey,
  model = DEFAULT_MODEL,
  base64,
  mimeType,
  note,
}) {
  if (!apiKey) throw new Error("Falta la API key. Añádela en Ajustes.");

  const parts = [
    { inlineData: { mimeType, data: base64 } },
    {
      text: note?.trim()
        ? `${PROMPT}\n\nNota del usuario: ${note.trim()}`
        : PROMPT,
    },
  ];

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
          responseSchema: SCHEMA,
        },
      }),
    });
  } catch {
    throw new Error("No se pudo conectar. Revisa tu conexión a internet.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(friendlyError(res.status, data));

  const text = (data.candidates?.[0]?.content?.parts || [])
    .filter((p) => typeof p.text === "string")
    .map((p) => p.text)
    .join("");

  if (!text) {
    const reason = data.promptFeedback?.blockReason;
    throw new Error(
      reason
        ? `Gemini bloqueó la petición (${reason}).`
        : "Gemini no devolvió ningún resultado."
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("La respuesta de Gemini no tenía el formato esperado. Inténtalo de nuevo.");
  }
}
