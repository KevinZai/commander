---
name: ccc-spike
description: "CC Commander — artifact click-to-run diagnostic. Renders 3 clickable buttons, verifies postMessage round-trip. Internal/dev use."
---

# /ccc-spike — postMessage round-trip diagnostic

Purpose: prove the artifact → postMessage → Claude follow-up message flow works in the current Claude Desktop / Cowork Desktop client, BEFORE we ship v4.0.0-beta.7 relying on it across 12 commands.

## Behavior

When this command is invoked, **emit EXACTLY one response** — an HTML artifact containing three clickable buttons plus a "verification" section. Do not add menus, preambles, or additional messages around it. Use a fenced ```html block so Claude Desktop renders it as an artifact in the side preview panel.

Each button uses two mechanisms in parallel so we can diagnose which works:

1. **Primary:** `window.parent.postMessage({type:'user-message', text:'...'}, '*')` — the expected Claude Desktop interop
2. **Fallback:** on click, copy the slash-command string to the clipboard AND display a toast "copied — paste into chat" so the user always gets a next step even if postMessage is silently ignored

Print the artifact template verbatim (do NOT paraphrase). After the artifact, print one instruction line:

> **Click Button A, B, or C. Tell me what happens: did a new Claude turn start automatically, or did you need to paste? Paste the exact message that arrived, if any.**

That's it. Zero additional output.

## Artifact template

````html
<div style="font-family:ui-sans-serif,system-ui,sans-serif;background:#0f1115;color:#e7e9ee;padding:28px;border-radius:14px;max-width:720px;margin:0 auto;">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
    <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#22d3ee);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;">CC</div>
    <div>
      <div style="font-size:16px;font-weight:700;">CC Commander — Spike</div>
      <div style="font-size:12px;color:#9aa3b2;">postMessage round-trip diagnostic · v4.0.0-beta.7-alpha</div>
    </div>
  </div>

  <p style="font-size:13px;line-height:1.6;color:#c8cdd6;margin:0 0 14px;">
    Click a button below. Each one tries <code style="background:#1a1d25;padding:1px 5px;border-radius:4px;">postMessage</code> first, then falls back to copy-to-clipboard. Tell Claude what happened and it'll decide whether beta.7 can use artifact clicks.
  </p>

  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;">
    <button data-cmd="/ccc-spike-confirm A"
      style="background:#1a1d25;border:1px solid #2a2f3b;color:#e7e9ee;padding:14px;border-radius:10px;cursor:pointer;font:inherit;text-align:left;"
      onmouseover="this.style.background='#222632';" onmouseout="this.style.background='#1a1d25';"
      onclick="cccSpikeClick(this)">
      <div style="font-weight:700;margin-bottom:4px;">Button A</div>
      <div style="font-size:12px;color:#9aa3b2;">sends <code>/ccc-spike-confirm A</code></div>
    </button>
    <button data-cmd="/ccc-spike-confirm B"
      style="background:#1a1d25;border:1px solid #2a2f3b;color:#e7e9ee;padding:14px;border-radius:10px;cursor:pointer;font:inherit;text-align:left;"
      onmouseover="this.style.background='#222632';" onmouseout="this.style.background='#1a1d25';"
      onclick="cccSpikeClick(this)">
      <div style="font-weight:700;margin-bottom:4px;">Button B</div>
      <div style="font-size:12px;color:#9aa3b2;">sends <code>/ccc-spike-confirm B</code></div>
    </button>
    <button data-cmd="/ccc-spike-confirm C"
      style="background:#1a1d25;border:1px solid #2a2f3b;color:#e7e9ee;padding:14px;border-radius:10px;cursor:pointer;font:inherit;text-align:left;"
      onmouseover="this.style.background='#222632';" onmouseout="this.style.background='#1a1d25';"
      onclick="cccSpikeClick(this)">
      <div style="font-weight:700;margin-bottom:4px;">Button C</div>
      <div style="font-size:12px;color:#9aa3b2;">sends <code>/ccc-spike-confirm C</code></div>
    </button>
  </div>

  <div id="ccc-spike-status" style="font-size:12px;color:#9aa3b2;padding:10px 12px;background:#12141a;border-radius:8px;border:1px dashed #2a2f3b;">
    Waiting for a click…
  </div>

  <details style="margin-top:14px;font-size:12px;color:#7a8294;">
    <summary style="cursor:pointer;">What this is testing</summary>
    <ul style="line-height:1.7;padding-left:18px;">
      <li><b>postMessage</b> to <code>window.parent</code> — if Claude Desktop listens, a new user turn fires with the button's <code>data-cmd</code></li>
      <li><b>Clipboard fallback</b> — if postMessage is no-op'd, the command is copied so you can paste it</li>
      <li><b>Status line updates</b> — confirms the click handler ran at all</li>
    </ul>
  </details>

  <script>
    (function(){
      function cccSpikeClick(btn){
        var cmd = btn.getAttribute('data-cmd') || '';
        var status = document.getElementById('ccc-spike-status');
        var sent = false;
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({type:'user-message', text: cmd}, '*');
            sent = true;
          }
        } catch(e){}
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(cmd);
          }
        } catch(e){}
        if (status) {
          status.innerHTML = (sent ? '✅ postMessage sent: ' : '⚠️ postMessage not available — copied to clipboard instead: ') +
            '<code style="color:#e7e9ee;background:#1a1d25;padding:1px 5px;border-radius:4px;">' + cmd + '</code>' +
            '<br/><span style="color:#7a8294;">If nothing happens in chat within 3 seconds, paste the command manually.</span>';
        }
      }
      window.cccSpikeClick = cccSpikeClick;
    })();
  </script>
</div>
````

## After rendering

One instruction line only:

> **Click Button A, B, or C. Tell me what happens: did a new Claude turn start automatically, or did you need to paste?**

Nothing else. No menus. No follow-up.
