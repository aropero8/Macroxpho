import { formatLong, formatMonth, formatRange, parseKey } from "../lib/date.js";
import { round } from "../lib/nutrition.js";
import { currentPeriod, periodKeys, shiftPeriod, summarize } from "../lib/reports.js";
import BarChart from "./BarChart.jsx";

const fmt = (n) => round(n).toLocaleString("es-ES");

export default function Reports({ today, settings, mode, anchor, onChange, onOpenDay }) {
  const keys = periodKeys(mode, anchor);
  const s = summarize(keys, today, settings.proteinGoal);
  const isWeek = mode === "week";
  const canGoNext = shiftPeriod(mode, anchor, 1) <= today;
  const a = parseKey(anchor);
  const label = isWeek ? formatRange(keys[0], keys[6]) : formatMonth(a.getFullYear(), a.getMonth());
  const pastPoints = s.points.filter((p) => !p.future);

  return (
    <>
      <h2 className="screen-title">Informes</h2>

      <div className="segmented" role="group" aria-label="Periodo">
        {[
          ["week", "Semana"],
          ["month", "Mes"],
        ].map(([m, text]) => (
          <button
            key={m}
            aria-pressed={mode === m}
            onClick={() => onChange(m, currentPeriod(m, today))}
          >
            {text}
          </button>
        ))}
      </div>

      <div className="period-nav">
        <button
          className="icon"
          onClick={() => onChange(mode, shiftPeriod(mode, anchor, -1))}
          aria-label={isWeek ? "Semana anterior" : "Mes anterior"}
        >
          ‹
        </button>
        <strong aria-live="polite">{label}</strong>
        <button
          className="icon"
          onClick={() => onChange(mode, shiftPeriod(mode, anchor, 1))}
          disabled={!canGoNext}
          aria-label={isWeek ? "Semana siguiente" : "Mes siguiente"}
        >
          ›
        </button>
      </div>

      {s.daysWithData === 0 ? (
        <div className="card empty-state">
          <span aria-hidden="true">📭</span>
          <p>No hay comidas registradas {isWeek ? "esta semana" : "este mes"}.</p>
          <p className="hint">Cuando apuntes comidas, aquí verás tus medias y gráficos.</p>
        </div>
      ) : (
        <>
          <div className="stats">
            <div className="stat">
              <span className="stat-label">Kcal · media diaria</span>
              <strong>{fmt(s.avg.kcal)}</strong>
              <small>Total {fmt(s.total.kcal)} kcal</small>
            </div>
            <div className="stat">
              <span className="stat-label">Proteína · media diaria</span>
              <strong>{fmt(s.avg.proteina_g)} g</strong>
              <small>Total {fmt(s.total.proteina_g)} g</small>
            </div>
            <div className="stat">
              <span className="stat-label">Objetivo de proteína</span>
              <strong>
                {s.goalDays} de {s.daysWithData}
              </strong>
              <small>días con ≥ {settings.proteinGoal} g</small>
            </div>
            <div className="stat">
              <span className="stat-label">Días registrados</span>
              <strong>
                {s.daysWithData} de {s.elapsedDays}
              </strong>
              <small>Las medias solo cuentan estos días</small>
            </div>
          </div>

          <div className="card">
            <BarChart
              title="Kcal por día"
              points={s.points}
              field="kcal"
              unit="kcal"
              colorVar="--series-kcal"
              goal={settings.kcalGoal}
              onOpenDay={onOpenDay}
            />
          </div>

          <div className="card">
            <BarChart
              title="Proteína por día"
              points={s.points}
              field="proteina_g"
              unit="g"
              colorVar="--series-protein"
              goal={settings.proteinGoal}
              onOpenDay={onOpenDay}
            />
          </div>

          {/* La misma información sin gráfico (accesible y sin depender del color) */}
          <details className="card table-view">
            <summary>Ver tabla por día</summary>
            <table>
              <thead>
                <tr>
                  <th scope="col">Día</th>
                  <th scope="col">Kcal</th>
                  <th scope="col">Proteína</th>
                  <th scope="col">
                    <span className="sr-only">Objetivo de proteína</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pastPoints.map((p) => (
                  <tr key={p.key} className={p.hasData ? "" : "no-data"}>
                    <th scope="row">
                      <button className="link" onClick={() => onOpenDay(p.key)}>
                        {formatLong(p.key)}
                      </button>
                    </th>
                    {p.hasData ? (
                      <>
                        <td>{fmt(p.kcal)}</td>
                        <td>{fmt(p.proteina_g)} g</td>
                        <td>{p.goalReached ? "✓" : ""}</td>
                      </>
                    ) : (
                      <td colSpan={3}>Sin datos</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </>
  );
}
