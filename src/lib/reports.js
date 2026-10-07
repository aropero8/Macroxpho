// Cálculos de los informes semanal y mensual.
// Los días sin comidas NO cuentan como cero: no entran en medias ni en totales
// de días, y en los gráficos se dejan vacíos.
import { addDays, dateKey, monthStart, parseKey, weekStart } from "./date.js";
import { dayTotals, mealsOf, round } from "./nutrition.js";
import { getDay } from "./storage.js";

/** Primer día del periodo que contiene `today` ("week" empieza en lunes). */
export function currentPeriod(mode, today) {
  return mode === "week" ? weekStart(today) : monthStart(today);
}

export function shiftPeriod(mode, anchor, delta) {
  if (mode === "week") return addDays(anchor, 7 * delta);
  const d = parseKey(anchor);
  return dateKey(new Date(d.getFullYear(), d.getMonth() + delta, 1));
}

export function periodKeys(mode, anchor) {
  if (mode === "week") return Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
  const d = parseKey(anchor);
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Array.from({ length: n }, (_, i) =>
    dateKey(new Date(d.getFullYear(), d.getMonth(), i + 1))
  );
}

export function summarize(keys, today, proteinGoal) {
  const points = keys.map((key) => {
    const day = getDay(key);
    const hasData = mealsOf(day).length > 0;
    const t = hasData ? dayTotals(day) : null;
    return {
      key,
      future: key > today,
      hasData,
      kcal: t?.kcal ?? null,
      proteina_g: t?.proteina_g ?? null,
      // mismo redondeo que la barra de proteína del día
      goalReached: hasData && round(t.proteina_g) >= proteinGoal,
    };
  });

  const withData = points.filter((p) => p.hasData);
  const n = withData.length;
  const sum = (field) => withData.reduce((acc, p) => acc + p[field], 0);

  return {
    points,
    daysWithData: n,
    elapsedDays: points.filter((p) => !p.future).length,
    total: { kcal: sum("kcal"), proteina_g: sum("proteina_g") },
    avg: n ? { kcal: sum("kcal") / n, proteina_g: sum("proteina_g") / n } : null,
    goalDays: withData.filter((p) => p.goalReached).length,
  };
}
