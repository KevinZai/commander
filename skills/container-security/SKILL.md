---
name: container-security
description: "Container security — image hardening, vulnerability scanning, runtime security, secrets management, and compliance."
risk: low
source: custom
date_added: '2026-03-20'
---

# Container Security

Expert guide to securing Docker containers from build to runtime.

## Use this skill when

- Hardening Docker images and Dockerfiles
- Scanning for vulnerabilities in images and dependencies
- Implementing runtime security policies
- Managing secrets in containerized environments
- Meeting compliance requirements (SOC2, PCI, HIPAA)

## Do not use this skill when

- Securing non-containerized applications
- Network security outside container scope

## Instructions

1. Secure the build (minimal base, non-root, no secrets in layers).
2. Scan images for vulnerabilities.
3. Configure runtime security (read-only FS, capabilities, seccomp).
4. Manage secrets properly.
5. Monitor and audit.

---

## Secure Dockerfile

```dockerfile
# Use specific tag, never :latest in production
FROM node:20.11-alpine3.19 AS base

# Install security updates
RUN apk update && apk upgrade --no-cache

# Create non-root user EARLY
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup -h /app -s /sbin/nologin

WORKDIR /app

# Dependencies in separate layer (cached)
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Build stage
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production — minimal final image
FROM base AS production

# Copy only what's needed
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/package.json ./

# Remove unnecessary tools
RUN apk del --purge apk-tools && \
    rm -rf /var/cache/apk/* /tmp/* /root/.npm

# Switch to non-root
USER appuser

# Read-only filesystem compatible
ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
```

## Image Scanning

```bash
# Docker Scout (built-in)
docker scout cves myapp:latest
docker scout quickview myapp:latest

# Trivy (open source, comprehensive)
trivy image --severity HIGH,CRITICAL myapp:latest
trivy image --exit-code 1 --severity CRITICAL myapp:latest  # Fail CI on critical

# Grype
grype myapp:latest

# Snyk
snyk container test myapp:latest --severity-threshold=high
```

### CI Integration

```yaml
# GitHub Actions
- name: Scan image with Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.IMAGE }}
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'

- name: Upload scan results
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: 'trivy-results.sarif'
```

## Runtime Security

### Docker Run Security Options

```bash
docker run \
  --read-only \                          # Read-only root filesystem
  --tmpfs /tmp:rw,noexec,nosuid \        # Writable tmp without exec
  --cap-drop ALL \                       # Drop all Linux capabilities
  --cap-add NET_BIND_SERVICE \           # Add only what's needed
  --security-opt no-new-privileges \     # Prevent privilege escalation
  --security-opt seccomp=default.json \  # Seccomp profile
  --pids-limit 100 \                     # Prevent fork bombs
  --memory 512m \                        # Memory limit
  --cpus 1.0 \                           # CPU limit
  --user 1001:1001 \                     # Non-root user
  myapp:latest
```

### Compose Security

```yaml
services:
  app:
    image: myapp:latest
    read_only: true
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=64m
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
          pids: 100
    user: "1001:1001"
```

## Secrets Management

```yaml
# Docker secrets (Swarm mode or compose)
services:
  app:
    secrets:
      - db_password
      - api_key
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db_password

secrets:
  db_password:
    external: true  # Created via `docker secret create`
  api_key:
    file: ./secrets/api_key.txt  # Local file (dev only)
```

### AWS ECS Secrets

```json
{
  "containerDefinitions": [{
    "secrets": [
      {
        "name": "DB_PASSWORD",
        "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:prod/db-password"
      },
      {
        "name": "API_KEY",
        "valueFrom": "arn:aws:ssm:us-east-1:123456789:parameter/prod/api-key"
      }
    ]
  }]
}
```

## .dockerignore

```
.git
.gitignore
.env*
node_modules
npm-debug.log
Dockerfile*
docker-compose*
compose*
.dockerignore
tests
coverage
docs
*.md
.vscode
.idea
.DS_Store
```

## Security Checklist

- [ ] Base image pinned to specific version (not `:latest`)
- [ ] Multi-stage build (build tools not in final image)
- [ ] Non-root user in final stage
- [ ] No secrets in image layers (use build secrets or runtime injection)
- [ ] `.dockerignore` excludes sensitive files
- [ ] Image scanned for CVEs (Trivy/Scout in CI)
- [ ] Read-only root filesystem
- [ ] Linux capabilities dropped (cap_drop ALL, add only needed)
- [ ] Resource limits set (memory, CPU, pids)
- [ ] Health check defined
- [ ] No unnecessary packages (no curl/wget/shell if not needed)
- [ ] Secrets injected at runtime, not baked into image

## Common Pitfalls

1. **Secrets in build args** — `ARG` values are visible in image history. Use `--mount=type=secret` instead.
2. **Running as root** — Default. Always add `USER` instruction.
3. **Using `:latest` tag** — Not reproducible. Pin to specific version or digest.
4. **Large attack surface** — Use Alpine or distroless. Remove build tools from final image.
5. **Writable root FS** — Use `--read-only` with explicit `tmpfs` for writable dirs.
6. **No resource limits** — Container can consume all host resources without limits.
