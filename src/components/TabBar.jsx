import Icon from "./Icon.jsx";

const TABS = [
  { id: "home", label: "Hoy", icon: "home" },
  { id: "calendar", label: "Calendario", icon: "calendar" },
  null, // hueco del botón de cámara
  { id: "reports", label: "Informes", icon: "chart" },
  { id: "menu", label: "¿Qué pido?", icon: "sparkle" },
];

// Barra inferior con las cuatro secciones y, en el centro, el botón de cámara que añade
// una comida a hoy en el hueco que toca por la hora.
export default function TabBar({ active, onSelect, onCamera }) {
  return (
    <nav className="tabbar" aria-label="Secciones">
      <div className="tabbar-inner">
        {TABS.map((tab) =>
          tab ? (
            <button
              key={tab.id}
              className="tab"
              onClick={() => onSelect(tab.id)}
              aria-current={active === tab.id ? "page" : undefined}
            >
              <span className="tab-pill">
                <Icon name={tab.icon} />
              </span>
              {tab.label}
            </button>
          ) : (
            <button key="camera" className="tab-fab" onClick={onCamera} aria-label="Añadir comida con foto">
              <Icon name="camera" />
            </button>
          )
        )}
      </div>
    </nav>
  );
}
