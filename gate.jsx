/* =========================================================
   GATE — viewer auth: caiah (full access) vs family (limited)
   Soft client-side gate, persisted in localStorage.
   ========================================================= */
/* global React */
(function () {
  const { useState, useEffect, useMemo } = React;
  const { WishlistModal, MailboxModal, PublicFeedModal, PublicFeedTile, FundsFamilyTile, FundsHelpPanel, Modal } = window;

  // =========================================================
  // CONFIG — password is now editable (Caiah can change it from the
  // lock button). The default ships as her starter password; once she
  // changes it, the new one is stored in localStorage (and mirrors to
  // Supabase via the db sync layer if a backend is connected).
  // =========================================================
  const DEFAULT_PASSWORD = "kemba2026"; // hint: the dog's name + grad year
  const PW_KEY = "caiah-password";

  const STATE_KEY = "caiah-viewer-v1"; // 'caiah' | 'family' | null
  const HINT_KEY = "caiah-pw-tries"; // counter for hint reveal

  function loadPassword() {
    try {
      const p = localStorage.getItem(PW_KEY);
      return p && p.length ? p : DEFAULT_PASSWORD;
    } catch (e) {return DEFAULT_PASSWORD;}
  }
  function savePassword(p) {
    try {localStorage.setItem(PW_KEY, p);} catch (e) {}
  }
  function isDefaultPassword() {
    return loadPassword().toLowerCase() === DEFAULT_PASSWORD.toLowerCase();
  }

  function loadViewer() {
    // Session-only so opening the capsule prompts the gate each fresh visit.
    // (A persistent "remember me" could come later.)
    try {
      const fromSession = sessionStorage.getItem(STATE_KEY);
      if (fromSession) return fromSession;
    } catch (e) {}
    // One-time migration: clear any pre-existing localStorage value
    try {localStorage.removeItem(STATE_KEY);} catch (e) {}
    return null;
  }
  function saveViewer(v) {
    try {
      if (v) sessionStorage.setItem(STATE_KEY, v);else
      sessionStorage.removeItem(STATE_KEY);
    } catch (e) {}
  }

  // =========================================================
  // HOOK
  // =========================================================
  function useViewer() {
    const [viewer, setViewer] = useState(loadViewer);
    const set = (v) => {saveViewer(v);setViewer(v);};
    return { viewer, setViewer: set, lock: () => set(null) };
  }

  // =========================================================
  // CHOICE SCREEN — "who is this?"
  // =========================================================
  function ChoiceScreen({ onPickCaiah, onPickFamily }) {
    return (
      <div className="gate-stage">
      <div className="gate-doodles">
        <span className="gd s1">✦</span>
        <span className="gd s2">♥</span>
        <span className="gd s3">✿</span>
        <span className="gd s4">★</span>
        <span className="gd s5">✦</span>
      </div>
      <div className="gate-inner">
        <div className="gate-eyebrow">welcome to caiah's corner</div>
        <h1 className="gate-title">who's visiting?</h1>
        <p className="gate-sub">
          this page has two doors. one for caiah, one for everybody else.
        </p>

        <div className="gate-choices">
          <button className="gate-choice gate-choice-caiah" onClick={onPickCaiah}>
            <div className="gc-emoji">✿</div>
            <div className="gc-title">i'm caiah</div>
            <div className="gc-sub">password required</div>
          </button>

          <button className="gate-choice gate-choice-family" onClick={onPickFamily}>
            <div className="gc-emoji">♥</div>
            <div className="gc-title">i'm family or a friend</div>
            <div className="gc-sub">drop a note · see her wishlist</div>
          </button>
        </div>

        <div className="gate-hint">

          </div>
      </div>
    </div>);

  }

  // =========================================================
  // PASSWORD SCREEN
  // =========================================================
  function PasswordScreen({ onUnlock, onBack }) {
    const [val, setVal] = useState("");
    const [wrong, setWrong] = useState(false);
    const [tries, setTries] = useState(() => {
      try {return parseInt(localStorage.getItem(HINT_KEY) || "0", 10);} catch (e) {return 0;}
    });

    const submit = (e) => {
      if (e) e.preventDefault();
      if (val.trim().toLowerCase() === loadPassword().toLowerCase()) {
        try {localStorage.removeItem(HINT_KEY);} catch (er) {}
        onUnlock();
      } else {
        setWrong(true);
        const next = tries + 1;
        setTries(next);
        try {localStorage.setItem(HINT_KEY, String(next));} catch (er) {}
        setTimeout(() => setWrong(false), 600);
      }
    };

    // Only offer the built-in hint while the password is still the default —
    // once Caiah sets her own, the "dog's name + grad year" hint is wrong.
    const showHint = tries >= 2 && isDefaultPassword();

    return (
      <div className="gate-stage">
      <div className="gate-doodles">
        <span className="gd s1">✦</span>
        <span className="gd s2">♥</span>
        <span className="gd s3">★</span>
      </div>
      <div className="gate-inner">
        <div className="gate-eyebrow">caiah's door</div>
        <h1 className="gate-title gate-title-sm">password, please</h1>
        <p className="gate-sub">it's the one your sibling told you. you got this.</p>

        <form className={`gate-pwform ${wrong ? "wrong" : ""}`} onSubmit={submit}>
          <input
              type="password"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="••••••••"
              autoFocus
              spellCheck={false}
              autoComplete="off" />
            
          <button type="submit" className="gate-pwsubmit" disabled={!val.trim()}>
            unlock →
          </button>
        </form>

        {wrong &&
          <div className="gate-err">nope. try again.</div>
          }

        {showHint &&
          <div className="gate-hint-yellow">
            psst — hint: the dog's name + the year you graduate, no space.
          </div>
          }

        <button className="gate-back-link" onClick={onBack}>
          ← not caiah? go back
        </button>
      </div>
    </div>);

  }

  // =========================================================
  // FAMILY VIEW — limited but warm
  // =========================================================
  function FamilyView({ onSwitchToCaiah, onLockBack }) {
    const [modal, setModal] = useState(null);
    const [wishlistTick, setWishlistTick] = useState(0);

    const wishlistPreview = useMemo(() => {
      try {
        const items = JSON.parse(localStorage.getItem("caiah-wishlist") || "[]");
        return {
          remaining: items.filter((i) => !i.received),
          got: items.filter((i) => i.received),
          total: items.length
        };
      } catch (e) {
        return { remaining: [], got: [], total: 0 };
      }
    }, [wishlistTick, modal]);

    // refresh when modal closes
    useEffect(() => {
      if (modal === null) setWishlistTick((t) => t + 1);
    }, [modal]);

    return (
      <>
      <div className="family-page">
        <div className="family-header">
          <div className="family-eyebrow">caiah's corner · for family</div>
          <h1 className="family-title">
            hi! she's lucky to have you.
          </h1>
          <p className="family-sub">this is the family door. the rest of the page is just for caiah — but you can drop her a note, look through her photos, send her money, or peek at her wishlist anytime.


            </p>
        </div>

        <div className="family-grid">
          {/* MAILBOX TILE */}
          <button
              className="family-tile family-tile-pink"
              onClick={() => setModal("mailbox")}>
              
            <div className="ft-icon">
              <svg width="80" height="56" viewBox="0 0 80 56" aria-hidden>
                <rect x="2" y="8" width="76" height="44" rx="4"
                  fill="white" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
                <path d="M 2 8 L 40 36 L 78 8"
                  fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
                <rect x="58" y="14" width="14" height="14" rx="2"
                  fill="var(--pink-deep)" stroke="var(--ink)" strokeWidth="1.6" />
                <text x="65" y="25" textAnchor="middle"
                  fontFamily="Caveat, cursive" fontSize="12" fill="white" fontWeight="700">♥</text>
              </svg>
            </div>
            <div className="ft-meta">
              <div className="ft-eyebrow">leave a love note</div>
              <h2 className="ft-title">drop a note in her mailbox</h2>
              <p className="ft-body">
                write something nice. she'll see it next time she's here.
              </p>
              <div className="ft-cta">open mailbox →</div>
            </div>
          </button>

          {/* WISHLIST TILE */}
          <button
              className="family-tile family-tile-butter"
              onClick={() => setModal("wishlist")}>
              
            <div className="ft-icon">
              <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden>
                <rect x="12" y="10" width="56" height="62" rx="3"
                  fill="white" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
                <line x1="20" y1="22" x2="60" y2="22" stroke="var(--ink-soft)" strokeWidth="1.5" />
                <line x1="20" y1="34" x2="60" y2="34" stroke="var(--ink-soft)" strokeWidth="1.5" />
                <line x1="20" y1="46" x2="60" y2="46" stroke="var(--ink-soft)" strokeWidth="1.5" />
                <line x1="20" y1="58" x2="48" y2="58" stroke="var(--ink-soft)" strokeWidth="1.5" />
                <text x="14" y="26" fontFamily="Caveat, cursive" fontSize="14" fill="var(--pink-deep)">☑</text>
                <text x="14" y="38" fontFamily="Caveat, cursive" fontSize="14" fill="var(--pink-deep)">☐</text>
                <text x="14" y="50" fontFamily="Caveat, cursive" fontSize="14" fill="var(--pink-deep)">☐</text>
              </svg>
            </div>
            <div className="ft-meta">
              <div className="ft-eyebrow">if you're shopping</div>
              <h2 className="ft-title">her wishlist</h2>
              <p className="ft-body">
                {wishlistPreview.total === 0 ?
                  "she hasn't added anything yet — check back later." :
                  `${wishlistPreview.remaining.length} item${wishlistPreview.remaining.length === 1 ? "" : "s"} still wanted, ${wishlistPreview.got.length} already got.`}
              </p>
              <div className="ft-cta">see the list →</div>
            </div>
          </button>
          {/* KEEP UP TILE */}
          <PublicFeedTile onClick={() => setModal("feed")} />

          {/* FUNDS / VIBE CHECK TILE (only renders if Caiah has set things up) */}
          {FundsFamilyTile && <FundsFamilyTile onClick={() => setModal("funds-help")} />}
        </div>

        <div className="family-footer">
          <button className="family-pw-link" onClick={onSwitchToCaiah}>
            i'm actually caiah →
          </button>
          <span className="family-divider">·</span>
          <button className="family-pw-link" onClick={onLockBack}>
            ← back to door
          </button>
        </div>
      </div>

      {modal === "mailbox" && <MailboxModal onClose={() => setModal(null)} />}
      {modal === "wishlist" && <WishlistModal onClose={() => setModal(null)} />}
      {modal === "feed" && <PublicFeedModal onClose={() => setModal(null)} />}
      {modal === "funds-help" && FundsHelpPanel &&
        <FundsHelpPanel
          onClose={() => setModal(null)}
          onOpenMailbox={() => setModal("mailbox")} />

        }
    </>);

  }

  // =========================================================
  // CHANGE PASSWORD — opened from the lock button (caiah only)
  // =========================================================
  function ChangePasswordModal({ onClose }) {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [err, setErr] = useState("");
    const [saved, setSaved] = useState(false);

    const submit = (e) => {
      if (e) e.preventDefault();
      setErr("");
      if (current.trim().toLowerCase() !== loadPassword().toLowerCase()) {
        setErr("that's not your current password.");
        return;
      }
      const n = next.trim();
      if (n.length < 4) {
        setErr("new password needs at least 4 characters.");
        return;
      }
      if (n !== confirm.trim()) {
        setErr("the two new passwords don't match.");
        return;
      }
      savePassword(n);
      setSaved(true);
    };

    return (
      <Modal onClose={onClose} title="change password">
        {saved ?
          <div className="cpw-done">
            <div className="cpw-done-emoji">🔑</div>
            <p className="cpw-done-msg">
              done — your new password is saved. you'll use it next time you unlock the corner.
            </p>
            <button type="button" className="cpw-submit" onClick={onClose}>got it</button>
          </div> :

          <form className="cpw-form" onSubmit={submit}>
            <label className="cpw-field">
              <span className="cpw-label">current password</span>
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="••••••••"
                autoFocus />

            </label>
            <label className="cpw-field">
              <span className="cpw-label">new password</span>
              <input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="at least 4 characters" />

            </label>
            <label className="cpw-field">
              <span className="cpw-label">confirm new password</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="type it again" />

            </label>

            {err && <div className="cpw-err">{err}</div>}

            <div className="cpw-actions">
              <button type="button" className="cpw-cancel" onClick={onClose}>cancel</button>
              <button type="submit" className="cpw-submit" disabled={!current || !next || !confirm}>
                save new password
              </button>
            </div>
          </form>
        }
      </Modal>);

  }

  Object.assign(window, { useViewer, ChoiceScreen, PasswordScreen, FamilyView, ChangePasswordModal });
})();