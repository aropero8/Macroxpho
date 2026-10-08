import { mealName, round } from "../lib/nutrition.js";
import Icon from "./Icon.jsx";
import Thumb from "./Thumb.jsx";

export default function MealSlot({ meal, readOnly, onAdd, onOpen }) {
  if (!meal) {
    return readOnly ? (
      <div className="slot empty">Sin registrar</div>
    ) : (
      <button className="slot empty" onClick={onAdd}>
        <Icon name="plus" />
        Añadir
      </button>
    );
  }

  return (
    <button className="slot filled" onClick={() => onOpen(meal)}>
      <Thumb id={meal.thumbId} />
      <span className="slot-info">
        <strong>{mealName(meal)}</strong>
        <small>
          {round(meal.totales.kcal)} kcal · {round(meal.totales.proteina_g)} g proteína
        </small>
      </span>
      <Icon name="next" className="chevron" />
    </button>
  );
}
