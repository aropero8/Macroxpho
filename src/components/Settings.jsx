import { useRef, useState } from "react";
import { saveTextFile } from "../lib/backupFile.js";
import { dateKey } from "../lib/date.js";
import { FREE_MODELS, isFreeModel } from "../lib/models.js";
import {
  exportBackup,
  getApiConfig,
  getSettings,
  importBackup,
  inspectBackup,
} from "../lib/storage.js";
import { useConfirm } from "./ConfirmDialog.jsx";

export default function Settings({ apiKey, model, defaultModel, settings, onSave, onClose, onImported }) {
  const [key, setKey] = useState(apiKey);
  const [mdl, setMdl] = useState(model);
  const [protein, setProtein] = useState(String(settings.proteinGoal));
  const [kcal, setKcal] = useState(settings.kcalGoal ? String(settings.kcalGoal) : "");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const importRef = useRef(null);
  const [confirm, dialog] = useConfirm();
  // Modelo guardado antes de existir el desplegable que no es gratuito (se avisa y se sustituye).
  const [replacedModel] = useState(() => {
    const stored = getApiConfig().model;
    return stored && !isFreeModel(stored) ? stored : null;
  });

  function save() {
    const proteinGoal = Math.round(Number(protein));
    const kcalGoal = kcal.trim() ? Math.round(Number(kcal)) : null;
    if (!(proteinGoal > 0)) return setError("El objetivo de proteína debe ser un número mayor que 0.");
    if (kcalGoal !== null && !(kcalGoal > 0))
      return setError("El objetivo de kcal debe ser un número mayor que 0, o dejarlo vacío.");
    try {
      onSave({ apiKey: key.trim(), model: mdl, proteinGoal, kcalGoal });
    } catch {
      setError("No se pudieron guardar los ajustes.");
    }
  }

  async function exportFile() {
    setError("");
    setMessage("");
    try {
      const done = await saveTextFile(`macrosnap-copia-${dateKey()}.json`, exportBackup());
      if (done) setMessage("Copia exportada.");
    } catch {
      setError("No se pudo exportar la copia.");
    }
  }

  async function importFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setMessage("");
    try {
      const text = await file.text();
      const info = inspectBackup(text);
      const when = info.exportedAt
        ? ` del ${new Date(info.exportedAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}`
        : "";
      const ok = await confirm({
        title: "¿Importar la copia?",
        message: `La copia${when} tiene ${info.days} ${info.days === 1 ? "día" : "días"}. Sustituirá todos los días y objetivos guardados en este dispositivo. Si tienes dudas, exporta antes una copia de lo actual.`,
        confirmLabel: "Importar",
        danger: true,
      });
      if (!ok) return;
      const n = importBackup(text);
      const s = getSettings();
      setProtein(String(s.proteinGoal));
      setKcal(s.kcalGoal ? String(s.kcalGoal) : "");
      onImported();
      setMessage(`Copia importada: ${n} ${n === 1 ? "día" : "días"}.`);
    } catch (err) {
      setError(err.message || "No se pudo importar la copia.");
    }
  }

  return (
    <>
      <div className="card">
        <h2>Ajustes</h2>

        <label className="field">
          <span>Objetivo diario de proteína (g)</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Objetivo diario de kcal (opcional)</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
            placeholder="Sin objetivo"
          />
        </label>

        <label className="field">
          <span>API key de Gemini</span>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="AIza..."
            autoComplete="off"
          />
          <small>
            Gratis en{" "}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
              Google AI Studio
            </a>
            . Se guarda solo en este dispositivo.
          </small>
        </label>

        <label className="field">
          <span>Modelo (solo gratuitos)</span>
          <select value={mdl} onChange={(e) => setMdl(e.target.value)}>
            {FREE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
                {m.id === defaultModel ? " · por defecto" : ""}
              </option>
            ))}
          </select>
          <small>
            {FREE_MODELS.find((m) => m.id === mdl)?.note} Todos tienen capa gratuita y aceptan
            fotos.{" "}
            <a href="https://aistudio.google.com/rate-limit" target="_blank" rel="noreferrer">
              Ver tus límites
            </a>
            .
          </small>
          {replacedModel && (
            <small className="warn">
              Tenías guardado «{replacedModel}», que no está en la lista de gratuitos. Al guardar
              se cambiará por el elegido aquí.
            </small>
          )}
        </label>

        <div className="row">
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" onClick={save}>
            Guardar
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Copia de seguridad</h2>
        <p className="hint">
          Incluye tus días y objetivos. No incluye la API key ni las fotos en miniatura.
        </p>
        <div className="row">
          <button className="btn" onClick={exportFile}>
            Exportar copia (JSON)
          </button>
          <button className="btn" onClick={() => importRef.current?.click()}>
            Importar copia
          </button>
        </div>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={importFile}
        />
      </div>

      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}
      {dialog}
    </>
  );
}
