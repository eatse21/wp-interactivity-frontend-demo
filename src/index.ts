/**
 * WordPress Interactivity API Demo
 * Main entry point - imports all stores
 *
 * This file is the single entry point for bundling.
 * Each store self-registers when imported.
 */

// ============================================================================
// SHARED UI
// ============================================================================

// Directive Toggle - Global UI toggle for showing all directives
import './shared/directive-toggle';

// ============================================================================
// SIMPLE EXAMPLES (Building Blocks)
// ============================================================================

// 1. Counter - Basic state manipulation
import './simple/counter/counter';

// 2. Toggle - Show/hide with bind
import './simple/toggle/toggle';

// 3. Input Binding - Two-way data binding
import './simple/input-binding/input-binding';

// 4. Class Toggle - CSS class manipulation
import './simple/class-toggle/class-toggle';

// 5. Conditional - Attribute binding
import './simple/conditional/conditional';

// ============================================================================
// INTERMEDIATE EXAMPLES (Reactivity)
// ============================================================================

// 6. Todo List - data-wp-each
import './intermediate/todo-list/todo-list';

// 7. Tabs - Navigation state
import './intermediate/tabs/tabs';

// 8. Accordion - Multi-section
import './intermediate/accordion/accordion';

// 9. Search Filter - Derived state (getters)
import './intermediate/search-filter/search-filter';

// 10. Star Rating - Hover + click interaction
import './intermediate/star-rating/star-rating';

// ============================================================================
// COMPLEX EXAMPLES (Full Power)
// ============================================================================

// 11. Drag-Drop - withSyncEvent, getElement, drag state management
import './complex/drag-drop/drag-drop';

// 12. Form Wizard - Multi-step with validation
import './complex/form-wizard/form-wizard';

// 13. Live Search - Async generators, splitTask
import './complex/live-search/live-search';

// 14. Data Table - Sort/filter/pagination
import './complex/data-table/data-table';

// 15. Animation - requestAnimationFrame with data-wp-watch
import './complex/animation/animation';

// ============================================================================
// MASTERPIECE (All Patterns Combined)
// ============================================================================

// 16. Kanban Board - Full demo with ALL directives
import './complex/kanban/kanban';
