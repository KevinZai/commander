---
name: jetpack-compose
description: "Jetpack Compose for Android — Material Design 3, composable architecture, state management, and Android-specific best practices."
version: 1.0.0
category: mobile
parent: mega-mobile
tags: [mega-mobile, jetpack-compose, android, kotlin]
disable-model-invocation: true
---

# Jetpack Compose

## What This Does

Provides expert guidance for building native Android applications with Jetpack Compose — from composable design and Material Design 3 theming to state management, navigation, and Android platform integrations. Covers modern Android architecture with Kotlin, coroutines, and the Jetpack library suite.

## Instructions

1. **Assess the project.** Determine:
   - Minimum SDK version (affects available Compose APIs)
   - New project or migrating from XML Views?
   - Architecture: MVVM with ViewModel, MVI, or Compose-specific?
   - DI framework: Hilt (recommended), Koin, or manual?
   - Networking: Retrofit + OkHttp, Ktor, or other?

2. **Project architecture (MVVM + Compose):**
   ```kotlin
   // Screen composable — UI layer
   @Composable
   fun TodoListScreen(
       viewModel: TodoListViewModel = hiltViewModel()
   ) {
       val uiState by viewModel.uiState.collectAsStateWithLifecycle()

       TodoListContent(
           todos = uiState.todos,
           isLoading = uiState.isLoading,
           onToggleTodo = viewModel::toggleTodo,
           onDeleteTodo = viewModel::deleteTodo,
       )
   }

   // Content composable — pure UI, easily previewable
   @Composable
   private fun TodoListContent(
       todos: List<Todo>,
       isLoading: Boolean,
       onToggleTodo: (Todo) -> Unit,
       onDeleteTodo: (Todo) -> Unit,
   ) {
       Scaffold(
           topBar = { TopAppBar(title = { Text("Todos") }) }
       ) { padding ->
           if (isLoading) {
               CircularProgressIndicator(modifier = Modifier.padding(padding))
           } else {
               LazyColumn(contentPadding = padding) {
                   items(todos, key = { it.id }) { todo ->
                       TodoItem(
                           todo = todo,
                           onToggle = { onToggleTodo(todo) },
                           onDelete = { onDeleteTodo(todo) },
                       )
                   }
               }
           }
       }
   }

   // ViewModel — business logic
   @HiltViewModel
   class TodoListViewModel @Inject constructor(
       private val repository: TodoRepository
   ) : ViewModel() {

       private val _uiState = MutableStateFlow(TodoListUiState())
       val uiState: StateFlow<TodoListUiState> = _uiState.asStateFlow()

       init { loadTodos() }

       private fun loadTodos() {
           viewModelScope.launch {
               _uiState.update { it.copy(isLoading = true) }
               repository.getTodos()
                   .onSuccess { todos ->
                       _uiState.update { it.copy(todos = todos, isLoading = false) }
                   }
                   .onFailure { error ->
                       _uiState.update { it.copy(error = error.message, isLoading = false) }
                   }
           }
       }
   }

   // UI State — immutable data class
   data class TodoListUiState(
       val todos: List<Todo> = emptyList(),
       val isLoading: Boolean = false,
       val error: String? = null,
   )
   ```

3. **Material Design 3 theming:**
   ```kotlin
   @Composable
   fun AppTheme(
       darkTheme: Boolean = isSystemInDarkTheme(),
       dynamicColor: Boolean = true,
       content: @Composable () -> Unit
   ) {
       val colorScheme = when {
           dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
               val context = LocalContext.current
               if (darkTheme) dynamicDarkColorScheme(context)
               else dynamicLightColorScheme(context)
           }
           darkTheme -> darkColorScheme()
           else -> lightColorScheme()
       }

       MaterialTheme(
           colorScheme = colorScheme,
           typography = AppTypography,
           content = content
       )
   }
   ```

4. **Navigation with Compose Navigation:**
   ```kotlin
   // Type-safe navigation (Compose Navigation 2.8+)
   @Serializable data object Home
   @Serializable data class Detail(val id: String)

   NavHost(navController, startDestination = Home) {
       composable<Home> {
           HomeScreen(onItemClick = { id ->
               navController.navigate(Detail(id))
           })
       }
       composable<Detail> { backStackEntry ->
           val detail: Detail = backStackEntry.toRoute()
           DetailScreen(itemId = detail.id)
       }
   }
   ```

5. **State management patterns:**
   - Use `StateFlow` + `collectAsStateWithLifecycle()` for ViewModel state
   - Use `remember` and `rememberSaveable` for local composable state
   - Hoist state to the lowest common ancestor
   - Use UiState data classes for screen-level state
   - Use `derivedStateOf` for computed values

6. **Performance optimization:**
   - Use `key` parameter in `LazyColumn` items for stable recomposition
   - Use `remember` for expensive computations
   - Avoid allocations in composition (no object creation in composable body)
   - Use `@Stable` and `@Immutable` annotations for data classes
   - Profile with Layout Inspector and Compose compiler metrics
   - Defer reads with `derivedStateOf` and lambda-based modifiers

## Output Format

When generating Compose code:
- Kotlin with explicit types on public APIs
- Compose UI with Material 3 components
- Hilt for dependency injection
- Coroutines for async work
- Include necessary imports
- Follow Android Kotlin style guide

## Tips

- Always separate Screen composables (with ViewModel) from Content composables (pure UI, previewable)
- Use `@Preview` with multiple configurations (dark theme, large font, different screen sizes)
- `collectAsStateWithLifecycle()` is lifecycle-aware — always prefer it over `collectAsState()`
- Use Compose BOM to keep all Compose library versions aligned
- Test composables with `createComposeRule()` from compose-ui-test
- Enable strong skipping mode in the Compose compiler for better performance
- Use Coil for image loading in Compose — it has native Compose support
