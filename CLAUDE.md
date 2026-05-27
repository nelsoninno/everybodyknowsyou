# everybodyknowsyou.com — Project Brief for Claude

Read this at the start of every session. It replaces the need to re-read prior conversation history.

---

## What this project is

The everybodyknowsyou.com marketing site + audit tool. Static HTML, hosted on **Cloudflare Pages** with custom domain via Cloudflare DNS. Bilingual: **English at `/`, Spanish at `/es/`** (URL-based, Option C architecture).

The workspace folder IS the site repository. Files mounted, editable directly.

---

## Repository

- **GitHub repo:** `nelsoninno/everybodyknowsyou` (github.com/nelsoninno/everybodyknowsyou)
- **Branch:** `main`
- **Hosting:** Cloudflare Pages — auto-deploys on push to main
- **Custom domain:** `everybodyknowsyou.com`
- **Workspace `.git` is intact and committable from /tmp clone (use a PAT)**

### Git workflow

```bash
# Clone fresh (if /tmp/everybodyknowsyou doesn't exist)
git clone https://nelsoninno:PAT@github.com/nelsoninno/everybodyknowsyou.git /tmp/everybodyknowsyou
# After changes
cd /tmp/everybodyknowsyou && git add -A && git commit -m "..." && git push origin main
```

Replace `PAT` with the fine-grained GitHub Personal Access Token (Contents: Read+Write, scoped to this repo). Nelson must provide; not stored in repo.

---

## File structure (after EN-at-root migration)

```
everybodyknowsyou/
├── index.html              # EN homepage (was en/index.html). i18n dict still inside; default lang="en"
├── pricing.html            # EN pricing (Option C: single-language, no dual-span)
├── terms.html              # EN terms
├── es/
│   ├── index.html          # ES homepage (was root/index.html)
│   ├── pricing.html        # ES pricing (dual-spans stripped to Spanish only)
│   └── terms.html          # ES terms (dual-spans stripped)
├── audit/
│   └── index.html          # The audit app — single-file JS i18n, stays as-is
├── images/                 # All site images
├── _redirects              # Cloudflare permanent redirects: /en/* → /:splat (301)
├── sitemap.xml             # All 6 URL+audit+llms entries with hreflang pairs
├── robots.txt              # Allow all; sitemap reference
├── llms.txt                # AI-readable site profile
├── llms-full.txt           # Full AI profile
├── CNAME                   # everybodyknowsyou.com (kept from legacy)
├── og.jpg                  # Legacy social share (current canonical is /images/everybodyknowsyou_socialshare.jpg)
├── WeSpark Logo Classic White Wide.png   # Footer "Powered by" logo
└── CLAUDE.md               # This file
```

---

## Language architecture (Option C — URL-based with bilingual JS audit)

- **English is the default language.** Lives at `/`, `/pricing`, `/terms`.
- **Spanish is at `/es/`, `/es/pricing`, `/es/terms`.**
- Each page is **hardcoded in one language only** (no per-element dual-span).
- The "EN ↔ ES" switcher in the topbar is a **plain `<a href>` link to the equivalent URL in the other language** — no in-place JS toggling.
- The **audit page is the only exception** — it stays as a single-URL bilingual SPA with `LANG` JS variable (because the form/state is too complex to duplicate). Its footer links rewrite themselves to `/pricing` or `/es/pricing` based on current LANG.

### First-visit language preselection

Every root and `/es/` page has a small synchronous `<script>` at the top of `<head>` that:

1. Checks `localStorage.eky_lang`. If set, respects the user's prior choice — no redirect.
2. Otherwise: detects (a) browser `navigator.language` and (b) referrer URL TLD (Spanish country TLDs trigger Spanish preference).
3. If on `/` and signal says Spanish → `window.location.replace("/es/" + search + hash)` and save `localStorage.eky_lang = "es"`.
4. If on `/es/` and signal says English (without a Spanish referrer overruling it) → redirect to `/` and save `localStorage.eky_lang = "en"`.
5. Clicking the language switcher saves the user's chosen language to `localStorage` before navigating.
6. SEO bots / no-JS visitors: see the URL's hardcoded language. No cloaking.

### Redirects for legacy URLs

`_redirects` (Cloudflare) handles the old `/en/...` URLs:
```
/en/pricing  /pricing  301
/en/terms    /terms    301
/en/         /         301
/en          /         301
/en/*        /:splat   301
```

All inbound links to old `/en/...` URLs (LinkedIn, social profiles, press, etc.) get 301'd permanently.

---

## SEO / GEO setup

- `<link rel="canonical">` on every page → its own URL
- `hreflang` triplet per page: `en` → root URL, `es` → /es/ URL, `x-default` → root (English)
- `og:url` / `twitter:url` → page's own canonical
- JSON-LD `Organization`, `ProfessionalService`, `WebSite` schemas on relevant pages
- `sameAs` includes `https://wespark.io`, LinkedIn, Instagram
- `robots.txt` allows all crawlers, references `sitemap.xml`
- `sitemap.xml` lists all 6 main URLs + audit + llms files, with hreflang pairs
- `llms.txt` and `llms-full.txt` for AI/LLM discoverability

---

## Key tech details

- All HTML/CSS/JS inline per page (no build step, no bundler)
- WhatsApp number: **`50374927681`** — wired into every `.cta` button by per-page JS
- Footer is identical structure on every page (eky-logo, foot copy, flinks, build CTA, social icons, powered-by)
- Social: LinkedIn + Instagram inline SVG icons in footer (lime, hover white)

---

## SEO/GEO — pending pickup
- [ ] Bing Webmaster Tools — submit sitemap
- [ ] Wikidata entry — feeds Google Knowledge Panel
- [ ] PageSpeed Insights audit on the new English root
- [ ] After flip stabilizes: update LinkedIn/Instagram/Forbes citations to point at new English root URLs (low priority — 301s handle it)

---

## Last major commits
- EN-at-root migration: Spanish moved to /es/, English to root, dual-spans stripped, _redirects added, hreflang fully reworked, language preselection JS
- WhatsApp number set to +50374927681 on every CTA
- LinkedIn + Instagram added to footer (icons + sameAs)
- Audit "100% in 3 days" CTA gained asterisk + honest footnote
