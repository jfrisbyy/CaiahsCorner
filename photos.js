/* =========================================================
   PHOTOS — shared image utility (resize → small data URL)
   Used by mailbox attachments and the keep-up-with-caiah feed.
   ========================================================= */
(function() {

// Read a File as a data URL.
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// Load a data URL into an Image element.
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Resize-and-compress a File → small JPEG data URL.
// Tries 0.85 quality at maxW first; if too big, drops quality.
async function resizePhoto(file, { maxW = 900, maxBytes = 280_000 } = {}) {
  if (!file) return null;
  if (!file.type || !file.type.startsWith("image/")) {
    throw new Error("not an image");
  }
  const src = await readFileAsDataURL(file);
  const img = await loadImage(src);
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  const scale = w > maxW ? maxW / w : 1;
  w = Math.round(w * scale);
  h = Math.round(h * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  let q = 0.85;
  let url = canvas.toDataURL("image/jpeg", q);
  while (url.length > maxBytes * 1.37 && q > 0.4) {
    q -= 0.1;
    url = canvas.toDataURL("image/jpeg", q);
  }
  return { dataUrl: url, w, h };
}

window.Photos = { readFileAsDataURL, loadImage, resizePhoto };
})();
