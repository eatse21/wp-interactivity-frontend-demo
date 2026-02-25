/**
 * Directive Toggle Store
 *
 * Toggles showAllDirectives state. The CSS class is handled by
 * data-wp-class--show-all-directives directive on the body element.
 */

import { store } from '@wordpress/interactivity';

const { state } = store( 'directiveToggle', {
	state: {
		// showAllDirectives is initialized from HTML JSON script tag
		// Default value here is overridden by the server-provided state
		showAllDirectives: false,
		get toggleButtonText(): string {
			return state.showAllDirectives ? 'Show curated' : 'View all directives';
		},
	},
	actions: {
		toggleShowAll(): void {
			state.showAllDirectives = !state.showAllDirectives;
		},
	},
} );
