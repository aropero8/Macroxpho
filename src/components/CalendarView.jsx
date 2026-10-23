import { useState } from "react";
import { formatLong } from "../lib/date.js";
import { dayTotals, mealsOf, round } from "../lib/nutrition.js";
import { getDay, listDaysWithData } from "../lib/storage.js";
import Calendar from "./Calendar.jsx";
import Icon from "./Icon.jsx";

// Pantalla Calendario: el mes con los días que tienen comidas y, debajo, el resumen del
// día elegido; tocarlo abre el día.
export default function CalendarView({ today, settings, onOpenDay }) {
  const [selected, setSelected] = useState(today);
  const day = getDay(selected);
  const count = mealsOf(day).length;
  const t = dayTotals(day);

  return (
    <>
      <h2 className="screen-title">Calendario</h2>

      <div className="card">
        <Calendar
          today={today}
          selected={selected}
          markedDays={new Set(listDaysWithData())}
          onSelect={setSelected}
        />
      </div>

      <button className="card cal-day-peek" onClick={() => onOpenDay(selected)}>
        <span className="slot-info">
          <span className="label">{selected === today ? "Hoy" : formatLong(selected)}</span>
          <strong>
            {count === 0
              ? "Sin comidas"
              : `${round(t.proteina_g)} de ${settings.proteinGoal} g de proteína`}
          </strong>
          {count > 0 && (
            <small>
              {round(t.kcal).toLocaleString("es-ES")} kcal · {count} {count === 1 ? "comida" : "comidas"}
            </small>
          )}
        </span>
        <Icon name="next" className="chevron" />
      </button>
    </>
  );
}
