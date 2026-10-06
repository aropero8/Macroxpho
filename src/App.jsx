import { useRef, useState } from "react";
import { analyzeFoodImage, DEFAULT_MODEL } from "./lib/gemini.js";
import { prepareImage } from "./lib/image.js";
import Settings from "./components/Settings.jsx";
import Results from "./components/Results.jsx";
import "./App.css";

const LS_KEY = "macrosnap.apiKey";
const LS_MODEL = "macrosnap.model";

export default function App() {
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem(LS_KEY) || import.meta.env.VITE_GEMINI_API_KEY || ""
  );
  const [model, setModel] = useState(
    () => localStorage.getItem(LS_MODEL) || DEFAULT_MODEL
  );
  const [showSettings, setShowSettings] = useState(!apiKey);

  const [image, setImage] = useState(null); // { previewUrl, base64, mimeType }
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
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
      setImage(await prepareImage(file));
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

  function saveSettings(key, mdl) {
    localStorage.setItem(LS_KEY, key);
    localStorage.setItem(LS_MODEL, mdl);
    setApiKey(key);
    setModel(mdl);
    setShowSettings(false);
  }

  const updateGrams = (i, grams) =>
    setResult((r) => ({
      ...r,
      dishes: r.dishes.map((d, idx) => (idx === i ? { ...d, gramos: grams } : d)),
    }));

  const removeDish = (i) =>
    setResult((r) => ({ ...r, dishes: r.dishes.filter((_, idx) => idx !== i) }));

  return (
    <div className="app">
      <header>
        <h1>MacroSnap</h1>
        <button className="icon" onClick={() => setShowSettings(true)} aria-label="Ajustes">
          ⚙️
        </button>
      </header>

      {showSettings ? (
        <Settings
          apiKey={apiKey}
          model={model}
          defaultModel={DEFAULT_MODEL}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      ) : (
        <>
          <div className="card">
            {image ? (
              <img className="preview" src={image.previewUrl} alt="Comida a analizar" />
            ) : (
              <div className="placeholder">Haz una foto a tu comida 🍽️</div>
            )}

            <div className="row">
              <button className="btn" onClick={() => cameraRef.current?.click()}>
                📷 Cámara
              </button>
              <button className="btn" onClick={() => galleryRef.current?.click()}>
                🖼️ Galería
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

            <button className="btn primary full" disabled={!image || loading} onClick={analyze}>
              {loading ? "Analizando…" : "Analizar macros"}
            </button>
          </div>

          {error && <div className="error">{error}</div>}

          {result && (
            <Results
              dishes={result.dishes}
              confianza={result.confianza}
              notas={result.notas}
              onGramsChange={updateGrams}
              onRemove={removeDish}
            />
          )}
        </>
      )}
    </div>
  );
}
