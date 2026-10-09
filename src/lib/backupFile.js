// Sacar la copia de seguridad del dispositivo.
//
// En el navegador basta con un enlace de descarga. En la app de Android no: el WebView de
// Capacitor ignora <a download>, así que el archivo se escribe en la caché de la app
// (@capacitor/filesystem) y se abre el menú de compartir del sistema (@capacitor/share), desde
// donde se puede guardar en Drive o en Archivos, o mandarlo por correo.
import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Guarda o comparte `text` como `name`. Devuelve false si la persona cierra el menú de
 * compartir sin elegir nada; lanza un error si no se pudo preparar el archivo.
 */
export async function saveTextFile(name, text) {
  if (!Capacitor.isNativePlatform()) {
    download(name, text);
    return true;
  }
  const { uri } = await Filesystem.writeFile({
    path: name,
    data: text,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  try {
    await Share.share({ title: "Copia de MacroSnap", files: [uri], dialogTitle: "Guardar copia" });
    return true;
  } catch (err) {
    // Cerrar el menú sin elegir destino no es un error.
    if (/cancel/i.test(err?.message ?? "")) return false;
    throw err;
  }
}
