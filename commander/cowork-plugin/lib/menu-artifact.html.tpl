<!--
  CC Commander — shared menu artifact template
  Used by: /ccc, /ccc-start, /ccc-browse, and every /ccc-* command that renders
  a click-first visual menu inside Claude Code Desktop / Cowork Desktop.

  Placeholders (replaced by commander/cowork-plugin/lib/menu-render.js):
    {{TITLE}}       - menu title, e.g. "CC Commander Hub"
    {{SUBTITLE}}    - menu subtitle, e.g. "450+ skills · every AI IDE"
    {{VERSION}}     - plugin version, e.g. "4.0.0-beta.7"
    {{CONTEXT}}     - optional context strip (branch · session · cost), HTML
    {{TILES}}       - grid of <button> elements, one per choice
    {{FOOTER}}      - optional footer line (recommendation, tip, or "Back"), HTML
    {{SHORTCUTS}}   - optional text shortcuts line, e.g. "Shortcut: /ccc-build"

  All inline styles — Claude Desktop's artifact sandbox does not load external assets.
  Buttons use cccMenuClick(this) which tries postMessage, falls back to clipboard.
-->
<div style="font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;background:#0f1115;color:#e7e9ee;padding:28px;border-radius:14px;max-width:960px;margin:0 auto;border:1px solid #1e222b;">

  <!-- Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#22d3ee);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;font-size:14px;letter-spacing:0.5px;">CC</div>
      <div>
        <div style="font-size:16px;font-weight:700;line-height:1.2;">{{TITLE}}</div>
        <div style="font-size:12px;color:#9aa3b2;line-height:1.4;">{{SUBTITLE}}</div>
      </div>
    </div>
    <div style="font-size:11px;color:#6b7280;background:#12141a;padding:4px 10px;border-radius:999px;border:1px solid #1e222b;">v{{VERSION}}</div>
  </div>

  <!-- Context strip (optional) -->
  {{CONTEXT}}

  <!-- Tile grid -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-bottom:16px;">
    {{TILES}}
  </div>

  <!-- Footer (recommendation / back / tip) -->
  {{FOOTER}}

  <!-- Text shortcuts -->
  {{SHORTCUTS}}

  <!-- Live status line for click feedback -->
  <div id="ccc-menu-status" style="font-size:11px;color:#6b7280;padding:8px 12px;margin-top:12px;background:#0a0c10;border-radius:8px;border:1px dashed #1e222b;display:none;">
    Click detected.
  </div>

  <script>
    (function(){
      // Click handler: postMessage primary, clipboard fallback
      function cccMenuClick(btn){
        var cmd = btn.getAttribute('data-cmd') || '';
        if (!cmd) return;
        var status = document.getElementById('ccc-menu-status');
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
          status.style.display = 'block';
          status.innerHTML = (sent
            ? '✅ Sent: <code style="color:#e7e9ee;background:#1a1d25;padding:1px 5px;border-radius:4px;">' + cmd + '</code> — waiting for Claude\u2026'
            : '⚠️ Copied to clipboard: <code style="color:#e7e9ee;background:#1a1d25;padding:1px 5px;border-radius:4px;">' + cmd + '</code> — paste into chat');
        }
      }
      window.cccMenuClick = cccMenuClick;
    })();
  </script>
</div>

<!--
  Tile snippet (used by menu-render.js to build {{TILES}}):

  <button data-cmd="/ccc-<intent>"
    style="background:#1a1d25;border:1px solid #2a2f3b;color:#e7e9ee;padding:16px;border-radius:12px;cursor:pointer;font:inherit;text-align:left;transition:background 0.1s,border-color 0.1s;"
    onmouseover="this.style.background='#222632';this.style.borderColor='#3a4050';"
    onmouseout="this.style.background='#1a1d25';this.style.borderColor='#2a2f3b';"
    onclick="cccMenuClick(this)">
    <div style="font-size:20px;margin-bottom:6px;">{{ICON}}</div>
    <div style="font-weight:700;font-size:14px;margin-bottom:3px;">{{LABEL}} {{RECOMMENDED_STAR}}</div>
    <div style="font-size:12px;color:#9aa3b2;line-height:1.4;">{{DESC}}</div>
  </button>
-->
