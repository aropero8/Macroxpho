import { useCallback, useEffect, useState } from "react";
import { dateKey } from "./lib/date.js";
import { FALLBACK_MODEL, freeModelOr } from "./lib/models.js";
import { currentPeriod } from "./lib/reports.js";
import { getApiConfig, getSettings, saveApiConfig, saveSettings } from "./lib/storage.js";
import AddMeal from "./components/AddMeal.jsx";
import DayView from "./components/DayView.jsx";
import Home from "./components/Home.jsx";
import MealView from "./components/MealView.jsx";
import Reports from "./components/Reports.jsx";
import Settings from "./components/Settings.jsx";
import SideMenu from "./components/SideMenu.jsx";
import "./App.css";

// Navegación sin router: `screen` describe la pantalla actual.
//   { name: "home" }
//   { name: "day", date }
//   { name: "addMeal", date, tipo }
//   { name: "meal", date, mealId }
//   { name: "settings" }
//   { name: "reports", mode: "week" | "month", anchor }
// Cualquiera puede llevar `parent`: la pantalla a la que vuelve "‹"
// (por ejemplo, un día abierto desde un informe vuelve a ese informe).
export default function App() {
  const [apiKey, setApiKey] = useState(
    () => getApiConfig().apiKey || import.meta.env.VITE_GEMINI_API_KEY || ""
  );
  // Solo se usan modelos gratuitos: si el guardado no lo es, se usa el de por defecto.
  const [model, setModel] = useState(() => freeModelOr(getApiConfig().model));
  const [settings, setSettings] = useState(getSettings);
  const [screen, setScreen] = useState({ name: "home" });
  const [now, setNow] = useState(() => new Date());
  const today = dateKey(now);

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

  function go(next) {
    setScreen(next);
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }

  const openDay = (date) => go({ name: "day", date });
  const child = (next) => go({ ...next, parent: screen });
  const openReports = () =>
    go({ name: "reports", mode: "week", anchor: currentPeriod("week", today) });

  function back() {
    if (screen.parent) go(screen.parent);
    else if (screen.name === "addMeal" || screen.name === "meal") openDay(screen.date);
    else go({ name: "home" });
  }

  function onSaveSettings({ apiKey: k, model: m, proteinGoal, kcalGoal }) {
    saveApiConfig({ apiKey: k, model: m });
    saveSettings({ proteinGoal, kcalGoal });
    setApiKey(k);
    setModel(m);
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
          settings={settings}
          onAdd={(tipo) => child({ name: "addMeal", date: screen.date, tipo })}
          onOpenMeal={(meal) => child({ name: "meal", date: screen.date, mealId: meal.id })}
          onOpenToday={() => openDay(today)}
        />
      );
      break;
    case "addMeal":
      // Los días pasados son de solo lectura.
      content =
        screen.date === today ? (
          <AddMeal
            date={screen.date}
            tipo={screen.tipo}
            apiKey={apiKey}
            model={model}
            onSaved={back}
            onOpenSettings={() => child({ name: "settings" })}
          />
        ) : (
          <div className="card">
            <p>Ya no es hoy: los días pasados no se pueden editar.</p>
            <button className="btn" onClick={back}>
              Volver al día
            </button>
          </div>
        );
      break;
    case "meal":
      content = (
        <MealView
          key={screen.mealId}
          date={screen.date}
          mealId={screen.mealId}
          readOnly={screen.date !== today}
          onDone={back}
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
    case "settings":
      content = (
        <Settings
          apiKey={apiKey}
          model={model}
          defaultModel={FALLBACK_MODEL}
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
          onOpenToday={() => openDay(today)}
          onOpenSettings={() => child({ name: "settings" })}
        />
      );
  }

  return (
    <div className="app">
      <header>
        <div className="header-side">
          <button
            className="icon menu-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
          >
            ☰
          </button>
          {screen.name !== "home" && (
            <button className="icon back" onClick={back} aria-label="Volver">
              ‹
            </button>
          )}
        </div>
        <h1>MacroSnap</h1>
        <div className="header-side right">
          <button
            className="icon"
            onClick={() => screen.name !== "settings" && child({ name: "settings" })}
            aria-label="Ajustes"
          >
            ⚙️
          </button>
        </div>
      </header>

      {content}

      {menuOpen && (
        <SideMenu
          today={today}
          selected={screen.date}
          onSelectDay={openDay}
          onToday={() => openDay(today)}
          onReports={openReports}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}
