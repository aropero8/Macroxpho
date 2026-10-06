import { round, scaled, sumTotals } from "../lib/nutrition.js";

export default function Results({ dishes, confianza, notas, readOnly, onGramsChange, onRemove }) {
  const t = sumTotals(dishes);

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
                {!readOnly && (
                  <button className="icon" onClick={() => onRemove(i)} aria-label="Quitar plato">
                    ✕
                  </button>
                )}
              </div>
              <div className="dish-body">
                {readOnly ? (
                  <span className="grams">{round(d.gramos)} g</span>
                ) : (
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
                )}
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
      {!readOnly && (
        <p className="hint">Estimación aproximada. Ajusta los gramos si conoces la ración real.</p>
      )}
    </div>
  );
}
