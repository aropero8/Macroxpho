import { useCallback, useEffect, useRef, useState } from "react";
import { useBackLayer } from "../lib/backButton.js";

// Diálogo de confirmación propio (en vez de window.confirm, que en el WebView de
// Android se ve como una alerta del sistema). En el móvil aparece como hoja inferior,
// con los botones al alcance del pulgar.
function ConfirmDialog({ title, message, confirmLabel = "Aceptar", danger, onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  useBackLayer(onCancel); // Atrás de Android = Cancelar

  useEffect(() => {
    cancelRef.current?.focus(); // la opción segura, por defecto
    const onKey = (e) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={message ? "dialog-message" : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dialog-title">{title}</h2>
        {message && <p id="dialog-message">{message}</p>}
        <div className="row">
          <button ref={cancelRef} className="btn" onClick={onCancel}>
            Cancelar
          </button>
          <button className={`btn ${danger ? "danger solid" : "primary"}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * const [confirm, dialog] = useConfirm();
 * if (await confirm({ title, message, confirmLabel, danger })) { ... }
 * Hay que renderizar `dialog` en el componente.
 */
export function useConfirm() {
  const [request, setRequest] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        setRequest(options);
      }),
    []
  );

  const finish = useCallback((value) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setRequest(null);
  }, []);
  const onCancel = useCallback(() => finish(false), [finish]);
  const onConfirm = useCallback(() => finish(true), [finish]);

  const dialog = request && (
    <ConfirmDialog {...request} onConfirm={onConfirm} onCancel={onCancel} />
  );
  return [confirm, dialog];
}
