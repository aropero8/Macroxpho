export const round = (n) => Math.round(n || 0);

// Nutrientes adicionales. Son opcionales: las comidas guardadas antes de añadirlos (y
// los platos apuntados a mano sin ellos) no los tienen. Un nutriente que no tiene ningún
// plato no aparece en los totales, para no confundir "sin dato" con 0.
export const EXTRAS = [
  { key: "fibra_g", label: "Fibra" },
  { key: "azucares_g", label: "Azúcares" },
  { key: "grasas_sat_g", label: "Grasas saturadas" },
  { key: "sal_g", label: "Sal" },
];

/** Gramos con un decimal si son pocos (la sal, la fibra de una pieza de fruta…). */
export const fmtGrams = (n) =>
  n < 10 ? (Math.round(n * 10) / 10).toLocaleString("es-ES") : String(round(n));

const ZERO = () => ({ kcal: 0, proteina_g: 0, carbohidratos_g: 0, grasas_g: 0 });

function addInto(acc, t) {
  acc.kcal += t.kcal || 0;
  acc.proteina_g += t.proteina_g || 0;
  acc.carbohidratos_g += t.carbohidratos_g || 0;
  acc.grasas_g += t.grasas_g || 0;
  for (const { key } of EXTRAS) if (t[key] != null) acc[key] = (acc[key] || 0) + t[key];
  return acc;
}

// Cada plato guarda los valores base de la estimación y los gramos actuales;
// al editar los gramos, los macros se reescalan proporcionalmente.
export function scaled(d) {
  const f = d.gramosBase > 0 ? d.gramos / d.gramosBase : 1;
  const out = {
    kcal: d.kcal * f,
    proteina_g: d.proteina_g * f,
    carbohidratos_g: d.carbohidratos_g * f,
    grasas_g: d.grasas_g * f,
  };
  for (const { key } of EXTRAS) if (d[key] != null) out[key] = d[key] * f;
  return out;
}

export function sumTotals(platos) {
  return platos.reduce((acc, d) => addInto(acc, scaled(d)), ZERO());
}

/**
 * Reparto de las kcal entre proteína, carbohidratos y grasas (4, 4 y 9 kcal por gramo),
 * en porcentajes enteros que suman 100. Null si no hay macros.
 */
export function macroSplit(t) {
  const parts = [4 * (t.proteina_g || 0), 4 * (t.carbohidratos_g || 0), 9 * (t.grasas_g || 0)];
  const total = parts[0] + parts[1] + parts[2];
  if (!(total > 0)) return null;
  const pct = parts.map((v) => Math.round((v / total) * 100));
  // El redondeo puede dejar 99 o 101: la diferencia va a la parte más grande.
  pct[pct.indexOf(Math.max(...pct))] += 100 - (pct[0] + pct[1] + pct[2]);
  return { proteina: pct[0], carbohidratos: pct[1], grasas: pct[2] };
}

export const mealsOf = (day) =>
  [day.desayuno, day.comida, day.cena, ...day.snacks].filter(Boolean);

export function dayTotals(day) {
  return mealsOf(day).reduce((acc, m) => addInto(acc, m.totales), ZERO());
}

export const mealName = (meal) => meal.platos.map((p) => p.nombre).join(", ");
