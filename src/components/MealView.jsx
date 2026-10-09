import { useState } from "react";
import { deleteMeal, findMeal, MEAL_LABELS, saveMeal } from "../lib/storage.js";
import Results from "./Results.jsx";
import Thumb from "./Thumb.jsx";

// Detalle de una comida guardada. Hoy se pueden corregir gramos o borrarla;
// los días pasados se muestran en solo lectura. Borrar no pide confirmación: quien llama
// ofrece "Deshacer" (onDeleted) y la foto solo se borra si no se deshace.
export default function MealView({ date, mealId, readOnly, onDone, onSaved, onDeleted }) {
  const [meal] = useState(() => findMeal(date, mealId));
  const [platos, setPlatos] = useState(() => meal?.platos ?? []);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

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

  function save() {
    try {
      onSaved(saveMeal(date, { ...meal, platos }));
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
          <small>
            Guardada a las{" "}
            {new Date(meal.savedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
          </small>
        </div>
      </div>

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

      {error && <div className="error">{error}</div>}

      {!readOnly && (
        <>
          {platos.length === 0 && (
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
