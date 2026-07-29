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

## 2026-06-03 — Findability + favicon refresh
- **Rotating pill on homepage:** added CSS so the `.rot` pill always wraps below the "Perfect if you want to" prefix on both desktop and mobile (`.wholine [data-i18n="who_lead"]{display:block}`). EN + ES.
- **Favicon stack overhaul (cache-bust):** generated `favicon.ico` (multi-res 16/32/48), `favicon-16x16.png`, `favicon-32x32.png`, `favicon-192x192.png`, `favicon-512x512.png`, `apple-touch-icon.png` (180), and `site.webmanifest`, all at repo root. All 10 HTML pages updated to reference the new stack. The new filenames + new root paths force Google and browsers to refresh their cached icon (was showing the old orange-EKY circle).
- **FAQPage JSON-LD** added to `/` and `/es/` (7 Q&As each, EN + ES, mirroring `llms-full.txt`). High-leverage rich-result driver.
- **El Salvador local SEO:**
  - Meta keywords strengthened with "diseño web El Salvador", "agencia web El Salvador", "web design El Salvador", "build my website", "EKY", "everybodyknowsyou", etc.
  - Organization JSON-LD: added telephone, contactPoint, knowsAbout, slogan, addressRegion, knowsLanguage, alternateName array.
  - ProfessionalService JSON-LD: upgraded to `["ProfessionalService","LocalBusiness"]`, added telephone, slogan, serviceType, openingHoursSpecification, addressRegion.
- **llms-full.txt:** fixed two sentences that still said "Spanish-first" (contradicted the EN-at-root architecture).
- **sitemap.xml:** all `lastmod` bumped to 2026-06-03 (signals freshness, prompts re-crawl).

## 2026-06-03 (second round) — Performance + local-SEO finishing pass
- **`addressLocality: "San Salvador"`** added to PostalAddress in Organization + ProfessionalService schemas (both EN and ES). The address now reads SV → El Salvador → San Salvador, giving Google enough granularity for local-pack inclusion.
- **`Disallow: /api/`** added to robots.txt. Stops Google from probing the POST-only Cloudflare Function endpoints (was creating the "Blocked due to other 4xx" line in GSC).
- **Async-load Google Fonts** across all 10 HTML pages (`media="print" onload="this.media='all'"` + `<noscript>` fallback). Estimated ~2s FCP improvement on mobile (Lighthouse: render-blocking saving 2,020ms).
- **Logo PNGs shrunk** via Pillow palette-mode quantization (PNG-8, 64 colors). `eky-logo-complete.png` 15.2KB → 7.1KB (53% smaller). Three other logo variants also halved or better. The brand wordmark renders identically — only flat colors.
- **Updated website-build skill's `seo-ai-findability.md`** so every future client ships with the full upgraded stack (favicon at root, FAQPage, LocalBusiness, telephone, async fonts, addressLocality).

## SEO/GEO — status (updated 2026-06-03)
- [x] Google Search Console — sitemap submitted, re-indexing requested for `/` and `/es/`
- [x] Bing Webmaster Tools — sitemap submitted
- [ ] **Google Business Profile** — Nelson: do tomorrow (highest local-SEO leverage)
- [ ] **Wikidata entry** — Nelson: check tomorrow
- [ ] Backlinks from owned properties — Nelson: doing slowly
- [x] PageSpeed Insights — 86 perf / 100 SEO / 100 best practices / 96 a11y on mobile (next round can target the render-blocking + image-delivery insights for ~95+)

## 2026-07-13 — Showcase split (Business/Personal) + NGO offer
- **Homepage "See what we make" split into two groups (EN + ES, both index files):**
  - New **Business websites** block on a black background (`.bg-black`): Origen Ganadero (origenganadero.pages.dev), Build In El Salvador (buildinelsalvador.com), and Tacos Hermanos (Coming soon, non-link card with lime "Coming soon" badge). Three cards only.
  - **Personal websites** block on white: Unstable Innovation, Nelson Inno, Marea Decor, Zaragoza Home. (Marea is a personal-scale brand, grouped with bios/book/hobby sites, not a formal business.)
  - Sub-line now reads "Real sites we've built, for businesses and for people." / "Sitios reales que hemos creado, para empresas y para personas."
  - Added i18n keys to both LOCALES dicts in both files: pr_biz, pr_per, pr_soon, prb1, prb2, prb3; updated pr_s.
  - Added CSS: `.show-group` headings, `.soon-badge`, coming-soon card states, and `.project-card{color:var(--ink)}` (fixes white-on-white card text over the black section).
  - New thumbnails (aspect ratio preserved, optimized): origenganadero.jpg, buildinelsalvador.jpg, tacoshermanos.jpg.
- **NGO / nonprofit offer added (EN + ES):** full tier upgrade at no extra cost, the Business website for the Personal price; we may ask for documentation to confirm the organization. (No Executive Flash line, per Nelson.)
  - Pricing pages: lime callout under the plan cards (pricing.html + es/pricing.html) and a matching Q in each page's FAQPage JSON-LD.
  - FAQ pages: a new visible Q&A plus a matching entry in the FAQPage JSON-LD (faq/index.html + es/faq/index.html).
- Verified: all JSON-LD parses; no new em-dashes; footer credit intact; rendered both languages headless (business/personal groups, pricing callouts, FAQ items) before deploy.

### 2026-07-14 — Showcase polish (follow-up)
- "Business websites" heading now EKY green (`--lime`) via `.bg-black .show-group`.
- "Coming soon" badge + label now EKY pink (`--pink`).
- Origen Ganadero link corrected: origenganadero.pages.dev -> origenganadero.com (EN + ES).
- Personal group gained a descriptor line (new i18n key `pr_per_s`): "Book pages, biography pages, hobby pages, and NGO pages." / "Páginas de libros, biografías, pasatiempos y ONG."
- Hid Tacos Hermanos (Coming soon) for now: card commented out in both index files, business grid switched g3 -> centered g2. To restore: uncomment the card and set the business grid back to g3.

### 2026-07-19 — Press: Diario El Salvador feature (authority capture)
- Article: "La presencia digital es clave para las marcas en la era de la IA" by Kevin Rivera, Diario El Salvador, 2026-07-19 (Spanish). ~7 plain-text mentions of everybodyknowsyou; link to be added by Kevin (also now an EKY client -> kevinrivera.io).
- Organization JSON-LD (#org, EN + ES): added `subjectOf` NewsArticle citing the article (publisher Diario El Salvador, author Kevin Rivera, datePublished 2026-07-19); founder changed to an array adding cofounder Marcela Lemus Walsh.
- Homepage: added a subtle "As featured in / Como se vio en · Diario El Salvador" trust strip below the hero (new i18n key `press_label`), linking to the article.
- llms.txt + llms-full.txt: new "Press and media coverage" section; Founded-by line now names Nelson Inno + Marcela Lemus Walsh; llms-full Showcase synced to the Business/Personal grouping.
- OPEN: Nelson mentioned nelsoninnovation.com as his site, but the site/schema use nelsoninno.com throughout — confirm canonical domain before changing.

### 2026-07-29 — New /articles section (content + AI-findability)
- New section at /articles (EN) and /es/articles (ES): index pages + article template matching the subpage design (header, footer, tokens), each with Article/CollectionPage + Breadcrumb JSON-LD, OG/meta, hreflang.
- Article 1: "The Economy of Digital Trust" by Nelson Inno (EN, /articles/the-economy-of-digital-trust) — full text as-is, BlogPosting schema, source note (SparkToro/Search Engine Land). ES version pending Nelson's LATAM-Spanish translation.
- Article 2: "Digital presence is key for brands in the AI era" (EN, /articles/digital-presence-is-key-in-the-ai-era) — faithful English translation of the Diario El Salvador feature by Kevin Rivera, with a prominent attribution/disclaimer box, link to the Spanish original, NewsArticle schema (author Kevin Rivera, publisher Diario El Salvador, isBasedOn original, translator EKY). Note: $15 billones ES rendered as $15 trillion EN. The Spanish original stays on Diario (ES index links out to it).
- Wired: "Articles" added to homepage footers (new i18n key f_articles) + faq footers; 4 URLs added to sitemap.xml; Articles section added to llms.txt + llms-full.txt.
- Verified all pages render EN+ES, JSON-LD valid, no em-dashes in visible copy.
- TODO when Nelson sends it: add ES version of "The Economy of Digital Trust" at /es/articles/... with hreflang pairing; consider adding the Articles footer link to pricing/terms/brand too.
