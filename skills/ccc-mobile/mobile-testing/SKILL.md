---
name: mobile-testing
description: "Mobile testing strategies and frameworks — Detox, Maestro, XCTest, Espresso, unit testing, and CI integration."
version: 1.0.0
category: mobile
parent: ccc-mobile
tags: [ccc-mobile, testing, mobile, e2e]
disable-model-invocation: true
---

# Mobile Testing

## What This Does

Provides comprehensive mobile testing guidance across frameworks and platforms. Covers unit testing, integration testing, and end-to-end testing for React Native, Flutter, SwiftUI, and Jetpack Compose. Includes CI pipeline setup for automated mobile test runs.

## Instructions

1. **Assess the testing needs.** Determine:
   - Framework: React Native, Flutter, SwiftUI, or Jetpack Compose?
   - What needs testing? (unit, integration, E2E, visual)
   - Current test coverage and gaps
   - CI/CD platform (GitHub Actions, Bitrise, CircleCI)
   - Device targets (simulators only, or real device farms?)

2. **Choose the right testing framework.**

   **React Native:**
   | Level | Framework | Use For |
   |-------|-----------|---------|
   | Unit | Jest + React Native Testing Library | Components, hooks, utilities |
   | E2E | Detox | Full app automation on simulators |
   | E2E | Maestro | Flow-based testing with YAML |

   **Flutter:**
   | Level | Framework | Use For |
   |-------|-----------|---------|
   | Unit | flutter_test | Dart functions, providers, blocs |
   | Widget | flutter_test | Individual widget behavior |
   | Integration | integration_test | Full app flows on device |
   | Golden | golden_toolkit | Visual regression snapshots |

   **iOS (SwiftUI):**
   | Level | Framework | Use For |
   |-------|-----------|---------|
   | Unit | XCTest | Swift logic, ViewModels |
   | UI | XCUITest | SwiftUI view automation |
   | Snapshot | swift-snapshot-testing | Visual regression |

   **Android (Compose):**
   | Level | Framework | Use For |
   |-------|-----------|---------|
   | Unit | JUnit 5 + MockK | Kotlin logic, ViewModels |
   | UI | Compose UI Test | Composable interaction testing |
   | E2E | Espresso | Full app automation |

3. **Write unit tests first.** For every framework:
   ```
   // Pattern: Arrange -> Act -> Assert
   // Test pure logic, ViewModels, repositories, utilities
   // Mock external dependencies (network, storage, platform APIs)
   // Aim for 80%+ coverage on business logic
   ```

4. **Write E2E tests for critical flows.** Focus on:
   - Onboarding / signup / login
   - Core user journey (the thing users do most)
   - Payment / checkout flows
   - Push notification handling
   - Deep link navigation
   - Offline behavior

5. **Maestro example (cross-platform E2E):**
   ```yaml
   # flows/login.yaml
   appId: com.example.app
   ---
   - launchApp
   - tapOn: "Email"
   - inputText: "user@example.com"
   - tapOn: "Password"
   - inputText: "password123"
   - tapOn: "Sign In"
   - assertVisible: "Welcome"
   - assertVisible: "Dashboard"
   ```

6. **Detox example (React Native E2E):**
   ```typescript
   describe('Login Flow', () => {
     beforeAll(async () => {
       await device.launchApp();
     });

     it('should login successfully', async () => {
       await element(by.id('email-input')).typeText('user@example.com');
       await element(by.id('password-input')).typeText('password123');
       await element(by.id('login-button')).tap();
       await expect(element(by.text('Welcome'))).toBeVisible();
     });
   });
   ```

7. **CI integration.** Set up automated test runs:
   - Unit tests: run on every PR
   - E2E tests: run on merge to main or release branches
   - Use simulators/emulators in CI (GitHub Actions has macOS runners)
   - For real device testing: Firebase Test Lab, AWS Device Farm, or BrowserStack

## Output Format

When setting up tests:
- Provide test file templates with the correct imports and setup
- Include CI configuration (GitHub Actions workflow YAML)
- List required dev dependencies to install
- Provide a test naming convention guide

```markdown
## Test Setup Complete

### Installed
- {framework}: {version}
- {mocking library}: {version}

### Test Structure
{directory tree of test files}

### Run Commands
- Unit: `{command}`
- E2E: `{command}`
- Coverage: `{command}`

### CI Pipeline
{link to or contents of CI config file}
```

## Tips

- Maestro is the fastest way to get E2E tests running across platforms — YAML syntax, no code
- For React Native, Detox is more powerful but harder to set up than Maestro
- Test on real devices before release — simulator-only testing misses real-world issues
- Use test IDs (`testID` in RN, `Modifier.testTag` in Compose) instead of text matchers
- Flaky tests are worse than no tests — invest in test stability
- Golden/snapshot tests catch visual regressions that functional tests miss
- Run E2E tests against a staging API, not production — seed test data reliably
