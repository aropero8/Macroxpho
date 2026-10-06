import { useState } from "react";

export default function Settings({ apiKey, model, defaultModel, onSave, onClose }) {
  const [key, setKey] = useState(apiKey);
  const [mdl, setMdl] = useState(model);

  return (
    <div className="card">
      <h2>Ajustes</h2>

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
        <span>Modelo</span>
        <input
          type="text"
          value={mdl}
          onChange={(e) => setMdl(e.target.value)}
          placeholder={defaultModel}
          autoCapitalize="off"
        />
        <small>Usa un modelo Flash / Flash-Lite para la capa gratuita.</small>
      </label>

      <div className="row">
        <button className="btn ghost" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="btn primary"
          onClick={() => onSave(key.trim(), mdl.trim() || defaultModel)}
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
