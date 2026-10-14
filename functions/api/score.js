/* =====================================================================
   EVERYBODY KNOWS YOU — AI Discoverability backend  (levels + plain-language output)
   ---------------------------------------------------------------------
   Modes: url_audit (pasted URL), discover (name search, asks the
   user to confirm), identity_audit (confirmed URL), no_site.
   Knowledge Panel signal removed (per product decision).
   measureHome is intentionally regex-free
   (Cloudflare bundler bug with quote-mixed regex char classes).
   ===================================================================== */

const PLATFORMS = {
  linkedin:["linkedin.com"], wikipedia:["wikipedia.org"], wikidata:["wikidata.org"],
  twitter:["twitter.com","x.com"], instagram:["instagram.com"],
  facebook:["facebook.com","fb.com"], youtube:["youtube.com","youtu.be"],
  tiktok:["tiktok.com"], threads:["threads.net"], github:["github.com"],
  imdb:["imdb.com"], crunchbase:["crunchbase.com"], spotify:["spotify.com"],
  medium:["medium.com"], substack:["substack.com"], behance:["behance.net"],
  dribbble:["dribbble.com"], patreon:["patreon.com"], pinterest:["pinterest.com"],
  reddit:["reddit.com"], quora:["quora.com"], goodreads:["goodreads.com"],
  vimeo:["vimeo.com"], soundcloud:["soundcloud.com"], aboutme:["about.me"],
  linktree:["linktr.ee","beacons.ai","bio.link"],
  // Creator / photographer / designer platforms — added so user profiles
  // on these sites (e.g. unsplash.com/@username) are correctly demoted
  // to the profiles list instead of becoming the audit candidate.
  unsplash:["unsplash.com"], flickr:["flickr.com"], px500:["500px.com"],
  deviantart:["deviantart.com"], artstation:["artstation.com"],
  vsco:["vsco.co"], readcv:["read.cv"], bandcamp:["bandcamp.com"],
  twitch:["twitch.tv"], bluesky:["bsky.app","bsky.social"],
  gumroad:["gumroad.com"], producthunt:["producthunt.com"],
  notion:["notion.site","notion.so"], cara:["cara.app"]
};
const NEWS_PR = [
  "bloomberg.com","forbes.com","businesswire.com","prnewswire.com",
  "reuters.com","techcrunch.com","nytimes.com","theverge.com","wsj.com",
  "ft.com","yahoo.com","businessinsider.com","cnbc.com","bbc.com",
  "cnn.com","wired.com","gizmodo.com","mashable.com","fastcompany.com"
];
const FETCH_TIMEOUT = 8000;

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: cors(context) });
}
export async function onRequestPost(context) {
  const headers = { "Content-Type": "application/json", ...cors(context) };
  try {
    const body = await context.request.json();
    const result = await handle(body, context.env || {});
    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (err) {
    try { console.error("score.js error:", err && (err.stack || err.message || err)); } catch (_) {}
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), { status: 200, headers });
  }
}
function cors(context) {
  const allow = (context.env && context.env.ALLOWED_ORIGIN) || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

async function handle(body, env) {
  const query = (body && body.query ? String(body.query) : "").trim();
  const country = body && body.country ? String(body.country) : "";
  const countryName = body && body.countryName ? String(body.countryName) : "";
  const explicitMode = body && body.mode ? String(body.mode) : "";
  const confirmedUrl = body && body.confirmedUrl ? String(body.confirmedUrl) : "";
  const passedProfiles = Array.isArray(body && body.profiles) ? body.profiles : [];
  const passedMatches = (body && typeof body.matches === "number") ? body.matches : null;

  if (!query && !confirmedUrl) return { error: "Please type your name, business, or website." };

  let mode = explicitMode;
  if (!mode) {
    if (confirmedUrl) mode = "identity_audit";
    else if (looksLikeUrl(query)) mode = "url_audit";
    else mode = "discover";
  }
  // Back-compat: older front-end may still send mode:"audit"
  if (mode === "audit") mode = "identity_audit";

  if (mode === "url_audit") return await modeWebsiteAudit({ url: query, country, countryName }, env);
  if (mode === "no_site")  return await modeNoSite({ query, country, countryName, passedProfiles, passedMatches }, env);
  if (mode === "identity_audit") {
    const url = confirmedUrl || query;
    return await modeIdentityAudit({ url, name: query, country, countryName, passedProfiles, passedMatches }, env);
  }
  return await modeDiscover({ query, country, countryName }, env);
}

/* MODE: url_audit — pasted URL → pure 100-pt website audit */
async function modeWebsiteAudit({ url, country, countryName }, env) {
  /* UNIFIED SCORING: previously this mode used a separate "Layer S"
     scoring path (5 site-only signals totaling 100) which gave different
     scores than the identity_audit path. To make every audit tell the
     same story, this now:
       1. Fetches the URL and extracts an entity name from JSON-LD
          (preferred) or <title> (fallback) or hostname (last resort)
       2. Runs a Serper search using that name as the query
       3. Calls modeIdentityAudit with the discovered profiles, so the
          same Layer A + Layer B scoring applies as if the user had
          typed the name first
     One scoring model, one story, regardless of how the user arrived. */
  const target = normalizeUrl(url);
  if (!target) return { error: "That URL doesn't look right. Try again." };

  /* 1. Pre-fetch the page just to extract identity context */
  const home = await fetchText(target);
  if (!home.ok) return { error: "We couldn't reach that website. Check the address and try again." };
  const html = home.text || "";
  const sd = analyzeJsonLd(extractJsonLd(html));

  /* 2. Derive entity name (best -> worst): JSON-LD name, <title>, domain */
  let entityName = (sd.name || "").trim();
  if (!entityName) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      /* titles often look like "Brand — Tagline" or "Person | Role" — take
         the first segment so we get the entity, not the marketing copy */
      const raw = titleMatch[1].replace(/&amp;/g, "&").trim();
      entityName = raw.split(/\s+[\u2014\u2013\-|·]\s+/)[0].trim();
    }
  }
  if (!entityName) {
    entityName = hostOf(target).split(".")[0];
  }

  /* 3. Run discovery to get profiles + matches (Layer A inputs) */
  let profiles = [];
  let matches = 1;
  if (env.SERPER_API_KEY) {
    try {
      const search = await serper(entityName, country, env);
      if (search.ok) {
        profiles = extractProfiles(search.data, entityName);
        matches = estimateMatches(search.data, entityName);
      }
    } catch (e) { /* fall through with empty profiles */ }
  }

  /* 4. Hand off to identity_audit for unified scoring */
  return await modeIdentityAudit({
    url: target,
    name: entityName,
    country,
    countryName,
    passedProfiles: profiles,
    passedMatches: matches
  }, env);
}

/* MODE: discover — name → candidate + profiles + Layer A preview */
async function modeDiscover({ query, country, countryName }, env) {
  if (!env.SERPER_API_KEY) {
    return { stage:"needs_confirmation", mode:"discover", candidate:null, profiles:[], matches:1 };
  }
  const search = await serper(query, country, env);
  if (!search.ok) {
    return { stage:"needs_confirmation", mode:"discover", candidate:null, profiles:[], matches:1 };
  }
  const profiles = extractProfiles(search.data, query);
  const candidate = pickCandidate(search.data, query);
  const matches = estimateMatches(search.data, query);
  return { stage:"needs_confirmation", mode:"discover", candidate, profiles, matches };
}

/* MODE: no_site — world checks only, cap 40 */
async function modeNoSite({ query, country, countryName, passedProfiles, passedMatches }, env) {
  let profiles = passedProfiles;
  let matches = (typeof passedMatches === "number") ? passedMatches : 1;
  if (!profiles.length && env.SERPER_API_KEY) {
    const search = await serper(query, country, env);
    if (search.ok) { profiles = extractProfiles(search.data, query); matches = estimateMatches(search.data, query); }
  }
  const sig = { ...measureWorld({ profiles, matches }), ...emptyHome() };
  const score = Math.min(scoreFrom(sig), NO_SITE_CAP);
  return { stage:"result", mode:"no_site", score, level: levelFor(score), scoreCap: NO_SITE_CAP, hasNoSite: true, resolvedUrl: null, candidate: null, profiles, matches, signals: toPublicSignals(sig) };
}

/* MODE: identity_audit — world + home checks */
async function modeIdentityAudit({ url, name, country, countryName, passedProfiles, passedMatches }, env) {
  const target = normalizeUrl(url);
  if (!target) return { error: "That URL doesn't look right. Try again." };
  const origin = originOf(target);
  const [home, llms, llmsFull, robots, sitemap] = await Promise.all([
    fetchText(target), fetchText(origin + "/llms.txt"), fetchText(origin + "/llms-full.txt"),
    fetchText(origin + "/robots.txt"), fetchText(origin + "/sitemap.xml")
  ]);
  if (!home.ok && !llms.ok) return { error: "We couldn't reach that website. Check the address and try again." };
  const html = home.text || "";
  const sd = analyzeJsonLd(extractJsonLd(html));

  let profiles = passedProfiles;
  let matches = (typeof passedMatches === "number") ? passedMatches : 1;
  if (!profiles.length && sd.sameAs.length) {
    profiles = sd.sameAs.map(u => ({ platform: classifyHost(u) || "other", url: u, title: "" }));
    matches = 1;
  }
  /* COMMIT B (hotfixed): when the site declares sameAs, tag each AI-found
     profile with verification status (host present in sameAs or not).
     We surface the gap via the "unverified_profiles" tip BUT do NOT filter
     world scoring — an incomplete sameAs shouldn't punish someone whose
     name is unique and whose AI-found profiles are clearly all theirs
     (Nelson Inno case). Verified tagging stays so we can use it richer
     in the result UI later. */
  const sameAsHosts = new Set((sd.sameAs || []).map(hostOf).filter(Boolean));
  const useSameAsFilter = sameAsHosts.size > 0;
  if (useSameAsFilter) {
    profiles = profiles.map(p => ({ ...p, verified: sameAsHosts.has(hostOf(p.url)) }));
  } else {
    profiles = profiles.map(p => ({ ...p, verified: false }));
  }
  const unverifiedProfiles = useSameAsFilter
    ? profiles.filter(p => !p.verified)
    : [];
  const unverifiedPlatforms = [...new Set(unverifiedProfiles.map(p => p.platform).filter(Boolean))];
  const sig = {
    ...measureWorld({ profiles, matches, unverifiedPlatforms }),   // full profile list, not filtered
    ...measureHome({ home, llms, llmsFull, robots, sitemap, html, sd, target, profiles })
  };
  const score = scoreFrom(sig);
  /* "verified" is an internal flag; strip it from what the browser sees */
  const publicProfiles = profiles.map(p => ({ platform: p.platform, url: p.url, title: p.title || "" }));
  return { stage:"result", mode:"identity_audit", score, level: levelFor(score), scoreCap: 100, hasNoSite: false, resolvedUrl: target, candidate: null, profiles: publicProfiles, matches, signals: toPublicSignals(sig) };
}

/* Scoring. The browser only receives neutral check ids, a state,
   the score and the level. Never return weights or points. */
const NO_SITE_CAP = 40;
const LEVEL_MINS = [0, 25, 50, 70, 90]; // index + 1 = level

function levelFor(score) {
  let lvl = 1;
  for (let i = 0; i < LEVEL_MINS.length; i++) if (score >= LEVEL_MINS[i]) lvl = i + 1;
  return lvl;
}

function measureWorld({ profiles, matches, unverifiedPlatforms }) {
  const platformsSeen = new Set((profiles || []).map(p => p.platform).filter(Boolean));
  const breadth = platformsSeen.size;
  let aPts = 0, aState = "none";
  if (breadth >= 3) { aPts = 25; aState = "full"; }
  else if (breadth === 2) { aPts = 18; aState = "partial"; }
  else if (breadth === 1) { aPts = 10; aState = "partial"; }
  const m = (typeof matches === "number") ? matches : 1;
  let cPts = 0, cState = "none";
  if (m <= 1) { cPts = 15; cState = "full"; }
  else if (m <= 3) { cPts = 8; cState = "partial"; }
  return {
    presence: { state: aState, pts: aPts, meta: { count: breadth, platforms: [...platformsSeen], unverified: (unverifiedPlatforms || []).length > 0 } },
    clarity:  { state: cState, pts: cPts, meta: { matches: m } }
  };
}

function measureHome({ home, llms, llmsFull, robots, sitemap, html, sd, target, profiles }) {
  const b1state = home.ok ? "full" : (home.status > 0 ? "partial" : "none");
  const b1pts = b1state === "full" ? 6 : (b1state === "partial" ? 3 : 0);
  const llmsBody = (llms.ok && llms.text.trim()) || (llmsFull.ok && llmsFull.text.trim()) || "";
  const b2state = llmsBody.length > 200 ? "full" : (llmsBody.length > 0 ? "partial" : "none");
  const b2pts = b2state === "full" ? 12 : (b2state === "partial" ? 6 : 0);
  const richEntity = sd.hasEntity && sd.name && (sd.hasDescription || sd.hasImage);
  const b3state = richEntity ? "full" : (sd.hasEntity ? "partial" : "none");
  const b3pts = b3state === "full" ? 12 : (b3state === "partial" ? 6 : 0);

  const profileHosts = new Set((profiles || []).map(p => hostOf(p.url)).filter(Boolean));
  const declaredHosts = new Set((sd.sameAs || []).map(hostOf).filter(Boolean));
  const htmlProfileHosts = extractHtmlProfileLinks(html);
  const htmlOnlyHosts = new Set([...htmlProfileHosts].filter(h => !declaredHosts.has(h)));
  const allHosts = new Set([...declaredHosts, ...htmlOnlyHosts]);
  const weightedCount = declaredHosts.size + (htmlOnlyHosts.size * 0.7);

  let b4pts = Math.min(10, Math.round(weightedCount * 4));
  let b4state = "none";
  if (b4pts >= 8) b4state = "full";
  else if (b4pts > 0) b4state = "partial";

  let declaredCross = 0, htmlOnlyCross = 0;
  for (const h of declaredHosts) if (profileHosts.has(h)) declaredCross++;
  for (const h of htmlOnlyHosts) if (profileHosts.has(h)) htmlOnlyCross++;
  const weightedCross = declaredCross + (htmlOnlyCross * 0.7);
  let b5pts = Math.min(10, Math.round(weightedCross * 4));
  let b5state = "none";
  let blind = false;
  if (b5pts >= 8) b5state = "full";
  else if (b5pts > 0) b5state = "partial";
  else if (allHosts.size >= 1 && profileHosts.size === 0) { b5state = "partial"; b5pts = 5; blind = true; }

  const low = (html || "").toLowerCase();
  const hasTitle = low.indexOf("<title>") !== -1 || low.indexOf("<title ") !== -1;
  const hasDesc  = low.indexOf('name="description"') !== -1 || low.indexOf("name='description'") !== -1;
  const hasOg    = low.indexOf("og:title") !== -1 || low.indexOf("og:description") !== -1 || low.indexOf("og:image") !== -1;
  const hasCanon = low.indexOf('rel="canonical"') !== -1 || low.indexOf("rel='canonical'") !== -1;
  const isHttps  = target.startsWith("https://") || ((home.finalUrl || "").startsWith("https://"));
  const noindex  = low.indexOf("noindex") !== -1;
  const stripWS = (s) => { let r = ""; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); if (c !== 9 && c !== 32) r += s.charAt(i); } return r; };
  const robotsLines = ((robots && robots.text) || "").toLowerCase().split("\n").map(stripWS);
  const robotsOk = robots.ok && !robotsLines.includes("disallow:/");
  const sitemapText = (sitemap && sitemap.text) || "";
  const sitemapOk = sitemap.ok && (sitemapText.indexOf("<urlset") !== -1 || sitemapText.indexOf("<sitemapindex") !== -1);
  let b6pts = 0;
  if (hasTitle) b6pts += 2;
  if (hasDesc)  b6pts += 2;
  if (hasOg)    b6pts += 2;
  if (hasCanon) b6pts += 2;
  if (isHttps && !noindex)   b6pts += 1;
  if (robotsOk || sitemapOk) b6pts += 1;
  let b6state = "none";
  if (b6pts >= 8) b6state = "full";
  else if (b6pts >= 4) b6state = "partial";

  return {
    home:       { state: b1state, pts: b1pts, meta: {} },
    understood: { state: b3state, pts: b3pts, meta: {} },
    linked:     { state: b4state, pts: b4pts, meta: { count: allHosts.size } },
    confirmed:  { state: b5state, pts: b5pts, meta: { matches: declaredCross + htmlOnlyCross, blind } },
    readable:   { state: b6state, pts: b6pts, meta: {} },
    intro:      { state: b2state, pts: b2pts, meta: {} }
  };
}
function emptyHome() {
  const none = { state: "none", pts: 0, meta: { noSite: true } };
  return { home: { ...none }, understood: { ...none }, linked: { ...none, meta: { noSite: true, count: 0 } },
           confirmed: { ...none, meta: { noSite: true, matches: 0 } }, readable: { ...none }, intro: { ...none } };
}

function scoreFrom(sig) {
  let total = 0;
  for (const k in sig) total += (sig[k] && sig[k].pts) || 0;
  return Math.max(0, Math.min(100, Math.round(total)));
}

const ORDER = [["presence","A"],["clarity","A"],["home","B"],["understood","B"],["linked","B"],["confirmed","B"],["readable","B"],["intro","B"]];
function toPublicSignals(sig) {
  return ORDER.map(([id, layer]) => ({ id, layer, state: sig[id].state, meta: sig[id].meta || {} }));
}

/* Helpers */
async function serper(query, country, env) {
  try {
    const res = await withTimeout(fetch("https://google.serper.dev/search", {
      method:"POST",
      headers:{ "X-API-KEY": env.SERPER_API_KEY, "Content-Type":"application/json" },
      body: JSON.stringify({ q: query, gl: (country && country !== "__" ? country.toLowerCase() : "us"), num: 10 })
    }));
    if (!res.ok) return { ok:false };
    const data = await res.json();
    return { ok:true, data };
  } catch (e) { return { ok:false }; }
}
function extractProfiles(data, name) {
  const organic = Array.isArray(data.organic) ? data.organic : [];
  const seen = new Set();
  const profiles = [];
  for (const r of organic) {
    const plat = classifyHost(r.link);
    if (!plat) continue;
    const key = plat + "|" + hostOf(r.link);
    if (seen.has(key)) continue;
    seen.add(key);
    profiles.push({ platform: plat, url: r.link, title: r.title || "" });
  }
  if (data.knowledgeGraph && Array.isArray(data.knowledgeGraph.profiles)) {
    for (const p of data.knowledgeGraph.profiles) {
      const plat = classifyHost(p.link);
      if (plat && !seen.has(plat + "|" + hostOf(p.link))) {
        profiles.push({ platform: plat, url: p.link, title: p.name || "", fromKG: true });
        seen.add(plat + "|" + hostOf(p.link));
      }
    }
  }
  return profiles;
}
function pickCandidate(data, name) {
  if (data.knowledgeGraph && data.knowledgeGraph.website) {
    const u = normalizeUrl(data.knowledgeGraph.website);
    if (u && !isThirdParty(u)) return { url: u, title: data.knowledgeGraph.title || hostOf(u), snippet: data.knowledgeGraph.description || "", source: "knowledgeGraph" };
  }
  const organic = Array.isArray(data.organic) ? data.organic : [];
  const candidates = organic.filter(r => r.link && !isThirdParty(r.link));
  if (!candidates.length) return null;
  const slug = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (slug.length >= 3) {
    for (const r of candidates) {
      const host = hostOf(r.link);
      const parts = host.split(".");
      const rootName = parts.slice(0, Math.max(1, parts.length - 1)).join("");
      if (rootName === slug || rootName.indexOf(slug) !== -1 || slug.indexOf(rootName) !== -1) {
        return { url: normalizeUrl(r.link), title: r.title || host, snippet: r.snippet || "", source: "nameMatch" };
      }
    }
  }
  const r = candidates[0];
  return { url: normalizeUrl(r.link), title: r.title || hostOf(r.link), snippet: r.snippet || "", source: "organic" };
}
function estimateMatches(data, name) {
  // Count DISTINCT identity slugs on known profile platforms (e.g. linkedin.com/in/X).
  // If multiple different slugs appear on the SAME platform, that means multiple
  // different people share this name. One Nelson Inno = one slug = one person.
  const organic = Array.isArray(data.organic) ? data.organic : [];
  if (!organic.length) return 1;
  const SLUG_HOSTS = ["linkedin.com","wikipedia.org","instagram.com","twitter.com","x.com","github.com","facebook.com"];
  const byPlatform = {};
  for (const r of organic) {
    if (!r.link) continue;
    try {
      const u = new URL(r.link);
      const host = u.hostname.replace(/^www\./, "").replace(/^[a-z]{2}\./, "");
      const hit = SLUG_HOSTS.find(h => host === h || host.endsWith("." + h));
      if (!hit) continue;
      const segs = u.pathname.split("/").filter(Boolean);
      if (!segs.length) continue;
      const slug = segs[segs.length - 1].toLowerCase();
      if (!byPlatform[hit]) byPlatform[hit] = new Set();
      byPlatform[hit].add(slug);
    } catch (e) {}
  }
  let maxCandidates = 1;
  for (const k in byPlatform) if (byPlatform[k].size > maxCandidates) maxCandidates = byPlatform[k].size;
  return maxCandidates;
}
function classifyHost(url) {
  const h = hostOf(url);
  if (!h) return null;
  for (const [plat, suffixes] of Object.entries(PLATFORMS)) {
    if (suffixes.some(s => h === s || h.endsWith("." + s) || h.endsWith(s))) return plat;
  }
  return null;
}
function isThirdParty(url) {
  const h = hostOf(url);
  if (!h) return false;
  if (classifyHost(url)) return true;
  if (NEWS_PR.some(d => h === d || h.endsWith("." + d))) return true;
  return false;
}
function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); }
  catch (e) { return ""; }
}

function extractHtmlProfileLinks(html) {
  /* Conservative regex scan for <a href="..."> entries that look like
     identity-declaring profile links (footer/header social icons, contact
     sections, etc). Returns a Set of hostnames. Used to extend sameAs
     coverage beyond explicit JSON-LD Schema.org declarations — AI tools
     read these visible links, so the audit should credit them too
     (at 0.7 weight, since JSON-LD is still the gold standard). */
  if (!html) return new Set();
  const found = new Set();
  /* Skip share-intent URLs that look like profiles but are widget buttons */
  const SHARE_RE = /\/(share|sharer|intent|sharearticle|shareurl|tweet|popup)/i;
  const linkRe = /href\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const url = m[1];
    if (!/^https?:\/\//i.test(url)) continue;
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, "").toLowerCase();
      const path = u.pathname || "/";
      /* Must be a recognized identity platform (PLATFORMS list) */
      if (!classifyHost(url)) continue;
      /* Must have a meaningful path (not the bare domain root — that's
         usually a logo link to the platform itself, not a user profile) */
      if (path === "/" || path === "") continue;
      /* Skip share-widget URLs */
      if (SHARE_RE.test(path)) continue;
      found.add(host);
    } catch (e) {}
  }
  return found;
}
function extractJsonLd(html) {
  const blocks = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try { blocks.push(JSON.parse(m[1].trim())); } catch (e) {}
  }
  return blocks;
}
function analyzeJsonLd(blocks) {
  const flat = [];
  const walk = (n) => {
    if (!n) return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (typeof n === "object") { flat.push(n); if (n["@graph"]) walk(n["@graph"]); }
  };
  blocks.forEach(walk);
  const ENTITY = ["Person","Organization","LocalBusiness","Corporation","Brand","Book","Product","WebSite"];
  const types = [];
  let name = "", sameAs = [], hasEntity = false, hasDescription = false, hasImage = false;
  flat.forEach(node => {
    const t = node["@type"];
    const tlist = Array.isArray(t) ? t : (t ? [t] : []);
    tlist.forEach(x => { if (typeof x === "string") types.push(x); });
    if (tlist.some(x => ENTITY.includes(x))) hasEntity = true;
    if (node.name && !name) name = String(node.name);
    if (node.description) hasDescription = true;
    if (node.image) hasImage = true;
    if (node.sameAs) sameAs = sameAs.concat(Array.isArray(node.sameAs) ? node.sameAs : [node.sameAs]);
  });
  return { hasEntity, hasDescription, hasImage, types:[...new Set(types)], name, sameAs:[...new Set(sameAs)] };
}
function looksLikeUrl(q) {
  if (!q) return false;
  return /^https?:\/\//i.test(q) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(q);
}
function normalizeUrl(q) {
  if (!q) return "";
  q = String(q).trim();
  if (!/^https?:\/\//i.test(q)) q = "https://" + q;
  return q.replace(/\s+/g, "");
}
function originOf(url) {
  try { const u = new URL(url); return u.origin; } catch (e) { return url.replace(/\/[^/]*$/, ""); }
}
async function fetchText(url) {
  try {
    const res = await withTimeout(fetch(url, {
      redirect:"follow",
      headers:{ "User-Agent":"EverybodyKnowsYou-DiscoverabilityBot/1.0 (+https://everybodyknowsyou.com)" }
    }));
    const text = res.ok ? await res.text() : "";
    return { ok: res.ok, status: res.status, text: text.slice(0, 400000), finalUrl: res.url };
  } catch (e) { return { ok:false, status:0, text:"", finalUrl:url }; }
}
function withTimeout(promise) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), FETCH_TIMEOUT))]);
}
