// Fechas con la hora LOCAL del dispositivo. No usar toISOString() para las claves:
// devuelve UTC y, por ejemplo, a las 00:30 en España daría el día anterior.
const pad = (n) => String(n).padStart(2, "0");

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  return dateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

// Lunes de la semana de `key` (semana de lunes a domingo).
export function weekStart(key) {
  return addDays(key, -((parseKey(key).getDay() + 6) % 7));
}

export function monthStart(key) {
  return `${key.slice(0, 8)}01`;
}

// "29 sept – 5 oct 2026" o "5 – 11 oct 2026"
export function formatRange(from, to) {
  const a = parseKey(from);
  const b = parseKey(to);
  const left =
    a.getMonth() === b.getMonth()
      ? a.getDate()
      : a.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const right = b.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  return `${left} – ${right}`;
}

// "Lunes, 6 de octubre"
export function formatLong(key) {
  const s = parseKey(key).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// "Octubre de 2026" (m empieza en 0, como en Date)
export function formatMonth(y, m) {
  const s = new Date(y, m, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h >= 6 && h < 12) return { hello: "Buenos días", question: "¿Qué te apetece comer hoy?" };
  if (h >= 12 && h < 16) return { hello: "Buenas tardes", question: "¿Qué hay hoy para comer?" };
  if (h >= 16 && h < 20) return { hello: "Buenas tardes", question: "¿Te apetece merendar algo?" };
  if (h >= 20) return { hello: "Buenas noches", question: "¿Qué hay para cenar hoy?" };
  return { hello: "Buenas noches", question: "¿Algo de picar antes de dormir?" };
}
