---
name: ccc-spike-confirm
description: "CC Commander — target of /ccc-spike buttons. Confirms the click-to-run round trip."
---

# /ccc-spike-confirm — round-trip confirmation

The user clicked a spike button. If this command is executing, it means the click-to-run path succeeded (either via postMessage or via user pasting the clipboard content).

Respond with EXACTLY this artifact — a small success card — and one question. No extra prose.

````html
<div style="font-family:ui-sans-serif,system-ui,sans-serif;background:#0f1115;color:#e7e9ee;padding:24px;border-radius:14px;max-width:560px;margin:0 auto;">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
    <div style="width:32px;height:32px;border-radius:8px;background:#10b981;display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;">✓</div>
    <div style="font-size:15px;font-weight:700;">Spike — round-trip confirmed</div>
  </div>
  <p style="font-size:13px;line-height:1.6;color:#c8cdd6;margin:0 0 10px;">
    The button click reached Claude as a new user turn. The artifact click-to-run path is viable for v4.0.0-beta.7.
  </p>
  <p style="font-size:12px;color:#9aa3b2;margin:0;">
    Argument received: <code style="background:#1a1d25;padding:1px 6px;border-radius:4px;color:#e7e9ee;">$ARGUMENTS</code>
  </p>
</div>
````

Then ONE line:

> **Was this triggered automatically, or did you paste the command? One-word answer: "auto" or "paste".**
