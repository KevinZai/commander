---
name: mywifi-platform
description: "MyWiFi Networks / Guest Networks platform patterns. Multi-tenant WiFi management, location provisioning, splash page builder, campaign manager, and guest data analytics."
category: product
risk: safe
source: custom
tags: [mywifi, guest-networks, wifi-marketing, multi-tenant, saas]
---

# MyWiFi Networks Platform

## When to Use
- Working on Guest Networks / MyWiFi platform code
- Building multi-tenant WiFi management features
- Implementing location provisioning flows
- Building splash page template systems
- Working on WiFi marketing campaigns (email/SMS to guests)
- Building WiFi analytics dashboards

## Platform Architecture
```
Operators (resellers) → manage → Locations → have → Access Points
                                    ↓
                              Splash Pages → capture → Guest Data
                                    ↓
                              Campaigns → target → Guest Segments
```

### Multi-Tenant Model
- **Operators** — resellers/MSPs who manage multiple locations
- **Locations** — physical venues with WiFi
- **Guests** — end users who connect to WiFi
- **Campaigns** — automated marketing to captured guests

### Key APIs
- Location CRUD + provisioning
- Splash page builder (templates + custom HTML)
- Guest data export (CSV, API)
- Campaign manager (email/SMS triggers)
- Analytics (connections, unique visitors, return rate)
- Controller integration (UniFi, Meraki, OpenMesh)

## Tech Stack (GN/MyWiFi)
- Ruby on Rails backend
- React frontend
- PostgreSQL
- Redis for sessions
- Sidekiq for background jobs
- AWS (EC2, S3, SES, CloudFront)
