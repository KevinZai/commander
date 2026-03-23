---
name: wifi-captive-portal
description: "WiFi captive portal development patterns for guest WiFi networks. Splash pages, authentication flows, data capture, RADIUS integration, social WiFi login, and guest network provisioning."
category: networking
risk: safe
source: custom
tags: [wifi, captive-portal, guest-network, radius, mywifi]
---

# WiFi Captive Portal Development

## When to Use
- Building or modifying captive portal splash pages
- Implementing guest WiFi authentication flows
- Integrating social login (Facebook, Google, Apple) for WiFi access
- Building data capture forms for WiFi signup
- Working with RADIUS servers or UniFi/Meraki controllers
- Implementing MAC address authentication
- Building location-based WiFi analytics

## Architecture Patterns

### Captive Portal Flow
```
Guest connects → DHCP assigns IP → HTTP redirect to splash →
User authenticates (social/email/SMS) → MAC authorized →
RADIUS accepts → Internet access granted → Session tracked
```

### Key Components
1. **Splash Page** — branded landing (React/Next.js), responsive, fast load
2. **Auth Backend** — social OAuth, email/SMS verification, form capture
3. **RADIUS Integration** — FreeRADIUS or cloud RADIUS, MAC auth
4. **Controller API** — UniFi, Meraki, Ruckus, OpenWrt APIs
5. **Analytics** — session duration, return visits, demographics
6. **CRM Sync** — captured data → HubSpot/Mailchimp/Klaviyo

### Social WiFi Login
- Facebook WiFi API (deprecated → use Meta Graph API)
- Google OAuth 2.0 → capture email + name
- Apple Sign In → privacy relay considerations
- SMS OTP → Twilio Verify for phone capture

### Data Capture Best Practices
- Minimal fields (email OR phone, never both required)
- GDPR/CCPA consent checkbox mandatory
- Marketing opt-in separate from WiFi access
- Store: email, phone, name, MAC, location, visit timestamps

## Security
- HTTPS on splash page always (even if portal is HTTP redirect)
- Rate limit auth attempts
- MAC spoofing detection
- Session timeout enforcement
- PCI compliance if collecting payment data
