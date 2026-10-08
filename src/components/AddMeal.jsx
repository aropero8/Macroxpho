import { useRef, useState } from "react";
import { analyzeFoodImage } from "../lib/gemini.js";
import { makeThumbnail, prepareImage } from "../lib/image.js";
import { samplePlatos, sampleThumb } from "../lib/devSample.js";
import { MEAL_LABELS, newId, saveMeal } from "../lib/storage.js";
import { putThumb } from "../lib/thumbs.js";
import Icon from "./Icon.jsx";
import Results from "./Results.jsx";

// Hueco con la forma del resultado mientras Gemini responde (suele tardar unos segundos).
function ResultsSkeleton() {
  return (
    <div className="card skeleton" role="status">
      <span className="sr-only">Analizando la foto…</span>
      <span className="sk sk-kcal" />
      <span className="sk-row">
        <span className="sk sk-macro" />
        <span className="sk sk-macro" />
        <span className="sk sk-macro" />
      </span>
      <span className="sk sk-line" />
      <span className="sk sk-line short" />
    </div>
  );
}

// Analizador de fotos (el de siempre) + guardar el resultado en su hueco del día.
export default function AddMeal({ date, tipo, apiKey, model, onSaved, onOpenSettings }) {
  const [image, setImage] = useState(null); // { previewUrl, base64, mimeType, file }
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { dishes, confianza, notas }

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir la misma foto
    if (!file) return;
    setError("");
    setResult(null);
    try {
      setImage({ ...(await prepareImage(file)), file });
    } catch {
      setError("No se pudo leer la imagen.");
    }
  }

  async function analyze() {
    if (!image) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await analyzeFoodImage({
        apiKey,
        model,
        base64: image.base64,
        mimeType: image.mimeType,
        note,
      });
      if (!data.es_comida || !data.platos?.length) {
        setError("No parece que haya comida en la foto. Prueba con otra.");
      } else {
        setResult({
          dishes: data.platos.map((p) => ({ ...p, gramosBase: p.gramos })),
          confianza: data.confianza,
          notas: data.notas,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // La miniatura es opcional: si no se puede crear o guardar, la comida se guarda sin ella.
  async function storeThumb(id, source) {
    try {
      return (await putThumb(id, await source())) ? id : undefined;
    } catch {
      return undefined;
    }
  }

  async function save(platos, extra, thumbSource) {
    setSaving(true);
    setError("");
    try {
      const id = newId();
      const thumbId = await storeThumb(id, thumbSource);
      saveMeal(date, { id, tipo, platos, ...extra, thumbId });
      onSaved();
    } catch {
      setError("No se pudo guardar la comida. Puede que el almacenamiento esté lleno.");
      setSaving(false);
    }
  }

  const saveResult = () =>
    save(result.dishes, { confianza: result.confianza, notas: result.notas }, () =>
      makeThumbnail(image.file)
    );

  const saveSample = () =>
    save(samplePlatos(), { confianza: "media", notas: "Comida de prueba" }, sampleThumb);

  const updateGrams = (i, grams) =>
    setResult((r) => ({
      ...r,
      dishes: r.dishes.map((d, idx) => (idx === i ? { ...d, gramos: grams } : d)),
    }));

  const removeDish = (i) =>
    setResult((r) => ({ ...r, dishes: r.dishes.filter((_, idx) => idx !== i) }));

  return (
    <>
      <h2 className="screen-title">Añadir {MEAL_LABELS[tipo].toLowerCase()}</h2>

      {!apiKey && (
        <div className="error">
          Falta la API key de Gemini.{" "}
          <button className="link" onClick={onOpenSettings}>
            Añádela en Ajustes
          </button>
          .
        </div>
      )}

      <div className="card">
        {image ? (
          <div className={loading ? "photo scanning" : "photo"}>
            <img className="preview" src={image.previewUrl} alt="Comida a analizar" />
          </div>
        ) : (
          <button className="placeholder" onClick={() => cameraRef.current?.click()}>
            <Icon name="camera" />
            <span>Haz una foto a tu comida</span>
            <small>o elige una de la galería</small>
          </button>
        )}

        <div className="row">
          <button className="btn" disabled={loading} onClick={() => cameraRef.current?.click()}>
            <Icon name="camera" />
            Cámara
          </button>
          <button className="btn" disabled={loading} onClick={() => galleryRef.current?.click()}>
            <Icon name="image" />
            Galería
          </button>
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={onFile}
        />
        <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onFile} />

        <label className="field">
          <span>Nota (opcional)</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: 200 g de arroz, con aceite de oliva"
          />
        </label>

        <button
          className="btn primary full"
          disabled={!image || !apiKey || loading || saving}
          onClick={analyze}
        >
          {loading ? "Analizando…" : "Analizar macros"}
        </button>
      </div>

      {loading && <ResultsSkeleton />}

      {error && <div className="error">{error}</div>}

      {result && (
        <>
          <Results
            dishes={result.dishes}
            confianza={result.confianza}
            notas={result.notas}
            onGramsChange={updateGrams}
            onRemove={removeDish}
          />
          <button
            className="btn primary full"
            disabled={saving || result.dishes.length === 0}
            onClick={saveResult}
          >
            {saving ? "Guardando…" : `Guardar en ${MEAL_LABELS[tipo].toLowerCase()}`}
          </button>
        </>
      )}

      {import.meta.env.DEV && (
        <button className="btn full dev" disabled={saving} onClick={saveSample}>
          🧪 Añadir comida de prueba (solo desarrollo)
        </button>
      )}
    </>
  );
}
