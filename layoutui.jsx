/* =========================================================
   LAYOUT UI — edit toggle, toolbar, drag chrome, add modal,
   custom card + section header renderers
   ========================================================= */
/* global React */
(function() {
const { useState, useEffect, useRef, useCallback } = React;
const { Modal, PALETTE, SIZES, TAPE_OPTS, BUILTIN_IDS, BUILTIN_LABELS, StackCard, AlbumCard, LogbookCard } = window;

// =========================================================
// EDIT CHROME — overlays a card in edit mode with handle/delete/edit
// =========================================================
const SIZE_PILLS = [
  { key: "S",  col: 4,  label: "small" },
  { key: "M",  col: 6,  label: "medium" },
  { key: "L",  col: 8,  label: "large" },
  { key: "XL", col: 12, label: "full" },
];

function EditChrome({ onDelete, onEdit, canEdit, dragging, currentCol, onResize, showResize }) {
  return (
    <div className={`edit-chrome ${dragging ? "dragging" : ""}`} aria-hidden>
      <div className="edit-chrome-handle" title="drag to move">
        <svg width="14" height="20" viewBox="0 0 14 20">
          {[4, 10, 16].map((y) => (
            <g key={y}>
              <circle cx="4" cy={y} r="1.5" fill="currentColor" />
              <circle cx="10" cy={y} r="1.5" fill="currentColor" />
            </g>
          ))}
        </svg>
      </div>
      {showResize && (
        <div className="edit-chrome-sizes" onClick={(e) => e.stopPropagation()} draggable={false}>
          {SIZE_PILLS.map((s) => (
            <button
              key={s.key}
              type="button"
              draggable={false}
              className={`size-pill ${currentCol === s.col ? "active" : ""}`}
              title={s.label}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onResize && onResize(s.col); }}
            >{s.key}</button>
          ))}
        </div>
      )}
      <div className="edit-chrome-actions" draggable={false}>
        {canEdit && (
          <button
            type="button"
            draggable={false}
            className="edit-chip"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onEdit && onEdit(); }}
            title="edit"
          >✎</button>
        )}
        <button
          type="button"
          draggable={false}
          className="edit-chip danger"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete && onDelete(); }}
          title="remove from page"
        >✕</button>
      </div>
    </div>
  );
}

// =========================================================
// DROP-INDICATOR-AWARE SLOT — wraps every item, handles HTML5 DnD
// =========================================================
function LayoutSlot({
  index, editing, draggingIdx, setDraggingIdx, onMove, onDelete, onEdit, onResize, item, children,
}) {
  const [hover, setHover] = useState(false); // before this slot

  const onDragStart = (e) => {
    if (!editing) return;
    setDraggingIdx(index);
    try {
      e.dataTransfer.setData("text/plain", String(index));
      e.dataTransfer.effectAllowed = "move";
    } catch (err) {}
  };
  const onDragEnd = () => {
    setDraggingIdx(null);
    setHover(false);
  };
  const onDragOver = (e) => {
    if (!editing || draggingIdx === null) return;
    e.preventDefault();
    try { e.dataTransfer.dropEffect = "move"; } catch (err) {}
    if (draggingIdx !== index) setHover(true);
  };
  const onDragLeave = () => setHover(false);
  const onDrop = (e) => {
    if (!editing || draggingIdx === null) return;
    e.preventDefault();
    setHover(false);
    const from = draggingIdx;
    let to = index;
    if (from < to) to -= 0; // dropping ONTO this item: place before it
    if (from !== to) onMove(from, to);
    setDraggingIdx(null);
  };

  const wrapClass = [
    "slot",
    editing ? "editing" : "",
    draggingIdx === index ? "dragging" : "",
    hover && editing && draggingIdx !== null && draggingIdx !== index ? "drop-before" : "",
    item.kind === "header" ? "slot-header" : "",
    `slot-col-${item.col || (item.kind === "header" ? 12 : item.kind === "builtin" ? 6 : (item.size || 6))}`,
  ].filter(Boolean).join(" ");

  return (
    <div
      className={wrapClass}
      draggable={editing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      data-slot-id={item.id}
    >
      {children}
      {editing && (
        <EditChrome
          onDelete={onDelete}
          onEdit={onEdit}
          onResize={onResize}
          currentCol={item.col}
          showResize={item.kind !== "header"}
          canEdit={item.kind === "custom" || item.kind === "header"}
          dragging={draggingIdx === index}
        />
      )}
    </div>
  );
}

// =========================================================
// CUSTOM CARD RENDERER — note / list / quote / photo /
//                       stack / album / logbook (collections)
// =========================================================
function CustomCard({ item, onUpdate, onOpen, editing }) {
  const palette = PALETTE.find((p) => p.key === item.color) || PALETTE[0];
  const tape = item.tape || "pink";
  const rot = typeof item.rot === "number" ? item.rot : 0;

  // Collection types delegate to their own renderer + are clickable
  const isCollection = item.type === "stack" || item.type === "album" || item.type === "logbook";
  if (isCollection) {
    const Renderer =
      item.type === "stack" ? StackCard :
      item.type === "album" ? AlbumCard :
      LogbookCard;
    return (
      <div
        className={`collection-wrap ${editing ? "" : "clickable"}`}
        onClick={(e) => {
          if (editing) return;
          if (e.target.closest && e.target.closest(".coll-quick-add")) return;
          onOpen && onOpen();
        }}
      >
        <Renderer item={item} />
        {!editing && (
          <button
            type="button"
            className="coll-quick-add"
            title="quick add"
            onClick={(e) => { e.stopPropagation(); onOpen && onOpen(); }}
          >+</button>
        )}
      </div>
    );
  }

  const cardStyle = {
    background: palette.bg,
    transform: `rotate(${rot}deg)`,
  };

  if (item.kind === "custom" && item.type === "list") {
    return (
      <div className="paper-card custom-card" style={cardStyle}>
        <div className={`tape ${tape} tl`}></div>
        <div className="cust-eyebrow">
          {item.eyebrow || "list"}
        </div>
        <h2 className="cust-title">{item.title || "untitled list"}</h2>
        <ul className="cust-list">
          {(item.items || []).map((row, i) => (
            <li key={i}
              onClick={() => {
                const next = [...item.items];
                next[i] = { ...next[i], done: !next[i].done };
                onUpdate({ items: next });
              }}
              className={row.done ? "done" : ""}
            >
              <span className="box">{row.done ? "☑" : "☐"}</span>
              <span>{row.text}</span>
            </li>
          ))}
          {(!item.items || item.items.length === 0) && (
            <li style={{ color: "var(--ink-soft)", fontStyle: "italic" }}>(empty — edit to add)</li>
          )}
        </ul>
      </div>
    );
  }

  if (item.kind === "custom" && item.type === "quote") {
    return (
      <div className="paper-card custom-card quote-card" style={cardStyle}>
        <div className={`tape ${tape} center`}></div>
        <div className="cust-eyebrow">
          {item.eyebrow || "a thought"}
        </div>
        <p className="cust-quote">
          {item.body || "type your quote here…"}
        </p>
        {item.attribution && (
          <div className="cust-attr">— {item.attribution}</div>
        )}
      </div>
    );
  }

  if (item.kind === "custom" && item.type === "photo") {
    return (
      <div className="paper-card custom-card photo-card" style={cardStyle}>
        <div className={`tape ${tape} tl`}></div>
        <div className="cust-eyebrow">{item.eyebrow || "photo"}</div>
        <h2 className="cust-title">{item.title || "untitled photo"}</h2>
        <div className="photo-slot">
          {item.img ? (
            <img src={item.img} alt={item.title || ""} />
          ) : (
            <div className="photo-empty">
              <div>drop a photo here</div>
              <div className="photo-empty-sub">edit → paste image url</div>
            </div>
          )}
        </div>
        {item.body && <p className="cust-body">{item.body}</p>}
      </div>
    );
  }

  // default: note
  return (
    <div className="paper-card custom-card" style={cardStyle}>
      <div className={`tape ${tape} tl`}></div>
      <div className="cust-eyebrow">{item.eyebrow || "note"}</div>
      <h2 className="cust-title">{item.title || "untitled"}</h2>
      <p className="cust-body">
        {item.body || "tap the pencil to edit this note."}
      </p>
    </div>
  );
}

// =========================================================
// SECTION HEADER ITEM
// =========================================================
function SectionHeader({ item }) {
  return (
    <div className="section-header">
      <div className="section-header-line"></div>
      <h3 className="section-header-title" style={{ color: item.color || "var(--ink)" }}>
        {item.title || "section"}
      </h3>
      <div className="section-header-line"></div>
    </div>
  );
}

// =========================================================
// ADD CARD SHEET — pick a type, then a form
// =========================================================
function AddCardSheet({ onClose, onAdd, restoreOptions, onRestore }) {
  const [type, setType] = useState(null); // null | 'note' | 'list' | 'quote' | 'photo' | 'header' | 'restore'
  const [draft, setDraft] = useState({
    title: "",
    body: "",
    eyebrow: "",
    items: [],
    color: "white",
    size: "md",
    tape: "pink",
    rot: 0,
    attribution: "",
    img: "",
  });

  const [listInput, setListInput] = useState("");

  const submit = () => {
    if (type === "header") {
      onAdd({ kind: "header", title: draft.title || "section", color: draft.color === "white" ? "var(--ink)" : "var(--ink)" });
    } else {
      const col = SIZES.find((s) => s.key === draft.size).col;
      const isCollection = type === "stack" || type === "album" || type === "logbook";
      onAdd({
        kind: "custom",
        type,
        title: draft.title,
        body: draft.body,
        eyebrow: draft.eyebrow,
        items: type === "list" ? draft.items : undefined,
        attribution: type === "quote" ? draft.attribution : undefined,
        img: type === "photo" ? draft.img : undefined,
        entries: isCollection ? [] : undefined,
        color: draft.color,
        tape: draft.tape,
        size: draft.size,
        col,
        rot: draft.rot,
      });
    }
    onClose();
  };

  if (type === null) {
    return (
      <Modal onClose={onClose} title="add to the page" lead="pick what you want to add. you can edit & rearrange later.">
        <div className="add-grid">
          <button className="add-tile" onClick={() => setType("note")}>
            <div className="add-tile-icon">✎</div>
            <div className="add-tile-label">note</div>
            <div className="add-tile-sub">title + paragraph</div>
          </button>
          <button className="add-tile" onClick={() => setType("list")}>
            <div className="add-tile-icon">☑</div>
            <div className="add-tile-label">checklist</div>
            <div className="add-tile-sub">to-dos, goals, anything</div>
          </button>
          <button className="add-tile" onClick={() => setType("quote")}>
            <div className="add-tile-icon">"</div>
            <div className="add-tile-label">quote</div>
            <div className="add-tile-sub">big handwritten line</div>
          </button>
          <button className="add-tile" onClick={() => setType("photo")}>
            <div className="add-tile-icon">▣</div>
            <div className="add-tile-label">photo</div>
            <div className="add-tile-sub">paste an image url</div>
          </button>
          <button className="add-tile" onClick={() => setType("header")}>
            <div className="add-tile-icon">§</div>
            <div className="add-tile-label">section header</div>
            <div className="add-tile-sub">divider w/ title</div>
          </button>
          <button className="add-tile add-tile-coll" onClick={() => setType("stack")}>
            <div className="add-tile-icon">≡</div>
            <div className="add-tile-label">stack</div>
            <div className="add-tile-sub">running pile of one-liners — grows over time</div>
          </button>
          <button className="add-tile add-tile-coll" onClick={() => setType("album")}>
            <div className="add-tile-icon">▣▣</div>
            <div className="add-tile-label">album</div>
            <div className="add-tile-sub">drop in photos one at a time</div>
          </button>
          <button className="add-tile add-tile-coll" onClick={() => setType("logbook")}>
            <div className="add-tile-icon">▤</div>
            <div className="add-tile-label">logbook</div>
            <div className="add-tile-sub">date-stamped journal — builds a streak</div>
          </button>
          {restoreOptions && restoreOptions.length > 0 && (
            <button className="add-tile" onClick={() => setType("restore")}>
              <div className="add-tile-icon">↻</div>
              <div className="add-tile-label">restore</div>
              <div className="add-tile-sub">{restoreOptions.length} hidden card(s)</div>
            </button>
          )}
        </div>
      </Modal>
    );
  }

  if (type === "restore") {
    return (
      <Modal onClose={onClose} title="restore a built-in card" lead="put a card you removed back on the page.">
        <div className="restore-list">
          {restoreOptions.map((id) => (
            <button key={id} className="restore-row" onClick={() => { onRestore(id); onClose(); }}>
              <span>{BUILTIN_LABELS[id] || id}</span>
              <span className="restore-arrow">→ add back</span>
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      onClose={onClose}
      title={type === "header" ? "new section header" : `new ${type}`}
      lead={type === "header" ? "type a title to break up the page." : "fill in what you can — you can edit later."}
    >
      <div className="add-form">
        {type !== "header" && (
          <label className="form-row">
            <span>eyebrow (optional)</span>
            <input
              type="text"
              value={draft.eyebrow}
              onChange={(e) => setDraft({ ...draft, eyebrow: e.target.value })}
              placeholder="e.g. summer goals · 12 items"
            />
          </label>
        )}
        <label className="form-row">
          <span>{type === "quote" ? "(big text shown above)" : "title"}</span>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder={type === "header" ? "memories · daily · etc" : "give it a title"}
          />
        </label>

        {type === "note" && (
          <label className="form-row">
            <span>body</span>
            <textarea
              rows="4"
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              placeholder="write whatever you want here…"
            ></textarea>
          </label>
        )}

        {type === "quote" && (
          <>
            <label className="form-row">
              <span>quote</span>
              <textarea
                rows="3"
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                placeholder="the quote itself"
              ></textarea>
            </label>
            <label className="form-row">
              <span>attribution (optional)</span>
              <input
                type="text"
                value={draft.attribution}
                onChange={(e) => setDraft({ ...draft, attribution: e.target.value })}
                placeholder="who said it"
              />
            </label>
          </>
        )}

        {type === "photo" && (
          <>
            <label className="form-row">
              <span>image url</span>
              <input
                type="text"
                value={draft.img}
                onChange={(e) => setDraft({ ...draft, img: e.target.value })}
                placeholder="https://…"
              />
            </label>
            <label className="form-row">
              <span>caption (optional)</span>
              <input
                type="text"
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </label>
          </>
        )}

        {type === "list" && (
          <div className="form-row">
            <span>checklist items</span>
            <div className="list-builder">
              {draft.items.map((row, i) => (
                <div className="lb-row" key={i}>
                  <span>☐</span>
                  <input
                    type="text"
                    value={row.text}
                    onChange={(e) => {
                      const next = [...draft.items];
                      next[i] = { ...next[i], text: e.target.value };
                      setDraft({ ...draft, items: next });
                    }}
                  />
                  <button
                    type="button"
                    className="lb-remove"
                    onClick={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== i) })}
                  >✕</button>
                </div>
              ))}
              <div className="lb-row lb-add">
                <span>+</span>
                <input
                  type="text"
                  value={listInput}
                  onChange={(e) => setListInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && listInput.trim()) {
                      setDraft({ ...draft, items: [...draft.items, { text: listInput.trim(), done: false }] });
                      setListInput("");
                    }
                  }}
                  placeholder="type and press enter…"
                />
                <button
                  type="button"
                  className="lb-add-btn"
                  onClick={() => {
                    if (!listInput.trim()) return;
                    setDraft({ ...draft, items: [...draft.items, { text: listInput.trim(), done: false }] });
                    setListInput("");
                  }}
                >add</button>
              </div>
            </div>
          </div>
        )}

        {type !== "header" && (
          <>
            <div className="form-row">
              <span>color</span>
              <div className="swatch-row">
                {PALETTE.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={`swatch ${draft.color === p.key ? "active" : ""}`}
                    style={{ background: p.bg }}
                    onClick={() => setDraft({ ...draft, color: p.key })}
                    title={p.label}
                  ></button>
                ))}
              </div>
            </div>
            <div className="form-row">
              <span>size</span>
              <div className="seg">
                {SIZES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className={`seg-btn ${draft.size === s.key ? "active" : ""}`}
                    onClick={() => setDraft({ ...draft, size: s.key })}
                  >{s.label}</button>
                ))}
              </div>
            </div>
            <div className="form-row">
              <span>tape color</span>
              <div className="seg">
                {TAPE_OPTS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`seg-btn ${draft.tape === t ? "active" : ""}`}
                    onClick={() => setDraft({ ...draft, tape: t })}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div className="form-row">
              <span>tilt</span>
              <input
                type="range"
                min="-4"
                max="4"
                step="0.5"
                value={draft.rot}
                onChange={(e) => setDraft({ ...draft, rot: parseFloat(e.target.value) })}
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-soft)" }}>{draft.rot}°</span>
            </div>
          </>
        )}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => setType(null)}>← back</button>
          <button type="button" className="btn-primary" onClick={submit}>add to page</button>
        </div>
      </div>
    </Modal>
  );
}

// =========================================================
// EDIT SHEET — modify existing custom card or header
// =========================================================
function EditSheet({ item, onClose, onSave }) {
  const [draft, setDraft] = useState({ ...item });
  const [listInput, setListInput] = useState("");

  const type = item.kind === "header" ? "header" : item.type;

  const save = () => {
    const patch = { ...draft };
    if (patch.size && patch.kind !== "header") {
      patch.col = SIZES.find((s) => s.key === patch.size).col;
    }
    onSave(patch);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={type === "header" ? "edit section header" : `edit ${type}`}
      lead="changes save when you press save."
    >
      <div className="add-form">
        {type !== "header" && (
          <label className="form-row">
            <span>eyebrow</span>
            <input
              type="text"
              value={draft.eyebrow || ""}
              onChange={(e) => setDraft({ ...draft, eyebrow: e.target.value })}
            />
          </label>
        )}
        <label className="form-row">
          <span>{type === "quote" ? "title (above quote)" : "title"}</span>
          <input
            type="text"
            value={draft.title || ""}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>

        {type === "note" && (
          <label className="form-row">
            <span>body</span>
            <textarea
              rows="4"
              value={draft.body || ""}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            ></textarea>
          </label>
        )}

        {type === "quote" && (
          <>
            <label className="form-row">
              <span>quote</span>
              <textarea
                rows="3"
                value={draft.body || ""}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              ></textarea>
            </label>
            <label className="form-row">
              <span>attribution</span>
              <input
                type="text"
                value={draft.attribution || ""}
                onChange={(e) => setDraft({ ...draft, attribution: e.target.value })}
              />
            </label>
          </>
        )}

        {type === "photo" && (
          <>
            <label className="form-row">
              <span>image url</span>
              <input
                type="text"
                value={draft.img || ""}
                onChange={(e) => setDraft({ ...draft, img: e.target.value })}
              />
            </label>
            <label className="form-row">
              <span>caption</span>
              <input
                type="text"
                value={draft.body || ""}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </label>
          </>
        )}

        {type === "list" && (
          <div className="form-row">
            <span>items</span>
            <div className="list-builder">
              {(draft.items || []).map((row, i) => (
                <div className="lb-row" key={i}>
                  <span>{row.done ? "☑" : "☐"}</span>
                  <input
                    type="text"
                    value={row.text}
                    onChange={(e) => {
                      const next = [...draft.items];
                      next[i] = { ...next[i], text: e.target.value };
                      setDraft({ ...draft, items: next });
                    }}
                  />
                  <button
                    type="button"
                    className="lb-remove"
                    onClick={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== i) })}
                  >✕</button>
                </div>
              ))}
              <div className="lb-row lb-add">
                <span>+</span>
                <input
                  type="text"
                  value={listInput}
                  onChange={(e) => setListInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && listInput.trim()) {
                      setDraft({ ...draft, items: [...(draft.items || []), { text: listInput.trim(), done: false }] });
                      setListInput("");
                    }
                  }}
                  placeholder="type and press enter…"
                />
                <button
                  type="button"
                  className="lb-add-btn"
                  onClick={() => {
                    if (!listInput.trim()) return;
                    setDraft({ ...draft, items: [...(draft.items || []), { text: listInput.trim(), done: false }] });
                    setListInput("");
                  }}
                >add</button>
              </div>
            </div>
          </div>
        )}

        {type !== "header" && (
          <>
            <div className="form-row">
              <span>color</span>
              <div className="swatch-row">
                {PALETTE.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={`swatch ${draft.color === p.key ? "active" : ""}`}
                    style={{ background: p.bg }}
                    onClick={() => setDraft({ ...draft, color: p.key })}
                  ></button>
                ))}
              </div>
            </div>
            <div className="form-row">
              <span>size</span>
              <div className="seg">
                {SIZES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className={`seg-btn ${draft.size === s.key ? "active" : ""}`}
                    onClick={() => setDraft({ ...draft, size: s.key })}
                  >{s.label}</button>
                ))}
              </div>
            </div>
            <div className="form-row">
              <span>tape color</span>
              <div className="seg">
                {TAPE_OPTS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`seg-btn ${draft.tape === t ? "active" : ""}`}
                    onClick={() => setDraft({ ...draft, tape: t })}
                  >{t}</button>
                ))}
              </div>
            </div>
            <div className="form-row">
              <span>tilt</span>
              <input
                type="range"
                min="-4"
                max="4"
                step="0.5"
                value={draft.rot || 0}
                onChange={(e) => setDraft({ ...draft, rot: parseFloat(e.target.value) })}
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-soft)" }}>{draft.rot || 0}°</span>
            </div>
          </>
        )}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>cancel</button>
          <button type="button" className="btn-primary" onClick={save}>save</button>
        </div>
      </div>
    </Modal>
  );
}

// =========================================================
// LAYOUT TOOLBAR — bottom floating controls (only visible while editing)
// =========================================================
function LayoutToolbar({ editing, onToggle, onAdd, onReset }) {
  if (!editing) return null;
  return (
    <div className="layout-toolbar is-editing">
      <div className="lt-status">
        <span className="dot pulse"></span>
        editing layout — drag cards to rearrange
      </div>
      <button className="lt-btn" onClick={onAdd}>
        <span className="lt-icon">+</span> add card
      </button>
      <button className="lt-btn lt-ghost" onClick={onReset} title="restore the original layout">
        ↺ reset
      </button>
      <button className="lt-btn lt-primary" onClick={onToggle}>done</button>
    </div>
  );
}

Object.assign(window, {
  LayoutSlot, EditChrome, CustomCard, SectionHeader, AddCardSheet, EditSheet, LayoutToolbar,
});
})();
