# ccc-mobile campaigns

Multi-step sequences for a whole app. Run one sub-skill at a time, and finish each step's check before starting the next. Sub-skill files live beside the router at `../<sub-skill>/SKILL.md`.

## Cross-platform app (React Native)

1. `react-native` — scaffold the project, navigation, state management.
2. `push-notifications` — FCM and APNs through React Native Firebase.
3. `deep-linking` — universal links and Android App Links.
4. `mobile-testing` — Detox end-to-end tests.
5. `app-store-optimization` — store listings before launch.

Deliverable: a cross-platform app with notifications, deep links and passing E2E tests.

## Native iOS app

1. `swiftui` — UI in SwiftUI with an MVVM structure.
2. `push-notifications` — APNs setup and notification handling.
3. `deep-linking` — universal links and custom URL schemes.
4. `mobile-testing` — XCTest unit and UI tests.
5. `app-store-optimization` — App Store listing.

Deliverable: a native iOS app with notification and deep-link support and passing XCTest suites.

## Native Android app

1. `jetpack-compose` — UI in Compose with Material Design 3.
2. `push-notifications` — FCM and notification channels.
3. `deep-linking` — Android App Links and intent filters.
4. `mobile-testing` — Espresso and Compose UI tests.
5. `app-store-optimization` — Play Store listing.

Deliverable: a native Android app with Material 3, notifications and passing UI tests.

## Platform selection

| Situation | Route |
|---|---|
| iOS and Android from one codebase, team knows React or TypeScript | `react-native` |
| iOS and Android from one codebase, custom UI and rendering performance matter most | `flutter` |
| iOS only, fully native | `swiftui` |
| Android only, fully native | `jetpack-compose` |
| Undecided | `react-native` when the team knows JS/TS; `flutter` when the team wants maximum UI control |
