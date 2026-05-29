/* =========================================================
   COUNTDOWN — upper-left widget with edit modal + 0-moment celebration
   ========================================================= */
(function() {
const { useState, useEffect, useRef, useMemo } = React;
const { Modal } = window;

const KEY = "caiah-countdowns";

const DEFAULT_EVENTS = [
  // suggested seeds — replace freely
  { id: "udel-move",   label: "move-in @ udel",      date: "2026-08-25", time: "",      emoji: "🏠", color: "var(--pink-deep)" },
  { id: "thx",         label: "thanksgiving home",   date: "2026-11-25", time: "",      emoji: "🦃", color: "var(--butter-deep)" },
  { id: "wb",          label: "winter break",        date: "2026-12-19", time: "",      emoji: "❄",  color: "var(--blue-deep)" },
];

function loadEvents() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // backfill missing time field
      return parsed.map(e => ({ ...e, time: e.time || "" }));
    }
  } catch (e) {}
  return DEFAULT_EVENTS;
}

// Returns { d, h, m, s, total, done } where total is ms until the date+time
function timeUntil(dateStr, timeStr) {
  const t = (timeStr && /^\d{2}:\d{2}/.test(timeStr)) ? timeStr : "00:00";
  // Treat date+time as local
  const target = new Date(`${dateStr}T${t}:00`).getTime();
  if (isNaN(target)) return { d: 0, h: 0, m: 0, s: 0, total: 0, done: true };
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, total: diff, done: true };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s, total: diff, done: false };
}

// Format display time like "2:30 pm" — empty string if no time set
function fmtTime(timeStr) {
  if (!timeStr || !/^\d{2}:\d{2}/.test(timeStr)) return "";
  const [hh, mm] = timeStr.split(":").map(Number);
  const ampm = hh < 12 ? "am" : "pm";
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2,"0")} ${ampm}`;
}

// =========================================================
// CELEBRATION — full-screen confetti + banner when a countdown hits 0
// =========================================================
function Celebration({ label, onDone }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const ctx = c.getContext("2d");
    const colors = ["#ff7b9e", "#a8d5e8", "#ffe89c", "#c7e8c7", "#d4c5e8", "#ff8a7a", "#ffcf4f"];
    const N = 220;
    const pieces = Array.from({ length: N }, () => ({
      x: Math.random() * c.width,
      y: -20 - Math.random() * c.height * 0.6,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      g: 0.08 + Math.random() * 0.06,
      drag: 0.995,
      color: colors[Math.floor(Math.random() * colors.length)],
      r: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.25,
      w: 8 + Math.random() * 8,
      h: 4 + Math.random() * 6,
      shape: Math.random() < 0.4 ? "circle" : "rect",
    }));
    let frame = 0;
    const TOTAL = 360; // ~6s at 60fps
    let rafId = null;

    const loop = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      pieces.forEach((p) => {
        p.vy += p.g;
        p.vx *= p.drag;
        p.x += p.vx + Math.sin((frame + p.r * 10) * 0.04) * 0.6;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.color;
        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      });
      frame++;
      if (frame < TOTAL) rafId = requestAnimationFrame(loop);
      else {
        ctx.clearRect(0, 0, c.width, c.height);
        onDone && onDone();
      }
    };
    rafId = requestAnimationFrame(loop);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, c.width, c.height);
    };
  }, [onDone]);

  return (
    <div className="celebration">
      <canvas ref={canvasRef} className="celebration-canvas"></canvas>
      <div className="celebration-banner">
        <div className="celebration-eyebrow">it's the day ✷</div>
        <div className="celebration-title">{label}</div>
        <div className="celebration-sub">today is the one</div>
        <button className="action-btn" onClick={onDone}>✓ amazing</button>
      </div>
    </div>
  );
}

// =========================================================
// EDIT MODAL — manage events
// =========================================================
const EMOJIS = ["🏠","🦃","❄","✿","✦","♥","★","☀","☂","🎉","🎂","✈","♪","✎","☕","☁"];

function CountdownEditor({ events, onChange, onClose }) {
  const [draft, setDraft] = useState({ label: "", date: "", time: "", emoji: "✦" });
  const [iconForId, setIconForId] = useState(null); // null | "draft" | event.id

  const addOrUpdate = () => {
    const label = draft.label.trim();
    if (!label || !draft.date) return;
    const id = Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    onChange([...events, {
      id,
      label,
      date: draft.date,
      time: draft.time || "",
      emoji: draft.emoji || "✦"
    }]);
    setDraft({ label: "", date: "", time: "", emoji: "✦" });
  };

  const remove = (id) => onChange(events.filter(e => e.id !== id));

  const updateField = (id, field, value) => {
    onChange(events.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  // Save a custom-icon image from the scissors editor
  const setIcon = (dataUrl) => {
    if (iconForId === "draft") {
      setDraft(d => ({ ...d, emoji: dataUrl }));
    } else if (iconForId) {
      updateField(iconForId, "emoji", dataUrl);
    }
    setIconForId(null);
  };

  const sorted = [...events].sort((a, b) => {
    const da = `${a.date}T${a.time || "00:00"}`;
    const db = `${b.date}T${b.time || "00:00"}`;
    return da.localeCompare(db);
  });

  const isImage = (v) => typeof v === "string" && v.startsWith("data:");

  const renderIcon = (v, size = 22) => {
    if (isImage(v)) {
      return <img src={v} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "1.5px solid var(--ink)" }} />;
    }
    return <span style={{ fontSize: size }}>{v}</span>;
  };

  return (
    <>
      <Modal
        onClose={onClose}
        title="countdowns"
        lead="days until the next big thing. add as many as you want — they cycle in the corner."
      >
        <div className="countdown-add">
          <div className="cd-emoji-pick">
            {EMOJIS.map(e => (
              <button
                key={e}
                className={`cd-emoji ${draft.emoji === e ? "on" : ""}`}
                onClick={() => setDraft(d => ({ ...d, emoji: e }))}
              >{e}</button>
            ))}
            {/* CUSTOM ICON FROM PHOTO */}
            <button
              className={`cd-emoji upload ${isImage(draft.emoji) ? "on has-image" : ""}`}
              onClick={() => setIconForId("draft")}
              title="make a sticker from a photo"
            >
              {isImage(draft.emoji)
                ? <img src={draft.emoji} alt="custom" />
                : <span>+</span>}
            </button>
          </div>
          <div className="cd-add-row">
            <input
              type="text"
              placeholder="what is it? (e.g. move-in day)"
              value={draft.label}
              onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
              maxLength={40}
            />
            <input
              type="date"
              value={draft.date}
              onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
              title="date"
            />
            <input
              type="time"
              value={draft.time}
              onChange={e => setDraft(d => ({ ...d, time: e.target.value }))}
              title="time (optional)"
              className="cd-time"
            />
            <button
              className="action-btn"
              onClick={addOrUpdate}
              disabled={!draft.label.trim() || !draft.date}
            >+ add</button>
          </div>
          <div className="cd-hint">
            ✶ time is optional — leave it blank for an all-day event.
          </div>
        </div>

        <div className="cd-list">
          {sorted.length === 0 && (
            <div style={{ textAlign: "center", padding: 24, fontFamily: "var(--font-hand)", fontSize: 22, color: "var(--ink-soft)" }}>
              nothing scheduled. add something to look forward to.
            </div>
          )}
          {sorted.map(ev => {
            const t = timeUntil(ev.date, ev.time);
            return (
              <div key={ev.id} className="cd-row">
                <button
                  className="cd-row-icon"
                  onClick={() => setIconForId(ev.id)}
                  title="change icon"
                >
                  {renderIcon(ev.emoji, 24)}
                </button>
                <input
                  className="cd-row-label"
                  value={ev.label}
                  onChange={e => updateField(ev.id, "label", e.target.value)}
                  maxLength={40}
                />
                <input
                  className="cd-row-date"
                  type="date"
                  value={ev.date}
                  onChange={e => updateField(ev.id, "date", e.target.value)}
                />
                <input
                  className="cd-row-date cd-time"
                  type="time"
                  value={ev.time || ""}
                  onChange={e => updateField(ev.id, "time", e.target.value)}
                  title="time (optional)"
                />
                <span className={`cd-row-count ${t.done ? "done" : ""}`}>
                  {t.done ? "today / past" : `${t.d}d`}
                </span>
                <button className="cd-row-del" onClick={() => remove(ev.id)} title="remove">✕</button>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Photo-to-sticker (uses the scissors editor) */}
      {iconForId && window.CutoutEditor && (
        <window.CutoutEditor
          onClose={() => setIconForId(null)}
          onSave={setIcon}
        />
      )}
    </>
  );
}

// =========================================================
// WIDGET — upper-left corner
// =========================================================
function CountdownWidget() {
  const [events, setEvents] = useState(loadEvents);
  const [editorOpen, setEditorOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [celebrating, setCelebrating] = useState(null);   // event currently celebrating
  const [tick, setTick] = useState(0);
  const celebratedRef = useRef(new Set(JSON.parse(localStorage.getItem("caiah-celebrated") || "[]")));

  // persist events
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(events)); } catch (e) {}
  }, [events]);

  // 1-second tick
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Show only future events (or today's)
  const upcoming = useMemo(() => {
    return events
      .filter(e => {
        const t = timeUntil(e.date, e.time);
        // Keep "today" visible for the day, then drop
        return t.total > -86400000;
      })
      .sort((a, b) => {
        const da = `${a.date}T${a.time || "00:00"}`;
        const db = `${b.date}T${b.time || "00:00"}`;
        return da.localeCompare(db);
      });
    // eslint-disable-next-line
  }, [events, tick]);

  // Clamp index
  useEffect(() => {
    if (idx >= upcoming.length) setIdx(0);
  }, [upcoming.length, idx]);

  // Cycle every 6 sec if there's more than one
  useEffect(() => {
    if (upcoming.length <= 1) return;
    const id = setInterval(() => setIdx(i => (i + 1) % upcoming.length), 6000);
    return () => clearInterval(id);
  }, [upcoming.length]);

  // === DETECT 0-MOMENT (countdown rolls into the event date) ===
  useEffect(() => {
    for (const ev of events) {
      const t = timeUntil(ev.date, ev.time);
      if (t.total <= 0 && t.total > -86400000) {
        // include time in the key so editing time triggers a fresh celebration
        const key = `${ev.id}::${ev.date}::${ev.time || ""}`;
        if (!celebratedRef.current.has(key)) {
          celebratedRef.current.add(key);
          try {
            localStorage.setItem("caiah-celebrated", JSON.stringify([...celebratedRef.current]));
          } catch (e) {}
          setCelebrating(ev);
          break;
        }
      }
    }
    // eslint-disable-next-line
  }, [tick, events]);

  const current = upcoming[idx];
  const t = current ? timeUntil(current.date, current.time) : null;

  // For the "<24h" mode, show h:m:s
  const showFinal = current && t && t.d === 0 && !t.done;
  const isImage = (v) => typeof v === "string" && v.startsWith("data:");

  return (
    <>
      <div className="countdown-widget" onClick={() => setEditorOpen(true)} title="tap to edit">
        {!current && (
          <div className="cd-empty">
            <span className="cd-empty-glyph">+</span>
            <div className="cd-empty-stack">
              <div className="cd-empty-title">add a countdown</div>
              <div className="cd-empty-sub">tap to start</div>
            </div>
          </div>
        )}
        {current && (
          <>
            <div className="cd-emoji-big">
              {isImage(current.emoji)
                ? <img src={current.emoji} alt="" className="cd-icon-img" />
                : current.emoji}
            </div>
            <div className="cd-stack">
              <div className="cd-label">{current.label}</div>
              {showFinal ? (
                <div className="cd-num final">
                  <span>{String(t.h).padStart(2,"0")}</span>:
                  <span>{String(t.m).padStart(2,"0")}</span>:
                  <span>{String(t.s).padStart(2,"0")}</span>
                </div>
              ) : (
                <div className="cd-num">
                  <span className="cd-d">{t.d}</span>
                  <span className="cd-d-l">day{t.d === 1 ? "" : "s"}</span>
                  {current.time && (
                    <span className="cd-d-time">· {fmtTime(current.time)}</span>
                  )}
                </div>
              )}
              {upcoming.length > 1 && (
                <div className="cd-dots">
                  {upcoming.map((_, i) => (
                    <span key={i} className={i === idx ? "on" : ""}></span>
                  ))}
                </div>
              )}
            </div>
            <div className="cd-edit-hint">tap to edit</div>
          </>
        )}
      </div>

      {editorOpen && (
        <CountdownEditor
          events={events}
          onChange={setEvents}
          onClose={() => setEditorOpen(false)}
        />
      )}

      {celebrating && (
        <Celebration
          label={celebrating.label}
          onDone={() => setCelebrating(null)}
        />
      )}
    </>
  );
}

Object.assign(window, { CountdownWidget });
})();
