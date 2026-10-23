import { useRef, useState } from "react";
import { makeThumbnail, prepareImage } from "../lib/image.js";
import { MAX_PHOTOS, recommendMenu } from "../lib/menuAdvisor.js";
import { dayTotals, round, sumTotals } from "../lib/nutrition.js";
import { getDay, MEAL_LABELS, newId, saveMeal, SLOTS, suggestSlot } from "../lib/storage.js";
import { putThumb } from "../lib/thumbs.js";
import Icon from "./Icon.jsx";
import Results from "./Results.jsx";

const MENU_SIDE = 1600; // las cartas tienen letra pequeña
const TARGETS = [...SLOTS, "snack"];

const score = (n) => (Math.round(n * 10) / 10).toLocaleString("es-ES");

// "¿Qué pido?": fotos de varias opciones (platos, cartas o menús del día) → Gemini
// las compara con lo que queda del día y recomienda una. La elegida se puede apuntar.
export default function MenuAdvisor({ today, settings, apiKey, onSaved, onOpenSettings }) {
  const [photos, setPhotos] = useState([]); // { id, previewUrl, base64, mimeType, file }
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { options, veredicto, confianza }
  const [selected, setSelected] = useState(0);
  const [picked, setPicked] = useState(null);

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const day = getDay(today);
  const consumed = dayTotals(day);
  const proteinLeft = settings.proteinGoal - round(consumed.proteina_g);
  const target = picked && !(picked !== "snack" && day[picked]) ? picked : suggestSlot(new Date(), day);
  const full = photos.length >= MAX_PHOTOS;

  async function onFiles(e) {
    const files = [...(e.target.files || [])];
    e.target.value = ""; // permite volver a elegir la misma foto
    if (!files.length) return;
    setError("");
    setResult(null);
    const room = MAX_PHOTOS - photos.length;
    try {
      const added = await Promise.all(
        files.slice(0, room).map(async (file) => ({
          id: newId(),
          file,
          ...(await prepareImage(file, MENU_SIDE)),
        }))
      );
      setPhotos((p) => [...p, ...added].slice(0, MAX_PHOTOS));
      if (files.length > room) setError(`Como mucho ${MAX_PHOTOS} fotos: se han ignorado las demás.`);
    } catch {
      setError("No se pudo leer alguna de las imágenes.");
    }
  }

  function removePhoto(id) {
    setPhotos((p) => p.filter((x) => x.id !== id));
    setResult(null);
  }

  async function recommend() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await recommendMenu({
        apiKey,
        images: photos,
        note,
        day: { consumed, proteinGoal: settings.proteinGoal, kcalGoal: settings.kcalGoal },
      });
      if (!res) setError("No encuentro platos ni cartas en las fotos. Prueba con otras.");
      else {
        setResult(res);
        setSelected(0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const option = result?.options[selected];
  const source = option && photos[option.foto - 1];

  const updateDishes = (fn) =>
    setResult((r) => ({
      ...r,
      options: r.options.map((o, i) => {
        if (i !== selected) return o;
        const platos = fn(o.platos);
        return { ...o, platos, totales: sumTotals(platos) };
      }),
    }));

  // La miniatura es opcional: si no se puede crear o guardar, la comida se guarda sin ella.
  async function storeThumb(id) {
    if (!source) return undefined;
    try {
      return (await putThumb(id, await makeThumbnail(source.file))) ? id : undefined;
    } catch {
      return undefined;
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const id = newId();
      const thumbId = await storeThumb(id);
      onSaved(
        saveMeal(today, {
          id,
          tipo: target,
          platos: option.platos,
          confianza: result.confianza,
          notas: `Elegido con el recomendador: ${option.nombre}`,
          thumbId,
        })
      );
    } catch {
      setError("No se pudo guardar la comida. Puede que el almacenamiento esté lleno.");
      setSaving(false);
    }
  }

  return (
    <>
      <div>
        <h2 className="screen-title">¿Qué pido?</h2>
        <p className="hint">
          Haz fotos de las cartas, menús o platos entre los que dudas y te digo cuál encaja mejor
          con tu día
          {settings.proteinGoal > 0 &&
            (proteinLeft > 0
              ? ` (te quedan ${proteinLeft} g de proteína).`
              : " (ya has llegado a tu objetivo de proteína)."
            )}
        </p>
      </div>

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
        {photos.length ? (
          <ul className={`menu-photos${loading ? " scanning" : ""}`}>
            {photos.map((p, i) => (
              <li key={p.id} className="menu-photo">
                <img src={p.previewUrl} alt={`Foto ${i + 1}`} />
                <span className="menu-photo-num">{i + 1}</span>
                <button
                  className="menu-photo-remove"
                  disabled={loading}
                  onClick={() => removePhoto(p.id)}
                  aria-label={`Quitar la foto ${i + 1}`}
                >
                  <Icon name="close" />
                </button>
              </li>
            ))}
            {!full && (
              <li>
                <button
                  className="menu-photo add"
                  disabled={loading}
                  onClick={() => cameraRef.current?.click()}
                  aria-label="Añadir otra foto"
                >
                  <Icon name="plus" />
                </button>
              </li>
            )}
          </ul>
        ) : (
          <button className="placeholder" onClick={() => cameraRef.current?.click()}>
            <Icon name="camera" />
            <span>Fotografía las opciones</span>
            <small>Cartas, menús del día o platos · hasta {MAX_PHOTOS}</small>
          </button>
        )}

        <div className="row">
          <button className="btn" disabled={loading || full} onClick={() => cameraRef.current?.click()}>
            <Icon name="camera" />
            Cámara
          </button>
          <button className="btn" disabled={loading || full} onClick={() => galleryRef.current?.click()}>
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
          onChange={onFiles}
        />
        <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />

        <label className="field">
          <span>Preferencias (opcional)</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: sin cerdo, algo ligero, mucha hambre"
          />
        </label>

        <button
          className="btn primary full"
          disabled={!photos.length || !apiKey || loading || saving}
          onClick={recommend}
        >
          <Icon name="sparkle" />
          {loading
            ? "Comparando…"
            : photos.length > 1
              ? `Comparar ${photos.length} fotos`
              : "Recomendar"}
        </button>
      </div>

      {loading && (
        <div className="card skeleton" role="status">
          <span className="sr-only">Comparando las opciones…</span>
          <span className="sk sk-line" />
          <span className="sk sk-line short" />
          <span className="sk sk-line" />
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {result && (
        <>
          <div className="card verdict">
            <span className="verdict-head">
              <span className="label">Te recomiendo</span>
              {result.confianza && (
                <span className={`badge ${result.confianza}`}>Confianza {result.confianza}</span>
              )}
            </span>
            <h3>{result.options[0].nombre}</h3>
            {result.veredicto && <p className="notes">{result.veredicto}</p>}
          </div>

          {result.options.length > 1 && (
            <div className="card">
              <p className="label" id="options-label">
                Todas las opciones
              </p>
              <div className="options" role="radiogroup" aria-labelledby="options-label">
                {result.options.map((o, i) => (
                  <button
                    key={i}
                    className="option"
                    role="radio"
                    aria-checked={selected === i}
                    onClick={() => setSelected(i)}
                  >
                    {photos[o.foto - 1] ? (
                      <img className="thumb" src={photos[o.foto - 1].previewUrl} alt="" />
                    ) : (
                      <span className="thumb empty">
                        <Icon name="plate" />
                      </span>
                    )}
                    <span className="option-info">
                      <strong>{o.nombre}</strong>
                      <small>
                        {round(o.totales.kcal)} kcal · {round(o.totales.proteina_g)} g proteína
                      </small>
                      <small className="option-why">{o.motivo}</small>
                    </span>
                    <span className={`option-score${i === 0 ? " best" : ""}`}>
                      {score(o.puntuacion)}
                      <small>/10</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Results
            dishes={option.platos}
            confianza={null}
            onGramsChange={(idx, grams) =>
              updateDishes((ps) => ps.map((d, j) => (j === idx ? { ...d, gramos: grams } : d)))
            }
            onRemove={(idx) => updateDishes((ps) => ps.filter((_, j) => j !== idx))}
          />

          <div className="home-cta">
            <p className="label" id="menu-target-label">
              Apuntar en
            </p>
            <div className="chips" role="radiogroup" aria-labelledby="menu-target-label">
              {TARGETS.map((slot) => {
                const taken = slot !== "snack" && Boolean(day[slot]);
                return (
                  <button
                    key={slot}
                    className="chip"
                    role="radio"
                    aria-checked={target === slot}
                    disabled={taken}
                    onClick={() => setPicked(slot)}
                  >
                    {MEAL_LABELS[slot]}
                    {taken && <span className="sr-only"> (ya registrada)</span>}
                  </button>
                );
              })}
            </div>
            <button
              className="btn primary full"
              disabled={saving || option.platos.length === 0}
              onClick={save}
            >
              {saving ? "Guardando…" : `Me lo pido: guardar en ${MEAL_LABELS[target].toLowerCase()}`}
            </button>
          </div>
        </>
      )}
    </>
  );
}
