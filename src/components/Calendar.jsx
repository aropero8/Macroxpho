import { useState } from "react";
import { dateKey, formatLong, formatMonth, parseKey } from "../lib/date.js";
import Icon from "./Icon.jsx";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

// Calendario mensual con la semana empezando en lunes. Todo con fechas locales:
// las claves "YYYY-MM-DD" se comparan como texto (el orden coincide con el de las fechas).
export default function Calendar({ today, selected, markedDays, onSelect }) {
  const start = parseKey(selected || today);
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() });

  const t = parseKey(today);
  const canGoNext =
    view.y < t.getFullYear() || (view.y === t.getFullYear() && view.m < t.getMonth());

  const offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => dateKey(new Date(view.y, view.m, i + 1))),
  ];

  const shift = (delta) =>
    setView(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  return (
    <div className="calendar">
      <div className="cal-head">
        <button className="icon" onClick={() => shift(-1)} aria-label="Mes anterior">
          <Icon name="back" />
        </button>
        <strong aria-live="polite">{formatMonth(view.y, view.m)}</strong>
        <button
          className="icon"
          onClick={() => shift(1)}
          disabled={!canGoNext}
          aria-label="Mes siguiente"
        >
          <Icon name="next" />
        </button>
      </div>

      <div className="cal-grid">
        {WEEKDAYS.map((w) => (
          <span key={w} className="cal-weekday" aria-hidden="true">
            {w}
          </span>
        ))}
        {cells.map((key, i) => {
          if (!key) return <span key={`blank-${i}`} />;
          const future = key > today;
          const hasData = markedDays.has(key);
          const cls = [
            "cal-day",
            hasData && "has-data",
            key === today && "today",
            key === selected && "selected",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={key}
              className={cls}
              disabled={future}
              onClick={() => onSelect(key)}
              aria-current={key === today ? "date" : undefined}
              aria-label={`${formatLong(key)}${hasData ? ", con comidas" : ""}`}
            >
              {Number(key.slice(8))}
            </button>
          );
        })}
      </div>

      <p className="cal-legend">
        <span className="dot" /> Con comidas
        <span className="ring" /> Hoy
      </p>
    </div>
  );
}
