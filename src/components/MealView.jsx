import { useState } from "react";
import { dateKey } from "../lib/date.js";
import { deleteMeal, findMeal, MEAL_LABELS, saveMeal } from "../lib/storage.js";
import Icon from "./Icon.jsx";
import ManualDish from "./ManualDish.jsx";
import Results from "./Results.jsx";
import Thumb from "./Thumb.jsx";

// "Guardada a las 14:05", o con la fecha si se apuntó otro día (p. ej. la cena de ayer).
function savedLabel(savedAt, date) {
  const d = new Date(savedAt);
  const time = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  if (dateKey(d) === date) return `Guardada a las ${time}`;
  const day = d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  return `Guardada el ${day} a las ${time}`;
}

// Detalle de una comida guardada. Hoy y ayer se pueden corregir gramos o borrarla;
// los días anteriores se muestran en solo lectura. Borrar no pide confirmación: quien llama
// ofrece "Deshacer" (onDeleted) y la foto solo se borra si no se deshace.
// Una comida pendiente espera a que Gemini analice su foto (pending.js); onRetry lo
// intenta en el momento.
export default function MealView({ date, mealId, readOnly, onRetry, onDone, onSaved, onDeleted }) {
  const [meal] = useState(() => findMeal(date, mealId));
  const [platos, setPlatos] = useState(() => meal?.platos ?? []);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [stillDown, setStillDown] = useState(false);

  if (!meal) {
    return (
      <div className="card">
        <p>Esta comida ya no existe.</p>
        <button className="btn" onClick={onDone}>
          Volver al día
        </button>
      </div>
    );
  }

  const edit = (fn) => {
    setPlatos(fn);
    setDirty(true);
  };

  async function retry() {
    setRetrying(true);
    setStillDown(false);
    const done = await onRetry();
    // Si se ha analizado, App vuelve a montar esta pantalla con el resultado.
    if (!done.some((d) => d.meal.id === meal.id)) {
      setRetrying(false);
      setStillDown(true);
    }
  }

  function save() {
    try {
      onSaved(saveMeal(date, { ...meal, platos: platos.map(({ manual: _, ...p }) => p) }));
    } catch {
      setError("No se pudo guardar. Puede que el almacenamiento esté lleno.");
    }
  }

  function remove() {
    deleteMeal(date, meal.id);
    onDeleted(meal);
  }

  return (
    <>
      <div className="meal-head">
        <Thumb id={meal.thumbId} className="large" />
        <div>
          <h2>{MEAL_LABELS[meal.tipo]}</h2>
          <small>{savedLabel(meal.savedAt, date)}</small>
        </div>
      </div>

      {meal.pendiente && (
        <div className="card notice">
          <strong>Foto pendiente de analizar</strong>
          <p className="hint">
            Gemini no respondía al guardarla. Se analiza sola en cuanto vuelva, mientras tengas
            la app abierta{platos.length > 0 ? ", y sus platos se suman a los que ves aquí" : ""}.
          </p>
          {stillDown && (
            <p className="hint warn">
              Gemini sigue sin responder. Lo vuelvo a intentar solo cada pocos minutos.
            </p>
          )}
          <button className="btn" disabled={retrying} onClick={retry}>
            <Icon name="clock" />
            {retrying ? "Probando…" : "Reintentar ahora"}
          </button>
        </div>
      )}

      {/* Pendiente y sin nada apuntado a mano: no hay nada que enseñar todavía */}
      {!(meal.pendiente && platos.length === 0) && (
        <Results
          dishes={platos}
          confianza={meal.confianza}
          notas={meal.notas}
          readOnly={readOnly}
          onGramsChange={(i, g) =>
            edit((ps) => ps.map((p, idx) => (idx === i ? { ...p, gramos: g } : p)))
          }
          onRemove={(i) => edit((ps) => ps.filter((_, idx) => idx !== i))}
        />
      )}

      {error && <div className="error">{error}</div>}

      {!readOnly && (
        <>
          {manual ? (
            <ManualDish
              onAdd={(dish) => edit((ps) => [...ps, dish])}
              onClose={() => setManual(false)}
            />
          ) : (
            <button className="btn ghost full" onClick={() => setManual(true)}>
              <Icon name="edit" />
              Añadir un plato a mano
            </button>
          )}
          {platos.length === 0 && !meal.pendiente && (
            <p className="hint center">Has quitado todos los platos: borra la comida entera.</p>
          )}
          <div className="row">
            <button className="btn danger" onClick={remove}>
              Borrar
            </button>
            <button
              className="btn primary"
              disabled={!dirty || platos.length === 0}
              onClick={save}
            >
              Guardar cambios
            </button>
          </div>
        </>
      )}
    </>
  );
}
