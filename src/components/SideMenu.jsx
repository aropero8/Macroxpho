import { useEffect, useRef } from "react";
import { listDaysWithData } from "../lib/storage.js";
import Calendar from "./Calendar.jsx";

// Panel lateral con el calendario y accesos rápidos. Se cierra al elegir algo,
// al tocar fuera, con ✕ o con Escape.
export default function SideMenu({ today, selected, onSelectDay, onToday, onReports, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // que no se desplace la página de fondo
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="menu-overlay" onClick={onClose}>
      <nav
        ref={panelRef}
        className="menu-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="menu-head">
          <strong>Calendario</strong>
          <button className="icon" onClick={onClose} aria-label="Cerrar menú">
            ✕
          </button>
        </div>

        <Calendar
          today={today}
          selected={selected}
          markedDays={new Set(listDaysWithData())}
          onSelect={onSelectDay}
        />

        <div className="menu-links">
          <button className="menu-link" onClick={onToday}>
            📅 Hoy
          </button>
          <button className="menu-link" onClick={onReports} disabled={!onReports}>
            📊 Informes {!onReports && <small>(próximamente)</small>}
          </button>
        </div>
      </nav>
    </div>
  );
}
