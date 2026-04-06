# Third-Party Licenses & Attribution

## Included Vendor Packages (Git Submodules)

The following packages are included as git submodules in `vendor/`. Each maintains its own LICENSE file. CC Commander does not modify their code.

| Package | License | Path |
|---------|---------|------|
| oh-my-claudecode | MIT | vendor/oh-my-claudecode |
| claude-code-best-practice | MIT | vendor/claude-code-best-practice |
| everything-claude-code | MIT | vendor/everything-claude-code |
| Superpowers | MIT | vendor/superpowers |
| Claude HUD | MIT | vendor/claude-hud |
| Caliber AI Setup | MIT | vendor/caliber-ai-setup |
| gstack | MIT | vendor/gstack |
| Compound Engineering | MIT | vendor/compound-engineering |
| claude-reflect | MIT | vendor/claude-reflect |
| RTK | MIT | vendor/rtk |
| acpx | MIT | vendor/acpx |

CC Commander is an original implementation. No code was copied from
any third-party project. The following projects provided architectural inspiration and
their patterns influenced our design:

## Pattern Inspirations

### CCPM (automazeio/ccpm)
- **License:** MIT
- **Influence:** Spec-driven task decomposition pattern (PRD → tasks → code)
- **URL:** https://github.com/automazeio/ccpm

### Spec Kit (github/spec-kit)
- **License:** MIT
- **Influence:** Specification → implementation pipeline concept
- **URL:** https://github.com/github/spec-kit

### Claude MPM (bobmatnyc/claude-mpm)
- **License:** Elastic License 2.0
- **Influence:** Session resumption at context thresholds, progressive skill disclosure
- **URL:** https://github.com/bobmatnyc/claude-mpm

### claude-code-templates (davila7/claude-code-templates)
- **License:** MIT
- **Influence:** Interactive template browsing UX pattern
- **URL:** https://github.com/davila7/claude-code-templates

### Claude Code Mastery Starter Kit (TheDecipherist)
- **License:** MIT
- **Influence:** Wizard-style project onboarding with named profiles
- **URL:** https://github.com/TheDecipherist/claude-code-mastery-project-starter-kit

### Simone (Helmi/claude-simone)
- **License:** MIT
- **Influence:** PM framework patterns, structured decision-making
- **URL:** https://github.com/Helmi/claude-simone

### Everything Claude Code (affaan-m/everything-claude-code)
- **License:** MIT
- **Influence:** Comprehensive skill organization and discovery patterns
- **URL:** https://github.com/affaan-m/everything-claude-code

---

## Explicitly NOT Used (License Incompatible)

The following projects were reviewed but their code/patterns were NOT adopted due to
license restrictions:

| Project | License | Reason |
|---------|---------|--------|
| Product-Manager-Skills (deanpeters) | CC-BY-NC-SA 4.0 | Non-commercial clause |
| Kiro CLI (AWS) | Proprietary | No open license |
| CloudCLI (siteboon) | AGPL v3 | Source disclosure for SaaS |
| oh-my-openagent | SUL-1.0 | SUL-1.0 license — not MIT compatible |

---

## Community Credits

200+ community sources informed the broader CC Commander. See BIBLE.md Appendix B
(Contributor Credits) for the full list.
