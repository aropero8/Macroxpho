import { useState } from "react";
import { EXTRAS, fmtGrams, round, scaled, sumTotals } from "../lib/nutrition.js";
import Icon from "./Icon.jsx";
import { ExtraNutrients, MacroSplit } from "./MacroDetail.jsx";

const STEP = 10; // gramos por toque de − / +

export default function Results({ dishes, confianza, notas, readOnly, onGramsChange, onRemove }) {
  const t = sumTotals(dishes);
  const [open, setOpen] = useState(null); // plato desplegado
  // Un nutriente que solo tienen algunos platos (los apuntados a mano no suelen llevarlo)
  // se suma igual, pero se avisa de que falta el de los demás.
  const partial = EXTRAS.some(({ key }) => t[key] != null && dishes.some((d) => d[key] == null));

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
        <MacroSplit totals={t} />
        <ExtraNutrients totals={t} />
        {partial && <p className="hint">Fibra, azúcares, grasas saturadas y sal: solo de los platos que los tienen.</p>}
        {confianza && <div className={`badge ${confianza}`}>Confianza {confianza}</div>}
      </div>

      <ul className="dishes">
        {dishes.map((d, i) => {
          const s = scaled(d);
          const expanded = open === i;
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
                {/* Un plato apuntado a mano sin ración no tiene gramos que ajustar */}
                {!(d.gramosBase > 0) ? null : readOnly ? (
                  <span className="grams">{round(d.gramos)} g</span>
                ) : (
                  <span className="grams stepper">
                    <button
                      className="step"
                      onClick={() => onGramsChange(i, Math.max(0, round(d.gramos) - STEP))}
                      disabled={d.gramos <= 0}
                      aria-label={`Quitar ${STEP} g de ${d.nombre}`}
                    >
                      <Icon name="minus" />
                    </button>
                    <label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={d.gramos}
                        onChange={(e) => onGramsChange(i, Number(e.target.value))}
                        aria-label={`Gramos de ${d.nombre}`}
                      />
                      <span aria-hidden="true">g</span>
                    </label>
                    <button
                      className="step"
                      onClick={() => onGramsChange(i, round(d.gramos) + STEP)}
                      aria-label={`Añadir ${STEP} g de ${d.nombre}`}
                    >
                      <Icon name="plus" />
                    </button>
                  </span>
                )}
                <button
                  className="dish-macros"
                  onClick={() => setOpen(expanded ? null : i)}
                  aria-expanded={expanded}
                  aria-label={`${expanded ? "Ocultar" : "Ver"} el detalle de ${d.nombre}`}
                >
                  {round(s.kcal)} kcal · P {round(s.proteina_g)} · C {round(s.carbohidratos_g)} · G{" "}
                  {round(s.grasas_g)}
                  <Icon name="next" className="chevron" />
                </button>
              </div>
              {expanded && <DishDetail totals={s} />}
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

/** Detalle de un plato: sus macros completos, los nutrientes que tenga y el reparto de kcal. */
function DishDetail({ totals }) {
  const rows = [
    { key: "proteina_g", label: "Proteína" },
    { key: "carbohidratos_g", label: "Carbohidratos" },
    { key: "grasas_g", label: "Grasas" },
    ...EXTRAS,
  ].filter(({ key }) => totals[key] != null);
  return (
    <div className="dish-detail">
      <dl className="extras">
        {rows.map(({ key, label }) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd className="num">{fmtGrams(totals[key])} g</dd>
          </div>
        ))}
      </dl>
      <MacroSplit totals={totals} />
    </div>
  );
}
