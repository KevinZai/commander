// Waitlist signup endpoint — Vercel serverless function (Node runtime).
// Writes to Supabase `waitlist` table via REST (no SDK dependency to keep
// the docs/ deploy footprint minimal). Env vars sourced from the project
// Vercel config: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

import { createHash } from "node:crypto";

export const config = {
  runtime: "nodejs",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCES = new Set(["site", "docs", "github", "plugin", "pricing-card", "footer"]);

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

type WaitlistRow = {
  email: string;
  source: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  user_agent: string | null;
  ip_hash: string;
  pro_interest: boolean;
  feedback: string | null;
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", Allow: "POST" },
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("waitlist: Supabase env not configured");
    return json({ error: "Server misconfigured" }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return json({ error: "Valid email required" }, 400);
  }

  const rawSource = typeof body.source === "string" ? body.source : "site";
  const source = SOURCES.has(rawSource) ? rawSource : "site";
  const feedback =
    typeof body.feedback === "string" && body.feedback.length <= 2000
      ? body.feedback
      : null;
  const utm = (k: string): string | null => {
    const v = body[k];
    return typeof v === "string" && v.length <= 200 ? v : null;
  };

  const headers = req.headers;
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown";
  const userAgent = (headers.get("user-agent") ?? "").slice(0, 500);
  const referrer = (headers.get("referer") ?? "").slice(0, 500);

  const row: WaitlistRow = {
    email,
    source,
    utm_source: utm("utm_source"),
    utm_medium: utm("utm_medium"),
    utm_campaign: utm("utm_campaign"),
    referrer: referrer || null,
    user_agent: userAgent || null,
    ip_hash: hashIp(ip),
    pro_interest: body.pro_interest !== false,
    feedback,
  };

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/waitlist`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });

    if (res.status === 201 || res.status === 204) {
      return json({ ok: true });
    }
    // Postgres unique violation on email — treat as "already signed up"
    if (res.status === 409) {
      return json({ ok: true, deduped: true });
    }
    const errBody = await res.text().catch(() => "");
    console.error(`waitlist: Supabase ${res.status} ${errBody.slice(0, 200)}`);
    return json({ error: "Could not save signup" }, 500);
  } catch (err) {
    console.error("waitlist: handler threw", err);
    return json({ error: "Server error" }, 500);
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
