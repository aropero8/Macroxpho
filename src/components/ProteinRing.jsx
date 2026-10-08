import { useCallback, useEffect, useRef, useState } from "react";
import { successHaptic } from "../lib/haptics.js";
import { round } from "../lib/nutrition.js";
import { markGoalCelebrated, wasGoalCelebrated } from "../lib/storage.js";

// Anillo de proteína que se LLENA según lo consumido.
//   · neutro al principio, acento a partir del 60 % y color de logro al llegar al objetivo
//   · el número y el arco se animan desde el último valor mostrado ese día
//   · la primera vez que se alcanza el objetivo cada día: pequeña celebración y vibración
// Con animate = false (días pasados) se pinta directamente el estado final.
// Todo son <span> para poder ir dentro de un botón (la tarjeta de hoy en Inicio).

const SIZES = {
  lg: { box: 216, stroke: 14 },
  sm: { box: 96, stroke: 9 },
};
const NEAR = 0.6;
const DELAY = 180; // deja terminar la transición de entrada de la pantalla
const DURATION = 800;
const BURST_MS = 1400;

// Último valor pintado por día, para animar solo lo que ha cambiado desde la última vez.
const lastShown = new Map();

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const easeOut = (k) => 1 - (1 - k) ** 3;

// Anima el valor desde `initial` hasta `target` y avisa con onSettled al terminar
// (o enseguida si no hay nada que animar). requestAnimationFrame se detiene con la app en
// segundo plano, así que el aviso llega cuando el anillo se ha visto llenarse de verdad.
function useTween(initial, target, enabled, onSettled) {
  const [value, setValue] = useState(initial);
  const current = useRef(initial);
  const settled = useRef(onSettled);
  useEffect(() => {
    settled.current = onSettled;
  });

  useEffect(() => {
    const from = current.current;
    if (!enabled || from === target || reducedMotion()) {
      current.current = target;
      setValue(target);
      const id = setTimeout(() => settled.current?.(), DELAY);
      return () => clearTimeout(id);
    }
    const t0 = performance.now() + DELAY;
    let raf;
    const step = (now) => {
      const k = Math.min(1, Math.max(0, (now - t0) / DURATION));
      current.current = from + (target - from) * easeOut(k);
      setValue(current.current);
      if (k < 1) raf = requestAnimationFrame(step);
      else settled.current?.();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled]);

  return value;
}

/**
 * Celebración del objetivo, la primera vez que se alcanza cada día (solo con enabled, es
 * decir, hoy). La lanza el anillo al terminar de llenarse (start → onSettled); la marca del
 * día se guarda en ese momento, así que no se repite aunque se vuelva a abrir la pantalla.
 *   pending: toca celebrar pero el anillo aún se está llenando (el mensaje espera)
 *   active:  dura la animación
 */
export function useGoalCelebration(date, reached, enabled) {
  const [fired, setFired] = useState(false);
  const [active, setActive] = useState(false);
  const firing = useRef(false); // evita lanzarla dos veces antes de que se actualice el estado
  const pending = enabled && reached && !fired && !wasGoalCelebrated(date);

  const start = useCallback(() => {
    if (!pending || firing.current) return;
    firing.current = true;
    markGoalCelebrated(date);
    setFired(true);
    setActive(true);
    successHaptic();
  }, [pending, date]);

  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setActive(false), BURST_MS);
    return () => clearTimeout(id);
  }, [active]);

  return { pending, active, start };
}

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  angle: (360 / 14) * i + (i % 2 ? 8 : -6),
  dist: 26 + ((i * 7) % 4) * 8,
  color: ["var(--achieve)", "var(--accent-bright)", "#fff", "var(--series-kcal)"][i % 4],
}));

export default function ProteinRing({
  date,
  consumed,
  goal,
  size = "lg",
  animate = true,
  celebrating,
  onSettled,
}) {
  const target = round(consumed);
  const [initial] = useState(() => (animate ? (lastShown.get(date) ?? 0) : target));
  const value = useTween(initial, target, animate, onSettled);
  const reached = goal > 0 && target >= goal;

  useEffect(() => {
    lastShown.set(date, target);
  }, [date, target]);

  const { box, stroke } = SIZES[size];
  const r = (box - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const stage = pct >= 1 ? "done" : pct >= NEAR ? "near" : "start";
  const shown = Math.round(value);
  const left = goal - target;

  let sub;
  if (size === "sm" || reached) sub = `de ${goal} g`;
  else sub = `Quedan ${left} g de ${goal} g`;

  return (
    <span
      className={`ring ${size} ${stage}${celebrating ? " celebrate" : ""}`}
      style={{ width: box, height: box }}
      role="progressbar"
      aria-label="Proteína"
      aria-valuemin={0}
      aria-valuemax={goal}
      aria-valuenow={Math.min(target, goal)}
      aria-valuetext={`${target} g de ${goal} g`}
    >
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} aria-hidden="true">
        <circle className="ring-track" cx={box / 2} cy={box / 2} r={r} strokeWidth={stroke} />
        {pct > 0 && (
          <circle
            className="ring-progress"
            cx={box / 2}
            cy={box / 2}
            r={r}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            transform={`rotate(-90 ${box / 2} ${box / 2})`}
          />
        )}
      </svg>

      <span className="ring-center" aria-hidden="true">
        <strong className="num">
          {shown}
          <small>g</small>
        </strong>
        <span className="ring-sub">{sub}</span>
      </span>

      {celebrating && (
        <span className="burst" aria-hidden="true">
          {PARTICLES.map((p, i) => (
            <i
              key={i}
              style={{
                "--a": `${p.angle}deg`,
                "--r": `${r}px`,
                "--d": `${size === "sm" ? p.dist * 0.6 : p.dist}px`,
                "--c": p.color,
              }}
            />
          ))}
        </span>
      )}
    </span>
  );
}

/** Mensaje de objetivo conseguido (con "+X g" si se ha pasado). */
export function GoalMessage({ consumed, goal, celebrating }) {
  const over = round(consumed) - goal;
  return (
    <p className={celebrating ? "goal-msg celebrate" : "goal-msg"} role="status">
      <strong>¡Objetivo de proteína conseguido!{"\u00a0"}💪</strong>
      {over > 0 && <span>+{over} g sobre el objetivo</span>}
    </p>
  );
}
