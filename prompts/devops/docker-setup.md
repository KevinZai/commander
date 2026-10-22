---
name: docker-setup
category: devops
skills: [docker-development, container-security, senior-devops]
mode: code
estimated_tokens: 600
---

# Docker Containerization

## When to use

Use it to containerize an application for the first time, or to shrink, speed up or harden an existing Docker setup. The output is a working Dockerfile, `.dockerignore` and, for multi-service apps, Compose files.

## Template

````
Containerize this application with Docker. Optimize for small image size, fast builds and security.

**Application:**
{{project_path}}

**Stack:**
{{e.g., Node.js, Python, Go — include the runtime version the project already targets}}

**What needs containerizing:**
{{web app|API server|worker process|full stack with DB}}

**Current Docker state:**
{{none|basic Dockerfile exists|full docker-compose exists}}

**Step 1: Analyze the application**
- Read the dependency manifest (package.json, requirements.txt, go.mod) and lockfile.
- Identify the build step and the runtime entry point.
- List the required environment variables.
- Find file system dependencies (uploads, temp files, logs).
- Identify the ports to expose.

**Step 2: Write the Dockerfile**
Apply these practices:
- Multi-stage build: separate the build stage from the runtime stage.
- Base image: a slim or alpine variant of the runtime version the project targets, pinned to an exact tag or digest.
- Layer caching: copy dependency files and install before copying source code.
- Non-root user: create one and switch to it.
- Health check: add a HEALTHCHECK instruction.
- `.dockerignore`: exclude node_modules, .git, .env and test files.
- No secrets in the image: pass them as runtime environment variables or build secrets, never as plain build args.

Example structure for a Node.js service (adapt to the stack):

    ARG NODE_VERSION=<version the project targets>
    FROM node:${NODE_VERSION}-alpine AS builder
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci
    COPY . .
    RUN npm run build && npm prune --omit=dev

    FROM node:${NODE_VERSION}-alpine AS runtime
    RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -D appuser
    WORKDIR /app
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/node_modules ./node_modules
    USER appuser
    HEALTHCHECK CMD wget -q --spider http://localhost:3000/health || exit 1
    EXPOSE 3000
    CMD ["node", "dist/index.js"]

**Step 3: Docker Compose (if multi-service)**
- Define every service (app, database, cache, etc.).
- Use named volumes for persistent data.
- Define a custom network.
- Set memory and CPU limits.
- Load configuration from env files; put no secrets inline.

**Step 4: Development workflow**
- Create `docker-compose.dev.yml` with hot reload through volume mounts.
- Add `make` targets or package scripts for the common Docker commands.
- Add an editor devcontainer config if the team uses one.

**Step 5: Verify**
Run each command and report its actual output:
- Build: `docker build -t {{app_name}} .`
- Image size: `docker images {{app_name}}` (target under 200MB for Node, 100MB for Go)
- Run: `docker run -p 3000:3000 {{app_name}}`
- Health check: `curl localhost:3000/health`
- Security scan: `docker scout quickview {{app_name}}`, or the scanner the team uses
````

## Tips

- The `docker-development` skill covers local development containers; `container-security` audits a Dockerfile for security issues.
- Pin the exact base image tag (or digest) the project tested against, not just a major tag.
- Ask before pushing an image to a registry; that is an external write.

## Example

````
Containerize this application with Docker. Optimize for small image size, fast builds and security.

**Application:** ./my-api
**Stack:** Node.js + Express + Prisma + PostgreSQL
**What needs containerizing:** API server + PostgreSQL + Redis (for sessions)
**Current Docker state:** None — running directly on the host
````
