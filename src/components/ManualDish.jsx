import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { addDays, dateKey, parseKey } from "../lib/date.js";
import { EXTRAS, round } from "../lib/nutrition.js";
import { recentDishes } from "../lib/storage.js";
import Icon from "./Icon.jsx";
import { MacroSplit } from "./MacroDetail.jsx";

const MACROS = ["kcal", "proteina_g", "carbohidratos_g", "grasas_g", ...EXTRAS.map((e) => e.key)];
const EMPTY = Object.fromEntries(["nombre", "gramos", ...MACROS].map((k) => [k, ""]));
const MAX_SUGGESTIONS = 6;

// Acepta "12,5" y "12.5"; lo vacío o negativo cuenta como 0.
const num = (s) => {
  const n = Number(String(s).trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const show = (n, decimals = 1) => {
  const f = 10 ** decimals;
  return String(Math.round(n * f) / f).replace(".", ",");
};
function dayLabel(key) {
  const today = dateKey();
  if (key === today) return "hoy";
  if (key === addDays(today, -1)) return "ayer";
  return parseKey(key).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

// Sin mayúsculas ni tildes, letra a letra para que las posiciones coincidan con el
// original y se pueda resaltar lo que se ha escrito.
const fold = (s) =>
  [...s].map((ch) => ch.toLowerCase().normalize("NFD")[0]).join("");

// Platos anteriores que contienen lo escrito; primero los que empiezan por ello. Sin
// nada escrito, los últimos apuntados.
function suggest(recent, query) {
  const q = fold(query.trim());
  if (!q) return recent.slice(0, MAX_SUGGESTIONS);
  const hits = recent
    .map((d) => ({ d, at: fold(d.nombre).indexOf(q) }))
    .filter((h) => h.at >= 0);
  hits.sort((a, b) => (b.at === 0) - (a.at === 0)); // estable: dentro, por recientes
  return hits.slice(0, MAX_SUGGESTIONS).map((h) => h.d);
}

function Highlight({ text, query }) {
  const q = fold(query.trim());
  const at = q ? fold(text).indexOf(q) : -1;
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}

// Apuntar un plato a mano, sin foto ni Gemini. Al escribir el nombre se proponen los
// platos ya apuntados otro día; al elegir uno se rellenan sus macros y, al cambiar la
// ración, se recalculan.
export default function ManualDish({ onAdd, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [ref, setRef] = useState(null); // plato anterior del que salen los números
  const [open, setOpen] = useState(false); // lista de platos anteriores
  const [active, setActive] = useState(-1); // opción marcada con las flechas
  const recent = useMemo(recentDishes, []);
  const nameRef = useRef(null);
  const listId = useId();

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const options = useMemo(() => suggest(recent, form.nombre), [recent, form.nombre]);
  // Ya elegido (o escrito entero): la lista solo estorbaría
  const exact = options.length === 1 && fold(options[0].nombre) === fold(form.nombre.trim());
  const showList = open && options.length > 0 && !exact;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  function fromRecent(d, grams) {
    const f = d.gramos > 0 && grams > 0 ? grams / d.gramos : 1;
    return {
      kcal: show(d.kcal * f, 0),
      proteina_g: show(d.proteina_g * f),
      carbohidratos_g: show(d.carbohidratos_g * f),
      grasas_g: show(d.grasas_g * f),
      // Los nutrientes que no tenía aquel plato se quedan vacíos (sin dato), no a 0
      ...Object.fromEntries(EXTRAS.map(({ key }) => [key, d[key] != null ? show(d[key] * f) : ""])),
    };
  }

  // Elegir un plato de la lista es pedir sus números: se rellenan siempre.
  function pick(d) {
    setForm({ ...EMPTY, nombre: d.nombre, gramos: d.gramos > 0 ? show(d.gramos, 0) : "", ...fromRecent(d) });
    setRef(d);
    setOpen(false);
    nameRef.current?.blur(); // baja el teclado: el plato ya está listo para añadir
  }

  // Al escribir, los números rellenados siguen al nombre: si deja de coincidir, se
  // vacían. Lo que haya escrito la persona no se toca nunca.
  function onName(nombre) {
    setOpen(true);
    setActive(-1);
    const match = recent.find((d) => fold(d.nombre) === fold(nombre.trim()));
    const untouched = ref || ["gramos", ...MACROS].every((k) => form[k] === "");
    if (match && untouched) {
      set({ nombre, gramos: match.gramos > 0 ? show(match.gramos, 0) : "", ...fromRecent(match) });
      setRef(match);
    } else if (ref) {
      setForm({ ...EMPTY, nombre });
      setRef(null);
    } else set({ nombre });
  }

  function onNameKey(e) {
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault(); // elige el plato en vez de enviar el formulario
      pick(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function onGrams(gramos) {
    set(ref && num(gramos) ? { gramos, ...fromRecent(ref, num(gramos)) } : { gramos });
  }

  function onMacro(key, value) {
    set({ [key]: value });
    setRef(null); // a partir de aquí los números son de la persona
  }

  const g = num(form.gramos);
  const p = num(form.proteina_g);
  const c = num(form.carbohidratos_g);
  const fat = num(form.grasas_g);
  const autoKcal = 4 * p + 4 * c + 9 * fat;
  const kcal = num(form.kcal) || autoKcal;
  const canAdd = form.nombre.trim() !== "" && kcal > 0;

  function add(e) {
    e.preventDefault();
    if (!canAdd) return;
    const nombre = form.nombre.trim();
    onAdd({
      nombre: nombre.charAt(0).toUpperCase() + nombre.slice(1),
      gramos: g,
      gramosBase: g,
      kcal,
      proteina_g: p,
      carbohidratos_g: c,
      grasas_g: fat,
      // Solo los que se hayan escrito: vacío es "no lo sé", no 0
      ...Object.fromEntries(
        EXTRAS.filter(({ key }) => form[key].trim() !== "").map(({ key }) => [key, num(form[key])])
      ),
      manual: true,
    });
    setForm(EMPTY);
    setRef(null);
    nameRef.current?.focus();
  }

  // Campo numérico con la unidad dentro; `dot` es el color del macro en el reparto.
  const field = (key, label, { unit = "g", placeholder = "0", dot } = {}) => (
    <label className="field">
      <span className="field-label">
        {dot && <i className={`dot ${dot}`} aria-hidden="true" />}
        {label}
      </span>
      <span className="unit-input">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={form[key]}
          placeholder={placeholder}
          onChange={(e) =>
            key === "gramos" ? onGrams(e.target.value) : onMacro(key, e.target.value)
          }
        />
        <span className="unit" aria-hidden="true">
          {unit}
        </span>
      </span>
    </label>
  );

  return (
    <form className="card manual" onSubmit={add}>
      <div className="manual-head">
        <div>
          <h3>Apuntar a mano</h3>
          <p className="hint">Sin foto ni IA: escribe lo que sepas.</p>
        </div>
        <button type="button" className="icon" onClick={onClose} aria-label="Cerrar">
          <Icon name="close" />
        </button>
      </div>

      <div className="field">
        <label className="field-label" htmlFor={`${listId}-name`}>
          Plato
        </label>
        <div className="combo">
          <input
            id={`${listId}-name`}
            ref={nameRef}
            type="text"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            enterKeyHint="next"
            value={form.nombre}
            onChange={(e) => onName(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onNameKey}
            placeholder={recent.length > 0 ? "Busca o escribe un plato" : "Ej: Pechuga de pollo a la plancha"}
          />
          {showList && (
            <ul
              id={listId}
              className="combo-list"
              role="listbox"
              aria-label="Platos ya apuntados"
              // Sin esto el campo pierde el foco y la lista se cierra antes del toque
              onPointerDown={(e) => e.preventDefault()}
            >
              <li className="combo-title" role="presentation">
                {form.nombre.trim() ? "Ya apuntados" : "Recientes"}
              </li>
              {options.map((d, i) => (
                <li
                  key={d.nombre}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={i === active ? "active" : undefined}
                  onClick={() => pick(d)}
                >
                  <span className="combo-name">
                    <Highlight text={d.nombre} query={form.nombre} />
                  </span>
                  <span className="combo-meta">
                    <strong>{round(d.proteina_g)} g prot.</strong> · {round(d.kcal)} kcal
                    {d.gramos > 0 && ` · ${round(d.gramos)} g`}
                  </span>
                  <span className="combo-date">{dayLabel(d.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {ref && (
        <p className="manual-ref">
          <Icon name="clock" />
          <span>
            Datos del plato {/^\d/.test(dayLabel(ref.date)) ? "del" : "de"} {dayLabel(ref.date)}
            {ref.gramos > 0 && ". Cambia la ración y se recalculan"}
          </span>
        </p>
      )}

      <div className="manual-grid two">
        {field("gramos", "Ración", { placeholder: "Opcional" })}
        {field("kcal", "Calorías", {
          unit: "kcal",
          placeholder: autoKcal > 0 ? String(round(autoKcal)) : "Auto",
        })}
      </div>

      <div className="manual-grid three">
        {field("proteina_g", "Proteína", { dot: "proteina" })}
        {field("carbohidratos_g", "Carbos", { dot: "carbohidratos" })}
        {field("grasas_g", "Grasas", { dot: "grasas" })}
      </div>

      <details className="manual-more" open={EXTRAS.some(({ key }) => form[key] !== "")}>
        <summary>
          <span>Fibra, azúcares, saturadas y sal</span>
          <Icon name="next" className="chev" />
        </summary>
        <div className="manual-grid two">
          {EXTRAS.map(({ key, label }) => (
            <Fragment key={key}>{field(key, label, { placeholder: "—" })}</Fragment>
          ))}
        </div>
      </details>

      {kcal > 0 && (
        <div className="manual-sum">
          <div className="manual-sum-nums">
            <span className="num">
              {round(kcal)}
              <small>kcal</small>
            </span>
            <span className="manual-sum-prot">
              <strong className="num">{show(p)}</strong> g proteína
            </span>
          </div>
          <MacroSplit totals={{ proteina_g: p, carbohidratos_g: c, grasas_g: fat }} />
          {!num(form.kcal) && <p className="hint">Calorías calculadas con los macros.</p>}
        </div>
      )}

      <button type="submit" className="btn tonal full" disabled={!canAdd}>
        <Icon name="plus" />
        Añadir plato
      </button>
    </form>
  );
}
