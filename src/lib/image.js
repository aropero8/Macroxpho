// Reduce la foto antes de enviarla: menos tokens, menos datos y respuesta más rápida.
const MAX_SIDE = 1024;
const QUALITY = 0.85;

// Miniatura para el diario (se guarda en IndexedDB, ver thumbs.js).
const THUMB_SIDE = 200;
const THUMB_QUALITY = 0.6;

async function drawScaled(source, maxSide) {
  const bitmap = await createImageBitmap(source); // respeta la orientación EXIF
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas;
}

export async function prepareImage(file) {
  const canvas = await drawScaled(file, MAX_SIDE);
  const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
  return {
    previewUrl: dataUrl,
    mimeType: "image/jpeg",
    base64: dataUrl.split(",")[1],
  };
}

/** Devuelve un Blob JPEG de como máximo THUMB_SIDE px de lado. */
export async function makeThumbnail(source) {
  const canvas = await drawScaled(source, THUMB_SIDE);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo crear la miniatura."))),
      "image/jpeg",
      THUMB_QUALITY
    )
  );
}
