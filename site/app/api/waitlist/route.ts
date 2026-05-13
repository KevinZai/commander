import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOURCES = new Set(["site", "docs", "github", "plugin", "pricing-table", "footer"]);

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const rawSource = typeof body.source === "string" ? body.source : "site";
  const source = SOURCES.has(rawSource) ? rawSource : "site";
  const feedback =
    typeof body.feedback === "string" && body.feedback.length <= 2000
      ? body.feedback
      : null;

  const utm = (k: string) => {
    const v = body[k];
    return typeof v === "string" && v.length <= 200 ? v : null;
  };

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 500);
  const referrer = (req.headers.get("referer") ?? "").slice(0, 500);

  const row = {
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
    const supabase = supabaseAdmin();
    const { error } = await supabase.from("waitlist").insert(row);
    if (error) {
      // 23505 = unique_violation on email — treat as "already signed up, you're good"
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, deduped: true });
      }
      console.error("waitlist insert failed", error);
      return NextResponse.json({ error: "Could not save signup" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("waitlist handler threw", err);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
}
