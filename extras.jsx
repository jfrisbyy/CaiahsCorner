/* =========================================================
   EXTRAS — Daily Scrap (journal) + Wishlist
   ========================================================= */
(function () {
  const { useState, useEffect, useMemo, useRef } = React;
  const { Modal } = window;

  // =========================================================
  // DATE HELPERS
  // =========================================================
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const fmtDate = (key) => {
    const d = new Date(key + "T00:00:00");
    const m = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"][d.getMonth()];
    const day = d.getDate();
    return `${m} ${day}`;
  };
  const fmtDateLong = (key) => {
    const d = new Date(key + "T00:00:00");
    const wk = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][d.getDay()];
    const m = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"][d.getMonth()];
    return `${wk}, ${m} ${d.getDate()}`;
  };

  // =========================================================
  // JOURNAL — "the daily scrap"
  // =========================================================
  const JOURNAL_KEY = "caiah-journal";

  const MOODS = [
  { id: "great", emoji: "✨", label: "great", color: "var(--butter-deep)" },
  { id: "happy", emoji: "☀", label: "happy", color: "var(--pink-deep)" },
  { id: "loved", emoji: "♥", label: "loved", color: "var(--pink-deep)" },
  { id: "proud", emoji: "★", label: "proud", color: "var(--mint-deep)" },
  { id: "meh", emoji: "☁", label: "meh", color: "var(--blue-deep)" },
  { id: "tired", emoji: "☕", label: "tired", color: "var(--lavender-deep)" },
  { id: "stressed", emoji: "▲", label: "stressed", color: "var(--coral)" },
  { id: "rough", emoji: "☂", label: "rough", color: "var(--ink-soft)" }];


  function loadJournal() {
    try {
      const saved = localStorage.getItem(JOURNAL_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  }

  function calcStreak(entries) {
    if (!entries.length) return { current: 0, longest: 0, total: 0 };
    const dates = new Set(entries.map((e) => e.date));
    let current = 0;
    const d = new Date();
    while (dates.has(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)) {
      current++;
      d.setDate(d.getDate() - 1);
    }
    const sorted = [...dates].sort();
    let longest = 0,run = 0,prev = null;
    for (const date of sorted) {
      const cur = new Date(date + "T00:00:00");
      if (prev) {
        const diff = Math.round((cur - prev) / 86400000);
        run = diff === 1 ? run + 1 : 1;
      } else run = 1;
      longest = Math.max(longest, run);
      prev = cur;
    }
    return { current, longest, total: entries.length };
  }

  function JournalModal({ onClose }) {
    const [entries, setEntries] = useState(loadJournal);
    const today = todayKey();
    const todayEntry = entries.find((e) => e.date === today);
    const [text, setText] = useState(todayEntry ? todayEntry.text : "");
    const [mood, setMood] = useState(todayEntry ? todayEntry.mood : "happy");
    const [view, setView] = useState("today"); // "today" | "past"
    const sortedDesc = useMemo(
      () => [...entries].sort((a, b) => b.date.localeCompare(a.date)),
      [entries]
    );
    const [pastIdx, setPastIdx] = useState(0);

    // persist
    useEffect(() => {
      try {localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));} catch (e) {}
    }, [entries]);

    // auto-save today's entry on text/mood change
    useEffect(() => {
      if (view !== "today") return;
      const trimmed = text.trim();
      setEntries((prev) => {
        const without = prev.filter((e) => e.date !== today);
        if (!trimmed) return without;
        return [...without, { date: today, mood, text: trimmed }].sort((a, b) => a.date.localeCompare(b.date));
      });
      // eslint-disable-next-line
    }, [text, mood]);

    const streak = calcStreak(entries);
    const currentMood = MOODS.find((m) => m.id === mood) || MOODS[0];

    const pastEntry = sortedDesc[pastIdx];
    const pastMood = pastEntry ? MOODS.find((m) => m.id === pastEntry.mood) || MOODS[0] : null;

    const deletePast = () => {
      if (!pastEntry) return;
      if (!confirm(`delete entry for ${fmtDateLong(pastEntry.date)}?`)) return;
      setEntries((prev) => prev.filter((e) => e.date !== pastEntry.date));
      setPastIdx((i) => Math.max(0, i - 1));
    };

    return (
      <Modal
        onClose={onClose}
        title="the daily scrap"
        lead={view === "today" ?
        "a torn page. for today. write whatever — one line is fine." :
        `you've journaled ${streak.total} day${streak.total === 1 ? "" : "s"}. here's the pile.`}>
        
      {/* MODE TABS */}
      <div className="journal-tabs">
        <button
            className={`journal-tab ${view === "today" ? "on" : ""}`}
            onClick={() => setView("today")}>
            today</button>
        <button
            className={`journal-tab ${view === "past" ? "on" : ""}`}
            onClick={() => {setView("past");setPastIdx(0);}}
            disabled={sortedDesc.length === 0}>
            past pages ({sortedDesc.length})</button>
      </div>

      {/* STREAK STRIP */}
      <div className="streak-strip">
        <div className="streak-cell">
          <div className="streak-num">{streak.current}</div>
          <div className="streak-label">day streak</div>
        </div>
        <div className="streak-cell">
          <div className="streak-num">{streak.longest}</div>
          <div className="streak-label">longest</div>
        </div>
        <div className="streak-cell">
          <div className="streak-num">{streak.total}</div>
          <div className="streak-label">total pages</div>
        </div>
      </div>

      {view === "today" &&
        <div className="journal-page">
          <div className="tape mint center"></div>
          <div className="journal-head">
            <div className="journal-date">{fmtDateLong(today)}</div>
            <div className="journal-mood-row">
              {MOODS.map((m) =>
              <button
                key={m.id}
                className={`mood-pick ${m.id === mood ? "on" : ""}`}
                style={{ "--mood-color": m.color }}
                onClick={() => setMood(m.id)}
                title={m.label}>
                
                  <span className="mood-emoji">{m.emoji}</span>
                  <span className="mood-label">{m.label}</span>
                </button>
              )}
            </div>
          </div>
          <textarea
            className="journal-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="how was today? one line, a paragraph, a chaotic rant — whatever."
            rows={10}
            autoFocus />
          
          <div className="journal-foot">
            <span className="auto-save">{text.trim() ? "✓ saved" : "type to start"}</span>
            <span style={{ color: currentMood.color, fontFamily: "var(--font-hand)", fontSize: 18 }}>
              {currentMood.emoji} {currentMood.label}
            </span>
          </div>
        </div>
        }

      {view === "past" && pastEntry &&
        <>
          <div className="journal-page past">
            <div className="tape pink center"></div>
            <div className="journal-head">
              <div className="journal-date">{fmtDateLong(pastEntry.date)}</div>
              <div style={{ fontFamily: "var(--font-hand)", fontSize: 22, color: pastMood.color }}>
                {pastMood.emoji} {pastMood.label}
              </div>
            </div>
            <div className="journal-text-read">{pastEntry.text}</div>
          </div>
          <div className="deck-nav" style={{ marginTop: 14 }}>
            <button onClick={() => setPastIdx((i) => Math.min(sortedDesc.length - 1, i + 1))} disabled={pastIdx >= sortedDesc.length - 1} title="older">‹</button>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.15em", color: "var(--ink-soft)", textTransform: "uppercase" }}>
              {pastIdx + 1} / {sortedDesc.length}
            </span>
            <button onClick={() => setPastIdx((i) => Math.max(0, i - 1))} disabled={pastIdx <= 0} title="newer">›</button>
            <button
              onClick={deletePast}
              title="delete this entry"
              style={{ marginLeft: 12, background: "var(--coral)", color: "white" }}>
              ✕</button>
          </div>
        </>
        }

      {view === "past" && !pastEntry &&
        <div style={{ textAlign: "center", padding: 30, fontFamily: "var(--font-hand)", fontSize: 24, color: "var(--ink-soft)" }}>
          no past pages yet — go write today's.
        </div>
        }
    </Modal>);

  }

  // =========================================================
  // WISHLIST
  // =========================================================
  const WISHLIST_KEY = "caiah-wishlist";

  function loadWishlist() {
    try {
      const saved = localStorage.getItem(WISHLIST_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  }

  function WishlistModal({ onClose }) {
    const [items, setItems] = useState(loadWishlist);
    const [draft, setDraft] = useState("");
    const [draftLink, setDraftLink] = useState("");
    const [showLink, setShowLink] = useState(false);
    const [copied, setCopied] = useState(false);
    const inputRef = useRef(null);
    const linkInputRef = useRef(null);

    useEffect(() => {
      try {localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));} catch (e) {}
    }, [items]);

    // normalize a link — auto-prepend https:// if missing
    const normalizeLink = (raw) => {
      const v = (raw || "").trim();
      if (!v) return "";
      if (/^https?:\/\//i.test(v)) return v;
      if (/^[\w.-]+\.[a-z]{2,}/i.test(v)) return "https://" + v;
      return v;
    };

    const add = () => {
      const t = draft.trim();
      if (!t) return;
      const link = normalizeLink(draftLink);
      setItems((prev) => [
      {
        id: Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        text: t,
        link: link || null,
        received: false,
        addedAt: todayKey()
      },
      ...prev]
      );
      setDraft("");
      setDraftLink("");
      setShowLink(false);
      inputRef.current && inputRef.current.focus();
    };

    const toggle = (id) => {
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, received: !i.received } : i));
    };

    const del = (id) => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    };

    const setLink = (id, link) => {
      const normalized = normalizeLink(link);
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, link: normalized || null } : i));
    };

    const copyText = async () => {
      const remaining = items.filter((i) => !i.received);
      if (!remaining.length) return;
      const text = `caiah's wishlist (${remaining.length} item${remaining.length === 1 ? "" : "s"}):\n\n` +
      remaining.map((i, idx) => `${idx + 1}. ${i.text}${i.link ? `\n   → ${i.link}` : ""}`).join("\n");
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch (e) {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try {document.execCommand("copy");setCopied(true);setTimeout(() => setCopied(false), 1800);} catch (e2) {}
        document.body.removeChild(ta);
      }
    };

    const remaining = items.filter((i) => !i.received);
    const got = items.filter((i) => i.received);
    const ordered = [...remaining, ...got];

    return (
      <Modal
        onClose={onClose}
        title="the wishlist"
        lead="">
        
      <div className="wish-add-block">
        <div className="wish-add">
          <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (showLink && !draftLink) {
                    // tab into link input
                    linkInputRef.current && linkInputRef.current.focus();
                  } else add();
                }
              }}
              placeholder="add something you want or need..."
              maxLength={120} />
            
          <button
              className={`link-toggle ${showLink ? "on" : ""}`}
              onClick={() => {
                setShowLink((s) => !s);
                setTimeout(() => {
                  if (!showLink && linkInputRef.current) linkInputRef.current.focus();
                }, 60);
              }}
              title="attach a link">
              🔗</button>
          <button className="action-btn" onClick={add} disabled={!draft.trim()}>+ add</button>
        </div>
        {showLink &&
          <div className="wish-link-row">
            <span className="wish-link-prefix">🔗</span>
            <input
              ref={linkInputRef}
              type="url"
              value={draftLink}
              onChange={(e) => setDraftLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="paste a link (optional) — amazon, target, etc." />
            
          </div>
          }
      </div>

      <div className="wish-stats">
        <span><strong>{remaining.length}</strong> wanted</span>
        <span className="dot-sep">·</span>
        <span><strong>{got.length}</strong> got</span>
        <div style={{ flex: 1 }}></div>
        {items.length > 0 &&
          <button className={`ghost-btn small ${copied ? "copied" : ""}`} onClick={copyText} disabled={remaining.length === 0}>
            {copied ? "✓ copied!" : "📋 copy list"}
          </button>
          }
      </div>

      <div className="wish-paper">
        {ordered.length === 0 &&
          <div className="wish-empty">
            <div style={{ fontFamily: "var(--font-hand)", fontSize: 36 }}>✷</div>
            <div style={{ fontFamily: "var(--font-hand)", fontSize: 24, marginTop: 4 }}>nothing here yet.</div>
            <div style={{ fontFamily: "var(--font-print)", fontSize: 15, color: "var(--ink-soft)", marginTop: 4 }}>
              add stuff above and it'll live here.
            </div>
          </div>
          }
        <ul className="wish-list">
          {ordered.map((it) =>
            <WishItem
              key={it.id}
              item={it}
              onToggle={() => toggle(it.id)}
              onDelete={() => del(it.id)}
              onSetLink={(link) => setLink(it.id, link)} />

            )}
        </ul>
      </div>

      <p style={{ fontFamily: "var(--font-print)", fontSize: 13, color: "var(--ink-soft)", marginTop: 14, textAlign: "center" }}>

        </p>
    </Modal>);

  }

  // =========================================================
  // WISHLIST ITEM — handles its own link-edit state
  // =========================================================
  function WishItem({ item, onToggle, onDelete, onSetLink }) {
    const [editingLink, setEditingLink] = useState(false);
    const [draft, setDraft] = useState(item.link || "");
    const inputRef = useRef(null);

    useEffect(() => {
      if (editingLink && inputRef.current) inputRef.current.focus();
    }, [editingLink]);

    const save = () => {
      onSetLink(draft);
      setEditingLink(false);
    };
    const cancel = () => {
      setDraft(item.link || "");
      setEditingLink(false);
    };
    const clearLink = () => {
      setDraft("");
      onSetLink("");
      setEditingLink(false);
    };

    const openLink = (e) => {
      e.stopPropagation();
      if (item.link) window.open(item.link, "_blank", "noopener,noreferrer");
    };

    return (
      <li className={item.received ? "got" : ""}>
      <button className="check" onClick={onToggle} title={item.received ? "mark as wanted" : "got it"}>
        {item.received ? "✓" : ""}
      </button>

      {/* Text → clickable link if set; otherwise plain text */}
      {item.link ?
        <a
          className="text linked"
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={openLink}
          title={item.link}>
          
          {item.text}
        </a> :

        <span className="text">{item.text}</span>
        }

      {/* Link button (toggle or edit) */}
      {!editingLink &&
        <button
          className={`link-btn ${item.link ? "has-link" : ""}`}
          onClick={() => setEditingLink(true)}
          title={item.link ? "edit link" : "attach a link"}>
          🔗</button>
        }

      {/* Inline link editor */}
      {editingLink &&
        <span className="link-edit">
          <input
            ref={inputRef}
            type="url"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") cancel();
            }}
            placeholder="paste link..." />
          
          <button onClick={save} title="save">✓</button>
          {item.link && <button onClick={clearLink} title="remove link" className="clear">×</button>}
          <button onClick={cancel} title="cancel" className="cancel">esc</button>
        </span>
        }

      <button className="del" onClick={onDelete} title="remove">✕</button>
    </li>);

  }

  Object.assign(window, { JournalModal, WishlistModal });
})();