import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { parseKey } from "../lib/date.js";
import { EXTRAS, round } from "../lib/nutrition.js";
import { recentDishes } from "../lib/storage.js";
import Icon from "./Icon.jsx";

const MACROS = ["kcal", "proteina_g", "carbohidratos_g", "grasas_g", ...EXTRAS.map((e) => e.key)];
const EMPTY = Object.fromEntries(["nombre", "gramos", ...MACROS].map((k) => [k, ""]));

// Acepta "12,5" y "12.5"; lo vacío o negativo cuenta como 0.
const num = (s) => {
  const n = Number(String(s).trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const show = (n, decimals = 1) => {
  const f = 10 ** decimals;
  return String(Math.round(n * f) / f).replace(".", ",");
};
const shortDate = (key) =>
  parseKey(key).toLocaleDateString("es-ES", { day: "numeric", month: "short" });

// Apuntar un plato a mano, sin foto ni Gemini. Si el nombre coincide con un plato ya
// apuntado otro día, se rellenan sus macros y, al cambiar la ración, se recalculan.
export default function ManualDish({ onAdd, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [ref, setRef] = useState(null); // plato anterior del que salen los números
  const recent = useMemo(recentDishes, []);
  const nameRef = useRef(null);
  const listId = useId();

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

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

  // Los números rellenados siguen al nombre: si deja de coincidir, se vacían. Lo que
  // haya escrito la persona no se toca nunca.
  function onName(nombre) {
    const match = recent.find((d) => d.nombre.toLowerCase() === nombre.trim().toLowerCase());
    const untouched = ref || ["gramos", ...MACROS].every((k) => form[k] === "");
    if (match && untouched) {
      set({ nombre, gramos: match.gramos > 0 ? show(match.gramos, 0) : "", ...fromRecent(match) });
      setRef(match);
    } else if (ref) {
      setForm({ ...EMPTY, nombre });
      setRef(null);
    } else set({ nombre });
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

  const field = (key, label, placeholder, wide = false) => (
    <label className={wide ? "field wide" : "field"}>
      <span>{label}</span>
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
    </label>
  );

  return (
    <form className="card manual" onSubmit={add}>
      <div className="manual-head">
        <h3>Apuntar a mano</h3>
        <button type="button" className="icon" onClick={onClose} aria-label="Cerrar">
          <Icon name="close" />
        </button>
      </div>
      <p className="hint">
        Sin foto ni Gemini: escribe lo que sepas.
        {recent.length > 0 && " Si ya lo apuntaste otro día, empieza a escribir el nombre y elígelo."}
      </p>

      <div className="manual-grid">
        <label className="field wide">
          <span>Plato</span>
          <input
            ref={nameRef}
            type="text"
            list={listId}
            autoComplete="off"
            value={form.nombre}
            onChange={(e) => onName(e.target.value)}
            placeholder="Ej: Pechuga de pollo a la plancha"
          />
        </label>
        <datalist id={listId}>
          {recent.map((d) => (
            <option key={d.nombre} value={d.nombre}>
              {`${round(d.proteina_g)} g proteína · ${round(d.kcal)} kcal`}
            </option>
          ))}
        </datalist>

        {field("gramos", "Ración (g)", "Opcional")}
        {field("proteina_g", "Proteína (g)", "0")}
        {field("carbohidratos_g", "Carbohidratos (g)", "0")}
        {field("grasas_g", "Grasas (g)", "0")}
        {field(
          "kcal",
          "Kcal",
          autoKcal > 0 ? `${round(autoKcal)} (calculadas con los macros)` : "Opcional",
          true
        )}
      </div>

      <details className="manual-more" open={EXTRAS.some(({ key }) => form[key] !== "")}>
        <summary>Fibra, azúcares, grasas saturadas y sal (opcional)</summary>
        <div className="manual-grid">
          {EXTRAS.map(({ key, label }) => (
            <Fragment key={key}>{field(key, `${label} (g)`, "Opcional")}</Fragment>
          ))}
        </div>
      </details>

      {ref && (
        <p className="hint">
          Como el {shortDate(ref.date)}
          {ref.gramos > 0 && ": si cambias la ración, los macros se recalculan"}.
        </p>
      )}

      <button type="submit" className="btn full" disabled={!canAdd}>
        <Icon name="plus" />
        Añadir plato
      </button>
    </form>
  );
}
