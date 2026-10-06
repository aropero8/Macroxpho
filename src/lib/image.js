// Reduce la foto antes de enviarla: menos tokens, menos datos y respuesta más rápida.
const MAX_SIDE = 1024;
const QUALITY = 0.85;

export async function prepareImage(file) {
  const bitmap = await createImageBitmap(file); // respeta la orientación EXIF
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
  return {
    previewUrl: dataUrl,
    mimeType: "image/jpeg",
    base64: dataUrl.split(",")[1],
  };
}
