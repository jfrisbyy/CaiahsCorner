/* =========================================================
   LAYOUT — let Caiah rearrange, hide, and add cards/sections
   ========================================================= */
/* global React */
(function() {
const { useState, useEffect, useRef, useCallback, useMemo } = React;
const { Modal } = window;

const LAYOUT_KEY = "caiah-layout-v1";

// Order matches the original hard-coded board — feed sits on top.
const BUILTIN_IDS = [
  "feed", "memory", "advice", "bucket", "journal", "wishlist", "care", "funds", "letter"
];

// Built-ins that USED to be cards but are now moved elsewhere — filtered out on load
const DEPRECATED_BUILTIN_IDS = ["mailbox", "game"];

const BUILTIN_LABELS = {
  memory:   "memory wall",
  advice:   "unsolicited advice",
  bucket:   "bucket list",
  journal:  "daily scrap (journal)",
  wishlist: "wishlist",
  funds:    "the funds (money tracker)",
  feed:     "keep up (photo feed)",
  care:     "care package",
  letter:   "the letter",
};

const DEFAULT_LAYOUT = {
  items: BUILTIN_IDS.map((id) => ({ id, kind: "builtin", builtinId: id })),
};

const PALETTE = [
  { key: "white",    label: "paper",    bg: "white" },
  { key: "pink",     label: "pink",     bg: "var(--pink)" },
  { key: "butter",   label: "butter",   bg: "var(--butter)" },
  { key: "mint",     label: "mint",     bg: "var(--mint)" },
  { key: "blue",     label: "blue",     bg: "var(--blue)" },
  { key: "lavender", label: "lavender", bg: "var(--lavender)" },
];

const SIZES = [
  { key: "sm", label: "small", col: 4 },
  { key: "md", label: "medium", col: 6 },
  { key: "lg", label: "wide", col: 12 },
];

const TAPE_OPTS = ["pink", "blue", "mint", "yellow"];

function uid(prefix = "c") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function loadLayout() {
  let layout;
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) layout = parsed;
    }
  } catch (e) {}
  if (!layout) {
    return { ...DEFAULT_LAYOUT, seenBuiltins: [...BUILTIN_IDS] };
  }
  // Drop any deprecated built-ins (e.g. mailbox now lives in the top-right)
  layout.items = layout.items.filter(
    (it) => !(it.kind === "builtin" && DEPRECATED_BUILTIN_IDS.includes(it.builtinId))
  );
  // Migration: append any new built-ins introduced after this layout was saved
  const seen = new Set(layout.seenBuiltins || BUILTIN_IDS.slice(0, layout.items.filter((i) => i.kind === "builtin").length));
  // If seenBuiltins missing entirely, treat all currently-present builtins as seen
  if (!layout.seenBuiltins) {
    layout.items.forEach((it) => {
      if (it.kind === "builtin") seen.add(it.builtinId);
    });
  }
  const newOnes = BUILTIN_IDS.filter((id) => !seen.has(id));
  if (newOnes.length > 0) {
    layout.items = [
      ...layout.items,
      ...newOnes.map((id) => ({ id, kind: "builtin", builtinId: id })),
    ];
  }

  // One-time tweak: pin the feed to the top of the board (above memory+advice).
  if (!layout._feedPinned) {
    const feedIdx = layout.items.findIndex(
      (it) => it.kind === "builtin" && it.builtinId === "feed"
    );
    if (feedIdx > 0) {
      const [feedItem] = layout.items.splice(feedIdx, 1);
      // ensure it spans full width by default
      if (!feedItem.col) feedItem.col = 12;
      layout.items.unshift(feedItem);
    } else if (feedIdx === 0) {
      const feedItem = layout.items[0];
      if (!feedItem.col) feedItem.col = 12;
    }
    layout._feedPinned = true;
  }

  // One-time tweak: the funds card sits directly above the letter (Juju's note).
  if (!layout._fundsAboveLetter) {
    const fundsIdx = layout.items.findIndex(
      (it) => it.kind === "builtin" && it.builtinId === "funds"
    );
    if (fundsIdx !== -1) {
      const [fundsItem] = layout.items.splice(fundsIdx, 1);
      const letterIdx = layout.items.findIndex(
        (it) => it.kind === "builtin" && it.builtinId === "letter"
      );
      if (letterIdx !== -1) layout.items.splice(letterIdx, 0, fundsItem);
      else layout.items.push(fundsItem); // no letter present → just keep funds
    }
    layout._fundsAboveLetter = true;
  }
  layout.seenBuiltins = [...BUILTIN_IDS];
  return layout;
}

function saveLayout(L) {
  try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(L)); } catch (e) {}
}

// =========================================================
// HOOK
// =========================================================
function useLayout() {
  const [layout, setLayout] = useState(loadLayout);
  useEffect(() => saveLayout(layout), [layout]);

  const moveItem = useCallback((fromIdx, toIdx) => {
    setLayout((L) => {
      if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return L;
      const items = [...L.items];
      if (fromIdx >= items.length || toIdx >= items.length) return L;
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      return { ...L, items };
    });
  }, []);

  const removeItem = useCallback((id) => {
    setLayout((L) => ({ ...L, items: L.items.filter((it) => it.id !== id) }));
  }, []);

  const addItem = useCallback((item) => {
    const id = item.id || uid(item.kind === "header" ? "h" : "c");
    setLayout((L) => ({ ...L, items: [...L.items, { ...item, id }] }));
    return id;
  }, []);

  const updateItem = useCallback((id, patch) => {
    setLayout((L) => ({
      ...L,
      items: L.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  }, []);

  const restoreBuiltin = useCallback((builtinId) => {
    setLayout((L) => {
      if (L.items.some((it) => it.kind === "builtin" && it.builtinId === builtinId)) return L;
      return {
        ...L,
        items: [...L.items, { id: builtinId, kind: "builtin", builtinId }],
      };
    });
  }, []);

  const resetLayout = useCallback(() => setLayout(DEFAULT_LAYOUT), []);

  return { layout, moveItem, removeItem, addItem, updateItem, restoreBuiltin, resetLayout };
}

Object.assign(window, { useLayout, BUILTIN_IDS, BUILTIN_LABELS, PALETTE, SIZES, TAPE_OPTS, uid });
})();
