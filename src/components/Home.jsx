import { formatLong, greeting } from "../lib/date.js";
import { dayTotals, mealsOf, round } from "../lib/nutrition.js";
import { getDay } from "../lib/storage.js";

export default function Home({ now, today, settings, onOpenToday }) {
  const { hello, question } = greeting(now);
  const day = getDay(today);
  const t = dayTotals(day);

  return (
    <div className="home">
      <div className="greeting">
        <p>{hello}</p>
        <h2>{question}</h2>
      </div>

      <button className="btn primary big" onClick={onOpenToday}>
        Abrir el día de hoy
        <small>{formatLong(today)}</small>
      </button>

      {mealsOf(day).length > 0 && (
        <p className="hint center">
          Hoy llevas {round(t.kcal)} kcal y {round(t.proteina_g)} g de proteína de{" "}
          {settings.proteinGoal} g.
        </p>
      )}
    </div>
  );
}
