import { useCallback, useEffect, useState } from "react";
import { exitApp, useBackButton } from "./lib/backButton.js";
import { addDays, dateKey } from "./lib/date.js";
import { round } from "./lib/nutrition.js";
import { processPending, RETRY_MS } from "./lib/pending.js";
import { currentPeriod } from "./lib/reports.js";
import {
  findMeal,
  getApiConfig,
  getSettings,
  MEAL_LABELS,
  restoreMeal,
  saveApiConfig,
  saveSettings,
} from "./lib/storage.js";
import { deletePhoto, deleteThumb } from "./lib/thumbs.js";
import AddMeal from "./components/AddMeal.jsx";
import DayView from "./components/DayView.jsx";
import Home from "./components/Home.jsx";
import Icon from "./components/Icon.jsx";
import MealView from "./components/MealView.jsx";
import MenuAdvisor from "./components/MenuAdvisor.jsx";
import Reports from "./components/Reports.jsx";
import Settings from "./components/Settings.jsx";
import SideMenu from "./components/SideMenu.jsx";
import { useToast } from "./components/Toast.jsx";
import "./App.css";

const DELETED = {
  desayuno: "Desayuno borrado",
  comida: "Comida borrada",
  cena: "Cena borrada",
  snack: "Snack borrado",
};

// Navegación sin router: `screen` describe la pantalla actual.
//   { name: "home" }
//   { name: "day", date }
//   { name: "addMeal", date, tipo, manual? }   manual: abre directamente "Apuntar a mano"
//   { name: "meal", date, mealId }
//   { name: "menu" }       recomendador de menús ("¿Qué pido?")
//   { name: "settings" }
//   { name: "reports", mode: "week" | "month", anchor }
// Cualquiera puede llevar `parent`: la pantalla a la que vuelve "‹"
// (por ejemplo, un día abierto desde un informe vuelve a ese informe).
export default function App() {
  const [apiKey, setApiKey] = useState(
    () => getApiConfig().apiKey || import.meta.env.VITE_GEMINI_API_KEY || ""
  );
  const [settings, setSettings] = useState(getSettings);
  const [screen, setScreen] = useState({ name: "home" });
  // Sentido de la última navegación, para la transición: "forward", "back" o "none".
  const [navDir, setNavDir] = useState("none");
  const [now, setNow] = useState(() => new Date());
  const today = dateKey(now);
  // Se puede editar hoy y ayer (por si se olvidó apuntar algo); lo anterior es de solo lectura.
  const isEditable = (date) => date >= addDays(today, -1);

  // "Hoy" y el saludo se recalculan cada minuto y al volver a la app
  // (por ejemplo, si se queda abierta pasada la medianoche).
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, []);

  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const [showToast, toastView] = useToast();

  // Fotos que esperan a Gemini (pending.js): se reintentan al abrir la app, cada pocos
  // minutos, al volver a ella y al recuperar la conexión. Al cerrarse alguna, se avisa y
  // se vuelve a pintar la pantalla con los datos nuevos.
  const [dataVersion, setDataVersion] = useState(0);
  const checkPending = useCallback(async () => {
    const done = await processPending(apiKey);
    if (!done.length) return done;
    setDataVersion((v) => v + 1);
    const protein = round(done.reduce((acc, d) => acc + d.meal.totales.proteina_g, 0));
    showToast({
      message:
        done.length === 1
          ? `Gemini ha analizado tu ${MEAL_LABELS[done[0].meal.tipo].toLowerCase()} · ${protein} g de proteína`
          : `Gemini ha analizado ${done.length} comidas pendientes · ${protein} g de proteína`,
    });
    return done;
  }, [apiKey, showToast]);

  useEffect(() => {
    checkPending();
    const id = setInterval(checkPending, RETRY_MS);
    const onVisible = () => document.visibilityState === "visible" && checkPending();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", checkPending);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", checkPending);
    };
  }, [checkPending]);

  function go(next, dir = "none") {
    setScreen(next);
    setNavDir(dir);
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }

  const openDay = (date) => go({ name: "day", date });
  const child = (next) => go({ ...next, parent: screen }, "forward");
  const openReports = () =>
    go({ name: "reports", mode: "week", anchor: currentPeriod("week", today) });

  // Cambiar de día desde el propio día: conserva la pantalla a la que vuelve "‹".
  const shiftDay = (n) =>
    go({ ...screen, date: addDays(screen.date, n) }, n < 0 ? "back" : "forward");

  function back() {
    if (screen.parent) go(screen.parent, "back");
    else if (screen.name === "addMeal" || screen.name === "meal") go({ name: "day", date: screen.date }, "back");
    else go({ name: "home" }, "back");
  }

  // Atrás de Android: el menú y los diálogos se cierran solos (useBackLayer);
  // si no hay ninguno abierto, vuelve a la pantalla anterior y solo sale desde Hoy.
  useBackButton(() => (screen.name === "home" ? exitApp() : back()));

  function onMealSaved(meal) {
    back();
    showToast({
      message: meal.pendiente
        ? `Guardado en ${MEAL_LABELS[meal.tipo].toLowerCase()} · se analizará cuando Gemini vuelva`
        : `Guardado en ${MEAL_LABELS[meal.tipo].toLowerCase()} · ${round(meal.totales.proteina_g)} g de proteína`,
    });
  }

  // Borrar no pide confirmación: se puede deshacer unos segundos y la foto solo se borra
  // cuando ya no hay vuelta atrás.
  function onMealDeleted(date, meal) {
    back();
    showToast({
      message: DELETED[meal.tipo],
      action: { label: "Deshacer", run: () => restoreMeal(date, meal) },
      onExpire: () => {
        deleteThumb(meal.thumbId);
        deletePhoto(meal.id); // la de una comida pendiente; si no hay, no hace nada
      },
    });
  }

  function onSaveSettings({ apiKey: k, proteinGoal, kcalGoal }) {
    saveApiConfig({ apiKey: k });
    saveSettings({ proteinGoal, kcalGoal });
    setApiKey(k);
    setSettings({ proteinGoal, kcalGoal });
    back();
  }

  let content;
  switch (screen.name) {
    case "day":
      content = (
        <DayView
          date={screen.date}
          isToday={screen.date === today}
          editable={isEditable(screen.date)}
          settings={settings}
          onAdd={(tipo) => child({ name: "addMeal", date: screen.date, tipo })}
          onOpenMeal={(meal) => child({ name: "meal", date: screen.date, mealId: meal.id })}
          onOpenToday={() => openDay(today)}
          onPrevDay={() => shiftDay(-1)}
          onNextDay={screen.date < today ? () => shiftDay(1) : null}
        />
      );
      break;
    case "addMeal":
      // Antes de ayer, solo lectura.
      content =
        isEditable(screen.date) ? (
          <AddMeal
            date={screen.date}
            tipo={screen.tipo}
            apiKey={apiKey}
            startManual={screen.manual}
            onSaved={onMealSaved}
            onOpenSettings={() => child({ name: "settings" })}
          />
        ) : (
          <div className="card">
            <p>Este día ya no se puede editar: solo hoy y ayer.</p>
            <button className="btn" onClick={back}>
              Volver al día
            </button>
          </div>
        );
      break;
    case "meal":
      content = (
        <MealView
          // Una comida pendiente se vuelve a montar cuando Gemini la analiza.
          key={findMeal(screen.date, screen.mealId)?.pendiente ? `${screen.mealId}-${dataVersion}` : screen.mealId}
          date={screen.date}
          mealId={screen.mealId}
          readOnly={!isEditable(screen.date)}
          onRetry={checkPending}
          onDone={back}
          onSaved={() => {
            back();
            showToast({ message: "Cambios guardados" });
          }}
          onDeleted={(meal) => onMealDeleted(screen.date, meal)}
        />
      );
      break;
    case "reports":
      content = (
        <Reports
          today={today}
          settings={settings}
          mode={screen.mode}
          anchor={screen.anchor}
          onChange={(mode, anchor) => setScreen({ ...screen, mode, anchor })}
          onOpenDay={(date) => child({ name: "day", date })}
        />
      );
      break;
    case "menu":
      content = (
        <MenuAdvisor
          today={today}
          settings={settings}
          apiKey={apiKey}
          onSaved={onMealSaved}
          onOpenSettings={() => child({ name: "settings" })}
        />
      );
      break;
    case "settings":
      content = (
        <Settings
          apiKey={apiKey}
          settings={settings}
          onSave={onSaveSettings}
          onClose={back}
          onImported={() => setSettings(getSettings())}
        />
      );
      break;
    default:
      content = (
        <Home
          now={now}
          today={today}
          settings={settings}
          hasApiKey={Boolean(apiKey)}
          onOpenToday={() => child({ name: "day", date: today })}
          onOpenDay={(date) => child({ name: "day", date })}
          onAddMeal={(tipo, manual) => child({ name: "addMeal", date: today, tipo, manual })}
          onOpenMenu={() => child({ name: "menu" })}
          onOpenSettings={() => child({ name: "settings" })}
        />
      );
  }

  // Cambiar de pantalla monta un <main> nuevo y lanza su animación de entrada. Cambiar
  // de periodo en Informes no cuenta como pantalla nueva.
  const screenKey = [screen.name, screen.date, screen.tipo, screen.mealId].join("|");

  return (
    <div className="app">
      <header>
        <div className="header-side">
          <button
            className="icon"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
          >
            <Icon name="menu" />
          </button>
          {screen.name !== "home" && (
            <button className="icon" onClick={back} aria-label="Volver">
              <Icon name="back" />
            </button>
          )}
        </div>
        <h1 className="wordmark">
          Macro<span>Snap</span>
        </h1>
        <div className="header-side right">
          <button
            className="icon"
            onClick={() => screen.name !== "settings" && child({ name: "settings" })}
            aria-label="Ajustes"
            aria-current={screen.name === "settings" ? "page" : undefined}
          >
            <Icon name="settings" />
          </button>
        </div>
      </header>

      <main key={screenKey} className={`screen enter-${navDir}`}>
        {content}
      </main>

      {toastView}

      {menuOpen && (
        <SideMenu
          today={today}
          selected={screen.date}
          onSelectDay={openDay}
          onToday={() => openDay(today)}
          onReports={openReports}
          onMenu={() => go({ name: "menu" })}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}
