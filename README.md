[![Plant trees](https://img.shields.io/badge/Treeware-%F0%9F%8C%B3-lightgreen?style=for-the-badge)](https://plant.treeware.earth/eatse21/wp-interactivity-frontend-demo)

# Interactivity API Frontend Demo

Interactive examples showcasing `@wordpress/interactivity` outside WordPress with ES modules and importmap.

![Website screenshot](./screenshot.webp)

## Overview

This project demonstrates the WordPress Interactivity API in a pure frontend environment—no WordPress installation required. It mirrors the same setup WordPress renders: ES modules with importmap, declarative HTML directives, and reactive state management via Preact signals.

**Motivation:** For WordPress developers interested in learning reactive UI patterns who want to experiment without the cognitive overhead of backend concerns. It can also be a nice "Cheatsheet" like reference project for your implementations.

The Interactivity API enables declarative, reactive UIs using HTML attributes (`data-wp-*` directives) and JavaScript stores.

More than only WordPress block development, this API can be used in any situation, even classic themes or standalone in a completely different environment.

> **Note:** This project originated from experimenting with `@wordpress/interactivity`. It's not intended to be a state-of-the-art implementation and can be improved in many ways. Contributions and suggestions are welcome!

## Features

- **16 interactive examples** organized by complexity (simple, intermediate, complex)
- **Pure frontend setup** — no PHP, no REST API, no database. Can be served directly after build step.
- **WordPress-identical architecture** — same importmap pattern, same directive syntax
- **TypeScript throughout** — fully typed stores and contexts
- **Single-page demo** — all examples run in one HTML file

## Quick Start

```bash
# Clone the repository
git clone https://github.com/eatse21/wp-interactivity-frontend-demo/
cd wp-interactivity-frontend-demo

# Install dependencies
npm install

# Build and serve
npm run build
npx serve dist
```

Open `http://localhost:3000` to see the demo.

For development with sourcemaps and watch mode:

```bash
npm run dev
```

This runs esbuild in watch mode and serves the site at `http://localhost:3000`.

## Installation

### Prerequisites

- Node.js 18+
- npm 9+


### Setup

```bash
npm install
npm run build
```

The build process creates a `dist/` folder ready for static hosting.

## Examples Overview

### Simple (Building Blocks)

| Example | Directives Demonstrated | Description |
|---------|------------------------|-------------|
| Counter | `data-wp-text`, `data-wp-on--click` | Basic state manipulation with increment/decrement |
| Toggle | `data-wp-bind--hidden` | Show/hide content with boolean state |
| Input Binding | `data-wp-bind--value`, `data-wp-on--input` | Two-way data binding for form inputs |
| Class Toggle | `data-wp-class--*` | CSS class manipulation |
| Conditional | `data-wp-bind--disabled`, `data-wp-bind--readonly` | Attribute binding based on state |

### Intermediate (Reactivity Patterns)

| Example | Directives Demonstrated | Description |
|---------|------------------------|-------------|
| Todo List | `data-wp-each`, `data-wp-each-key` | List rendering with array context |
| Tabs | `data-wp-class--active`, derived state | Navigation state with active panel switching |
| Accordion | `data-wp-bind--aria-expanded` | Multi-section expandable content |
| Search Filter | Derived getters (`get`) | Real-time filtering with computed state |
| Star Rating | `data-wp-on--mouseenter`, `data-wp-on--mouseleave` | Hover + click interaction patterns |

### Complex (Full API Power)

| Example | API Features | Description |
|---------|-------------|-------------|
| Drag-Drop | `withSyncEvent`, `getElement` | Full drag-and-drop with data transfer |
| Form Wizard | Multi-step state, validation, `splitTask` | Multi-step form with async submit |
| Live Search | Async generators, `splitTask` | Debounced API simulation with loading states |
| Data Table | Sort, filter, pagination | Complete data grid implementation |
| Animation | `data-wp-watch`, `requestAnimationFrame` | Animation loop with reactive state, multiple transform types |

### Masterpiece

| Example | Description |
|---------|-------------|
| Kanban Board | Combines ALL directives and patterns: drag-drop, lists, state, async operations |

### A Note on HTML Examples

In a real WordPress environment with server-side rendering (SSR), `data-wp-each` templates are expanded on the server. For example, this clean template:

```html
<ul data-wp-interactive="myFruitPlugin" data-wp-context='{ "fruits": ["Apple", "Banana", "Cherry"] }'>
    <template data-wp-each="context.fruits">
        <li data-wp-text="context.item"></li>
    </template>
</ul>
```

Would be SSRed as:

```html
<ul data-wp-interactive="myFruitPlugin" data-wp-context='{ "fruits": ["Apple", "Banana", "Cherry"] }'>
    <template data-wp-each="context.fruits">
        <li data-wp-text="context.item"></li>
    </template>
    <li data-wp-each-child="myFruitPlugin::context.fruits" data-wp-text="context.item">Apple</li>
    <li data-wp-each-child="myFruitPlugin::context.fruits" data-wp-text="context.item">Banana</li>
    <li data-wp-each-child="myFruitPlugin::context.fruits" data-wp-text="context.item">Cherry</li>
</ul>
```

**For readability**, this demo keeps the HTML clean without SSR-expanded markup. The tradeoff: without JavaScript enabled, list items won't appear. This is intentional to keep the examples easy to read and understand.

### Project Structure

```
interactivity/
├── src/
│   ├── _partials/        # HTML partials (head, header, footer)
│   ├── styles/           # CSS partials (base, layout, components, utilities)
│   ├── simple/           # Each component has its own folder:
│   ├── intermediate/     #   component.ts, component.html, component.css
│   ├── complex/          #
│   └── shared/           # Types and utilities
├── scripts/              # Build scripts for HTML/CSS assembly
├── styles/styles.css     # Generated CSS
├── index.html            # Generated HTML
└── dist/                 # Production build output
```

> **Note:** `index.html` and `styles/styles.css` are generated from partials during build.

## Developer Resources

### AGENTS.md

The [`AGENTS.md`](./AGENTS.md) file is a comprehensive Interactivity API reference that can be reused in any project working with `@wordpress/interactivity`:

- **For Coding Agents:** Provides rich context for AI assistants (Claude, Cursor, Copilot) to understand the API and generate correct interactivity code.
- **For Developers:** Acts as a quick-reference cheatsheet for directives, store patterns, and common pitfalls.

Feel free to copy or adapt it for your own Interactivity API projects.

#### Loading Strategies for Coding Agents

When reusing `AGENTS.md` in your own projects, you have several options depending on your workflow:

| Strategy | When to Use | How |
|----------|-------------|-----|
| **Always Load** | You're actively developing with `@wordpress/interactivity` | Place as `AGENTS.md` or `CLAUDE.md` in project root (auto-loaded every session) |
| **On-Demand Load** | You work on multiple things and only need interactivity context occasionally | Place in a `docs/` folder and reference only when needed |
| **Subagent Review** | Dedicated code-quality checks for interactivity compliance | Pass to a code-review subagent that scans specifically for correct API usage patterns |

**Why choose on-demand?** The `AGENTS.md` file is comprehensive (~400+ lines). If your project includes other frameworks or concerns, loading it every session can clutter the agent's context window. The `docs/` approach keeps your root lean while keeping the reference accessible when you need it.

> **💡 Test what works for you:** Try the same prompt with and without the file loaded. Some agents perform better with full context upfront; others get distracted by too much information and [may actually perform better on their own](https://arxiv.org/pdf/2602.11988). Results vary depending on the agent, task complexity, and your specific workflow.

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Full production build: runtime + demo + CSS + HTML + copy to `dist/` |
| `npm run build:site` | Copy `index.html`, `assets/`, and `styles/` to `dist/` |
| `npm run build:interactivity` | Bundle `@wordpress/interactivity` runtime (minified) |
| `npm run build:interactivity:dev` | Bundle runtime without minification (for debugging core) |
| `npm run build:demo` | Bundle demo code (`src/index.ts`) with minification |
| `npm run build:html` | Assemble HTML from `src/_partials/` and component HTML files |
| `npm run build:css` | Concatenate CSS from `src/styles/` and component CSS files |
| `npm run dev` | Build dev runtime + CSS + HTML, then watch for changes and serve |
| `npm run watch:html` | Watch HTML partials and rebuild on changes |
| `npm run watch:css` | Watch CSS partials and rebuild on changes |
| `npm run typecheck` | Run TypeScript type checking without emitting files |


## License

This package is [Treeware](https://treeware.earth). If you find this useful, then I ask that you [**buy the world a tree**](https://plant.treeware.earth/eatse21/wp-interactivity-frontend-demo) to thank us for my work. Grow forests, not just code. By contributing to the Treeware forest you'll be creating employment for local families and restoring wildlife habitats.

**Alternative:** [EcoTree](https://ecotree.green) — you become an actual tree owner with financial returns at harvest, gifting options, and positive impact on sustainable forestry and biodiversity.
