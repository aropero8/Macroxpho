import { useCallback, useEffect, useRef, useState } from "react";

const DURATION = 4000;
const DURATION_WITH_ACTION = 6000; // más tiempo si se puede deshacer

function Toast({ toast, onDismiss, onAction }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, toast.action ? DURATION_WITH_ACTION : DURATION);
    return () => clearTimeout(id);
  }, [toast, onDismiss]);

  return (
    <div className="toast">
      <span>{toast.message}</span>
      {toast.action && (
        <button className="toast-action" onClick={onAction}>
          {toast.action.label}
        </button>
      )}
    </div>
  );
}

/**
 * Aviso breve abajo, por encima de todo.
 *   const [showToast, toastView] = useToast();
 *   showToast({ message, action: { label, run }, onExpire });
 * onExpire se llama si el aviso se cierra sin usar la acción, también cuando lo sustituye
 * otro (por ejemplo, para borrar de verdad la foto de una comida que ya no se puede recuperar).
 */
export function useToast() {
  const [toast, setToast] = useState(null);
  const current = useRef(null);

  const finish = useCallback((usedAction) => {
    const t = current.current;
    current.current = null;
    setToast(null);
    if (!t) return;
    if (usedAction) t.action.run();
    else t.onExpire?.();
  }, []);

  const showToast = useCallback(
    (next) => {
      finish(false);
      const t = { ...next, id: Date.now() };
      current.current = t;
      setToast(t);
    },
    [finish]
  );

  const onDismiss = useCallback(() => finish(false), [finish]);
  const onAction = useCallback(() => finish(true), [finish]);

  const view = (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && <Toast key={toast.id} toast={toast} onDismiss={onDismiss} onAction={onAction} />}
    </div>
  );
  return [showToast, view];
}
