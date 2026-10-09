import { useState } from "react";
import { formatLong, greeting } from "../lib/date.js";
import { dayTotals, mealsOf, round } from "../lib/nutrition.js";
import { getDay, MEAL_LABELS, SLOTS, suggestSlot } from "../lib/storage.js";
import Icon from "./Icon.jsx";
import ProteinRing, { useGoalCelebration } from "./ProteinRing.jsx";
import WeekStrip from "./WeekStrip.jsx";

const TARGETS = [...SLOTS, "snack"];

export default function Home({
  now,
  today,
  settings,
  hasApiKey,
  onOpenToday,
  onOpenDay,
  onAddMeal,
  onOpenSettings,
}) {
  const { hello, question } = greeting(now);
  const day = getDay(today);
  const t = dayTotals(day);
  const count = mealsOf(day).length;
  const protein = round(t.proteina_g);
  const goal = settings.proteinGoal;
  const left = goal - protein;
  const reached = goal > 0 && left <= 0;
  const celebration = useGoalCelebration(today, reached, true);

  let note = "Aún no has apuntado nada hoy";
  // Mientras el anillo se llena, la línea queda reservada (sin saltos) y el mensaje
  // aparece con la celebración.
  if (reached) note = celebration.pending ? "\u00a0" : "¡Objetivo de proteína conseguido!\u00a0💪";
  else if (count > 0) note = `Quedan ${left} g de proteína`;

  // El hueco propuesto se puede cambiar; los huecos ya ocupados no se ofrecen.
  const [picked, setPicked] = useState(null);
  const target = picked && !(picked !== "snack" && day[picked]) ? picked : suggestSlot(now, day);

  return (
    <div className="home">
      <div className="greeting">
        <p className="label">{formatLong(today)}</p>
        <h2 className="display">{hello}</h2>
        <p className="greeting-question">{question}</p>
      </div>

      <button
        className="card today-card"
        onClick={onOpenToday}
        aria-label={`Ver el día de hoy: ${round(t.kcal)} kcal y ${protein} de ${goal} g de proteína`}
      >
        <span className="today-head">
          <span className="label">Hoy</span>
          <span className="today-link">
            Ver el día
            <Icon name="next" />
          </span>
        </span>
        <span className="today-body">
          <ProteinRing
            size="sm"
            date={today}
            consumed={t.proteina_g}
            goal={goal}
            celebrating={celebration.active}
            onSettled={celebration.start}
          />
          <span className="today-side">
            <span className="metric">
              <strong className="num">{round(t.kcal).toLocaleString("es-ES")}</strong>
              <span className="label">kcal{settings.kcalGoal ? ` de ${settings.kcalGoal}` : ""}</span>
            </span>
            <span
              className={`today-note${reached ? " done" : ""}${celebration.active ? " celebrate" : ""}`}
            >
              {note}
              {reached && !celebration.pending && left < 0 && <small>+{-left} g sobre el objetivo</small>}
            </span>
          </span>
        </span>
      </button>

      <WeekStrip today={today} goal={goal} onOpenDay={onOpenDay} />

      {!hasApiKey && (
        <div className="card notice">
          <strong>Primer paso: tu API key de Gemini</strong>
          <p className="hint">
            Para analizar fotos necesitas una key gratuita de Google AI Studio. Se guarda solo
            en este dispositivo.
          </p>
          <button className="btn" onClick={onOpenSettings}>
            Ir a Ajustes
          </button>
        </div>
      )}

      <div className="home-cta">
        <p className="label" id="target-label">
          Guardar en
        </p>
        <div className="chips" role="radiogroup" aria-labelledby="target-label">
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
        <button className="btn primary xl" onClick={() => onAddMeal(target)}>
          <Icon name="plus" />
          Añadir comida
        </button>
      </div>
    </div>
  );
}
