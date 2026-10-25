---
name: ccc-mobile
description: "Mobile router: React Native/Expo, Flutter, SwiftUI or Compose builds, mobile testing, ASO, push and deep links. Use for an iOS or Android app."
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Skill
  - AskUserQuestion
argument-hint: "[new | react-native | flutter | swiftui | jetpack-compose | testing | aso | push | deep-links]"
model: inherit
---

# $ccc-mobile — mobile work, routed

**CC Commander** · $ccc-mobile · the right mobile method for the detected platform, or a new app on the platform you pick.

Mobile sub-skills (`react-native`, `flutter`, `swiftui`, `jetpack-compose`, `mobile-testing`, `app-store-optimization`, `push-notifications`, `deep-linking`) ship with the Commander CLI toolkit. Invoke one with the Skill tool when it is listed in this session; otherwise apply the guidance in [references/routing.md](references/routing.md). The user's selected model is preserved.

Codex: ask pickers as plain-text questions.

## When to use / when not to

- Use for native or cross-platform mobile apps, their tests, store listings, push and deep links. `$ccc-build mobile` hands off here.
- Use `$ccc-build` for web apps, APIs and CLIs, `$ccc-design` for web UI.

## What happens

### 1. Detect the platform

Run in one Bash call, silent on failure:

```bash
test -f package.json && grep -oE '"(expo|react-native)"' package.json | sort -u
test -f pubspec.yaml && echo flutter
ls -d *.xcodeproj *.xcworkspace Package.swift 2>/dev/null
grep -lE 'androidx\.compose' build.gradle* app/build.gradle* 2>/dev/null
```

Render one line:

> 🎯 Platform: `<Expo | React Native | Flutter | SwiftUI | Jetpack Compose | none detected>`

### 2. Route by intent, or ask

An argument or a clear intent routes straight to the sub-skill in [references/routing.md](references/routing.md). `new`, or no app detected with a build request, goes to step 3.

Otherwise ask with AskUserQuestion (header "Mobile"), recommended first:

- 🟢 Build or extend the app — the sub-skill for the detected platform
- Test it — `mobile-testing` (Detox, Maestro, XCTest, Espresso)
- Ship to the stores — `app-store-optimization`
- More — push notifications or deep links, chosen in a follow-up picker

On More, ask with AskUserQuestion (header "More"), recommended first:

- 🟢 Push notifications — `push-notifications` (APNs, FCM, permission prompts)
- Deep links — `deep-linking` (universal links, app links, URL routing)

### 3. New app

Ask with AskUserQuestion (header "Platform"), recommended first:

- 🟢 React Native (Expo) — one codebase for both platforms, largest ecosystem; best for a team that knows React
- Flutter — one codebase, strongest custom UI and rendering performance
- SwiftUI — iOS only, fully native feel
- Jetpack Compose — Android only, fully native feel

Recommend Flutter first instead when the user said UI polish or performance matters most.

Then ask for an app name, derive `<slug>`, and confirm (🟢 Create it · Cancel) before running, since it downloads packages:

| Platform | Command | Check |
|---|---|---|
| Expo | `npx create-expo-app@latest <slug> --template tabs` | `cd <slug> && npx expo-doctor` |
| Flutter | `flutter create --org <reverse-domain> --platforms ios,android <slug>` | `cd <slug> && flutter analyze` |
| SwiftUI | Create the project in Xcode (App template, SwiftUI interface), then continue with `swiftui` | `xcodebuild -list` in the project folder |
| Jetpack Compose | Create the project in Android Studio (Empty Activity, Compose), then continue with `jetpack-compose` | `./gradlew assembleDebug` |

Never create the app inside an existing project's root; use a sub-directory.

### 4. Do the work

Follow the routed sub-skill. After any code change, run the platform check from the table in step 3 (or the project's own test command) and `git status --short`.

## Done when

- Routing only: the sub-skill was invoked or its guidance applied, and the user knows which one.
- New app: `<slug>/` exists and the platform check exited 0 in this turn; report its output.
- Code changed: the platform check or test command exited 0 and `git status --short` lists only the intended files.

## Guardrails

- Never submit to the App Store or Play Store, upload builds, or send test pushes to real devices without the user's explicit OK at that moment.
- Never write signing keys, push certificates or API keys into the repo; point to the platform's secret store.
- Never run a scaffold command without the step 3 confirmation.

## See also

- `$ccc-build` — web apps, APIs and CLIs
- `$ccc-testing` — test strategy beyond device tests
- `$ccc-design` — design tokens and visual direction
- `$ccc-ship` — release flow once the build is green

---

> ⚙️ **Fable contract:** plan before build · verifier ≠ worker · prove before alarm · loops need gates · leave durable state — `rules/fable-method.md`

> (On Codex, present these options as a numbered list and ask the user to reply with a number — AskUserQuestion is Claude-only.)
