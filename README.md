# Fallout 76 HTML Crafting Menu

A ROBCO-terminal-styled crafting/trade menu for your Fallout 76 C.A.M.P. List legendary mods
(by star tier, with per-item materials and hover/tap descriptions), weapons (grouped by type),
armor, apparel, under armor, and mutation serums, everything craftable and tradeable. Visitors
check off what they want, and a sticky cart carries their picks into a contact form.

Not affiliated with Bethesda Softworks or Fallout 76. Fan-made tool, MIT licensed, do with it
what you like.

**Live example:** [fo76.a42.co](https://fo76.a42.co) is a real camp running this project, take a
look for a sense of what it looks like in practice.

**No database.** Everything lives in two plain JSON files you edit by hand or through a built-in
offline admin page. **No build step.** It's HTML, CSS, and vanilla JS, no framework, no bundler
for the site itself.

## Which branch do you want?

This repo has two branches depending on how you want to host it:

- **`main`**: runs as a Cloudflare Worker. Adds a working contact form that emails you directly
  via Cloudflare's own Email Routing, no third-party email service, no API key to manage. Free
  tier covers this comfortably for a personal site.
- **`static`**: zero backend. Deploy the `public/` folder to literally anywhere that serves static
  files, GitHub Pages, Netlify, Vercel, S3, your own web server. The contact form falls back to a
  `mailto:` link that opens the visitor's email client instead of sending server-side. No Wrangler,
  no npm dependencies, no build step at all.

If you don't know which you want: if you already use Cloudflare or don't mind a free account,
`main` gets you a real working contact form. If you just want to drop files somewhere and be done,
use `static`.

## Quick start (`main` branch, Cloudflare Workers)

1. **Use this repo as a template** (GitHub's "Use this template" button) or fork it.
2. Edit `public/data/config.json` with your camp name, in-game name, Discord, and trade terms.
3. Edit `public/data/items.json`, or use `public/admin.html` (see below), to mark what you
   actually have available. Everything ships unchecked on purpose, so nothing looks available
   until you've confirmed it.
4. Push to GitHub, then in the Cloudflare dashboard: **Workers & Pages → Create → Workers →
   Connect to Git**, pick your repo. Cloudflare reads `wrangler.toml` automatically.
   - Alternatively, this repo's `.github/workflows/deploy.yml` deploys via GitHub Actions using
     `wrangler-action` instead, if you'd rather trigger deploys from a plain `git push` than
     Cloudflare's own connected-repo feature. Either works, don't set up both at once, pick one.
     For the Actions route, add `CLOUDFLARE_API_TOKEN` as a repo secret
     (Settings → Secrets and variables → Actions).
5. **Set up the contact form's email**: in `wrangler.toml`, set `destination_address` under
   `[[send_email]]` to your own email, and change `RECIPIENT` in `src/index.js` to match exactly
   (both need to agree). In the Cloudflare dashboard, enable Email Routing for your domain's zone
   and verify that same address as a destination, or `env.SEB.send()` will fail at request time.
   If you don't want the contact form at all, set `"contact": { "enabled": false }` in
   `config.json` and skip this step entirely.
6. Optional: attach a custom domain under the Worker's **Settings → Domains & Routes**, and
   uncomment the `routes` block in `wrangler.toml` to match.

### Local preview

```bash
npm install
npx wrangler dev
```

`fetch()` can't read local JSON over a `file://` path (browsers block it), so double-clicking
`index.html` won't work, `wrangler dev` runs a real local server and lets you test the contact
form too.

## Quick start (`static` branch, host anywhere)

```bash
git clone --branch static https://github.com/<you>/<your-repo>.git
```

1. Edit `public/data/config.json` and `public/data/items.json` the same way as above.
2. Upload the contents of `public/` to any static host. GitHub Pages: Settings → Pages → set
   source to this branch (or a `docs/` copy, GitHub Pages doesn't serve from `public/` by
   default, check its docs for the exact source-folder setting). Netlify or Vercel: point either
   at this repo/branch with the publish directory set to `public`, no build command needed.
3. That's it, no environment variables, no secrets, no server code.

The contact form on this branch opens the visitor's email client via a `mailto:` link
pre-filled with their message instead of sending it server-side. It's less seamless than the
Workers version but needs nothing running on your end.

## Editing what's available

Open `public/admin.html` (through a local server, or after deploying, it's just another page
on the site, though you'd probably want to keep its URL private since it has no login). It runs
entirely in your browser, loads your JSON via file picker, and never sends anything anywhere.

1. Load `data/items.json` and `data/config.json`.
2. Check items on/off. **CHECK ALL / UNCHECK ALL** buttons sit above every section for fast setup.
3. Download the updated files, replace the copies in `public/data/`, commit, push.

You can also hand-edit the JSON directly. See **Data model** below for the shape of each file.

## Data model

`public/data/config.json`:

```jsonc
{
  "campName": "...",
  "inGameName": "...",
  "discord": "...",
  "server": "...",
  "tagline": "...",
  "note": "...",
  "modsNote": "Shown above the MODS section, e.g. material/trade terms specific to crafting mods.",
  "trade": {
    "acceptingCaps": true,          // set false to show a "not accepting caps" banner instead
    "note": "Optional note shown near the top of the page and on the contact page."
  },
  "contact": {
    "enabled": true,                // hides the CONTACT nav link + form entirely when false
    "prompt": "Shown at the top of the contact form.",
    "recipientEmail": "you@example.com" // static branch only: the mailto: link's destination
  }
}
```

`public/data/items.json` has six top-level arrays/objects: `mods`, `weapons`, `armor`, `apparel`,
`serums`, `underarmor`.

**Armor, apparel, serums, and under armor** are flat arrays of plain items:

```jsonc
{ "id": "ar-metal", "name": "Metal Armor (full set)", "available": false }
```

**Weapons** carry a `categories` array instead of living in one flat pile:

```jsonc
{ "id": "wp-boxing-glove", "name": "Boxing Glove", "available": false, "categories": ["blunt", "fist"] }
```

`categories` decides which subsection(s) of the public WEAPONS area an item shows up in. The
built-in categories are `blunt`, `fist`, `power-tools`, `sharp`, `energy`, `heavy`, `launchers`,
`machine-guns`, `pipe`, `survival`, labels for these live in `WEAPON_CATEGORIES` near the top of
`public/catalog.js`, edit that array if you want different categories or a different order. A
weapon that fits more than one category is still just one entry, checked once in admin, it shows
up in every matching section automatically.

**Mods** are grouped by star tier (`mods["1"]` through `mods["4"]`), one entry per mod regardless
of how many item types it applies to:

```jsonc
{
  "id": "m1-adrenal",
  "name": "Adrenal",
  "material": "1 Adrenal Reaction Serum",
  "available": false,
  "appliesTo": ["weapon", "armor", "powerArmor"],
  "effects": {
    "weapon": "+10% damage per kill while on a kill streak",
    "armor": "+10 Damage and Energy Resistance per kill while on a kill streak (max 10 stacks)",
    "powerArmor": "+10 Damage and Energy Resistance per kill while on a kill streak (max 10 stacks)"
  },
  "wikiUrl": "https://fallout.fandom.com/wiki/Adrenal"
}
```

`appliesTo` decides which of the three MODS subsections (Weapon Mods, Armor Mods, Power Armor
Mods) a mod shows up in. `effects` backs the hover/tap tooltip on each mod, one line of text per
applicable type, with a link out to the Fallout Wiki. A mod that applies to all three is still one
row in admin, checked once.

Any section or subsection with zero available items just doesn't render on the public page, if
you're not offering apparel at all, the APPAREL heading never shows up. A **SHOW OUT-OF-STOCK**
toggle on the public page reveals the full catalog (struck through) so visitors can see everything
you're able to make, not just what's currently in stock.

### Adding new items

Add a new object to the right array (or the right star tier under `mods`) with a unique `id`, that's
it, nothing else in the code needs to change. `id` only needs to be unique within the whole file,
not just within its own array.

## The request cart

Every available item has a small checkbox. Selecting one adds it to a `sessionStorage`-backed
cart (clears when the tab closes) and shows a sticky bar at the bottom with a running count and a
**REVIEW REQUEST** button that jumps to the contact page and pre-fills the "what you're looking
for" field with the selected item names.

## Keeping the catalog data current

The item lists ship as a reasonably thorough starting point (legendary mods with materials, common
craftable weapons/armor/apparel, mutation serums), but Fallout 76 adds new craftable/tradeable
items with nearly every seasonal update, and tradeability rules (Gold Bullion plans, event
exclusivity, etc.) do change over time. Treat the shipped data as a template to verify against
your own game knowledge, not a guaranteed-current source, and update `items.json` as things change.
