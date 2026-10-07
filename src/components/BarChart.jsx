import { useLayoutEffect, useRef, useState } from "react";
import { formatLong, parseKey } from "../lib/date.js";
import { round } from "../lib/nutrition.js";

// Gráfico de barras en SVG hecho a mano: una serie, un eje Y, una barra por día.
// Los días sin datos se dejan vacíos (no se dibujan como cero) y los futuros no
// son interactivos. Tocar o pasar el ratón por un día muestra su valor.
const M = { top: 8, right: 8, bottom: 34, left: 40 };
const PLOT_H = 140;
const WEEKDAY = ["D", "L", "M", "X", "J", "V", "S"];

const fmt = (n) => round(n).toLocaleString("es-ES");

// Paso "redondo" (1, 2, 2.5, 5 × 10^n) para las marcas del eje Y.
function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

// Barra con la punta redondeada (4px) y la base recta.
function barPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

// Ancho del contenedor: se mide al montar (antes de pintar) y luego en cada cambio de tamaño.
function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(Math.floor(el.clientWidth));
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

export default function BarChart({ title, points, field, unit, colorVar, goal, onOpenDay }) {
  const ref = useRef(null);
  const width = useWidth(ref);
  const [active, setActive] = useState(null);

  const values = points.filter((p) => p.hasData).map((p) => p[field]);
  const maxVal = Math.max(goal || 0, ...values, 1);
  const step = niceStep(maxVal / 4);
  const yMax = Math.ceil((maxVal * 1.05) / step) * step; // un poco de aire sobre la barra más alta
  const ticks = [];
  for (let v = 0; v <= yMax + step / 1000; v += step) ticks.push(v);

  const plotW = Math.max(0, width - M.left - M.right);
  const band = plotW / points.length;
  const barW = Math.max(2, Math.min(24, band - 2)); // ≤24px y 2px de aire entre barras
  const y = (v) => M.top + PLOT_H - (v / yMax) * PLOT_H;
  const height = M.top + PLOT_H + M.bottom;
  const isWeek = points.length <= 7;

  const hover = (e, i) => e.pointerType === "mouse" && setActive(i);
  const activePoint = active !== null ? points[active] : null;
  const tipX = active !== null ? Math.min(Math.max(M.left + band * (active + 0.5), 80), width - 80) : 0;

  return (
    <div className="chart">
      <div className="chart-head">
        <h3>{title}</h3>
        {goal ? (
          <span className="chart-key">
            <svg width="18" height="8" aria-hidden="true">
              <line x1="0" y1="4" x2="18" y2="4" className="goal-line" />
            </svg>
            Objetivo {fmt(goal)} {unit}
          </span>
        ) : null}
      </div>

      <div
        className="chart-body"
        ref={ref}
        onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
      >
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={title}>
            {ticks.map((t) => (
              <g key={t}>
                <line className="grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
                <text className="tick" x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end">
                  {fmt(t)}
                </text>
              </g>
            ))}

            {points.map((p, i) => {
              const cx = M.left + band * (i + 0.5);
              const d = parseKey(p.key);
              const showLabel = isWeek || d.getDate() === 1 || d.getDate() % 5 === 0;
              const v = p[field];
              return (
                <g key={p.key}>
                  {p.hasData && v > 0 && (
                    <path
                      className={`bar${active === i ? " active" : ""}`}
                      style={{ fill: `var(${colorVar})` }}
                      d={barPath(cx - barW / 2, y(v), barW, y(0) - y(v))}
                    />
                  )}
                  {showLabel && (
                    <text
                      className={`tick${p.hasData ? "" : " faint"}`}
                      x={cx}
                      y={M.top + PLOT_H + 14}
                      textAnchor="middle"
                    >
                      {isWeek && <tspan>{WEEKDAY[d.getDay()]}</tspan>}
                      <tspan x={cx} dy={isWeek ? "1.2em" : 0}>
                        {d.getDate()}
                      </tspan>
                    </text>
                  )}
                  {!p.future && (
                    <rect
                      className="hit"
                      x={M.left + band * i}
                      y={M.top}
                      width={band}
                      height={PLOT_H}
                      tabIndex={0}
                      role="button"
                      aria-label={`${formatLong(p.key)}: ${p.hasData ? `${fmt(v)} ${unit}` : "sin datos"}`}
                      onPointerEnter={(e) => hover(e, i)}
                      onClick={() => setActive(active === i ? null : i)}
                      onFocus={() => setActive(i)}
                      onKeyDown={(e) => e.key === "Enter" && onOpenDay(p.key)}
                    />
                  )}
                </g>
              );
            })}

            <line className="axis" x1={M.left} x2={width - M.right} y1={y(0)} y2={y(0)} />

            {goal ? (
              <line className="goal-line" x1={M.left} x2={width - M.right} y1={y(goal)} y2={y(goal)} />
            ) : null}
          </svg>
        )}

        {activePoint && (
          <div className="chart-tip" style={{ left: tipX }}>
            <strong>{activePoint.hasData ? `${fmt(activePoint[field])} ${unit}` : "Sin datos"}</strong>
            <span>{formatLong(activePoint.key)}</span>
            <button className="link" onClick={() => onOpenDay(activePoint.key)}>
              Abrir día ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
