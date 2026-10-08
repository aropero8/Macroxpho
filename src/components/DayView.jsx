import { formatLong } from "../lib/date.js";
import { dayTotals, mealsOf, round } from "../lib/nutrition.js";
import { getDay, MEAL_LABELS, SLOTS } from "../lib/storage.js";
import Icon from "./Icon.jsx";
import MealSlot from "./MealSlot.jsx";
import ProteinBar from "./ProteinBar.jsx";

export default function DayView({ date, isToday, settings, onAdd, onOpenMeal, onOpenToday }) {
  const day = getDay(date);
  const readOnly = !isToday;
  const isEmpty = mealsOf(day).length === 0;
  const t = dayTotals(day);

  const title = (
    <div className="day-title">
      <div>
        <p className="label">{isToday ? formatLong(date) : "Día pasado"}</p>
        <h2 className={isToday ? "display" : "display small"}>
          {isToday ? "Hoy" : formatLong(date)}
        </h2>
      </div>
      {!isToday && <span className="badge">Solo lectura</span>}
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
          <div className="metric">
            <strong className="num">{round(t.kcal).toLocaleString("es-ES")}</strong>
            <span className="label">kcal{settings.kcalGoal ? ` de ${settings.kcalGoal}` : ""}</span>
          </div>
          <div className="metric">
            <strong className="num">
              {round(t.proteina_g)}
              <small>g</small>
            </strong>
            <span className="label">proteína</span>
          </div>
        </div>
        <p className="summary-minor">
          <span>
            <span className="label">Carbohidratos</span> {round(t.carbohidratos_g)} g
          </span>
          <span>
            <span className="label">Grasas</span> {round(t.grasas_g)} g
          </span>
        </p>
        <ProteinBar consumed={t.proteina_g} goal={settings.proteinGoal} />
      </div>

      {isEmpty && (
        <p className="hint center">
          Aún no has apuntado nada hoy. Toca <strong>Añadir</strong> y haz una foto a tu comida.
        </p>
      )}

      {SLOTS.map((slot) => (
        <section key={slot} className="slot-group">
          <h3 className="label">{MEAL_LABELS[slot]}</h3>
          <MealSlot
            meal={day[slot]}
            readOnly={readOnly}
            onAdd={() => onAdd(slot)}
            onOpen={onOpenMeal}
          />
        </section>
      ))}

      <section className="slot-group">
        <h3 className="label">Snacks</h3>
        {day.snacks.map((s) => (
          <MealSlot key={s.id} meal={s} readOnly={readOnly} onOpen={onOpenMeal} />
        ))}
        {readOnly
          ? day.snacks.length === 0 && <div className="slot empty">Sin snacks</div>
          : (
            <button className="slot empty" onClick={() => onAdd("snack")}>
              <Icon name="plus" />
              Añadir snack
            </button>
          )}
      </section>
    </>
  );
}
