const round = (n) => Math.round(n || 0);

// Cada plato guarda los valores base de la estimación y los gramos actuales;
// al editar los gramos, los macros se reescalan proporcionalmente.
function scaled(d) {
  const f = d.gramosBase > 0 ? d.gramos / d.gramosBase : 1;
  return {
    kcal: d.kcal * f,
    proteina_g: d.proteina_g * f,
    carbohidratos_g: d.carbohidratos_g * f,
    grasas_g: d.grasas_g * f,
  };
}

export function totals(dishes) {
  return dishes.reduce(
    (acc, d) => {
      const s = scaled(d);
      acc.kcal += s.kcal;
      acc.proteina_g += s.proteina_g;
      acc.carbohidratos_g += s.carbohidratos_g;
      acc.grasas_g += s.grasas_g;
      return acc;
    },
    { kcal: 0, proteina_g: 0, carbohidratos_g: 0, grasas_g: 0 }
  );
}

export default function Results({ dishes, confianza, notas, onGramsChange, onRemove }) {
  const t = totals(dishes);

  return (
    <div className="card">
      <div className="total">
        <div className="kcal">
          {round(t.kcal)} <span>kcal</span>
        </div>
        <div className="macros">
          <div>
            <strong>{round(t.proteina_g)} g</strong>
            <span>Proteína</span>
          </div>
          <div>
            <strong>{round(t.carbohidratos_g)} g</strong>
            <span>Carbohidratos</span>
          </div>
          <div>
            <strong>{round(t.grasas_g)} g</strong>
            <span>Grasas</span>
          </div>
        </div>
        {confianza && <div className={`badge ${confianza}`}>Confianza {confianza}</div>}
      </div>

      <ul className="dishes">
        {dishes.map((d, i) => {
          const s = scaled(d);
          return (
            <li key={i}>
              <div className="dish-head">
                <strong>{d.nombre}</strong>
                <button className="icon" onClick={() => onRemove(i)} aria-label="Quitar plato">
                  ✕
                </button>
              </div>
              <div className="dish-body">
                <label className="grams">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={d.gramos}
                    onChange={(e) => onGramsChange(i, Number(e.target.value))}
                  />
                  <span>g</span>
                </label>
                <span className="dish-macros">
                  {round(s.kcal)} kcal · P {round(s.proteina_g)} · C {round(s.carbohidratos_g)} · G{" "}
                  {round(s.grasas_g)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {notas && <p className="notes">{notas}</p>}
      <p className="hint">Estimación aproximada. Ajusta los gramos si conoces la ración real.</p>
    </div>
  );
}
