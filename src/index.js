import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

const RECIPIENT = "you@example.com"; // must match wrangler.toml destination_address

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function handleContact(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request body." }, 400);
  }

  // Honeypot, bots tend to fill every field, humans never see this one.
  if (body.website) {
    return json({ ok: true }); // pretend success, drop silently
  }

  // Respect the config toggle even if someone hits the endpoint directly.
  let config;
  try {
    const configRes = await env.ASSETS.fetch(new URL("/data/config.json", request.url));
    config = await configRes.json();
  } catch {
    return json({ ok: false, error: "Could not load site config." }, 500);
  }
  if (!config.contact || config.contact.enabled !== true) {
    return json({ ok: false, error: "Contact form is currently disabled." }, 403);
  }

  const { ign = "", discord = "", wants = "", offering = "", message = "" } = body;
  if (!ign.trim() && !discord.trim()) {
    return json({ ok: false, error: "Please include an in-game name or Discord handle." }, 400);
  }
  if (!wants.trim() && !message.trim()) {
    return json({ ok: false, error: "Please include what you're looking for, or a message." }, 400);
  }

  const lines = [
    `New C.A.M.P. vendor request from ${config.campName || "the site"}`,
    "",
    `In-game name: ${ign || "-"}`,
    `Discord: ${discord || "-"}`,
    "",
    "Looking for:",
    wants || "-",
    "",
    "Offering:",
    offering || "-",
    "",
    "Message:",
    message || "-",
  ].join("\n");

  const htmlLines = [
    `<p><strong>New C.A.M.P. vendor request from ${escapeHtml(config.campName || "the site")}</strong></p>`,
    `<p><strong>In-game name:</strong> ${escapeHtml(ign || "-")}<br>`,
    `<strong>Discord:</strong> ${escapeHtml(discord || "-")}</p>`,
    `<p><strong>Looking for:</strong><br>${escapeHtml(wants || "-").replace(/\n/g, "<br>")}</p>`,
    `<p><strong>Offering:</strong><br>${escapeHtml(offering || "-").replace(/\n/g, "<br>")}</p>`,
    `<p><strong>Message:</strong><br>${escapeHtml(message || "-").replace(/\n/g, "<br>")}</p>`,
  ].join("\n");

  const msg = createMimeMessage();
  msg.setSender({ name: "FO76 Camp Vendor Terminal", addr: `noreply@${new URL(request.url).hostname}` });
  msg.setRecipient(RECIPIENT);
  msg.setSubject(`C.A.M.P. vendor request, ${ign || discord || "new contact"}`);
  msg.addMessage({ contentType: "text/plain", data: lines });
  msg.addMessage({ contentType: "text/html", data: htmlLines });

  const email = new EmailMessage(`noreply@${new URL(request.url).hostname}`, RECIPIENT, msg.asRaw());

  try {
    await env.SEB.send(email);
  } catch (err) {
    return json({ ok: false, error: "Email send failed: " + err.message }, 500);
  }

  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/contact" && request.method === "POST") {
      return handleContact(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
