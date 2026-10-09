import { addDays, formatLong, parseKey, weekStart } from "../lib/date.js";
import { dayTotals, round } from "../lib/nutrition.js";
import { getDay } from "../lib/storage.js";
import Icon from "./Icon.jsx";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const MAX_STREAK = 365;

const proteinOf = (key) => round(dayTotals(getDay(key)).proteina_g);

// Días seguidos con el objetivo conseguido. Hoy cuenta si ya se ha llegado; si no,
// la racha sigue viva desde ayer (el día aún no ha terminado).
function streak(today, goal) {
  if (!(goal > 0)) return 0;
  let key = proteinOf(today) >= goal ? today : addDays(today, -1);
  let n = 0;
  while (n < MAX_STREAK && proteinOf(key) >= goal) {
    n++;
    key = addDays(key, -1);
  }
  return n;
}

// La semana actual (lunes a domingo): un mini anillo de proteína por día. Tocar un día lo abre.
export default function WeekStrip({ today, goal, onOpenDay }) {
  const monday = weekStart(today);
  const days = WEEKDAYS.map((letter, i) => {
    const key = addDays(monday, i);
    const protein = key > today ? 0 : proteinOf(key);
    return {
      key,
      letter,
      protein,
      future: key > today,
      reached: goal > 0 && protein >= goal,
      frac: goal > 0 ? Math.min(1, protein / goal) : 0,
    };
  });
  const run = streak(today, goal);

  return (
    <section className="week" aria-labelledby="week-label">
      <div className="week-head">
        <h3 className="label" id="week-label">
          Esta semana
        </h3>
        {run >= 2 && (
          <span className="streak">
            <Icon name="flame" />
            {run} días seguidos
          </span>
        )}
      </div>
      <div className="week-days">
        {days.map((d) => {
          const cls = ["week-day", d.key === today && "today", d.reached && "done"]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={d.key}
              className={cls}
              disabled={d.future}
              onClick={() => onOpenDay(d.key)}
              aria-current={d.key === today ? "date" : undefined}
              aria-label={
                d.future
                  ? formatLong(d.key)
                  : `${formatLong(d.key)}: ${d.protein} de ${goal} g de proteína${d.reached ? ", objetivo conseguido" : ""}`
              }
            >
              <span className="week-letter" aria-hidden="true">
                {d.letter}
              </span>
              <span className="week-dot" style={{ "--p": d.frac }} aria-hidden="true">
                {d.reached ? <Icon name="check" /> : parseKey(d.key).getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
