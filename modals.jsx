/* global React */
(function () {
  const { useState, useEffect, useRef } = React;

  // =========================================================
  // MODAL SHELL
  // =========================================================
  function Modal({ children, onClose, title, lead }) {
    useEffect(() => {
      const onKey = (e) => {if (e.key === "Escape") onClose();};
      window.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
      return () => {
        window.removeEventListener("keydown", onKey);
        document.body.style.overflow = "";
      };
    }, [onClose]);

    return (
      <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        {title && <h2>{title}</h2>}
        {lead && <p className="lead">{lead}</p>}
        {children}
      </div>
    </div>);

  }

  // =========================================================
  // SHARED — kawaii sticker padlock (sun-bowl art style: black outline,
  // flat fill, soft highlight, tiny chibi face). Exported for board cards.
  // =========================================================
  function LockBadge({ size = 64, mood = "sleep" }) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" className="lock-badge"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* shackle */}
      <path d="M 20 30 L 20 22 a 12 12 0 0 1 24 0 L 44 30"
        fill="none" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
      <path d="M 25 30 L 25 22 a 7 7 0 0 1 14 0 L 39 30"
        fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
      {/* body */}
      <rect x="14" y="29" width="36" height="28" rx="7"
        fill="var(--butter-deep)" stroke="var(--ink)" strokeWidth="3" />
      {/* warm underside shade */}
      <path d="M 17 50 q 15 8 30 0 v 2 a 7 7 0 0 1 -3 5 H 20 a 7 7 0 0 1 -3 -5 Z"
        fill="#e09a17" opacity="0.45" />
      {/* highlight */}
      <ellipse cx="23" cy="37" rx="3.4" ry="5" fill="rgba(255,255,255,0.55)" />
      {/* keyhole */}
      <circle cx="32" cy="41" r="3.4" fill="var(--ink)" />
      <rect x="30.6" y="42" width="2.8" height="7" rx="1.2" fill="var(--ink)" />
      {/* tiny sleepy face */}
      {mood === "sleep" ?
        <g stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M 23 52 q 2 -2 4 0" />
          <path d="M 37 52 q 2 -2 4 0" />
        </g> :

        <g fill="var(--ink)">
          <circle cx="25" cy="52" r="1.6" />
          <circle cx="39" cy="52" r="1.6" />
        </g>
        }
    </svg>);

  }

  // =========================================================
  // LOCKED MODAL — shown when a move-in-gated section is tapped early
  // =========================================================
  function LockedModal({ section, onClose }) {
    return (
      <Modal onClose={onClose} title="locked till move-in">
      <div className="locked-panel">
        <div className="locked-art">
          <LockBadge size={120} />
        </div>
        <div className="locked-chip">
          <span className="locked-dot"></span>
          unlocks on move-in day
        </div>
      </div>
    </Modal>);

  }

  // =========================================================
  // MEMORY WALL — UNDER CONSTRUCTION (photos hidden until ready)
  // =========================================================
  function MemoryWallModal({ onClose }) {
    return (
      <Modal
        onClose={onClose}
        title="the memory wall"
        lead="still being built — the photos aren't hung yet.">
        
      <div className="construction-panel">
        <div className="construction-tape construction-tape-top">under construction</div>
        <div className="construction-art" aria-hidden="true">
          {/* sticker-style caution sign */}
          <svg width="140" height="128" viewBox="0 0 140 128" xmlns="http://www.w3.org/2000/svg">
            {/* post */}
            <rect x="64" y="74" width="12" height="46" rx="3" fill="#c89b5a" stroke="var(--ink)" strokeWidth="3" />
            {/* diamond sign */}
            <g transform="rotate(45 70 48)">
              <rect x="40" y="18" width="60" height="60" rx="10"
                fill="var(--butter)" stroke="var(--ink)" strokeWidth="4" />
            </g>
            {/* exclamation */}
            <rect x="66" y="30" width="8" height="26" rx="4" fill="var(--ink)" />
            <circle cx="70" cy="64" r="4.6" fill="var(--ink)" />
          </svg>
        </div>
        <p className="construction-msg">

          </p>
        <div className="construction-tape construction-tape-bottom">under construction</div>
      </div>
    </Modal>);

  }

  // =========================================================
  // ADVICE STACK (deck of sticky notes)
  // =========================================================
  const advice = [
  {
    title: "on roommates",
    body: "if she eats your snacks once, fine. twice, label everything. three times, start labeling things as fake — 'rotten yogurt' on a perfectly good yogurt. trust me.",
    color: "c-pink",
    tag: "01 / dorm life"
  },
  {
    title: "8 a.m. classes",
    body: "a trap. a beautiful, well-intentioned trap. do not sign up for one because 'i'll just get up.' you will not. you cannot. nobody can.",
    color: "c-butter",
    tag: "02 / scheduling"
  },
  {
    title: "the dining hall",
    body: "cereal counts as a meal. cereal at 11pm also counts as a meal. the soft serve machine is your friend. that's the whole tip.",
    color: "c-mint",
    tag: "03 / food"
  },
  {
    title: "on cs homework",
    body: "when your code 'works' but you don't know why — write a comment. when it 'doesn't work' and you don't know why — also write a comment. comments are free.",
    color: "c-blue",
    tag: "04 / studying"
  },
  {
    title: "homesick days",
    body: "facetime mom. facetime the dog. send me a meme so cursed i have to acknowledge you exist. then go outside for 10 min. it helps. annoyingly.",
    color: "c-lav",
    tag: "05 / feels"
  },
  {
    title: "going out",
    body: "go to literally everything in the first month. the trivia night. the boba club. the random hall thing. you can opt out later when you have friends. saying no early = lonely.",
    color: "c-coral",
    tag: "06 / social"
  },
  {
    title: "on debugging",
    body: "rubber duck it. or text me, i'm a free rubber duck with attitude. 90% of bugs are a typo and you'll find it the second you explain the problem out loud.",
    color: "c-mint",
    tag: "07 / cs survival"
  },
  {
    title: "the real one",
    body: "you don't have to have it figured out. nobody does. not your roommate, not the senior who 'has it together,' not me. you'll be okay. you're already more capable than you think.",
    color: "c-pink",
    tag: "08 / okay i'm being nice"
  }];


  function AdviceModal({ onClose }) {
    const [i, setI] = useState(0);
    const prev = () => setI((p) => (p - 1 + advice.length) % advice.length);
    const next = () => setI((p) => (p + 1) % advice.length);
    const cur = advice[i];

    return (
      <Modal
        onClose={onClose}
        title="advice for college caiah"
        lead="(you didn't ask. you're getting it anyway. that's the deal.)">
        
      <div className="advice-deck">
        {/* stacked card peek for depth */}
        {[2, 1, 0].map((offset) => {
            const idx = (i + offset) % advice.length;
            const c = advice[idx];
            const peekStyle = offset === 0 ?
            { transform: "rotate(-1deg)", zIndex: 3 } :
            offset === 1 ?
            { transform: "translate(10px, 12px) rotate(2deg) scale(0.98)", zIndex: 2, opacity: 0.7 } :
            { transform: "translate(20px, 24px) rotate(-3deg) scale(0.96)", zIndex: 1, opacity: 0.45 };
            return (
              <div
                key={offset}
                className={`advice-card ${c.color}`}
                style={peekStyle}>
                
              {offset === 0 &&
                <>
                  <div>
                    <h3>{cur.title}</h3>
                    <p>{cur.body}</p>
                  </div>
                  <div className="meta">
                    <span>{cur.tag}</span>
                    <span>{i + 1} / {advice.length}</span>
                  </div>
                </>
                }
            </div>);

          })}
      </div>
      <div className="deck-nav">
        <button onClick={prev} aria-label="Previous">‹</button>
        <div className="dots">
          {advice.map((_, idx) =>
            <span key={idx} className={`dot ${idx === i ? "active" : ""}`} />
            )}
        </div>
        <button onClick={next} aria-label="Next">›</button>
      </div>
    </Modal>);

  }

  // =========================================================
  // BUCKET LIST
  // =========================================================
  const initialBucket = [
  { text: "survive welcome week", done: false },
  { text: "find the best dining hall cookie", done: false },
  { text: "make 1 friend in your first cs lecture", done: false },
  { text: "go to a UDel basketball game (just once)", done: false },
  { text: "learn at least one new k-pop dance per semester", done: false },
  { text: "see the blue hen statue at least 3 times", done: false },
  { text: "submit one piece of art to a campus show", done: false },
  { text: "explore Main Street for the secret good food spot", done: false },
  { text: "write your first 'hello world' in a college class", done: false },
  { text: "call home unprompted (i'll know)", done: false },
  { text: "join one club that scares you a little", done: false },
  { text: "stay up too late on a random tuesday with friends", done: false }];


  function BucketModal({ onClose }) {
    const [items, setItems] = useState(() => {
      try {
        const saved = localStorage.getItem("caiah-bucket");
        if (saved) return JSON.parse(saved);
      } catch (e) {}
      return initialBucket;
    });
    useEffect(() => {
      try {localStorage.setItem("caiah-bucket", JSON.stringify(items));} catch (e) {}
    }, [items]);

    const toggle = (idx) => {
      setItems((prev) => prev.map((it, i) => i === idx ? { ...it, done: !it.done } : it));
    };

    const doneCount = items.filter((i) => i.done).length;
    const pct = Math.round(doneCount / items.length * 100);

    return (
      <Modal
        onClose={onClose}
        title="college bucket list"
        lead="check 'em off as you go. i'll check them too. i'll know.">
        
      <div className="bucket-page">
        <ul className="bucket-list">
          {items.map((it, idx) =>
            <li key={idx} className={it.done ? "done" : ""} onClick={() => toggle(idx)}>
              <span className="box"></span>
              <span className="text">{it.text}</span>
            </li>
            )}
        </ul>
      </div>
      <div className="bucket-progress">
        <span>{doneCount} / {items.length}</span>
        <div className="bar"><div className="fill" style={{ width: `${pct}%` }}></div></div>
        <span>{pct}%</span>
      </div>
    </Modal>);

  }

  // =========================================================
  // CARE PACKAGE
  // =========================================================
  const careItems = [
  {
    glyph: "✿",
    label: "UDel student portal",
    desc: "udel.edu — bookmark it. you'll live here.",
    href: "https://www.udel.edu",
    color: "c-1"
  },
  {
    glyph: "✎",
    label: "CS @ UDel",
    desc: "cis.udel.edu — your home department",
    href: "https://www.cis.udel.edu",
    color: "c-2"
  },
  {
    glyph: "♪",
    label: "study playlist (yours to make)",
    desc: "open spotify. make 'caiah's grind' playlist. thank me later.",
    href: "https://open.spotify.com",
    color: "c-3"
  },
  {
    glyph: "✦",
    label: "free coding practice",
    desc: "leetcode-style problems for when you're bored (or not)",
    href: "https://exercism.org",
    color: "c-4"
  },
  {
    glyph: "✷",
    label: "free art tools",
    desc: "krita, blender, procreate dreams — keep making things",
    href: "https://krita.org",
    color: "c-5"
  },
  {
    glyph: "❤",
    label: "call home button",
    desc: "this one just opens facetime. or your phone app. or me.",
    href: "tel:",
    color: "c-6"
  }];


  function CareModal({ onClose }) {
    return (
      <Modal
        onClose={onClose}
        title="the care package"
        lead="the digital version. real one is en route.">
        
      <div className="care-grid">
        {careItems.map((c, i) =>
          <a
            key={i}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`care-item ${c.color}`}>
            
            <div className="glyph">{c.glyph}</div>
            <div className="label">{c.label}</div>
            <div className="desc">{c.desc}</div>
          </a>
          )}
      </div>
      <p style={{
          fontFamily: "var(--font-print)",
          fontSize: 14,
          color: "var(--ink-soft)",
          marginTop: 22,
          textAlign: "center"
        }}>
        ✶ links are placeholders / starting points — swap in your actual go-tos.
      </p>
    </Modal>);

  }

  Object.assign(window, { Modal, MemoryWallModal, AdviceModal, BucketModal, CareModal, LockedModal, LockBadge });
})();