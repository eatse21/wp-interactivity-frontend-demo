/**
 * Class Toggle Store - Simple Example #4
 *
 * Demonstrates:
 * - data-wp-class--classname (toggle CSS classes)
 * - Multiple class toggles on same element
 * - State-driven styling
 */

import { store, getContext } from '@wordpress/interactivity';

interface ClassToggleContext {
	isActive: boolean;
	isHighlighted: boolean;
	clickCount: number;
}

store( 'classToggle', {
	state: {
		get activeStateText(): string {
			const context = getContext<ClassToggleContext>();
			return context.isActive ? 'Active' : 'Dormant';
		},
	},
	actions: {
		toggleActive: () => {
			const context = getContext<ClassToggleContext>();
			context.isActive = ! context.isActive;
			context.clickCount++;
		},
		toggleHighlight: () => {
			const context = getContext<ClassToggleContext>();
			context.isHighlighted = !context.isHighlighted;
		},
	},
} );
