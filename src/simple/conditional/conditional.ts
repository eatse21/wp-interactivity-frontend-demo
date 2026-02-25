/**
 * Conditional Store - Simple Example #5
 *
 * Demonstrates:
 * - data-wp-bind--disabled (form element states)
 * - data-wp-bind--readonly
 * - data-wp-bind--required
 * - Conditional attribute rendering
 */

import { store, getContext } from '@wordpress/interactivity';

interface ConditionalContext {
	isDisabled: boolean;
	isReadonly: boolean;
	isRequired: boolean;
	inputValue: string;
}

store( 'conditional', {
	actions: {
		toggleDisabled: () => {
			const context = getContext<ConditionalContext>();
			context.isDisabled = ! context.isDisabled;
		},
		toggleReadonly: () => {
			const context = getContext<ConditionalContext>();
			context.isReadonly = ! context.isReadonly;
		},
		toggleRequired: () => {
			const context = getContext<ConditionalContext>();
			context.isRequired = ! context.isRequired;
		},
		updateInput: ( event: InputEvent ) => {
			const context = getContext<ConditionalContext>();
			context.inputValue = ( event.target as HTMLInputElement ).value;
		},
	},
} );
