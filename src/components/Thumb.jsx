import { useEffect, useState } from "react";
import { getThumb } from "../lib/thumbs.js";

// Muestra la miniatura guardada en IndexedDB o, si no hay, un hueco con un icono.
export default function Thumb({ id, className = "" }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!id) return;
    let objectUrl = null;
    let cancelled = false;
    getThumb(id).then((blob) => {
      if (!blob || cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  return url ? (
    <img className={`thumb ${className}`} src={url} alt="" />
  ) : (
    <span className={`thumb empty ${className}`} aria-hidden="true">
      🍽️
    </span>
  );
}
