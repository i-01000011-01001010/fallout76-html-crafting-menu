/* Shared helpers for rendering the FO76 camp catalog.
   Used by script.js (public site), admin.js (local editor), and contact.js (cart summary). */

const STAR_LABELS = { "1": "\u2605", "2": "\u2605\u2605", "3": "\u2605\u2605\u2605", "4": "\u2605\u2605\u2605\u2605" };

const WEAPON_CATEGORIES = [
  { key: "blunt", label: "MELEE - BLUNT WEAPONS" },
  { key: "fist", label: "MELEE - FIST WEAPONS" },
  { key: "power-tools", label: "MELEE - POWER TOOLS" },
  { key: "sharp", label: "MELEE - SHARP WEAPONS" },
  { key: "energy", label: "RANGED - ENERGY GUNS" },
  { key: "heavy", label: "RANGED - HEAVY GUNS" },
  { key: "launchers", label: "RANGED - LAUNCHERS" },
  { key: "machine-guns", label: "RANGED - MACHINE GUNS" },
  { key: "pipe", label: "RANGED - PIPE GUNS" },
  { key: "survival", label: "RANGED - SURVIVAL" },
];

function countAvailable(list) {
  return list.filter(i => i.available).length;
}

function modCountForType(modsByTier, type) {
  let total = 0, available = 0;
  for (const star of Object.keys(modsByTier)) {
    for (const item of modsByTier[star]) {
      if (!item.appliesTo.includes(type)) continue;
      total++;
      if (item.available) available++;
    }
  }
  return { total, available };
}

function modTotalCount(modsByTier) {
  let total = 0, available = 0;
  for (const star of Object.keys(modsByTier)) {
    for (const item of modsByTier[star]) {
      total++;
      if (item.available) available++;
    }
  }
  return { total, available };
}

function categoryCount(list, catKey) {
  const inCat = list.filter(it => (it.categories || []).includes(catKey));
  return { total: inCat.length, available: inCat.filter(it => it.available).length };
}

/**
 * Small "CHECK ALL / UNCHECK ALL" control for an admin section. Mutates every item in `list`
 * and calls onBulkToggle() (expected to fully re-render) so every view of any shared item
 * (e.g. a mod or weapon that appears in more than one section) stays in sync.
 */
function buildCheckAllRow(list, onBulkToggle) {
  const row = document.createElement("div");
  row.className = "check-all-row";
  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "btn-mini";
  allBtn.textContent = "CHECK ALL";
  allBtn.addEventListener("click", () => {
    list.forEach(it => { it.available = true; });
    onBulkToggle();
  });
  const noneBtn = document.createElement("button");
  noneBtn.type = "button";
  noneBtn.className = "btn-mini";
  noneBtn.textContent = "UNCHECK ALL";
  noneBtn.addEventListener("click", () => {
    list.forEach(it => { it.available = false; });
    onBulkToggle();
  });
  row.appendChild(allBtn);
  row.appendChild(noneBtn);
  return row;
}

/* Builds the DOM node for one item row/card, used by both flat grids and mod columns. */
function buildItemNode(it, opts) {
  if (opts.editable) {
    const row = document.createElement("div");
    row.className = "admin-item";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!it.available;
    cb.id = "chk-" + it.id;
    cb.addEventListener("change", () => {
      it.available = cb.checked;
      if (opts.onToggle) opts.onToggle();
    });

    const label = document.createElement("label");
    label.htmlFor = cb.id;
    label.textContent = it.name;

    row.appendChild(cb);
    row.appendChild(label);

    if (it.categories && it.categories.length) {
      const tags = document.createElement("span");
      tags.className = "applies-tags";
      tags.textContent = it.categories.join(", ");
      row.appendChild(tags);
    }

    // Editable material field(s), if this item type carries one
    if ("material" in it) {
      const matInput = document.createElement("input");
      matInput.className = "item-material-input";
      matInput.placeholder = "material needed";
      matInput.value = it.material || "";
      matInput.addEventListener("input", () => { it.material = matInput.value; });
      row.appendChild(matInput);
    }
    if ("materials" in it) {
      const matInput = document.createElement("input");
      matInput.className = "item-material-input";
      matInput.placeholder = "materials, comma-separated";
      matInput.value = (it.materials || []).join(", ");
      matInput.addEventListener("input", () => {
        it.materials = matInput.value.split(",").map(s => s.trim()).filter(Boolean);
      });
      row.appendChild(matInput);
    }

    return row;
  }

  // Public / read-only rendering
  const div = document.createElement("div");
  div.className = "item " + (it.available ? "available" : "unavailable");

  const bullet = document.createElement("span");
  bullet.className = "bullet";
  div.appendChild(bullet);

  const body = document.createElement("span");
  body.className = "item-body";

  const nameLine = document.createElement("span");
  nameLine.textContent = it.name;
  body.appendChild(nameLine);

  if (it.material) {
    const mat = document.createElement("span");
    mat.className = "item-material";
    mat.textContent = "\u21B3 " + it.material;
    body.appendChild(mat);
  }
  if (it.materials && it.materials.length) {
    const mat = document.createElement("span");
    mat.className = "item-materials";
    mat.textContent = "\u21B3 " + it.materials.join(" \u00B7 ");
    body.appendChild(mat);
  }
  div.appendChild(body);

  if (opts.selectable && it.available) {
    const selWrap = document.createElement("label");
    selWrap.className = "item-select";
    const selCb = document.createElement("input");
    selCb.type = "checkbox";
    selCb.checked = opts.selectedIds ? opts.selectedIds.has(it.id) : false;
    selCb.addEventListener("change", () => {
      if (opts.onSelectToggle) opts.onSelectToggle(it, selCb.checked);
    });
    selWrap.appendChild(selCb);
    div.appendChild(selWrap);
  }

  return div;
}

/**
 * Render one flat item list (weapons / armor / apparel / serums) into a container.
 * opts: { editable, showUnavailable, filterText, onToggle, selectable, selectedIds, onSelectToggle }
 */
function renderItemGrid(container, items, opts) {
  container.innerHTML = "";
  const filterText = (opts.filterText || "").toLowerCase();
  const visible = items.filter(it => {
    if (!opts.editable && !opts.showUnavailable && !it.available) return false;
    if (filterText && !it.name.toLowerCase().includes(filterText)) return false;
    return true;
  });

  if (visible.length === 0) {
    const p = document.createElement("div");
    p.className = "empty-msg";
    p.textContent = opts.editable ? "No items match." : "// nothing currently listed in this category, check back soon";
    container.appendChild(p);
    return;
  }

  for (const it of visible) {
    container.appendChild(buildItemNode(it, opts));
  }
}

/**
 * Render one applicability section of the MODS catalog (weapon / armor / powerArmor)
 * as star-tier columns, filtering the shared master mod list by opts.modType.
 * opts: same as renderItemGrid, plus required opts.modType ("weapon"|"armor"|"powerArmor")
 */
function renderModSection(container, modsByTier, opts) {
  container.innerHTML = "";
  const filterText = (opts.filterText || "").toLowerCase();
  const cols = document.createElement("div");
  cols.className = "star-columns";

  ["1", "2", "3", "4"].forEach(star => {
    const items = (modsByTier[star] || []).filter(it => it.appliesTo.includes(opts.modType));
    const visible = items.filter(it => {
      if (!opts.editable && !opts.showUnavailable && !it.available) return false;
      if (filterText && !it.name.toLowerCase().includes(filterText)) return false;
      return true;
    });

    const col = document.createElement("div");
    col.className = "star-col";
    const head = document.createElement("div");
    head.className = "star-col-head";
    head.innerHTML = `<span class="stars">${STAR_LABELS[star]}</span> ${star}-STAR`;
    col.appendChild(head);

    if (visible.length === 0) {
      const p = document.createElement("div");
      p.className = "empty-msg";
      p.textContent = opts.editable ? "No items." : "n/a";
      col.appendChild(p);
    } else {
      visible.forEach(it => col.appendChild(buildModNode(it, opts)));
    }
    cols.appendChild(col);
  });

  container.appendChild(cols);
}

/**
 * Render the admin's single master mod list for one star tier (no weapon/armor split,
 * so a shared mod is only ever checked once).
 */
function renderModAdminTier(container, tierList, opts) {
  container.innerHTML = "";
  const filterText = (opts.filterText || "").toLowerCase();
  const visible = tierList.filter(it => !filterText || it.name.toLowerCase().includes(filterText));
  if (visible.length === 0) {
    const p = document.createElement("div");
    p.className = "empty-msg";
    p.textContent = "No items match.";
    container.appendChild(p);
    return;
  }
  visible.forEach(it => container.appendChild(buildModNode(it, opts)));
}

const TYPE_LABEL = { weapon: "WEAPON", armor: "ARMOR", powerArmor: "POWER ARMOR" };

function buildModNode(it, opts) {
  if (opts.editable) {
    const row = document.createElement("div");
    row.className = "admin-item";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!it.available;
    cb.id = "chk-" + it.id;
    cb.addEventListener("change", () => {
      it.available = cb.checked;
      if (opts.onToggle) opts.onToggle();
    });

    const label = document.createElement("label");
    label.htmlFor = cb.id;
    label.textContent = it.name;

    const tags = document.createElement("span");
    tags.className = "applies-tags";
    tags.textContent = it.appliesTo.map(t => ({ weapon: "W", armor: "A", powerArmor: "PA" })[t]).join("/");

    const matInput = document.createElement("input");
    matInput.className = "item-material-input";
    matInput.placeholder = "material needed";
    matInput.value = it.material || "";
    matInput.addEventListener("input", () => { it.material = matInput.value; });

    row.appendChild(cb);
    row.appendChild(label);
    row.appendChild(tags);
    row.appendChild(matInput);
    return row;
  }

  const div = document.createElement("div");
  div.className = "item mod-item " + (it.available ? "available" : "unavailable");
  div.tabIndex = 0;

  const bullet = document.createElement("span");
  bullet.className = "bullet";
  div.appendChild(bullet);

  const body = document.createElement("span");
  body.className = "item-body";
  const nameLine = document.createElement("span");
  nameLine.textContent = it.name;
  body.appendChild(nameLine);
  if (it.material) {
    const mat = document.createElement("span");
    mat.className = "item-material";
    mat.textContent = "\u21B3 " + it.material;
    body.appendChild(mat);
  }
  div.appendChild(body);

  if (opts.selectable && it.available) {
    const selWrap = document.createElement("label");
    selWrap.className = "item-select";
    selWrap.addEventListener("click", e => e.stopPropagation());
    const selCb = document.createElement("input");
    selCb.type = "checkbox";
    selCb.checked = opts.selectedIds ? opts.selectedIds.has(it.id) : false;
    selCb.addEventListener("change", () => {
      if (opts.onSelectToggle) opts.onSelectToggle(it, selCb.checked);
    });
    selWrap.appendChild(selCb);
    div.appendChild(selWrap);
  }

  attachModTooltip(div, it);
  return div;
}

/* Hover/focus/tap tooltip showing the mod's effect for every applicable item type. */
function attachModTooltip(el, mod) {
  let tip = null;
  function show() {
    hide();
    tip = document.createElement("div");
    tip.className = "mod-tooltip";
    const title = document.createElement("div");
    title.className = "mod-tooltip-title";
    title.textContent = mod.name + " Legendary Mod";
    tip.appendChild(title);
    mod.appliesTo.forEach(type => {
      const block = document.createElement("div");
      block.className = "mod-tooltip-block";
      const label = document.createElement("div");
      label.className = "mod-tooltip-type";
      label.textContent = "[" + TYPE_LABEL[type] + "]";
      const text = document.createElement("div");
      text.className = "mod-tooltip-text";
      text.textContent = (mod.effects && mod.effects[type]) || "n/a";
      block.appendChild(label);
      block.appendChild(text);
      tip.appendChild(block);
    });
    if (mod.notes) {
      const notes = document.createElement("div");
      notes.className = "mod-tooltip-notes";
      notes.textContent = mod.notes;
      tip.appendChild(notes);
    }
    document.body.appendChild(tip);
    const r = el.getBoundingClientRect();
    const top = window.scrollY + r.bottom + 6;
    let left = window.scrollX + r.left;
    tip.style.top = top + "px";
    tip.style.left = left + "px";
    const tr = tip.getBoundingClientRect();
    if (tr.right > window.innerWidth - 8) {
      left = Math.max(8, window.scrollX + window.innerWidth - tr.width - 8);
      tip.style.left = left + "px";
    }
  }
  function hide() {
    if (tip) { tip.remove(); tip = null; }
  }
  el.addEventListener("mouseenter", show);
  el.addEventListener("mouseleave", hide);
  el.addEventListener("focus", show);
  el.addEventListener("blur", hide);
  el.addEventListener("click", e => {
    if (tip) hide(); else show();
  });
}


