# MacroSnap

App en React (Vite) que estima las macros de una comida a partir de una foto usando la API de Gemini (modelo Flash, capa gratuita). Pensada para empaquetarse después con Capacitor como app de Android.

## Cómo funciona

Foto (cámara o galería) → se reduce a 1024 px → se envía a Gemini con un esquema JSON fijo → se muestran platos, gramos, kcal, proteína, carbohidratos y grasas. Puedes corregir los gramos de cada plato y los macros se recalculan.

## Puesta en marcha

La primera vez, instala las dependencias (esto también las deja registradas en `package.json` con las versiones actuales):

```bash
npm install react react-dom @capacitor/core
npm install -D vite @vitejs/plugin-react @capacitor/cli @capacitor/android
npm run dev
```

Después de eso, en cualquier otro equipo basta con `npm install`.

Abre la URL que muestra Vite, pulsa ⚙️ y pega tu API key (gratis en https://aistudio.google.com/apikey). La key se guarda solo en el `localStorage` del dispositivo, no en el repositorio ni en el bundle.

Opcional: copia `.env.example` a `.env` para fijar una key y un modelo por defecto en desarrollo. Cualquier variable `VITE_*` acaba incrustada en el JS final, así que no la uses en builds que repartas.

## Modelo y capa gratuita

- El modelo por defecto es `gemini-3.5-flash` y se puede cambiar desde Ajustes o con `VITE_GEMINI_MODEL`. Los nombres cambian con frecuencia: si ves "No se encuentra el modelo", mira la lista actual en https://ai.google.dev/gemini-api/docs/models.
- La familia 2.5 tenía anunciada su retirada para el 16 de octubre de 2026, por eso no es el valor por defecto.
- Los límites exactos de tu cuenta están en https://aistudio.google.com/rate-limit. En la capa gratuita, Google puede usar los datos enviados para mejorar sus modelos y no está pensada para uso comercial. Para probar con fotos de comida es suficiente.

## Empaquetar como app Android (Capacitor)

Ya está incluida la configuración (`capacitor.config.json`) y las dependencias de Capacitor.

```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android   # abre Android Studio
```

Cada vez que cambies el código: `npm run build && npx cap sync android`.

Notas:
- El botón "Cámara" usa `<input type="file" capture>`. Funciona en el WebView, pero si quieres una experiencia más nativa puedes migrar a `@capacitor/camera`.
- Cambia `appId` en `capacitor.config.json` por el tuyo (por ejemplo `com.tuusuario.macrosnap`) antes de generar el proyecto Android.

## Seguridad de la API key

Llamar a Gemini desde la propia app significa que la key vive en el dispositivo y puede extraerse. Es aceptable para tus pruebas personales. Si vas a publicar la app, mueve la llamada a un backend propio (Cloud Functions, Cloudflare Workers, un servidor Node…) que guarde la key y haga de intermediario; solo habría que cambiar `src/lib/gemini.js`.

## Estructura

```
src/
  App.jsx                 pantalla principal y estado
  components/Settings.jsx ajustes (API key y modelo)
  components/Results.jsx  resultados, totales y edición de gramos
  lib/gemini.js           cliente REST de Gemini + esquema JSON
  lib/image.js            redimensionado de la foto
```
