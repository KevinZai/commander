---
name: deep-linking
description: "Universal links, Android App Links, deep linking configuration, and deferred deep linking for mobile apps."
version: 1.0.0
category: mobile
parent: mega-mobile
tags: [mega-mobile, deep-linking, universal-links, navigation]
disable-model-invocation: true
---

# Deep Linking

## What This Does

Configures deep linking for mobile applications — enabling URLs to open specific screens in your app. Covers Universal Links (iOS), Android App Links, custom URL schemes, and deferred deep linking (routing users who don't have the app installed yet). Handles the full flow from web-to-app handoff to in-app navigation.

## Instructions

1. **Understand the deep link types.**

   | Type | Platform | Format | Requires Install? | Fallback |
   |------|----------|--------|-------------------|----------|
   | Universal Links | iOS | `https://example.com/path` | Yes | Opens in Safari |
   | App Links | Android | `https://example.com/path` | Yes | Opens in browser |
   | Custom URL Scheme | Both | `myapp://path` | Yes | Error / nothing |
   | Deferred Deep Link | Both | `https://example.com/path` | No | Store -> app -> content |

   **Recommendation:** Always implement Universal Links + App Links first. Add custom URL scheme as a fallback. Use deferred deep links for marketing campaigns.

2. **iOS Universal Links setup.**

   **Step 1: Host the AASA file.**
   ```json
   // https://example.com/.well-known/apple-app-site-association
   {
     "applinks": {
       "apps": [],
       "details": [
         {
           "appIDs": ["TEAM_ID.com.example.app"],
           "components": [
             { "/": "/products/*", "comment": "Product pages" },
             { "/": "/users/*", "comment": "User profiles" },
             { "/": "/invite/*", "comment": "Invite links" }
           ]
         }
       ]
     }
   }
   ```

   Requirements:
   - Served over HTTPS with a valid certificate
   - Content-Type: `application/json`
   - No redirects — Apple fetches from the exact domain
   - File must be at `/.well-known/apple-app-site-association` (no `.json` extension)

   **Step 2: Configure Xcode.**
   - Add Associated Domains capability: `applinks:example.com`
   - Handle incoming links in `SceneDelegate` or SwiftUI `.onOpenURL`

   ```swift
   // SwiftUI
   @main
   struct MyApp: App {
       var body: some Scene {
           WindowGroup {
               ContentView()
                   .onOpenURL { url in
                       DeepLinkRouter.handle(url)
                   }
           }
       }
   }
   ```

3. **Android App Links setup.**

   **Step 1: Host the assetlinks.json file.**
   ```json
   // https://example.com/.well-known/assetlinks.json
   [
     {
       "relation": ["delegate_permission/common.handle_all_urls"],
       "target": {
         "namespace": "android_app",
         "package_name": "com.example.app",
         "sha256_cert_fingerprints": [
           "AA:BB:CC:DD:..."
         ]
       }
     }
   ]
   ```

   **Step 2: Configure AndroidManifest.xml.**
   ```xml
   <activity android:name=".MainActivity">
       <intent-filter android:autoVerify="true">
           <action android:name="android.intent.action.VIEW" />
           <category android:name="android.intent.category.DEFAULT" />
           <category android:name="android.intent.category.BROWSABLE" />
           <data
               android:scheme="https"
               android:host="example.com"
               android:pathPrefix="/products" />
       </intent-filter>
   </activity>
   ```

4. **Build a deep link router.** Handle incoming URLs and navigate to the right screen:
   ```
   URL Pattern -> Screen Mapping:

   /products/{id}     -> ProductDetailScreen(id)
   /users/{username}  -> UserProfileScreen(username)
   /invite/{code}     -> InviteScreen(code)
   /settings          -> SettingsScreen
   /                  -> HomeScreen (fallback)
   ```

   Always handle:
   - Invalid URLs (malformed, missing parameters)
   - Authenticated routes (redirect to login if not authenticated)
   - Expired content (show appropriate message)
   - Unknown paths (graceful fallback to home)

5. **Deferred deep linking.** For users who don't have the app installed:
   ```
   Flow:
   1. User clicks link on web -> landing page detects no app installed
   2. Redirect to App Store / Play Store with the deep link stored
   3. User installs app and opens it
   4. App retrieves the stored deep link and navigates to the content
   ```

   Implementation options:
   - Branch.io — industry standard, handles attribution
   - Firebase Dynamic Links (deprecated, migrate away)
   - Custom: store link in clipboard or use App Store campaign parameters

6. **Testing deep links.**
   ```bash
   # iOS Simulator
   xcrun simctl openurl booted "https://example.com/products/123"

   # Android Emulator
   adb shell am start -a android.intent.action.VIEW \
     -d "https://example.com/products/123" com.example.app

   # Verify Apple AASA
   curl -I https://example.com/.well-known/apple-app-site-association

   # Verify Android assetlinks
   curl https://example.com/.well-known/assetlinks.json

   # Apple CDN validation (check Apple's cached version)
   curl "https://app-site-association.cdn-apple.com/a/v1/example.com"
   ```

## Output Format

```markdown
# Deep Linking Setup: {App Name}

## URL Scheme
- Universal Links / App Links: `https://example.com/{paths}`
- Custom scheme: `myapp://{paths}`

## Route Map
| URL Pattern | Screen | Auth Required? |
|-------------|--------|---------------|
| {pattern} | {screen} | {yes/no} |

## Configuration Files
### apple-app-site-association
{JSON content}

### assetlinks.json
{JSON content}

## Testing Commands
{platform-specific test commands}
```

## Tips

- Always test Universal Links by typing the URL in Notes app and long-pressing — Safari direct navigation does not trigger Universal Links
- Apple caches the AASA file — changes can take 24-48 hours to propagate (check the CDN URL above)
- Android `autoVerify="true"` requires the assetlinks.json to be accessible at install time
- Custom URL schemes (`myapp://`) should be a fallback only — they don't work from web browsers on iOS
- Include UTM parameters in deep links for attribution tracking
- Handle the case where deep link content has been deleted or is no longer available
- Log all deep link arrivals for debugging — silent failures are common and hard to diagnose
