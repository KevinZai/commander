# Quickstart Guide: Mobile Developer

> Build native and cross-platform mobile apps with the Bible. React Native, Flutter, SwiftUI, Jetpack Compose, and app store optimization.

---

## Mobile Mega-Skill

Load the entire mobile domain:

```
use mega-mobile skill
```

This gives you access to **7 mobile skills** through a single router:

| Skill | Platform | What It Covers |
|-------|----------|----------------|
| `react-native` | iOS + Android | Expo, navigation, native modules, performance |
| `flutter` | iOS + Android + Web | Dart patterns, state management, platform channels |
| `swiftui` | iOS / macOS | Declarative UI, Combine, async/await, Core Data |
| `jetpack-compose` | Android | Material 3, ViewModel, Room, Kotlin coroutines |
| `cross-platform-patterns` | All | Shared logic, platform-specific UI, offline-first |
| `mobile-testing` | All | Unit, widget, integration, device testing |
| `app-store-optimization` | iOS + Android | ASO, screenshots, metadata, reviews |

---

## Platform Setup

### React Native (Recommended for Cross-Platform)

```bash
npx create-expo-app@latest my-app
cd my-app
claude
/init   # Select React Native / Expo when asked
```

Key Bible skills for React Native:
- `react-native` — Expo Router, native modules, gesture handling, animations
- `mobile-testing` — Detox E2E, Jest component tests
- `app-store-optimization` — Store listing optimization

```
/cc mode normal

use mega-mobile skill

Build a task manager app with React Native (Expo):
- Tab navigation: Tasks, Calendar, Settings
- Task list with swipe-to-complete gesture
- Pull-to-refresh with haptic feedback
- Local storage with AsyncStorage
- Push notifications for due dates
- Dark mode support (follows system preference)

Requirements:
- Expo SDK 52+
- Expo Router for navigation
- TypeScript strict mode
- Reanimated for gesture animations
```

### Flutter

```bash
flutter create my_app
cd my_app
claude
/init   # Select Flutter when asked
```

Key Bible skill: `flutter` — Widget composition, Riverpod state management, platform channels, adaptive layouts.

```
use mega-mobile skill

Build a weather app with Flutter:
- Home screen: current weather with animated background
- 7-day forecast with horizontal scroll
- City search with autocomplete
- Offline caching (last known weather)
- Material 3 theming with dynamic color

Requirements:
- Riverpod for state management
- Dio for HTTP requests
- Hive for local caching
- flutter_animate for micro-interactions
```

### SwiftUI (iOS Native)

```bash
# Create project in Xcode first, then:
cd MyApp
claude
/init   # Select SwiftUI when asked
```

Key Bible skill: `swiftui` — Declarative UI patterns, navigation (NavigationStack), async/await data loading, Core Data/SwiftData, WidgetKit.

```
use mega-mobile skill

Build a habit tracker with SwiftUI:
- Home: daily habit grid with circular progress rings
- Detail: history chart (last 30 days)
- Add habit: name, icon picker, frequency, reminder time
- Widget: today's progress ring on home screen
- Persistence: SwiftData (Core Data successor)

Requirements:
- iOS 17+ (SwiftData, NavigationStack)
- Charts framework for history visualization
- WidgetKit for home screen widget
- Local notifications for reminders
- iCloud sync
```

### Jetpack Compose (Android Native)

```bash
# Create project in Android Studio first, then:
cd MyApp
claude
/init   # Select Jetpack Compose when asked
```

Key Bible skill: `jetpack-compose` — Material 3, ViewModel + StateFlow, Room database, Navigation Compose, Kotlin coroutines.

```
use mega-mobile skill

Build a recipe app with Jetpack Compose:
- Home: recipe grid with lazy loading
- Detail: full recipe with ingredients, steps, timer
- Search: full-text search with filters (cuisine, difficulty, time)
- Favorites: saved recipes with offline access
- Shopping list: generate from recipe ingredients

Requirements:
- Material 3 with dynamic color
- Hilt dependency injection
- Room database for offline storage
- Coil for image loading
- Navigation Compose for multi-screen
```

---

## Cross-Platform Patterns

### Shared Logic, Platform UI

The most effective cross-platform approach: share business logic, use platform-native UI.

```
use cross-platform-patterns skill

Architecture for a cross-platform app:
- Shared: API client, data models, business logic, validation
- iOS: SwiftUI views, iOS-specific interactions (haptics, widgets)
- Android: Compose views, Material Design, Android-specific features

With React Native / Flutter, this means:
- Core logic in shared modules/packages
- Platform-specific UI components when needed
- Adaptive layouts (tablet vs phone vs desktop)
```

### Offline-First Architecture

Mobile apps must work without reliable connectivity:

```
Design an offline-first data layer:
1. Local database as source of truth (SQLite / Realm / Hive)
2. Background sync when connectivity returns
3. Conflict resolution strategy (last-write-wins or merge)
4. Optimistic UI updates (show changes immediately)
5. Sync status indicators (synced / pending / conflict)
6. Queue failed requests for retry
```

### Navigation Patterns

```
Set up navigation for a mobile app with:
- Tab bar: Home, Search, Profile (bottom navigation)
- Stack navigation within each tab
- Modal presentation for create/edit flows
- Deep linking support (app://item/123)
- Auth flow: login -> main app (replace stack, no back button)
- Onboarding flow: shown once after first install
```

### Performance Optimization

```
use mega-mobile skill

Audit and optimize the app for performance:
1. List rendering: virtualized/recycled lists for large datasets
2. Image loading: proper caching, progressive loading, correct sizing
3. Animation: run on UI thread (Reanimated / Compose animations)
4. Memory: detect and fix leaks (disposed listeners, cancelled timers)
5. Startup: lazy initialization, splash screen timing
6. Bundle size: tree shaking, code splitting, asset optimization
```

---

## Testing Mobile Apps

### Test Pyramid for Mobile

```
Unit (60%) — business logic, utilities, data transformations
  - Jest (React Native), flutter_test, XCTest, JUnit
  - No device or emulator needed
  - Fast feedback loop

Widget/Component (25%) — UI components in isolation
  - React Native Testing Library, flutter widget tests
  - Test rendering, user interactions, state changes
  - Mock navigation and data sources

E2E (15%) — full user flows on device/emulator
  - Detox (React Native), integration_test (Flutter)
  - XCUITest (iOS), Espresso (Android)
  - Critical paths only (registration, core feature, purchase)
```

### TDD for Mobile

```
/tdd

Build the "add to cart" feature:

Logic:
- Add item with quantity
- Update quantity if item already in cart
- Remove item when quantity reaches 0
- Calculate total price with tax
- Apply discount codes (percentage or fixed amount)
- Maximum 99 items per product

UI:
- "Add to Cart" button with quantity selector
- Cart badge showing item count
- Cart sheet with swipe-to-delete
- Price summary with tax breakdown

Write tests for the cart logic first (unit tests),
then component tests for the UI, then one E2E test
for the full add -> view cart -> checkout flow.
```

### Device Testing Matrix

```
Test on these device configurations at minimum:
- Smallest supported phone (iPhone SE / small Android)
- Standard phone (iPhone 15 / Pixel 8)
- Large phone (iPhone 15 Pro Max / Galaxy S24 Ultra)
- Tablet (iPad / Android tablet) — if tablet is supported
- Both light and dark mode
- With accessibility: Large Text, VoiceOver/TalkBack on
- Offline mode: airplane mode mid-flow
- Low memory: background apps consuming RAM
```

---

## App Store Optimization (ASO)

### Before Submission

```
use app-store-optimization skill

Prepare for app store submission:

1. App name and subtitle
   - Primary keyword in title (30 chars max on iOS)
   - Descriptive subtitle (30 chars max on iOS)

2. Keywords (iOS) / Short description (Android)
   - Research competitor keywords
   - Include long-tail variations
   - Avoid duplicating words in title

3. Description
   - First 3 lines visible without "more" — hook the reader
   - Feature bullets with benefit-first language
   - Social proof (if available)
   - Call to action

4. Screenshots
   - First 2 screenshots are most critical (shown in search)
   - Show actual app UI with descriptive captions
   - iPhone 6.7" and 5.5" sizes (iOS)
   - Phone and 7" tablet (Android)

5. App preview video (optional but high-impact)
   - 15-30 seconds
   - Show core value proposition in first 5 seconds
   - No audio narration (most viewers have sound off)
```

### Post-Launch

```
use app-store-optimization skill

Optimize for post-launch growth:
1. Monitor ratings and reviews — respond to all 1-2 star reviews
2. A/B test screenshots (Google Play Experiments)
3. Track keyword rankings weekly
4. Update metadata with seasonal keywords
5. Prompt for ratings at positive moments (completed task, achievement)
6. Analyze install funnel: impression -> view -> install -> open -> retain
```

---

## Mobile-Specific Patterns

### Push Notifications

```
Set up push notifications:
- Firebase Cloud Messaging (both platforms)
- Notification categories: transactional, marketing, reminders
- Rich notifications with images and action buttons
- Notification preferences screen (per-category toggle)
- Badge count management
- Silent push for background data sync
```

### In-App Purchases

```
Implement in-app purchases:
- Subscription: monthly and annual pricing
- RevenueCat SDK for cross-platform subscription management
- Paywall screen with feature comparison
- Restore purchases flow
- Subscription status management
- Grace period handling
- Free trial with conversion tracking
```

### Authentication

```
Mobile auth flow:
- Biometric login (Face ID / fingerprint) after initial email/password
- OAuth: Sign in with Apple (required on iOS), Google
- Token refresh with automatic retry
- Secure token storage (Keychain on iOS, EncryptedSharedPreferences on Android)
- Session expiry handling (redirect to login, preserve deep link)
```

---

## Workflow: Mobile Feature Development

Here is the complete workflow for building a mobile feature:

### 1. Plan

```
/plan
Build the [feature name] feature for [platform].
Include: data model, API changes, UI screens, navigation, testing.
```

### 2. Load Skills

```
use mega-mobile skill
```

### 3. Schema + API (if backend involved)

```
use database-designer skill — design any new tables
use api-design skill — design any new endpoints
```

### 4. Build with TDD

```
/tdd
Build the [feature] with tests first:
- Unit tests for business logic
- Component tests for UI
- One E2E test for the happy path
```

### 5. Platform Polish

```
Add platform-specific polish:
- Haptic feedback on key interactions
- Adaptive layout for different screen sizes
- Accessibility labels on all interactive elements
- Loading states and skeleton screens
- Error states with retry buttons
- Empty states with helpful illustrations
```

### 6. Verify

```
/verify
```

### 7. Checkpoint

```
/checkpoint
```

---

## Power Tips

1. **Start with the smallest screen** — design for iPhone SE first, then scale up. This forces you to prioritize what matters.

2. **Test on real devices** — emulators miss performance issues, gesture recognition differences, and platform-specific quirks. Test critical flows on physical devices.

3. **Haptics are not optional** — subtle haptic feedback on button presses, swipe completions, and mode changes makes apps feel premium. Budget 30 minutes per screen for haptic tuning.

4. **Offline-first is the default** — assume the network is unreliable. Every feature should degrade gracefully without connectivity.

5. **Deep links from day one** — retrofitting deep linking is painful. Set up the URL scheme and universal links at project start.

6. **Accessibility is not optional** — VoiceOver (iOS) and TalkBack (Android) should work on every screen. The Bible's verification step checks for missing accessibility labels.

7. **Animation at 60fps or nothing** — janky animations are worse than no animations. Use the platform's native animation system (Reanimated, Compose animations, SwiftUI animations) rather than JS-driven animations.

8. **App Store review takes time** — submit early with a simple version. Iterate with updates. First review typically takes 24-48 hours, subsequent reviews are faster.

---

## Recommended First Mobile Project

New to the Bible's mobile workflow? Build this:

```
/init       # Select your platform (React Native recommended for first project)

/plan
Build a simple note-taking app:
- List of notes with title preview
- Create/edit note with Markdown support
- Swipe to delete with undo toast
- Search notes by title and content
- Local storage (AsyncStorage or SQLite)
- Dark mode support

Platform: React Native (Expo)
Stack: Expo Router, AsyncStorage, TypeScript
Tests: Jest unit tests + 1 Detox E2E test
```

This covers: list rendering, CRUD, gestures, search, persistence, theming — the core mobile patterns without the complexity of networking or auth.
