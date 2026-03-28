---
name: docker-setup
category: devops
skills: [docker-development, container-security, senior-devops]
mode: code
estimated_tokens: 600
---

# Docker Containerization

## When to Use
When containerizing an application for the first time, or when optimizing an existing Docker setup for smaller images, faster builds, or better security.

## Template

```
Containerize this application with Docker. Optimize for small image size, fast builds, and security.

**Application:**
{{project_path}}

**Stack:**
{{e.g., Node.js 20, Python 3.12, Go 1.22}}

**What needs containerizing:**
{{web app|API server|worker process|full stack with DB}}

**Current Docker state:**
{{none|basic Dockerfile exists|full docker-compose exists}}

**Step 1: Analyze the application**
- Read package.json / requirements.txt / go.mod to understand dependencies
- Identify the build step and runtime entry point
- Determine required environment variables
- Check for file system dependencies (uploads, temp files, logs)
- Identify ports that need exposing

**Step 2: Write the Dockerfile**
Follow these best practices:
- **Multi-stage build:** separate build stage from runtime stage
- **Base image:** use slim/alpine variants (e.g., `node:20-alpine`, `python:3.12-slim`)
- **Layer caching:** copy dependency files first, install, THEN copy source code
- **Non-root user:** create and switch to a non-root user
- **Health check:** add HEALTHCHECK instruction
- **.dockerignore:** create to exclude node_modules, .git, .env, test files
- **No secrets in image:** use build args or runtime env vars only

```dockerfile
# Example structure
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -D appuser
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER appuser
HEALTHCHECK CMD wget -q --spider http://localhost:3000/health || exit 1
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Step 3: Docker Compose (if multi-service)**
- Define all services (app, database, cache, etc.)
- Use named volumes for persistent data
- Define a custom network
- Set resource limits (memory, CPU)
- Use environment files (not inline secrets)

**Step 4: Development workflow**
- Create `docker-compose.dev.yml` with hot reload (volume mounts)
- Add `make` or `npm script` shortcuts for common Docker commands
- Configure VS Code / editor devcontainer if applicable

**Step 5: Verify**
- Build: `docker build -t {{app_name}} .`
- Check image size: `docker images {{app_name}}` (target under 200MB for Node, 100MB for Go)
- Run: `docker run -p 3000:3000 {{app_name}}`
- Health check: `curl localhost:3000/health`
- Security scan: `docker scout quickview {{app_name}}`
```

## Tips
- Use the `docker-development` skill for local development container setup
- The `container-security` skill audits Dockerfiles for security issues
- Pin exact versions in FROM (e.g., `node:20.11.1-alpine3.19`), not just major tags

## Example

```
Containerize this application with Docker. Optimize for small image size, fast builds, and security.

**Application:** /Users/me/projects/my-api
**Stack:** Node.js 20 + Express + Prisma + PostgreSQL
**What needs containerizing:** API server + PostgreSQL + Redis (for sessions)
**Current Docker state:** None — running directly on the host
```
