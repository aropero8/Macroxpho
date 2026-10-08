import { round, scaled, sumTotals } from "../lib/nutrition.js";
import Icon from "./Icon.jsx";

export default function Results({ dishes, confianza, notas, readOnly, onGramsChange, onRemove }) {
  const t = sumTotals(dishes);

  return (
    <div className="card">
      <div className="total">
        <div className="kcal num">
          {round(t.kcal).toLocaleString("es-ES")}
          <small>kcal</small>
        </div>
        <div className="macros">
          {[
            ["Proteína", t.proteina_g],
            ["Carbohidratos", t.carbohidratos_g],
            ["Grasas", t.grasas_g],
          ].map(([label, value]) => (
            <div key={label}>
              <strong className="num">
                {round(value)}
                <small>g</small>
              </strong>
              <span className="label">{label}</span>
            </div>
          ))}
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
                    <Icon name="close" />
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
