"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

const PH_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let initialized = false;

function maybeInit() {
  if (initialized || !PH_KEY || typeof window === "undefined") return;
  initialized = true;
  posthog.init(PH_KEY, {
    api_host: PH_HOST,
    capture_pageview: false, // we do it manually so we have full URL incl. query
    capture_pageleave: true,
    autocapture: false,
    persistence: "localStorage+cookie",
    person_profiles: "identified_only",
  });
}

function PageViewCapture() {
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    maybeInit();
    if (!PH_KEY || typeof window === "undefined") return;
    const search = params?.toString();
    const url = pathname + (search ? `?${search}` : "");
    posthog.capture("$pageview", { $current_url: window.location.origin + url });
  }, [pathname, params]);

  return null;
}

export function PostHogProvider() {
  return (
    <Suspense fallback={null}>
      <PageViewCapture />
    </Suspense>
  );
}

// Tiny helper for any client component to send an event without importing
// posthog-js directly. Silent no-op when PostHog isn't configured.
export function track(event: string, properties: Record<string, unknown> = {}) {
  if (!PH_KEY || typeof window === "undefined") return;
  if (!initialized) return; // PageViewCapture mounts first; before then events drop
  try {
    posthog.capture(event, properties);
  } catch {
    /* swallow — analytics never crashes UX */
  }
}
