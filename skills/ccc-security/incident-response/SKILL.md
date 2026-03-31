---
name: incident-response
description: "Security incident response playbook — containment, investigation, remediation, and post-incident review procedures."
version: 1.0.0
category: security
parent: ccc-security
tags: [ccc-security, incident-response, breach, remediation]
disable-model-invocation: true
---

# Incident Response

## What This Does

Provides a structured incident response playbook for security events — from initial detection through containment, investigation, remediation, and post-incident review. Designed to be followed step-by-step during an active incident, with checklists and decision trees for common scenarios.

## Instructions

### Phase 1: Detection and Triage (First 15 minutes)

1. **Confirm the incident.** Is this a real security event or a false alarm?
   - What triggered the alert? (monitoring, user report, external notification)
   - What evidence exists? (logs, screenshots, error messages)
   - Is it ongoing or historical?

2. **Classify severity.**

   | Severity | Criteria | Response |
   |----------|----------|----------|
   | SEV-1 | Active data breach, production down, ransomware | All hands, external comms |
   | SEV-2 | Confirmed compromise, no active exfiltration | Incident team, management notified |
   | SEV-3 | Suspected compromise, limited scope | On-call engineer investigates |
   | SEV-4 | Low-risk event, needs investigation | Scheduled review |

3. **Assemble the response team.**
   - Incident commander (owns the response)
   - Technical lead (drives investigation)
   - Communications (internal and external)
   - Legal (if data breach involves PII/regulated data)

### Phase 2: Containment (First 1 hour)

4. **Stop the bleeding.** Immediate containment actions:
   ```
   Priority order:
   1. Revoke compromised credentials (API keys, tokens, passwords)
   2. Block attacker IP/account if identified
   3. Isolate affected systems (disable network access, not shut down)
   4. Disable compromised accounts
   5. Enable enhanced logging on affected systems
   ```

   **Do NOT:**
   - Shut down affected servers (preserves evidence in memory)
   - Delete or modify logs
   - Communicate externally before legal review
   - Attempt to "hack back"

5. **Preserve evidence.**
   - Take disk snapshots of affected systems
   - Export relevant logs before rotation
   - Screenshot active sessions or indicators
   - Record timestamps of all containment actions
   - Document the chain of custody for all evidence

### Phase 3: Investigation (Hours 1-24)

6. **Determine scope.** Answer these questions:
   - What systems were accessed?
   - What data was potentially exposed?
   - How did the attacker gain access? (initial access vector)
   - How long has the attacker had access? (dwell time)
   - What actions did the attacker take? (lateral movement, exfiltration)

7. **Investigation checklist:**
   ```
   [ ] Review authentication logs for anomalous logins
   [ ] Check for new/modified user accounts
   [ ] Review API access logs for unusual patterns
   [ ] Check for data exports or bulk downloads
   [ ] Review system/application logs for errors or anomalies
   [ ] Check for modified files or new files on servers
   [ ] Review network traffic logs for unusual destinations
   [ ] Check for persistence mechanisms (cron jobs, startup scripts)
   [ ] Review CI/CD pipeline for unauthorized changes
   [ ] Check third-party integrations for compromised tokens
   ```

8. **Build the timeline.** Reconstruct events chronologically:
   ```
   YYYY-MM-DD HH:MM - {Event description} - {Source: log/report}
   YYYY-MM-DD HH:MM - {Event description} - {Source: log/report}
   ```

### Phase 4: Remediation (Hours 24-72)

9. **Eradicate the threat.**
   - Remove all attacker persistence mechanisms
   - Patch the vulnerability that enabled access
   - Rotate ALL credentials (not just confirmed compromised ones)
   - Rebuild affected systems from known-good state
   - Update WAF/firewall rules to block the attack vector

10. **Verify remediation.**
    - Scan for remaining indicators of compromise
    - Test that the vulnerability is patched
    - Confirm attacker access is fully revoked
    - Monitor for signs of re-entry

### Phase 5: Recovery and Review (Days 3-14)

11. **Restore services.**
    - Bring systems back online in order of criticality
    - Monitor closely for 48 hours post-restoration
    - Verify data integrity

12. **Notifications.**
    - Internal stakeholders (management, board if severe)
    - Affected users (if data was exposed)
    - Regulators (GDPR: 72 hours, HIPAA: 60 days, PCI: varies)
    - Law enforcement (if criminal activity suspected)

13. **Post-incident review.**
    - Schedule blameless retrospective within 1 week
    - Document: what happened, impact, timeline, root cause, what went well, what didn't
    - Create action items to prevent recurrence
    - Update incident response procedures based on lessons learned

## Output Format

```markdown
# Incident Response: {Incident Title}
**Severity:** {SEV-1/2/3/4}
**Status:** {Active / Contained / Resolved / Post-Mortem}
**Detected:** {timestamp}
**Contained:** {timestamp}
**Resolved:** {timestamp}

## Summary
{2-3 sentences: what happened, impact, current status}

## Timeline
| Time | Event | Source |
|------|-------|--------|
| {time} | {event} | {source} |

## Affected Systems
| System | Impact | Status |
|--------|--------|--------|
| {system} | {what was affected} | {contained/resolved} |

## Root Cause
{How the attacker gained access and what vulnerability was exploited}

## Remediation Actions
- [x] {Completed action}
- [ ] {Pending action}

## Data Impact
- Records potentially exposed: {count}
- Data types: {PII, financial, credentials, etc.}
- Notification required: {yes/no — which regulations}

## Lessons Learned
- What went well: {list}
- What didn't go well: {list}
- Action items: {list with owners and deadlines}
```

## Tips

- Speed matters: contain first, investigate second — don't let perfect investigation delay stopping the breach
- Never communicate externally without legal review — breach notification laws are specific and penalties are real
- Preserve logs immediately — log rotation can destroy critical evidence within hours
- A blameless post-mortem is essential — if people fear blame, they'll hide information
- Keep a running log during the incident — memory is unreliable under stress
- Practice incident response before you need it — tabletop exercises save real-world time
- After the incident, run `variant-analysis` to find similar vulnerabilities elsewhere in the codebase
