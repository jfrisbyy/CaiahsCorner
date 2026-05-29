/* global React, ReactDOM */
(function () {
  const { useState, useEffect, useRef, useMemo } = React;
  const {
    MemoryWallModal, AdviceModal, BucketModal, CareModal, CutoutLayer,
    JournalModal, WishlistModal, CountdownWidget,
    MailboxCard, MailboxModal, MailboxButton,
    FeedCard, FeedModal, PublicFeedModal, PublicFeedTile,
    FundsCard, FundsModal,
    CollectionModal,
    LockedModal, LockBadge,
    useLayout, BUILTIN_IDS,
    LayoutSlot, CustomCard, SectionHeader, AddCardSheet, EditSheet, LayoutToolbar,
    useViewer, ChoiceScreen, PasswordScreen, FamilyView, ChangePasswordModal
  } = window;

  const BUILTIN_COLS = {
    memory: 7, advice: 5, bucket: 4, journal: 4, wishlist: 4,
    funds: 6, feed: 12, care: 6, letter: 12
  };

  // =========================================================
  // LAUNCH GATING — under-construction / move-in locks
  // Flip MOVED_IN to true once Caiah is on campus to unlock everything.
  // (Could later be wired to a move-in date instead of a hard flag.)
  // =========================================================
  const MOVED_IN = false;
  const LOCKED_SECTIONS = { advice: true, bucket: true, care: true };
  const isSectionLocked = (id) => !MOVED_IN && !!LOCKED_SECTIONS[id];

  // =========================================================
  // =========================================================
  // MUSIC PLAYER — Caiah's real playlist. Shuffles on load and
  // autoplays; advances automatically when a track ends.
  // =========================================================
  const tracks = [
  { title: "Juna", artist: "Clairo", src: "songs/clairo-juna.mp3" },
  { title: "Crack Rock", artist: "Frank Ocean", src: "songs/crack-rock.mp3" },
  { title: "Vibrate", artist: "Daniel Caesar", src: "songs/daniel-caesar-vibrate.mp3" },
  { title: "Yogurt Shake", artist: "NCT DREAM", src: "songs/nct-dream-yogurt-shake.mp3" },
  { title: "Girl Like Me", artist: "PinkPantheress", src: "songs/pinkpantheress-girl-like-me.mp3" },
  { title: "Chk Chk Boom", artist: "Stray Kids", src: "songs/stray-kids-chk-chk-boom.mp3" }];


  function KpopPlayer() {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    // Shuffle the order once per page load.
    const order = useMemo(() => {
      const a = tracks.map((_, i) => i);
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }, []);
    const [pos, setPos] = useState(0); // index into `order`
    const idx = order[pos];
    const t = tracks[idx];

    const go = (delta) => setPos((p) => (p + delta + order.length) % order.length);

    // Load + (try to) autoplay whenever the track changes.
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.src = t.src;
      audio.load();
      const p = audio.play();
      if (p && p.then) {
        p.then(() => setPlaying(true)).catch(() => setPlaying(false));
      }
    }, [pos]);

    // Browsers block autoplay until a user gesture — start on first interaction.
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;
      const kick = () => {
        if (audio.paused) {
          audio.play().then(() => setPlaying(true)).catch(() => {});
        }
        window.removeEventListener("pointerdown", kick);
        window.removeEventListener("keydown", kick);
      };
      window.addEventListener("pointerdown", kick);
      window.addEventListener("keydown", kick);
      return () => {
        window.removeEventListener("pointerdown", kick);
        window.removeEventListener("keydown", kick);
      };
    }, []);

    const toggle = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) {
        audio.play().then(() => setPlaying(true)).catch(() => {});
      } else {
        audio.pause();
        setPlaying(false);
      }
    };

    return (
      <div className={`player ${playing ? "playing" : ""}`}>
      <audio
          ref={audioRef}
          onEnded={() => go(1)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          preload="auto" />

      <div className="cd"></div>
      <div className="info">
        <div className="track">{t.title}</div>
        <div className="artist">{t.artist}</div>
        <div className="controls">
          <button className="ctrl-btn" onClick={() => go(-1)} aria-label="Prev">⏮</button>
          <button
              className="ctrl-btn play"
              onClick={toggle}
              aria-label={playing ? "Pause" : "Play"}>
              {playing ? "❚❚" : "▶"}</button>
          <button className="ctrl-btn" onClick={() => go(1)} aria-label="Next">⏭</button>
        </div>
      </div>
    </div>);

  }

  // =========================================================
  // DOG MASCOT — cartoon black lab, barks + wags when clicked
  // =========================================================
  const dogQuotes = [
  "woof. she's cool i guess.",
  "i miss her already.",
  "tell her to come home for treats.",
  "i was here first btw.",
  "she always shared her snacks. legend.",
  "bark bark = i'm proud of u",
  "send treats. and caiah.",
  "she's annoying but she's MY annoying.",
  "did somebody say walk??",
  "she let me sleep on her bed once. iconic."];


  function DogMascot() {
    const [showSpeech, setShowSpeech] = useState(false);
    const [quote, setQuote] = useState(dogQuotes[0]);
    const [barking, setBarking] = useState(false);
    const [wagging, setWagging] = useState(false);
    const [blink, setBlink] = useState(false);
    const timerRef = useRef(null);
    const wagTimerRef = useRef(null);

    // Idle blink every few seconds
    useEffect(() => {
      const id = setInterval(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 160);
      }, 4500 + Math.random() * 1500);
      return () => clearInterval(id);
    }, []);

    // Idle tail wag occasionally
    useEffect(() => {
      const id = setInterval(() => {
        setWagging(true);
        setTimeout(() => setWagging(false), 1800);
      }, 6000);
      return () => clearInterval(id);
    }, []);

    const click = () => {
      const q = dogQuotes[Math.floor(Math.random() * dogQuotes.length)];
      setQuote(q);
      setShowSpeech(true);
      setBarking(true);
      setWagging(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (wagTimerRef.current) clearTimeout(wagTimerRef.current);
      timerRef.current = setTimeout(() => setShowSpeech(false), 3200);
      setTimeout(() => setBarking(false), 800);
      wagTimerRef.current = setTimeout(() => setWagging(false), 2500);
    };

    return (
      <div
        className={`dog ${barking ? "barking" : ""} ${wagging ? "wagging" : ""}`}
        onClick={click}
        title="click me!">
        
      <div className={`speech ${showSpeech ? "show" : ""}`}>{quote}</div>

      {/* Cartoon black lab — scrapbook style */}
      <svg
          className="dog-svg"
          width="96" height="96"
          viewBox="0 0 120 120"
          xmlns="http://www.w3.org/2000/svg">
          
        <defs>
          <linearGradient id="furGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3a2f28" />
            <stop offset="100%" stopColor="#1a1410" />
          </linearGradient>
        </defs>

        {/* ground shadow */}
        <ellipse cx="60" cy="112" rx="36" ry="4" fill="rgba(42,32,24,0.22)" />

        {/* WAGGING TAIL — behind body */}
        <g className="dog-tail">
          <path
              d="M 92 70 Q 108 60 104 46 Q 102 40 98 42"
              stroke="url(#furGrad)"
              strokeWidth="9"
              fill="none"
              strokeLinecap="round" />
            
        </g>

        {/* BACK LEG */}
        <ellipse cx="78" cy="95" rx="11" ry="14" fill="url(#furGrad)" stroke="#2a2018" strokeWidth="2.2" />
        <ellipse cx="78" cy="103" rx="9" ry="5" fill="#2a2018" />

        {/* BODY */}
        <ellipse cx="62" cy="80" rx="32" ry="22" fill="url(#furGrad)" stroke="#2a2018" strokeWidth="2.5" />

        {/* FRONT LEGS */}
        <ellipse cx="46" cy="98" rx="7" ry="14" fill="url(#furGrad)" stroke="#2a2018" strokeWidth="2.2" />
        <ellipse cx="46" cy="108" rx="8" ry="5" fill="#2a2018" />
        <ellipse cx="62" cy="98" rx="7" ry="14" fill="url(#furGrad)" stroke="#2a2018" strokeWidth="2.2" />
        <ellipse cx="62" cy="108" rx="8" ry="5" fill="#2a2018" />

        {/* CHEST FLEX (slight curve) */}
        <path d="M 38 75 Q 44 90 50 78" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />

        {/* HEAD GROUP (bobs when barking) */}
        <g className="dog-head">
          {/* head */}
          <ellipse cx="40" cy="56" rx="22" ry="20" fill="url(#furGrad)" stroke="#2a2018" strokeWidth="2.5" />

          {/* FLOPPY EARS */}
          <g className="dog-ear left">
            <path
                d="M 24 44 Q 16 48 20 64 Q 23 70 30 66 Q 32 56 30 46 Z"
                fill="#1a1410"
                stroke="#2a2018"
                strokeWidth="2.2"
                strokeLinejoin="round" />
              
            {/* inner ear */}
            <path d="M 25 50 Q 23 58 26 62" fill="none" stroke="rgba(255,180,200,0.35)" strokeWidth="2" />
          </g>
          <g className="dog-ear right">
            <path
                d="M 56 44 Q 64 48 60 64 Q 57 70 50 66 Q 48 56 50 46 Z"
                fill="#1a1410"
                stroke="#2a2018"
                strokeWidth="2.2"
                strokeLinejoin="round" />
              
            <path d="M 55 50 Q 57 58 54 62" fill="none" stroke="rgba(255,180,200,0.35)" strokeWidth="2" />
          </g>

          {/* SNOUT */}
          <ellipse cx="32" cy="62" rx="13" ry="9" fill="#2a2018" stroke="#2a2018" strokeWidth="2" />

          {/* NOSE */}
          <ellipse cx="22" cy="60" rx="4" ry="3" fill="#0d0a08" stroke="#2a2018" strokeWidth="1.5" />
          {/* nose shine */}
          <ellipse cx="21" cy="59" rx="1.2" ry="0.8" fill="rgba(255,255,255,0.5)" />

          {/* MOUTH (closed vs open during bark) */}
          <g className="dog-mouth">
            <path d="M 24 65 Q 28 68 32 65" fill="none" stroke="#1a0808" strokeWidth="1.8" strokeLinecap="round" className="mouth-closed" />
            {/* open bark mouth */}
            <ellipse cx="27" cy="68" rx="5" ry="4" fill="#5a1a1a" stroke="#2a2018" strokeWidth="1.5" className="mouth-open" />
            <path d="M 25 70 Q 27 72 29 70" fill="#ff7b9e" className="mouth-tongue" />
          </g>

          {/* EYES */}
          <g className={`dog-eye left ${blink ? "blink" : ""}`}>
            <circle cx="38" cy="50" r="3.5" fill="#0d0a08" />
            <circle cx="38.8" cy="49" r="1.1" fill="white" />
          </g>
          <g className={`dog-eye right ${blink ? "blink" : ""}`}>
            <circle cx="50" cy="50" r="3.5" fill="#0d0a08" />
            <circle cx="50.8" cy="49" r="1.1" fill="white" />
          </g>

          {/* EYEBROW SHEEN (subtle brown spots above eyes — common on black labs) */}
          <ellipse cx="38" cy="45" rx="2" ry="1.2" fill="#5c3826" opacity="0.55" />
          <ellipse cx="50" cy="45" rx="2" ry="1.2" fill="#5c3826" opacity="0.55" />

          {/* CHEEK BLUSH (matches scrapbook theme) */}
          <circle cx="34" cy="58" r="2.5" fill="#ff7b9e" opacity="0.45" />
          <circle cx="54" cy="58" r="2.5" fill="#ff7b9e" opacity="0.45" />

          {/* COLLAR */}
          <path
              d="M 30 73 Q 40 80 56 70"
              stroke="#e8b478"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round" />
            
          <path
              d="M 30 73 Q 40 80 56 70"
              stroke="#2a2018"
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="3 2"
              opacity="0.6" />
            
          {/* collar tag — bone-shaped, says "kemba" */}
          <g className="dog-tag">
            <ellipse cx="44" cy="84" rx="11" ry="6" fill="var(--butter-deep)" stroke="#2a2018" strokeWidth="1.5" />
            <text x="44" y="86.5" textAnchor="middle"
              fontFamily="Caveat, cursive" fontSize="9" fill="#2a2018" fontWeight="700"
              letterSpacing="0.5">kemba</text>
          </g>
        </g>

        {/* BARK SOUND DOODLES (visible during bark) */}
        <g className="bark-fx">
          <text x="78" y="38" fontFamily="Caveat, cursive" fontSize="22" fill="#ff7b9e" stroke="#2a2018" strokeWidth="0.6" className="bark-1">woof!</text>
          <text x="92" y="58" fontFamily="Caveat, cursive" fontSize="18" fill="#6fb3d0" stroke="#2a2018" strokeWidth="0.5" className="bark-2">arf!</text>
          <text x="14" y="36" fontFamily="Caveat, cursive" fontSize="20" fill="#ffcf4f" stroke="#2a2018" strokeWidth="0.5" className="bark-3">!!</text>
        </g>
      </svg>
    </div>);

  }

  // =========================================================
  // DOODLE SVG COMPONENTS
  // =========================================================
  const Arrow = ({ rotate = 0, color = "var(--ink)", style = {} }) =>
  <svg width="80" height="40" viewBox="0 0 80 40" style={{ transform: `rotate(${rotate}deg)`, ...style }}>
    <path d="M5 25 Q 30 5, 60 18 L 55 12 M 60 18 L 56 24"
    stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;


  const Squiggle = ({ width = "100%", color = "var(--pink-deep)" }) =>
  <svg viewBox="0 0 200 14" width={width} preserveAspectRatio="none" style={{ display: "block" }}>
    <path d="M2 8 Q 25 0, 50 8 T 100 8 T 150 8 T 198 8"
    stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
  </svg>;


  const Star = ({ size = 32, color = "var(--butter-deep)", rotate = 0 }) =>
  <svg width={size} height={size} viewBox="0 0 32 32" style={{ transform: `rotate(${rotate}deg)` }}>
    <path
      d="M16 2 L20 12 L30 13 L22 20 L24 30 L16 25 L8 30 L10 20 L2 13 L12 12 Z"
      fill={color}
      stroke="var(--ink)"
      strokeWidth="2"
      strokeLinejoin="round" />
    
  </svg>;


  const Sparkle = ({ size = 24, color = "var(--pink-deep)", style = {} }) =>
  <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
    <path d="M12 2 L13.5 10.5 L22 12 L13.5 13.5 L12 22 L10.5 13.5 L2 12 L10.5 10.5 Z"
    fill={color} stroke="var(--ink)" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>;


  const Heart = ({ size = 28, color = "var(--pink-deep)", rotate = 0 }) =>
  <svg width={size} height={size} viewBox="0 0 28 28" style={{ transform: `rotate(${rotate}deg)` }}>
    <path d="M14 25 C 14 25, 2 18, 2 10 C 2 5, 6 3, 9 3 C 11.5 3, 13 4.5, 14 7 C 15 4.5, 16.5 3, 19 3 C 22 3, 26 5, 26 10 C 26 18, 14 25, 14 25 Z"
    fill={color} stroke="var(--ink)" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>;


  const Flower = ({ size = 36, color = "var(--pink)", center = "var(--butter-deep)" }) =>
  <svg width={size} height={size} viewBox="0 0 36 36">
    {[0, 60, 120, 180, 240, 300].map((a) =>
    <ellipse
      key={a}
      cx="18" cy="9" rx="5" ry="7"
      fill={color}
      stroke="var(--ink)"
      strokeWidth="1.5"
      transform={`rotate(${a} 18 18)`} />

    )}
    <circle cx="18" cy="18" r="4.5" fill={center} stroke="var(--ink)" strokeWidth="1.5" />
  </svg>;


  const DiscSticker = ({ size = 56, top = "var(--coral)", bottom = "white", style = {} }) =>
  // original disc-shaped sticker, not Pokeball trademark
  <svg width={size} height={size} viewBox="0 0 56 56" style={style}>
    <circle cx="28" cy="28" r="25" fill={bottom} stroke="var(--ink)" strokeWidth="2.5" />
    <path d="M3 28 A 25 25 0 0 1 53 28 Z" fill={top} stroke="var(--ink)" strokeWidth="2.5" />
    <line x1="3" y1="28" x2="53" y2="28" stroke="var(--ink)" strokeWidth="2.5" />
    <circle cx="28" cy="28" r="7" fill="white" stroke="var(--ink)" strokeWidth="2.5" />
    <circle cx="28" cy="28" r="3" fill="var(--ink)" />
  </svg>;


  const BlueHen = ({ size = 70 }) =>
  // UDel blue hen mascot — original cartoon hen
  <svg width={size} height={size} viewBox="0 0 80 80">
    {/* body */}
    <ellipse cx="40" cy="50" rx="22" ry="20" fill="var(--udel-blue)" stroke="var(--ink)" strokeWidth="2.5" />
    {/* head */}
    <circle cx="40" cy="28" r="14" fill="var(--udel-blue)" stroke="var(--ink)" strokeWidth="2.5" />
    {/* comb */}
    <path d="M32 16 Q 34 10, 38 14 Q 40 9, 44 14 Q 46 10, 48 16 Z"
    fill="var(--coral)" stroke="var(--ink)" strokeWidth="2" />
    {/* eye */}
    <circle cx="44" cy="26" r="3" fill="white" stroke="var(--ink)" strokeWidth="1.5" />
    <circle cx="45" cy="26" r="1.5" fill="var(--ink)" />
    {/* beak */}
    <path d="M54 30 L 62 30 L 56 36 Z" fill="var(--udel-gold)" stroke="var(--ink)" strokeWidth="2" />
    {/* wattle */}
    <ellipse cx="55" cy="38" rx="3" ry="4" fill="var(--coral)" stroke="var(--ink)" strokeWidth="1.5" />
    {/* wing */}
    <path d="M28 48 Q 22 58, 32 64 Q 38 60, 36 50 Z"
    fill="#003e7d" stroke="var(--ink)" strokeWidth="2" />
    {/* legs */}
    <line x1="34" y1="68" x2="34" y2="76" stroke="var(--udel-gold)" strokeWidth="3" strokeLinecap="round" />
    <line x1="46" y1="68" x2="46" y2="76" stroke="var(--udel-gold)" strokeWidth="3" strokeLinecap="round" />
    <path d="M30 76 L38 76 M42 76 L50 76" stroke="var(--udel-gold)" strokeWidth="3" strokeLinecap="round" />
  </svg>;


  const BlockyAvatar = ({ size = 50 }) =>
  // generic sandbox-game blocky character — NOT Roblox's actual mark
  <svg width={size} height={size} viewBox="0 0 50 50">
    {/* head */}
    <rect x="14" y="4" width="22" height="20" fill="#ffd9a8" stroke="var(--ink)" strokeWidth="2" />
    <rect x="18" y="12" width="3" height="4" fill="var(--ink)" />
    <rect x="29" y="12" width="3" height="4" fill="var(--ink)" />
    <rect x="22" y="19" width="6" height="2" fill="var(--ink)" />
    {/* body */}
    <rect x="14" y="24" width="22" height="14" fill="var(--pink-deep)" stroke="var(--ink)" strokeWidth="2" />
    {/* arms */}
    <rect x="6" y="24" width="8" height="14" fill="#ffd9a8" stroke="var(--ink)" strokeWidth="2" />
    <rect x="36" y="24" width="8" height="14" fill="#ffd9a8" stroke="var(--ink)" strokeWidth="2" />
    {/* legs */}
    <rect x="14" y="38" width="10" height="10" fill="var(--blue-deep)" stroke="var(--ink)" strokeWidth="2" />
    <rect x="26" y="38" width="10" height="10" fill="var(--blue-deep)" stroke="var(--ink)" strokeWidth="2" />
  </svg>;


  // =========================================================
  // CONFETTI BURST
  // =========================================================
  function useConfetti() {
    const canvasRef = useRef(null);
    const burst = (x, y) => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      c.width = window.innerWidth;
      c.height = window.innerHeight;
      const colors = ["#ff7b9e", "#a8d5e8", "#ffe89c", "#c7e8c7", "#d4c5e8", "#ff8a7a"];
      const pieces = Array.from({ length: 70 }, () => ({
        x, y,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 12 - 4,
        g: 0.4 + Math.random() * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        size: 6 + Math.random() * 6,
        life: 80
      }));
      let f = 0;
      const loop = () => {
        ctx.clearRect(0, 0, c.width, c.height);
        pieces.forEach((p) => {
          p.vy += p.g;
          p.x += p.vx;
          p.y += p.vy;
          p.r += p.vr;
          p.life--;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.r);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
        });
        f++;
        if (f < 120) requestAnimationFrame(loop);else
        ctx.clearRect(0, 0, c.width, c.height);
      };
      requestAnimationFrame(loop);
    };
    return { canvasRef, burst };
  }

  // =========================================================
  // GRADUATION CELEBRATION — full-site confetti rain + banner.
  // Self-runs once on mount. (For now it fires every open; later we
  // can gate this on an actual graduation date.)
  // =========================================================
  function GraduationCelebration({ onDone }) {
    const canvasRef = useRef(null);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      let w = c.width = window.innerWidth;
      let h = c.height = window.innerHeight;
      const onResize = () => {w = c.width = window.innerWidth;h = c.height = window.innerHeight;};
      window.addEventListener("resize", onResize);

      const colors = ["#ff7b9e", "#a8d5e8", "#ffe89c", "#c7e8c7", "#d4c5e8", "#ff8a7a", "#ffcf4f", "#6fb3d0"];
      const RAIN_MS = 5200; // how long new confetti keeps spawning
      const start = performance.now();

      // seed a population spread across the full width, staggered above the top
      const pieces = [];
      const spawn = (n) => {
        for (let i = 0; i < n; i++) {
          pieces.push({
            x: Math.random() * w,
            y: -20 - Math.random() * h * 0.6,
            vx: (Math.random() - 0.5) * 3,
            vy: 2.5 + Math.random() * 3.5,
            g: 0.03 + Math.random() * 0.04,
            color: colors[Math.random() * colors.length | 0],
            r: Math.random() * Math.PI,
            vr: (Math.random() - 0.5) * 0.3,
            size: 7 + Math.random() * 8,
            sway: Math.random() * Math.PI * 2,
            swaySpeed: 0.02 + Math.random() * 0.03,
            ribbon: Math.random() < 0.35
          });
        }
      };
      spawn(160);

      // pop the banner in shortly after the rain starts
      const bannerOn = setTimeout(() => setShowBanner(true), 250);
      const bannerOff = setTimeout(() => setShowBanner(false), 4200);

      let raf;
      const loop = (now) => {
        const elapsed = now - start;
        if (elapsed < RAIN_MS && pieces.length < 420) spawn(6);
        ctx.clearRect(0, 0, w, h);
        for (let i = pieces.length - 1; i >= 0; i--) {
          const p = pieces[i];
          p.vy += p.g;
          p.sway += p.swaySpeed;
          p.x += p.vx + Math.sin(p.sway) * 1.1;
          p.y += p.vy;
          p.r += p.vr;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.r);
          ctx.fillStyle = p.color;
          if (p.ribbon) ctx.fillRect(-p.size / 2, -p.size, p.size * 0.5, p.size * 2);else
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
          if (p.y > h + 40) pieces.splice(i, 1);
        }
        if (elapsed < RAIN_MS || pieces.length > 0) {
          raf = requestAnimationFrame(loop);
        } else {
          ctx.clearRect(0, 0, w, h);
          onDone && onDone();
        }
      };
      raf = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(bannerOn);
        clearTimeout(bannerOff);
        window.removeEventListener("resize", onResize);
      };
    }, []);

    return (
      <div className="grad-celebration" aria-hidden="true">
        <canvas ref={canvasRef} className="grad-confetti-canvas"></canvas>
        <div className={`grad-banner ${showBanner ? "in" : ""}`}>
          <div className="grad-banner-inner">
            <span className="grad-cap">🎓</span>
            <span className="grad-text">congrats, grad!</span>
            <span className="grad-cap">🎉</span>
          </div>
          <div className="grad-sub">you did the whole thing. welcome to caiah's corner.</div>
        </div>
      </div>);

  }

  // =========================================================
  // CAPSULE INTRO — shake, flash, open
  // =========================================================
  function CapsuleIntro({ onEnter }) {
    const [stage, setStage] = useState("idle"); // idle, shake, open, gone

    const click = () => {
      if (stage !== "idle") return;
      setStage("shake");
      // After shake → open flash; reveal corner mid-flash for seamless transition
      setTimeout(() => setStage("open"), 1150);
      setTimeout(onEnter, 1500); // start showing the corner behind the flash
      setTimeout(() => setStage("gone"), 2100); // remove the intro layer
    };

    if (stage === "gone") return null;

    return (
      <div className={`capsule-intro stage-${stage}`}>
      {/* Floating doodles in background */}
      <div className="bg-doodles">
        <span className="bd s1">✦</span>
        <span className="bd s2">♥</span>
        <span className="bd s3">✿</span>
        <span className="bd s4">★</span>
        <span className="bd s5">✦</span>
        <span className="bd s6">♡</span>
        <span className="bd s7">✿</span>
        <span className="bd s8">★</span>
      </div>

      <div className="intro-stack">
        <div className="intro-eyebrow"></div>

        <div className="capsule-area" onClick={click}>
          <div className="capsule-shadow"></div>
          <svg className="capsule" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
            {/* shadow glow */}
            <defs>
              <radialGradient id="shine" cx="35%" cy="30%" r="40%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              <filter id="rough">
                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="t" />
                <feDisplacementMap in="SourceGraphic" in2="t" scale="1.2" />
              </filter>
            </defs>

            {/* BOTTOM HALF (cream) */}
            <g className="cap-bottom">
              <path
                  d="M 18 110 A 92 92 0 0 0 202 110 Z"
                  fill="var(--paper)"
                  stroke="var(--ink)"
                  strokeWidth="6"
                  strokeLinejoin="round" />
                
              {/* tiny doodle */}
              <text x="110" y="170" textAnchor="middle"
                fontFamily="Caveat, cursive" fontSize="18" fill="var(--ink-soft)" opacity="0.55">
                caiah&apos;s
              </text>
            </g>

            {/* TOP HALF (pink) */}
            <g className="cap-top">
              <path
                  d="M 18 110 A 92 92 0 0 1 202 110 Z"
                  fill="var(--pink-deep)"
                  stroke="var(--ink)"
                  strokeWidth="6"
                  strokeLinejoin="round" />
                
              {/* highlight */}
              <ellipse cx="78" cy="60" rx="26" ry="14"
                fill="rgba(255,255,255,0.55)" transform="rotate(-20 78 60)" />
              {/* sparkle */}
              <text x="130" y="50" fontFamily="Caveat, cursive" fontSize="26" fill="white" opacity="0.9">✦</text>
            </g>

            {/* BAND */}
            <g className="cap-band">
              <line x1="18" y1="110" x2="202" y2="110" stroke="var(--ink)" strokeWidth="8" strokeLinecap="round" />
              {/* small dashes */}
              <line x1="32" y1="105" x2="42" y2="105" stroke="white" strokeWidth="2" opacity="0.7" />
              <line x1="178" y1="105" x2="188" y2="105" stroke="white" strokeWidth="2" opacity="0.7" />
            </g>

            {/* CENTER BUTTON */}
            <g className="cap-button">
              <circle cx="110" cy="110" r="24" fill="white" stroke="var(--ink)" strokeWidth="6" />
              <circle cx="110" cy="110" r="11" fill="var(--butter)" stroke="var(--ink)" strokeWidth="3" />
              <circle cx="106" cy="106" r="3" fill="white" />
            </g>
          </svg>

          {/* Sparkles when about to be tapped */}
          <div className="capsule-sparkles">
            <span>✦</span><span>✦</span><span>✦</span><span>✦</span>
          </div>

          {/* Flash burst (during opening) */}
          <div className="flash-burst"></div>
        </div>

        <h1 className="intro-title">caiah&apos;s corner</h1>
        <div className="intro-squiggle">
          <Squiggle width={320} />
        </div>
        <div className="intro-prompt">
          <span className="finger">☞</span>
          <span>tap the Poké Ball  to open</span>
        </div>
      </div>
    </div>);

  }

  // =========================================================
  // JOURNAL CARD — preview of today's mood + streak
  // =========================================================
  function JournalCard({ onClick }) {
    const [tick, setTick] = useState(0);
    // re-read storage when this card mounts / on click changes
    const data = useMemo(() => {
      try {
        const saved = localStorage.getItem("caiah-journal");
        const entries = saved ? JSON.parse(saved) : [];
        const today = (() => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        })();
        const todayEntry = entries.find((e) => e.date === today);
        // streak
        let current = 0;
        const dates = new Set(entries.map((e) => e.date));
        const d = new Date();
        while (dates.has(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)) {
          current++;
          d.setDate(d.getDate() - 1);
        }
        return { todayEntry, streak: current, total: entries.length };
      } catch (e) {return { todayEntry: null, streak: 0, total: 0 };}
    }, [tick]);

    // poll lightly while card is on screen (so streak updates after editing)
    useEffect(() => {
      const id = setInterval(() => setTick((t) => t + 1), 2000);
      return () => clearInterval(id);
    }, []);

    return (
      <div
        className="col-4 paper-card clickable"
        onClick={onClick}
        style={{ background: "var(--blue)", transform: "rotate(0.8deg)" }}>
        
      <div className="tape mint tl"></div>
      <div className="tape pink tr"></div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-soft)", textTransform: "uppercase", marginBottom: 6 }}>

        </div>
      <h2 style={{ fontFamily: "var(--font-hand)", fontSize: 48, margin: "0 0 6px", lineHeight: 0.9 }}>
        the daily scrap
      </h2>
      <p style={{ fontFamily: "var(--font-print)", fontSize: 16, color: "var(--ink-soft)", margin: "0 0 12px" }}>

        </p>
      <div style={{
          background: "white",
          border: "2px solid var(--ink)",
          borderRadius: 10,
          padding: "10px 12px",
          boxShadow: "2px 2px 0 var(--ink)",
          display: "flex",
          alignItems: "center",
          gap: 10
        }}>
        <div style={{
            fontFamily: "var(--font-hand)",
            fontSize: 32,
            lineHeight: 1,
            color: "var(--pink-deep)",
            fontWeight: 700
          }}>{data.streak}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600 }}>
            day streak
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", color: "var(--ink-soft)", textTransform: "uppercase" }}>
            {data.todayEntry ? "✓ today done" : "today empty"}
          </div>
        </div>
        <span style={{ fontFamily: "var(--font-hand)", fontSize: 26, color: "var(--ink-soft)" }}>→</span>
      </div>
    </div>);

  }

  // =========================================================
  // WISHLIST CARD — preview of next few items
  // =========================================================
  function WishlistCard({ onClick }) {
    const [tick, setTick] = useState(0);
    const data = useMemo(() => {
      try {
        const saved = localStorage.getItem("caiah-wishlist");
        const items = saved ? JSON.parse(saved) : [];
        return {
          remaining: items.filter((i) => !i.received),
          got: items.filter((i) => i.received),
          items
        };
      } catch (e) {return { remaining: [], got: [], items: [] };}
    }, [tick]);

    useEffect(() => {
      const id = setInterval(() => setTick((t) => t + 1), 2000);
      return () => clearInterval(id);
    }, []);

    return (
      <div
        className="col-4 paper-card clickable"
        onClick={onClick}
        style={{ background: "var(--pink)", transform: "rotate(-0.9deg)" }}>
        
      <div className="tape yellow center"></div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-soft)", textTransform: "uppercase", marginBottom: 6 }}>

        </div>
      <h2 style={{ fontFamily: "var(--font-hand)", fontSize: 48, margin: "0 0 10px", lineHeight: 0.9 }}>
        wishlist
      </h2>
      {data.items.length === 0 ?
        <p style={{ fontFamily: "var(--font-hand)", fontSize: 22, color: "var(--ink-soft)", margin: 0, lineHeight: 1.3 }}>
          add what you need.<br />copy → send to mom.
        </p> :

        <>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 8px", fontFamily: "var(--font-hand)", fontSize: 20, lineHeight: 1.4 }}>
            {data.remaining.slice(0, 3).map((it, i) =>
            <li key={it.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ color: "var(--ink-soft)" }}>☐</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.text}</span>
              </li>
            )}
            {data.got.slice(0, Math.max(0, 3 - data.remaining.length)).map((it, i) =>
            <li key={it.id} style={{ display: "flex", gap: 6, alignItems: "center", textDecoration: "line-through", color: "var(--ink-soft)" }}>
                <span>☑</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.text}</span>
              </li>
            )}
          </ul>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", color: "var(--ink-soft)", textTransform: "uppercase" }}>
            {data.remaining.length} wanted · {data.got.length} got
          </div>
        </>
        }
    </div>);

  }

  // =========================================================
  // MAIN APP
  // =========================================================
  function App() {
    const [entered, setEntered] = useState(false);
    const [modal, setModal] = useState(null);
    const [hen, setHen] = useState(false);
    const [eggs, setEggs] = useState({ disc1: false, disc2: false, star: false, hen: false });
    const [decorateMode, setDecorateMode] = useState(false);
    const { canvasRef, burst } = useConfetti();
    const [grad, setGrad] = useState(false);

    // === VIEWER GATE ===
    const { viewer, setViewer, lock } = useViewer();
    const [gateStep, setGateStep] = useState("choice"); // 'choice' | 'password'
    const [lockMenu, setLockMenu] = useState(false);

    // Fire the graduation celebration only once Caiah unlocks her own corner
    // (not on capsule open, and not for family view). Plays once per unlock.
    const gradShownRef = useRef(false);
    useEffect(() => {
      if (entered && viewer === "caiah" && !gradShownRef.current) {
        gradShownRef.current = true;
        setGrad(true);
      }
      // reset so it can replay if she locks back out and returns
      if (viewer !== "caiah") gradShownRef.current = false;
    }, [entered, viewer]);

    // === LAYOUT EDITING ===
    const {
      layout, moveItem, removeItem, addItem, updateItem, restoreBuiltin, resetLayout
    } = useLayout();
    const [editing, setEditing] = useState(false);
    const [draggingIdx, setDraggingIdx] = useState(null);
    const [showAdd, setShowAdd] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [openCollection, setOpenCollection] = useState(null); // collection-card detail modal

    // Listen for decorate-mode broadcasts from CutoutLayer
    useEffect(() => {
      const h = (e) => setDecorateMode(!!e.detail);
      window.addEventListener("decorate-mode", h);
      return () => window.removeEventListener("decorate-mode", h);
    }, []);

    // Cutout layer "edit page" tool jumps into layout edit mode
    useEffect(() => {
      const h = () => setEditing(true);
      window.addEventListener("request-edit-page", h);
      return () => window.removeEventListener("request-edit-page", h);
    }, []);

    const open = (m, e) => {
      if (decorateMode) return; // ← scene cards inert while decorating
      if (editing) return; // ← cards inert while editing layout
      if (isSectionLocked(m)) {setModal("locked:" + m);return;}
      setModal(m);
      if (e && e.currentTarget) {
        const r = e.currentTarget.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2);
      }
    };

    const popEgg = (key, e) => {
      if (decorateMode) return;
      if (eggs[key]) return;
      setEggs((g) => ({ ...g, [key]: true }));
      if (e) {
        const x = e.clientX || e.currentTarget && e.currentTarget.getBoundingClientRect().left + 20;
        const y = e.clientY || e.currentTarget && e.currentTarget.getBoundingClientRect().top + 20;
        burst(x, y);
      }
    };

    const foundEggs = Object.values(eggs).filter(Boolean).length;

    return (
      <>
      {!entered && <CapsuleIntro onEnter={() => setEntered(true)} />}

      <canvas ref={canvasRef} className="confetti-canvas"></canvas>

      {entered && viewer === "caiah" && grad && <GraduationCelebration onDone={() => setGrad(false)} />}

      {/* Once the capsule is open, gate the corner by viewer */}
      {entered && viewer !== "caiah" &&
        <>
          {viewer === "family" ?
          <FamilyView
            onSwitchToCaiah={() => {setGateStep("password");setViewer(null);}}
            onLockBack={() => {setGateStep("choice");setViewer(null);}} /> :

          gateStep === "password" ?
          <PasswordScreen
            onUnlock={() => setViewer("caiah")}
            onBack={() => setGateStep("choice")} /> :


          <ChoiceScreen
            onPickCaiah={() => setGateStep("password")}
            onPickFamily={() => setViewer("family")} />

          }
        </>
        }

      {/* THE FULL CORNER — only for caiah */}
      {entered && viewer === "caiah" &&
        <>

      <div className={`scene ${editing ? "editing-layout" : ""}`}>
        {/* TITLE */}
        <div className="title-block">
          <div className="superscript">welcome to</div>
          <h1>
            caiah's corner
            <span className="squiggle"><Squiggle /></span>
          </h1>
          <div className="tagline"></div>

          {/* floating stickers around title */}
          <div className="float-sticker" style={{ top: -10, left: "8%", "--rot": "-12deg", animationDelay: "0s" }}>
            <Star size={42} color="var(--butter)" rotate={-12} />
          </div>
          <div className="float-sticker" style={{ top: 30, right: "10%", "--rot": "8deg", animationDelay: "1.5s" }}>
            <Heart size={36} color="var(--pink)" rotate={8} />
          </div>
          <div className="float-sticker" style={{ bottom: -20, left: "18%", "--rot": "-6deg", animationDelay: "0.8s" }}>
            <Flower />
          </div>
          <div className="float-sticker" style={{ bottom: -15, right: "20%", "--rot": "12deg", animationDelay: "2.2s" }}>
            <Sparkle size={28} color="var(--lavender-deep)" />
          </div>
        </div>

        {/* MAIN BOARD — rendered from layout.items so user can rearrange */}
        {(() => {
              const BUILTIN_ELEMENTS = {
                memory:
                <div className="paper-card clickable tilt-l card-construction" onClick={(e) => open("memory", e)}>
            <div className="tape pink tl"></div>
            <div className="tape blue tr"></div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={{ fontFamily: "var(--font-hand)", fontSize: 56, margin: 0, lineHeight: 0.9 }}>
                the memory wall
              </h2>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-soft)", textTransform: "uppercase" }}>
                soon ↗
              </span>
            </div>
            <div className="card-construction-body">
              <div className="card-construction-tape">under construction</div>
              <p style={{ fontFamily: "var(--font-print)", fontSize: 17, color: "var(--ink-soft)", margin: "14px 0 0", maxWidth: 480 }}>

                    </p>
            </div>
          </div>,

                // === ADVICE STACK ===
                advice:
                <div className={`paper-card clickable tilt-r${isSectionLocked("advice") ? " card-locked" : ""}`} onClick={(e) => open("advice", e)} style={{ background: "var(--butter)" }}>
            {isSectionLocked("advice") &&
                  <div className="card-lock-overlay">
                <LockBadge size={58} />
                <span className="card-lock-label">opens at move-in</span>
              </div>
                  }
            <div className="tape mint center wide"></div>
            <h2 style={{ fontFamily: "var(--font-hand)", fontSize: 50, margin: "8px 0 4px", lineHeight: 0.9 }}>
              unsolicited advice
            </h2>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-soft)", textTransform: "uppercase", marginBottom: 14 }}>
              for the college era · 8 cards
            </div>
            <p style={{ fontFamily: "var(--font-hand)", fontSize: 22, color: "var(--ink)", margin: 0, lineHeight: 1.25 }}>
              "you didn't ask. <br />you're getting it. <br />that's the deal."
            </p>
            <div style={{ marginTop: 18, display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", color: "var(--ink-soft)", textTransform: "uppercase" }}>open the stack →</span>
            </div>
          </div>,

                // === BUCKET LIST ===
                bucket:
                <div className={`paper-card clickable${isSectionLocked("bucket") ? " card-locked" : ""}`} onClick={(e) => open("bucket", e)} style={{ background: "white", transform: "rotate(-1deg)" }}>
            {isSectionLocked("bucket") &&
                  <div className="card-lock-overlay">
                <LockBadge size={58} />
                <span className="card-lock-label">opens at move-in</span>
              </div>
                  }
            <div className="tape pink center"></div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-soft)", textTransform: "uppercase", marginBottom: 6 }}>
              to-do · freshman year
            </div>
            <h2 style={{ fontFamily: "var(--font-hand)", fontSize: 48, margin: "0 0 10px", lineHeight: 0.9 }}>
              bucket list
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontFamily: "var(--font-hand)", fontSize: 22, lineHeight: 1.5 }}>
              <li>☐ survive welcome week</li>
              <li style={{ textDecoration: "line-through", textDecorationColor: "var(--coral)", color: "var(--ink-soft)" }}>☑ graduate hs</li>
              <li>☐ best dining hall cookie</li>
              <li>☐ ...8 more</li>
            </ul>
          </div>,

                // === DAILY SCRAP (JOURNAL) ===
                journal: <JournalCard onClick={(e) => open("journal", e)} />,

                // === WISHLIST ===
                wishlist: <WishlistCard onClick={(e) => open("wishlist", e)} />,

                // === FUNDS (money tracker) ===
                funds: <FundsCard onClick={(e) => open("funds", e)} />,

                // === KEEP UP (PHOTO FEED) ===
                feed: <FeedCard onClick={(e) => open("feed", e)} />,

                // === CARE PACKAGE ===
                care:
                <div className={`paper-card clickable${isSectionLocked("care") ? " card-locked" : ""}`} onClick={(e) => open("care", e)} style={{ background: "var(--lavender)", transform: "rotate(-0.6deg)" }}>
            {isSectionLocked("care") &&
                  <div className="card-lock-overlay">
                <LockBadge size={58} />
                <span className="card-lock-label">opens at move-in</span>
              </div>
                  }
            <div className="tape blue tr"></div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-soft)", textTransform: "uppercase", marginBottom: 6 }}>
              survival kit · 6 items
            </div>
            <h2 style={{ fontFamily: "var(--font-hand)", fontSize: 48, margin: "0 0 10px", lineHeight: 0.9 }}>
              care package
            </h2>
            <p style={{ fontFamily: "var(--font-print)", fontSize: 16, color: "var(--ink-soft)", margin: "0 0 12px" }}>
              the digital kind. links you'll actually need at UDel.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["udel", "cs", "spotify", "art", "+more"].map((t, i) =>
                    <span key={i} style={{
                      background: "white",
                      border: "1.5px solid var(--ink)",
                      borderRadius: 999,
                      padding: "3px 10px",
                      fontFamily: "var(--font-display)",
                      fontWeight: 500,
                      fontSize: 12
                    }}>{t}</span>
                    )}
            </div>
          </div>,

                // === THE LETTER ===
                letter:
                <div className="paper-card" style={{ background: "white", transform: "rotate(-0.4deg)", padding: "40px 50px" }}>
            <div className="tape pink tl"></div>
            <div className="tape mint tr"></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 30, alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-soft)", textTransform: "uppercase", marginBottom: 8 }}>

                      </div>
                <h2 style={{ fontFamily: "var(--font-hand)", fontSize: 54, margin: "0 0 12px", lineHeight: 0.95 }}>
                  caiah,
                </h2>
                <p style={{ fontFamily: "var(--font-print)", fontSize: 18, lineHeight: 1.55, color: "var(--ink)", margin: "0 0 12px", maxWidth: 720 }}>
                   <em>We all play many different roles in life. I'm somebody's son, somebody's friend, co-worker, neighbor; the list goes on and on. Without a doubt my absolute favorite role to play is your big brother. I am so proud of everything you've accomplished so far, and even more proud of who you have become as a young woman. It has truly been a privilege to grow up alongside you. I can't wait to continue to watch you grow, and I promise to be with you every step of the way and support in whatever way you need. 

 - Love, Juju
                        </em> 
                </p>
                <p style={{ fontFamily: "var(--font-print)", fontSize: 18, lineHeight: 1.55, color: "var(--ink)", margin: "0 0 12px", maxWidth: 720 }}>

                      </p>
                <p style={{ fontFamily: "var(--font-hand)", fontSize: 28, color: "var(--pink-deep)", margin: "10px 0 0", transform: "rotate(-2deg)", display: "inline-block" }}>

                      </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                <BlueHen size={88} />
                <div style={{ cursor: "pointer" }} onClick={(e) => popEgg("hen", e)} title="psst">
                        
                  <span style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: eggs.hen ? "var(--pink-deep)" : "var(--ink-soft)"
                        }}>
                    {eggs.hen ? "✓ hen poked!" : "pet the hen?"}
                  </span>
                </div>
              </div>
            </div>
          </div>

              };

              const presentBuiltins = new Set(layout.items.filter((i) => i.kind === 'builtin').map((i) => i.builtinId));
              const restoreOptions = BUILTIN_IDS.filter((id) => !presentBuiltins.has(id));

              return (
                <div className={`board ${editing ? 'is-editing' : ''}`} data-restore-count={restoreOptions.length}>
            {layout.items.map((item, idx) => {
                    let content = null;
                    let col;
                    if (item.kind === 'builtin') {
                      content = BUILTIN_ELEMENTS[item.builtinId];
                      col = item.col || BUILTIN_COLS[item.builtinId] || 6;
                    } else if (item.kind === 'header') {
                      content = <SectionHeader item={item} />;
                      col = 12;
                    } else {
                      content =
                      <CustomCard
                        item={item}
                        editing={editing}
                        onUpdate={(patch) => updateItem(item.id, patch)}
                        onOpen={() => setOpenCollection(item.id)} />;


                      col = item.col || 6;
                    }
                    if (!content) return null;
                    return (
                      <LayoutSlot
                        key={item.id}
                        index={idx}
                        item={{ ...item, col }}
                        editing={editing}
                        draggingIdx={draggingIdx}
                        setDraggingIdx={setDraggingIdx}
                        onMove={moveItem}
                        onDelete={() => removeItem(item.id)}
                        onEdit={() => setEditingItem(item)}
                        onResize={(newCol) => updateItem(item.id, { col: newCol })}>
                        
                  {content}
                </LayoutSlot>);

                  })}
            {editing &&
                  <button type="button" className="board-add-card" onClick={() => setShowAdd(true)}>
                <span className="bac-plus">+</span>
                <span className="bac-label">add card</span>
                {restoreOptions.length > 0 &&
                    <span className="bac-sub">or restore {restoreOptions.length} hidden</span>
                    }
              </button>
                  }
          </div>);

            })()}

        {/* SCATTERED EASTER-EGG STICKERS (interactive!) */}
        <div
              className="sticker interactive"
              style={{ top: 180, right: 30, position: "absolute", transform: `rotate(${eggs.disc1 ? "30deg" : "-8deg"}) scale(${eggs.disc1 ? "0.8" : "1"})`, opacity: eggs.disc1 ? 0.4 : 1, transition: "all 0.3s" }}
              onClick={(e) => popEgg("disc1", e)}
              title="click me">
              
          <DiscSticker size={64} top="var(--coral)" bottom="white" />
        </div>

        <div
              className="sticker interactive"
              style={{ top: 320, left: 10, position: "absolute", transform: `rotate(${eggs.star ? "180deg" : "12deg"}) scale(${eggs.star ? "0.7" : "1"})`, opacity: eggs.star ? 0.4 : 1, transition: "all 0.3s" }}
              onClick={(e) => popEgg("star", e)}
              title="click me">
              
          <Star size={54} color="var(--butter-deep)" />
        </div>

        <div
              className="sticker interactive"
              style={{ bottom: 100, right: 50, position: "absolute", transform: `rotate(${eggs.disc2 ? "200deg" : "-15deg"}) scale(${eggs.disc2 ? "0.8" : "1"})`, opacity: eggs.disc2 ? 0.4 : 1, transition: "all 0.3s" }}
              onClick={(e) => popEgg("disc2", e)}
              title="click me">
              
          <DiscSticker size={50} top="var(--blue-deep)" bottom="white" />
        </div>

        {/* DOODLES */}
        <div className="doodle" style={{ top: 280, left: "48%" }}>
          <Arrow rotate={-15} />
        </div>

        {/* blocky avatar sticker */}
        <div className="sticker" style={{ top: 540, left: 30, transform: "rotate(-10deg)" }}>
          <BlockyAvatar size={60} />
        </div>

        {/* SCATTERED FLOWERS / SPARKLES */}
        <div className="sticker" style={{ top: 80, right: 200 }}>
          <Sparkle size={20} color="var(--mint-deep)" />
        </div>
        <div className="sticker" style={{ top: 400, right: 100 }}>
          <Heart size={20} color="var(--pink)" />
        </div>
        <div className="sticker" style={{ top: 600, right: 180 }}>
          <Flower size={28} color="var(--lavender)" />
        </div>

        {/* FOOTER */}
        <div className="footer-note">
          made with love by <span className="sig">Juju</span>
          <div className="small"></div>
        </div>
      </div>

      <KpopPlayer />
      <DogMascot />
      <CountdownWidget />
      <CutoutLayer />

      {/* Top-right utility cluster — mailbox lives next to decorate.
                                                                                                    (Edit-page entry moved into the decorate toolbar.) */}
      <div className="top-tools">
        <MailboxButton onClick={() => setModal("mailbox")} />
        <div className={`lock-fab-wrap ${lockMenu ? "open" : ""}`}>
          <button
              type="button"
              className="lock-fab"
              onClick={() => setLockMenu((v) => !v)}
              title="lock & security"
              aria-label="lock and security options"
              aria-expanded={lockMenu}>
              
          <span className="ico">🔒</span>
        </button>
          {lockMenu &&
            <>
              <div className="lock-menu-scrim" onClick={() => setLockMenu(false)}></div>
              <div className="lock-menu" role="menu">
                <button
                  type="button"
                  className="lock-menu-item"
                  role="menuitem"
                  onClick={() => {setLockMenu(false);setModal("changepw");}}>
                  <span className="lmi-ico">🔑</span>
                  <span className="lmi-text">
                    <span className="lmi-title">change password</span>
                    <span className="lmi-sub">set a new one for the corner</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="lock-menu-item lock-menu-item-danger"
                  role="menuitem"
                  onClick={() => {
                    setLockMenu(false);
                    if (confirm("lock the corner? you'll need the password to get back in.")) {
                      lock();
                    }
                  }}>
                  <span className="lmi-ico">🔒</span>
                  <span className="lmi-text">
                    <span className="lmi-title">lock the site</span>
                    <span className="lmi-sub">sign out — password required to return</span>
                  </span>
                </button>
              </div>
            </>
          }
        </div>
      </div>

      <LayoutToolbar
            editing={editing}
            onToggle={() => setEditing((v) => !v)}
            onAdd={() => setShowAdd(true)}
            onReset={() => {
              if (confirm("reset to the original layout? this won't delete custom cards you've created — but they'll be removed from the page.")) {
                resetLayout();
              }
            }} />
          

      {showAdd &&
          <AddCardSheet
            onClose={() => setShowAdd(false)}
            onAdd={addItem}
            restoreOptions={BUILTIN_IDS.filter(
              (id) => !layout.items.some((it) => it.kind === "builtin" && it.builtinId === id)
            )}
            onRestore={restoreBuiltin} />

          }

      {editingItem &&
          <EditSheet
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onSave={(patch) => updateItem(editingItem.id, patch)} />

          }

      {modal === "memory" && <MemoryWallModal onClose={() => setModal(null)} />}
      {modal === "advice" && <AdviceModal onClose={() => setModal(null)} />}
      {modal === "bucket" && <BucketModal onClose={() => setModal(null)} />}
      {modal === "care" && <CareModal onClose={() => setModal(null)} />}
      {modal === "journal" && <JournalModal onClose={() => setModal(null)} />}
      {modal === "wishlist" && <WishlistModal onClose={() => setModal(null)} />}
      {modal === "mailbox" && <MailboxModal onClose={() => setModal(null)} />}
      {modal === "feed" && <FeedModal onClose={() => setModal(null)} />}
      {modal === "funds" && <FundsModal onClose={() => setModal(null)} />}

      {modal === "changepw" && <ChangePasswordModal onClose={() => setModal(null)} />}

      {typeof modal === "string" && modal.startsWith("locked:") &&
          <LockedModal section={modal.slice(7)} onClose={() => setModal(null)} />}

      {openCollection && (() => {
            const item = layout.items.find((it) => it.id === openCollection);
            if (!item) return null;
            return (
              <CollectionModal
                item={item}
                onClose={() => setOpenCollection(null)}
                onUpdate={(patch) => updateItem(item.id, patch)} />);


          })()}
      </>
        }
    </>);

  }

  // Wait for the Supabase hydration to finish (or resolve instantly in
  // localStorage-only mode) so the first render sees synced data.
  const __mount = () => ReactDOM.createRoot(document.getElementById("root")).render(<App />);
  if (window.DB && window.DB.ready && typeof window.DB.ready.then === "function") {
    window.DB.ready.then(__mount);
  } else {
    __mount();
  }
})();