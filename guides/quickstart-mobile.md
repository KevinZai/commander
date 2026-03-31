# Quickstart Guide: Mobile Developer

> Build native and cross-platform mobile apps with CC Commander. Mega-mobile skills, platform-specific setup, navigation patterns, state management, testing, ASO, push notifications, and deep linking.

---

## Relevant Mega-Skills

### Mega-Mobile (Primary)

Load the entire mobile development domain with one command:

```
use mega-mobile skill
```

This gives you access to **8 specialist skills** through a single router:

| Skill | Command | What It Covers |
|-------|---------|---------------|
| `react-native` | `/react-native` | React Native development, Expo, navigation, native modules |
| `flutter` | `/flutter` | Flutter/Dart, widget architecture, Riverpod, platform channels |
| `swiftui` | `/swiftui` | SwiftUI, MVVM, Combine, iOS-specific features, App Clips |
| `jetpack-compose` | `/jetpack-compose` | Jetpack Compose, Material Design 3, Kotlin coroutines |
| `mobile-testing` | `/mobile-testing` | Detox, Maestro, XCTest, Espresso, screenshot testing |
| `app-store-optimization` | `/app-store-optimization` | ASO for App Store and Play Store listings |
| `push-notifications` | `/push-notifications` | FCM, APNs, OneSignal, rich notifications, silent push |
| `deep-linking` | `/deep-linking` | Universal links, app links, deferred deep links |

### How Routing Works

Tell Claude what you are building and which platform you target. The router dispatches to the right specialist automatically:

```
use mega-mobile skill. I'm building a fitness tracking app
with React Native and Expo, targeting iOS and Android.
```

The router selects `react-native` and configures for Expo + dual-platform.

### Supporting Mega-Skills

For a complete mobile development experience, combine mega-mobile with:

```
use mega-mobile skill     # Core mobile development
use mega-design skill     # UI polish, animations, design systems
use mega-testing skill    # Testing infrastructure
```

---

## Platform Decision Tree

```
Which platform should you target?
|
+-- Need iOS + Android from one codebase?
|   +-- Team knows React/JavaScript/TypeScript? -> React Native (Expo)
|   +-- Want maximum UI control and performance? -> Flutter
|
+-- Need native platform experience?
|   +-- iOS only? -> SwiftUI
|   +-- Android only? -> Jetpack Compose
|
+-- Not sure?
    +-- Start with React Native if team knows JS/TS
    +-- Start with Flutter if team wants pixel-perfect UI control
    +-- Start native if targeting a single platform with platform-specific features
```

---

## Platform-Specific Setup

### React Native (with Expo)

```bash
npx create-expo-app my-app
cd my-app
claude
/init   # Select mobile when asked
```

```
use mega-mobile skill, route to react-native

Build a React Native app with Expo:
- Expo Router for file-based navigation (tabs + stack + modal)
- Expo SecureStore for sensitive data (tokens, keys)
- TanStack Query for API state management
- NativeWind (Tailwind for RN) for styling
- Reanimated for gesture-driven animations
- EAS Build for cloud CI/CD
```

**React Native key patterns:**
- **Expo first** — always use Expo unless you need a native module that requires bare workflow. Expo covers 95% of use cases.
- **Expo Router over React Navigation** — file-based routing is simpler, matches Next.js mental model, supports deep linking automatically
- **NativeWind for styling** — brings Tailwind syntax to React Native, faster iteration than StyleSheet.create
- **Reanimated for animations** — runs on the UI thread, guaranteed 60fps. Never use Animated API from React Native core.
- **EAS Build** — cloud builds without Xcode or Android Studio locally. Essential for CI/CD.
- **Expo Modules** — when you need native code, Expo Modules API is simpler than the old bridge

**Project structure:**

```
app/                    # Expo Router file-based routes
  (tabs)/               # Tab navigator group
    index.tsx           # Home tab
    settings.tsx        # Settings tab
  _layout.tsx           # Root layout with navigation
  [id].tsx              # Dynamic route
components/             # Shared UI components
hooks/                  # Custom hooks (useAuth, useApi, etc.)
services/               # API clients, storage, notifications
stores/                 # Zustand or TanStack Query config
constants/              # Theme, colors, spacing, typography
```

### Flutter

```bash
flutter create my_app
cd my_app
claude
/init   # Select mobile when asked
```

```
use mega-mobile skill, route to flutter

Build a Flutter app with:
- GoRouter for declarative navigation with deep linking
- Riverpod for state management (not Provider)
- Dio + Retrofit for type-safe API calls
- Freezed for immutable data classes with copyWith
- Material Design 3 theming with dynamic color
- Platform-adaptive widgets (Cupertino on iOS, Material on Android)
```

**Flutter key patterns:**
- **Riverpod over Provider** — better compile-time safety, no BuildContext dependency, auto-dispose
- **Freezed for models** — generates immutable classes, copyWith, JSON serialization, union types
- **GoRouter** — declarative routing, deep linking out of the box, redirect guards for auth
- **Platform-adaptive** — use `Platform.isIOS` to swap Material/Cupertino widgets. Or use `flutter_adaptive_scaffold`.
- **Specify Flutter 3.x** — Claude sometimes generates Flutter 2 syntax. Always mention your version.

**Project structure:**

```
lib/
  app/                  # App entry, routing, theme
  features/             # Feature modules
    auth/
      data/             # Repositories, data sources
      domain/           # Models, use cases
      presentation/     # Screens, widgets, controllers
    home/
      ...
  shared/               # Shared widgets, utils, constants
  core/                 # DI, networking, error handling
```

### SwiftUI (iOS Native)

```bash
# Create project in Xcode first, then:
cd MyApp
claude
/init   # Select iOS when asked
```

```
use mega-mobile skill, route to swiftui

Build a SwiftUI app with:
- MVVM architecture with @Observable (iOS 17+)
- Swift Data for persistence (not Core Data)
- NavigationStack with typed destinations
- Async/await for networking (not Combine for new code)
- Custom design system with ViewModifiers
- WidgetKit for home screen widgets
```

**SwiftUI key patterns:**
- **@Observable over ObservableObject** — simpler, better performance (requires iOS 17+)
- **Swift Data over Core Data** — modern, Swift-native, significantly less boilerplate
- **NavigationStack over NavigationView** — NavigationView is deprecated since iOS 16
- **Async/await over Combine** — simpler for network calls. Combine is still useful for reactive streams.
- **Always specify minimum iOS version** — features differ significantly between iOS 16, 17, and 18

**Project structure:**

```
MyApp/
  App/                  # App entry point, AppDelegate
  Features/
    Auth/
      Views/            # SwiftUI views
      ViewModels/       # @Observable view models
      Models/           # Swift Data models
    Home/
      ...
  Shared/
    Components/         # Reusable views
    Extensions/         # Swift extensions
    Modifiers/          # Custom ViewModifiers
    Services/           # Networking, storage
  Resources/            # Assets, localization
```

### Jetpack Compose (Android Native)

```bash
# Create project in Android Studio first, then:
cd MyApp
claude
/init   # Select Android when asked
```

```
use mega-mobile skill, route to jetpack-compose

Build a Jetpack Compose app with:
- Material Design 3 with dynamic color theming
- Navigation Compose with type-safe routes (Kotlin Serialization)
- Hilt for dependency injection
- Room for local database with Flow integration
- Retrofit + Kotlin Serialization for API calls
- Coroutines + Flow for async operations
```

**Jetpack Compose key patterns:**
- **Material 3 over Material 2** — dynamic color, updated components, modern design language
- **Type-safe navigation** — use the Kotlin Serialization navigation plugin (new in 2024)
- **Hilt over manual DI** — standard for Android, much less boilerplate than raw Dagger
- **Room over raw SQLite** — compile-time verified queries, Flow integration, migration support
- **Always use @Composable patterns** — Claude sometimes mixes View-based and Compose code. Specify Compose-only.

**Project structure:**

```
app/src/main/java/com/example/myapp/
  di/                   # Hilt modules
  data/
    local/              # Room database, DAOs
    remote/             # Retrofit API services
    repository/         # Repository implementations
  domain/
    model/              # Domain models
    repository/         # Repository interfaces
    usecase/            # Use cases
  presentation/
    navigation/         # NavHost, routes
    screens/            # Screen composables
    components/         # Shared composables
    theme/              # Material 3 theme, colors, typography
```

---

## Navigation Patterns

### Cross-Platform Navigation

| Pattern | React Native | Flutter | SwiftUI | Compose |
|---------|-------------|---------|---------|---------|
| Tab navigation | Expo Router `(tabs)/` | `BottomNavigationBar` | `TabView` | `NavigationBar` |
| Stack navigation | Expo Router nesting | `GoRouter` sub-routes | `NavigationStack` | `NavHost` |
| Modal presentation | `presentation: "modal"` | `showModalBottomSheet` | `.sheet()` | `ModalBottomSheet` |
| Deep linking | Expo Router automatic | GoRouter `redirect` | Universal Links | App Links |
| Auth guard | Layout redirect | GoRouter `redirect` | `.onAppear` check | NavHost `startDestination` |

### Auth Flow Navigation

```
App Launch
  |
  +-- Check auth state
      |
      +-- Authenticated? -> Main Tab Navigator
      |     |
      |     +-- Home
      |     +-- Search
      |     +-- Profile -> Settings, Edit Profile
      |
      +-- Not authenticated? -> Auth Stack
            |
            +-- Login
            +-- Register
            +-- Forgot Password
            +-- Verify Email
```

Implement this pattern:
1. Store auth state (token or session) in secure storage
2. Check auth state on app launch (splash screen while checking)
3. Navigation root conditionally renders Auth Stack or Main Navigator
4. On login success, replace the navigation state (not push — user cannot go "back" to login)
5. On logout, clear secure storage and replace with Auth Stack

---

## State Management

| Framework | Recommended | Alternative | Avoid |
|-----------|-------------|-------------|-------|
| React Native | TanStack Query (server) + Zustand (client) | Jotai, Legend State | Redux (too much boilerplate) |
| Flutter | Riverpod | Bloc | Provider (predecessor to Riverpod) |
| SwiftUI | @Observable + SwiftData | Combine | @ObservedObject for new code |
| Compose | ViewModel + StateFlow | Orbit MVI | LiveData (legacy) |

**Key principle:** Separate server state from client state.

- **Server state** (API data, user profile, feed): Use a dedicated server-state library (TanStack Query, Riverpod async, SwiftData). These handle caching, revalidation, and background refresh.
- **Client state** (UI state, form inputs, modal open/closed): Use lightweight local state (Zustand, @State, remember/mutableStateOf).

Never mix the two. Do not put API data in local state.

---

## Testing Mobile Apps

### Testing Strategy by Platform

| Platform | Unit Tests | Integration Tests | E2E Tests | Screenshot Tests |
|----------|-----------|-------------------|-----------|-----------------|
| React Native | Jest + RNTL | Jest + MSW | Detox or Maestro | Storybook + Chromatic |
| Flutter | flutter_test + mockito | integration_test | patrol or Maestro | Golden tests (built-in) |
| SwiftUI | XCTest + ViewInspector | XCTest | XCUITest | Snapshot testing |
| Compose | JUnit + Compose testing | Espresso | Maestro | Compose preview screenshots |

### Setting Up Detox (React Native)

```
use mobile-testing skill

Set up Detox E2E testing for my Expo app:
- Configure for iOS simulator and Android emulator
- Write tests for: login flow, main tab navigation, pull-to-refresh
- Set up CI with EAS Build + Detox
- Handle async operations (network requests, animations)
```

### Setting Up Maestro (Cross-Platform)

```
use mobile-testing skill

Set up Maestro E2E testing:
- Install Maestro CLI
- Write flows for: onboarding, authentication, main feature
- Record and replay user interactions
- CI integration with GitHub Actions
```

Maestro works with React Native, Flutter, SwiftUI, and Compose — one test tool for all platforms. It uses a YAML-based flow definition that is simpler than code-based E2E tests.

### Testing Tips

1. **Mock network calls** — use MSW (React Native), Dio interceptors (Flutter), URLProtocol (iOS), or OkHttp interceptors (Android)
2. **Test on real devices** — simulators miss real-world issues: memory pressure, slow networks, battery optimization killing background tasks
3. **Golden/screenshot tests** — catch visual regressions automatically. Flutter has built-in golden tests. Others need third-party tools.
4. **Test offline behavior** — mobile users lose connectivity frequently. Test that your app degrades gracefully.

---

## App Store Optimization (ASO)

Load the ASO specialist:

```
use mega-mobile skill, route to app-store-optimization
```

### App Store (iOS)

```
Optimize my App Store listing for a [category] app:

- App name (30 chars max): [your app name]
- Subtitle (30 chars max): optimize for [primary keyword]
- Keywords field (100 chars): research and select high-volume, low-competition keywords
- Description: feature-benefit format, first 3 lines above the fold
- Screenshots: 6.7" (iPhone 15 Pro Max), 6 screenshots with feature callouts
- App preview video: 30-second demo of core feature
- Category: primary + secondary for maximum Browse visibility
```

### Play Store (Android)

```
Optimize my Play Store listing for a [category] app:

- Title (50 chars max): [your app name] + primary keyword
- Short description (80 chars): primary value proposition + keyword
- Full description (4000 chars): structured with features, benefits, social proof
- Feature graphic: 1024x500 banner with clear value proposition
- Screenshots: phone + tablet + Chromebook, annotated with feature callouts
- Store listing experiments: A/B test title and screenshots
```

### ASO Tips

1. **Keywords research** — use App Store Connect's suggested keywords and analyze competitor listings
2. **Localization** — translate listings for top 5 markets (US, UK, Germany, Japan, Brazil). Localized listings convert 2-3x better.
3. **Screenshots sell** — first 2 screenshots are above the fold. Put your best, most differentiated feature there.
4. **Ratings drive downloads** — implement in-app review prompts after positive moments (completed task, achievement, successful transaction). Use `StoreKit.requestReview()` (iOS) or `ReviewManager` (Android).
5. **Update frequency** — stores reward apps that update regularly. Ship small, frequent updates over large, infrequent ones.
6. **Custom product pages** (iOS) — create targeted landing pages for different ad campaigns.

---

## Push Notifications

Load the push notification specialist:

```
use mega-mobile skill, route to push-notifications
```

### Firebase Cloud Messaging (FCM) — Cross-Platform

```
Set up push notifications with FCM:
- Configure Firebase project for iOS + Android
- FCM token registration and refresh handling
- Notification channels (Android) with priority levels
- Rich notifications with images and action buttons
- Silent push for background data sync
- Topic-based subscriptions for broadcast messages
- Analytics tracking for notification opens and conversions
```

### Apple Push Notification Service (APNs) — iOS Native

```
Set up APNs for my SwiftUI app:
- APNs key configuration in Apple Developer portal
- UNUserNotificationCenter delegate setup
- Notification categories with custom actions
- Rich notifications with NotificationContentExtension
- Background push for silent data updates
- Provisional authorization (deliver quietly first, ask for full permission later)
```

### Push Notification Best Practices

1. **Ask permission at the right moment** — not on first launch. Wait until the user sees value (completed onboarding, achieved something, used the app 3+ times).
2. **Segment aggressively** — do not send the same notification to everyone. Use behavior, preferences, and engagement level.
3. **Rich notifications** — images and action buttons increase engagement 2-3x over plain text.
4. **Silent push for data sync** — keep the app data fresh without bothering the user.
5. **Respect the user** — provide granular notification preferences in-app (not just on/off).
6. **Measure everything** — track: sent, delivered, opened, action taken, unsubscribed.

---

## Deep Linking

Load the deep linking specialist:

```
use mega-mobile skill, route to deep-linking
```

### Universal Links (iOS) + App Links (Android)

```
Set up deep linking:
- apple-app-site-association (AASA) file for iOS
- assetlinks.json for Android
- URL scheme as fallback for when app is not installed
- Deferred deep linking: redirect to store, then open to correct screen after install
- Navigation integration: deep link URLs map to app screens
- Testing: verify link handling in both platforms
```

### Deep Linking Tips

1. **Set up from day one** — deep links are hard to retrofit and critical for user acquisition from emails, social media, and ads.
2. **Test both installed and not-installed flows** — when the app is installed, the link should open the app to the correct screen. When not installed, it should redirect to the store, then deep link after install (deferred deep linking).
3. **Map URLs to screens** — every screen that can be deep-linked needs a corresponding URL pattern. Document the mapping.
4. **Handle edge cases** — what happens when a deep link targets a screen that requires authentication? Show login first, then navigate to the target.

---

## Mobile Development Workflow

### Phase 1: Plan

```
/plan
Describe your mobile app: target platforms, core features,
navigation structure, data requirements, offline needs.
```

### Phase 2: Scaffold

```
use mega-mobile skill
Scaffold the project with navigation, theming, and project structure.
```

### Phase 3: Core Feature

```
/tdd
Build the core feature with tests first.
```

### Phase 4: Polish

```
/cc mode design
use mega-design skill
Polish the UI: animations, transitions, loading states, empty states,
error states, pull-to-refresh, haptic feedback.
```

### Phase 5: Testing

```
use mobile-testing skill
Set up E2E tests for critical user flows.
```

### Phase 6: Distribution

```
use app-store-optimization skill
Optimize store listings.

use push-notifications skill
Set up push notifications.

use deep-linking skill
Configure universal links and app links.
```

### Phase 7: Verify and Ship

```
/verify
/checkpoint
```

---

## Power Tips

1. **Start with navigation** — the navigation structure is the skeleton of your app. Get it right first. Use file-based routing when available (Expo Router, GoRouter).

2. **Offline-first for mobile** — mobile users lose connectivity regularly. Design for offline from the start, not as an afterthought. Use optimistic updates, local-first data, and background sync.

3. **Platform conventions matter** — iOS users expect swipe-to-go-back, Android users expect the system back button. Use platform-adaptive patterns, not one-size-fits-all.

4. **Performance is UX** — 60fps is the minimum. Use the platform's animation framework (Reanimated, Implicit Animations, Compose animations) instead of JS-driven animations.

5. **Deep links from day one** — set up universal links (iOS) and app links (Android) early. They are hard to retrofit and critical for user acquisition.

6. **Test on real devices** — simulators miss real-world issues: memory pressure, slow networks, battery optimization killing background tasks, camera/GPS behavior.

7. **CI/CD for mobile is different** — use EAS Build (Expo), Codemagic (Flutter), Xcode Cloud (iOS), or GitHub Actions with self-hosted runners for Android.

8. **Small binary size** — users in emerging markets have slow downloads. Tree-shake, compress assets, use app bundles (Android), and app thinning (iOS).

9. **Permissions UX** — request permissions (camera, location, notifications) contextually, not upfront. Show a pre-permission screen explaining why you need it. Users grant permissions 2x more often when they understand the reason.

10. **Analytics from day one** — instrument key events (screen views, feature usage, errors) from the start. Retroactively adding analytics is painful and produces incomplete data.
