/**
 * Drag and Drop Store - Complex Example #11
 *
 * Demonstrates:
 * - Drag state management
 * - Item reordering
 * - Visual feedback during drag
 * - Click-based reorder fallback
 */

import { store, getContext, getElement, withSyncEvent } from '@wordpress/interactivity';
import { DataTransferType } from '@shared/types';

interface DragDropContext {
	items: DragItem[];
	draggedId: string | null;
	dropTargetId: string | null;
	isDragging: boolean;
	// Item added by wp-each context wrapper
	item?: DragItem;
}

interface DragItem {
	id: string;
	text: string;
	color: string;
}

// Helper to find item index by id
const getIndexById = ( items: DragItem[], id: string | null | undefined ): number => {
	if ( ! id ) return -1;
	return items.findIndex( ( i ) => i.id === id );
};

// Helper to find current item's index
const getCurrentIndex = ( context: DragDropContext ): number => {
	return getIndexById( context.items, context.item?.id );
};

store( 'dragDrop', {
	state: {
		// Is this item being dragged?
		get isBeingDragged(): boolean {
			const context = getContext<DragDropContext>();
			return context.draggedId === context.item?.id;
		},
		// Is this item a drop target?
		get isDropTarget(): boolean {
			const context = getContext<DragDropContext>();
			return context.dropTargetId === context.item?.id;
		},
		// Can this item move up?
		get canMoveUp(): boolean {
			return getCurrentIndex( getContext<DragDropContext>() ) > 0;
		},
		// Can this item move down?
		get canMoveDown(): boolean {
			const context = getContext<DragDropContext>();
			return getCurrentIndex( context ) < context.items.length - 1;
		},
	},
	actions: {
		// Start dragging - called on dragstart
		handleDragStart: withSyncEvent( ( event: DragEvent ) => {
			const context = getContext<DragDropContext>();
			const { ref } = getElement();
			if ( ! context.item ) return;

			context.draggedId = context.item.id;
			context.isDragging = true;

			// Set drag data and center the drag image under cursor
			if ( event.dataTransfer && ref ) {
				event.dataTransfer.setData( DataTransferType.TextPlain, context.item.id );
				event.dataTransfer.effectAllowed = 'move';
				// Center the drag ghost image under the cursor
				const rect = ref.getBoundingClientRect();
				event.dataTransfer.setDragImage( ref, rect.width / 2, rect.height / 2 );
			}
		} ),

		// Handle dragover - needed to allow drop
		handleDragOver: withSyncEvent( ( event: DragEvent ) => {
			event.preventDefault();
			if ( event.dataTransfer ) {
				event.dataTransfer.dropEffect = 'move';
			}

			const context = getContext<DragDropContext>();
			if ( context.item && context.item.id !== context.draggedId ) {
				context.dropTargetId = context.item.id;
			}
		} ),

		// Handle dragleave
		handleDragLeave: withSyncEvent( () => {
			const context = getContext<DragDropContext>();
			context.dropTargetId = null;
		} ),

		// Handle drop
		handleDrop: withSyncEvent( ( event: DragEvent ) => {
			event.preventDefault();
			const context = getContext<DragDropContext>();

			if ( context.draggedId && context.dropTargetId && context.draggedId !== context.dropTargetId ) {
				const fromIndex = getIndexById( context.items, context.draggedId );
				const toIndex = getIndexById( context.items, context.dropTargetId );

				if ( fromIndex !== -1 && toIndex !== -1 ) {
					const items = [ ...context.items ];
					const [ removed ] = items.splice( fromIndex, 1 );
					items.splice( toIndex, 0, removed );
					context.items = items;
				}
			}

			context.isDragging = false;
			context.draggedId = null;
			context.dropTargetId = null;
		} ),

		// Handle dragend - cleanup
		handleDragEnd: withSyncEvent( () => {
			const context = getContext<DragDropContext>();
			context.isDragging = false;
			context.draggedId = null;
			context.dropTargetId = null;
		} ),

		// Move item up - find index by matching item id
		moveUp() {
			const context = getContext<DragDropContext>();
			const index = getCurrentIndex( context );
			if ( index > 0 ) {
				[ context.items[ index - 1 ], context.items[ index ] ] =
					[ context.items[ index ], context.items[ index - 1 ] ];
			}
		},

		// Move item down - find index by matching item id
		moveDown() {
			const context = getContext<DragDropContext>();
			const index = getCurrentIndex( context );
			if ( index >= 0 && index < context.items.length - 1 ) {
				[ context.items[ index ], context.items[ index + 1 ] ] =
					[ context.items[ index + 1 ], context.items[ index ] ];
			}
		},
	},
} );
