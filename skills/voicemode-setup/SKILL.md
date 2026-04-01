---
name: voicemode-setup
description: Setup guide for VoiceMode — natural voice conversations with Claude Code via Whisper + Kokoro
category: integrations
triggers:
  - voice
  - speech
  - voicemode
  - whisper
---

# VoiceMode Setup

Natural 2-way voice conversations with Claude Code via the VoiceMode MCP server (mbailey/voicemode).

## When to Use
- Hands-free coding sessions
- Dictating requirements or reviewing code verbally
- Accessibility — voice as an alternative to typing

## Quick Start
```bash
# Install via pip
pip install voicemode

# Or clone and install
git clone https://github.com/mbailey/voicemode.git
cd voicemode && pip install -e .
```

## Claude Code MCP Configuration

Add to your project's `.claude/settings.json`:
```json
{
  "mcpServers": {
    "voicemode": {
      "command": "voicemode",
      "args": ["serve"]
    }
  }
}
```

## Audio Stack
- **STT (Speech-to-Text):** OpenAI Whisper (local or API)
- **TTS (Text-to-Speech):** Kokoro (local, fast) or OpenAI TTS (cloud, higher quality)
- **Streaming:** LiveKit for real-time audio

## Prerequisites
- Python 3.10+
- Audio input device (microphone)
- For local STT: sufficient RAM for Whisper model
- For cloud STT/TTS: OpenAI API key

## Reference
- Repository: github.com/mbailey/voicemode
- License: MIT
- Stars: 937+
