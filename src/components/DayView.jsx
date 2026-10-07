import { formatLong } from "../lib/date.js";
import { dayTotals, mealsOf, round } from "../lib/nutrition.js";
import { getDay, MEAL_LABELS, SLOTS } from "../lib/storage.js";
import MealSlot from "./MealSlot.jsx";
import ProteinBar from "./ProteinBar.jsx";

export default function DayView({ date, isToday, settings, onAdd, onOpenMeal, onOpenToday }) {
  const day = getDay(date);
  const readOnly = !isToday;
  const isEmpty = mealsOf(day).length === 0;
  const t = dayTotals(day);

  const title = (
    <div className="day-title">
      <h2>{isToday ? "Hoy" : formatLong(date)}</h2>
      {isToday ? <small>{formatLong(date)}</small> : <span className="badge">Solo lectura</span>}
    </div>
  );

  // Día pasado sin nada: un aviso en vez de un resumen a cero y cuatro huecos vacíos.
  if (readOnly && isEmpty) {
    return (
      <>
        {title}
        <div className="card empty-state">
          <span aria-hidden="true">📭</span>
          <p>No registraste comidas este día.</p>
          <button className="btn" onClick={onOpenToday}>
            Ir a hoy
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {title}

      <div className="card summary">
        <div className="summary-main">
          <div>
            <strong>{round(t.kcal)}</strong>
            <span>kcal{settings.kcalGoal ? ` de ${settings.kcalGoal}` : ""}</span>
          </div>
          <div>
            <strong>{round(t.proteina_g)} g</strong>
            <span>proteína</span>
          </div>
        </div>
        <p className="summary-minor">
          Carbohidratos {round(t.carbohidratos_g)} g · Grasas {round(t.grasas_g)} g
        </p>
        <ProteinBar consumed={t.proteina_g} goal={settings.proteinGoal} />
      </div>

      {isEmpty && (
        <p className="hint center">
          Aún no has apuntado nada hoy. Toca <strong>+ Añadir</strong> y haz una foto a tu comida.
        </p>
      )}

      {SLOTS.map((slot) => (
        <section key={slot} className="slot-group">
          <h3>{MEAL_LABELS[slot]}</h3>
          <MealSlot
            meal={day[slot]}
            readOnly={readOnly}
            onAdd={() => onAdd(slot)}
            onOpen={onOpenMeal}
          />
        </section>
      ))}

      <section className="slot-group">
        <h3>Snacks</h3>
        {day.snacks.map((s) => (
          <MealSlot key={s.id} meal={s} readOnly={readOnly} onOpen={onOpenMeal} />
        ))}
        {readOnly
          ? day.snacks.length === 0 && <div className="slot empty">Sin snacks</div>
          : (
            <button className="slot empty" onClick={() => onAdd("snack")}>
              + Añadir snack
            </button>
          )}
      </section>
    </>
  );
}
