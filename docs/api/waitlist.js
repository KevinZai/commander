// Waitlist signup endpoint — Vercel serverless function (Node runtime).
// Writes to Supabase `waitlist` table via REST (no SDK dep) to keep the
// docs/ deploy footprint minimal. Env: NEXT_PUBLIC_SUPABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY (set on the Vercel cc-commander project).

const { createHash } = require("node:crypto");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCES = new Set(["site", "docs", "github", "plugin", "pricing-card", "footer"]);

function hashIp(ip) {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("waitlist: Supabase env not configured");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  // Vercel's Node runtime auto-parses JSON bodies into req.body when
  // Content-Type is application/json. If it didn't (raw body), parse manually.
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON body" }); }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ error: "Valid email required" });
  }

  const rawSource = typeof body.source === "string" ? body.source : "site";
  const source = SOURCES.has(rawSource) ? rawSource : "site";
  const feedback =
    typeof body.feedback === "string" && body.feedback.length <= 2000
      ? body.feedback
      : null;
  const utm = (k) => {
    const v = body[k];
    return typeof v === "string" && v.length <= 200 ? v : null;
  };

  const xfwd = req.headers["x-forwarded-for"];
  const ipRaw = typeof xfwd === "string"
    ? xfwd.split(",")[0].trim()
    : (req.headers["x-real-ip"] || "unknown");
  const userAgent = String(req.headers["user-agent"] || "").slice(0, 500);
  const referrer = String(req.headers["referer"] || "").slice(0, 500);

  const row = {
    email,
    source,
    utm_source: utm("utm_source"),
    utm_medium: utm("utm_medium"),
    utm_campaign: utm("utm_campaign"),
    referrer: referrer || null,
    user_agent: userAgent || null,
    ip_hash: hashIp(ipRaw),
    pro_interest: body.pro_interest !== false,
    feedback,
  };

  try {
    const r = await fetch(supabaseUrl + "/rest/v1/waitlist", {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: "Bearer " + serviceKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });

    if (r.status === 201 || r.status === 204) {
      return res.status(200).json({ ok: true });
    }
    // Postgres unique violation on email — treat as already signed up.
    if (r.status === 409) {
      return res.status(200).json({ ok: true, deduped: true });
    }
    const errBody = await r.text().catch(() => "");
    console.error("waitlist: Supabase " + r.status + " " + errBody.slice(0, 200));
    return res.status(500).json({ error: "Could not save signup" });
  } catch (err) {
    console.error("waitlist: handler threw", err);
    return res.status(500).json({ error: "Server error" });
  }
};
