/* =========================================================
   FEED — "keep up with caiah"
   Caiah uploads three kinds of update: photo, postcard (text-
   only), or video. Each has a public/private flag.
   Family/friends see only PUBLIC posts (read-only).
   ========================================================= */
/* global React */
(function () {
  const { useState, useEffect, useMemo, useRef } = React;
  const { Modal } = window;

  const KEY = "caiah-feed-v1";
  const AUTHOR_KEY = "caiah-mailbox-author"; // reuse mailbox's name so it carries over

  // Sticker palette — emoji that read at any size, scrapbook-friendly
  const STICKER_PALETTE = ["❤️", "✨", "🌸", "⭐", "😂", "🥹", "🎉", "🌈", "🔥", "💯", "👏", "🫶"];

  function loadFeed() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        // Backfill kind for legacy items (used to be photos only)
        return arr.map((p) => p.kind ? p : { ...p, kind: "photo" });
      }
    } catch (e) {}
    return [];
  }
  function saveFeed(arr) {
    try {localStorage.setItem(KEY, JSON.stringify(arr));} catch (e) {}
  }
  function loadAuthor() {
    try {return localStorage.getItem(AUTHOR_KEY) || "";} catch (e) {return "";}
  }
  function saveAuthor(name) {
    try {localStorage.setItem(AUTHOR_KEY, name);} catch (e) {}
  }

  // Random scattering position for a freshly-stuck sticker (kept on the reaction)
  function randomStickerPos() {
    // Stay 8-92% so stickers don't clip the post edges
    return {
      x: 8 + Math.random() * 84,
      y: 8 + Math.random() * 84,
      r: -20 + Math.random() * 40
    };
  }

  function relTime(ts) {
    const d = (Date.now() - ts) / 1000;
    if (d < 60) return "just now";
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    if (d < 86400 * 7) return `${Math.floor(d / 86400)}d ago`;
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  const POSTCARD_COLORS = [
  { id: "pink", bg: "var(--pink)", ink: "var(--ink)" },
  { id: "butter", bg: "var(--butter)", ink: "var(--ink)" },
  { id: "mint", bg: "var(--mint)", ink: "var(--ink)" },
  { id: "blue", bg: "var(--blue)", ink: "var(--ink)" },
  { id: "lavender", bg: "var(--lavender)", ink: "var(--ink)" },
  { id: "paper", bg: "var(--paper)", ink: "var(--ink)" }];

  function postcardBg(id) {
    const c = POSTCARD_COLORS.find((c) => c.id === id);
    return c ? c.bg : POSTCARD_COLORS[0].bg;
  }

  // =========================================================
  // POSTCARD — reusable visual (compose + read-only)
  // Renders the back of a physical postcard: message on the
  // left, stamp + postmark + address on the right.
  // =========================================================
  function Postcard({
    body,
    color,
    ts,
    editable = false,
    onChange,
    maxLength = 600,
    placeholder,
    to = "caiah's family"
  }) {
    const date = ts ? new Date(ts) : new Date();
    const dateStr = date.
    toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" }).
    toLowerCase();
    return (
      <div className="postcard-back" style={{ background: postcardBg(color) }}>
      <div className="postcard-back-left">
        {editable ?
          <textarea
            className="postcard-msg-input"
            value={body}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "what's new? a thought, a one-liner, a whole rant."}
            maxLength={maxLength}
            rows={6} /> :


          <div className="postcard-msg">{body}</div>
          }
        <div className="postcard-signoff">
          <span>— caiah</span>
          <span className="postcard-signoff-flourish">✤</span>
        </div>
        {editable &&
          <div className="postcard-counter">{(body || "").length}/{maxLength}</div>
          }
      </div>
      <div className="postcard-divider" aria-hidden></div>
      <div className="postcard-back-right">
        <div className="postcard-stamp" aria-hidden>
          <div className="postcard-stamp-inner">
            <span className="postcard-stamp-icon">✿</span>
            <span className="postcard-stamp-val">caiah ·26¢</span>
          </div>
        </div>
        <svg className="postcard-postmark" viewBox="0 0 90 90" aria-hidden>
          <defs>
            <path id="pm-arc-top" d="M 12 45 A 33 33 0 0 1 78 45" />
            <path id="pm-arc-bot" d="M 12 47 A 33 33 0 0 0 78 47" />
          </defs>
          <circle cx="45" cy="45" r="38" fill="none" stroke="var(--ink)" strokeWidth="2" />
          <circle cx="45" cy="45" r="31" fill="none" stroke="var(--ink)" strokeWidth="1" />
          <text fontFamily="var(--font-mono)" fontSize="8" fill="var(--ink)" letterSpacing="1.5">
            <textPath href="#pm-arc-top" startOffset="50%" textAnchor="middle">CAIAH&apos;S CORNER</textPath>
          </text>
          <text fontFamily="var(--font-mono)" fontSize="7" fill="var(--ink)" letterSpacing="2">
            <textPath href="#pm-arc-bot" startOffset="50%" textAnchor="middle">★ USPS ★</textPath>
          </text>
          <text x="45" y="49" textAnchor="middle"
            fontFamily="var(--font-mono)" fontSize="11" fontWeight="700" fill="var(--ink)">
            {dateStr}
          </text>
          {/* cancellation lines streaking out the right */}
          <g stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" opacity="0.85">
            <line x1="82" y1="38" x2="110" y2="32" />
            <line x1="82" y1="45" x2="112" y2="45" />
            <line x1="82" y1="52" x2="110" y2="58" />
          </g>
        </svg>
        <div className="postcard-address">
          <span className="postcard-addr-label">to:</span>
          <span className="postcard-addr-line postcard-addr-line-name">{to}</span>
          <span className="postcard-addr-line"></span>
          <span className="postcard-addr-line"></span>
        </div>
      </div>
    </div>);

  }

  // =========================================================
  // VIDEO PREVIEW — lazy-loads blob URL from IDB
  // `mode`: 'thumb' (poster + play overlay) | 'player' (real <video controls>)
  // =========================================================
  function VideoPreview({ post, mode = "thumb", className = "" }) {
    const [url, setUrl] = useState(null);
    const [missing, setMissing] = useState(false);

    useEffect(() => {
      if (mode !== "player") return;
      let cancelled = false;
      (async () => {
        try {
          const u = await window.Media.getVideoUrl(post.videoId);
          if (cancelled) return;
          if (!u) setMissing(true);else
          setUrl(u);
        } catch (e) {
          if (!cancelled) setMissing(true);
        }
      })();
      return () => {cancelled = true;};
    }, [post.videoId, mode]);

    if (mode === "thumb") {
      return (
        <div className={`vid-thumb ${className}`}>
        {post.poster ?
          <img src={post.poster} alt={post.caption || "video"} /> :

          <div className="vid-thumb-fallback">🎬</div>
          }
        <span className="vid-thumb-play" aria-hidden>▶</span>
        {post.duration ?
          <span className="vid-thumb-dur">{window.Media.formatDuration(post.duration)}</span> :
          null}
      </div>);

    }

    // player
    if (missing) {
      return (
        <div className={`vid-player vid-player-missing ${className}`}>
        <div className="vid-thumb-fallback">⚠️</div>
        <div className="vid-missing-text">video unavailable — it may have been cleared from this browser.</div>
      </div>);

    }
    return (
      <div className={`vid-player ${className}`}>
      {url ?
        <video src={url} poster={post.poster || undefined} controls playsInline preload="metadata" /> :

        <div className="vid-player-loading">
          {post.poster ? <img src={post.poster} alt="" /> : null}
          <span>loading video…</span>
        </div>
        }
    </div>);

  }

  // =========================================================
  // FEED CARD — Caiah's view, shows recent posts + add button
  // =========================================================
  function FeedCard({ onClick }) {
    const [tick, setTick] = useState(0);
    const data = useMemo(() => {
      const all = loadFeed().sort((a, b) => b.ts - a.ts);
      return { all, total: all.length, publicCount: all.filter((p) => p.public).length };
    }, [tick]);

    useEffect(() => {
      const id = setInterval(() => setTick((t) => t + 1), 2000);
      return () => clearInterval(id);
    }, []);

    const recent = data.all.slice(0, 4);

    const renderThumb = (p) => {
      if (p.kind === "postcard") {
        return (
          <div className="feed-thumb-pcmini" style={{ background: postcardBg(p.color) }}>
          <span className="feed-thumb-pcmini-text">{(p.body || "").slice(0, 50)}{(p.body || "").length > 50 ? "…" : ""}</span>
        </div>);

      }
      if (p.kind === "video") {
        return (
          <>
          {p.poster ? <img src={p.poster} alt={p.caption || "video"} /> : <div className="vid-thumb-fallback">🎬</div>}
          <span className="feed-thumb-play">▶</span>
        </>);

      }
      return <img src={p.photo} alt={p.caption || ""} />;
    };

    return (
      <div
        className="paper-card clickable feed-card"
        onClick={onClick}
        style={{ background: "var(--mint)", transform: "rotate(0.4deg)" }}>
        
      <div className="tape blue tl"></div>
      <div className="tape pink tr"></div>
      <div className="feed-head">
        <div>
          <div className="cust-eyebrow">photos · postcards · clips · for family</div>
          <h2 className="feed-title">keep up</h2>
        </div>
        <div className="feed-pubcount">
          <div className="feed-pubcount-num">{data.publicCount}</div>
          <div className="feed-pubcount-lbl">public</div>
        </div>
      </div>

      {data.total === 0 ?
        <div className="feed-empty">
          <div className="feed-empty-icon">✿</div>
          <div className="feed-empty-text">
            post a photo, a postcard, or a video clip. choose public to share with family.
          </div>
        </div> :

        <>
          <div className="feed-thumbs">
            {recent.map((p) =>
            <div key={p.id} className={`feed-thumb feed-thumb-${p.kind || "photo"} ${p.public ? "is-public" : "is-private"}`}>
                {renderThumb(p)}
                <span className="feed-thumb-flag">{p.public ? "🌍" : "🔒"}</span>
              </div>
            )}
            {/* placeholder slots if fewer than 4 */}
            {Array.from({ length: Math.max(0, 4 - recent.length) }).map((_, i) =>
            <div key={`ph-${i}`} className="feed-thumb feed-thumb-empty">＋</div>
            )}
          </div>
          <div className="feed-foot">
            <span>{data.total} {data.total === 1 ? "post" : "posts"}</span>
            <span>tap to manage →</span>
          </div>
        </>
        }
    </div>);

  }

  // =========================================================
  // COMPOSE — type-aware (photo / postcard / video)
  // =========================================================
  function FeedCompose({ onCancel, onPost }) {
    const [kind, setKind] = useState("photo");
    const [caption, setCaption] = useState("");
    const [body, setBody] = useState("");
    const [color, setColor] = useState("pink");
    const [photo, setPhoto] = useState(null);
    const [video, setVideo] = useState(null); // { file, poster, duration, w, h }
    const [isPublic, setIsPublic] = useState(true);
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);

    const switchKind = (k) => {
      if (busy) return;
      setKind(k);
      setErr("");
    };

    const onPickPhoto = async (e) => {
      setErr("");
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const out = await window.Photos.resizePhoto(file, { maxW: 1100, maxBytes: 320000 });
        setPhoto(out);
      } catch (err) {
        setErr("couldn't read that file. try a smaller JPG or PNG.");
      } finally {
        try {e.target.value = "";} catch (_) {}
      }
    };

    const onPickVideo = async (e) => {
      setErr("");
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type || !file.type.startsWith("video/")) {
        setErr("that doesn't look like a video file.");
        try {e.target.value = "";} catch (_) {}
        return;
      }
      setBusy(true);
      try {
        const meta = await window.Media.videoPoster(file, { maxW: 800 });
        setVideo({ file, ...meta });
      } catch (err) {
        setErr("couldn't read that video. try a different format (mp4 works best).");
      } finally {
        setBusy(false);
        try {e.target.value = "";} catch (_) {}
      }
    };

    const submit = async () => {
      setErr("");
      if (kind === "photo" && !photo) return;
      if (kind === "postcard" && !body.trim()) return;
      if (kind === "video" && !video) return;

      const base = {
        id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        public: !!isPublic,
        ts: Date.now()
      };

      if (kind === "photo") {
        onPost({ ...base, kind: "photo", photo: photo.dataUrl, caption: caption.trim() });
        return;
      }

      if (kind === "postcard") {
        onPost({ ...base, kind: "postcard", body: body.trim(), color });
        return;
      }

      // video — save blob to IDB, keep poster + id in feed
      setBusy(true);
      try {
        const vid = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        await window.Media.saveVideo(vid, video.file);
        onPost({
          ...base,
          kind: "video",
          videoId: vid,
          poster: video.poster,
          duration: video.duration,
          caption: caption.trim()
        });
      } catch (err) {
        setErr("couldn't save that video. it may be too large for this browser's storage.");
      } finally {
        setBusy(false);
      }
    };

    const canPost =
    kind === "photo" && !!photo ||
    kind === "postcard" && body.trim().length > 0 ||
    kind === "video" && !!video;

    return (
      <div className="feed-compose">
      <div className="feed-compose-head">
        <span className="feed-compose-tag">new post ✦</span>
        <button type="button" className="mb-link-btn" onClick={onCancel}>cancel</button>
      </div>

      {/* TYPE TABS */}
      <div className="feed-kindtabs" role="tablist" aria-label="post type">
        <button type="button" role="tab" aria-selected={kind === "photo"}
          className={`feed-kindtab ${kind === "photo" ? "active" : ""}`}
          onClick={() => switchKind("photo")}>
          <span className="feed-kindtab-icon">📷</span>
          <span className="feed-kindtab-label">photo</span>
        </button>
        <button type="button" role="tab" aria-selected={kind === "postcard"}
          className={`feed-kindtab ${kind === "postcard" ? "active" : ""}`}
          onClick={() => switchKind("postcard")}>
          <span className="feed-kindtab-icon">✉️</span>
          <span className="feed-kindtab-label">postcard</span>
        </button>
        <button type="button" role="tab" aria-selected={kind === "video"}
          className={`feed-kindtab ${kind === "video" ? "active" : ""}`}
          onClick={() => switchKind("video")}>
          <span className="feed-kindtab-icon">🎬</span>
          <span className="feed-kindtab-label">video</span>
        </button>
      </div>

      {/* TYPE-SPECIFIC BODY */}
      {kind === "photo" &&
        <>
          {!photo ?
          <label className="feed-drop">
              <div className="feed-drop-icon">📷</div>
              <div className="feed-drop-title">choose a photo</div>
              <div className="feed-drop-sub">jpg or png · gets resized automatically</div>
              <input type="file" accept="image/*" onChange={onPickPhoto} style={{ display: "none" }} />
            </label> :

          <div className="feed-preview">
              <img src={photo.dataUrl} alt="preview" />
              <button type="button" className="feed-preview-change" onClick={() => setPhoto(null)}>
                change photo
              </button>
            </div>
          }
          <label className="form-row">
            <span>caption (optional)</span>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. first dorm room ✿" />
            
          </label>
        </>
        }

      {kind === "postcard" &&
        <>
          <Postcard
            body={body}
            color={color}
            editable
            onChange={setBody}
            maxLength={600} />
          
          <div className="postcard-colors">
            <span className="postcard-colors-label">paper</span>
            <div className="postcard-colors-row">
              {POSTCARD_COLORS.map((c) =>
              <button
                key={c.id}
                type="button"
                className={`postcard-color-swatch ${color === c.id ? "active" : ""}`}
                style={{ background: c.bg }}
                onClick={() => setColor(c.id)}
                title={c.id}
                aria-label={`${c.id} paper`} />

              )}
            </div>
          </div>
        </>
        }

      {kind === "video" &&
        <>
          {!video ?
          <label className={`feed-drop ${busy ? "is-busy" : ""}`}>
              <div className="feed-drop-icon">🎬</div>
              <div className="feed-drop-title">{busy ? "reading video…" : "choose a video"}</div>
              <div className="feed-drop-sub">mp4, mov, webm · no length cap</div>
              <input type="file" accept="video/*" onChange={onPickVideo} style={{ display: "none" }} disabled={busy} />
            </label> :

          <div className="feed-preview">
              <video
              src={URL.createObjectURL(video.file)}
              poster={video.poster}
              controls
              playsInline
              preload="metadata"
              onLoadedData={(e) => {/* keep memory ok */}} />
            
              <button type="button" className="feed-preview-change" onClick={() => setVideo(null)}>
                change video
              </button>
              {video.duration ?
            <span className="feed-preview-dur">{window.Media.formatDuration(video.duration)}</span> :
            null}
            </div>
          }
          <label className="form-row">
            <span>caption (optional)</span>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. roommate said WHAT" />
            
          </label>
        </>
        }

      {err && <div className="mb-attach-err">{err}</div>}

      {/* VISIBILITY */}
      <div className="feed-visibility">
        <button
            type="button"
            className={`feed-vis-btn ${isPublic ? "active" : ""}`}
            onClick={() => setIsPublic(true)}>
            
          <span className="feed-vis-icon">🌍</span>
          <div className="feed-vis-text">
            <div className="feed-vis-label">public</div>
            <div className="feed-vis-sub">family + friends can see this</div>
          </div>
        </button>
        <button
            type="button"
            className={`feed-vis-btn ${!isPublic ? "active" : ""}`}
            onClick={() => setIsPublic(false)}>
            
          <span className="feed-vis-icon">🔒</span>
          <div className="feed-vis-text">
            <div className="feed-vis-label">private</div>
            <div className="feed-vis-sub">only you can see this</div>
          </div>
        </button>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-primary" disabled={!canPost || busy} onClick={submit}>
          {busy ? "saving…" : `post ${isPublic ? "publicly" : "(private)"}`}
        </button>
      </div>
    </div>);

  }

  // =========================================================
  // REACTION LAYER — overlays stickers ON the post
  // =========================================================
  function ReactionLayer({ reactions, isOwner, onDelete }) {
    if (!reactions || reactions.length === 0) return null;
    return (
      <div className="post-detail-stickers" aria-label="reactions">
      {reactions.map((r) => {
          const pos = r.pos || { x: 50, y: 50, r: 0 };
          return (
            <button
              key={r.id}
              type="button"
              className={`post-sticker ${isOwner ? "is-owner" : ""}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: `translate(-50%,-50%) rotate(${pos.r}deg)`
              }}
              title={isOwner ? `from ${r.from} · click to remove` : `from ${r.from}`}
              onClick={() => {if (isOwner) onDelete(r.id);}}>
              
            <span className="post-sticker-emoji">{r.sticker}</span>
            <span className="post-sticker-name">{r.from}</span>
          </button>);

        })}
    </div>);

  }

  // =========================================================
  // STICKER PICKER — inline panel to stick a reaction
  // =========================================================
  function StickerPicker({ from, onPick, disabled }) {
    return (
      <div className="sticker-picker">
      <div className="sticker-picker-grid">
        {STICKER_PALETTE.map((s) =>
          <button
            key={s}
            type="button"
            className="sticker-picker-btn"
            onClick={() => onPick(s)}
            disabled={disabled}
            aria-label={`react with ${s}`}>
            
            <span>{s}</span>
          </button>
          )}
      </div>
      <div className="sticker-picker-hint">
        {disabled ? "type your name below first ↓" : `tap a sticker to stick it on as ${from}`}
      </div>
    </div>);

  }

  // =========================================================
  // POST DETAIL — full view of one post + reactions + comments
  //   mode: "caiah" (owner — can delete reactions/comments)
  //         "family" (read-only of post; can react + comment)
  // =========================================================
  function PostDetail({ post, mode, onBack, onMutate }) {
    const isOwner = mode === "caiah";
    const [from, setFrom] = useState(() => loadAuthor());
    const [body, setBody] = useState("");
    const [showStickers, setShowStickers] = useState(false);
    useEffect(() => {saveAuthor(from);}, [from]);

    const reactions = post.reactions || [];
    const comments = post.comments || [];

    const trimmedFrom = from.trim();

    const stickOn = (sticker) => {
      if (!trimmedFrom) return;
      // toggle — same person + same sticker removes
      const existing = reactions.find((r) => r.from === trimmedFrom && r.sticker === sticker);
      if (existing) {
        onMutate((p) => ({
          ...p,
          reactions: (p.reactions || []).filter((r) => r.id !== existing.id)
        }));
        return;
      }
      const newR = {
        id: `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        sticker,
        from: trimmedFrom,
        ts: Date.now(),
        pos: randomStickerPos()
      };
      onMutate((p) => ({ ...p, reactions: [...(p.reactions || []), newR] }));
    };

    const removeSticker = (rid) => {
      onMutate((p) => ({ ...p, reactions: (p.reactions || []).filter((r) => r.id !== rid) }));
    };

    const sendComment = () => {
      if (!body.trim()) return;
      const newC = {
        id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        body: body.trim(),
        from: trimmedFrom || "anonymous",
        ts: Date.now()
      };
      onMutate((p) => ({ ...p, comments: [...(p.comments || []), newC] }));
      setBody("");
    };

    const removeComment = (cid) => {
      onMutate((p) => ({ ...p, comments: (p.comments || []).filter((c) => c.id !== cid) }));
    };

    // count chips
    const grouped = {};
    reactions.forEach((r) => {
      if (!grouped[r.sticker]) grouped[r.sticker] = [];
      grouped[r.sticker].push(r.from);
    });

    const dateStr = new Date(post.ts).
    toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }).
    toLowerCase();

    return (
      <div className="post-detail">
      <button type="button" className="mb-back" onClick={onBack}>
        <span className="mb-back-arrow">←</span> back to feed
      </button>

      {/* STAGE — full-size post with reactions overlaid */}
      <div className={`post-detail-stage post-detail-stage-${post.kind || "photo"}`}>
        <div className="post-detail-media">
          {post.kind === "postcard" ?
            <Postcard body={post.body} color={post.color} ts={post.ts} /> :
            post.kind === "video" ?
            <VideoPreview post={post} mode="player" className="post-detail-vid" /> :

            <div className="post-detail-photo">
              <img src={post.photo} alt={post.caption || ""} />
            </div>
            }
          <ReactionLayer reactions={reactions} isOwner={isOwner} onDelete={removeSticker} />
        </div>
      </div>

      {/* caption + meta */}
      {post.kind !== "postcard" && post.caption &&
        <div className="post-detail-caption">{post.caption}</div>
        }
      <div className="post-detail-meta">
        <span>{dateStr}</span>
        <span className="post-detail-meta-dot">·</span>
        <span>{post.public ? "🌍 public" : "🔒 private"}</span>
        <span className="post-detail-meta-dot">·</span>
        <span>{reactions.length} reactions</span>
        <span className="post-detail-meta-dot">·</span>
        <span>{comments.length} notes</span>
      </div>

      {/* REACTIONS */}
      <div className="post-detail-section">
        <div className="post-detail-section-head">
          <h4 className="post-detail-h">stickers</h4>
          <button
              type="button"
              className="mb-link-btn"
              onClick={() => setShowStickers((s) => !s)}>
              {showStickers ? "close" : "+ stick one on"}</button>
        </div>

        {/* author input (shared with comments) */}
        <label className="post-detail-author">
          <span>signed as</span>
          <input
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="your name" />
            
        </label>

        {showStickers &&
          <StickerPicker from={trimmedFrom || "anonymous"} onPick={stickOn} disabled={!trimmedFrom} />
          }

        {Object.keys(grouped).length === 0 ?
          <div className="post-detail-empty">no stickers yet — be the first.</div> :

          <div className="post-reaction-strip">
            {Object.entries(grouped).map(([sticker, names]) =>
            <div key={sticker} className="post-reaction-chip" title={names.join(", ")}>
                <span className="post-reaction-chip-icon">{sticker}</span>
                <span className="post-reaction-chip-count">×{names.length}</span>
                <span className="post-reaction-chip-names">
                  {names.slice(0, 2).join(", ")}
                  {names.length > 2 ? ` +${names.length - 2}` : ""}
                </span>
              </div>
            )}
          </div>
          }
      </div>

      {/* COMMENTS */}
      <div className="post-detail-section">
        <h4 className="post-detail-h">notes <span className="post-detail-h-count">({comments.length})</span></h4>

        {comments.length === 0 ?
          <div className="post-detail-empty">no notes yet — drop one below.</div> :

          <ul className="post-comments-list">
            {[...comments].sort((a, b) => b.ts - a.ts).map((c) =>
            <li key={c.id} className="post-comment">
                <div className="post-comment-tape"></div>
                <div className="post-comment-body">{c.body}</div>
                <div className="post-comment-meta">
                  <span className="post-comment-from">— {c.from || "anonymous"}</span>
                  <span className="post-comment-time">{relTime(c.ts)}</span>
                  {isOwner &&
                <button
                  type="button"
                  className="post-comment-del"
                  onClick={() => removeComment(c.id)}
                  title="delete this note">
                  ✕</button>
                }
                </div>
              </li>
            )}
          </ul>
          }

        {/* compose a comment */}
        <div className="post-comment-compose">
          <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder={
              isOwner ?
              "drop a note on your own post (rare flex)…" :
              "leave a note for caiah…"
              } />
            
          <div className="post-comment-compose-foot">
            <span className="post-comment-compose-as">
              {trimmedFrom ? <>signing as <strong>{trimmedFrom}</strong></> : "type your name above to sign"}
            </span>
            <button
                type="button"
                className="btn-primary"
                onClick={sendComment}
                disabled={!body.trim() || !trimmedFrom}>
                drop a note →</button>
          </div>
        </div>
      </div>
    </div>);

  }

  // =========================================================
  // CAIAH'S FEED MODAL — manage posts (compose + toggle public + delete)
  // =========================================================
  function FeedModal({ onClose }) {
    const [list, setList] = useState(loadFeed);
    const [composing, setComposing] = useState(loadFeed().length === 0);
    const [viewingId, setViewingId] = useState(null);

    useEffect(() => {saveFeed(list);}, [list]);

    const sorted = useMemo(() => [...list].sort((a, b) => b.ts - a.ts), [list]);
    const viewing = useMemo(() => sorted.find((p) => p.id === viewingId) || null, [sorted, viewingId]);

    const handlePost = (item) => {
      try {
        setList((arr) => [item, ...arr]);
        setComposing(false);
      } catch (e) {
        alert("storage is full — try deleting old posts before adding more.");
      }
    };

    const togglePublic = (id) => {
      setList((arr) => arr.map((p) => p.id === id ? { ...p, public: !p.public } : p));
    };

    const remove = (id) => {
      if (!confirm("delete this post? this can't be undone.")) return;
      const target = list.find((p) => p.id === id);
      if (target && target.kind === "video" && target.videoId) {
        window.Media.deleteVideo(target.videoId);
      }
      setList((arr) => arr.filter((p) => p.id !== id));
      if (viewingId === id) setViewingId(null);
    };

    const mutatePost = (id, updater) => {
      setList((arr) => arr.map((p) => p.id === id ? updater(p) : p));
    };

    return (
      <Modal
        onClose={onClose}
        title="keep up with caiah"
        lead="flip 🌍/🔒 to control what family can see — private stays just for you.">
        
      <div className="feed-modal">
        {viewing ?
          <PostDetail
            post={viewing}
            mode="caiah"
            onBack={() => setViewingId(null)}
            onMutate={(updater) => mutatePost(viewing.id, updater)} /> :


          <>
            {composing ?
            <FeedCompose
              onCancel={() => setComposing(false)}
              onPost={handlePost} /> :


            <div className="mb-actionrow">
                <button type="button" className="btn-primary" onClick={() => setComposing(true)}>
                  + new post
                </button>
                <span className="mb-count">
                  {list.length} {list.length === 1 ? "post" : "posts"} ·{" "}
                  {list.filter((p) => p.public).length} public
                </span>
              </div>
            }

            {sorted.length === 0 ?
            <div className="mb-empty">
                <div style={{ fontSize: 64 }}>✿</div>
                <div className="mb-empty-text">no posts yet. add one above.</div>
              </div> :

            <div className="feed-grid">
                {sorted.map((p) =>
              <FeedManageCard
                key={p.id}
                post={p}
                onTogglePublic={() => togglePublic(p.id)}
                onRemove={() => remove(p.id)}
                onOpen={() => setViewingId(p.id)} />

              )}
              </div>
            }
          </>
          }
      </div>
    </Modal>);

  }

  // =========================================================
  // REACTION / COMMENT COUNT BADGES (shared with manage cards)
  // =========================================================
  function PostCountBadges({ post: p }) {
    const rxCount = (p.reactions || []).length;
    const cmCount = (p.comments || []).length;
    if (rxCount === 0 && cmCount === 0) return null;
    // Up to 3 unique sticker emojis to peek at
    const peek = [];
    const seen = new Set();
    (p.reactions || []).forEach((r) => {
      if (peek.length < 3 && !seen.has(r.sticker)) {
        seen.add(r.sticker);
        peek.push(r.sticker);
      }
    });
    return (
      <div className="post-count-badges" aria-label="reactions and notes">
      {rxCount > 0 &&
        <span className="post-count-badge">
          <span className="post-count-peek">{peek.join("")}</span>
          <span className="post-count-num">{rxCount}</span>
        </span>
        }
      {cmCount > 0 &&
        <span className="post-count-badge">
          <span className="post-count-icon">💬</span>
          <span className="post-count-num">{cmCount}</span>
        </span>
        }
    </div>);

  }

  // === Card for the manage grid (Caiah's view) ===
  function FeedManageCard({ post: p, onTogglePublic, onRemove, onOpen }) {
    const stopAndDo = (fn) => (e) => {e.stopPropagation();fn();};

    // Postcards get a special treatment — the whole card IS the postcard.
    if (p.kind === "postcard") {
      return (
        <div
          className={`feed-post feed-post-postcard-wrap clickable-card ${p.public ? "is-public" : "is-private"}`}
          onClick={onOpen}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {if (e.key === "Enter" || e.key === " ") {e.preventDefault();onOpen();}}}>
          
        <Postcard body={p.body} color={p.color} ts={p.ts} />
        <div className="feed-post-meta feed-post-meta-postcard">
          <span className="feed-post-kindtag inline">✉️ postcard</span>
          <PostCountBadges post={p} />
          <span className="feed-post-time">{relTime(p.ts)}</span>
        </div>
        <div className="feed-post-actions">
          <button
              type="button"
              className={`feed-toggle ${p.public ? "on" : ""}`}
              onClick={stopAndDo(onTogglePublic)}
              title={p.public ? "currently public — tap to make private" : "currently private — tap to make public"}>
              
            <span>{p.public ? "🌍" : "🔒"}</span>
            <span>{p.public ? "public" : "private"}</span>
          </button>
          <button
              type="button"
              className="feed-del"
              onClick={stopAndDo(onRemove)}
              title="delete this post">
              ✕</button>
        </div>
      </div>);

    }

    return (
      <div
        className={`feed-post feed-post-${p.kind || "photo"} clickable-card ${p.public ? "is-public" : "is-private"}`}
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {if (e.key === "Enter" || e.key === " ") {e.preventDefault();onOpen();}}}>
        
      <div className="feed-post-media">
        {p.kind === "video" ?
          <VideoPreview post={p} mode="thumb" className="feed-post-vidthumb" /> :

          <img src={p.photo} alt={p.caption || ""} />
          }
        <span className="feed-post-kindtag">
          {p.kind === "video" ? "🎬 video" : "📷 photo"}
        </span>
        <PostCountBadges post={p} />
      </div>
      <div className="feed-post-meta">
        {p.caption && <div className="feed-post-caption">{p.caption}</div>}
        <div className="feed-post-time">{relTime(p.ts)}</div>
      </div>
      <div className="feed-post-actions">
        <button
            type="button"
            className={`feed-toggle ${p.public ? "on" : ""}`}
            onClick={stopAndDo(onTogglePublic)}
            title={p.public ? "currently public — tap to make private" : "currently private — tap to make public"}>
            
          <span>{p.public ? "🌍" : "🔒"}</span>
          <span>{p.public ? "public" : "private"}</span>
        </button>
        <button
            type="button"
            className="feed-del"
            onClick={stopAndDo(onRemove)}
            title="delete this post">
            ✕</button>
      </div>
    </div>);

  }

  // =========================================================
  // PUBLIC FEED MODAL — read-only of the post itself, but
  // family can react (stickers) + leave a note from here.
  // =========================================================
  function PublicFeedModal({ onClose }) {
    // Hold full feed (so we can write back reactions/comments).
    // Filter to public on render.
    const [list, setList] = useState(loadFeed);
    const [viewingId, setViewingId] = useState(null);

    useEffect(() => {saveFeed(list);}, [list]);

    const publicSorted = useMemo(
      () => list.filter((p) => p.public).sort((a, b) => b.ts - a.ts),
      [list]
    );
    const viewing = useMemo(
      () => publicSorted.find((p) => p.id === viewingId) || null,
      [publicSorted, viewingId]
    );

    const mutatePost = (id, updater) => {
      setList((arr) => arr.map((p) => p.id === id ? updater(p) : p));
    };

    return (
      <Modal
        onClose={onClose}
        title="keep up with caiah"
        lead="photos, postcards, and clips she chose to share. tap any post to react with a sticker or leave a note.">
        
      <div className="feed-modal">
        {viewing ?
          <PostDetail
            post={viewing}
            mode="family"
            onBack={() => setViewingId(null)}
            onMutate={(updater) => mutatePost(viewing.id, updater)} /> :

          publicSorted.length === 0 ?
          <div className="mb-empty">
            <div style={{ fontSize: 64 }}>✿</div>
            <div className="mb-empty-text">nothing public yet. check back later!</div>
          </div> :

          <div className="feed-public-grid">
            {publicSorted.map((p) =>
            <FeedPublicPost
              key={p.id}
              post={p}
              onOpen={() => setViewingId(p.id)} />

            )}
          </div>
          }
      </div>
    </Modal>);

  }

  // Public-side card — clickable preview that expands into PostDetail
  function FeedPublicPost({ post: p, onOpen }) {
    const handleKey = (e) => {
      if (e.key === "Enter" || e.key === " ") {e.preventDefault();onOpen();}
    };

    if (p.kind === "postcard") {
      return (
        <div
          className="feed-public-post feed-public-postcard-wrap clickable-card"
          onClick={onOpen}
          role="button"
          tabIndex={0}
          onKeyDown={handleKey}>
          
        <Postcard body={p.body} color={p.color} ts={p.ts} />
        <div className="feed-public-time feed-public-postcard-time">
          <span>✉️ postcard</span>
          <PostCountBadges post={p} />
          <span>{relTime(p.ts)}</span>
        </div>
      </div>);

    }

    if (p.kind === "video") {
      return (
        <div
          className="feed-public-post feed-public-video clickable-card"
          onClick={onOpen}
          role="button"
          tabIndex={0}
          onKeyDown={handleKey}>
          
        <div className="feed-public-vidbtn">
          <VideoPreview post={p} mode="thumb" />
        </div>
        {p.caption && <div className="feed-public-caption">{p.caption}</div>}
        <div className="feed-public-time">
          <PostCountBadges post={p} />
          <span>{relTime(p.ts)}</span>
        </div>
      </div>);

    }

    // photo (default)
    return (
      <div
        className="feed-public-post clickable-card"
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={handleKey}>
        
      <div className="feed-public-img">
        <img src={p.photo} alt={p.caption || ""} />
      </div>
      {p.caption && <div className="feed-public-caption">{p.caption}</div>}
      <div className="feed-public-time">
        <PostCountBadges post={p} />
        <span>{relTime(p.ts)}</span>
      </div>
    </div>);

  }

  // =========================================================
  // FAMILY-VIEW TILE for the public feed (small)
  // =========================================================
  function PublicFeedTile({ onClick }) {
    const data = useMemo(() => {
      const pub = loadFeed().filter((p) => p.public);
      return {
        total: pub.length,
        photos: pub.filter((p) => !p.kind || p.kind === "photo").length,
        postcards: pub.filter((p) => p.kind === "postcard").length,
        videos: pub.filter((p) => p.kind === "video").length
      };
    }, []);
    return (
      <button className="family-tile family-tile-mint" onClick={onClick}>
      <div className="ft-icon">
        <svg width="84" height="68" viewBox="0 0 84 68" aria-hidden>
          <rect x="3" y="9" width="78" height="56" rx="4"
            fill="white" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
          {/* mountains */}
          <path d="M 8 56 L 28 30 L 44 50 L 56 38 L 76 56 Z"
            fill="var(--mint-deep)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="60" cy="22" r="6" fill="var(--butter-deep)" stroke="var(--ink)" strokeWidth="2" />
          {/* viewfinder bump */}
          <rect x="32" y="3" width="20" height="8" rx="2" fill="white" stroke="var(--ink)" strokeWidth="2" />
        </svg>
      </div>
      <div className="ft-meta">
        <div className="ft-eyebrow"></div>
        <h2 className="ft-title">keep up with caiah</h2>
        <p className="ft-body">
          {data.total === 0 ?
            "she hasn't shared anything yet — check back!" :
            `${data.total} post${data.total === 1 ? "" : "s"} she's chosen to share.`}
        </p>
        {data.total > 0 &&
          <div className="ft-kindstrip">
            {data.photos > 0 && <span>📷 {data.photos}</span>}
            {data.postcards > 0 && <span>✉️ {data.postcards}</span>}
            {data.videos > 0 && <span>🎬 {data.videos}</span>}
          </div>
          }
        <div className="ft-cta">see the feed →</div>
      </div>
    </button>);

  }

  Object.assign(window, { FeedCard, FeedModal, PublicFeedModal, PublicFeedTile });
})();