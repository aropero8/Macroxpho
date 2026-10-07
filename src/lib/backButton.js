// Botón Atrás de Android (solo en la app nativa; en el navegador no hace nada).
//
// Las capas abiertas (menú lateral, diálogos) se apilan: Atrás cierra la de arriba.
// Si no hay ninguna, se llama al manejador de la pantalla (volver atrás, o salir desde Hoy).
import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

const layers = [];

// Guarda siempre la última versión del callback sin volver a registrar nada.
function useLatest(fn) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  return ref;
}

/** Mientras el componente esté montado, Atrás llama a `onBack` (p. ej. cerrar el menú). */
export function useBackLayer(onBack) {
  const latest = useLatest(onBack);
  useEffect(() => {
    const layer = () => latest.current();
    layers.push(layer);
    return () => {
      const i = layers.indexOf(layer);
      if (i !== -1) layers.splice(i, 1);
    };
  }, [latest]);
}

/** Manejador base: se usa cuando no hay ninguna capa abierta. */
export function useBackButton(onBack) {
  const latest = useLatest(onBack);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = App.addListener("backButton", () => {
      const top = layers[layers.length - 1];
      if (top) top();
      else latest.current();
    });
    return () => {
      handle.then((h) => h.remove());
    };
  }, [latest]);
}

export const exitApp = () => App.exitApp();
