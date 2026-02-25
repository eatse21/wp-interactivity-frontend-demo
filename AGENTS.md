# Interactivity API Reference

## Directives (HTML attributes with `data-wp-*` prefix)

| Directive | Purpose | Example |
|-----------|---------|---------|
| `data-wp-interactive` | Activates interactivity zone (required!) | `data-wp-interactive="myNamespace"` |
| `data-wp-context` | Local state for element + children | `data-wp-context='{ "count": 0 }'` |
| `data-wp-text` | Set element's text content | `data-wp-text="context.count"` |
| `data-wp-bind--attr` | Bind attribute value | `data-wp-bind--hidden="!context.isOpen"` |
| `data-wp-class--name` | Toggle class | `data-wp-class--active="context.isActive"` |
| `data-wp-style--prop` | Set inline style | `data-wp-style--color="context.color"` |
| `data-wp-on--event` | Event handler | `data-wp-on--click="actions.toggle"` |
| `data-wp-on-window--event` | Global window event | `data-wp-on-window--resize="callbacks.handleResize"` |
| `data-wp-on-document--event` | Document event | `data-wp-on-document--click="actions.closeOnOutsideClick"` |
| `data-wp-watch` | Run on create + state changes | `data-wp-watch="callbacks.logState"` |
| `data-wp-init` | Run once on create | `data-wp-init="callbacks.setup"` |
| `data-wp-run` | Run with hooks support | `data-wp-run="callbacks.withHooks"` |
| `data-wp-each` | Render list from array | `<template data-wp-each="context.items">` |
| `data-wp-each-key` | Key for wp-each items (**on `<template>` only**) | `<template data-wp-each="context.items" data-wp-each-key="context.item.id">` |
| `data-wp-each-child` | SSR list hydration marker | Auto-added by server rendering |
| `data-wp-key` | Unique key for elements (**not inside wp-each**) | `data-wp-key="unique-id"` |
| `data-wp-router-region` | Define navigation region | `data-wp-router-region="main-content"` |

> ⚠️ **WARNING:** There is NO `data-wp-on-async` directive! All `data-wp-on--*`, `data-wp-on-window--*`, and `data-wp-on-document--*` directives **run asynchronously by default**. If you need synchronous access to the event object (e.g., `event.currentTarget`, `event.preventDefault()`, `event.stopPropagation()`, `event.stopImmediatePropagation()`), wrap your action with `withSyncEvent()`.

## Store (JavaScript/TypeScript)

```typescript
import {
  store,
  getContext,
  getElement,
  withSyncEvent,
  splitTask,
  getConfig,        // Static config from server (non-reactive)
  getServerState,   // Server state sync during navigation
  getServerContext, // Server context sync during navigation
  withScope,        // Scope wrapper for external callbacks
  watch,            // Programmatic reactive watcher
} from '@wordpress/interactivity';

interface MyContext {
  isOpen: boolean;
  count: number;
}

const { state } = store( 'myNamespace', {
  state: {
    maxCount: 10,
    get isOverMax() {
      const context = getContext<MyContext>();
      return context.count > state.maxCount;
    },
  },
  actions: {
    // Triggered by data-wp-on--*
    toggle: () => {
      const context = getContext<MyContext>();
      context.isOpen = !context.isOpen;
    },
  },
  callbacks: {
    // Triggered by data-wp-watch, data-wp-init
    logState: () => {
      console.log( 'isOpen:', getContext<MyContext>().isOpen );
    },
  },
} );
```

### Store Utility Functions

**`getContext<T>()`** - Access local context for current element:
```typescript
const context = getContext<MyContext>();
context.count++; // Reactive update
```

**`getElement()`** - Access DOM element and attributes:
```typescript
const { ref, attributes } = getElement();
if (ref) ref.focus();
```

**`withSyncEvent()`** - Required for synchronous event access:
```typescript
// Required for: event.currentTarget, event.preventDefault(),
// event.stopImmediatePropagation(), event.stopPropagation()
handleSubmit: withSyncEvent((event: SubmitEvent) => {
  event.preventDefault();
}),
```

**`splitTask()`** - Yield UI updates in async generators:
```typescript
*fetchData() {
  context.loading = true;
  yield splitTask(); // Let loading spinner render first
  const data = yield fetch('/api/data').then(r => r.json());
  context.data = data;
  context.loading = false;
},
```

**`getConfig()`** - Access static config from server (non-reactive):
```typescript
// Server: wp_interactivity_config( 'myPlugin', array( 'restApiUrl' => '...', 'nonce' => '...' ) );
const { restApiUrl, nonce } = getConfig();
```

**`withScope()`** - Required for external callbacks (setInterval, etc.):
```typescript
callbacks: {
  initSlideshow: () => {
    setInterval(
      withScope( () => actions.nextImage() ), // Ensures getContext() works
      3000
    );
  },
}
```

**`watch()`** - Programmatic reactive watcher:
```typescript
const unwatch = watch( () => {
  console.log( 'Counter is ' + state.counter );
} );
// Call unwatch() to stop watching
```

**`getServerState()` / `getServerContext()`** - Sync with server after navigation:
```typescript
// Use in data-wp-watch callback after client-side navigation
callbacks: {
  syncFromServer() {
    const serverState = getServerState();
    const serverContext = getServerContext();
    // Update local state with server values if needed
    if ( serverState.newValue !== state.localValue ) {
      state.localValue = serverState.newValue;
    }
  },
}
```

### Context vs State

- **Context** (`data-wp-context`): Local state, scoped to element + children
- **State** (`store.state`): Global state, shared across all elements in namespace

### Config (Non-Reactive Static Data)

Use `getConfig()` for static data that doesn't trigger UI updates:

- API endpoints, nonces, feature flags, translations
- Set on server with `wp_interactivity_config( 'namespace', array(...) )`
- Accessed on client with `const { key } = getConfig();`

Unlike state/context, config values are read-only and don't cause re-renders.

### Server-Side State Initialization

```html
<script type="application/json" id="wp-script-module-data-@wordpress/interactivity">
  {"state":{"myNamespace":{"theme":"dark","userId":123}}}
</script>
```

---

## Common Patterns

### Toggle Visibility

```html
<div data-wp-interactive="toggle" data-wp-context='{ "isOpen": false }'>
  <button data-wp-on--click="actions.toggle">Toggle</button>
  <div data-wp-bind--hidden="!context.isOpen">Content</div>
</div>
```

```typescript
store( 'toggle', {
  actions: {
    toggle: () => { getContext().isOpen = !getContext().isOpen; },
  },
} );
```

### List Rendering

```html
<ul data-wp-interactive="list" data-wp-context='{ "items": ["a", "b", "c"] }'>
  <template data-wp-each="context.items">
    <li data-wp-text="context.item"></li>
  </template>
</ul>
```

Customize the item property name with a suffix: `data-wp-each--greeting="context.list"` uses `context.greeting`. For object lists, add `data-wp-each-key` on the `<template>` tag for efficient updates:

```html
<template data-wp-each--item="context.todos" data-wp-each-key="context.item.id">
  <li data-wp-text="context.item.text"></li>
</template>
```

> **`data-wp-key` vs `data-wp-each-key`**: Use `data-wp-each-key` on `<template>` for `wp-each` lists. `data-wp-key` is a rare edge case for non-`wp-each` sibling elements that get dynamically reordered (not from an array loop). Most projects never need `data-wp-key`.

### Form Input Binding

```html
<div data-wp-interactive="form" data-wp-context='{ "value": "" }'>
  <input data-wp-bind--value="context.value" data-wp-on--input="actions.updateValue">
  <p data-wp-text="context.value"></p>
</div>
```

```typescript
updateValue: (event) => { getContext().value = event.target.value; },
```

### Async Actions

Use generators (not async/await) for async operations:

```typescript
*fetchData() {
  const context = getContext();
  context.loading = true;
  yield splitTask(); // Optional: let UI update before heavy work
  const data = yield fetch('/api/data').then(r => r.json());
  context.data = data;
  context.loading = false;
},
```

### Cross-Namespace Access

```html
<span data-wp-text="pluginB::state.sharedValue"></span>
```

### Global Event Handlers

```html
<div data-wp-interactive="modal" data-wp-context='{ "isOpen": false }'
  data-wp-on-document--click="actions.closeOnOutsideClick"
  data-wp-on-window--keydown="callbacks.handleEscape">
  <button data-wp-on--click="actions.open">Open</button>
  <div data-wp-bind--hidden="!context.isOpen">Modal content</div>
</div>
```

```typescript
store( 'modal', {
  actions: {
    open: () => { getContext().isOpen = true; },
    closeOnOutsideClick: (event) => {
      const { ref } = getElement();
      if (ref && !ref.contains(event.target)) getContext().isOpen = false;
    },
  },
  callbacks: {
    handleEscape: (event) => {
      if (event.key === 'Escape') getContext().isOpen = false;
    },
  },
} );
```

### Client-Side Navigation (Interactivity Router)

Dynamic import required - reduces initial bundle size:

```typescript
import { store, withSyncEvent } from '@wordpress/interactivity';

store( 'myblock', {
  actions: {
    navigateTo: withSyncEvent( function* ( event ) {
      event.preventDefault();
      const { actions } = yield import( '@wordpress/interactivity-router' );
      yield actions.navigate( event.target.href );
    } ),
  },
} );
```

Define updatable regions with `data-wp-router-region`:
```html
<div data-wp-interactive="myblock" data-wp-router-region="main-content">
  <!-- Content replaced on navigation -->
</div>
```

### Focus Management

Use `data-wp-watch` to focus elements reactively:

```typescript
focusWhenVisible: () => {
  const { ref } = getElement();
  const step = getContext().currentStep; // Read to establish dependency
  if (step && ref) ref.querySelector('input:not([hidden])')?.focus();
}
```

```html
<div data-wp-interactive="wizard" data-wp-watch="callbacks.focusWhenVisible">
```

---

## Pitfalls

### Critical: Directive Values Are Property References Only

Directive values MUST be simple property references. **No function calls, no arguments, no expressions.**

**Exception**: Only the negation operator (`!`) is allowed. All other operators (`>`, `<`, `===`, `+`, `&&`, etc.) are forbidden.

| ❌ Wrong | Why |
|----------|-----|
| `data-wp-on--click="actions.setTab('tab1')"` | Function call with argument |
| `data-wp-bind--hidden="context.count > 5"` | Comparison expression |
| `data-wp-class--active="context.activeTab === 'tab1'"` | Expression |

**Solution**: Use **local context** to identify elements + **derived getters** for computed values:

```html
<button data-wp-context='{ "tabId": "tab1" }'
  data-wp-class--active="state.isTabActive"
  data-wp-on--click="actions.setTab">Tab 1</button>
```

```typescript
store( 'tabs', {
  state: {
    get isTabActive(): boolean {
      const ctx = getContext<TabsContext>();
      return ctx.activeTab === ctx.tabId; // tabId from local context
    },
  },
  actions: {
    setTab: () => {
      const ctx = getContext<TabsContext>();
      if (ctx.tabId) ctx.activeTab = ctx.tabId;
    },
  },
} );
```

### HTML Mistakes

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `data-wp-class--isActive` | `data-wp-class--is-active` |
| Missing `data-wp-interactive` | Add `data-wp-interactive="namespace"` |
| `data-wp-context='{ "key": 'value' }'` | `data-wp-context='{ "key": "value" }'` |
| `data-wp-key` inside `wp-each` template | Use `data-wp-each-key` on `<template>` tag |
| Missing key for object lists | Add `data-wp-each-key="context.item.id"` on `<template>` |

### JavaScript/TypeScript Mistakes

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `async fetchData() { await fetch(...) }` | `*fetchData() { yield fetch(...) }` |
| Using `event.preventDefault()` directly | Wrap with `withSyncEvent(() => {...})` |
| Not reading value in callback | Read value to establish reactive dependency |
| `isTabActive() { return ... }` | `get isTabActive() { return ... }` |

### Array Mutation is OK

Unlike React, `@wordpress/interactivity` uses Preact signals under the hood. **Direct array mutation is fine** - the framework tracks mutations automatically:

```typescript
// ✅ All of these work correctly
context.todos.push( newItem );
context.todos.splice( index, 1 );
context.items.forEach( item => item.selected = true );
```

### TypeScript Interface Mistakes

Include auto-provided properties for `wp-each` and local context:

```typescript
// ✅ Correct - include optional item for wp-each
interface TodoContext {
  todos: TodoItem[];
  item?: TodoItem;    // Auto-provided by wp-each
  // NOTE: index is NOT provided by wp-each - use findIndex if needed
}

// ✅ Correct - include local context properties
interface TabsContext {
  activeTab: string;
  tabId?: string;     // From data-wp-context='{ "tabId": "..." }'
  panelId?: string;   // From data-wp-context='{ "panelId": "..." }'
}
```

### Quick Gotchas

1. **`data-wp-interactive` is required** - Directives won't work without it
2. **Context is JSON** - Must be valid JSON in HTML
3. **Use kebab-case for class names** - `data-wp-class--is-active`
4. **Async uses generators** - Not `async/await`
5. **`withSyncEvent()` for preventDefault and others** - Required for sync event access

---

## Official Documentation

- [Interactivity API Overview](https://developer.wordpress.org/block-editor/reference-guides/interactivity-api/)
- [Directives and Store (API Reference)](https://developer.wordpress.org/block-editor/reference-guides/interactivity-api/directives-and-store/)
- [Quick Start Guide](https://developer.wordpress.org/block-editor/reference-guides/interactivity-api/iapi-quick-start-guide/)
- [Understanding State, Context, Derived State, Config](https://developer.wordpress.org/block-editor/reference-guides/interactivity-api/core-concepts/understanding-global-state-local-context-derived-state-and-config/)
- [WP Movies Demo](https://wpmovies.dev/) - Official interactive demo
- [Interactivity Router API](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-interactivity-router/) - Client-side navigation
