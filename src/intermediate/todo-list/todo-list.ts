/**
 * Todo List Store - Intermediate Example #6
 *
 * Demonstrates:
 * - data-wp-each (list rendering)
 * - data-wp-each-key (unique item keys)
 * - Array manipulation in context
 * - Conditional rendering based on item state
 */

import { store, getContext } from '@wordpress/interactivity';
import { KeyboardKey } from '@shared/types';

interface TodoItem {
	id: number;
	text: string;
	completed: boolean;
}

interface TodoContext {
	todos: TodoItem[];
	newTodoText: string;
	nextId: number;
	item?: TodoItem;
}

// Helper to add a todo (shared logic)
const addTodoItem = ( context: TodoContext ) => {
	const text = context.newTodoText.trim();
	if ( text ) {
		context.todos.push( {
			id: context.nextId++,
			text,
			completed: false,
		} );
		context.newTodoText = '';
	}
};

store( 'todoList', {
	state: {
		get remainingItems(): number {
			const context = getContext<TodoContext>();
			return context.todos.filter( ( t ) => ! t.completed ).length;
		},
		// Derived state: are there no todos?
		get hasNoTodos(): boolean {
			const context = getContext<TodoContext>();
			return context.todos.length === 0;
		},
		// Derived state: are there completed items?
		get hasCompletedItems(): boolean {
			const context = getContext<TodoContext>();
			return context.todos.some( ( t ) => t.completed );
		},
	},
	actions: {
		updateNewTodoText: ( event: InputEvent ) => {
			const context = getContext<TodoContext>();
			context.newTodoText = ( event.target as HTMLInputElement ).value;
		},
		addTodo: () => {
			const context = getContext<TodoContext>();
			addTodoItem( context );
		},
		addTodoOnEnter: ( event: KeyboardEvent ) => {
			if ( event.key === KeyboardKey.Enter ) {
				addTodoItem( getContext<TodoContext>() );
			}
		},
		toggleTodo: () => {
			const context = getContext<TodoContext>();
			if ( context.item ) {
				context.item.completed = ! context.item.completed;
			}
		},
		deleteTodo: () => {
			const context = getContext<TodoContext>();
			const item = context.item;
			if ( item ) {
				const idx = context.todos.findIndex( ( t ) => t.id === item.id );
				if ( idx > -1 ) {
					context.todos.splice( idx, 1 );
				}
			}
		},
		toggleAll: () => {
			const context = getContext<TodoContext>();
			const allCompleted = context.todos.every( ( t ) => t.completed );
			context.todos.forEach( ( t ) => {
				t.completed = ! allCompleted;
			} );
		},
		clearCompleted: () => {
			const context = getContext<TodoContext>();
			context.todos = context.todos.filter( ( t ) => ! t.completed );
		},
	},
} );
