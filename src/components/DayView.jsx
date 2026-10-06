import { formatLong } from "../lib/date.js";
import { dayTotals, round } from "../lib/nutrition.js";
import { getDay, MEAL_LABELS, SLOTS } from "../lib/storage.js";
import MealSlot from "./MealSlot.jsx";
import ProteinBar from "./ProteinBar.jsx";

export default function DayView({ date, isToday, settings, onAdd, onOpenMeal }) {
  const day = getDay(date);
  const readOnly = !isToday;
  const t = dayTotals(day);

  return (
    <>
      <div className="day-title">
        <h2>{isToday ? "Hoy" : formatLong(date)}</h2>
        {isToday ? (
          <small>{formatLong(date)}</small>
        ) : (
          <span className="badge">Solo lectura</span>
        )}
      </div>

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
