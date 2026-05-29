/* global React */
/* =========================================================
   CUTOUTS — virtual scissors, draggable photo stickers
   ========================================================= */
(function() {
const { useState, useEffect, useRef, useCallback } = React;
const { Modal } = window;

const STORAGE_KEY = "caiah-cutouts";
const MAX_CUTOUTS = 40;

// =========================================================
// CUTOUT EDITOR — upload, lasso-cut
// =========================================================
function CutoutEditor({ onClose, onSave }) {
  const [imgEl, setImgEl] = useState(null);
  const [path, setPath] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const canvasRef = useRef(null);
  const fileRef = useRef(null);

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Downscale large images
        const max = 1400;
        let w = img.width, h = img.height;
        if (w > max || h > max) {
          const s = max / Math.max(w, h);
          w = Math.round(w * s); h = Math.round(h * s);
          const tmp = document.createElement("canvas");
          tmp.width = w; tmp.height = h;
          tmp.getContext("2d").drawImage(img, 0, 0, w, h);
          const resized = new Image();
          resized.onload = () => {
            setImgEl(resized);
            setPath([]);
            setPreview(null);
          };
          resized.src = tmp.toDataURL("image/jpeg", 0.88);
        } else {
          setImgEl(img);
          setPath([]);
          setPreview(null);
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(f);
  };

  // Set canvas size when image loads
  useEffect(() => {
    if (!imgEl) return;
    const maxW = 560;
    const maxH = 420;
    const s = Math.min(maxW / imgEl.width, maxH / imgEl.height, 1);
    setCanvasSize({ w: imgEl.width * s, h: imgEl.height * s });
  }, [imgEl]);

  // Redraw canvas
  useEffect(() => {
    if (!imgEl || !canvasRef.current || !canvasSize.w) return;
    const c = canvasRef.current;
    c.width = canvasSize.w;
    c.height = canvasSize.h;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(imgEl, 0, 0, c.width, c.height);

    if (path.length > 1) {
      // dim outside
      if (!drawing && path.length >= 3) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, c.width, c.height);
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = path.length - 1; i >= 0; i--) ctx.lineTo(path[i].x, path[i].y);
        ctx.closePath();
        ctx.fillStyle = "rgba(42, 32, 24, 0.55)";
        ctx.fill("evenodd");
        ctx.restore();
      }
      // stroke path
      ctx.save();
      ctx.beginPath();
      path.forEach((p, i) => { i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
      if (!drawing) ctx.closePath();
      ctx.strokeStyle = "#ff7b9e";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 5]);
      ctx.stroke();
      ctx.restore();
    }
  }, [path, imgEl, drawing, canvasSize]);

  const getPos = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const t = e.touches && e.touches[0];
    const cx = t ? t.clientX : e.clientX;
    const cy = t ? t.clientY : e.clientY;
    return { x: cx - r.left, y: cy - r.top };
  };

  const start = (e) => {
    e.preventDefault();
    setPreview(null);
    setPath([getPos(e)]);
    setDrawing(true);
  };
  const move = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const p = getPos(e);
    setPath((cur) => {
      const last = cur[cur.length - 1];
      if (last && Math.hypot(p.x - last.x, p.y - last.y) < 3) return cur;
      return [...cur, p];
    });
  };
  const end = (e) => {
    if (!drawing) return;
    if (e) e.preventDefault();
    setDrawing(false);
    if (path.length < 3) return;
    generateCutout();
  };

  const generateCutout = () => {
    if (!imgEl || path.length < 3) return;
    // Scale path coords back to image space
    const sx = imgEl.width / canvasSize.w;
    const sy = imgEl.height / canvasSize.h;
    const ipath = path.map((p) => ({ x: p.x * sx, y: p.y * sy }));

    // Bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ipath.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
    const pad = 14;
    const w = Math.ceil(maxX - minX + pad * 2);
    const h = Math.ceil(maxY - minY + pad * 2);
    const off = { x: -minX + pad, y: -minY + pad };

    // Create output canvas
    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    const ctx = out.getContext("2d");

    // 1. Draw a wider white "paper border" — stroke path thick white + fill white
    ctx.save();
    ctx.beginPath();
    ipath.forEach((p, i) => {
      const x = p.x + off.x, y = p.y + off.y;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "white";
    // expand: stroke big then fill
    ctx.lineWidth = pad * 1.6;
    ctx.strokeStyle = "white";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.fill();
    ctx.restore();

    // 2. Drop shadow inside (subtle)
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ipath.forEach((p, i) => {
      const x = p.x + off.x, y = p.y + off.y;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = "rgba(0,0,0,0)";
    ctx.stroke();
    ctx.restore();

    // 3. Clip + draw image
    ctx.save();
    ctx.beginPath();
    ipath.forEach((p, i) => {
      const x = p.x + off.x, y = p.y + off.y;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(imgEl, off.x, off.y);
    ctx.restore();

    setPreview(out.toDataURL("image/png"));
  };

  const useIt = () => {
    if (!preview) return;
    onSave(preview);
    onClose();
  };
  const redo = () => {
    setPath([]);
    setPreview(null);
  };

  return (
    <Modal
      onClose={onClose}
      title="virtual scissors"
      lead={imgEl ? "drag a loop around the part you want to keep. release to cut." : "step 1 — drop a photo in."}
    >
      {!imgEl && (
        <div
          className="dropzone"
          onClick={() => fileRef.current && fileRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("over"); }}
          onDragLeave={(e) => e.currentTarget.classList.remove("over")}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("over");
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              onFile({ target: { files: e.dataTransfer.files } });
            }
          }}
        >
          <div style={{ fontFamily: "var(--font-hand)", fontSize: 48, color: "var(--ink-soft)" }}>✂</div>
          <div style={{ fontFamily: "var(--font-hand)", fontSize: 28, marginTop: 6 }}>drop a photo here</div>
          <div style={{ fontFamily: "var(--font-print)", fontSize: 15, color: "var(--ink-soft)", marginTop: 4 }}>or click to browse · jpg / png</div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            style={{ display: "none" }}
          />
        </div>
      )}

      {imgEl && (
        <div className="scissor-stage">
          <div className="canvas-wrap" style={{ width: canvasSize.w, height: canvasSize.h }}>
            <canvas
              ref={canvasRef}
              className="scissor-canvas"
              onMouseDown={start}
              onMouseMove={move}
              onMouseUp={end}
              onMouseLeave={(e) => drawing && end(e)}
              onTouchStart={start}
              onTouchMove={move}
              onTouchEnd={end}
            />
            {preview && (
              <div className="preview-overlay">
                <img src={preview} alt="cut preview" />
              </div>
            )}
          </div>
          <div className="scissor-tools">
            <button className="ghost-btn" onClick={() => fileRef.current && fileRef.current.click()}>↺ new photo</button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
            {path.length > 0 && !preview && <button className="ghost-btn" onClick={redo}>clear path</button>}
            {preview && <button className="ghost-btn" onClick={redo}>cut again</button>}
            {preview && <button className="action-btn" onClick={useIt}>✓ stick it on</button>}
          </div>
          {!preview && (
            <div className="scissor-hint">
              ✂ tip: hold and drag to draw a loop. release to cut. wobbly is cute.
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// =========================================================
// STICKER PALETTE — pre-made cutouts to stamp
// =========================================================
const STICKER_LIBRARY = [
  { id: "heart", emoji: "♥", color: "#ff7b9e", label: "heart" },
  { id: "star", emoji: "★", color: "#ffcf4f", label: "star" },
  { id: "flower", emoji: "✿", color: "#ff7b9e", label: "flower" },
  { id: "sparkle", emoji: "✦", color: "#a98fd8", label: "sparkle" },
  { id: "smile", emoji: "ᗒᴥᗕ", color: "#2a2018", label: "smile" },
  { id: "bow", emoji: "♡", color: "#ff7b9e", label: "lil heart" },
  { id: "music", emoji: "♪", color: "#6fb3d0", label: "note" },
  { id: "peach", emoji: "✸", color: "#ff8a7a", label: "burst" },
  { id: "kiss", emoji: "ᰔ", color: "#ff7b9e", label: "kiss" },
];

function StickerPalette({ onPick, onClose }) {
  return (
    <Modal onClose={onClose} title="sticker drawer" lead="stamp a doodle anywhere. click again to drop more.">
      <div className="sticker-palette">
        {STICKER_LIBRARY.map((s) => (
          <button
            key={s.id}
            className="sticker-pick"
            onClick={() => { onPick(s); onClose(); }}
            style={{ color: s.color }}
            title={s.label}
          >
            <span className="glyph" style={{ color: s.color }}>{s.emoji}</span>
            <span className="lbl">{s.label}</span>
          </button>
        ))}
      </div>
      <p style={{ fontFamily: "var(--font-print)", fontSize: 14, color: "var(--ink-soft)", marginTop: 16, textAlign: "center" }}>
        ✶ pick a sticker, then click anywhere on the page to stamp it.
      </p>
    </Modal>
  );
}

// =========================================================
// CUTOUT — single draggable / rotatable / scalable item
// =========================================================
function CutoutItem({ data, editMode, selected, onSelect, onChange, onDelete, onForward, onBackward, onBeforeChange }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(null);
  const [handleDrag, setHandleDrag] = useState(null);

  // === MOVE (drag the body of the cutout) ===
  const onMouseDown = (e) => {
    if (!editMode) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect(data.id);
    onBeforeChange && onBeforeChange();
    const t = e.touches && e.touches[0];
    const sx = t ? t.pageX : e.pageX;
    const sy = t ? t.pageY : e.pageY;
    setDrag({ startX: sx, startY: sy, origX: data.x, origY: data.y });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      const t = e.touches && e.touches[0];
      const cx = t ? t.pageX : e.pageX;
      const cy = t ? t.pageY : e.pageY;
      onChange(data.id, {
        x: drag.origX + (cx - drag.startX),
        y: drag.origY + (cy - drag.startY),
      });
    };
    const onUp = () => setDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [drag, data.id, onChange]);

  // === HANDLE-BASED RESIZE / ROTATE ===
  const startHandle = (type, e) => {
    e.stopPropagation();
    e.preventDefault();
    onBeforeChange && onBeforeChange();
    const t = e.touches && e.touches[0];
    const mx = t ? t.pageX : e.pageX;
    const my = t ? t.pageY : e.pageY;
    const dx = mx - data.x;
    const dy = my - data.y;
    setHandleDrag({
      type,
      startDist: Math.hypot(dx, dy) || 1,
      startAngle: Math.atan2(dy, dx) * 180 / Math.PI,
      startScale: data.scale || 1,
      startRotation: data.rotation || 0,
    });
  };

  useEffect(() => {
    if (!handleDrag) return;
    const onMove = (e) => {
      const t = e.touches && e.touches[0];
      const mx = t ? t.pageX : e.pageX;
      const my = t ? t.pageY : e.pageY;
      const dx = mx - data.x;
      const dy = my - data.y;
      if (handleDrag.type === "rotate") {
        const curAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        onChange(data.id, { rotation: handleDrag.startRotation + (curAngle - handleDrag.startAngle) });
      } else {
        const curDist = Math.hypot(dx, dy);
        const ratio = curDist / handleDrag.startDist;
        const newScale = Math.max(0.2, Math.min(4, handleDrag.startScale * ratio));
        onChange(data.id, { scale: newScale });
      }
    };
    const onUp = () => setHandleDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [handleDrag, data.id, data.x, data.y, onChange]);

  const isSticker = data.kind === "sticker";
  const baseSize = isSticker ? 70 : 200;
  const scale = data.scale || 1;

  const style = {
    position: "absolute",
    left: data.x,
    top: data.y,
    transform: `translate(-50%, -50%) rotate(${data.rotation || 0}deg) scale(${scale})`,
    cursor: editMode ? "grab" : "default",
    userSelect: "none",
    touchAction: "none",
    zIndex: selected ? 9999 : (data.z || 100),
    transition: (drag || handleDrag) ? "none" : "filter 0.15s ease",
    width: isSticker ? baseSize : "auto",
    height: isSticker ? baseSize : "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "--c-scale": scale,
  };

  return (
    <div
      ref={ref}
      className={`cutout ${editMode ? "edit" : ""} ${selected ? "selected" : ""}`}
      style={style}
      onMouseDown={onMouseDown}
      onTouchStart={onMouseDown}
    >
      {data.kind === "photo" && (
        <img
          src={data.src}
          alt="cutout"
          draggable={false}
          style={{ maxWidth: 320, maxHeight: 320, display: "block", pointerEvents: "none" }}
        />
      )}
      {data.kind === "sticker" && (
        <span style={{
          fontSize: 64,
          color: data.color,
          textShadow: "2px 3px 0 rgba(42,32,24,0.18)",
          fontFamily: "var(--font-hand)",
          lineHeight: 1,
          pointerEvents: "none",
        }}>{data.emoji}</span>
      )}

      {editMode && selected && (
        <>
          {/* RESIZE HANDLES — all 4 corners */}
          <div className="resize-h tl" onMouseDown={(e) => startHandle("resize", e)} onTouchStart={(e) => startHandle("resize", e)} title="drag to resize"></div>
          <div className="resize-h tr" onMouseDown={(e) => startHandle("resize", e)} onTouchStart={(e) => startHandle("resize", e)} title="drag to resize"></div>
          <div className="resize-h bl" onMouseDown={(e) => startHandle("resize", e)} onTouchStart={(e) => startHandle("resize", e)} title="drag to resize"></div>
          <div className="resize-h br" onMouseDown={(e) => startHandle("resize", e)} onTouchStart={(e) => startHandle("resize", e)} title="drag to resize"></div>

          {/* ROTATION HANDLE — top center */}
          <div className="rotate-h-stem" aria-hidden="true"></div>
          <div className="rotate-h" onMouseDown={(e) => startHandle("rotate", e)} onTouchStart={(e) => startHandle("rotate", e)} title="drag to rotate">
            <span>↻</span>
          </div>

          {/* TOOLBAR — only layer-ordering + delete */}
          <div className="cutout-toolbar" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <button onClick={(e) => { e.stopPropagation(); onForward(data.id); }} title="bring forward">▲</button>
            <button onClick={(e) => { e.stopPropagation(); onBackward(data.id); }} title="send backward">▼</button>
            <button className="danger" onClick={(e) => { e.stopPropagation(); onDelete(data.id); }} title="delete">✕</button>
          </div>
        </>
      )}
    </div>
  );
}

// =========================================================
// CUTOUT LAYER (entire layer of cutouts + toolbar)
// =========================================================
function CutoutLayer() {
  const [cutouts, setCutouts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [pendingSticker, setPendingSticker] = useState(null);
  const [warn, setWarn] = useState(null);
  const [history, setHistory] = useState([]);          // ← undo stack
  const cutoutsRef = useRef(cutouts);
  useEffect(() => { cutoutsRef.current = cutouts; }, [cutouts]);

  // Persist
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cutouts)); }
    catch (e) {
      setWarn("storage full — try removing some cutouts.");
      setTimeout(() => setWarn(null), 3000);
    }
  }, [cutouts]);

  // Broadcast edit mode to the rest of the app
  useEffect(() => {
    document.body.classList.toggle("decorate-mode", editMode);
    window.dispatchEvent(new CustomEvent("decorate-mode", { detail: editMode }));
  }, [editMode]);

  // === UNDO HISTORY ===
  const pushHistory = useCallback(() => {
    setHistory((h) => {
      const next = [...h, cutoutsRef.current];
      // cap at 30 entries to avoid runaway storage
      return next.slice(-30);
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setCutouts(prev);
      setSelected(null);
      setPendingSticker(null);
      return h.slice(0, -1);
    });
  }, []);

  // Z helpers
  const maxZ = () => cutouts.reduce((m, c) => Math.max(m, c.z || 100), 100);
  const minZ = () => cutouts.reduce((m, c) => Math.min(m, c.z || 100), 100);

  const addPhoto = (src) => {
    if (cutouts.length >= MAX_CUTOUTS) {
      setWarn(`max ${MAX_CUTOUTS} cutouts — delete some first.`);
      setTimeout(() => setWarn(null), 3000);
      return;
    }
    pushHistory();
    const id = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    const newC = {
      id,
      kind: "photo",
      src,
      // Document coords — center in current viewport but anchored to page
      x: window.scrollX + window.innerWidth / 2 + (Math.random() - 0.5) * 60,
      y: window.scrollY + window.innerHeight / 2 + (Math.random() - 0.5) * 60,
      rotation: (Math.random() - 0.5) * 12,
      scale: 1,
      z: maxZ() + 1,
    };
    setCutouts((cs) => [...cs, newC]);
    setSelected(id);
    setEditMode(true);
  };

  const startSticker = (s) => {
    setPendingSticker(s);
    setSelected(null);
    setEditMode(true);
  };

  const openEditor = () => {
    setPendingSticker(null);
    setSelected(null);
    setEditorOpen(true);
  };
  const openPalette = () => {
    setPendingSticker(null);
    setPaletteOpen(true);
  };

  const onChange = (id, patch) => {
    setCutouts((cs) => cs.map((c) => c.id === id ? { ...c, ...patch } : c));
  };
  const onDelete = (id) => {
    pushHistory();
    setCutouts((cs) => cs.filter((c) => c.id !== id));
    setSelected(null);
  };
  const onForward = (id) => {
    pushHistory();
    const nz = maxZ() + 1;
    setCutouts((cs) => cs.map((c) => c.id === id ? { ...c, z: nz } : c));
  };
  const onBackward = (id) => {
    pushHistory();
    const nz = minZ() - 1;
    setCutouts((cs) => cs.map((c) => c.id === id ? { ...c, z: nz } : c));
  };

  // Global click handler: stamp pending sticker OR deselect on background click
  useEffect(() => {
    if (!editMode) return;
    const onClick = (e) => {
      const onChrome = e.target && e.target.closest && (
        e.target.closest(".decorate-toolbar") ||
        e.target.closest(".pending-bar") ||
        e.target.closest(".modal") ||
        e.target.closest(".modal-backdrop") ||
        e.target.closest(".cutout-toolbar") ||
        e.target.closest(".player") ||
        e.target.closest(".cutout")
      );
      if (onChrome) return;

      if (pendingSticker) {
        if (cutouts.length >= MAX_CUTOUTS) {
          setWarn(`max ${MAX_CUTOUTS} cutouts.`);
          setTimeout(() => setWarn(null), 3000);
          return;
        }
        pushHistory();
        const id = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
        const c = {
          id,
          kind: "sticker",
          emoji: pendingSticker.emoji,
          color: pendingSticker.color,
          // Document coords — page-relative so they scroll with content
          x: e.pageX,
          y: e.pageY,
          rotation: (Math.random() - 0.5) * 30,
          scale: 1,
          z: maxZ() + 1,
        };
        setCutouts((cs) => [...cs, c]);
        return;
      }
      // Click on background w/o pending sticker → deselect
      setSelected(null);
    };
    const onKey = (e) => {
      // Cmd/Ctrl + Z → undo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if (e.key === "Escape") {
        setPendingSticker(null);
        setSelected(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        if (document.activeElement && document.activeElement.tagName === "INPUT") return;
        onDelete(selected);
      }
    };
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [pendingSticker, editMode, cutouts, selected, undo, pushHistory]);

  const clearAll = () => {
    if (confirm("clear ALL decorations? you can still undo this.")) {
      pushHistory();
      setCutouts([]);
      setSelected(null);
      setPendingSticker(null);
    }
  };

  return (
    <>
      {/* DECORATE-MODE TOOLBAR */}
      <div className={`decorate-toolbar ${editMode ? "open" : ""}`}>
        <button
          className={`decorate-toggle ${editMode ? "on" : ""}`}
          onClick={() => { setEditMode((e) => !e); setSelected(null); setPendingSticker(null); }}
          title={editMode ? "exit decorate mode" : "decorate mode"}
        >
          <span className="ico">✂</span>
          <span className="lbl">{editMode ? "done" : "decorate"}</span>
        </button>
        {editMode && (
          <>
            <button className="tool-btn" onClick={openEditor}>
              <span className="ico">+</span>
              <span>add photo</span>
            </button>
            <button className="tool-btn" onClick={openPalette}>
              <span className="ico">✦</span>
              <span>stickers</span>
            </button>
            <button
              className="tool-btn"
              onClick={undo}
              disabled={history.length === 0}
              title={`undo (${history.length})`}
            >
              <span className="ico">↶</span>
              <span>undo</span>
            </button>
            <button className="tool-btn warn" onClick={clearAll}>
              <span className="ico">⌫</span>
              <span>clear</span>
            </button>
            <span className="tool-divider" aria-hidden></span>
            <button
              className="tool-btn"
              onClick={() => {
                setEditMode(false);
                setSelected(null);
                setPendingSticker(null);
                window.dispatchEvent(new CustomEvent("request-edit-page"));
              }}
              title="rearrange cards and add new ones"
            >
              <span className="ico">✎</span>
              <span>edit page</span>
            </button>
            <span className="count">{cutouts.length} / {MAX_CUTOUTS}</span>
          </>
        )}
      </div>

      {warn && <div className="cutout-warn">{warn}</div>}

      {pendingSticker && editMode && (
        <PendingCursor sticker={pendingSticker} onCancel={() => setPendingSticker(null)} />
      )}

      <div className="cutout-layer">
        {cutouts.map((c) => (
          <CutoutItem
            key={c.id}
            data={c}
            editMode={editMode}
            selected={selected === c.id}
            onSelect={setSelected}
            onChange={onChange}
            onDelete={onDelete}
            onForward={onForward}
            onBackward={onBackward}
            onBeforeChange={pushHistory}
          />
        ))}
      </div>

      {editorOpen && (
        <CutoutEditor onClose={() => setEditorOpen(false)} onSave={addPhoto} />
      )}
      {paletteOpen && (
        <StickerPalette onClose={() => setPaletteOpen(false)} onPick={startSticker} />
      )}

      {editMode && cutouts.length === 0 && !pendingSticker && !editorOpen && !paletteOpen && (
        <div className="empty-hint">
          <div style={{ fontSize: 40, marginBottom: 6 }}>✂</div>
          <div style={{ fontFamily: "var(--font-hand)", fontSize: 26 }}>start by adding a photo or sticker!</div>
          <div style={{ fontFamily: "var(--font-print)", fontSize: 14, color: "var(--ink-soft)", marginTop: 4 }}>
            (the rest of the page is locked while decorating)
          </div>
        </div>
      )}
    </>
  );
}

// =========================================================
// PENDING STICKER (follows cursor until clicked)
// =========================================================
function PendingCursor({ sticker, onCancel }) {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  useEffect(() => {
    const onMove = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  return (
    <>
      <div
        className="pending-cursor"
        style={{ left: pos.x, top: pos.y, color: sticker.color }}
      >
        {sticker.emoji}
      </div>
      <div className="pending-bar">
        stamping <strong>{sticker.label}</strong> · click to place · press <kbd>esc</kbd> to stop
        <button onClick={onCancel}>done</button>
      </div>
    </>
  );
}

Object.assign(window, { CutoutLayer, CutoutEditor });
})();
