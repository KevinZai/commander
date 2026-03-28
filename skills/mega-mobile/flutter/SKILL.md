---
name: flutter
description: "Flutter/Dart development — widget architecture, state management, platform channels, and cross-platform best practices."
version: 1.0.0
category: mobile
parent: mega-mobile
tags: [mega-mobile, flutter, dart, cross-platform]
disable-model-invocation: true
---

# Flutter

## What This Does

Provides expert guidance for building Flutter applications — from widget composition and state management to platform channels and performance optimization. Covers mobile (iOS/Android), web, and desktop targets with Dart best practices.

## Instructions

1. **Assess the project.** Determine:
   - New project or existing?
   - Flutter SDK version and Dart version
   - Target platforms: mobile, web, desktop, or all?
   - State management: Riverpod, Bloc, Provider, or GetX?
   - Navigation: GoRouter, auto_route, or Navigator 2.0?

2. **Project setup.** For new projects:
   ```bash
   flutter create --org com.example --platforms ios,android my_app

   # With specific template
   flutter create --template app --org com.example my_app
   ```

3. **Follow Flutter architecture patterns:**
   - **State management:** Riverpod 2.0 (recommended) or Bloc for enterprise
   - **Navigation:** GoRouter for declarative, type-safe routing
   - **Architecture:** Feature-first folder structure with clean architecture layers
   - **DI:** Riverpod providers or get_it for dependency injection
   - **Networking:** dio + retrofit for API calls, freezed for data classes
   - **Storage:** shared_preferences for simple, Hive/Isar for complex local data

4. **Widget architecture:**
   ```dart
   // Prefer composition over inheritance
   // Small, focused widgets that compose into screens

   // Stateless for pure UI
   class UserAvatar extends StatelessWidget {
     final String imageUrl;
     final double size;
     const UserAvatar({required this.imageUrl, this.size = 40});

     @override
     Widget build(BuildContext context) {
       return ClipOval(
         child: CachedNetworkImage(
           imageUrl: imageUrl,
           width: size,
           height: size,
           fit: BoxFit.cover,
         ),
       );
     }
   }

   // ConsumerWidget for Riverpod state
   class UserProfile extends ConsumerWidget {
     @override
     Widget build(BuildContext context, WidgetRef ref) {
       final user = ref.watch(userProvider);
       return user.when(
         data: (data) => UserProfileView(user: data),
         loading: () => const CircularProgressIndicator(),
         error: (err, stack) => ErrorWidget(error: err),
       );
     }
   }
   ```

5. **State management with Riverpod:**
   ```dart
   // Async data provider
   @riverpod
   Future<List<Todo>> todos(Ref ref) async {
     final repository = ref.watch(todoRepositoryProvider);
     return repository.fetchAll();
   }

   // Notifier for mutable state
   @riverpod
   class TodoList extends _$TodoList {
     @override
     Future<List<Todo>> build() => ref.watch(todoRepositoryProvider).fetchAll();

     Future<void> addTodo(Todo todo) async {
       state = const AsyncLoading();
       state = await AsyncValue.guard(() async {
         await ref.read(todoRepositoryProvider).create(todo);
         return ref.read(todoRepositoryProvider).fetchAll();
       });
     }
   }
   ```

6. **Performance optimization:**
   - Use `const` constructors wherever possible
   - Avoid rebuilding large widget trees — use `Consumer` widgets to scope rebuilds
   - Use `ListView.builder` for long lists (never `Column` with `SingleChildScrollView`)
   - Profile with Flutter DevTools — look for jank in the timeline
   - Use `RepaintBoundary` to isolate expensive paint operations
   - Enable impeller rendering engine for smoother animations

7. **Platform channels.** For native functionality:
   ```dart
   // Method channel for platform-specific code
   static const platform = MethodChannel('com.example/native');

   Future<String> getNativeValue() async {
     try {
       return await platform.invokeMethod('getValue');
     } on PlatformException catch (e) {
       return 'Failed: ${e.message}';
     }
   }
   ```

## Output Format

When generating Flutter code:
- Dart with null safety
- Prefer `const` constructors
- Use named parameters for widgets
- Follow effective Dart style guide
- Include necessary imports
- Use code generation annotations where applicable (freezed, riverpod_generator)

## Tips

- Use `flutter analyze` and `dart fix --apply` before committing
- Riverpod with code generation (@riverpod annotation) is cleaner than manual providers
- freezed package eliminates boilerplate for immutable data classes
- Use `flutter_screenutil` or `MediaQuery` for responsive layouts, not hardcoded sizes
- Test on both iOS and Android regularly — rendering differences exist
- Use `golden_toolkit` for widget snapshot testing
- Keep widget build methods under 80 lines — extract sub-widgets aggressively
