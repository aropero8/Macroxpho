import { useRef } from "react";
import { formatLong } from "../lib/date.js";
import { dayTotals, mealsOf, round } from "../lib/nutrition.js";
import { getDay, MEAL_LABELS, SLOTS } from "../lib/storage.js";
import Icon from "./Icon.jsx";
import MealSlot from "./MealSlot.jsx";
import ProteinRing, { GoalMessage, useGoalCelebration } from "./ProteinRing.jsx";

const SWIPE_MIN = 70; // px en horizontal para cambiar de día

// Deslizar a la derecha = día anterior; a la izquierda = siguiente. Solo gestos claramente
// horizontales, y no al arrastrar dentro de un campo de texto.
function useSwipe(onPrev, onNext) {
  const start = useRef(null);
  return {
    onTouchStart(e) {
      const t = e.touches[0];
      start.current = e.target.closest("input, textarea") ? null : { x: t.clientX, y: t.clientY };
    },
    onTouchEnd(e) {
      if (!start.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.current.x;
      const dy = t.clientY - start.current.y;
      start.current = null;
      if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < 1.5 * Math.abs(dy)) return;
      if (dx > 0) onPrev?.();
      else onNext?.();
    },
  };
}

// onPrevDay / onNextDay: cambiar de día con las flechas o deslizando (onNextDay es null en hoy).
export default function DayView({
  date,
  isToday,
  settings,
  onAdd,
  onOpenMeal,
  onOpenToday,
  onPrevDay,
  onNextDay,
}) {
  const day = getDay(date);
  const readOnly = !isToday;
  const isEmpty = mealsOf(day).length === 0;
  const t = dayTotals(day);
  const goal = settings.proteinGoal;
  const reached = goal > 0 && round(t.proteina_g) >= goal;
  // Solo hoy se celebra; los días pasados muestran el estado final sin animación.
  const celebration = useGoalCelebration(date, reached, isToday);
  const swipe = useSwipe(onPrevDay, onNextDay);

  const title = (
    <div className="day-title">
      <div>
        {isToday ? (
          <p className="label">{formatLong(date)}</p>
        ) : (
          <span className="badge">Día pasado · solo lectura</span>
        )}
        <h2 className={isToday ? "display" : "display small"}>
          {isToday ? "Hoy" : formatLong(date)}
        </h2>
      </div>
      <div className="day-nav">
        <button className="icon round" onClick={onPrevDay} aria-label="Día anterior">
          <Icon name="back" />
        </button>
        <button
          className="icon round"
          onClick={onNextDay}
          disabled={!onNextDay}
          aria-label="Día siguiente"
        >
          <Icon name="next" />
        </button>
      </div>
    </div>
  );

  // Día pasado sin nada: un aviso en vez de un resumen a cero y cuatro huecos vacíos.
  if (readOnly && isEmpty) {
    return (
      <div className="swipe-area" {...swipe}>
        {title}
        <div className="card empty-state">
          <span aria-hidden="true">📭</span>
          <p>No registraste comidas este día.</p>
          <button className="btn" onClick={onOpenToday}>
            Ir a hoy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="swipe-area" {...swipe}>
      {title}

      <div className="card summary">
        <ProteinRing
          date={date}
          consumed={t.proteina_g}
          goal={goal}
          animate={isToday}
          celebrating={celebration.active}
          onSettled={celebration.start}
        />
        {reached && !celebration.pending && (
          <GoalMessage consumed={t.proteina_g} goal={goal} celebrating={celebration.active} />
        )}
        <div className="summary-row">
          <div className="metric">
            <strong className="num">{round(t.kcal).toLocaleString("es-ES")}</strong>
            <span className="label">kcal{settings.kcalGoal ? ` de ${settings.kcalGoal}` : ""}</span>
          </div>
          <div className="metric">
            <strong className="num">
              {round(t.carbohidratos_g)}
              <small>g</small>
            </strong>
            <span className="label">Carbohidratos</span>
          </div>
          <div className="metric">
            <strong className="num">
              {round(t.grasas_g)}
              <small>g</small>
            </strong>
            <span className="label">Grasas</span>
          </div>
        </div>
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
    </div>
  );
}
