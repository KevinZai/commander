---
name: n8n-mcp-setup
description: Setup guide for n8n-MCP server — connect Claude Code to 400+ n8n integrations
category: integrations
triggers:
  - n8n
  - workflow automation
  - n8n mcp
---

# n8n MCP Server Setup

Connect Claude Code to 400+ n8n integrations via the n8n-MCP server (czlonkowski/n8n-mcp).

## When to Use
- Connecting Claude Code to external services (Slack, email, CRMs, databases)
- Automating workflows from within Claude Code sessions
- Managing n8n workflows programmatically

## Quick Start
```bash
# Run directly via npx (no install needed)
npx n8n-mcp

# Or install globally
npm install -g n8n-mcp

# Or use Docker
docker run -p 3000:3000 czlonkowski/n8n-mcp
```

## Claude Code MCP Configuration

Add to your project's `.claude/settings.json`:
```json
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "N8N_API_URL": "http://localhost:5678/api/v1",
        "N8N_API_KEY": "your-n8n-api-key"
      }
    }
  }
}
```

## Key Capabilities
- **812 core nodes** — HTTP, databases, APIs, file systems
- **584 community nodes** — specialized integrations
- **2,709 workflow templates** — pre-built automation patterns
- **20 MCP tools** — 7 core + 13 n8n management tools

## Prerequisites
- n8n instance running (local or cloud) at port 5678
- n8n API key (Settings > API in n8n dashboard)
- Node.js 18+

## Reference
- Repository: github.com/czlonkowski/n8n-mcp
- License: MIT
