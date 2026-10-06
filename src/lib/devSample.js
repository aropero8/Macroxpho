// Comida de prueba para comprobar el guardado sin gastar llamadas a Gemini.
// Solo se usa en desarrollo (import.meta.env.DEV).
import { makeThumbnail } from "./image.js";

const SAMPLES = [
  { nombre: "Pechuga de pollo a la plancha", gramos: 150, kcal: 248, proteina_g: 46, carbohidratos_g: 0, grasas_g: 5 },
  { nombre: "Arroz blanco", gramos: 180, kcal: 234, proteina_g: 4, carbohidratos_g: 51, grasas_g: 1 },
  { nombre: "Yogur griego con nueces", gramos: 170, kcal: 260, proteina_g: 15, carbohidratos_g: 9, grasas_g: 18 },
  { nombre: "Tostada con aguacate y huevo", gramos: 160, kcal: 330, proteina_g: 14, carbohidratos_g: 26, grasas_g: 19 },
  { nombre: "Ensalada de atún", gramos: 250, kcal: 290, proteina_g: 28, carbohidratos_g: 10, grasas_g: 15 },
];

export function samplePlatos() {
  const n = 1 + Math.floor(Math.random() * 2);
  return [...SAMPLES]
    .sort(() => Math.random() - 0.5)
    .slice(0, n)
    .map((p) => ({ ...p, gramosBase: p.gramos }));
}

/** Miniatura de colorines generada con canvas, para probar IndexedDB. */
export async function sampleThumb() {
  const c = document.createElement("canvas");
  c.width = c.height = 400;
  const ctx = c.getContext("2d");
  ctx.fillStyle = `hsl(${Math.floor(Math.random() * 360)} 60% 45%)`;
  ctx.fillRect(0, 0, 400, 400);
  ctx.font = "220px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🍽️", 200, 215);
  return makeThumbnail(c);
}
