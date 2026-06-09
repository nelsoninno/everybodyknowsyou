/* ============================================================
   /api/lead  — receives events from the audit tool and forwards
   them to the Google Sheet (Apps Script Web App "webhook").

   Two event types:
     event:"search"  -> anonymous: what was searched + the result.
                        No name/email/IP. Only a coarse device type. Goes to the
                        "Searches" tab. Fired for every audit.
     (default/lead)  -> consent-based: the visitor ticked the box to
                        get a free expert review. Goes to the leads tab.

   Cloudflare Pages env var (Production, Secret):
     LEADS_WEBHOOK_URL   = the Apps Script /exec URL
   Optional:
     LEADS_WEBHOOK_TOKEN = shared secret (must match the script)
     ALLOWED_ORIGIN      = lock CORS to your domain (defaults to *)

   We never store IP addresses. Capture is best-effort: if the webhook
   is missing or unreachable we still return ok so the visitor's UX is
   never blocked, and the audit itself is completely unaffected.
   ============================================================ */

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: cors(context) });
}

export async function onRequestPost(context) {
  const headers = { "Content-Type": "application/json", ...cors(context) };
  try {
    const body = await context.request.json();
    const env = context.env || {};
    if (body && body.hp) return ok(headers); // honeypot

    const url = env.LEADS_WEBHOOK_URL;

    // ---- anonymous search log (no consent / no personal identifiers) ----
    if (body && body.event === "search") {
      const rec = {
        event: "search",
        ts: new Date().toISOString(),
        query: clean(body.query),
        country: clean(body.country),
        countryName: clean(body.countryName),
        lang: clean(body.lang),
        searchType: clean(body.searchType),
        score: (body.score != null) ? String(body.score) : "",
        hasNoSite: body.hasNoSite ? "yes" : "-",
        device: deviceFrom(context.request.headers.get("user-agent"))
      };
      await forward(url, rec, env);
      return ok(headers);
    }

    // ---- consented lead ----
    const email = clean(body && body.email);
    const name  = clean(body && body.name);
    if (!name) return bad("Please enter your name or brand.", headers);
    if (!validEmail(email)) return bad("Please enter a valid email.", headers);

    const record = {
      event: "lead",
      ts:            new Date().toISOString(),
      name:          name,
      email:         email,
      whatsapp:      clean(body && body.whatsapp),
      lang:          clean(body && body.lang),
      query:         clean(body && body.query),
      country:       clean(body && body.country),
      countryName:   clean(body && body.countryName),
      searchType:    clean(body && body.searchType),
      score:         (body && body.score != null) ? String(body.score) : "",
      hasNoSite:     (body && body.hasNoSite) ? "yes" : "-",
      resolvedUrl:   clean(body && body.resolvedUrl),
      identityConfirmed: (body && body.identityConfirmed) ? "yes" : "no",
      confirmedTitle: clean(body && body.confirmedTitle),
      confirmedUrl:   clean(body && body.confirmedUrl),
      matches:       (body && body.matches != null) ? String(body.matches) : "",
      missing:       Array.isArray(body && body.missing) ? body.missing.join(" | ") : clean(body && body.missing),
      profiles:      Array.isArray(body && body.profiles) ? body.profiles.join(" | ") : clean(body && body.profiles),
      pageUrl:       clean(body && body.pageUrl),
      consent:       "yes",
      consentText:   "User ticked the consent box: store audit + email a one-time personalized review.",
      device:        deviceFrom(context.request.headers.get("user-agent"))
    };
    await forward(url, record, env);
    return ok(headers);
  } catch (err) {
    try { console.error("lead.js error:", err && (err.stack || err.message || err)); } catch (_) {}
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", ...cors(context) } });
  }
}

async function forward(url, payload, env) {
  if (!url) { try { console.warn("LEADS_WEBHOOK_URL not set; not stored:", payload.event); } catch (_) {} return; }
  if (env.LEADS_WEBHOOK_TOKEN) payload = { ...payload, token: env.LEADS_WEBHOOK_TOKEN };
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch (e) { try { console.error("webhook failed:", e && (e.message || e)); } catch (_) {} }
}

function ok(headers){ return new Response(JSON.stringify({ ok: true }), { status: 200, headers }); }
function bad(msg, headers){ return new Response(JSON.stringify({ ok: false, error: msg }), { status: 200, headers }); }
function clean(v){ return (v == null ? "" : String(v)).slice(0, 2000).trim(); }
function validEmail(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || ""); }
function deviceFrom(ua) {
  ua = ua || "";
  if (!ua) return "";
  var os = "Unknown OS";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/iPad/i.test(ua)) os = "iPadOS";
  else if (/iPhone|iPod/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/CrOS/i.test(ua)) os = "ChromeOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  var type = /iPad|Tablet/i.test(ua) ? "Tablet"
           : (/Mobi|iPhone|iPod|Android/i.test(ua) ? "Mobile" : "Desktop");
  return type + " \u00b7 " + os;
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
