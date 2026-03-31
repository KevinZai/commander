---
name: safeclaw-integration
description: Docker-based isolated sessions for YOLO mode with resource limits
version: 1.0.0
category: devops
---

# SafeClaw Integration

Run isolated Claude Code sessions inside Docker containers for YOLO mode, overnight builds, and untrusted code execution.

## Why SafeClaw

- **Isolation**: Code runs in a container, not on your host
- **Resource limits**: CPU, memory, and disk caps prevent runaway sessions
- **Reproducibility**: Same container image every time
- **Safety**: YOLO mode (`--dangerously-skip-permissions`) is safe inside a container
- **Cleanup**: Container is destroyed after session ends

## Single Container Session

```bash
docker run --rm -it \
  --name safeclaw-session \
  --cpus="2" \
  --memory="4g" \
  --pids-limit=256 \
  -v "$(pwd):/workspace:rw" \
  -v "$HOME/.claude:/home/coder/.claude:ro" \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -w /workspace \
  ghcr.io/anthropics/claude-code:latest \
  claude -p "Execute the plan in tasks/plan.md" \
  --dangerously-skip-permissions \
  --max-turns 100
```

## Parallel Containers

Run multiple isolated sessions simultaneously:

```bash
# Session 1: Frontend
docker run --rm -d \
  --name safeclaw-frontend \
  --cpus="1.5" --memory="3g" \
  -v "$(pwd):/workspace:rw" \
  -v "$HOME/.claude:/home/coder/.claude:ro" \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -w /workspace \
  ghcr.io/anthropics/claude-code:latest \
  claude -p "Build the frontend components" --dangerously-skip-permissions

# Session 2: Backend
docker run --rm -d \
  --name safeclaw-backend \
  --cpus="1.5" --memory="3g" \
  -v "$(pwd):/workspace:rw" \
  -v "$HOME/.claude:/home/coder/.claude:ro" \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -w /workspace \
  ghcr.io/anthropics/claude-code:latest \
  claude -p "Build the API endpoints" --dangerously-skip-permissions

# Monitor
docker logs -f safeclaw-frontend &
docker logs -f safeclaw-backend &
```

## Overnight Build with Resource Limits

```bash
docker run --rm -d \
  --name safeclaw-overnight \
  --cpus="2" \
  --memory="6g" \
  --pids-limit=512 \
  --storage-opt size=10G \
  --restart=on-failure:3 \
  -v "$(pwd):/workspace:rw" \
  -v "$HOME/.claude:/home/coder/.claude:ro" \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -w /workspace \
  ghcr.io/anthropics/claude-code:latest \
  claude -p "Full implementation plan. Checkpoint after each phase." \
  --dangerously-skip-permissions \
  --max-turns 200

# Set a timeout kill (8 hours)
(sleep 28800 && docker kill safeclaw-overnight 2>/dev/null) &
```

## Resource Limit Reference

| Resource | Development | Overnight | Parallel (each) |
|----------|-------------|-----------|-----------------|
| CPUs | 2 | 2 | 1.5 |
| Memory | 4GB | 6GB | 3GB |
| PIDs | 256 | 512 | 256 |
| Disk | 5GB | 10GB | 5GB |
| Max Turns | 50 | 200 | 100 |
| Timeout | 2h | 8h | 4h |

## Safety Checklist

- [ ] Never mount host `/` or sensitive directories
- [ ] Mount `.claude` as read-only (`:ro`)
- [ ] Set `--pids-limit` to prevent fork bombs
- [ ] Set memory limits to prevent OOM on host
- [ ] Use `--rm` to auto-cleanup containers
- [ ] Set `--restart=on-failure:N` with a retry cap
- [ ] Use named containers for easy monitoring
- [ ] Kill containers with timeout for overnight runs
