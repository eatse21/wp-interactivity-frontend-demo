/**
 * Live Search Store - Complex Example #13
 *
 * Demonstrates:
 * - Async generator functions for async operations
 * - splitTask() for non-blocking updates
 * - Loading states with stale query protection
 * - Keyboard navigation in results
 */

import { store, getContext, getElement, splitTask, withSyncEvent } from '@wordpress/interactivity';
import { KeyboardKey, SearchCategory } from '@shared/types';

interface LiveSearchContext {
	query: string;
	results: SearchResult[];
	isLoading: boolean;
	selectedIndex: number;
	isOpen: boolean;
	recentSearches: string[];
	item?: SearchResult;
	_pendingSearchId?: number;
}

interface SearchResult {
	id: number;
	title: string;
	description: string;
	category: SearchCategory;
}

// Simulated search database
const searchDatabase: SearchResult[] = [
	{ id: 1, title: 'React Hooks', description: 'useState, useEffect, useContext', category: SearchCategory.Frontend },
	{ id: 2, title: 'Vue Composition API', description: 'ref, reactive, computed', category: SearchCategory.Frontend },
	{ id: 3, title: 'Angular Services', description: 'Dependency injection patterns', category: SearchCategory.Frontend },
	{ id: 4, title: 'Node.js Streams', description: 'Readable and writable streams', category: SearchCategory.Backend },
	{ id: 5, title: 'Express Middleware', description: 'Request processing pipeline', category: SearchCategory.Backend },
	{ id: 6, title: 'GraphQL Queries', description: 'Schema and resolver patterns', category: SearchCategory.API },
	{ id: 7, title: 'REST API Design', description: 'Resource-based architecture', category: SearchCategory.API },
	{ id: 8, title: 'SQL Joins', description: 'Inner, outer, and cross joins', category: SearchCategory.Database },
	{ id: 9, title: 'MongoDB Aggregation', description: 'Pipeline stages and operators', category: SearchCategory.Database },
	{ id: 10, title: 'Redis Caching', description: 'In-memory data structures', category: SearchCategory.Database },
	{ id: 11, title: 'Docker Containers', description: 'Containerization basics', category: SearchCategory.DevOps },
	{ id: 12, title: 'Kubernetes Pods', description: 'Orchestration fundamentals', category: SearchCategory.DevOps },
	{ id: 13, title: 'React Context', description: 'Global state management', category: SearchCategory.Frontend },
	{ id: 14, title: 'Redux Store', description: 'Predictable state container', category: SearchCategory.Frontend },
	{ id: 15, title: 'TypeScript Generics', description: 'Type parameter patterns', category: SearchCategory.Language },
];

// Simulate network delay
const simulateSearch = async ( query: string ): Promise<SearchResult[]> => {
	await new Promise( ( resolve ) => setTimeout( resolve, 300 + Math.random() * 400 ) );
	return searchDatabase.filter(
		( item ) =>
			item.title.toLowerCase().includes( query.toLowerCase() ) ||
			item.description.toLowerCase().includes( query.toLowerCase() ) ||
			item.category.toLowerCase().includes( query.toLowerCase() )
	);
};

store( 'liveSearch', {
	state: {
		get hasResults(): boolean {
			const context = getContext<LiveSearchContext>();
			return context.results.length > 0;
		},
		get hasQuery(): boolean {
			const context = getContext<LiveSearchContext>();
			return context.query.trim().length > 0;
		},
		get showDropdown(): boolean {
			const context = getContext<LiveSearchContext>();
			return context.isOpen && ( context.isLoading || context.results.length > 0 );
		},
		get selectedResult(): SearchResult | null {
			const context = getContext<LiveSearchContext>();
			if ( context.selectedIndex >= 0 && context.selectedIndex < context.results.length ) {
				return context.results[ context.selectedIndex ];
			}
			return null;
		},
		// Derived state: is this result item selected?
		get isResultSelected(): boolean {
			const context = getContext<LiveSearchContext>();
			if ( ! context.item ) return false;
			const idx = context.results.findIndex( ( r ) => r.id === context.item!.id );
			return context.selectedIndex === idx;
		},
		// Derived state: are there recent searches?
		get hasRecentSearches(): boolean {
			const context = getContext<LiveSearchContext>();
			return context.recentSearches.length > 0;
		},
	},
	actions: {
		*updateQuery( event: InputEvent ) {
			const context = getContext<LiveSearchContext>();
			const newQuery = ( event.target as HTMLInputElement ).value;
			context.query = newQuery;
			context.selectedIndex = -1;

			if ( ! newQuery.trim() ) {
				context.results = [];
				context.isOpen = false;
				return;
			}

			context.isLoading = true;
			context.isOpen = true;

			// Increment search ID to invalidate any in-flight searches
			const searchId = ( context._pendingSearchId ?? 0 ) + 1;
			context._pendingSearchId = searchId;

			// Yield to allow UI to update
			yield splitTask();

			// Perform async search
			try {
				const results: SearchResult[] = yield simulateSearch( newQuery );

				// Only update if this search is still the latest
				if ( context._pendingSearchId === searchId ) {
					context.results = results;
				}
			} catch ( error ) {
				// Search failed - reset state only if still current
				if ( context._pendingSearchId === searchId ) {
					context.results = [];
					context.isLoading = false;
					// In a real app, you'd show an error message to the user
					console.error( 'Search failed:', error );
				}
			} finally {
				// Only clear loading if this is still the current search
				if ( context._pendingSearchId === searchId ) {
					context.isLoading = false;
				}
			}
		},

		handleKeydown: withSyncEvent( ( event: KeyboardEvent ) => {
			const context = getContext<LiveSearchContext>();

			switch ( event.key ) {
				case KeyboardKey.ArrowDown:
					event.preventDefault();
					if ( context.results.length > 0 ) {
						context.selectedIndex =
							context.selectedIndex < context.results.length - 1
								? context.selectedIndex + 1
								: 0;
					}
					break;
				case KeyboardKey.ArrowUp:
					event.preventDefault();
					if ( context.results.length > 0 ) {
						context.selectedIndex =
							context.selectedIndex > 0
								? context.selectedIndex - 1
								: context.results.length - 1;
					}
					break;
				case KeyboardKey.Enter:
					event.preventDefault();
					if ( context.selectedIndex >= 0 ) {
						const result = context.results[ context.selectedIndex ];
						if ( result ) {
							if ( ! context.recentSearches.includes( result.title ) ) {
								context.recentSearches = [ result.title, ...context.recentSearches ].slice( 0, 5 );
							}
							context.query = '';
							context.isOpen = false;
							context.results = [];
						}
					}
					break;
				case KeyboardKey.Escape:
					context.isOpen = false;
					break;
			}
		} ),

		selectResult() {
			const context = getContext<LiveSearchContext>();
			if ( context.item ) {
				const result = context.item;
				if ( ! context.recentSearches.includes( result.title ) ) {
					context.recentSearches = [ result.title, ...context.recentSearches ].slice( 0, 5 );
				}
				context.query = '';
				context.isOpen = false;
				context.results = [];
			}
		},

		focusInput() {
			const context = getContext<LiveSearchContext>();
			if ( context.query.trim() ) {
				context.isOpen = true;
			}
		},

		closeOnOutsideClick( event: MouseEvent ) {
			const context = getContext<LiveSearchContext>();
			const { ref } = getElement();

			// Close only if click is outside the component
			if ( ref && ! ref.contains( event.target as Node ) ) {
				context.isOpen = false;
			}
		},

	},
	callbacks: {
		init() {
			const context = getContext<LiveSearchContext>();
			context._pendingSearchId = 0;
		},
	},
} );
