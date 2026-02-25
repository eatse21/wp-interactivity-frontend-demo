/**
 * Tabs Store - Intermediate Example #7
 *
 * Demonstrates:
 * - Navigation state management
 * - data-wp-bind--aria-selected (accessibility)
 * - data-wp-bind--hidden (panel visibility)
 * - Keyboard navigation support
 * - Derived state with local context
 */

import { store, getContext, withSyncEvent } from '@wordpress/interactivity';
import { KeyboardKey } from '@shared/types';

interface TabsContext {
	activeTab: string;
	tabs: string[];
	// Local context for tab buttons and panels
	tabId?: string;
	panelId?: string;
}

const { actions } = store( 'tabs', {
	state: {
		// Derived state: is the current tab button active?
		get isTabActive(): boolean {
			const context = getContext<TabsContext>();
			return context.activeTab === context.tabId;
		},
		// Derived state: is the current panel visible?
		get isPanelVisible(): boolean {
			const context = getContext<TabsContext>();
			return context.activeTab === context.panelId;
		},
	},
	actions: {
		setActiveTab: () => {
			const context = getContext<TabsContext>();
			// tabId is provided by local context on each button
			if ( context.tabId ) {
				context.activeTab = context.tabId;
			}
		},
		nextTab: () => {
			const context = getContext<TabsContext>();
			const currentIndex = context.tabs.indexOf( context.activeTab );
			const nextIndex = ( currentIndex + 1 ) % context.tabs.length;
			context.activeTab = context.tabs[ nextIndex ];
		},
		previousTab: () => {
			const context = getContext<TabsContext>();
			const currentIndex = context.tabs.indexOf( context.activeTab );
			const prevIndex = ( currentIndex - 1 + context.tabs.length ) % context.tabs.length;
			context.activeTab = context.tabs[ prevIndex ];
		},
		handleKeydown: withSyncEvent( ( event: KeyboardEvent ) => {
			if ( event.key === KeyboardKey.ArrowRight || event.key === KeyboardKey.ArrowDown ) {
				event.preventDefault();
				actions.nextTab();
			} else if ( event.key === KeyboardKey.ArrowLeft || event.key === KeyboardKey.ArrowUp ) {
				event.preventDefault();
				actions.previousTab();
			} else if ( event.key === KeyboardKey.Home ) {
				event.preventDefault();
				const context = getContext<TabsContext>();
				context.activeTab = context.tabs[ 0 ];
			} else if ( event.key === KeyboardKey.End ) {
				event.preventDefault();
				const context = getContext<TabsContext>();
				context.activeTab = context.tabs[ context.tabs.length - 1 ];
			}
		} ),
	},
} );
