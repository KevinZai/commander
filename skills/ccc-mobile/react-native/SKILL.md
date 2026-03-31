---
name: react-native
description: "React Native development patterns — navigation, native modules, Expo, state management, and cross-platform best practices."
version: 1.0.0
category: mobile
parent: ccc-mobile
tags: [ccc-mobile, react-native, mobile, cross-platform]
disable-model-invocation: true
---

# React Native

## What This Does

Provides expert guidance for building React Native applications — from project setup and navigation to native module integration and performance optimization. Covers both Expo-managed and bare workflows, with patterns for state management, styling, and platform-specific code.

## Instructions

1. **Assess the project.** Determine:
   - New project or existing? If existing, Expo or bare workflow?
   - Target platforms: iOS only, Android only, or both?
   - React Native version and Expo SDK version
   - State management: React Context, Zustand, Redux Toolkit, or Jotai?
   - Navigation: React Navigation, Expo Router, or other?

2. **Project setup.** For new projects:
   ```bash
   # Expo (recommended for most projects)
   npx create-expo-app@latest my-app --template tabs

   # Bare React Native (when you need full native control)
   npx @react-native-community/cli init MyApp
   ```

3. **Follow React Native patterns:**
   - **Navigation:** Use Expo Router (file-based) or React Navigation v7
   - **State management:** Zustand for simplicity, Redux Toolkit for complex state
   - **Styling:** StyleSheet.create for performance, NativeWind for Tailwind syntax
   - **Data fetching:** TanStack Query (React Query) for server state
   - **Forms:** React Hook Form with Zod validation
   - **Storage:** expo-secure-store for secrets, MMKV for general key-value

4. **Navigation architecture:**
   ```typescript
   // Expo Router (file-based routing)
   // app/(tabs)/index.tsx -> Tab 1
   // app/(tabs)/profile.tsx -> Tab 2
   // app/[id].tsx -> Dynamic route
   // app/_layout.tsx -> Root layout with navigation container

   // React Navigation v7
   // Stack, Tab, and Drawer navigators
   // Type-safe navigation with TypeScript
   ```

5. **Platform-specific code:**
   ```typescript
   // Platform.select for simple differences
   const styles = StyleSheet.create({
     container: {
       padding: Platform.select({ ios: 20, android: 16 }),
     },
   });

   // .ios.tsx / .android.tsx for larger differences
   // Button.ios.tsx and Button.android.tsx
   ```

6. **Performance optimization:**
   - Use FlatList/FlashList for long lists (never ScrollView for dynamic lists)
   - Memoize expensive computations with useMemo
   - Use React.memo for pure components in lists
   - Enable Hermes engine (default in modern RN)
   - Profile with React DevTools and Flipper
   - Avoid inline styles and anonymous functions in render

7. **Native modules.** When you need native functionality:
   - Check Expo modules first (expo-camera, expo-location, etc.)
   - Use Expo Modules API for custom native code in Expo
   - Use TurboModules for bare React Native
   - Bridge only what you need — minimize native surface area

## Output Format

When generating React Native code:
- TypeScript strict mode
- Functional components only
- ESM imports
- StyleSheet.create at the bottom of the file
- Platform-specific code clearly marked
- Include necessary imports for all React Native components used

## Tips

- Start with Expo unless you have a specific reason not to — it handles 90% of use cases
- Use Expo EAS Build for CI/CD instead of managing Xcode/Gradle yourself
- FlashList from Shopify is significantly faster than FlatList for large lists
- Test on real devices early — simulators hide performance issues
- Use expo-dev-client for a custom development build with native modules
- Keep native dependencies minimal — each one is a maintenance burden
- Use react-native-reanimated for performant animations on the UI thread
