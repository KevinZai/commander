---
name: cc-infra
description: "CC Commander Infrastructure — manage Fleet Commander, Synapse, Cost tracking, CloudCLI, AO, Paperclip, TaskMaster. Use when the user says 'infrastructure', 'fleet', 'cost', 'synapse', 'agents', 'what services are running'."
---

# CC Infrastructure & Fleet

Access all infrastructure tools via rich menus.

## Available Services

| Service | Command | Port |
|---------|---------|------|
| Fleet Commander | /fleet | 4680 |
| Synapse | /syn | 4682 |
| Cost Dashboard | /cost | 3005 |
| Composio AO | /ao | CLI |
| CloudCLI | /cloudcli | 4681 |
| Paperclip | /paperclip | 3110 |
| TaskMaster | /tm | CLI |

## Usage

Probe all services: run `curl -s http://localhost:PORT/api/status` for each.

Present results as AskUserQuestion with recommendations based on what's running.

After every action, suggest next steps. Always include "Something else" as last option.
