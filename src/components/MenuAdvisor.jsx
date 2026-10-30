import { useEffect, useRef, useState } from "react";
import { makeThumbnail, prepareImage } from "../lib/image.js";
import { MAX_PHOTOS, recommendMenu } from "../lib/menuAdvisor.js";
import { dayTotals, round, sumTotals } from "../lib/nutrition.js";
import {
  deleteMenu,
  getDay,
  listMenus,
  MEAL_LABELS,
  newId,
  saveMeal,
  saveMenu,
  SLOTS,
  suggestSlot,
} from "../lib/storage.js";
import {
  deleteMenuDraft,
  deleteThumb,
  getMenuDraft,
  getThumb,
  menuThumbId,
  putMenuDraft,
  putThumb,
} from "../lib/thumbs.js";
import { useConfirm } from "./ConfirmDialog.jsx";
import Icon from "./Icon.jsx";
import Results from "./Results.jsx";
import Thumb from "./Thumb.jsx";

const MENU_SIDE = 1600; // las cartas tienen letra pequeña
const TARGETS = [...SLOTS, "snack"];

const score = (n) => (Math.round(n * 10) / 10).toLocaleString("es-ES");
const shortDate = (iso) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
const photoBlob = (p) => fetch(p.previewUrl).then((r) => r.blob());

// Lo que se guarda del borrador: las fotos sin la vista previa, que se rehace al leerlo.
function writeDraft(d) {
  if (!d.photos.length && !d.result) return deleteMenuDraft();
  return putMenuDraft({
    ...d,
    photos: d.photos.map(({ id, base64, mimeType }) => ({ id, base64, mimeType })),
  });
}

// "¿Qué pido?": fotos de varias opciones (platos, cartas o menús del día) → Gemini
// las compara con lo que queda del día y recomienda una. La elegida se puede apuntar.
// Lo que haya en pantalla se guarda solo como borrador (no se pierde al salir), y la
// recomendación se puede guardar con un nombre y notas propias para consultarla otro día.
export default function MenuAdvisor({ today, settings, apiKey, onSaved, onOpenSettings }) {
  const [photos, setPhotos] = useState([]); // { id, previewUrl, base64, mimeType }
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { options, veredicto, confianza }
  const [selected, setSelected] = useState(0);
  const [picked, setPicked] = useState(null);
  // Recomendación guardada que se está viendo (o la que se acaba de guardar)
  const [savedId, setSavedId] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [notas, setNotas] = useState("");
  const [menus, setMenus] = useState(listMenus);
  const [ready, setReady] = useState(false); // borrador leído
  const [confirm, dialog] = useConfirm();

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const draftRef = useRef(null);

  const day = getDay(today);
  const consumed = dayTotals(day);
  const proteinLeft = settings.proteinGoal - round(consumed.proteina_g);
  const target = picked && !(picked !== "snack" && day[picked]) ? picked : suggestSlot(new Date(), day);
  const full = photos.length >= MAX_PHOTOS;
  const saved = menus.find((m) => m.id === savedId);
  const viewingSaved = Boolean(saved) && photos.length === 0; // abierta desde la lista

  // Al entrar, se recupera lo que hubiera a medias.
  useEffect(() => {
    let cancelled = false;
    getMenuDraft().then((d) => {
      if (cancelled) return;
      if (d) {
        setPhotos((d.photos || []).map((p) => ({ ...p, previewUrl: `data:${p.mimeType};base64,${p.base64}` })));
        setNote(d.note || "");
        setResult(d.result || null);
        setSelected(d.selected || 0);
        setSavedId(listMenus().some((m) => m.id === d.savedId) ? d.savedId : null);
        setTitulo(d.titulo || "");
        setNotas(d.notas || "");
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Y se guarda al cambiar (con un respiro mientras se escribe), al salir de la pantalla y
  // al dejar la app en segundo plano.
  useEffect(() => {
    if (!ready) return;
    draftRef.current = { photos, note, result, selected, savedId, titulo, notas };
    const t = setTimeout(() => writeDraft(draftRef.current), 400);
    return () => clearTimeout(t);
  }, [ready, photos, note, result, selected, savedId, titulo, notas]);

  useEffect(() => {
    const flush = () => draftRef.current && writeDraft(draftRef.current);
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, []);

  function reset() {
    draftRef.current = null; // que el guardado al salir no lo resucite
    deleteMenuDraft();
    setPhotos([]);
    setNote("");
    setResult(null);
    setSelected(0);
    setPicked(null);
    setSavedId(null);
    setTitulo("");
    setNotas("");
    setError("");
  }

  // Descartar una recomendación sin guardar se confirma: costó una llamada a Gemini.
  async function canDiscard() {
    if (!result || savedId) return true;
    return confirm({
      title: "¿Descartar esta recomendación?",
      message: "No la has guardado. Si sigues, se pierde.",
      confirmLabel: "Descartar",
      danger: true,
    });
  }

  async function startNew() {
    if (await canDiscard()) reset();
  }

  async function openMenu(m) {
    if (m.id === savedId && viewingSaved) return;
    if (!(await canDiscard())) return;
    reset();
    setNote(m.nota || "");
    setResult({ options: m.options, veredicto: m.veredicto, confianza: m.confianza });
    setSavedId(m.id);
    setTitulo(m.titulo || "");
    setNotas(m.notas || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Cambiar las fotos o volver a preguntar es otra recomendación: se suelta la guardada.
  function detach() {
    setResult(null);
    setSavedId(null);
  }

  async function onFiles(e) {
    const files = [...(e.target.files || [])];
    e.target.value = ""; // permite volver a elegir la misma foto
    if (!files.length) return;
    setError("");
    detach();
    const room = MAX_PHOTOS - photos.length;
    try {
      const added = await Promise.all(
        files.slice(0, room).map(async (file) => ({
          id: newId(),
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
    detach();
  }

  async function recommend() {
    setLoading(true);
    setError("");
    detach();
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

  const updateDishes = (fn) =>
    setResult((r) => ({
      ...r,
      options: r.options.map((o, i) => {
        if (i !== selected) return o;
        const platos = fn(o.platos);
        return { ...o, platos, totales: sumTotals(platos) };
      }),
    }));

  // Miniatura de la foto de la que sale una opción: la foto en pantalla o, si se abrió
  // desde Guardadas, la que se guardó con ella.
  const optionThumb = (o) =>
    photos[o.foto - 1] ? (
      <img className="thumb" src={photos[o.foto - 1].previewUrl} alt="" />
    ) : (
      <Thumb id={savedId ? menuThumbId(savedId, o.foto) : null} />
    );

  /* ---------- Guardadas ---------- */

  async function saveRecommendation() {
    setError("");
    const id = newId();
    // Las miniaturas son opcionales: si alguna falla, esa opción sale sin foto.
    await Promise.all(
      photos.map(async (p, i) => {
        try {
          await putThumb(menuThumbId(id, i + 1), await makeThumbnail(await photoBlob(p)));
        } catch {}
      })
    );
    try {
      saveMenu({
        id,
        titulo: titulo.trim(),
        nota: note.trim(),
        notas: notas.trim(),
        veredicto: result.veredicto,
        confianza: result.confianza,
        fotos: photos.length,
        options: result.options,
      });
    } catch {
      setError("No se pudo guardar. Puede que el almacenamiento esté lleno.");
      return;
    }
    setSavedId(id);
    setMenus(listMenus());
  }

  // Ya guardada, el nombre y las notas se actualizan solos.
  function editSaved(patch) {
    if (patch.titulo != null) setTitulo(patch.titulo);
    if (patch.notas != null) setNotas(patch.notas);
    if (!saved) return;
    try {
      saveMenu({ ...saved, ...patch });
      setMenus(listMenus());
    } catch {
      setError("No se pudieron guardar los cambios. Puede que el almacenamiento esté lleno.");
    }
  }

  async function removeSaved() {
    const ok = await confirm({
      title: "¿Quitar de guardadas?",
      message: `Se borrará «${saved.titulo || saved.options[0].nombre}» con tus notas.`,
      confirmLabel: "Quitar",
      danger: true,
    });
    if (!ok) return;
    deleteMenu(saved.id);
    for (let n = 1; n <= (saved.fotos || 0); n++) deleteThumb(menuThumbId(saved.id, n));
    setMenus(listMenus());
    if (viewingSaved) reset();
    else setSavedId(null);
  }

  /* ---------- Apuntar la elegida ---------- */

  // La miniatura es opcional: si no se puede crear o guardar, la comida se guarda sin ella.
  async function storeThumb(id) {
    try {
      const live = photos[option.foto - 1];
      const blob = live
        ? await makeThumbnail(await photoBlob(live))
        : savedId && (await getThumb(menuThumbId(savedId, option.foto)));
      return blob && (await putThumb(id, blob)) ? id : undefined;
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
      const meal = saveMeal(today, {
        id,
        tipo: target,
        platos: option.platos,
        confianza: result.confianza,
        notas: `Elegido con el recomendador: ${option.nombre}`,
        thumbId,
      });
      reset(); // apuntada: el borrador ya no hace falta (la guardada, si la hay, sigue)
      onSaved(meal);
    } catch {
      setError("No se pudo guardar la comida. Puede que el almacenamiento esté lleno.");
      setSaving(false);
    }
  }

  return (
    <>
      <div>
        <div className="title-row">
          <h2 className="screen-title">¿Qué pido?</h2>
          {(photos.length > 0 || result) && (
            <button className="btn ghost small" disabled={loading || saving} onClick={startNew}>
              <Icon name="plus" />
              Nueva
            </button>
          )}
        </div>
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

      {viewingSaved ? (
        <div className="card saved-head">
          <p className="label">
            <Icon name="bookmark" />
            Guardada el {shortDate(saved.savedAt)}
          </p>
          <h3>{saved.titulo || saved.options[0].nombre}</h3>
          {saved.nota && <p className="hint">Preferencias: {saved.nota}</p>}
        </div>
      ) : (
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
      )}

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
                    {optionThumb(o)}
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

          <div className={`card menu-save${saved ? " is-saved" : ""}`}>
            <div className="menu-save-head">
              <p className="label">{saved ? "Tus notas" : "Guardar para otro día"}</p>
              {saved && (
                <span className="saved-badge">
                  <Icon name="check" />
                  Guardada
                </span>
              )}
            </div>
            <label className="field">
              <span>Nombre</span>
              <input
                type="text"
                value={titulo}
                onChange={(e) => editSaved({ titulo: e.target.value })}
                placeholder="Ej: Bar Manolo, menú de la semana"
              />
            </label>
            <label className="field">
              <span>Notas</span>
              <textarea
                rows={3}
                value={notas}
                onChange={(e) => editSaved({ notas: e.target.value })}
                placeholder="Ej: la ración es enorme, pedir la salsa aparte"
              />
            </label>
            {saved ? (
              <div className="menu-save-foot">
                <small>Los cambios se guardan solos.</small>
                <button className="link" onClick={removeSaved}>
                  Quitar de guardadas
                </button>
              </div>
            ) : (
              <button className="btn tonal full" disabled={loading} onClick={saveRecommendation}>
                <Icon name="bookmark" />
                Guardar recomendación
              </button>
            )}
          </div>

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

      {menus.length > 0 && (
        <section className="saved-menus" aria-labelledby="saved-menus-title">
          <h3 id="saved-menus-title" className="label">
            Guardadas
          </h3>
          <ul>
            {menus.map((m) => {
              const best = m.options[0];
              return (
                <li key={m.id}>
                  <button
                    className="saved-menu"
                    aria-current={m.id === savedId ? "true" : undefined}
                    onClick={() => openMenu(m)}
                  >
                    <Thumb id={menuThumbId(m.id, best.foto)} />
                    <span className="option-info">
                      <strong>{m.titulo || best.nombre}</strong>
                      <small>
                        {shortDate(m.savedAt)} · {m.titulo ? `${best.nombre} · ` : ""}
                        {m.options.length} {m.options.length === 1 ? "opción" : "opciones"}
                      </small>
                      {m.notas && <small className="saved-menu-notes">{m.notas}</small>}
                    </span>
                    <span className="option-score best">
                      {score(best.puntuacion)}
                      <small>/10</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {dialog}
    </>
  );
}
