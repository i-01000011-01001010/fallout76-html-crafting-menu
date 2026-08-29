let STATE = { config: null, items: null, filterText: "" };

function setStatus(msg) {
  document.getElementById("statusMsg").textContent = msg;
}

function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function readFileAsJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try { resolve(JSON.parse(reader.result)); }
      catch (e) { reject(e); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function renderConfigFields() {
  const wrap = document.getElementById("configFields");
  wrap.innerHTML = "";
  const fields = [
    ["campName", "Camp Name", "text"],
    ["inGameName", "In-Game Name", "text"],
    ["discord", "Discord", "text"],
    ["server", "Platform / Server", "text"],
    ["tagline", "Tagline", "textarea"],
    ["note", "Note (trade terms, etc.)", "textarea"],
    ["modsNote", "Mods section note", "textarea"],
  ];
  for (const [key, label, type] of fields) {
    const field = document.createElement("div");
    field.className = "config-field";
    const lab = document.createElement("label");
    lab.textContent = label;
    field.appendChild(lab);
    const input = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
    if (type !== "textarea") input.type = "text";
    input.value = STATE.config[key] || "";
    input.addEventListener("input", () => { STATE.config[key] = input.value; });
    field.appendChild(input);
    wrap.appendChild(field);
  }

  // Trade block
  if (!STATE.config.trade) STATE.config.trade = { acceptingCaps: true, note: "" };
  const tradeWrap = document.createElement("div");
  tradeWrap.className = "config-field checkbox-field";
  const tradeCb = document.createElement("input");
  tradeCb.type = "checkbox";
  tradeCb.id = "cfgAcceptingCaps";
  tradeCb.checked = STATE.config.trade.acceptingCaps !== false;
  tradeCb.addEventListener("change", () => { STATE.config.trade.acceptingCaps = tradeCb.checked; });
  const tradeLab = document.createElement("label");
  tradeLab.htmlFor = "cfgAcceptingCaps";
  tradeLab.textContent = "Currently accepting caps";
  tradeWrap.appendChild(tradeCb);
  tradeWrap.appendChild(tradeLab);
  wrap.appendChild(tradeWrap);

  const tradeNoteField = document.createElement("div");
  tradeNoteField.className = "config-field";
  const tnLab = document.createElement("label");
  tnLab.textContent = "Trade note (shown when caps are off, or as a general note)";
  const tnInput = document.createElement("textarea");
  tnInput.value = STATE.config.trade.note || "";
  tnInput.addEventListener("input", () => { STATE.config.trade.note = tnInput.value; });
  tradeNoteField.appendChild(tnLab);
  tradeNoteField.appendChild(tnInput);
  wrap.appendChild(tradeNoteField);

  // Contact block
  if (!STATE.config.contact) STATE.config.contact = { enabled: false, prompt: "" };
  const contactWrap = document.createElement("div");
  contactWrap.className = "config-field checkbox-field";
  const contactCb = document.createElement("input");
  contactCb.type = "checkbox";
  contactCb.id = "cfgContactEnabled";
  contactCb.checked = !!STATE.config.contact.enabled;
  contactCb.addEventListener("change", () => { STATE.config.contact.enabled = contactCb.checked; });
  const contactLab = document.createElement("label");
  contactLab.htmlFor = "cfgContactEnabled";
  contactLab.textContent = "Show contact page / form";
  contactWrap.appendChild(contactCb);
  contactWrap.appendChild(contactLab);
  wrap.appendChild(contactWrap);

  const promptField = document.createElement("div");
  promptField.className = "config-field";
  const pLab = document.createElement("label");
  pLab.textContent = "Contact page prompt";
  const pInput = document.createElement("textarea");
  pInput.value = STATE.config.contact.prompt || "";
  pInput.addEventListener("input", () => { STATE.config.contact.prompt = pInput.value; });
  promptField.appendChild(pLab);
  promptField.appendChild(pInput);
  wrap.appendChild(promptField);

  document.getElementById("configSection").style.display = "";
  document.getElementById("downloadConfigBtn").disabled = false;
}

function renderCatalog() {
  const root = document.getElementById("catalog");
  root.innerHTML = "";
  const opts = { editable: true, filterText: STATE.filterText, onToggle: () => renderCatalog() };

  const modsSection = document.createElement("section");
  modsSection.className = "section";
  modsSection.innerHTML = `<div class="section-head"><span class="section-title">MODS</span></div>`;
  const modsLegend = document.createElement("p");
  modsLegend.className = "tagline";
  modsLegend.textContent = "One row per mod, no matter how many item types it applies to (tag shows which: W/A/PA). Check it once and it shows up everywhere it applies on the site automatically.";
  modsSection.appendChild(modsLegend);

  ["1", "2", "3", "4"].forEach(star => {
    const tierList = STATE.items.mods[star] || [];
    const label = document.createElement("div");
    label.className = "subhead";
    label.textContent = star + "-STAR MODS";
    modsSection.appendChild(label);
    modsSection.appendChild(buildCheckAllRow(tierList, () => renderCatalog()));
    const div = document.createElement("div");
    div.className = "item-grid";
    modsSection.appendChild(div);
    renderModAdminTier(div, tierList, opts);
  });
  root.appendChild(modsSection);

  // Weapons, grouped by category so each category gets its own check-all
  const weaponsSection = document.createElement("section");
  weaponsSection.className = "section";
  weaponsSection.innerHTML = `<div class="section-head"><span class="section-title">WEAPONS</span></div>`;
  for (const cat of WEAPON_CATEGORIES) {
    const catList = STATE.items.weapons.filter(it => (it.categories || []).includes(cat.key));
    if (catList.length === 0) continue;
    const label = document.createElement("div");
    label.className = "subhead";
    label.textContent = cat.label;
    weaponsSection.appendChild(label);
    weaponsSection.appendChild(buildCheckAllRow(catList, () => renderCatalog()));
    const grid = document.createElement("div");
    grid.className = "item-grid";
    weaponsSection.appendChild(grid);
    renderItemGrid(grid, catList, opts);
  }
  root.appendChild(weaponsSection);

  const groups = [
    { key: "armor", title: "ARMOR" },
    { key: "underarmor", title: "UNDER ARMOR" },
    { key: "apparel", title: "APPAREL" },
    { key: "serums", title: "MUTATION SERUMS" },
  ];
  for (const g of groups) {
    const list = STATE.items[g.key];
    if (!list) continue;
    const section = document.createElement("section");
    section.className = "section";
    section.innerHTML = `<div class="section-head"><span class="section-title">${g.title}</span></div>`;
    section.appendChild(buildCheckAllRow(list, () => renderCatalog()));
    const grid = document.createElement("div");
    grid.className = "item-grid";
    section.appendChild(grid);
    renderItemGrid(grid, list, opts);
    root.appendChild(section);
  }

  document.getElementById("controls").style.display = "";
  document.getElementById("downloadItemsBtn").disabled = false;
}

document.getElementById("itemsFile").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    STATE.items = await readFileAsJson(file);
    renderCatalog();
    setStatus("Loaded " + file.name);
  } catch (err) {
    setStatus("Could not parse that file as JSON: " + err.message);
  }
});

document.getElementById("configFile").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    STATE.config = await readFileAsJson(file);
    renderConfigFields();
    setStatus("Loaded " + file.name);
  } catch (err) {
    setStatus("Could not parse that file as JSON: " + err.message);
  }
});

document.getElementById("loadSampleBtn").addEventListener("click", async () => {
  try {
    const [items, config] = await Promise.all([
      fetch("data/items.json").then(r => r.json()),
      fetch("data/config.json").then(r => r.json()),
    ]);
    STATE.items = items;
    STATE.config = config;
    renderCatalog();
    renderConfigFields();
    setStatus("Loaded bundled data from data/");
  } catch (err) {
    setStatus("Couldn't fetch bundled data (open this page through a local server, or use the file pickers above instead).");
  }
});

document.getElementById("downloadItemsBtn").addEventListener("click", () => {
  downloadJson(STATE.items, "items.json");
  setStatus("Downloaded items.json, replace the copy in data/ and commit/push to GitHub.");
});

document.getElementById("downloadConfigBtn").addEventListener("click", () => {
  downloadJson(STATE.config, "config.json");
  setStatus("Downloaded config.json, replace the copy in data/ and commit/push to GitHub.");
});

document.getElementById("search").addEventListener("input", e => {
  STATE.filterText = e.target.value;
  renderCatalog();
});
