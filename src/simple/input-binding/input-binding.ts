/**
 * Input Binding Store - Simple Example #3
 *
 * Demonstrates:
 * - data-wp-bind--value (two-way binding)
 * - data-wp-on--input (real-time updates)
 * - Event handling with input events
 */

import { store, getContext } from '@wordpress/interactivity';

interface InputContext {
	value: string;
}

store( 'inputBinding', {
	actions: {
		updateValue: ( event: InputEvent ) => {
			const context = getContext<InputContext>();
			context.value = ( event.target as HTMLInputElement ).value;
		},
	},
} );
