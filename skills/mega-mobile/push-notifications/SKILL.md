---
name: push-notifications
description: "Push notification setup and best practices — FCM, APNs, OneSignal, rich notifications, and engagement optimization."
version: 1.0.0
category: mobile
parent: mega-mobile
tags: [mega-mobile, push-notifications, fcm, apns]
disable-model-invocation: true
---

# Push Notifications

## What This Does

Sets up push notification infrastructure for mobile applications — covering Firebase Cloud Messaging (FCM), Apple Push Notification service (APNs), and third-party providers like OneSignal. Includes rich notifications, notification channels, user segmentation, and engagement best practices.

## Instructions

1. **Choose your notification provider.**

   | Provider | Best For | Cost |
   |----------|----------|------|
   | FCM (Firebase) | Android-first, direct Google integration | Free |
   | APNs (direct) | iOS-only apps, maximum control | Free |
   | OneSignal | Cross-platform, no backend needed | Free tier, paid for scale |
   | Expo Notifications | Expo React Native apps | Free with Expo |
   | Amazon SNS | AWS-native infrastructure | Pay per message |

2. **Platform setup.**

   **iOS (APNs):**
   - Enable Push Notifications capability in Xcode
   - Generate APNs key (p8 file) in Apple Developer portal
   - Configure key ID, team ID, and bundle ID in your backend/provider
   - Request notification permission at an appropriate moment (not on first launch)

   **Android (FCM):**
   - Add `google-services.json` to the Android project
   - Create notification channels (Android 8+) for different notification types
   - Handle both foreground and background message reception
   - Configure default notification icon and color

3. **Permission handling (critical for iOS):**
   ```
   // NEVER request permission on first launch
   // DO request after the user has experienced value from the app

   Strategy:
   1. User completes a key action (first purchase, first save, etc.)
   2. Show a pre-permission screen explaining WHY notifications help
   3. If user agrees, show the system permission dialog
   4. If denied, gracefully handle — don't nag
   ```

   Timing matters: apps that request permission after demonstrating value see 2-3x higher opt-in rates than apps that ask on first launch.

4. **Notification payload structure:**
   ```json
   {
     "notification": {
       "title": "Your order is ready!",
       "body": "Pick up your coffee at the counter.",
       "image": "https://example.com/coffee.jpg"
     },
     "data": {
       "type": "order_ready",
       "orderId": "abc-123",
       "deepLink": "myapp://orders/abc-123"
     },
     "android": {
       "notification": {
         "channel_id": "orders",
         "priority": "high",
         "click_action": "OPEN_ORDER"
       }
     },
     "apns": {
       "payload": {
         "aps": {
           "category": "ORDER_ACTIONS",
           "mutable-content": 1,
           "sound": "default"
         }
       }
     }
   }
   ```

5. **Rich notifications.** Go beyond plain text:
   - **Images:** Attach product images, maps, or previews
   - **Action buttons:** "Accept" / "Decline," "Reply," "Mark as Read"
   - **Interactive:** Live Activities (iOS), ongoing notifications (Android)
   - **Grouped:** Thread notifications by conversation or category

6. **Notification channels (Android 8+):**
   ```kotlin
   // Create channels at app startup
   val channels = listOf(
       NotificationChannel("orders", "Orders", NotificationManager.IMPORTANCE_HIGH),
       NotificationChannel("promotions", "Promotions", NotificationManager.IMPORTANCE_DEFAULT),
       NotificationChannel("social", "Social", NotificationManager.IMPORTANCE_LOW),
   )

   channels.forEach { channel ->
       notificationManager.createNotificationChannel(channel)
   }
   ```

   Users can independently mute channels — respect this by categorizing notifications properly.

7. **Backend integration.** Send notifications from your server:
   - Store device tokens securely (encrypt at rest)
   - Handle token refresh (tokens change periodically)
   - Implement retry logic for failed deliveries
   - Track delivery status (sent, delivered, opened)
   - Clean up invalid tokens (FCM returns canonical IDs, APNs returns errors)

8. **Engagement best practices:**
   - Personalize: use the user's name and relevant context
   - Timing: send during the user's active hours (track timezone)
   - Frequency: 2-5 per week max for most apps — more causes uninstalls
   - Value: every notification should provide clear value to the user
   - Segmentation: different messages for different user cohorts
   - A/B test: try different copy, timing, and CTAs

## Output Format

```markdown
# Push Notification Setup: {App Name}

## Provider: {FCM / APNs / OneSignal / etc.}

## Platform Configuration
### iOS
- APNs Key: {setup steps}
- Permission flow: {when and how to request}

### Android
- FCM Config: {setup steps}
- Channels: {list of channels and importance levels}

## Notification Types
| Type | Channel | Priority | Content |
|------|---------|----------|---------|
| {type} | {channel} | {H/M/L} | {description} |

## Backend Integration
{API endpoints or service configuration for sending notifications}

## Engagement Rules
{Frequency caps, timing windows, segmentation strategy}
```

## Tips

- Always include a deep link in the notification data payload — don't just open the app home screen
- iOS: use Notification Service Extension for image attachments and end-to-end encryption
- Android: use `priority: high` for time-sensitive notifications, `priority: normal` for everything else
- Test notifications on real devices — simulators have limited notification support
- Track opt-in rates, open rates, and uninstall rates correlated with notification frequency
- Implement notification preferences in your app — let users choose what they receive
- Silent/background notifications are powerful for data sync but drain battery — use sparingly
