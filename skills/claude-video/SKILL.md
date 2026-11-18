---
name: claude-video
description: "Let Claude watch a video: a URL or local file becomes timestamped frames and a transcript, via the MIT claude-video /watch plugin. Use when the user shares a video, screen recording, bug repro clip or talk and asks what happens in it. Claude Code and Codex only; not Cowork or Chat."
tags: [video, research, debugging, transcription]
---

# Watch videos (claude-video)

Opt-in add-on. [bradautomates/claude-video](https://github.com/bradautomates/claude-video) (MIT) adds `/watch`: give it a URL or a local file and it downloads the video, extracts timestamped frames, takes native captions (or transcribes with local WhisperX, Groq or OpenAI), and hands both to Claude.

## Install

```text
/plugin marketplace add bradautomates/claude-video
/plugin install watch@claude-video
```

Then start a new session and run `/watch <url or path>`.

CCC safety: before the first `/watch` in a session, check which backends it will use and tell the user. Transcription with Groq or OpenAI sends the audio to that provider, and any cloud vision or upload path sends the video off the machine. Ask before using any remote backend; prefer native captions or local WhisperX when available. Codex and other Agent Skills hosts: follow the upstream README's "Choose your app" table.

Check first: if `claude plugin list` already shows `watch`, skip the install.

## When to route here

- `/ccc-qa` or `/ccc-systematic-debugging` gets a screen recording of a bug.
- `/ccc-research` is given a talk, demo or tutorial video.
- `/ccc-design` is shown a competitor's product walkthrough.

## Limits

- Works in Claude Code (Desktop Code tab, VS Code, terminal) and Codex. It does **not** run in Claude Chat or Cowork, so the Desktop plugin should offer it only in a Code session.
- Needs `ffmpeg` and `yt-dlp` locally. Transcription without captions uses a local model or the user's own Groq or OpenAI key; never supply one for them.

## License

MIT, see the upstream repository.
