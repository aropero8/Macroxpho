import { useState } from "react";
import { samplePlatos, sampleThumb } from "../lib/devSample.js";
import { MEAL_LABELS, newId, saveMeal } from "../lib/storage.js";
import { putThumb } from "../lib/thumbs.js";

// Fase 1: todavía sin analizador. En desarrollo permite guardar una comida de prueba.
export default function AddMeal({ date, tipo, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function addSample() {
    setBusy(true);
    setError("");
    try {
      const id = newId();
      let thumbId;
      try {
        if (await putThumb(id, await sampleThumb())) thumbId = id;
      } catch {
        // sin miniatura, no pasa nada
      }
      saveMeal(date, {
        id,
        tipo,
        platos: samplePlatos(),
        confianza: "media",
        notas: "Comida de prueba",
        thumbId,
      });
      onSaved();
    } catch {
      setError("No se pudo guardar la comida.");
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Añadir {MEAL_LABELS[tipo].toLowerCase()}</h2>
      <p className="hint">El analizador de fotos se conectará aquí en la fase 2.</p>
      {import.meta.env.DEV && (
        <button className="btn full" disabled={busy} onClick={addSample}>
          🧪 Añadir comida de prueba
        </button>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
