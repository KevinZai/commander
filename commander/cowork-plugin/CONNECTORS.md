# Connectors

## How tool references work

Plugin files use `~~category` as a placeholder for whatever tool the user connects in that category. For example, `~~project tracker` might mean Linear, Jira, or any other project tracker with an MCP server.

Plugins are **tool-agnostic** — they describe workflows in terms of categories rather than specific products. The `.mcp.json` pre-configures specific MCP servers, but any MCP server in that category works.

## Connectors for this plugin

| Category | Placeholder | Included servers | Other options |
|----------|-------------|-----------------|---------------|
| Project tracker | `~~project tracker` | Linear | Jira, Asana, Shortcut, ClickUp |
| Source control | `~~source control` | GitHub | GitLab, Bitbucket |
| Chat | `~~chat` | Slack | Microsoft Teams, Discord |
| Email | `~~email` | Gmail | Outlook |
| Calendar | `~~calendar` | Google Calendar | Outlook Calendar |
| Knowledge base | `~~knowledge base` | — | Notion, Confluence, Coda |
| Social media | `~~social media` | — | Typefully, Buffer |
| Bookmarks | `~~bookmarks` | — | Raindrop, Pocket |
| CI/CD | `~~CI/CD` | — | GitHub Actions, CircleCI, Jenkins |
| Monitoring | `~~monitoring` | — | Datadog, New Relic, Grafana |
| Web search | `~~web search` | Tavily (pre-configured) | Brave Search, SerpAPI |
| Library docs | `~~library docs` | Context7 (pre-configured) | — |
| Files | `~~files` | Google Drive (pre-configured) | Dropbox, OneDrive |
