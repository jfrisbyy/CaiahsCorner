/* =========================================================
   COLLECTIONS — Stack / Album / Logbook
   Three custom-card subtypes that accept new entries over time.
   Each is still a `custom` layout item; entries live on the item:
     item.entries: [...]
   so they auto-persist via useLayout's localStorage.

   - Stack    : running pile of one-line sticky notes (+ optional mood emoji)
   - Album    : user-made polaroid grid (image url + caption)
   - Logbook  : date-stamped journal she controls (custom topic)

   Components exported:
     StackCard    AlbumCard    LogbookCard       (board previews)
     CollectionModal  (opens for any of the three; routes by type)
   ========================================================= */
/* global React */
(function () {
  const { useState, useEffect, useRef, useMemo } = React;
  const { Modal, PALETTE, TAPE_OPTS } = window;

  const MOODS = ["✨", "🌸", "💭", "🔥", "😂", "🥹", "😴", "💯"];

  const uid = (p = "e") =>
    `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function relTime(ts) {
    const d = (Date.now() - ts) / 1000;
    if (d < 60) return "just now";
    if (d < 3600) return `${Math.floor(d / 60)}m`;
    if (d < 86400) return `${Math.floor(d / 3600)}h`;
    if (d < 86400 * 7) return `${Math.floor(d / 86400)}d`;
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  function pillTint(i) {
    const tints = ["tint-pink", "tint-butter", "tint-mint", "tint-blue", "tint-lav", "tint-coral"];
    return tints[i % tints.length];
  }

  // =========================================================
  // STACK preview (board card) — last 2 stickies
  // =========================================================
  function StackCard({ item }) {
    const entries = Array.isArray(item.entries) ? item.entries : [];
    const palette = PALETTE.find((p) => p.key === item.color) || PALETTE[0];
    const tape = item.tape || "pink";
    const rot = typeof item.rot === "number" ? item.rot : 0;

    return (
      <div
        className="paper-card custom-card collection-card stack-card"
        style={{ background: palette.bg, transform: `rotate(${rot}deg)` }}
      >
        <div className={`tape ${tape} tl`}></div>
        <div className="coll-header">
          <div>
            <div className="cust-eyebrow">{item.eyebrow || "stack · running pile"}</div>
            <h2 className="cust-title">{item.title || "untitled stack"}</h2>
          </div>
          <div className="coll-count">
            {entries.length}
            <span>{entries.length === 1 ? "entry" : "entries"}</span>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="coll-empty">
            tap the <strong>+</strong> to start the pile. one line each.
          </div>
        ) : (
          <div className="stack-preview">
            {entries.slice(0, 2).map((e, i) => (
              <div
                key={e.id}
                className={`mini-sticky ${pillTint(i)}`}
                style={{ transform: `rotate(${i % 2 === 0 ? -1.4 : 1.6}deg)` }}
              >
                {e.mood && <span className="mini-mood">{e.mood}</span>}
                <span className="mini-text">{e.text}</span>
                <span className="mini-time">{relTime(e.ts)}</span>
              </div>
            ))}
            {entries.length > 2 && (
              <div className="coll-more-pill">+ {entries.length - 2} more</div>
            )}
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // ALBUM preview — 4 polaroid thumbnails
  // =========================================================
  function AlbumCard({ item }) {
    const entries = Array.isArray(item.entries) ? item.entries : [];
    const palette = PALETTE.find((p) => p.key === item.color) || PALETTE[0];
    const tape = item.tape || "pink";
    const rot = typeof item.rot === "number" ? item.rot : 0;

    return (
      <div
        className="paper-card custom-card collection-card album-card"
        style={{ background: palette.bg, transform: `rotate(${rot}deg)` }}
      >
        <div className={`tape ${tape} tr`}></div>
        <div className="coll-header">
          <div>
            <div className="cust-eyebrow">{item.eyebrow || "album · photos"}</div>
            <h2 className="cust-title">{item.title || "untitled album"}</h2>
          </div>
          <div className="coll-count">
            {entries.length}
            <span>{entries.length === 1 ? "photo" : "photos"}</span>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="coll-empty">
            tap the <strong>+</strong> to drop in your first photo.
          </div>
        ) : (
          <div className="album-preview">
            {entries.slice(0, 4).map((e, i) => (
              <div
                key={e.id}
                className={`polaroid mini ${pillTint(i)}`}
                style={{ transform: `rotate(${[-3, 2, -2, 3][i % 4]}deg)` }}
              >
                <div className="img-area">
                  {e.img ? (
                    <img src={e.img} alt={e.caption || ""} />
                  ) : (
                    <div className="ph-label">{e.caption || "no image"}</div>
                  )}
                </div>
                {e.caption && <div className="caption">{e.caption}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // LOGBOOK preview — last entry + streak + tiny heatmap
  // =========================================================
  function LogbookCard({ item }) {
    const entries = Array.isArray(item.entries) ? item.entries : [];
    const palette = PALETTE.find((p) => p.key === item.color) || PALETTE[0];
    const tape = item.tape || "mint";
    const rot = typeof item.rot === "number" ? item.rot : 0;

    // streak = consecutive days back from today with at least 1 entry
    const streak = useMemo(() => {
      const days = new Set(entries.map((e) => e.date));
      let s = 0;
      const d = new Date();
      while (true) {
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (days.has(k)) { s++; d.setDate(d.getDate() - 1); }
        else break;
      }
      return s;
    }, [entries]);

    // 21-day heatmap (most recent 3 weeks)
    const heatmap = useMemo(() => {
      const days = new Set(entries.map((e) => e.date));
      const out = [];
      const d = new Date();
      for (let i = 0; i < 21; i++) {
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        out.unshift(days.has(k));
        d.setDate(d.getDate() - 1);
      }
      return out;
    }, [entries]);

    const last = entries.length > 0 ? entries[0] : null;

    return (
      <div
        className="paper-card custom-card collection-card logbook-card"
        style={{ background: palette.bg, transform: `rotate(${rot}deg)` }}
      >
        <div className={`tape ${tape} tl`}></div>
        <div className="coll-header">
          <div>
            <div className="cust-eyebrow">{item.eyebrow || "logbook · daily-ish"}</div>
            <h2 className="cust-title">{item.title || "untitled log"}</h2>
          </div>
          <div className="logbook-streak">
            <div className="ls-num">{streak}</div>
            <div className="ls-label">streak</div>
          </div>
        </div>

        <div className="logbook-heat">
          {heatmap.map((on, i) => (
            <span key={i} className={`heat-cell ${on ? "on" : ""}`}></span>
          ))}
        </div>

        {entries.length === 0 ? (
          <div className="coll-empty">tap <strong>+</strong> to log today's first entry.</div>
        ) : (
          <div className="logbook-last">
            <div className="ll-date">{last.date} · {relTime(last.ts)}</div>
            <div className="ll-body">{last.body || "—"}</div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // ROW IN THE COLLECTION MODAL — for stack/logbook
  // =========================================================
  function EntryRow({ entry, type, onDelete }) {
    if (type === "stack") {
      return (
        <li className={`coll-entry stack-entry ${pillTint(entry._i || 0)}`}>
          {entry.mood && <span className="ce-mood">{entry.mood}</span>}
          <span className="ce-text">{entry.text}</span>
          <span className="ce-time">{relTime(entry.ts)}</span>
          <button className="ce-del" onClick={onDelete} title="delete">✕</button>
        </li>
      );
    }
    if (type === "logbook") {
      return (
        <li className="coll-entry log-entry">
          <div className="log-entry-head">
            <span className="log-entry-date">{entry.date}</span>
            <span className="log-entry-time">{relTime(entry.ts)}</span>
            <button className="ce-del" onClick={onDelete} title="delete">✕</button>
          </div>
          <div className="log-entry-body">{entry.body}</div>
        </li>
      );
    }
    return null;
  }

  // =========================================================
  // COLLECTION MODAL — opens for any of the three types
  // type = "stack" | "album" | "logbook"
  // =========================================================
  function CollectionModal({ item, onClose, onUpdate }) {
    const type = item.type;
    const entries = Array.isArray(item.entries) ? item.entries : [];

    // STACK state
    const [text, setText] = useState("");
    const [mood, setMood] = useState("");

    // ALBUM state
    const [img, setImg] = useState("");
    const [caption, setCaption] = useState("");

    // LOGBOOK state
    const [date, setDate] = useState(todayStr());
    const [body, setBody] = useState("");

    const fileRef = useRef(null);

    const addEntry = () => {
      let entry = null;
      if (type === "stack") {
        if (!text.trim()) return;
        entry = { id: uid("s"), text: text.trim(), mood, ts: Date.now() };
        setText("");
        setMood("");
      } else if (type === "album") {
        if (!img.trim()) return;
        entry = { id: uid("a"), img: img.trim(), caption: caption.trim(), ts: Date.now() };
        setImg("");
        setCaption("");
      } else if (type === "logbook") {
        if (!body.trim()) return;
        entry = { id: uid("l"), date, body: body.trim(), ts: Date.now() };
        setBody("");
      }
      if (entry) {
        onUpdate({ entries: [entry, ...entries] });
      }
    };

    const removeEntry = (id) => {
      onUpdate({ entries: entries.filter((e) => e.id !== id) });
    };

    // File→DataURL helper for the album
    const onFile = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setImg(String(reader.result || ""));
      reader.readAsDataURL(file);
    };

    const title = (item.title || `untitled ${type}`).trim() || `untitled ${type}`;
    const lead = {
      stack:   "a pile that grows. one line each. add it and forget about it.",
      album:   "drop in photos one at a time. captions optional.",
      logbook: "date-stamped notes you control. one a day builds a streak.",
    }[type];

    return (
      <Modal onClose={onClose} title={title} lead={lead}>
        <div className={`coll-modal coll-modal-${type}`}>
          {/* ADD AREA */}
          <div className="coll-add">
            {type === "stack" && (
              <>
                <div className="coll-add-row">
                  <input
                    type="text"
                    autoFocus
                    placeholder="add a one-liner…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addEntry()}
                  />
                  <button className="coll-add-btn" onClick={addEntry} disabled={!text.trim()}>
                    add
                  </button>
                </div>
                <div className="coll-mood-row">
                  <span className="cust-eyebrow">mood (optional)</span>
                  <div className="mood-pick">
                    {MOODS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`mood-chip ${mood === m ? "active" : ""}`}
                        onClick={() => setMood(mood === m ? "" : m)}
                      >{m}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {type === "album" && (
              <>
                <div className="coll-add-row">
                  <input
                    type="text"
                    placeholder="image url, or use file picker →"
                    value={img}
                    onChange={(e) => setImg(e.target.value)}
                  />
                  <button
                    type="button"
                    className="coll-add-file"
                    onClick={() => fileRef.current && fileRef.current.click()}
                    title="upload from device"
                  >📎</button>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileRef}
                    style={{ display: "none" }}
                    onChange={onFile}
                  />
                </div>
                <div className="coll-add-row">
                  <input
                    type="text"
                    placeholder="caption (optional)"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addEntry()}
                  />
                  <button className="coll-add-btn" onClick={addEntry} disabled={!img.trim()}>
                    add
                  </button>
                </div>
                {img && (
                  <div className="album-preview-pane">
                    <div className="cust-eyebrow">preview</div>
                    <div className="polaroid mini">
                      <div className="img-area"><img src={img} alt="" /></div>
                      {caption && <div className="caption">{caption}</div>}
                    </div>
                  </div>
                )}
              </>
            )}

            {type === "logbook" && (
              <>
                <div className="coll-add-row">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="coll-date"
                  />
                  <button className="coll-add-btn" onClick={addEntry} disabled={!body.trim()}>
                    log
                  </button>
                </div>
                <textarea
                  rows="3"
                  placeholder="what happened?"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                ></textarea>
              </>
            )}
          </div>

          {/* HISTORY */}
          <div className="coll-history">
            <div className="coll-history-head">
              <span className="cust-eyebrow">history · {entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
            </div>

            {entries.length === 0 ? (
              <div className="coll-empty big">nothing yet — add your first above.</div>
            ) : type === "album" ? (
              <div className="album-grid">
                {entries.map((e, i) => (
                  <div
                    key={e.id}
                    className={`polaroid mini ${pillTint(i)}`}
                    style={{ transform: `rotate(${[-3, 2, -2, 3, -1, 1][i % 6]}deg)` }}
                  >
                    <div className="img-area">
                      {e.img ? <img src={e.img} alt={e.caption || ""} /> : <div className="ph-label">no image</div>}
                    </div>
                    {e.caption && <div className="caption">{e.caption}</div>}
                    <button className="ce-del polaroid-del" onClick={() => removeEntry(e.id)} title="delete">✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="coll-list">
                {entries.map((e, i) => (
                  <EntryRow
                    key={e.id}
                    entry={{ ...e, _i: i }}
                    type={type}
                    onDelete={() => removeEntry(e.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>
    );
  }

  Object.assign(window, {
    StackCard,
    AlbumCard,
    LogbookCard,
    CollectionModal,
    COLLECTION_TYPES: ["stack", "album", "logbook"],
  });
})();
