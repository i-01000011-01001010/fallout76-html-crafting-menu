const BOOT_LINES = [
  "ROBCO INDUSTRIES (TM) TERMLINK PROTOCOL",
  "LOADING CONFIG.JSON... OK",
  "OPENING CONTACT CHANNEL...",
];

function typeBoot(cb) {
  const el = document.getElementById("boot");
  let out = "";
  let li = 0;
  function nextLine() {
    if (li >= BOOT_LINES.length) {
      out += "\n> READY_";
      el.innerHTML = out.replace(/(READY_)/, '<span class="ready">$1</span>');
      setTimeout(cb, 200);
      return;
    }
    out += (li > 0 ? "\n" : "") + BOOT_LINES[li];
    el.textContent = out;
    li++;
    setTimeout(nextLine, 90);
  }
  nextLine();
}

async function loadConfig() {
  const res = await fetch("data/config.json");
  return res.json();
}

function renderHeader(config) {
  document.getElementById("campName").textContent = config.campName || "CAMP NAME";
  document.getElementById("ign").textContent = config.inGameName || "-";
  document.getElementById("discord").textContent = config.discord || "-";
  document.getElementById("masthead").style.display = "";
  document.getElementById("navRow").style.display = "";
  document.getElementById("contactMain").style.display = "";

  const banner = document.getElementById("tradeBanner");
  if (config.trade) {
    if (config.trade.acceptingCaps === false) {
      banner.textContent = config.trade.note || "Not accepting caps right now, materials, items, or other trades only.";
      banner.className = "trade-banner";
      banner.style.display = "";
    } else if (config.trade.note) {
      banner.textContent = config.trade.note;
      banner.className = "trade-banner accepting";
      banner.style.display = "";
    }
  }
}

function prefillWants() {
  const cart = cartLoad();
  if (cart.length === 0) return;
  const names = cart.map(i => i.name);
  document.getElementById("fWants").value = names.join("\n");
}

function setStatus(msg, kind) {
  const el = document.getElementById("formStatus");
  el.textContent = msg;
  el.className = "form-status " + (kind || "");
}

function attachForm(config) {
  const form = document.getElementById("contactForm");
  const btn = document.getElementById("submitBtn");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    btn.disabled = true;
    setStatus("Sending...", "");

    const payload = {
      website: form.website.value, // honeypot
      ign: form.ign.value.trim(),
      discord: form.discord.value.trim(),
      wants: form.wants.value.trim(),
      offering: form.offering.value.trim(),
      message: form.message.value.trim(),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("Request sent, thanks! Expect a reply in-game or on Discord.", "ok");
        form.reset();
        cartClear();
      } else {
        setStatus(data.error || "Something went wrong sending that.", "err");
      }
    } catch (err) {
      setStatus("Network error, please try again in a moment.", "err");
    } finally {
      btn.disabled = false;
    }
  });
}

(async function init() {
  typeBoot(async () => {
    try {
      const config = await loadConfig();
      renderHeader(config);
      if (config.contact && config.contact.enabled) {
        document.getElementById("enabledSection").style.display = "";
        document.getElementById("contactPrompt").textContent = config.contact.prompt || "";
        prefillWants();
        attachForm(config);
      } else {
        document.getElementById("disabledSection").style.display = "";
      }
    } catch (err) {
      document.getElementById("boot").textContent += "\n\n!! ERROR LOADING DATA: " + err.message;
      console.error(err);
    }
  });
})();
