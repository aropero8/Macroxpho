import { useRef, useState } from "react";
import { analyzeFoodImage } from "../lib/gemini.js";
import { makeThumbnail, prepareImage } from "../lib/image.js";
import { samplePlatos, sampleThumb } from "../lib/devSample.js";
import { keepPhoto } from "../lib/pending.js";
import { MEAL_LABELS, newId, saveMeal } from "../lib/storage.js";
import { putThumb } from "../lib/thumbs.js";
import Icon from "./Icon.jsx";
import ManualDish from "./ManualDish.jsx";
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
// Los platos también se pueden apuntar a mano (sin foto ni Gemini), solos o junto a los
// de la foto: así, si Gemini falla, la comida no se queda sin apuntar.
export default function AddMeal({ date, tipo, apiKey, startManual, onSaved, onOpenSettings }) {
  const [image, setImage] = useState(null); // { previewUrl, base64, mimeType, file }
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [aiFailed, setAiFailed] = useState(false); // el error es de Gemini: ofrecer apuntar a mano
  const [dishes, setDishes] = useState([]); // de Gemini y apuntados a mano (manual: true)
  const [estimate, setEstimate] = useState(null); // { confianza, notas } de Gemini
  const [manual, setManual] = useState(Boolean(startManual)); // formulario de apuntar a mano abierto

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  // Quita la estimación anterior de Gemini; lo apuntado a mano se queda.
  function dropEstimate() {
    setDishes((ds) => ds.filter((d) => d.manual));
    setEstimate(null);
    setAiFailed(false);
  }

  function openManual() {
    setManual(true);
    setError("");
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir la misma foto
    if (!file) return;
    setError("");
    dropEstimate();
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
    dropEstimate();
    try {
      const data = await analyzeFoodImage({
        apiKey,
        base64: image.base64,
        mimeType: image.mimeType,
        note,
      });
      if (!data.es_comida || !data.platos?.length) {
        setError("No parece que haya comida en la foto. Prueba con otra.");
      } else {
        setDishes((ds) => [...data.platos.map((p) => ({ ...p, gramosBase: p.gramos })), ...ds]);
        setEstimate({ confianza: data.confianza, notas: data.notas });
      }
    } catch (err) {
      setError(err.message);
      setAiFailed(true);
    } finally {
      setLoading(false);
    }
  }

  // La miniatura es opcional: si no hay foto, o no se puede crear o guardar, la comida
  // se guarda sin ella.
  async function storeThumb(id, source) {
    if (!source) return undefined;
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
      onSaved(saveMeal(date, { id, tipo, platos, ...extra, thumbId }));
    } catch {
      setError("No se pudo guardar la comida. Puede que el almacenamiento esté lleno.");
      setSaving(false);
    }
  }

  // La confianza y las notas son de Gemini: si solo quedan platos apuntados a mano, no van.
  const fromGemini = dishes.some((d) => !d.manual);
  const confianza = fromGemini ? estimate?.confianza : undefined;
  const notas = fromGemini ? estimate?.notas : undefined;

  const saveResult = () =>
    save(
      dishes.map(({ manual: _, ...d }) => d),
      { confianza, notas: fromGemini ? notas : "Apuntada a mano" },
      image && (() => makeThumbnail(image.file))
    );

  // Gemini no responde: se guarda la comida con la foto (y lo apuntado a mano, si hay) y
  // se analiza sola cuando vuelva (pending.js).
  async function savePending() {
    setSaving(true);
    setError("");
    const id = newId();
    if (!(await keepPhoto(id, { ...image, note }))) {
      setError("No se pudo guardar la foto para analizarla más tarde.");
      setSaving(false);
      return;
    }
    const thumbId = await storeThumb(id, () => makeThumbnail(image.file));
    try {
      const platos = dishes.filter((d) => d.manual).map(({ manual: _, ...d }) => d);
      onSaved(saveMeal(date, { id, tipo, platos, pendiente: true, thumbId }));
    } catch {
      setError("No se pudo guardar la comida. Puede que el almacenamiento esté lleno.");
      setSaving(false);
    }
  }

  const saveSample = () =>
    save(samplePlatos(), { confianza: "media", notas: "Comida de prueba" }, sampleThumb);

  const updateGrams = (i, grams) =>
    setDishes((ds) => ds.map((d, idx) => (idx === i ? { ...d, gramos: grams } : d)));

  const removeDish = (i) => setDishes((ds) => ds.filter((_, idx) => idx !== i));

  const photoCard = (
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
  );

  // Lo apuntado y el botón de guardar, justo debajo de donde se está escribiendo.
  const results = dishes.length > 0 && (
    <>
      <Results
        dishes={dishes}
        confianza={confianza}
        notas={notas}
        onGramsChange={updateGrams}
        onRemove={removeDish}
      />
      <button className="btn primary full" disabled={saving} onClick={saveResult}>
        {saving ? "Guardando…" : `Guardar en ${MEAL_LABELS[tipo].toLowerCase()}`}
      </button>
    </>
  );

  return (
    <>
      <h2 className="screen-title">Añadir {MEAL_LABELS[tipo].toLowerCase()}</h2>

      {!apiKey && (
        <div className="error">
          Falta la API key de Gemini.{" "}
          <button className="link" onClick={onOpenSettings}>
            Añádela en Ajustes
          </button>{" "}
          o apunta la comida a mano.
        </div>
      )}

      {/* Arriba del todo: es la salida cuando Gemini no funciona */}
      {manual ? (
        <ManualDish
          onAdd={(dish) => setDishes((ds) => [...ds, dish])}
          onClose={() => setManual(false)}
        />
      ) : (
        <button className="btn ghost full" disabled={saving} onClick={openManual}>
          <Icon name="edit" />
          Apuntar a mano, sin IA
        </button>
      )}

      {manual && results}

      {!manual && photoCard}

      {loading && <ResultsSkeleton />}

      {error && (
        <div className="error">
          {error}
          {aiFailed && !manual && (
            <>
              {" "}
              Mientras tanto,{" "}
              <button className="link" onClick={openManual}>
                apúntala a mano
              </button>
              .
            </>
          )}
        </div>
      )}

      {aiFailed && image && !fromGemini && (
        <div className="card notice">
          <strong>¿Lo dejamos para luego?</strong>
          <p className="hint">
            Guardo la foto y Gemini la analiza solo en cuanto vuelva a responder, mientras
            tengas la app abierta. Te aviso cuando esté.
            {dishes.length > 0 && " Lo que hayas apuntado a mano se guarda también."}
          </p>
          <button className="btn" disabled={saving} onClick={savePending}>
            <Icon name="clock" />
            Guardar y analizar cuando vuelva
          </button>
        </div>
      )}

      {!manual && results}

      {manual && photoCard}

      {import.meta.env.DEV && (
        <button className="btn full dev" disabled={saving} onClick={saveSample}>
          🧪 Añadir comida de prueba (solo desarrollo)
        </button>
      )}
    </>
  );
}
