# Recording Checklist

Goal: record a 2-3 minute launch demo in one 30-45 minute session.

## Hardware

- Mac Mini M4.
- OBS Studio.
- Primary microphone tested before capture.
- Lapel mic preferred if Kevin is on camera.
- Wired headphones for monitoring, not laptop speakers.
- Optional: second display for script and shot list.

## Software State

- Clean Cowork Desktop session.
- Fresh Codex CLI session.
- Commander install path ready to show from scratch.
- `/ccc` not yet invoked in the recording session.
- Terminal background dark.
- Terminal/editor font size 16+.
- Browser closed unless needed for the repo URL.
- Desktop wallpaper neutral and non-distracting.
- No private repo names, tokens, emails, or customer data visible.

## Pre-Record

- Close all other apps.
- Turn on Do Not Disturb.
- Quit Slack, Messages, email, calendar, and menu bar apps that show alerts.
- Check 1Password, terminal history, and shell prompt for private details.
- Run `/ccc` once in a throwaway session to warm cache, then close it and return to a fresh recording session.
- Test the Codex install command in a throwaway profile if possible.
- Test audio levels in OBS: voice should peak around -12 dB and never clip.
- Record a 20-second sample, play it back, and check cursor size, text size, and mic noise.

## OBS Setup

- Canvas: 1920x1080.
- Output: 1920x1080.
- FPS: 30.
- Capture source: display capture or window capture, whichever avoids flicker.
- Cursor capture on.
- Mic noise suppression on if the room has HVAC or fan noise.
- Keep Kevin's camera off unless the final edit needs a brief intro/outro.

## Shot Prep

- Prepare Cowork Desktop at Settings, but start recording before opening Plugin Marketplace.
- Keep `KevinZai/commander` copied to clipboard.
- Keep Codex terminal open with clean scrollback.
- Keep the exact command ready in a notes window outside the capture area:

```bash
codex plugin marketplace add KevinZai/commander && codex plugin install commander
```

- Prepare five `/ccc-fleet` tasks with visible worktree names: docs, tests, UI, adapter, release notes.
- If a live fleet run is slow, record the dispatch live and cut to already-running panes from the same run.

## Background Music

- Direction: lofi neutral, low energy, no vocals, no heavy bass.
- Recommended sources:
  - YouTube Audio Library in YouTube Studio: search "lofi", "chill", "ambient", 2-4 minutes, attribution not required if available.
  - Pixabay Music lofi search: <https://pixabay.com/music/search/background%20lofi/>.
  - Pixabay "No Copyright Music Lofi" example track length 2:59: <https://pixabay.com/music/beats-no-copyright-music-lofi-330213/>.
- Mix music at least 18-24 dB below voice.
- Avoid tracks with recognizable melodies that compete with the narration.
- Save license/attribution notes with the edit project.

## Final Export

- Format: MP4.
- Codec: H.264.
- Resolution: 1080p.
- Audio: AAC, 48 kHz.
- Target size: ≤200MB.
- Export targets: YouTube, Vimeo, and repo embed.
- Filename: `cc-commander-codex-launch-demo-1080p.mp4`.

## Subtitles

- Auto-generate captions with Whisper.
- Human-review before upload.
- Fix product names exactly: CC Commander, Cowork Desktop, Claude Code, Codex CLI, SKILL.md, `/ccc`, `/ccc-build`, `/ccc-fleet`.
- Keep captions concise enough to avoid covering terminal text.

## Record-Day Callouts

- Do not skip the three Codex hook caveats: Notification, PreCompact, SubagentStop.
- Say "hosted MCP path is not live yet" in the close.
- The five-agent fleet shot is the proof shot. Give it enough screen time.
