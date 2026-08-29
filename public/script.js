const BOOT_LINES = [
  "ROBCO INDUSTRIES (TM) TERMLINK PROTOCOL",
  "INITIALIZING VENDOR DATABASE...",
  "LOADING CONFIG.JSON... OK",
  "LOADING ITEMS.JSON... OK",
  "CONNECTION ESTABLISHED",
];

let STATE = { config: null, items: null, filterText: "", showUnavailable: false };

function typeBoot(cb) {
  const el = document.getElementById("boot");
  let out = "";
  let li = 0;
  function nextLine() {
    if (li >= BOOT_LINES.length) {
      out += "\n> READY_";
      el.innerHTML = out.replace(/(READY_)/, '<span class="ready">$1</span>');
      setTimeout(cb, 250);
      return;
    }
    out += (li > 0 ? "\n" : "") + BOOT_LINES[li];
    el.textContent = out;
    li++;
    setTimeout(nextLine, 90);
  }
  nextLine();
}

async function loadData() {
  const [config, items] = await Promise.all([
    fetch("data/config.json").then(r => r.json()),
    fetch("data/items.json").then(r => r.json()),
  ]);
  STATE.config = config;
  STATE.items = items;
}

function renderHeader() {
  const c = STATE.config;
  document.getElementById("campName").textContent = c.campName || "CAMP NAME";
  document.getElementById("ign").textContent = c.inGameName || "-";
  document.getElementById("discord").textContent = c.discord || "-";
  document.getElementById("server").textContent = c.server || "-";
  document.getElementById("tagline").textContent = c.tagline || "";
  document.getElementById("note").textContent = c.note || "";
  document.getElementById("masthead").style.display = "";
  document.getElementById("navRow").style.display = "";
  document.getElementById("controls").style.display = "";
  document.getElementById("lastUpdated").textContent = "LOADED " + new Date().toLocaleString();

  if (c.contact && c.contact.enabled) {
    document.getElementById("contactLink").style.display = "";
  }

  const banner = document.getElementById("tradeBanner");
  if (c.trade) {
    if (c.trade.acceptingCaps === false) {
      banner.textContent = c.trade.note || "Not accepting caps right now, materials, items, or other trades only.";
      banner.className = "trade-banner";
      banner.style.display = "";
    } else if (c.trade.note) {
      banner.textContent = c.trade.note;
      banner.className = "trade-banner accepting";
      banner.style.display = "";
    }
  }
}

function updateCartBar() {
  const list = cartLoad();
  const bar = document.getElementById("cartBar");
  const count = document.getElementById("cartCount");
  if (list.length > 0) {
    bar.classList.add("visible");
    count.textContent = list.length + (list.length === 1 ? " ITEM SELECTED" : " ITEMS SELECTED");
  } else {
    bar.classList.remove("visible");
  }
}

function onSelectToggle(item, checked) {
  if (checked) cartAdd(item);
  else cartRemove(item.id);
  updateCartBar();
}

function renderCatalog() {
  const root = document.getElementById("catalog");
  root.innerHTML = "";
  const selectedIds = cartIds();
  const opts = {
    editable: false,
    showUnavailable: STATE.showUnavailable,
    filterText: STATE.filterText,
    selectable: true,
    selectedIds,
    onSelectToggle,
  };
  const show = STATE.showUnavailable;

  // ---- MODS ----
  const modTotals = modTotalCount(STATE.items.mods);
  if (modTotals.available > 0 || show) {
    const modsSection = document.createElement("section");
    modsSection.className = "section";
    modsSection.innerHTML = `
      <div class="section-head">
        <span class="idx">01</span>
        <span class="section-title">MODS</span>
        <span class="section-count">${modTotals.available} / ${modTotals.total} AVAILABLE</span>
      </div>
    `;
    if (STATE.config.modsNote) {
      const p = document.createElement("p");
      p.className = "note";
      p.textContent = STATE.config.modsNote;
      modsSection.appendChild(p);
    }

    const modTypes = [
      { type: "weapon", label: "WEAPON MODS" },
      { type: "armor", label: "ARMOR MODS" },
      { type: "powerArmor", label: "POWER ARMOR MODS" },
    ];
    for (const mt of modTypes) {
      const counts = modCountForType(STATE.items.mods, mt.type);
      if (counts.total === 0) continue;
      if (counts.available === 0 && !show) continue;
      const label = document.createElement("div");
      label.className = "subhead";
      label.textContent = mt.label + ` (${counts.available}/${counts.total})`;
      modsSection.appendChild(label);
      const div = document.createElement("div");
      div.className = "mod-group";
      modsSection.appendChild(div);
      renderModSection(div, STATE.items.mods, { ...opts, modType: mt.type });
    }
    root.appendChild(modsSection);
  }

  // ---- WEAPONS (split into categories) ----
  const wTotal = countAvailable(STATE.items.weapons);
  if (wTotal > 0 || show) {
    const weaponsSection = document.createElement("section");
    weaponsSection.className = "section";
    weaponsSection.innerHTML = `
      <div class="section-head">
        <span class="idx">02</span>
        <span class="section-title">WEAPONS</span>
        <span class="section-count">${wTotal} / ${STATE.items.weapons.length} AVAILABLE</span>
      </div>
    `;
    for (const cat of WEAPON_CATEGORIES) {
      const counts = categoryCount(STATE.items.weapons, cat.key);
      if (counts.total === 0) continue;
      if (counts.available === 0 && !show) continue;
      const label = document.createElement("div");
      label.className = "subhead";
      label.textContent = cat.label + ` (${counts.available}/${counts.total})`;
      weaponsSection.appendChild(label);
      const grid = document.createElement("div");
      grid.className = "item-grid";
      weaponsSection.appendChild(grid);
      const catList = STATE.items.weapons.filter(it => (it.categories || []).includes(cat.key));
      renderItemGrid(grid, catList, opts);
    }
    root.appendChild(weaponsSection);
  }

  // ---- ARMOR / UNDER ARMOR / APPAREL / MUTATION SERUMS ----
  const groups = [
    { key: "armor", title: "ARMOR", idx: "03" },
    { key: "underarmor", title: "UNDER ARMOR", idx: "04" },
    { key: "apparel", title: "APPAREL", idx: "05" },
    { key: "serums", title: "MUTATION SERUMS", idx: "06" },
  ];
  for (const g of groups) {
    const list = STATE.items[g.key];
    if (!list) continue;
    const avail = countAvailable(list);
    if (avail === 0 && !show) continue;
    const section = document.createElement("section");
    section.className = "section";
    section.innerHTML = `
      <div class="section-head">
        <span class="idx">${g.idx}</span>
        <span class="section-title">${g.title}</span>
        <span class="section-count">${avail} / ${list.length} AVAILABLE</span>
      </div>
    `;
    const grid = document.createElement("div");
    grid.className = "item-grid";
    section.appendChild(grid);
    renderItemGrid(grid, list, opts);
    root.appendChild(section);
  }

  if (root.children.length === 0) {
    const p = document.createElement("p");
    p.className = "note";
    p.textContent = show
      ? "// nothing in the catalog yet"
      : "// nothing currently marked available, toggle SHOW OUT-OF-STOCK to see the full catalog";
    root.appendChild(p);
  }
}

function attachControls() {
  document.getElementById("search").addEventListener("input", e => {
    STATE.filterText = e.target.value;
    renderCatalog();
  });
  const cb = document.getElementById("showUnavailable");
  cb.addEventListener("change", e => {
    STATE.showUnavailable = e.target.checked;
    document.getElementById("toggleLabel").classList.toggle("active", e.target.checked);
    renderCatalog();
  });
  document.getElementById("cartClearBtn").addEventListener("click", () => {
    cartClear();
    updateCartBar();
    renderCatalog();
  });
  document.getElementById("cartReviewBtn").addEventListener("click", () => {
    window.location.href = "contact.html";
  });
}

(async function init() {
  typeBoot(async () => {
    try {
      await loadData();
      renderHeader();
      renderCatalog();
      attachControls();
      updateCartBar();
    } catch (err) {
      document.getElementById("boot").textContent += "\n\n!! ERROR LOADING DATA: " + err.message;
      console.error(err);
    }
  });
})();
