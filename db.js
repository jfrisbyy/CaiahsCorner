/* =========================================================
   DB — Supabase sync layer for Caiah's Corner
   ---------------------------------------------------------
   The feature files (feed/mailbox/funds/…) keep using
   localStorage exactly as before. This layer makes that
   localStorage a live mirror of Supabase:

     1. hydrate()  — before React mounts, pull every table
        from Supabase into the same localStorage keys.
     2. write-through — patch localStorage.setItem so any
        caiah-* save is pushed back up (debounced).
     3. realtime — when a row changes server-side, re-pull
        that key into localStorage; the app's existing 2–3s
        polling surfaces it.

   If no credentials are set, everything is a no-op and the
   app stays in pure localStorage mode.

   window.DB.ready  → Promise that resolves once hydration is
                      done (or immediately if no backend).
   ========================================================= */
(function () {
  const cfg = window.SUPABASE_CONFIG || {};
  const HAS_BACKEND = !!(cfg.url && cfg.anonKey && window.supabase);

  // Native, un-patched localStorage accessors (avoid echo loops)
  const rawSet = Storage.prototype.setItem.bind(localStorage);
  const rawGet = Storage.prototype.getItem.bind(localStorage);

  // ---- epoch <-> iso helpers ----
  const tsToIso = (ts) => new Date(typeof ts === "number" ? ts : Date.now()).toISOString();
  const isoToTs = (iso) => (iso ? new Date(iso).getTime() : Date.now());

  let sb = null;
  if (HAS_BACKEND) {
    sb = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: false },
    });
  }

  // =========================================================
  // PER-KEY MAPPINGS  (localStorage key  <->  Supabase tables)
  //   pull()            → returns the value to store in localStorage (or null)
  //   push(value)       → writes the value up to Supabase
  //   isEmpty(value)    → used to decide seed-from-local on first run
  //   seedFromLocal     → if remote empty but local has data, push local up
  //   tables[]          → tables to watch for realtime
  // =========================================================

  // generic "replace a whole collection" upsert + delete-missing
  async function syncRows(table, rows, idField = "id") {
    if (rows.length) {
      const { error } = await sb.from(table).upsert(rows, { onConflict: idField });
      if (error) throw error;
      const ids = rows.map((r) => r[idField]);
      const { error: delErr } = await sb.from(table).delete().not(idField, "in", `(${ids.map(quote).join(",")})`);
      if (delErr) throw delErr;
    } else {
      const { error } = await sb.from(table).delete().neq(idField, "__never__");
      if (error) throw error;
    }
  }
  // quote a value for the not-in list
  function quote(v) {
    return `"${String(v).replace(/"/g, '""')}"`;
  }

  const MAP = {
    // -------- FEED (posts + nested reactions + comments) --------
    "caiah-feed-v1": {
      tables: ["feed_posts", "feed_reactions", "feed_comments"],
      seedFromLocal: true,
      isEmpty: (v) => !Array.isArray(v) || v.length === 0,
      async pull() {
        const [{ data: posts }, { data: reactions }, { data: comments }] = await Promise.all([
          sb.from("feed_posts").select("*").order("created_at", { ascending: false }),
          sb.from("feed_reactions").select("*"),
          sb.from("feed_comments").select("*"),
        ]);
        if (!posts) return [];
        const rByPost = {}, cByPost = {};
        (reactions || []).forEach((r) => (rByPost[r.post_id] ||= []).push({
          id: r.id, sticker: r.sticker, from: r.from_name, pos: r.pos, ts: isoToTs(r.created_at),
        }));
        (comments || []).forEach((c) => (cByPost[c.post_id] ||= []).push({
          id: c.id, body: c.body, from: c.from_name, ts: isoToTs(c.created_at),
        }));
        return posts.map((p) => ({
          id: p.id, kind: p.kind, caption: p.caption || "", body: p.body || "",
          color: p.color || "", photo: p.photo_url || "", videoId: p.video_id || "",
          poster: p.poster || "", duration: p.duration || undefined,
          public: p.is_public, ts: isoToTs(p.created_at),
          reactions: (rByPost[p.id] || []).sort((a, b) => a.ts - b.ts),
          comments: (cByPost[p.id] || []).sort((a, b) => a.ts - b.ts),
        }));
      },
      async push(arr) {
        const list = Array.isArray(arr) ? arr : [];
        const posts = list.map((p) => ({
          id: p.id, kind: p.kind || "photo", caption: p.caption || "", body: p.body || "",
          color: p.color || "", photo_url: p.photo || "", video_id: p.videoId || "",
          poster: p.poster || "", duration: p.duration ?? null,
          is_public: p.public !== false, created_at: tsToIso(p.ts),
        }));
        await syncRows("feed_posts", posts);
        const reactions = [], comments = [];
        list.forEach((p) => {
          (p.reactions || []).forEach((r) => reactions.push({
            id: r.id, post_id: p.id, sticker: r.sticker, from_name: r.from || "anonymous",
            pos: r.pos || { x: 50, y: 50, r: 0 }, created_at: tsToIso(r.ts),
          }));
          (p.comments || []).forEach((c) => comments.push({
            id: c.id, post_id: p.id, body: c.body, from_name: c.from || "anonymous",
            created_at: tsToIso(c.ts),
          }));
        });
        await syncRows("feed_reactions", reactions);
        await syncRows("feed_comments", comments);
      },
    },

    // -------- MAILBOX --------
    "caiah-mailbox-v1": {
      tables: ["mail_messages"],
      seedFromLocal: true,
      isEmpty: (v) => !Array.isArray(v) || v.length === 0,
      async pull() {
        const { data } = await sb.from("mail_messages").select("*").order("created_at", { ascending: false });
        if (!data) return [];
        return data.map((m) => ({
          id: m.id, from: m.from_name, body: m.body, link: m.link || "",
          photo: m.photo_url || "",
          video: m.video_id ? { id: m.video_id, poster: m.video_poster || "", duration: m.video_duration || 0 } : null,
          replyTo: m.reply_to || null, ts: isoToTs(m.created_at), read: m.read,
        }));
      },
      async push(arr) {
        const rows = (Array.isArray(arr) ? arr : []).map((m) => ({
          id: m.id, from_name: m.from || "anonymous", body: m.body || "", link: m.link || "",
          photo_url: m.photo || "", video_id: m.video?.id || "",
          video_poster: m.video?.poster || "", video_duration: m.video?.duration ?? null,
          reply_to: m.replyTo || null, read: !!m.read, created_at: tsToIso(m.ts),
        }));
        await syncRows("mail_messages", rows);
      },
    },

    // -------- JOURNAL (one row per day) --------
    "caiah-journal": {
      tables: ["journal_entries"],
      seedFromLocal: true,
      isEmpty: (v) => !Array.isArray(v) || v.length === 0,
      async pull() {
        const { data } = await sb.from("journal_entries").select("*").order("entry_date");
        if (!data) return [];
        return data.map((e) => ({ date: e.entry_date, mood: e.mood, text: e.text }));
      },
      async push(arr) {
        const rows = (Array.isArray(arr) ? arr : []).map((e) => ({
          entry_date: e.date, mood: e.mood || "happy", text: e.text || "",
        }));
        await syncRows("journal_entries", rows, "entry_date");
      },
    },

    // -------- WISHLIST (preserve order via position) --------
    "caiah-wishlist": {
      tables: ["wishlist_items"],
      seedFromLocal: true,
      isEmpty: (v) => !Array.isArray(v) || v.length === 0,
      async pull() {
        const { data } = await sb.from("wishlist_items").select("*").order("position");
        if (!data) return [];
        return data.map((w) => ({
          id: w.id, text: w.text, link: w.link || null, received: w.received, addedAt: w.added_at || null,
        }));
      },
      async push(arr) {
        const rows = (Array.isArray(arr) ? arr : []).map((w, i) => ({
          id: String(w.id), text: w.text, link: w.link || null, received: !!w.received,
          added_at: w.addedAt || null, position: i,
        }));
        await syncRows("wishlist_items", rows);
      },
    },

    // -------- BUCKET LIST (no client ids → replace by position) --------
    "caiah-bucket": {
      tables: ["bucket_items"],
      seedFromLocal: false, // DB seed is source of truth
      isEmpty: (v) => !Array.isArray(v) || v.length === 0,
      async pull() {
        const { data } = await sb.from("bucket_items").select("*").order("position");
        if (!data) return [];
        return data.map((b) => ({ text: b.text, done: b.done }));
      },
      async push(arr) {
        const list = Array.isArray(arr) ? arr : [];
        // replace all (tiny table)
        const { error: delErr } = await sb.from("bucket_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (delErr) throw delErr;
        if (list.length) {
          const rows = list.map((b, i) => ({ text: b.text, done: !!b.done, position: i }));
          const { error } = await sb.from("bucket_items").insert(rows);
          if (error) throw error;
        }
      },
    },

    // -------- FUNDS (transactions + singleton settings) --------
    "caiah-funds-v1": {
      tables: ["fund_transactions", "fund_settings"],
      seedFromLocal: true,
      isEmpty: (v) => !v || (Array.isArray(v.transactions) && v.transactions.length === 0),
      async pull() {
        const [{ data: txs }, { data: settings }] = await Promise.all([
          sb.from("fund_transactions").select("*").order("created_at", { ascending: false }),
          sb.from("fund_settings").select("*").eq("id", 1).maybeSingle(),
        ]);
        return {
          transactions: (txs || []).map((t) => ({
            id: t.id, kind: t.kind, amount: Number(t.amount), label: t.label, ts: isoToTs(t.created_at),
          })),
          threshold: settings ? Number(settings.threshold) : 50,
          handles: settings?.handles || {},
        };
      },
      async push(d) {
        const data = d || { transactions: [], threshold: 50, handles: {} };
        const rows = (data.transactions || []).map((t) => ({
          id: t.id, kind: t.kind, amount: t.amount, label: t.label || "", created_at: tsToIso(t.ts),
        }));
        await syncRows("fund_transactions", rows);
        const { error } = await sb.from("fund_settings").upsert(
          { id: 1, threshold: data.threshold ?? 50, handles: data.handles || {} },
          { onConflict: "id" }
        );
        if (error) throw error;
      },
    },

    // -------- COUNTDOWNS --------
    "caiah-countdowns": {
      tables: ["countdown_events"],
      seedFromLocal: false,
      isEmpty: (v) => !Array.isArray(v) || v.length === 0,
      async pull() {
        const { data } = await sb.from("countdown_events").select("*").order("position");
        if (!data) return [];
        return data.map((e) => ({
          id: e.id, label: e.label, date: e.event_date || "", time: e.event_time || "",
          emoji: e.emoji || "✦", color: e.color || "",
        }));
      },
      async push(arr) {
        const rows = (Array.isArray(arr) ? arr : []).map((e, i) => ({
          id: e.id, label: e.label, event_date: e.date || null, event_time: e.time || "",
          emoji: e.emoji || "✦", color: e.color || "", position: i,
        }));
        await syncRows("countdown_events", rows);
      },
    },

    // -------- CELEBRATED (array of keys) --------
    "caiah-celebrated": {
      tables: ["celebrated_events"],
      seedFromLocal: true,
      isEmpty: (v) => !Array.isArray(v) || v.length === 0,
      async pull() {
        const { data } = await sb.from("celebrated_events").select("event_key");
        return (data || []).map((r) => r.event_key);
      },
      async push(arr) {
        const rows = (Array.isArray(arr) ? arr : []).map((k) => ({ event_key: k }));
        await syncRows("celebrated_events", rows, "event_key");
      },
    },

    // -------- BOARD CUTOUTS --------
    "caiah-cutouts": {
      tables: ["board_cutouts"],
      seedFromLocal: true,
      isEmpty: (v) => !Array.isArray(v) || v.length === 0,
      async pull() {
        const { data } = await sb.from("board_cutouts").select("*").order("z");
        if (!data) return [];
        return data.map((c) => ({
          id: c.id, kind: c.kind, src: c.src || "", emoji: c.emoji || "", color: c.color || "",
          x: c.x, y: c.y, rotation: c.rotation, scale: c.scale, z: c.z,
        }));
      },
      async push(arr) {
        const rows = (Array.isArray(arr) ? arr : []).map((c) => ({
          id: c.id, kind: c.kind, src: c.src || "", emoji: c.emoji || "", color: c.color || "",
          x: c.x ?? 0, y: c.y ?? 0, rotation: c.rotation ?? 0, scale: c.scale ?? 1, z: c.z ?? 100,
        }));
        await syncRows("board_cutouts", rows);
      },
    },

    // -------- LAYOUT (singleton document) --------
    "caiah-layout-v1": {
      tables: ["board_layout"],
      seedFromLocal: false,
      isEmpty: (v) => !v || !Array.isArray(v.items) || v.items.length === 0,
      async pull() {
        const { data } = await sb.from("board_layout").select("*").eq("id", 1).maybeSingle();
        if (!data) return null;
        const { items, ...meta } = { items: data.items || [], ...(data.meta || {}) };
        return { items, ...meta };
      },
      async push(obj) {
        const o = obj || { items: [] };
        const { items, ...meta } = o;
        const { error } = await sb.from("board_layout").upsert(
          { id: 1, items: items || [], meta }, { onConflict: "id" }
        );
        if (error) throw error;
      },
    },
  };

  // =========================================================
  // WRITE-THROUGH  (debounced per key)
  // =========================================================
  let syncEnabled = false;
  const pushTimers = {};
  function schedulePush(key, valueStr) {
    if (!syncEnabled || !MAP[key]) return;
    clearTimeout(pushTimers[key]);
    pushTimers[key] = setTimeout(async () => {
      try {
        const value = JSON.parse(valueStr);
        await MAP[key].push(value);
      } catch (e) {
        console.warn("[DB] push failed for", key, e?.message || e);
      }
    }, 700);
  }

  if (HAS_BACKEND) {
    localStorage.setItem = function (key, value) {
      rawSet(key, value);
      if (typeof key === "string" && key.indexOf("caiah-") === 0) schedulePush(key, value);
    };
  }

  // =========================================================
  // HYDRATE  (Supabase → localStorage, before React mounts)
  // =========================================================
  async function hydrate() {
    for (const key of Object.keys(MAP)) {
      const m = MAP[key];
      try {
        const remote = await m.pull();
        const localStr = rawGet(key);
        const local = localStr ? safeParse(localStr) : null;
        const remoteEmpty = remote == null || m.isEmpty(remote);
        const localEmpty = local == null || m.isEmpty(local);

        if (!remoteEmpty) {
          rawSet(key, JSON.stringify(remote));
        } else if (m.seedFromLocal && !localEmpty) {
          // first run on a device that already had local data → seed DB
          await m.push(local);
          // leave local as-is
        } else if (remote != null) {
          rawSet(key, JSON.stringify(remote));
        }
      } catch (e) {
        console.warn("[DB] hydrate failed for", key, e?.message || e);
        // leave local data untouched on failure
      }
    }
  }

  function safeParse(s) {
    try { return JSON.parse(s); } catch (e) { return null; }
  }

  // =========================================================
  // REALTIME  (server change → re-pull key into localStorage)
  // =========================================================
  const pullTimers = {};
  function schedulePull(key) {
    clearTimeout(pullTimers[key]);
    pullTimers[key] = setTimeout(async () => {
      try {
        const value = await MAP[key].pull();
        if (value != null) {
          rawSet(key, JSON.stringify(value));
          window.dispatchEvent(new CustomEvent("caiah-db-change", { detail: { key } }));
        }
      } catch (e) { /* ignore */ }
    }, 250);
  }

  function subscribeRealtime() {
    // table → key lookup
    const tableToKey = {};
    Object.entries(MAP).forEach(([key, m]) => m.tables.forEach((t) => (tableToKey[t] = key)));
    const ch = sb.channel("caiah-corner-db");
    Object.keys(tableToKey).forEach((table) => {
      ch.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        schedulePull(tableToKey[table]);
      });
    });
    ch.subscribe();
  }

  // =========================================================
  // BOOT
  // =========================================================
  let resolveReady;
  const ready = new Promise((res) => (resolveReady = res));

  window.DB = {
    ready,
    hasBackend: HAS_BACKEND,
    client: sb,
    // manual helpers (handy in console / future use)
    pull: (key) => MAP[key]?.pull(),
    push: (key, value) => MAP[key]?.push(value),
  };

  if (HAS_BACKEND) {
    hydrate()
      .then(() => { syncEnabled = true; subscribeRealtime(); })
      .catch((e) => { console.warn("[DB] hydrate error", e); syncEnabled = true; })
      .finally(() => resolveReady());
  } else {
    console.info("[DB] no Supabase credentials — running in localStorage-only mode.");
    resolveReady();
  }
})();
