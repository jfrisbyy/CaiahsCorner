/* =========================================================
   FUNDS — money tracker
   Caiah view: balance, +/- quick-add, history, threshold, handles
   Family view: snack-bowl + vibes-meter (NO dollar amount),
                 "send help" panel pre-fills mailbox + shows
                 her cash handles when she's set them.

   Storage: caiah-funds-v1
   { transactions: [{id, kind:'in'|'out', amount, label, ts}],
     threshold: 50,                      // single low-threshold knob
     handles: { venmo, cashapp, zelle, paypal } }
   ========================================================= */
/* global React */
(function () {
  const { useState, useEffect, useMemo } = React;
  const { Modal, MailboxModal } = window;

  const KEY = "caiah-funds-v1";

  // ---------- storage ----------
  function loadFunds() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        return {
          transactions: Array.isArray(p.transactions) ? p.transactions : [],
          threshold: typeof p.threshold === "number" ? p.threshold : 50,
          handles: p.handles && typeof p.handles === "object" ? p.handles : {}
        };
      }
    } catch (e) {}
    return { transactions: [], threshold: 50, handles: {} };
  }
  function saveFunds(d) {
    try {localStorage.setItem(KEY, JSON.stringify(d));} catch (e) {}
  }

  function useFunds() {
    const [data, setData] = useState(loadFunds);
    useEffect(() => saveFunds(data), [data]);

    const addTx = (kind, amount, label) => {
      const amt = Math.abs(parseFloat(amount));
      if (!isFinite(amt) || amt <= 0) return;
      const tx = {
        id: `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        kind,
        amount: Math.round(amt * 100) / 100,
        label: (label || "").trim() || (kind === "in" ? "money in" : "spend"),
        ts: Date.now()
      };
      setData((d) => ({ ...d, transactions: [tx, ...d.transactions] }));
    };
    const removeTx = (id) =>
    setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));
    const setThreshold = (n) =>
    setData((d) => ({ ...d, threshold: Math.max(0, parseFloat(n) || 0) }));
    const setHandle = (key, val) =>
    setData((d) => ({ ...d, handles: { ...d.handles, [key]: val } }));

    return { data, addTx, removeTx, setThreshold, setHandle };
  }

  // ---------- derived ----------
  function computeBalance(txs) {
    return txs.reduce((s, t) => s + (t.kind === "in" ? t.amount : -t.amount), 0);
  }
  function computeWeekDelta(txs) {
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
    return txs.
    filter((t) => t.ts >= cutoff).
    reduce((s, t) => s + (t.kind === "in" ? t.amount : -t.amount), 0);
  }
  // 4 bands as multiples of threshold (her one knob = low threshold)
  function computeBand(balance, threshold) {
    const T = threshold > 0 ? threshold : 50;
    if (balance >= 2 * T) return "thriving";
    if (balance >= T) return "cruising";
    if (balance >= 0.5 * T) return "low";
    return "help";
  }
  // Continuous 0–100 "shine" level tied directly to her threshold:
  //   balance = 0      → 0   (empty / grey)
  //   balance = 0.5·T  → 25  (low)
  //   balance = 1·T    → 50  (mid)
  //   balance = 2·T    → 100 (full orange blaze)
  // The sun brightens smoothly between these — not in 4 discrete jumps.
  function computeFundLevel(balance, threshold) {
    const T = threshold > 0 ? threshold : 50;
    return Math.max(0, Math.min(100, balance / (2 * T) * 100));
  }
  const BAND_INFO = {
    thriving: { label: "thriving", bowl: "full", color: "var(--mint-deep)", sub: "sunshine for days" },
    cruising: { label: "cruising", bowl: "half", color: "var(--butter-deep)", sub: "vibes are stable" },
    low: { label: "getting low", bowl: "crumbs", color: "var(--coral)", sub: "clouds rolling in" },
    help: { label: "send help", bowl: "empty", color: "var(--pink-deep)", sub: "rainy day — send rations" }
  };

  function fmt(n) {
    const sign = n < 0 ? "-" : "";
    const v = Math.abs(n);
    return `${sign}$${v.toFixed(2)}`;
  }
  function relTime(ts) {
    const d = (Date.now() - ts) / 1000;
    if (d < 60) return "just now";
    if (d < 3600) return `${Math.floor(d / 60)}m`;
    if (d < 86400) return `${Math.floor(d / 3600)}h`;
    if (d < 86400 * 7) return `${Math.floor(d / 86400)}d`;
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  // =========================================================
  // SUNSHINE METER — reactive kawaii sun (rebuilt, replaces fruit bowl)
  // Driven by `fundLevel` (0–100) → tier (empty/low/mid/high/overflow).
  // The more money, the brighter the sun: warmer core, longer rays, bigger
  // glow, happier face. At empty it's a grey, cloud-covered sad sun.
  //
  // Public API (unchanged):
  //   <SnackBowl band="thriving" size={120} />            (legacy — band → level)
  //   <SnackBowl fundLevel={75} size={160} showDev />     (new)
  //   window.setFundLevel(n)  ← drives every meter mounted with showDev
  // =========================================================
  // --- Tier mapping ---
  const FB_BAND_LEVEL = {
    thriving: 92,
    cruising: 60,
    low: 18,
    help: 0
  };
  function fbTierFromLevel(level) {
    const n = Math.max(0, Math.min(100, Number(level) || 0));
    if (n <= 0) return "empty";
    if (n <= 25) return "low";
    if (n <= 50) return "mid";
    if (n <= 80) return "high";
    return "overflow";
  }
  const FB_TIER_RANK = { empty: 0, low: 1, mid: 2, high: 3, overflow: 4 };

  // --- Module-level global state for window.setFundLevel(n) ---
  if (typeof window !== "undefined" && !window.__fbState) {
    window.__fbState = { level: null, listeners: new Set() };
    window.setFundLevel = function setFundLevel(n) {
      const lv = Math.max(0, Math.min(100, Number(n) || 0));
      window.__fbState.level = lv;
      window.__fbState.listeners.forEach((fn) => fn(lv));
    };
  }

  const SUN_CX = 110,SUN_CY = 104,SUN_R = 42,RAY_COUNT = 12;

  // --- The sun's kawaii face: eyes + cheeks + smile/frown (CSS swaps mouth) ---
  function SunFace() {
    const eyeY = SUN_CY - 2;
    return (
      <g className="fb-sun-face">
        {/* eyes */}
        <circle className="fb-sun-eye" cx={SUN_CX - 13} cy={eyeY} r="4.4" fill="var(--fb-outline)" />
        <circle className="fb-sun-eye" cx={SUN_CX + 13} cy={eyeY} r="4.4" fill="var(--fb-outline)" />
        <circle cx={SUN_CX - 14.4} cy={eyeY - 1.5} r="1.2" fill="#fff" />
        <circle cx={SUN_CX + 11.6} cy={eyeY - 1.5} r="1.2" fill="#fff" />
        {/* cheeks */}
        <ellipse className="fb-sun-cheek" cx={SUN_CX - 20} cy={eyeY + 9} rx="5" ry="3.2" fill="var(--fb-cheek)" opacity="0.65" />
        <ellipse className="fb-sun-cheek" cx={SUN_CX + 20} cy={eyeY + 9} rx="5" ry="3.2" fill="var(--fb-cheek)" opacity="0.65" />
        {/* mouths — opacity-swapped by data-tier */}
        <path className="fb-mouth fb-mouth-smile"
        d={`M ${SUN_CX - 9} ${eyeY + 11} Q ${SUN_CX} ${eyeY + 19} ${SUN_CX + 9} ${eyeY + 11}`}
        stroke="var(--fb-outline)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path className="fb-mouth fb-mouth-grin"
        d={`M ${SUN_CX - 10} ${eyeY + 10} Q ${SUN_CX} ${eyeY + 22} ${SUN_CX + 10} ${eyeY + 10} Q ${SUN_CX} ${eyeY + 14} ${SUN_CX - 10} ${eyeY + 10} Z`}
        fill="var(--fb-outline)" stroke="var(--fb-outline)" strokeWidth="1" strokeLinejoin="round" />
        <path className="fb-mouth fb-mouth-frown"
        d={`M ${SUN_CX - 9} ${eyeY + 17} Q ${SUN_CX} ${eyeY + 9} ${SUN_CX + 9} ${eyeY + 17}`}
        stroke="var(--fb-outline)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        {/* sweat bead (empty only) */}
        <ellipse className="fb-sweat" cx={SUN_CX + 19} cy={eyeY - 6} rx="2" ry="3"
        fill="#9ecbe0" stroke="var(--fb-outline)" strokeWidth="1" />
      </g>);

  }

  // --- Rays: 12 chunky rounded triangles, scaled by shine ---
  function SunRays({ shine }) {
    const scale = 0.5 + shine * 0.6; // 0.5 → 1.1
    const opacity = 0.35 + shine * 0.65; // 0.35 → 1
    const rays = [...Array(RAY_COUNT)].map((_, i) => i * (360 / RAY_COUNT));
    return (
      <g className="fb-rays-spin">
        <g className="fb-rays-scale"
        style={{ transformBox: "fill-box", transformOrigin: "center", transform: `scale(${scale})`, opacity }}>
          {rays.map((a) =>
          <path key={a}
          d={`M ${SUN_CX} ${SUN_CY - SUN_R - 26} L ${SUN_CX - 7} ${SUN_CY - SUN_R - 2} L ${SUN_CX + 7} ${SUN_CY - SUN_R - 2} Z`}
          transform={`rotate(${a} ${SUN_CX} ${SUN_CY})`}
          fill="var(--sun-ray)" stroke="var(--fb-outline)" strokeWidth="2.2" strokeLinejoin="round" />
          )}
        </g>
      </g>);

  }

  // --- Twinkle sparkles around an overflowing sun ---
  function SunSparkles() {
    const pts = [
    { x: 44, y: 56, s: 1.1 },
    { x: 176, y: 50, s: 0.9 },
    { x: 188, y: 120, s: 1.0 },
    { x: 34, y: 128, s: 0.85 },
    { x: 150, y: 24, s: 0.7 }];

    return (
      <g className="fb-sparkles">
        {pts.map((p, i) =>
        <path key={i} className="fb-sparkle" style={{ animationDelay: `${i * 0.3}s` }}
        transform={`translate(${p.x} ${p.y}) scale(${p.s})`}
        d="M 0 -7 Q 1.4 -1.4 7 0 Q 1.4 1.4 0 7 Q -1.4 1.4 -7 0 Q -1.4 -1.4 0 -7 Z"
        fill="#fff7d6" stroke="var(--fb-outline)" strokeWidth="1.1" strokeLinejoin="round" />
        )}
      </g>);

  }

  // --- A grey cloud that drifts in to cover an empty sun ---
  function SunCloud() {
    return (
      <g className="fb-cloud">
        <path d="M 60 150 Q 52 150 50 142 Q 44 132 56 128 Q 58 116 74 120 Q 82 108 98 116
                 Q 112 110 120 122 Q 138 120 138 134 Q 150 136 146 148 Q 144 152 136 150 Z"

        fill="#e3e8ec" stroke="var(--fb-outline)" strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M 60 138 Q 80 132 100 138" stroke="#c4ccd2" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* rain */}
        <line className="fb-rain" x1="72" y1="156" x2="69" y2="166" stroke="#9ecbe0" strokeWidth="2.4" strokeLinecap="round" />
        <line className="fb-rain fb-rain-2" x1="98" y1="158" x2="95" y2="168" stroke="#9ecbe0" strokeWidth="2.4" strokeLinecap="round" />
        <line className="fb-rain fb-rain-3" x1="124" y1="156" x2="121" y2="166" stroke="#9ecbe0" strokeWidth="2.4" strokeLinecap="round" />
      </g>);

  }

  // --- The reactive sun ---
  function FruitBowl({ fundLevel, band, size = 160, showDev = false, className = "" }) {
    const initial =
    fundLevel != null ? Number(fundLevel) :
    band != null ? FB_BAND_LEVEL[band] ?? 60 :
    75;
    const [level, setLevel] = useState(initial);

    // sync from prop changes
    useEffect(() => {
      if (fundLevel != null) setLevel(Math.max(0, Math.min(100, Number(fundLevel))));else
      if (band != null) setLevel(FB_BAND_LEVEL[band] ?? 60);
    }, [fundLevel, band]);

    // dev-slider meters also subscribe to the global setter
    useEffect(() => {
      if (!showDev || typeof window === "undefined") return;
      const fn = (lv) => setLevel(lv);
      window.__fbState.listeners.add(fn);
      if (window.__fbState.level != null) setLevel(window.__fbState.level);
      return () => window.__fbState.listeners.delete(fn);
    }, [showDev]);

    const tier = fbTierFromLevel(level);
    const shine = Math.max(0, Math.min(100, level)) / 100;
    const glowOpacity = tier === "empty" ? 0 : 0.18 + shine * 0.6;

    return (
      <div className={`fruit-bowl fb-sun ${className}`}
      data-tier={tier}
      style={{ "--fund-level": level, "--shine": shine }}>
        <svg
          className="fb-svg"
          width={size}
          height={size}
          viewBox="0 0 220 220"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label={`fund level ${level} (${tier})`}>
          
          <defs>
            <radialGradient id="fb-sun-glow">
              <stop offset="0%" stopColor="var(--sun-core)" stopOpacity="0.7" />
              <stop offset="55%" stopColor="var(--sun-core)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--sun-core)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* soft glow halo */}
          <circle className="fb-glow" cx={SUN_CX} cy={SUN_CY} r="96"
          fill="url(#fb-sun-glow)" style={{ opacity: glowOpacity }} />

          {/* rays behind the body */}
          <SunRays shine={shine} />

          {/* sun body */}
          <g className="fb-sun-body">
            <circle cx={SUN_CX} cy={SUN_CY} r={SUN_R}
            fill="var(--sun-core)" stroke="var(--fb-outline)" strokeWidth="3" />
            {/* warm underside shading */}
            <path d={`M ${SUN_CX - SUN_R + 4} ${SUN_CY + 8} A ${SUN_R} ${SUN_R} 0 0 0 ${SUN_CX + SUN_R - 4} ${SUN_CY + 8}
                      A ${SUN_R - 6} ${SUN_R - 6} 0 0 1 ${SUN_CX - SUN_R + 4} ${SUN_CY + 8} Z`}
            fill="var(--sun-shade)" opacity="0.4" />
            {/* top-left highlight */}
            <ellipse cx={SUN_CX - 16} cy={SUN_CY - 18} rx="7" ry="10" fill="rgba(255,255,255,0.5)" />
            <SunFace />
          </g>

          {/* overlays */}
          <SunSparkles />
          <SunCloud />
        </svg>

        {showDev &&
        <div className="fb-dev" aria-label="dev only — remove for production">
            <div className="fb-dev-label">
              <span>dev · fundLevel</span>
              <small>{level}</small>
            </div>
            <div className="fb-dev-row">
              <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={level}
              onChange={(e) => {
                const lv = Number(e.target.value);
                setLevel(lv);
                if (typeof window !== "undefined" && window.__fbState) {
                  window.__fbState.level = lv;
                  window.__fbState.listeners.forEach((fn) => fn(lv));
                }
              }}
              aria-label="fund level" />
            
            </div>
            <div className="fb-dev-tier">tier: {tier}</div>
          </div>
        }
      </div>);

  }

  // Backward-compat alias — existing callers pass `band` / `size`.
  function SnackBowl(props) {
    return <FruitBowl {...props} />;
  }

  // =========================================================
  // VIBES METER — 4-step dial that reads at a glance
  // =========================================================
  function VibesMeter({ band }) {
    const order = ["help", "low", "cruising", "thriving"];
    const idx = order.indexOf(band);
    const pct = idx >= 0 ? idx / 3 : 0; // 0..1
    return (
      <div className="vibes-meter" role="img" aria-label={`vibes: ${BAND_INFO[band].label}`}>
        <div className="vm-track">
          {order.map((b, i) =>
          <div key={b} className={`vm-tick tick-${b} ${i <= idx ? "lit" : ""}`}></div>
          )}
          <div className="vm-needle" style={{ left: `${pct * 100}%`, background: BAND_INFO[band].color }}></div>
        </div>
        <div className="vm-labels">
          <span className={band === "help" ? "lit" : ""}>send help</span>
          <span className={band === "low" ? "lit" : ""}>getting low</span>
          <span className={band === "cruising" ? "lit" : ""}>cruising</span>
          <span className={band === "thriving" ? "lit" : ""}>thriving</span>
        </div>
      </div>);

  }

  // =========================================================
  // CAIAH'S CARD (board preview)
  // =========================================================
  function FundsCard({ onClick }) {
    const [tick, setTick] = useState(0);
    const data = useMemo(() => loadFunds(), [tick]);
    useEffect(() => {
      const id = setInterval(() => setTick((t) => t + 1), 2000);
      return () => clearInterval(id);
    }, []);

    const balance = computeBalance(data.transactions);
    const week = computeWeekDelta(data.transactions);
    const band = computeBand(balance, data.threshold);
    const recent = data.transactions.slice(0, 2);
    const empty = data.transactions.length === 0;

    return (
      <div
        className="paper-card clickable funds-card"
        onClick={onClick}
        style={{ background: "var(--mint)", transform: "rotate(-0.5deg)" }}>
        
        <div className="tape blue tl"></div>
        <div className="tape pink tr"></div>

        <div className="fc-header">
          <div>
            <h2 className="fc-title">the funds</h2>
          </div>
          <div className={`fc-band-chip band-${band}`}>
            <span className="dot"></span>{BAND_INFO[band].label}
          </div>
        </div>

        <div className="fc-balance-row">
          <div className="fc-balance">{empty ? "$—" : fmt(balance)}</div>
          {!empty &&
          <div className={`fc-trend ${week >= 0 ? "up" : "down"}`}>
              {week >= 0 ? "▲" : "▼"} {fmt(Math.abs(week))} <span>this wk</span>
            </div>
          }
        </div>

        {empty ?
        <div className="fc-empty">
            tap to set your low threshold + start logging<br />
            allowance, food, books, the works.
          </div> :

        <ul className="fc-recent">
            {recent.map((t) =>
          <li key={t.id} className={`tx-row kind-${t.kind}`}>
                <span className="tx-amt">{t.kind === "in" ? "+" : "−"}{fmt(t.amount)}</span>
                <span className="tx-label">{t.label}</span>
                <span className="tx-time">{relTime(t.ts)}</span>
              </li>
          )}
            {data.transactions.length > 2 &&
          <li className="tx-row-more">+ {data.transactions.length - 2} more · tap to open</li>
          }
          </ul>
        }
      </div>);

  }

  // =========================================================
  // CAIAH'S MODAL — full ledger
  // =========================================================
  function FundsModal({ onClose }) {
    const { data, addTx, removeTx, setThreshold, setHandle } = useFunds();
    const [kind, setKind] = useState("out");
    const [amount, setAmount] = useState("");
    const [label, setLabel] = useState("");
    const [showHandles, setShowHandles] = useState(false);

    const balance = computeBalance(data.transactions);
    const week = computeWeekDelta(data.transactions);
    const band = computeBand(balance, data.threshold);

    const submit = (e) => {
      if (e) e.preventDefault();
      if (!amount) return;
      addTx(kind, amount, label);
      setAmount("");
      setLabel("");
    };

    return (
      <Modal onClose={onClose} title="the funds" lead="this whole card is for you. family sees vibes only — no $$$.">
        <div className="funds-modal">
          {/* TOP — big balance + band */}
          <div className="fm-top">
            <div>
              <div className="cust-eyebrow">balance</div>
              <div className="fm-balance">{fmt(balance)}</div>
              <div className={`fm-trend ${week >= 0 ? "up" : "down"}`}>
                {week >= 0 ? "▲" : "▼"} {fmt(Math.abs(week))} this week · {data.transactions.length} tx
              </div>
            </div>
            <div className="fm-band">
              <SnackBowl fundLevel={computeFundLevel(balance, data.threshold)} size={140} showDev />
              <div className={`fc-band-chip band-${band}`}>
                <span className="dot"></span>{BAND_INFO[band].label}
              </div>
              <div className="fm-band-sub">{BAND_INFO[band].sub}</div>
            </div>
          </div>

          {/* QUICK ADD */}
          <form className="fm-add" onSubmit={submit}>
            <div className="fm-add-toggle">
              <button type="button"
              className={`fm-toggle ${kind === "in" ? "active in" : ""}`}
              onClick={() => setKind("in")}>+ in</button>
              <button type="button"
              className={`fm-toggle ${kind === "out" ? "active out" : ""}`}
              onClick={() => setKind("out")}>− out</button>
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="fm-amount"
              inputMode="decimal"
              autoFocus />
            
            <input
              type="text"
              placeholder={kind === "in" ? "from mom · paycheck · venmo" : "dining hall · books · coffee"}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="fm-label" />
            
            <button type="submit" className="fm-submit" disabled={!amount}>
              add
            </button>
          </form>

          {/* THRESHOLD */}
          <div className="fm-threshold">
            <label>
              <span className="cust-eyebrow">low threshold</span>
              <span className="fm-threshold-help">below this = family sees "send help"</span>
            </label>
            <div className="fm-threshold-input">
              <span className="fm-dollar">$</span>
              <input
                type="number"
                min="0"
                step="5"
                value={data.threshold}
                onChange={(e) => setThreshold(e.target.value)} />
              
            </div>
            <div className="fm-threshold-bands">
              <span className="band-help">&lt; {fmt(data.threshold * 0.5)}</span>
              <span className="band-low">to {fmt(data.threshold)}</span>
              <span className="band-cruising">to {fmt(data.threshold * 2)}</span>
              <span className="band-thriving">&gt; {fmt(data.threshold * 2)}</span>
            </div>
          </div>

          {/* CASH HANDLES (collapsed by default) */}
          <div className="fm-handles">
            <button
              type="button"
              className="fm-handles-toggle"
              onClick={() => setShowHandles((s) => !s)}>
              
              {showHandles ? "▼" : "▶"} cash handles{" "}
              <span className="cust-eyebrow" style={{ marginLeft: 8 }}>
                shown on family "send help" panel
              </span>
            </button>
            {showHandles &&
            <div className="fm-handles-grid">
                {[
              { k: "venmo", label: "venmo @" },
              { k: "cashapp", label: "cash app $" },
              { k: "zelle", label: "zelle (email/phone)" },
              { k: "paypal", label: "paypal" }].
              map((h) =>
              <label key={h.k} className="fm-handle-row">
                    <span>{h.label}</span>
                    <input
                  type="text"
                  value={data.handles[h.k] || ""}
                  placeholder="—"
                  onChange={(e) => setHandle(h.k, e.target.value)} />
                
                  </label>
              )}
                <div className="fm-handles-note">
                  leave blank to hide. they'll show on family view only when you're in the "send help" band.
                </div>
              </div>
            }
          </div>

          {/* HISTORY */}
          <div className="fm-history">
            <div className="fm-history-header">
              <span className="cust-eyebrow">history · all transactions</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-soft)" }}>
                {data.transactions.length}
              </span>
            </div>
            {data.transactions.length === 0 ?
            <div className="fm-empty">no transactions yet — add one above.</div> :

            <ul className="fm-tx-list">
                {data.transactions.map((t) =>
              <li key={t.id} className={`fm-tx kind-${t.kind}`}>
                    <span className="fm-tx-amt">
                      {t.kind === "in" ? "+" : "−"}{fmt(t.amount)}
                    </span>
                    <span className="fm-tx-label">{t.label}</span>
                    <span className="fm-tx-time">{relTime(t.ts)}</span>
                    <button
                  type="button"
                  className="fm-tx-del"
                  title="delete"
                  onClick={() => removeTx(t.id)}>
                  ✕</button>
                  </li>
              )}
              </ul>
            }
          </div>
        </div>
      </Modal>);

  }

  // =========================================================
  // FAMILY-VIEW TILE — snack bowl + vibes meter (NO $$$)
  // Shows only when Caiah has set things up (>=1 tx OR threshold non-default-touched).
  // =========================================================
  function FundsFamilyTile({ onClick }) {
    const [tick, setTick] = useState(0);
    const data = useMemo(() => loadFunds(), [tick]);
    useEffect(() => {
      const id = setInterval(() => setTick((t) => t + 1), 3000);
      return () => clearInterval(id);
    }, []);

    if (data.transactions.length === 0) return null; // nothing to report yet

    const balance = computeBalance(data.transactions);
    const band = computeBand(balance, data.threshold);
    const info = BAND_INFO[band];

    return (
      <button
        className={`family-tile family-tile-funds funds-band-${band}`}
        onClick={onClick}>
        
        <div className="ft-icon ft-icon-funds">
          <SnackBowl fundLevel={computeFundLevel(balance, data.threshold)} size={120} />
        </div>
        <div className="ft-meta">
          <div className="ft-eyebrow">the vibe check</div>
          <h2 className="ft-title">she's <em>{info.label}</em></h2>
          <p className="ft-body">
            {info.sub}. no dollar amounts here — just the temperature.
          </p>
          <VibesMeter band={band} />
          <div className={`ft-cta ${band === "help" ? "glow" : ""}`}>
            {band === "help" ? "send help →" : "see how to send help →"}
          </div>
        </div>
      </button>);

  }

  // =========================================================
  // FAMILY "SEND HELP" PANEL — cash handles + mailbox prefill
  // =========================================================
  function FundsHelpPanel({ onClose, onOpenMailbox }) {
    const data = useMemo(() => loadFunds(), []);
    const balance = computeBalance(data.transactions);
    const band = computeBand(balance, data.threshold);
    const info = BAND_INFO[band];

    const filledHandles = [
    { k: "venmo", label: "venmo", val: data.handles.venmo, prefix: "@" },
    { k: "cashapp", label: "cash app", val: data.handles.cashapp, prefix: "$" },
    { k: "zelle", label: "zelle", val: data.handles.zelle, prefix: "" },
    { k: "paypal", label: "paypal", val: data.handles.paypal, prefix: "" }].
    filter((h) => h.val && h.val.trim());

    const copy = async (text) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {}
    };

    return (
      <Modal onClose={onClose} title="send help" lead="how she's doing — and the easiest ways to help.">
        <div className="help-panel">
          <div className="hp-vibe">
            <SnackBowl fundLevel={computeFundLevel(balance, data.threshold)} size={150} />
            <div className="hp-vibe-text">
              <div className={`fc-band-chip band-${band} big`}>
                <span className="dot"></span>{info.label}
              </div>
              <p className="hp-sub">{info.sub}.</p>
              <VibesMeter band={band} />
              <div className="hp-disclaimer">
                no specific amount shown — that's between her and her bank.
              </div>
            </div>
          </div>

          {filledHandles.length > 0 ?
          <>
              <div className="hp-section-label cust-eyebrow">option 1 · send a few bucks</div>
              <div className="hp-handles">
                {filledHandles.map((h) =>
              <div key={h.k} className="hp-handle">
                    <div className="hp-handle-label">{h.label}</div>
                    <div className="hp-handle-val">
                      <span className="hp-handle-prefix">{h.prefix}</span>
                      {h.val}
                    </div>
                    <button
                  type="button"
                  className="hp-copy"
                  onClick={() => copy(h.prefix + h.val)}
                  title="copy">
                  copy</button>
                  </div>
              )}
              </div>
            </> :

          <div className="hp-no-handles">
              she hasn't set up cash handles yet — but a note still goes a long way ↓
            </div>
          }

          <div className="hp-section-label cust-eyebrow" style={{ marginTop: 18 }}>
            option 2 · drop her a note
          </div>
          <button
            type="button"
            className="hp-mailbox-cta"
            onClick={() => {onClose();setTimeout(onOpenMailbox, 200);}}>
            
            <span className="hp-mailbox-icon">✉</span>
            <span>
              <strong>open mailbox →</strong>
              <span className="hp-mailbox-sub">we'll prefill it with a "hang in there" message you can edit.</span>
            </span>
          </button>
        </div>
      </Modal>);

  }

  // Expose everything used by app.jsx / gate.jsx
  Object.assign(window, {
    FundsCard,
    FundsModal,
    FundsFamilyTile,
    FundsHelpPanel,
    fundsHelpDefaultDraft: () => "hey — heard you were running low. hang in there 💌 you got this."
  });
})();