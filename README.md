# MacroSnap

Diario de comidas que estima las macros a partir de una foto usando la API de Gemini (modelo Flash, capa gratuita). Hecho con React + Vite y pensado para empaquetarse como app de Android con Capacitor.

## Qué hace

- **Hoy**: un saludo según la hora del día y un botón grande para abrir la jornada de hoy.
- **Día**: kcal y proteína en grande (carbohidratos y grasas en pequeño) y una barra de proteína que empieza llena con tu objetivo y se va vaciando según comes ("Quedan 34 g de 144 g" o "+12 g sobre el objetivo"). Debajo, Desayuno, Comida, Cena y una lista de snacks.
- **Añadir comida**: haces una foto o eliges una de la galería, puedes añadir una nota ("200 g de arroz"), Gemini estima los platos y sus macros, corriges los gramos si hace falta y la guardas en su hueco con una miniatura.
- **Corregir o borrar**: el día de hoy puedes abrir una comida para ajustar gramos o borrarla. Los días pasados son de solo lectura.
- **Calendario** (menú ☰): marca los días con comidas y permite abrir cualquier día pasado.
- **Informes** semanales (lunes a domingo) y mensuales: totales, media diaria, días en que alcanzaste el objetivo de proteína y gráficos de barras de kcal y proteína por día con la línea del objetivo. Los días sin datos se quedan vacíos y no cuentan en las medias.
- **Ajustes**: objetivo diario de proteína (144 g por defecto), objetivo de kcal opcional, API key, modelo y copia de seguridad (exportar/importar JSON).

## Puesta en marcha

```bash
npm install
npm run dev
```

Abre http://localhost:5180 (el puerto está fijado en `vite.config.js` con `strictPort`, así que si está ocupado Vite da error en vez de cambiar de puerto). Pulsa ⚙️ y pega tu API key, que es gratuita en https://aistudio.google.com/apikey.

> **Windows / PowerShell**: si PowerShell bloquea `npm.ps1`, usa `npm.cmd` en su lugar (`npm.cmd install`, `npm.cmd run dev`, `npm.cmd run build`).

En desarrollo aparece un botón "🧪 Añadir comida de prueba" para probar el diario sin gastar llamadas a Gemini. No aparece en la build de producción.

Opcional: copia `.env.example` a `.env` para fijar una key y un modelo por defecto en desarrollo. Cualquier variable `VITE_*` acaba incrustada en el JS final, así que no la uses en builds que repartas.

## Dónde se guardan los datos

Todo se queda en el dispositivo; a Google solo se envían la foto (reducida a 1024 px) y la nota cuando pulsas "Analizar macros".

| Qué | Dónde |
|-----|-------|
| Días y comidas | `localStorage` → `macrosnap.data`, con un campo `version` para futuras migraciones |
| Objetivos | `localStorage` → `macrosnap.settings` |
| API key y modelo | `localStorage` → `macrosnap.apiKey` y `macrosnap.model` |
| Miniaturas | IndexedDB → base `macrosnap`, almacén `thumbs` (JPEG de 200 px, calidad 0.6). Si IndexedDB falla, la app sigue funcionando sin miniaturas. |

- Cada día se guarda con la clave `YYYY-MM-DD` calculada con la **hora local** del dispositivo (nunca UTC), y "hoy" se recalcula si la app sigue abierta pasada la medianoche.
- Todo el acceso a datos pasa por `src/lib/storage.js` y `src/lib/thumbs.js`, así que se puede cambiar el almacenamiento sin tocar las pantallas.
- **Copia de seguridad**: incluye los días y los objetivos, pero **no** la API key ni las miniaturas. Importar una copia sustituye todos los datos del dispositivo (la app pide confirmación y dice cuántos días trae).
- Los informes comparan cada día con el objetivo de proteína **actual**: si lo cambias, los días anteriores se evalúan con el nuevo valor.
- Si desinstalas la app o borras sus datos, se pierde el diario: exporta copias de vez en cuando.

## Modelo y capa gratuita

- El modelo por defecto es `gemini-3.5-flash` (estable, con capa gratuita y sin fecha de retirada anunciada a octubre de 2026). Se puede cambiar en Ajustes o con `VITE_GEMINI_MODEL`; el Flash más reciente es `gemini-3.8-flash`. Si ves "No se encuentra el modelo", consulta la lista actual en https://ai.google.dev/gemini-api/docs/models.
- Los modelos 2.5 no tienen fecha de retirada, pero Google limita el acceso a quien ya los usaba y recomienda los 3.x para proyectos nuevos (https://ai.google.dev/gemini-api/docs/deprecations).
- Los límites de tu cuenta están en https://aistudio.google.com/rate-limit. En la capa gratuita Google puede usar los datos enviados para mejorar sus modelos y no está pensada para uso comercial.

## Empaquetar como app Android (Capacitor)

La configuración (`capacitor.config.json`) y las dependencias de Capacitor ya están incluidas.

```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

`npx cap open android` abre el proyecto en Android Studio. Cada vez que cambies el código: `npm run build` y después `npx cap sync android`.

Notas:

- Cambia `appId` en `capacitor.config.json` por el tuyo (por ejemplo `com.tuusuario.macrosnap`) antes de generar el proyecto Android.
- La interfaz ya está adaptada al móvil: cabecera fija que respeta la barra de estado y el notch, botones de al menos 44 px, confirmaciones como hoja inferior y sin zoom ni resaltado azul al tocar.
- El botón "Cámara" usa `<input type="file" capture>`, que funciona en el WebView. Para una experiencia más nativa se puede migrar a `@capacitor/camera`.
- **Botón "atrás" de Android**: para que vuelva a la pantalla anterior de la app en lugar de cerrarla hace falta `@capacitor/app` (no está instalado).
- **Exportar copia** usa una descarga del navegador, que en el WebView de Android puede no funcionar. Para guardarla o compartirla desde la app harían falta `@capacitor/filesystem` y `@capacitor/share` (no están instalados).

## Seguridad de la API key

Llamar a Gemini desde la propia app significa que la key vive en el dispositivo y puede extraerse. Es aceptable para uso personal. Si vas a publicar la app, mueve la llamada a un backend propio (Cloud Functions, Cloudflare Workers, un servidor Node…) que guarde la key y haga de intermediario; solo habría que cambiar `src/lib/gemini.js`.

## Estructura

```
src/
  App.jsx                    navegación por estado de pantalla (sin router) y cabecera
  components/
    Home.jsx                 pantalla de inicio
    DayView.jsx              día: resumen, barra de proteína, huecos y snacks
    MealSlot.jsx             hueco de una comida (vacío o con miniatura)
    ProteinBar.jsx           barra de proteína que se vacía
    AddMeal.jsx              analizador de fotos + guardar en el hueco
    MealView.jsx             detalle de una comida (corregir o borrar)
    Results.jsx              platos, totales y edición de gramos
    SideMenu.jsx             menú lateral ☰
    Calendar.jsx             calendario mensual
    Reports.jsx              informes semanal y mensual
    BarChart.jsx             gráfico de barras SVG hecho a mano
    Settings.jsx             objetivos, API key, modelo y copia de seguridad
    ConfirmDialog.jsx        diálogo de confirmación (useConfirm)
    Thumb.jsx                miniatura desde IndexedDB
  lib/
    gemini.js                cliente REST de Gemini + esquema JSON
    image.js                 redimensionado de la foto y miniaturas
    storage.js               acceso a datos (localStorage) y copia de seguridad
    thumbs.js                miniaturas en IndexedDB
    nutrition.js             cálculo de totales
    reports.js               cálculos de los informes
    date.js                  fechas en hora local
    devSample.js             comida de prueba (solo desarrollo)
```
