/**
 * Kanban Board Store - The Masterpiece
 *
 * This is the capstone example demonstrating ALL directives and patterns
 * in one cohesive, impressive experience.
 *
 * Demonstrates:
 * - Nested data-wp-each (columns → cards)
 * - data-wp-on-window--* (global keyboard shortcuts)
 * - Multi-zone drag-drop between columns
 * - Undo/redo with history stack
 * - Search & filter with derived state
 * - Focus management with data-wp-watch
 */

import {
	store,
	getContext,
	getElement,
	withSyncEvent,
	splitTask,
} from '@wordpress/interactivity';

// =============================================================================
// ENUMS
// =============================================================================

/** Priority levels for kanban cards */
export enum Priority {
	High = 'high',
	Medium = 'medium',
	Low = 'low',
}

export type PriorityFilter = 'all' | Priority;

/** Command types for undo/redo operations */
export enum CommandType {
	Move = 'move',
	Create = 'create',
	Edit = 'edit',
	Delete = 'delete',
}

// Lookup tables (eliminate switches)
const PRIORITY_BADGE: Record<Priority, string> = {
	[Priority.High]: '!',
	[Priority.Medium]: '•',
	[Priority.Low]: '○',
};

const REVISION_ICON: Partial<Record<CommandType, string>> = {
	[CommandType.Move]: '⇢',
	[CommandType.Create]: '✦',
	[CommandType.Edit]: '✎',
	[CommandType.Delete]: '◌',
};

// =============================================================================
// TYPES
// =============================================================================

export interface KanbanCard {
	id: string;
	title: string;
	description?: string;
	priority: Priority;
	assignee?: string;
	createdAt: number;
}

export interface KanbanColumn {
	id: string;
	title: string;
	cards: KanbanCard[];
	color: string;
}

// =============================================================================
// COMMAND PATTERN - Reversible operations for undo/redo + revision history
// =============================================================================

interface BaseCommand {
	type: CommandType;
	timestamp: number;
	description: string;
	// Unique sequence ID for reliable comparison (avoids timestamp collisions)
	seqId: number;
}

export interface MoveCommand extends BaseCommand {
	type: CommandType.Move;
	cardId: string;
	cardTitle: string;
	from: { columnId: string; index: number };
	to: { columnId: string; index: number };
}

export interface CreateCommand extends BaseCommand {
	type: CommandType.Create;
	card: KanbanCard;
	columnId: string;
}

export interface EditCommand extends BaseCommand {
	type: CommandType.Edit;
	cardId: string;
	oldValues: { title: string; priority: Priority; description: string; assignee: string };
	newValues: { title: string; priority: Priority; description: string; assignee: string };
}

export interface DeleteCommand extends BaseCommand {
	type: CommandType.Delete;
	card: KanbanCard;
	columnId: string;
	index: number;
}

export type Command = MoveCommand | CreateCommand | EditCommand | DeleteCommand;

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_TITLE_LENGTH = 200;
const MAX_HISTORY_SIZE = 50;

// Monotonic sequence counter for unique command IDs
let commandSeqId = 0;

interface KanbanContext {
	columns: KanbanColumn[];
	draggedCardId: string | null;
	sourceColumnId: string | null;
	dropTargetColumnId: string | null;
	dropTargetCardId: string | null;
	dropPosition: 'before' | 'after';
	editingCardId: string | null;
	editTitle: string;
	editPriority: Priority;
	editDescription: string;
	editAssignee: string;
	searchQuery: string;
	filterPriority: PriorityFilter;
	history: Command[];
	historyIndex: number;
	newCardModalOpen: boolean;
	newCardColumnId: string | null;
	newCardTitle: string;
	newCardPriority: Priority;
	newCardDescription: string;
	newCardAssignee: string;
	revisionPanelOpen: boolean;
	hoveredRevisionId: string | null;
	// Auto-provided by wp-each
	item?: KanbanColumn | KanbanCard | Command;
}

// =============================================================================
// COMMAND EXECUTION
// =============================================================================

/** Find card location across all columns */
const findCardLocation = (
	columns: KanbanColumn[],
	cardId: string
): { column: KanbanColumn; index: number } | null => {
	for ( const column of columns ) {
		const index = column.cards.findIndex( ( c ) => c.id === cardId );
		if ( index !== -1 ) {
			return { column, index };
		}
	}
	return null;
};

/** Execute a command (apply changes) */
const executeCommand = ( columns: KanbanColumn[], command: Command ): void => {
	switch ( command.type ) {
		case CommandType.Move: {
			const location = findCardLocation( columns, command.cardId );
			if ( ! location ) return;
			const [ card ] = location.column.cards.splice( location.index, 1 );
			const targetColumn = findColumn( columns, command.to.columnId );
			if ( card && targetColumn ) {
				targetColumn.cards.splice( command.to.index, 0, card );
			}
			break;
		}
		case CommandType.Create: {
			const column = findColumn( columns, command.columnId );
			if ( column ) {
				column.cards.push( command.card );
			}
			break;
		}
		case CommandType.Edit: {
			const location = findCardLocation( columns, command.cardId );
			if ( location ) {
				location.column.cards[ location.index ].title = command.newValues.title;
				location.column.cards[ location.index ].priority = command.newValues.priority;
				location.column.cards[ location.index ].description = command.newValues.description || undefined;
				location.column.cards[ location.index ].assignee = command.newValues.assignee || undefined;
			}
			break;
		}
		case CommandType.Delete: {
			const column = findColumn( columns, command.columnId );
			if ( column ) {
				const index = column.cards.findIndex( ( c ) => c.id === command.card.id );
				if ( index !== -1 ) {
					column.cards.splice( index, 1 );
				}
			}
			break;
		}
	}
};

/** Reverse a command (undo changes) */
const reverseCommand = ( columns: KanbanColumn[], command: Command ): void => {
	switch ( command.type ) {
		case CommandType.Move: {
			// Reverse: move from 'to' back to 'from'
			const location = findCardLocation( columns, command.cardId );
			if ( ! location ) return;
			const [ card ] = location.column.cards.splice( location.index, 1 );
			const sourceColumn = findColumn( columns, command.from.columnId );
			if ( card && sourceColumn ) {
				sourceColumn.cards.splice( command.from.index, 0, card );
			}
			break;
		}
		case CommandType.Create: {
			// Reverse: delete the created card
			const column = findColumn( columns, command.columnId );
			if ( column ) {
				const index = column.cards.findIndex( ( c ) => c.id === command.card.id );
				if ( index !== -1 ) {
					column.cards.splice( index, 1 );
				}
			}
			break;
		}
		case CommandType.Edit: {
			// Reverse: restore old values
			const location = findCardLocation( columns, command.cardId );
			if ( location ) {
				location.column.cards[ location.index ].title = command.oldValues.title;
				location.column.cards[ location.index ].priority = command.oldValues.priority;
				location.column.cards[ location.index ].description = command.oldValues.description || undefined;
				location.column.cards[ location.index ].assignee = command.oldValues.assignee || undefined;
			}
			break;
		}
		case CommandType.Delete: {
			// Reverse: restore the deleted card
			const column = findColumn( columns, command.columnId );
			if ( column ) {
				column.cards.splice( command.index, 0, command.card );
			}
			break;
		}
	}
};

/** Add command to history with size limit */
const pushCommand = ( context: KanbanContext, command: Command ): void => {
	// Truncate future history if we're not at the end
	context.history = context.history.slice( 0, context.historyIndex + 1 );

	// Add new command
	context.history.push( command );

	// Enforce max history size
	if ( context.history.length > MAX_HISTORY_SIZE ) {
		context.history = context.history.slice( -MAX_HISTORY_SIZE );
		// Recalculate index: if we were at the end, stay at the new end
		context.historyIndex = Math.min( context.historyIndex, context.history.length - 1 );
	} else {
		context.historyIndex = context.history.length - 1;
	}
};

// =============================================================================
// HELPERS
// =============================================================================

/** Find column by ID */
const findColumn = ( columns: KanbanColumn[], id: string ): KanbanColumn | undefined =>
	columns.find( ( c ) => c.id === id );

/** Extract value from input event */
const getInputValue = <T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
	event: Event
): string => ( event.target as T ).value;

/** Check if element is an input-like element */
const isInputElement = (
	target: unknown
): target is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
	target instanceof HTMLInputElement ||
	target instanceof HTMLTextAreaElement ||
	target instanceof HTMLSelectElement;

/** Reset new card modal state */
const resetNewCardModal = ( context: KanbanContext ): void => {
	context.newCardModalOpen = false;
	context.newCardColumnId = null;
	context.newCardTitle = '';
	context.newCardDescription = '';
	context.newCardAssignee = '';
};

/** Generate unique card ID: timestamp + 7 random chars */
const generateId = (): string => {
	const RANDOM_CHARS = 7;
	const RADIX = 36;
	return `card-${ Date.now() }-${ Math.random().toString( RADIX ).substring( 2, 2 + RANDOM_CHARS ) }`;
};

/** Sanitize and validate title input */
const sanitizeTitle = ( title: string ): string => {
	return title.trim().slice( 0, MAX_TITLE_LENGTH );
};

/** Generate descriptive edit message */
const getEditDescription = (
	oldValues: { title: string; priority: Priority; description: string; assignee: string },
	newValues: { title: string; priority: Priority; description: string; assignee: string }
): string => {
	const titleChanged = oldValues.title !== newValues.title;
	const priorityChanged = oldValues.priority !== newValues.priority;
	const descriptionChanged = oldValues.description !== newValues.description;
	const assigneeChanged = oldValues.assignee !== newValues.assignee;
	const cardTitle = newValues.title;

	const changes: string[] = [];
	if ( titleChanged ) changes.push( 'title' );
	if ( priorityChanged ) changes.push( 'priority' );
	if ( descriptionChanged ) changes.push( 'description' );
	if ( assigneeChanged ) changes.push( 'assignee' );

	if ( changes.length === 0 ) {
		return `"${ cardTitle }" ✎`;
	}

	return `"${ cardTitle }" ✎ ${ changes.join( ', ' ) }`;
};

/** Reset drag state to clean values */
const resetDragState = ( context: KanbanContext ): void => {
	context.draggedCardId = null;
	context.sourceColumnId = null;
	context.dropTargetColumnId = null;
	context.dropTargetCardId = null;
};

/** Perform edit save - shared between blur and explicit save */
const performEdit = ( context: KanbanContext ): void => {
	const sanitizedTitle = sanitizeTitle( context.editTitle );
	if ( ! context.editingCardId || ! sanitizedTitle ) {
		context.editingCardId = null;
		return;
	}

	const location = findCardLocation( context.columns, context.editingCardId );
	if ( ! location ) {
		context.editingCardId = null;
		return;
	}

	const card = location.column.cards[ location.index ];
	const oldValues = {
		title: card.title,
		priority: card.priority,
		description: card.description || '',
		assignee: card.assignee || '',
	};
	const newValues = {
		title: sanitizedTitle,
		priority: context.editPriority,
		description: context.editDescription.trim(),
		assignee: context.editAssignee.trim(),
	};

	const command: EditCommand = {
		type: CommandType.Edit,
		cardId: context.editingCardId,
		oldValues,
		newValues,
		timestamp: Date.now(),
		description: getEditDescription( oldValues, newValues ),
		seqId: ++commandSeqId,
	};

	card.title = newValues.title;
	card.priority = newValues.priority;
	card.description = newValues.description || undefined;
	card.assignee = newValues.assignee || undefined;
	pushCommand( context, command );
	context.editingCardId = null;
};

/** Initialize new card modal with default values */
const initNewCardModal = ( context: KanbanContext, columnId: string | null ): void => {
	context.newCardColumnId = columnId;
	context.newCardModalOpen = true;
	context.newCardTitle = '';
	context.newCardPriority = Priority.Medium;
	context.newCardDescription = '';
	context.newCardAssignee = '';
};

// =============================================================================
// STORE HELPER FUNCTIONS (for derived state getters)
// =============================================================================

type EditValueKey = 'title' | 'priority' | 'description' | 'assignee';

/** Check if current card has specified priority */
const hasPriority = ( priority: Priority ) => (): boolean => {
	const context = getContext<KanbanContext>();
	const card = context.item as KanbanCard | undefined;
	return card?.priority === priority;
};

/** Check if current command has specified type */
const isCommandType = ( type: CommandType ) => (): boolean => {
	const context = getContext<KanbanContext>();
	const command = context.item as Command | undefined;
	return command?.type === type;
};

/** Extract old/new value from edit command */
const getEditValue = ( key: EditValueKey, which: 'old' | 'new' ) => (): string => {
	const context = getContext<KanbanContext>();
	const command = context.item as EditCommand | undefined;
	if ( ! command || command.type !== CommandType.Edit ) return '';
	const values = which === 'old' ? command.oldValues : command.newValues;
	const value = values[ key ];
	if ( key === 'description' && ! value ) return '(empty)';
	if ( key === 'assignee' && ! value ) return '(nobody)';
	return value;
};

/** Check if a value changed in edit command */
const hasEditChange = ( key: EditValueKey ) => (): boolean => {
	const context = getContext<KanbanContext>();
	const command = context.item as EditCommand | undefined;
	if ( ! command || command.type !== CommandType.Edit ) return false;
	return command.oldValues[ key ] !== command.newValues[ key ];
};

/** Extract card ID from any command type */
const getCardIdFromCommand = ( command: Command | undefined ): string | null => {
	if ( ! command ) return null;
	switch ( command.type ) {
		case CommandType.Move:
		case CommandType.Edit:
			return command.cardId;
		case CommandType.Create:
		case CommandType.Delete:
			return command.card.id;
		default:
			return null;
	}
};

/** Perform undo - shared by keyboard handler and action */
const performUndo = ( context: KanbanContext ): void => {
	if ( context.historyIndex >= 0 ) {
		reverseCommand( context.columns, context.history[ context.historyIndex ] );
		context.historyIndex--;
	}
};

/** Perform redo - shared by keyboard handler and action */
const performRedo = ( context: KanbanContext ): void => {
	if ( context.historyIndex < context.history.length - 1 ) {
		context.historyIndex++;
		executeCommand( context.columns, context.history[ context.historyIndex ] );
	}
};

// =============================================================================
// STORE
// =============================================================================

store( 'kanban', {
	state: {
		// Is this card being dragged?
		get isBeingDragged(): boolean {
			const context = getContext<KanbanContext>();
			// context.item is the card when inside card wp-each
			const card = context.item as KanbanCard | undefined;
			return context.draggedCardId === card?.id;
		},

		// Is this column a drop target?
		get isDropTarget(): boolean {
			const context = getContext<KanbanContext>();
			// context.item is the column when inside column wp-each
			const column = context.item as KanbanColumn | undefined;
			return context.dropTargetColumnId === column?.id;
		},

		// Is this card a drop target?
		get isCardDropTarget(): boolean {
			const context = getContext<KanbanContext>();
			const card = context.item as KanbanCard | undefined;
			return context.dropTargetCardId === card?.id;
		},

		// Get filtered cards for current column
		get filteredCards(): KanbanCard[] {
			const context = getContext<KanbanContext>();
			const column = context.item as KanbanColumn | undefined;
			if ( ! column ) return [];

			let cards = column.cards;

			// Filter by search query
			if ( context.searchQuery ) {
				const query = context.searchQuery.toLowerCase();
				cards = cards.filter(
					( card ) =>
						card.title.toLowerCase().includes( query ) ||
						card.description?.toLowerCase().includes( query ) ||
						card.assignee?.toLowerCase().includes( query )
				);
			}

			// Filter by priority
			if ( context.filterPriority !== 'all' ) {
				cards = cards.filter(
					( card ) => card.priority === context.filterPriority
				);
			}

			return cards;
		},

		// Can undo?
		get canUndo(): boolean {
			const context = getContext<KanbanContext>();
			return context.historyIndex >= 0;
		},

		// Can redo?
		get canRedo(): boolean {
			const context = getContext<KanbanContext>();
			return context.historyIndex < context.history.length - 1;
		},

		// Is editing this card?
		get isEditing(): boolean {
			const context = getContext<KanbanContext>();
			const card = context.item as KanbanCard | undefined;
			return context.editingCardId === card?.id;
		},

		// Can save the edit? (title not empty)
		get canSaveEdit(): boolean {
			const context = getContext<KanbanContext>();
			return context.editTitle.trim().length > 0;
		},

		// Is this card draggable? (false when editing)
		get isDraggable(): boolean {
			const context = getContext<KanbanContext>();
			const card = context.item as KanbanCard | undefined;
			return context.editingCardId !== card?.id;
		},

		// Is this card high priority?
		get isHighPriority(): boolean {
			return hasPriority( Priority.High )();
		},

		// Is this card medium priority?
		get isMediumPriority(): boolean {
			return hasPriority( Priority.Medium )();
		},

		// Is this card low priority?
		get isLowPriority(): boolean {
			return hasPriority( Priority.Low )();
		},

		// Get priority badge text
		get priorityBadge(): string {
			const card = getContext<KanbanContext>().item as KanbanCard | undefined;
			return card?.priority ? PRIORITY_BADGE[ card.priority ] : '○';
		},

		// Drop position indicator
		get isDropBefore(): boolean {
			const context = getContext<KanbanContext>();
			const card = context.item as KanbanCard | undefined;
			return (
				context.dropTargetCardId === card?.id &&
				context.dropPosition === 'before'
			);
		},

		get isDropAfter(): boolean {
			const context = getContext<KanbanContext>();
			const card = context.item as KanbanCard | undefined;
			return (
				context.dropTargetCardId === card?.id &&
				context.dropPosition === 'after'
			);
		},

		// ========================
		// REVISION HISTORY
		// ========================

		// Is revision panel open?
		get isRevisionPanelOpen(): boolean {
			const context = getContext<KanbanContext>();
			return context.revisionPanelOpen;
		},

		// Toggle icon for revision panel
		get revisionToggleIcon(): string {
			const context = getContext<KanbanContext>();
			return context.revisionPanelOpen ? '▼' : '▶';
		},

		// Get revision list for rendering
		get revisionList(): Command[] {
			const context = getContext<KanbanContext>();
			return context.history;
		},

		// Current revision index
		get currentRevisionIndex(): number {
			const context = getContext<KanbanContext>();
			return context.historyIndex;
		},

		// Are we at the initial state (before any edits)?
		get isAtInitialState(): boolean {
			const context = getContext<KanbanContext>();
			return context.historyIndex < 0;
		},

		// Is this the current revision?
		get isCurrentRevision(): boolean {
			const context = getContext<KanbanContext>();
			const command = context.item as Command | undefined;
			if ( ! command ) return false;
			const commandIndex = context.history.findIndex( c => c.seqId === command.seqId );
			return commandIndex === context.historyIndex;
		},

		// Get icon for command type
		get revisionIcon(): string {
			const command = getContext<KanbanContext>().item as Command | undefined;
			return command?.type ? REVISION_ICON[ command.type as CommandType ] ?? '·' : '·';
		},

		// Get command type for CSS class
		get revisionType(): string {
			const context = getContext<KanbanContext>();
			const command = context.item as Command | undefined;
			return command?.type || '';
		},

		// Should we show the text description? (false for moves since we render visually)
		get showRevisionDescription(): boolean {
			const context = getContext<KanbanContext>();
			const command = context.item as Command | undefined;
			return command?.type !== CommandType.Move;
		},

		// Should we show the visual move display?
		get showRevisionMove(): boolean {
			const context = getContext<KanbanContext>();
			const command = context.item as Command | undefined;
			return command?.type === CommandType.Move;
		},

		// Is this an in-column move (reordering within same column)?
		get isInColumnMove(): boolean {
			const context = getContext<KanbanContext>();
			const command = context.item as MoveCommand | undefined;
			if ( ! command || command.type !== CommandType.Move ) return false;
			return command.from.columnId === command.to.columnId;
		},

		// Get the column name for in-column moves
		get revisionMoveColumn(): string {
			const context = getContext<KanbanContext>();
			const command = context.item as MoveCommand | undefined;
			if ( ! command || command.type !== CommandType.Move ) return '';
			const column = context.columns.find( c => c.id === command.to.columnId );
			return column?.title || '';
		},

		// Should we show the priority change visual?
		get showRevisionPriority(): boolean {
			return hasEditChange( 'priority' )();
		},

		// Should we show the title change visual?
		get showRevisionTitleChange(): boolean {
			return hasEditChange( 'title' )();
		},

		// Get old priority for edit
		get revisionOldPriority(): string {
			return getEditValue( 'priority', 'old' )();
		},

		// Get new priority for edit
		get revisionNewPriority(): string {
			return getEditValue( 'priority', 'new' )();
		},

		// Get old title for edit
		get revisionOldTitle(): string {
			return getEditValue( 'title', 'old' )();
		},

		// Get new title for edit
		get revisionNewTitle(): string {
			return getEditValue( 'title', 'new' )();
		},

		// Should we show the description change visual?
		get showRevisionDescriptionChange(): boolean {
			return hasEditChange( 'description' )();
		},

		// Get old description for edit
		get revisionOldDescription(): string {
			return getEditValue( 'description', 'old' )();
		},

		// Get new description for edit
		get revisionNewDescription(): string {
			return getEditValue( 'description', 'new' )();
		},

		// Should we show the assignee change visual?
		get showRevisionAssigneeChange(): boolean {
			return hasEditChange( 'assignee' )();
		},

		// Get old assignee for edit
		get revisionOldAssignee(): string {
			return getEditValue( 'assignee', 'old' )();
		},

		// Get new assignee for edit
		get revisionNewAssignee(): string {
			return getEditValue( 'assignee', 'new' )();
		},

		// Get column name where card was created
		get revisionCreateColumn(): string {
			const context = getContext<KanbanContext>();
			const command = context.item as CreateCommand | undefined;
			if ( ! command || command.type !== CommandType.Create ) return '';
			const column = context.columns.find( c => c.id === command.columnId );
			return column?.title || '';
		},

		// Is this a create command?
		get isCreateCommand(): boolean {
			return isCommandType( CommandType.Create )();
		},

		// Is this a delete command?
		get isDeleteCommand(): boolean {
			return isCommandType( CommandType.Delete )();
		},

		// Is this an edit command?
		get isEditCommand(): boolean {
			return isCommandType( CommandType.Edit )();
		},

		// Show card title for edits when title wasn't changed
		get showRevisionEditCardTitle(): boolean {
			const context = getContext<KanbanContext>();
			const command = context.item as EditCommand | undefined;
			if ( ! command || command.type !== CommandType.Edit ) return false;
			return command.oldValues.title === command.newValues.title;
		},

		// Get card title from revision
		get revisionCardTitle(): string {
			const context = getContext<KanbanContext>();
			const command = context.item as Command | undefined;
			if ( ! command ) return '';
			switch ( command.type ) {
				case CommandType.Move:
					return command.cardTitle;
				case CommandType.Edit:
					return command.newValues.title;
				case CommandType.Create:
				case CommandType.Delete:
					return command.card.title;
				default:
					return '';
			}
		},

		// Get from column name (for moves)
		get revisionFromColumn(): string {
			const context = getContext<KanbanContext>();
			const command = context.item as MoveCommand | undefined;
			if ( ! command || command.type !== CommandType.Move ) return '';
			const column = context.columns.find( c => c.id === command.from.columnId );
			return column?.title || '';
		},

		// Get to column name (for moves)
		get revisionToColumn(): string {
			const context = getContext<KanbanContext>();
			const command = context.item as MoveCommand | undefined;
			if ( ! command || command.type !== CommandType.Move ) return '';
			const column = context.columns.find( c => c.id === command.to.columnId );
			return column?.title || '';
		},

		// Get relative time ago
		get revisionTimeAgo(): string {
			const context = getContext<KanbanContext>();
			const command = context.item as Command | undefined;
			if ( ! command ) return '';

			const now = Date.now();
			const diff = now - command.timestamp;
			const seconds = Math.floor( diff / 1000 );
			const minutes = Math.floor( seconds / 60 );
			const hours = Math.floor( minutes / 60 );

			if ( seconds < 60 ) return 'just now';
			if ( minutes < 60 ) return `${ minutes } min ago`;
			if ( hours < 24 ) return `${ hours }h ago`;
			return `${ Math.floor( hours / 24 ) }d ago`;
		},

		// Should this card be highlighted due to revision hover?
		get isRevisionHighlighted(): boolean {
			const context = getContext<KanbanContext>();
			const card = context.item as KanbanCard | undefined;
			if ( ! card || ! context.hoveredRevisionId ) return false;

			// Simply check if this card's ID matches the hovered revision ID
			return card.id === context.hoveredRevisionId;
		},

		// Get card ID from current revision item (for hover tracking)
		get revisionCardId(): string | null {
			return getCardIdFromCommand( getContext<KanbanContext>().item as Command | undefined );
		},
	},

	actions: {
		// ========================
		// DRAG & DROP
		// ========================

		handleDragStart: withSyncEvent( ( event: DragEvent ) => {
			const context = getContext<KanbanContext>();
			const { ref } = getElement();
			const card = context.item as KanbanCard | undefined;
			if ( ! card ) return;

			context.draggedCardId = card.id;

			// Find source column using existing helper
			const location = findCardLocation( context.columns, card.id );
			if ( location ) {
				context.sourceColumnId = location.column.id;
			}

			if ( event.dataTransfer && ref ) {
				event.dataTransfer.setData(
					'text/plain',
					card.id
				);
				event.dataTransfer.effectAllowed = 'move';
				const rect = ref.getBoundingClientRect();
				event.dataTransfer.setDragImage(
					ref,
					rect.width / 2,
					rect.height / 2
				);
			}
		} ),

		handleDragOver: withSyncEvent( ( event: DragEvent ) => {
			event.preventDefault();
			if ( event.dataTransfer ) {
				event.dataTransfer.dropEffect = 'move';
			}

			const context = getContext<KanbanContext>();
			const column = context.item as KanbanColumn | undefined;

			// Set column as drop target
			if ( column && column.id !== context.sourceColumnId ) {
				context.dropTargetColumnId = column.id;
				context.dropTargetCardId = null;
			}
		} ),

		handleCardDragOver: withSyncEvent( ( event: DragEvent ) => {
			event.preventDefault();
			event.stopPropagation();

			if ( event.dataTransfer ) {
				event.dataTransfer.dropEffect = 'move';
			}

			const context = getContext<KanbanContext>();
			const { ref } = getElement();
			const card = context.item as KanbanCard | undefined;

			if (
				! card ||
				card.id === context.draggedCardId
			) {
				return;
			}

			context.dropTargetCardId = card.id;

			// Determine position based on Y coordinate
			if ( ref ) {
				const rect = ref.getBoundingClientRect();
				const midY = rect.top + rect.height / 2;
				context.dropPosition =
					event.clientY < midY ? 'before' : 'after';
			}
		} ),

		handleCardDragLeave: withSyncEvent( ( event: DragEvent ) => {
			event.stopPropagation();
			const context = getContext<KanbanContext>();
			const card = context.item as KanbanCard | undefined;

			// Only clear if we're actually leaving this card
			const { ref } = getElement();
			if ( ref && ! ref.contains( event.relatedTarget as Node ) ) {
				if ( context.dropTargetCardId === card?.id ) {
					context.dropTargetCardId = null;
				}
			}
		} ),

		handleDropOnColumn: withSyncEvent( ( event: DragEvent ) => {
			event.preventDefault();
			event.stopPropagation();

			const context = getContext<KanbanContext>();
			const column = context.item as KanbanColumn | undefined;
			const targetColumnId = column?.id;

			if (
				! context.draggedCardId ||
				! context.sourceColumnId ||
				! targetColumnId
			) {
				return;
			}

			// Find source column and card
			const sourceColumn = findColumn( context.columns, context.sourceColumnId );
			const targetColumn = findColumn( context.columns, targetColumnId );

			if ( ! sourceColumn || ! targetColumn ) return;

			const cardIndex = sourceColumn.cards.findIndex(
				( c ) => c.id === context.draggedCardId
			);
			if ( cardIndex === -1 ) return;

			const card = sourceColumn.cards[ cardIndex ];

			// Determine insertion position
			let insertIndex = targetColumn.cards.length;
			if ( context.dropTargetCardId ) {
				const targetIndex = targetColumn.cards.findIndex(
					( c ) => c.id === context.dropTargetCardId
				);
				if ( targetIndex !== -1 ) {
					insertIndex =
						context.dropPosition === 'before'
							? targetIndex
							: targetIndex + 1;
				}
			}

			// Skip if no actual movement (same column, same effective position)
			if ( sourceColumn === targetColumn ) {
				// After splicing out, indices shift - calculate final position
				const finalIndex = insertIndex > cardIndex ? insertIndex - 1 : insertIndex;
				if ( finalIndex === cardIndex ) {
					resetDragState( context );
					return;
				}
			}

			// Calculate the actual insertion index after splice
			// If same column and inserting after current position, adjust for the removed card
			let actualInsertIndex = insertIndex;
			if ( sourceColumn === targetColumn && insertIndex > cardIndex ) {
				actualInsertIndex = insertIndex - 1;
			}

			// Create and execute move command (use original indices for undo accuracy)
			const command: MoveCommand = {
				type: CommandType.Move,
				cardId: card.id,
				cardTitle: card.title,
				from: { columnId: context.sourceColumnId, index: cardIndex },
				to: { columnId: targetColumnId, index: insertIndex },
				timestamp: Date.now(),
				description: `${ sourceColumn.title } → ${ targetColumn.title }`,
				seqId: ++commandSeqId,
			};

			// Execute the move - splice out first, then insert at adjusted position
			sourceColumn.cards.splice( cardIndex, 1 );
			targetColumn.cards.splice( actualInsertIndex, 0, card );

			pushCommand( context, command );
			resetDragState( context );
		} ),

		handleDragEnd: withSyncEvent( () => {
			resetDragState( getContext<KanbanContext>() );
		} ),

		// ========================
		// CRUD
		// ========================

		openNewCardModal() {
			const context = getContext<KanbanContext>();
			const column = context.item as KanbanColumn | undefined;
			initNewCardModal( context, column?.id || null );
		},

		openNewCardModalFirstColumn() {
			const context = getContext<KanbanContext>();
			initNewCardModal( context, context.columns[ 0 ]?.id || null );
		},

		closeNewCardModal() {
			resetNewCardModal( getContext<KanbanContext>() );
		},

		stopPropagation: withSyncEvent( ( event: Event ) => {
			event.stopPropagation();
		} ),

		setNewCardTitle( event: Event ) {
			const context = getContext<KanbanContext>();
			context.newCardTitle = getInputValue<HTMLInputElement>( event );
		},

		setNewCardPriority( event: Event ) {
			const context = getContext<KanbanContext>();
			context.newCardPriority = getInputValue<HTMLSelectElement>( event ) as Priority;
		},

		setNewCardDescription( event: Event ) {
			const context = getContext<KanbanContext>();
			context.newCardDescription = getInputValue<HTMLTextAreaElement>( event );
		},

		setNewCardAssignee( event: Event ) {
			const context = getContext<KanbanContext>();
			context.newCardAssignee = getInputValue<HTMLInputElement>( event );
		},

		createCard() {
			const context = getContext<KanbanContext>();

			const sanitizedTitle = sanitizeTitle( context.newCardTitle );
			if ( ! sanitizedTitle || ! context.newCardColumnId ) return;

			const column = findColumn( context.columns, context.newCardColumnId );
			if ( ! column ) {
				// Column was deleted while modal was open - reset and notify user
				console.warn( `Column "${ context.newCardColumnId }" no longer exists` );
				resetNewCardModal( context );
				return;
			}

			const newCard: KanbanCard = {
				id: generateId(),
				title: sanitizedTitle,
				description: context.newCardDescription.trim() || undefined,
				priority: context.newCardPriority,
				assignee: context.newCardAssignee.trim() || undefined,
				createdAt: Date.now(),
			};

			// Create and execute create command
			const command: CreateCommand = {
				type: CommandType.Create,
				card: newCard,
				columnId: context.newCardColumnId,
				timestamp: Date.now(),
				description: `+ "${ newCard.title }"`,
				seqId: ++commandSeqId,
			};

			column.cards.push( newCard );
			pushCommand( context, command );

			context.newCardModalOpen = false;
			context.newCardTitle = '';
		},

		*editCard() {
			const context = getContext<KanbanContext>();
			const card = context.item as KanbanCard | undefined;
			if ( ! card ) return;

			context.editingCardId = card.id;
			context.editTitle = card.title;
			context.editPriority = card.priority;
			context.editDescription = card.description || '';
			context.editAssignee = card.assignee || '';

			// Yield to let DOM update, then focus input
			yield splitTask();
			const { ref } = getElement();
			if ( ref ) {
				const cardEl = ref.closest( '.kanban-card' );
				const input = cardEl?.querySelector(
					'.kanban-card__edit-input'
				) as HTMLInputElement;
				if ( input ) {
					// Set initial value directly - don't use data-wp-bind--value
					// which would reset cursor position on every state change
					input.value = card.title;
					input.focus();
				}
			}
		},

		setEditTitle( event: Event ) {
			const context = getContext<KanbanContext>();
			context.editTitle = getInputValue<HTMLInputElement>( event );
		},

		setEditPriority( event: Event ) {
			const context = getContext<KanbanContext>();
			context.editPriority = getInputValue<HTMLSelectElement>( event ) as Priority;
		},

		setEditDescription( event: Event ) {
			const context = getContext<KanbanContext>();
			context.editDescription = getInputValue<HTMLTextAreaElement>( event );
		},

		setEditAssignee( event: Event ) {
			const context = getContext<KanbanContext>();
			context.editAssignee = getInputValue<HTMLInputElement>( event );
		},

		handleEditBlur: withSyncEvent( ( event: FocusEvent ) => {
			const context = getContext<KanbanContext>();
			const { ref } = getElement();

			// Find the edit form container
			const editForm = ref?.closest( '.kanban-card__edit' );

			// Check if focus is moving to a delete button (skip save to avoid orphaned edit command)
			const relatedTarget = event.relatedTarget as HTMLElement | null;
			const isDeleteButton = relatedTarget?.closest( '.kanban-card__actions' )?.querySelector( '[title="Delete"]' ) === relatedTarget;

			// Only save if focus is leaving the edit form entirely and not to delete button
			if ( editForm && ! editForm.contains( relatedTarget ) && ! isDeleteButton ) {
				performEdit( context );
			}
		} ),

		saveEdit() {
			performEdit( getContext<KanbanContext>() );
		},

		cancelEdit() {
			const context = getContext<KanbanContext>();
			context.editingCardId = null;
		},

		deleteCard() {
			const context = getContext<KanbanContext>();
			const card = context.item as KanbanCard | undefined;
			if ( ! card ) return;

			const location = findCardLocation( context.columns, card.id );
			if ( ! location ) return;

			const command: DeleteCommand = {
				type: CommandType.Delete,
				card: { ...card }, // Copy for history
				columnId: location.column.id,
				index: location.index,
				timestamp: Date.now(),
				description: card.title,
				seqId: ++commandSeqId,
			};

			location.column.cards.splice( location.index, 1 );
			pushCommand( context, command );
		},

		// ========================
		// SEARCH & FILTER
		// ========================

		updateSearch( event: Event ) {
			const context = getContext<KanbanContext>();
			context.searchQuery = getInputValue<HTMLInputElement>( event );
		},

		setFilter( event: Event ) {
			const context = getContext<KanbanContext>();
			context.filterPriority = getInputValue<HTMLSelectElement>( event ) as PriorityFilter;
		},

		clearSearch() {
			const context = getContext<KanbanContext>();
			context.searchQuery = '';
		},

		// ========================
		// KEYBOARD SHORTCUTS
		// ========================

		handleGlobalKeydown: withSyncEvent( ( event: KeyboardEvent ) => {
			const context = getContext<KanbanContext>();

			// Ctrl+Z: Undo
			if (
				event.ctrlKey &&
				! event.shiftKey &&
				event.key === 'z'
			) {
				event.preventDefault();
				performUndo( context );
				return;
			}

			// Ctrl+Shift+Z: Redo
			if (
				event.ctrlKey &&
				event.shiftKey &&
				event.key === 'Z'
			) {
				event.preventDefault();
				performRedo( context );
				return;
			}

			// Escape: Close modals
			if ( event.key === 'Escape' ) {
				if ( context.newCardModalOpen ) {
					resetNewCardModal( context );
				}
				if ( context.editingCardId ) {
					context.editingCardId = null;
				}
				return;
			}

			// N: New card (when not in input)
			if (
				event.key === 'n' &&
				! event.ctrlKey &&
				! event.metaKey &&
				! isInputElement( event.target )
			) {
				event.preventDefault();
				// Open modal in first column (To Do)
				initNewCardModal( context, context.columns[ 0 ]?.id || null );
			}
		} ),

		// ========================
		// HISTORY (UNDO/REDO)
		// ========================

		undo() {
			performUndo( getContext<KanbanContext>() );
		},

		redo() {
			performRedo( getContext<KanbanContext>() );
		},

		// ========================
		// REVISION PANEL
		// ========================

		toggleRevisionPanel() {
			const context = getContext<KanbanContext>();
			context.revisionPanelOpen = ! context.revisionPanelOpen;
			// Clear hover state when closing panel to prevent stuck highlights
			if ( ! context.revisionPanelOpen ) {
				context.hoveredRevisionId = null;
			}
		},

		jumpToRevision() {
			const context = getContext<KanbanContext>();
			const command = context.item as Command | undefined;
			if ( ! command ) return;

			const targetIndex = context.history.findIndex( c => c.seqId === command.seqId );
			if ( targetIndex === -1 ) return;

			// If jumping to a future state, we need to execute commands
			if ( targetIndex > context.historyIndex ) {
				for ( let i = context.historyIndex + 1; i <= targetIndex; i++ ) {
					executeCommand( context.columns, context.history[ i ] );
				}
			}
			// If jumping to a past state, we need to reverse commands
			else if ( targetIndex < context.historyIndex ) {
				for ( let i = context.historyIndex; i > targetIndex; i-- ) {
					reverseCommand( context.columns, context.history[ i ] );
				}
			}

			context.historyIndex = targetIndex;
		},

		setHoveredRevision() {
			const context = getContext<KanbanContext>();
			context.hoveredRevisionId = getCardIdFromCommand( context.item as Command | undefined );
		},

		clearHoveredRevision() {
			const context = getContext<KanbanContext>();
			context.hoveredRevisionId = null;
		},

		resetToInitial() {
			const context = getContext<KanbanContext>();
			// Reverse all commands from current position back to start
			while ( context.historyIndex >= 0 ) {
				reverseCommand( context.columns, context.history[ context.historyIndex ] );
				context.historyIndex--;
			}
		},
	},

	callbacks: {
		// Focus on new card input when modal opens
		focusNewCardInput() {
			const context = getContext<KanbanContext>();
			if ( context.newCardModalOpen ) {
				const { ref } = getElement();
				if ( ref ) {
					const input = ref.querySelector(
						'.kanban-modal__input'
					) as HTMLInputElement;
					input?.focus();
				}
			}
		},

		// Scroll current revision into view
		scrollToCurrentRevision() {
			const context = getContext<KanbanContext>();
			// Read historyIndex to establish reactive dependency
			void context.historyIndex;

			const { ref } = getElement();
			if ( ! ref ) return;

			// Find the active revision item
			const activeItem = ref.querySelector( '.kanban-revision-item.active' ) as HTMLElement;
			if ( activeItem ) {
				activeItem.scrollIntoView( {
					behavior: 'smooth',
					inline: 'center',
					block: 'nearest',
				} );
			}
		},
	},
} );
