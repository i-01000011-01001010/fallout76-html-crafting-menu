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

function buildEmailBody(payload) {
  return [
    `In-game name: ${payload.ign || "-"}`,
    `Discord: ${payload.discord || "-"}`,
    "",
    "Looking for:",
    payload.wants || "-",
    "",
    "Offering:",
    payload.offering || "-",
    "",
    "Message:",
    payload.message || "-",
  ].join("\n");
}

function attachForm(config) {
  const form = document.getElementById("contactForm");
  const recipient = (config.contact && config.contact.recipientEmail) || "";

  form.addEventListener("submit", e => {
    e.preventDefault();

    if (form.website.value) return; // honeypot, quietly do nothing

    const payload = {
      ign: form.ign.value.trim(),
      discord: form.discord.value.trim(),
      wants: form.wants.value.trim(),
      offering: form.offering.value.trim(),
      message: form.message.value.trim(),
    };

    if (!payload.ign.trim() && !payload.discord.trim()) {
      setStatus("Please include an in-game name or Discord handle.", "err");
      return;
    }
    if (!payload.wants.trim() && !payload.message.trim()) {
      setStatus("Please include what you're looking for, or a message.", "err");
      return;
    }

    if (!recipient) {
      setStatus('No contact email is configured yet, add "recipientEmail" under "contact" in data/config.json.', "err");
      return;
    }

    const subject = `C.A.M.P. vendor request, ${payload.ign || payload.discord || "new contact"}`;
    const body = buildEmailBody(payload);
    const mailto = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    setStatus("Opening your email client... if nothing happens, use the link below.", "ok");
    window.location.href = mailto;

    const fallback = document.getElementById("mailtoFallback");
    fallback.href = mailto;
    fallback.style.display = "";
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
