export const round = (n) => Math.round(n || 0);

const ZERO = () => ({ kcal: 0, proteina_g: 0, carbohidratos_g: 0, grasas_g: 0 });

function addInto(acc, t) {
  acc.kcal += t.kcal || 0;
  acc.proteina_g += t.proteina_g || 0;
  acc.carbohidratos_g += t.carbohidratos_g || 0;
  acc.grasas_g += t.grasas_g || 0;
  return acc;
}

// Cada plato guarda los valores base de la estimación y los gramos actuales;
// al editar los gramos, los macros se reescalan proporcionalmente.
export function scaled(d) {
  const f = d.gramosBase > 0 ? d.gramos / d.gramosBase : 1;
  return {
    kcal: d.kcal * f,
    proteina_g: d.proteina_g * f,
    carbohidratos_g: d.carbohidratos_g * f,
    grasas_g: d.grasas_g * f,
  };
}

export function sumTotals(platos) {
  return platos.reduce((acc, d) => addInto(acc, scaled(d)), ZERO());
}

export const mealsOf = (day) =>
  [day.desayuno, day.comida, day.cena, ...day.snacks].filter(Boolean);

export function dayTotals(day) {
  return mealsOf(day).reduce((acc, m) => addInto(acc, m.totales), ZERO());
}

export const mealName = (meal) => meal.platos.map((p) => p.nombre).join(", ");
