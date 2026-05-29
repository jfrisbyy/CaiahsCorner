/* =========================================================
   MEDIA — IndexedDB store for video blobs + helpers
   localStorage can't hold videos, so blobs live in IDB and
   we keep small metadata (poster, duration, id) in the feed/
   mailbox JSON. Used by feed.jsx and mailbox.jsx.
   ========================================================= */
(function () {
  const DB_NAME = "caiah-media";
  const STORE = "videos";
  const VERSION = 1;

  let _dbPromise = null;

  function openDB() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return _dbPromise;
  }

  // --- CRUD ---
  async function saveVideo(id, blob) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, id);
      tx.oncomplete = () => resolve(id);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async function getVideo(id) {
    if (!id) return null;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteVideo(id) {
    if (!id) return;
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) { /* swallow — best effort */ }
  }

  // Cache of id → object URL so repeated reads don't churn URLs
  const _urlCache = new Map();
  async function getVideoUrl(id) {
    if (!id) return null;
    if (_urlCache.has(id)) return _urlCache.get(id);
    const blob = await getVideo(id);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    _urlCache.set(id, url);
    return url;
  }
  function releaseVideoUrl(id) {
    const url = _urlCache.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      _urlCache.delete(id);
    }
  }

  // --- Poster frame + duration probe ---
  // Returns { poster: dataUrl, duration, w, h }
  async function videoPoster(file, { maxW = 720, quality = 0.72 } = {}) {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    try {
      // Wait for metadata so we know dimensions/duration
      await new Promise((resolve, reject) => {
        let done = false;
        const finish = (fn) => { if (done) return; done = true; fn(); };
        video.onloadedmetadata = () => finish(resolve);
        video.onerror = () => finish(() => reject(new Error("can't read video")));
        setTimeout(() => finish(() => reject(new Error("video metadata timeout"))), 8000);
      });

      // Seek a hair in to skip black frames
      const target = Math.min(0.15, (video.duration || 1) / 6);
      await new Promise((resolve) => {
        let done = false;
        const finish = () => { if (done) return; done = true; resolve(); };
        video.onseeked = finish;
        // Some browsers fire onloadeddata instead
        video.onloadeddata = () => { if (video.currentTime > 0) finish(); };
        try { video.currentTime = target; } catch (e) { finish(); }
        setTimeout(finish, 3000);
      });

      let w = video.videoWidth || 640;
      let h = video.videoHeight || 360;
      const scale = w > maxW ? maxW / w : 1;
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#f1eddf";
      ctx.fillRect(0, 0, cw, ch);
      try { ctx.drawImage(video, 0, 0, cw, ch); } catch (e) { /* fallback to placeholder bg */ }
      const poster = canvas.toDataURL("image/jpeg", quality);

      return {
        poster,
        duration: isFinite(video.duration) ? video.duration : 0,
        w: video.videoWidth || 0,
        h: video.videoHeight || 0,
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function formatDuration(s) {
    if (!s || !isFinite(s)) return "";
    const total = Math.round(s);
    const m = Math.floor(total / 60);
    const sec = total % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  window.Media = {
    saveVideo,
    getVideo,
    deleteVideo,
    getVideoUrl,
    releaseVideoUrl,
    videoPoster,
    formatDuration,
  };
})();
