/* ============================================================
   /api/lead  — receives a consent-based opt-in from the audit
   tool and forwards it to a Google Sheet (via a Google Apps
   Script Web App "webhook").

   Required Cloudflare Pages env var (Production):
     LEADS_WEBHOOK_URL  = the Apps Script Web App /exec URL
   Optional:
     LEADS_WEBHOOK_TOKEN = shared secret, if you set one in the script
     ALLOWED_ORIGIN      = lock CORS to your domain (defaults to *)

   The capture is best-effort: if the webhook is not yet configured
   or is unreachable, we still return ok:true so the visitor sees a
   normal thank-you — we never block the UX on lead storage, and the
   audit tool itself is completely unaffected.
   ============================================================ */

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: cors(context) });
}

export async function onRequestPost(context) {
  const headers = { "Content-Type": "application/json", ...cors(context) };
  try {
    const body = await context.request.json();
    const env = context.env || {};

    // Honeypot: real users never fill this hidden field.
    if (body && body.hp) return ok(headers);

    const email = clean(body && body.email);
    const name  = clean(body && body.name);
    if (!name) return bad("Please enter your name or brand.", headers);
    if (!validEmail(email)) return bad("Please enter a valid email.", headers);

    const record = {
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
      consentText:   "User clicked the opt-in: store audit + email a one-time personalized review.",
      userAgent:     clean(context.request.headers.get("user-agent"))
    };

    const url = env.LEADS_WEBHOOK_URL;
    if (url) {
      const payload = env.LEADS_WEBHOOK_TOKEN
        ? { ...record, token: env.LEADS_WEBHOOK_TOKEN }
        : record;
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        try { console.error("lead webhook failed:", e && (e.message || e)); } catch (_) {}
        // swallow — best-effort
      }
    } else {
      try { console.warn("LEADS_WEBHOOK_URL not set; lead not stored:", record.email); } catch (_) {}
    }

    return ok(headers);
  } catch (err) {
    try { console.error("lead.js error:", err && (err.stack || err.message || err)); } catch (_) {}
    // Never surface an error to the visitor for a lead capture.
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", ...cors(context) } });
  }
}

function ok(headers){ return new Response(JSON.stringify({ ok: true }), { status: 200, headers }); }
function bad(msg, headers){ return new Response(JSON.stringify({ ok: false, error: msg }), { status: 200, headers }); }
function clean(v){ return (v == null ? "" : String(v)).slice(0, 2000).trim(); }
function validEmail(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || ""); }

function cors(context) {
  const allow = (context.env && context.env.ALLOWED_ORIGIN) || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}
