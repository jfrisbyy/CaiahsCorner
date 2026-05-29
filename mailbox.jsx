/* =========================================================
   MAILBOX — family/friends can drop notes; Caiah sees unread
   ========================================================= */
/* global React */
(function() {
const { useState, useEffect, useMemo } = React;
const { Modal } = window;

const KEY = "caiah-mailbox-v1";
const AUTHOR_KEY = "caiah-mailbox-author";

const SEED = []; // start empty; family will fill it

function loadMail() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return SEED;
}
function saveMail(arr) {
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) {}
}
function loadAuthor() {
  try { return localStorage.getItem(AUTHOR_KEY) || ""; } catch (e) { return ""; }
}
function saveAuthor(name) {
  try { localStorage.setItem(AUTHOR_KEY, name); } catch (e) {}
}

function relTime(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 86400 * 7) return `${Math.floor(d / 86400)}d ago`;
  const dt = new Date(ts);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// =========================================================
// ENVELOPE SVG — simple hand-drawn look
// =========================================================
function Envelope({ open = false, color = "var(--paper)", size = 48 }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 80 56" style={{ display: "block" }}>
      <rect x="2" y="8" width="76" height="44" rx="4"
        fill={color} stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round"/>
      {open ? (
        <path d="M 2 8 L 40 4 L 78 8" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round"/>
      ) : (
        <path d="M 2 8 L 40 36 L 78 8 Z"
          fill="rgba(0,0,0,0.04)" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round"/>
      )}
      {/* corner stamp */}
      <rect x="58" y="14" width="14" height="14" rx="2"
        fill="var(--pink)" stroke="var(--ink)" strokeWidth="1.5"/>
      <text x="65" y="24" textAnchor="middle"
        fontFamily="Caveat, cursive" fontSize="11" fill="var(--ink)" fontWeight="700">♥</text>
    </svg>
  );
}

// =========================================================
// MAILBOX VIDEO PLAYER — lazy-loads the blob URL from IDB
// =========================================================
function MailboxVideoPlayer({ video }) {
  const [url, setUrl] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await window.Media.getVideoUrl(video.id);
        if (cancelled) return;
        if (!u) setMissing(true);
        else setUrl(u);
      } catch (e) {
        if (!cancelled) setMissing(true);
      }
    })();
    return () => { cancelled = true; };
  }, [video.id]);

  if (missing) {
    return (
      <div className="mb-vid-missing">
        <span aria-hidden>⚠️</span>
        <span>video unavailable — it may have been cleared from this browser.</span>
      </div>
    );
  }
  return (
    <div className="mb-vid-frame">
      {url ? (
        <video src={url} poster={video.poster || undefined} controls playsInline preload="metadata" />
      ) : (
        <div className="mb-vid-loading">
          {video.poster ? <img src={video.poster} alt="" /> : null}
          <span>loading video…</span>
        </div>
      )}
    </div>
  );
}

// =========================================================
// MAILBOX CARD — preview on the board
// =========================================================
function MailboxCard({ onClick }) {
  const [tick, setTick] = useState(0);
  const data = useMemo(() => {
    const all = loadMail();
    const sorted = [...all].sort((a, b) => b.ts - a.ts);
    const unread = sorted.filter((m) => !m.read);
    return { all: sorted, unread, latest: sorted[0] };
  }, [tick]);

  // Light polling so unread count updates after composing in modal
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="paper-card clickable mailbox-card"
      onClick={onClick}
      style={{ background: "var(--butter)", transform: "rotate(0.6deg)" }}
    >
      <div className="tape pink tl"></div>
      <div className="mailbox-head">
        <div>
          <div className="cust-eyebrow">love notes · from family</div>
          <h2 className="mailbox-title">mailbox</h2>
        </div>
        {data.unread.length > 0 && (
          <div className="mailbox-badge" title={`${data.unread.length} unread`}>
            {data.unread.length}
            <span className="mailbox-badge-sub">new</span>
          </div>
        )}
      </div>

      {data.all.length === 0 ? (
        <div className="mailbox-empty">
          <div className="mailbox-empty-env"><Envelope size={56} open /></div>
          <div className="mailbox-empty-text">
            empty box. tap to drop the first note.
          </div>
        </div>
      ) : (
        <>
          <div className="mailbox-stack">
            {data.all.slice(0, 3).map((m, i) => (
              <div
                key={m.id}
                className={`stack-env ${m.read ? "read" : "unread"}`}
                style={{
                  transform: `translateY(${i * 6}px) rotate(${(i - 1) * 1.2}deg)`,
                  zIndex: 3 - i,
                }}
              >
                <Envelope size={64} open={m.read} color={m.read ? "var(--paper)" : "white"} />
              </div>
            ))}
          </div>
          <div className="mailbox-latest">
            <div className="mailbox-latest-from">from {data.latest.from || "anonymous"}</div>
            <div className="mailbox-latest-body">
              {(data.latest.body || "").slice(0, 70)}
              {(data.latest.body || "").length > 70 ? "…" : ""}
            </div>
            <div className="mailbox-latest-time">{relTime(data.latest.ts)}</div>
          </div>
        </>
      )}
    </div>
  );
}

// =========================================================
// MAILBOX MODAL — full inbox + compose
// =========================================================
function MailboxModal({ onClose }) {
  const [list, setList] = useState(loadMail);
  const [from, setFrom] = useState(loadAuthor);
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [photo, setPhoto] = useState(null); // { dataUrl, w, h } | null
  const [photoErr, setPhotoErr] = useState("");
  const [video, setVideo] = useState(null); // { file, poster, duration, w, h } | null
  const [videoErr, setVideoErr] = useState("");
  const [videoBusy, setVideoBusy] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [composing, setComposing] = useState(loadMail().length === 0);

  useEffect(() => { saveMail(list); }, [list]);
  useEffect(() => { saveAuthor(from); }, [from]);

  const sorted = useMemo(() => [...list].sort((a, b) => b.ts - a.ts), [list]);

  const send = async () => {
    if (!body.trim()) return;
    let videoId = "";
    let videoMeta = null;
    // Save the video blob to IDB up front, before touching localStorage
    if (video) {
      try {
        videoId = `nv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        await window.Media.saveVideo(videoId, video.file);
        videoMeta = { id: videoId, poster: video.poster, duration: video.duration };
      } catch (err) {
        alert("couldn't save the video — it may be too large for this browser. try sending without it.");
        return;
      }
    }
    const note = {
      id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      from: from.trim() || "anonymous",
      body: body.trim(),
      link: link.trim() || "",
      photo: photo ? photo.dataUrl : "",
      video: videoMeta, // null | { id, poster, duration }
      replyTo: replyTo || null,
      ts: Date.now(),
      read: false,
    };
    try {
      setList([note, ...list]);
    } catch (err) {
      if (note.photo) {
        note.photo = "";
        try { setList([note, ...list]); }
        catch (e2) {
          if (videoId) window.Media.deleteVideo(videoId);
          alert("storage is full \u2014 try removing some old photos."); return;
        }
      } else {
        if (videoId) window.Media.deleteVideo(videoId);
        alert("storage is full."); return;
      }
    }
    setBody("");
    setLink("");
    setPhoto(null);
    setPhotoErr("");
    setVideo(null);
    setVideoErr("");
    setComposing(false);
    setReplyTo(null);
  };

  const onPickPhoto = async (e) => {
    setPhotoErr("");
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const out = await window.Photos.resizePhoto(file, { maxW: 900, maxBytes: 220000 });
      setPhoto(out);
    } catch (err) {
      setPhotoErr("couldn't read that file. try a smaller JPG or PNG.");
    } finally {
      try { e.target.value = ""; } catch (_) {}
    }
  };

  const onPickVideo = async (e) => {
    setVideoErr("");
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type || !file.type.startsWith("video/")) {
      setVideoErr("that doesn't look like a video file.");
      try { e.target.value = ""; } catch (_) {}
      return;
    }
    setVideoBusy(true);
    try {
      const meta = await window.Media.videoPoster(file, { maxW: 700 });
      setVideo({ file, ...meta });
    } catch (err) {
      setVideoErr("couldn't read that video. try a different format (mp4 works best).");
    } finally {
      setVideoBusy(false);
      try { e.target.value = ""; } catch (_) {}
    }
  };

  const startReply = (id) => {
    setReplyTo(id);
    setBody("");
    setLink("");
    setViewingId(null);
    setComposing(true);
  };

  const cancelCompose = () => {
    setComposing(false);
    setReplyTo(null);
    setPhoto(null);
    setPhotoErr("");
    setVideo(null);
    setVideoErr("");
  };

  const markRead = (id) => {
    setList((arr) => arr.map((m) => (m.id === id ? { ...m, read: true } : m)));
  };

  const markAllRead = () => {
    setList((arr) => arr.map((m) => ({ ...m, read: true })));
  };

  const remove = (id) => {
    if (!confirm("delete this note?")) return;
    const target = list.find((m) => m.id === id);
    if (target && target.video && target.video.id) {
      window.Media.deleteVideo(target.video.id);
    }
    setList((arr) => arr.filter((m) => m.id !== id));
  };

  const toggle = (id) => {
    setViewingId(id);
    markRead(id);
  };

  const viewing = useMemo(() => sorted.find((m) => m.id === viewingId), [viewingId, sorted]);
  const replyToNote = useMemo(() => list.find((m) => m.id === replyTo), [replyTo, list]);
  const parentOfViewing = useMemo(
    () => (viewing && viewing.replyTo ? list.find((m) => m.id === viewing.replyTo) : null),
    [viewing, list]
  );

  const unreadCount = sorted.filter((m) => !m.read).length;

  return (
    <Modal
      onClose={onClose}
      title="mailbox"
    >
      <div className="mailbox-modal">
        {viewing ? (
          <div className="mb-compose-wrap">
            <button
              type="button"
              className="mb-back"
              onClick={() => setViewingId(null)}
            >
              <span className="mb-back-arrow">←</span> back to inbox
            </button>

            <div className="mb-note-paper mb-note-paper-read" style={{ transform: "rotate(-0.6deg)" }}>
              <div className="tape pink tl"></div>
              <div className="tape mint tr"></div>

              {parentOfViewing && (
                <button
                  type="button"
                  className="mb-reply-banner-read"
                  onClick={() => setViewingId(parentOfViewing.id)}
                  title="open original"
                >
                  <span className="mb-reply-arrow">↳</span>
                  <span>in reply to <strong>{parentOfViewing.from || "anonymous"}</strong></span>
                  <span className="mb-reply-snippet">
                    "{(parentOfViewing.body || "").slice(0, 50)}{(parentOfViewing.body || "").length > 50 ? "…" : ""}"
                  </span>
                </button>
              )}

              <div className="mb-note-meta">
                <span className="mb-note-label">from</span>
                <span className="mb-note-handvalue">{viewing.from || "anonymous"}</span>
                <span className="mb-note-date">
                  {new Date(viewing.ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }).toLowerCase()}
                </span>
              </div>

              <div className="mb-note-greeting">to caiah,</div>

              <div className="mb-note-bodytext">{viewing.body}</div>

              {viewing.photo && (
                <div className="mb-note-photo">
                  <img src={viewing.photo} alt="attachment from sender"/>
                </div>
              )}

              {viewing.video && (
                <div className="mb-note-video">
                  <MailboxVideoPlayer video={viewing.video} />
                </div>
              )}

              {viewing.link && (
                <div className="mb-note-link">
                  <span className="mb-note-label-mono">p.s. — link</span>
                  <a
                    href={viewing.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-note-linkvalue"
                  >{viewing.link} ↗</a>
                </div>
              )}

              <div className="mb-note-sign">
                <span className="mb-note-sign-hand">— {viewing.from || "____"}</span>
              </div>

              <div className="mb-note-stamp">
                <Envelope size={42} open />
              </div>
            </div>

            <div className="form-actions mb-compose-actions">
              <button
                type="button"
                className="mb-link-btn danger"
                onClick={() => {
                  if (confirm("delete this note?")) {
                    if (viewing.video && viewing.video.id) {
                      window.Media.deleteVideo(viewing.video.id);
                    }
                    setList((arr) => arr.filter((m) => m.id !== viewing.id));
                    setViewingId(null);
                  }
                }}
              >delete this note</button>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setViewingId(null)}
                >back to inbox</button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => startReply(viewing.id)}
                >↩ reply</button>
              </div>
            </div>
          </div>
        ) : (
        <>
        {/* compose */}
        {composing ? (
          <div className="mb-compose-wrap">
            <button
              type="button"
              className="mb-back"
              onClick={cancelCompose}
            >
              <span className="mb-back-arrow">←</span> back to inbox
            </button>

            <div className="mb-note-paper" style={{ transform: "rotate(-0.8deg)" }}>
              <div className="tape pink tl"></div>
              <div className="tape mint tr"></div>

              {replyToNote && (
                <div className="mb-reply-banner-compose">
                  <span className="mb-reply-arrow">↳</span>
                  <div className="mb-reply-meta">
                    <span>replying to <strong>{replyToNote.from || "anonymous"}</strong></span>
                    <span className="mb-reply-snippet">
                      "{(replyToNote.body || "").slice(0, 60)}{(replyToNote.body || "").length > 60 ? "…" : ""}"
                    </span>
                  </div>
                  <button
                    type="button"
                    className="mb-reply-clear"
                    onClick={() => setReplyTo(null)}
                    title="not a reply anymore"
                  >✕</button>
                </div>
              )}

              <div className="mb-note-meta">
                <span className="mb-note-label">from</span>
                <input
                  type="text"
                  className="mb-note-handinput"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="your name"
                />
                <span className="mb-note-date">
                  {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }).toLowerCase()}
                </span>
              </div>

              <div className="mb-note-greeting">to caiah,</div>

              <textarea
                className="mb-note-textarea"
                rows="7"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="write what you want to tell her…"
              ></textarea>

              <div className="mb-note-attach">
                <div className="mb-note-attach-row">
                  {photo ? (
                    <div className="mb-note-attach-preview">
                      <img src={photo.dataUrl} alt="attached" />
                      <button
                        type="button"
                        className="mb-note-attach-remove"
                        onClick={() => { setPhoto(null); setPhotoErr(""); }}
                        title="remove photo"
                      >✕</button>
                    </div>
                  ) : (
                    <label className="mb-note-attach-btn">
                      <span className="mb-attach-icon">📷</span>
                      <span>attach a photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={onPickPhoto}
                        style={{ display: "none" }}
                      />
                    </label>
                  )}

                  {video ? (
                    <div className="mb-note-attach-preview mb-note-attach-vidpreview">
                      {video.poster ? (
                        <img src={video.poster} alt="video preview" />
                      ) : (
                        <div className="vid-thumb-fallback">🎬</div>
                      )}
                      <span className="mb-note-attach-vidbadge">
                        <span>▶</span>
                        {video.duration ? <span>{window.Media.formatDuration(video.duration)}</span> : null}
                      </span>
                      <button
                        type="button"
                        className="mb-note-attach-remove"
                        onClick={() => { setVideo(null); setVideoErr(""); }}
                        title="remove video"
                      >✕</button>
                    </div>
                  ) : (
                    <label className={`mb-note-attach-btn ${videoBusy ? "is-busy" : ""}`}>
                      <span className="mb-attach-icon">🎬</span>
                      <span>{videoBusy ? "reading video…" : "attach a video"}</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={onPickVideo}
                        style={{ display: "none" }}
                        disabled={videoBusy}
                      />
                    </label>
                  )}
                </div>
                {photoErr && <div className="mb-attach-err">{photoErr}</div>}
                {videoErr && <div className="mb-attach-err">{videoErr}</div>}
              </div>

              <div className="mb-note-link">
                <span className="mb-note-label-mono">p.s. — link (optional)</span>
                <input
                  type="text"
                  className="mb-note-linkinput"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://… a song, a pic, anything"
                />
              </div>

              <div className="mb-note-sign">
                <span className="mb-note-sign-hand">— {from.trim() || "____"}</span>
              </div>

              <div className="mb-note-stamp">
                <Envelope size={42} />
              </div>
            </div>

            <div className="form-actions mb-compose-actions">
              <button type="button" className="btn-secondary" onClick={cancelCompose}>← cancel</button>
              <button type="button" className="btn-primary" onClick={send} disabled={!body.trim()}>
                {replyToNote ? "send reply →" : "drop in mailbox →"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-actionrow">
            <button type="button" className="btn-primary" onClick={() => setComposing(true)}>
              + drop a note
            </button>
            {unreadCount > 0 && (
              <button type="button" className="mb-link-btn" onClick={markAllRead}>
                mark all read ({unreadCount})
              </button>
            )}
            <span className="mb-count">
              {sorted.length} {sorted.length === 1 ? "note" : "notes"}
            </span>
          </div>
        )}

        {/* list */}
        {sorted.length === 0 ? (
          <div className="mb-empty">
            <Envelope size={72} open />
            <div className="mb-empty-text">no mail yet. be the first.</div>
          </div>
        ) : (
          <ul className="mb-list">
            {sorted.map((m) => {
              const parent = m.replyTo ? list.find((p) => p.id === m.replyTo) : null;
              return (
                <li
                  key={m.id}
                  className={`mb-item ${m.read ? "read" : "unread"}`}
                >
                  <button
                    type="button"
                    className="mb-item-row"
                    onClick={() => toggle(m.id)}
                  >
                    <div className="mb-env"><Envelope size={44} open={m.read} /></div>
                    <div className="mb-meta">
                      {parent && (
                        <div className="mb-reply-tag">
                          ↳ replying to {parent.from || "anonymous"}
                        </div>
                      )}
                      <div className="mb-from">
                        {m.from || "anonymous"}
                        {!m.read && <span className="mb-dot" />}
                      </div>
                      <div className="mb-preview">
                        {(m.body || "").slice(0, 80) + ((m.body || "").length > 80 ? "…" : "")}
                      </div>
                    </div>
                    <div className="mb-time">{relTime(m.ts)}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        </>
        )}
      </div>
    </Modal>
  );
}

// =========================================================
// MAILBOX TOP-RIGHT BUTTON — floating icon w/ unread badge
// =========================================================
function MailboxButton({ onClick }) {
  const [tick, setTick] = useState(0);
  const unread = useMemo(() => {
    return loadMail().filter((m) => !m.read).length;
  }, [tick]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <button
      type="button"
      className={`mailbox-fab ${unread > 0 ? "has-mail" : ""}`}
      onClick={onClick}
      title={unread > 0 ? `${unread} unread` : "mailbox"}
      aria-label={unread > 0 ? `mailbox: ${unread} unread` : "mailbox"}
    >
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden>
        {/* post */}
        <line x1="16" y1="22" x2="16" y2="30" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round"/>
        {/* box */}
        <path
          d="M 4 12 Q 4 6 11 6 L 23 6 Q 28 6 28 12 L 28 22 L 4 22 Z"
          fill="white"
          stroke="var(--ink)"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* door */}
        <rect x="9" y="13" width="14" height="7" rx="1" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.5"/>
        {/* knob */}
        <circle cx="20" cy="16.5" r="1.2" fill="var(--ink)"/>
        {/* mail slot detail (vertical line at top center) */}
        <line x1="11" y1="9" x2="11" y2="11" stroke="var(--ink)" strokeWidth="1.3" strokeLinecap="round"/>
        {/* flag */}
        <g className="mb-flag">
          <line x1="28" y1="8" x2="28" y2="18" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round"/>
          <path d="M 28 8 L 33 9 L 33 13 L 28 14 Z" fill="var(--pink-deep)" stroke="var(--ink)" strokeWidth="1.4" strokeLinejoin="round"/>
        </g>
      </svg>
      <span className="mb-fab-label">mailbox</span>
      {unread > 0 && (
        <span className="mb-fab-badge">{unread > 9 ? "9+" : unread}</span>
      )}
    </button>
  );
}

Object.assign(window, { MailboxCard, MailboxModal, MailboxButton });
})();
