import { round } from "../lib/nutrition.js";

// La barra empieza llena con el objetivo y se va vaciando según lo consumido.
export default function ProteinBar({ consumed, goal }) {
  const left = goal - round(consumed);
  const pct = goal > 0 ? Math.max(0, Math.min(1, left / goal)) * 100 : 0;
  const over = left < 0;

  return (
    <div className="protein">
      <div
        className="protein-track"
        role="progressbar"
        aria-label="Proteína que queda"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.max(0, left)}
      >
        <div className="protein-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className={over ? "protein-text over" : "protein-text"}>
        {over ? `+${-left} g sobre el objetivo` : `Quedan ${left} g de ${goal} g`}
      </p>
    </div>
  );
}
