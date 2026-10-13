---
name: ccc-mobile
description: "Route mobile work to one specialist sub-skill: React Native, Flutter, SwiftUI, Jetpack Compose, mobile testing, store optimization, push notifications or deep links. Use when building, testing or shipping an iOS or Android app."
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
argument-hint: "[react-native | flutter | swiftui | jetpack-compose | testing | aso | push | deep-links]"
model: inherit
effort: medium
---

# /ccc-mobile — mobile work, one specialist

**CC Commander** · ccc-mobile · picks the mobile sub-skill for the detected platform and intent, then follows it.

The user's selected model is preserved. Codex: ask each picker as a plain-text question with the same options.

## When to use / when not to

- Use for native or cross-platform mobile apps, their device tests, store listings, push notifications and deep links.
- Use `/ccc-build` for web apps, APIs and CLIs, and `/ccc-design` for web UI.

## Sub-skills

Each lives at `${CLAUDE_SKILL_DIR}/<sub-skill>/SKILL.md` and sets `disable-model-invocation: true`, so it loads only when this router reads it.

| Sub-skill | Use for | Not for |
|---|---|---|
| `react-native` | React Native and Expo: navigation, native modules, state | Dart or Flutter projects |
| `flutter` | Flutter and Dart: widget architecture, state management, platform channels | JS-based apps |
| `swiftui` | SwiftUI on iOS: MVVM, Combine and async/await, Apple platform features | Android |
| `jetpack-compose` | Compose on Android: Material Design 3, composable architecture | iOS |
| `mobile-testing` | Detox, Maestro, XCTest, Espresso, CI integration | Building features |
| `app-store-optimization` | App Store and Play Store keywords, screenshots, descriptions | In-app engagement |
| `push-notifications` | FCM, APNs, OneSignal, rich notifications | Navigation into the app |
| `deep-linking` | Universal links, Android App Links, deferred deep links | Messaging users |

Multi-step campaigns (cross-platform, native iOS, native Android) and the platform selection guide are in [references/campaigns.md](references/campaigns.md).

## What happens

1. **Detect the platform.** Run in one Bash call; missing files are not errors:

   ```bash
   test -f package.json && grep -oE '"(expo|react-native)"' package.json | sort -u
   test -f pubspec.yaml && echo flutter
   ls -d *.xcodeproj *.xcworkspace Package.swift 2>/dev/null
   grep -lE 'androidx\.compose' build.gradle* app/build.gradle* 2>/dev/null
   ```

   Report one line: `🎯 Platform: Expo | React Native | Flutter | SwiftUI | Jetpack Compose | none detected`.

2. **Route.** An argument or an unambiguous request maps straight to a row in the table above (`testing` → `mobile-testing`, `aso` → `app-store-optimization`, `push` → `push-notifications`, `deep-links` → `deep-linking`). Otherwise go to Decision points.

3. **Load one sub-skill.** Read `${CLAUDE_SKILL_DIR}/<sub-skill>/SKILL.md` (repo fallback: `skills/ccc-mobile/<sub-skill>/SKILL.md`). If the file is missing, say so and stop; do not improvise its content. Load the next sub-skill only when the current step is done or a campaign calls for it.

4. **Do the work** as the sub-skill directs, confirming target OS versions and constraints it asks about.

5. **Verify.** After any code change, run the platform check and `git status --short`:

   | Platform | Check |
   |---|---|
   | Expo / React Native | `npx expo-doctor` (Expo) or the project's `npm test` |
   | Flutter | `flutter analyze` and `flutter test` |
   | SwiftUI | `xcodebuild -list`, then the project's test scheme with `xcodebuild test` |
   | Jetpack Compose | `./gradlew assembleDebug` and `./gradlew test` |

   On failure, report the failing output, fix within scope, and rerun.

## Decision points

No argument and no clear intent: ask with AskUserQuestion (header "Mobile"):

- 🟢 Build or extend the app — the sub-skill for the detected platform
- Test it — `mobile-testing`
- Ship to the stores — `app-store-optimization`
- Push or deep links — a follow-up picker with `push-notifications` and `deep-linking`

No platform detected and the user wants a new app: ask with AskUserQuestion (header "Platform"):

- 🟢 React Native — one codebase for both platforms; best when the team knows React
- Flutter — one codebase with the strongest custom UI and rendering control
- SwiftUI — iOS only, fully native
- Jetpack Compose — Android only, fully native

## Done when

- Routing only: the sub-skill file was read and the user knows which one is active.
- Code changed: the platform check exited 0 in this turn and `git status --short` lists only the intended files; report the actual output.

## Guardrails

- Never submit to the App Store or Play Store, upload builds, or send pushes to real devices without the user's explicit OK at that moment.
- Never write signing keys, push certificates or API keys into the repo; use the platform's secret store.
- Never scaffold a new app inside an existing project's root.
- Load one sub-skill at a time.

## See also

- `/ccc-build` — web apps, APIs and CLIs
- `/ccc-testing` — test strategy beyond device tests
- `/ccc-design` — design tokens and visual direction
- `/ccc-ship` — release flow once the build is green
