---
name: swiftui
description: "SwiftUI development — MVVM architecture, iOS features, Combine/async-await, and Apple platform best practices."
version: 1.0.0
category: mobile
parent: ccc-mobile
tags: [ccc-mobile, swiftui, ios, apple]
disable-model-invocation: true
---

# SwiftUI

## What This Does

Provides expert guidance for building native iOS/macOS applications with SwiftUI — from view composition and MVVM architecture to Combine reactivity, async/await data loading, and Apple platform integrations (HealthKit, CloudKit, StoreKit, etc.).

## Instructions

1. **Assess the project.** Determine:
   - Minimum iOS/macOS version target (affects available APIs)
   - New project or migrating from UIKit?
   - App architecture: MVVM, TCA (The Composable Architecture), or MV?
   - Data persistence: SwiftData, Core Data, or Realm?
   - Networking: URLSession, Alamofire, or custom?

2. **Project architecture (MVVM):**
   ```swift
   // View — declarative UI, no business logic
   struct TodoListView: View {
       @StateObject private var viewModel = TodoListViewModel()

       var body: some View {
           NavigationStack {
               List(viewModel.todos) { todo in
                   TodoRowView(todo: todo)
               }
               .navigationTitle("Todos")
               .task {
                   await viewModel.loadTodos()
               }
               .refreshable {
                   await viewModel.loadTodos()
               }
           }
       }
   }

   // ViewModel — business logic, state management
   @MainActor
   final class TodoListViewModel: ObservableObject {
       @Published private(set) var todos: [Todo] = []
       @Published private(set) var isLoading = false
       @Published var error: AppError?

       private let repository: TodoRepository

       init(repository: TodoRepository = .live) {
           self.repository = repository
       }

       func loadTodos() async {
           isLoading = true
           defer { isLoading = false }
           do {
               todos = try await repository.fetchAll()
           } catch {
               self.error = AppError(error)
           }
       }
   }

   // Model — plain data types
   struct Todo: Identifiable, Codable {
       let id: UUID
       var title: String
       var isCompleted: Bool
   }
   ```

3. **SwiftUI view patterns:**
   - Use `@State` for local view state
   - Use `@StateObject` for owned ViewModels (created by the view)
   - Use `@ObservedObject` for injected ViewModels (passed in)
   - Use `@EnvironmentObject` for shared app-wide state
   - Use `@Environment` for system values (colorScheme, dismiss, etc.)
   - Prefer `@Observable` (iOS 17+) over `ObservableObject` when available

4. **Navigation (iOS 16+):**
   ```swift
   // NavigationStack with type-safe paths
   @State private var path = NavigationPath()

   NavigationStack(path: $path) {
       List(items) { item in
           NavigationLink(value: item) {
               ItemRow(item: item)
           }
       }
       .navigationDestination(for: Item.self) { item in
           ItemDetailView(item: item)
       }
   }
   ```

5. **Data persistence with SwiftData (iOS 17+):**
   ```swift
   @Model
   final class Todo {
       var title: String
       var isCompleted: Bool
       var createdAt: Date

       init(title: String, isCompleted: Bool = false) {
           self.title = title
           self.isCompleted = isCompleted
           self.createdAt = .now
       }
   }

   // In view
   @Query(sort: \Todo.createdAt, order: .reverse)
   private var todos: [Todo]
   ```

6. **Async/await patterns:**
   ```swift
   // Structured concurrency
   func loadData() async {
       async let profile = api.fetchProfile()
       async let settings = api.fetchSettings()

       do {
           let (p, s) = try await (profile, settings)
           self.profile = p
           self.settings = s
       } catch {
           self.error = AppError(error)
       }
   }
   ```

7. **Performance:**
   - Use `@ViewBuilder` for conditional views instead of AnyView
   - Prefer `LazyVStack`/`LazyHStack` over `VStack`/`HStack` for large lists
   - Use `EquatableView` or manual Equatable conformance to skip unnecessary redraws
   - Profile with Instruments (SwiftUI template) to find excessive body evaluations
   - Extract subviews to isolate state changes and minimize re-renders

## Output Format

When generating SwiftUI code:
- Swift 5.9+ syntax
- Strict concurrency checking enabled
- @MainActor on ViewModels
- Prefer value types (struct) over reference types (class) where possible
- Include necessary imports
- Follow Apple's Human Interface Guidelines

## Tips

- Use `#Preview` macro (Xcode 15+) for live previews instead of `PreviewProvider`
- SwiftData replaces Core Data for most use cases — prefer it on iOS 17+
- @Observable macro (iOS 17+) is simpler than ObservableObject — use it when you can
- Use `.task {}` modifier for async work instead of `.onAppear` with Task {}
- Keep views small — extract into sub-views when body exceeds 30 lines
- Use SF Symbols for icons — they scale and adapt to accessibility settings automatically
- Test with VoiceOver enabled — SwiftUI has good accessibility defaults but they need verification
