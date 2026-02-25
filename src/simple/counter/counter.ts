/**
 * Counter Store - Simple Example #1
 *
 * Demonstrates:
 * - data-wp-interactive (required wrapper)
 * - data-wp-context (local state)
 * - data-wp-text (reactive text content)
 * - data-wp-on--click (event handling)
 * - getContext<T>() (access local state)
 */

import { store, getContext } from '@wordpress/interactivity';

interface CounterContext {
	count: number;
}

store( 'counter', {
	state: {
		get isAtMinimum(): boolean {
			const context = getContext<CounterContext>();
			return context.count <= 0;
		},
	},
	actions: {
		increment: () => {
			const context = getContext<CounterContext>();
			context.count++;
		},
		decrement: () => {
			const context = getContext<CounterContext>();
			if ( context.count > 0 ) {
				context.count--;
			}
		},
		reset: () => {
			const context = getContext<CounterContext>();
			context.count = 0;
		},
	},
} );

