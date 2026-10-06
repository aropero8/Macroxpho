import { useEffect, useState } from "react";
import { DEFAULT_MODEL } from "./lib/gemini.js";
import { dateKey } from "./lib/date.js";
import { getApiConfig, getSettings, saveApiConfig, saveSettings } from "./lib/storage.js";
import AddMeal from "./components/AddMeal.jsx";
import DayView from "./components/DayView.jsx";
import Home from "./components/Home.jsx";
import MealView from "./components/MealView.jsx";
import Settings from "./components/Settings.jsx";
import "./App.css";

// Navegación sin router: `screen` describe la pantalla actual.
//   { name: "home" }
//   { name: "day", date }
//   { name: "addMeal", date, tipo }
//   { name: "meal", date, mealId }
//   { name: "settings", prev }
export default function App() {
  const [apiKey, setApiKey] = useState(
    () => getApiConfig().apiKey || import.meta.env.VITE_GEMINI_API_KEY || ""
  );
  const [model, setModel] = useState(() => getApiConfig().model || DEFAULT_MODEL);
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

  function go(next) {
    setScreen(next);
    window.scrollTo(0, 0);
  }

  const openDay = (date) => go({ name: "day", date });

  function back() {
    if (screen.name === "addMeal" || screen.name === "meal") openDay(screen.date);
    else if (screen.name === "settings") go(screen.prev);
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
          onAdd={(tipo) => go({ name: "addMeal", date: screen.date, tipo })}
          onOpenMeal={(meal) => go({ name: "meal", date: screen.date, mealId: meal.id })}
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
            onSaved={() => openDay(screen.date)}
            onOpenSettings={() => go({ name: "settings", prev: screen })}
          />
        ) : (
          <div className="card">
            <p>Ya no es hoy: los días pasados no se pueden editar.</p>
            <button className="btn" onClick={() => openDay(screen.date)}>
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
          onDone={() => openDay(screen.date)}
        />
      );
      break;
    case "settings":
      content = (
        <Settings
          apiKey={apiKey}
          model={model}
          defaultModel={DEFAULT_MODEL}
          settings={settings}
          onSave={onSaveSettings}
          onClose={back}
          onImported={() => setSettings(getSettings())}
        />
      );
      break;
    default:
      content = (
        <Home now={now} today={today} settings={settings} onOpenToday={() => openDay(today)} />
      );
  }

  return (
    <div className="app">
      <header>
        {screen.name === "home" ? (
          <span className="icon-spacer" />
        ) : (
          <button className="icon back" onClick={back} aria-label="Volver">
            ‹
          </button>
        )}
        <h1>MacroSnap</h1>
        <button
          className="icon"
          onClick={() => screen.name !== "settings" && go({ name: "settings", prev: screen })}
          aria-label="Ajustes"
        >
          ⚙️
        </button>
      </header>

      {content}
    </div>
  );
}
