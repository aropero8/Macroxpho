# MacroSnap

Diario de comidas que estima las calorías y los macronutrientes a partir de una foto del plato, usando la API de Gemini de Google. Funciona en el navegador y como app de Android.

Haces una foto (o eliges una de la galería), Gemini identifica los platos y estima sus gramos y macros, corriges lo que haga falta y la comida queda guardada en tu día. Está pensada sobre todo para seguir la **proteína diaria** frente a un objetivo.

> **Proyecto personal.** No hay versión publicada en Google Play ni APK descargable: para usarla hay que ejecutarla en local o compilarla para Android siguiendo las instrucciones de abajo. No está afiliado a Google.

> [!WARNING]
> **Las fotos se envían a Google.** Cada vez que pulsas «Analizar macros», la foto (reducida a 1024 px) y la nota que hayas escrito se envían a la API de Gemini de Google para analizarlas. En la capa gratuita, Google puede usar lo que envías para mejorar sus productos ([condiciones de la API de Gemini](https://ai.google.dev/gemini-api/terms)). No fotografíes nada que no quieras compartir con Google.
>
> Todo lo demás (el diario, los objetivos, las miniaturas y tu API key) se queda en tu dispositivo. MacroSnap no tiene servidor propio ni recoge ningún dato.

## Qué hace

- **Hoy**: un saludo según la hora del día y un botón grande para abrir la jornada de hoy.
- **Día**: kcal y proteína en grande (carbohidratos y grasas en pequeño) y una barra de proteína frente a tu objetivo ("Quedan 34 g de 144 g" o "+12 g sobre el objetivo"). Debajo, Desayuno, Comida, Cena y una lista de snacks.
- **Añadir comida**: haces una foto o eliges una de la galería, puedes añadir una nota ("200 g de arroz"), Gemini estima los platos y sus macros, corriges los gramos si hace falta y la guardas en su hueco con una miniatura.
- **Corregir o borrar**: el día de hoy puedes abrir una comida para ajustar gramos o borrarla. Los días pasados son de solo lectura.
- **Calendario** (menú ☰): marca los días con comidas y permite abrir cualquier día pasado.
- **Informes** semanales (lunes a domingo) y mensuales: totales, media diaria, días en que alcanzaste el objetivo de proteína y gráficos de kcal y proteína por día con la línea del objetivo.
- **Ajustes**: objetivo diario de proteína (144 g por defecto), objetivo de kcal opcional, API key, modelo y copia de seguridad (exportar/importar JSON).

Las estimaciones a partir de una foto son aproximadas: la app no sustituye a un profesional de la nutrición.

## Tu propia API key de Gemini (gratuita)

MacroSnap no incluye ninguna API key: **cada persona usa la suya**. Conseguirla es gratis y no hace falta tarjeta para la capa gratuita.

1. Entra en [Google AI Studio](https://aistudio.google.com/apikey) con tu cuenta de Google.
2. Crea una API key y cópiala (empieza por `AIza`).
3. En MacroSnap, pulsa ⚙️ **Ajustes**, pega la key y guarda.

La key se guarda solo en tu dispositivo y solo se envía a Google, en cada análisis. No la compartas ni la subas a ningún repositorio.

La capa gratuita tiene límites de peticiones por minuto y por día; puedes ver los tuyos en https://aistudio.google.com/rate-limit. Si te pasas, la app te avisa y basta con esperar un poco o probar otro modelo en Ajustes.

## Usarla en el navegador

Necesitas [Node.js](https://nodejs.org/) 22.12 o superior y Git.

```bash
git clone https://github.com/aropero8/Macroxpho.git
cd Macroxpho
npm install
npm run dev
```

Abre http://localhost:5180, pulsa ⚙️ y pega tu API key. El puerto está fijado en `vite.config.js` con `strictPort`, así que si está ocupado Vite da error en vez de cambiar de puerto.

> **Windows / PowerShell**: si PowerShell bloquea `npm.ps1`, usa `npm.cmd` en su lugar (`npm.cmd install`, `npm.cmd run dev`, `npm.cmd run build`).

Para generar la versión optimizada: `npm run build` deja la web en `dist/`, y `npm run preview` la sirve en local para probarla.

## Instalarla en Android

El proyecto Android ya está generado en `android/` con [Capacitor](https://capacitorjs.com/) (appId `com.alberto.macrosnap`). No hace falta ejecutar `npx cap add android`.

### Requisitos

- Todo lo del apartado anterior (Node.js 22.12+ y `npm install` hecho).
- **Android Studio**, que incluye el SDK de Android.
- **JDK 21 para Gradle.** Capacitor 8 compila con Java 21, y Gradle 8.14.3 (el que fija la plantilla) no funciona con el Java 25 que trae Android Studio: falla con `Unsupported class file major version 69`. En Android Studio ve a *Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK* y elige un JDK 21. Si no tienes ninguno, en ese mismo desplegable está *Download JDK…* (elige la versión 21).
- Un móvil con **Android 7.0 o superior**.

### Generar y abrir el proyecto

```bash
npm run android
```

`npm run android` compila la web (`vite build`), la copia al proyecto Android (`cap sync android`) y abre Android Studio (`cap open android`). En PowerShell usa `npm.cmd run android`. Si no encuentra Android Studio, define la variable de entorno `CAPACITOR_ANDROID_STUDIO_PATH` con la ruta de `studio64.exe`.

Cada vez que cambies el código web, vuelve a ejecutar `npm run android`, o `npm run build` y `npx cap sync android` si ya tienes Android Studio abierto, y pulsa *Run* otra vez.

### Ejecutar en el móvil por USB

1. **Activa las opciones de desarrollador** en el móvil: *Ajustes → Información del teléfono* y toca 7 veces *Número de compilación*. Según la marca, puede estar dentro de *Información de software*.
2. **Activa la depuración por USB**: *Ajustes → Sistema → Opciones de desarrollador → Depuración por USB*. En algunos Xiaomi hay que activar también *Instalar vía USB*.
3. **Conecta el móvil por USB** y acepta en el móvil el aviso *¿Permitir depuración por USB?* (marca *Permitir siempre desde este ordenador*). Si Windows no lo reconoce, instala el controlador USB del fabricante.
4. En Android Studio, **espera a que termine la sincronización de Gradle**, elige tu móvil en el desplegable de dispositivos de la barra superior y pulsa **Run ▶**.
5. La app se instala como **MacroSnap**. Ábrela, ve a ⚙️ Ajustes y pega tu API key.

Con Android 11 o superior también puedes conectarlo sin cable con *Depuración inalámbrica*, desde *Pair Devices Using Wi-Fi* en Android Studio.

Para depurar la parte web dentro del móvil, abre `chrome://inspect` en Chrome del ordenador con el móvil conectado.

### Qué incluye la parte Android

- **Cámara:** el botón "Cámara" usa `<input type="file" capture>`, que Capacitor convierte en una llamada a la app de cámara del sistema. El manifiesto declara `<queries>` para `IMAGE_CAPTURE`; sin eso, desde Android 11 se abriría la galería en vez de la cámara. No hace falta el permiso `CAMERA`, porque la foto la hace la app de cámara.
- **Botón Atrás** (`@capacitor/app`): cierra el diálogo o el menú si hay uno abierto, si no vuelve a la pantalla anterior, y solo sale de la app desde la pantalla de inicio.
- **Barra de estado y zonas seguras:** en `capacitor.config.json`, `SystemBars` pone iconos claros sobre el fondo oscuro y hace que `env(safe-area-inset-*)` del CSS funcione con el notch y la barra de navegación. `backgroundColor` evita el destello blanco al abrir.
- **Icono y pantalla de inicio:** el icono es un vector (`android/app/src/main/res/drawable/ic_macrosnap_foreground.xml`) y los colores están en `res/values/colors.xml`. Los PNG de `mipmap-*` son solo para Android 7 y salen del mismo diseño.
- **Exportar copia** usa una descarga del navegador, que dentro de la app de Android puede no funcionar. Para guardarla o compartirla desde la app harían falta `@capacitor/filesystem` y `@capacitor/share` (no están instalados).

## Dónde se guardan los datos

Todo se queda en el dispositivo; a Google solo se envían la foto y la nota cuando pulsas "Analizar macros".

| Qué | Dónde |
|-----|-------|
| Días y comidas | `localStorage` → `macrosnap.data`, con un campo `version` para futuras migraciones |
| Objetivos | `localStorage` → `macrosnap.settings` |
| API key y modelo | `localStorage` → `macrosnap.apiKey` y `macrosnap.model` |
| Miniaturas | IndexedDB → base `macrosnap`, almacén `thumbs` (JPEG de 200 px, calidad 0.6). Si IndexedDB falla, la app sigue funcionando sin miniaturas. |

- Cada día se guarda con la clave `YYYY-MM-DD` calculada con la **hora local** del dispositivo (nunca UTC), y "hoy" se recalcula si la app sigue abierta pasada la medianoche.
- **Copia de seguridad**: incluye los días y los objetivos, pero **no** la API key ni las miniaturas. Importar una copia sustituye todos los datos del dispositivo (la app pide confirmación y dice cuántos días trae).
- Los informes comparan cada día con el objetivo de proteína **actual**: si lo cambias, los días anteriores se evalúan con el nuevo valor.
- Si desinstalas la app o borras los datos del navegador, se pierde el diario: exporta copias de vez en cuando.

## Modelo y capa gratuita

- En Ajustes hay un desplegable que **solo muestra modelos con capa gratuita** que aceptan fotos: `gemini-3.8-flash` (el más reciente), `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash` (por defecto), `gemini-3.5-flash-lite` y `gemini-3.1-flash-lite` (Google lo retira el 7 de mayo de 2027). La lista está en `src/lib/models.js` y se revisó en octubre de 2026 con https://ai.google.dev/gemini-api/docs/pricing; si Google la cambia, basta con editar ese archivo.
- Si hay guardado un modelo que no está en la lista, o `VITE_GEMINI_MODEL` apunta a uno de pago, la app usa el de por defecto.
- Fuera de la lista quedan los 2.5 (no tienen fecha de retirada, pero Google limita el acceso a quien ya los usaba: https://ai.google.dev/gemini-api/docs/deprecations), los preview y los modelos de voz, imagen o embeddings.
- En la capa gratuita Google puede usar los datos enviados para mejorar sus modelos y no está pensada para uso comercial.

## Seguridad de la API key

La app llama a Gemini directamente desde el dispositivo, así que la key vive en él y alguien con acceso al dispositivo podría extraerla. Para uso personal, con tu propia key, es aceptable. Si quisieras distribuir la app con una key compartida, tendrías que mover la llamada a un backend propio (Cloud Functions, Cloudflare Workers, un servidor Node…) que guarde la key y haga de intermediario; solo habría que cambiar `src/lib/gemini.js`.

**Nunca pongas tu key en el código.** Opcionalmente, para desarrollo, puedes copiar `.env.example` a `.env` y fijar una key y un modelo por defecto (`.env` está en `.gitignore`). Ojo: cualquier variable `VITE_*` acaba incrustada en el JS compilado, así que no la uses en builds que vayas a repartir.

## Desarrollo

En desarrollo (`npm run dev`) aparece un botón "🧪 Añadir comida de prueba" para probar el diario sin gastar llamadas a Gemini. No aparece en la build de producción.

Todo el acceso a datos pasa por `src/lib/storage.js` y `src/lib/thumbs.js`, así que se puede cambiar el almacenamiento sin tocar las pantallas.

```
src/
  App.jsx                    navegación por estado de pantalla (sin router) y cabecera
  components/
    Home.jsx                 pantalla de inicio
    DayView.jsx              día: resumen, barra de proteína, huecos y snacks
    MealSlot.jsx             hueco de una comida (vacío o con miniatura)
    ProteinBar.jsx           barra de proteína
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
    models.js                lista de modelos gratuitos para el desplegable
    image.js                 redimensionado de la foto y miniaturas
    storage.js               acceso a datos (localStorage) y copia de seguridad
    thumbs.js                miniaturas en IndexedDB
    nutrition.js             cálculo de totales
    reports.js               cálculos de los informes
    date.js                  fechas en hora local
    backButton.js            botón Atrás de Android (@capacitor/app)
    devSample.js             comida de prueba (solo desarrollo)
android/                     proyecto Android generado por Capacitor
  app/src/main/AndroidManifest.xml     permisos y <queries> de la cámara
  app/src/main/res/                    icono, pantalla de inicio y colores
capacitor.config.json        appId, barras del sistema y color de fondo
```

## Licencia

Copyright (C) 2026 Alberto

MacroSnap es software libre: puedes redistribuirlo y/o modificarlo según los términos de la **GNU General Public License** publicada por la Free Software Foundation, ya sea la versión 3 o (a tu elección) cualquier versión posterior (`GPL-3.0-or-later`).

Se distribuye con la esperanza de que sea útil, pero **sin ninguna garantía**, ni siquiera la garantía implícita de comerciabilidad o de idoneidad para un propósito particular. Consulta el texto completo de la licencia en [LICENSE](LICENSE).
