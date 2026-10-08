// Vibración corta (@capacitor/haptics). En la app de Android usa el vibrador del sistema; en
// el navegador, navigator.vibrate si existe. Si no hay vibración disponible, no pasa nada.
import { Capacitor } from "@capacitor/core";
import { Haptics, NotificationType } from "@capacitor/haptics";

export function successHaptic() {
  // Chrome bloquea navigator.vibrate (y lo avisa en la consola) si aún no se ha tocado la página.
  if (!Capacitor.isNativePlatform() && !navigator.userActivation?.hasBeenActive) return;
  Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}
