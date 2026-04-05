---
name: cc-footer
description: "CC Commander Footer Bar — render live session status with emoji meters. Use when the user says 'status bar', 'footer', 'show metrics', 'session stats'."
---

# CC Footer Bar

Render the CCC status footer showing live session metrics:

```
━━ CCC2.1.0│🔥Opus1M│🔑gAA│🧠▐██░░░░▌│⏱️▐█░░░░░▌│📅▐██░░░░▌│💰$2.34│↑640K↓694K│⏰8h0m│🎯358│📋CC-150│📂~/project
```

Color coding: green (<50%) → yellow (50-80%) → red (>80%)

Source: `commander/cockpit.js` — `renderCockpitFooter()` function.
