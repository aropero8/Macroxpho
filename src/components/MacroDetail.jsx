import { EXTRAS, fmtGrams, macroSplit } from "../lib/nutrition.js";

const SPLIT = [
  { key: "proteina", label: "Proteína" },
  { key: "carbohidratos", label: "Carbohidratos" },
  { key: "grasas", label: "Grasas" },
];

/** De dónde salen las kcal: una barra con los tres macros y su porcentaje. */
export function MacroSplit({ totals }) {
  const pct = macroSplit(totals);
  if (!pct) return null;
  return (
    <div className="split">
      <div
        className="split-bar"
        role="img"
        aria-label={`Reparto de kcal: ${SPLIT.map((s) => `${s.label} ${pct[s.key]} %`).join(", ")}`}
      >
        {SPLIT.map((s) => pct[s.key] > 0 && <span key={s.key} className={s.key} style={{ flexGrow: pct[s.key] }} />)}
      </div>
      <ul className="split-legend" aria-hidden="true">
        {SPLIT.map((s) => (
          <li key={s.key} className={s.key}>
            {s.label} <strong className="num">{pct[s.key]} %</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Fibra, azúcares, grasas saturadas y sal: solo los que tengan dato. */
export function ExtraNutrients({ totals }) {
  const rows = EXTRAS.filter(({ key }) => totals[key] != null);
  if (rows.length === 0) return null;
  return (
    <dl className="extras">
      {rows.map(({ key, label }) => (
        <div key={key}>
          <dt>{label}</dt>
          <dd className="num">{fmtGrams(totals[key])} g</dd>
        </div>
      ))}
    </dl>
  );
}
