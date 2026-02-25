/**
 * Shared types and constants for @wordpress/interactivity examples
 */

// =============================================================================
// KEYBOARD KEYS
// =============================================================================

export const KeyboardKey = {
	Enter: 'Enter',
	Escape: 'Escape',
	ArrowUp: 'ArrowUp',
	ArrowDown: 'ArrowDown',
	ArrowLeft: 'ArrowLeft',
	ArrowRight: 'ArrowRight',
	Home: 'Home',
	End: 'End',
	Tab: 'Tab',
} as const;

export type KeyboardKeyValue =
	(typeof KeyboardKey)[keyof typeof KeyboardKey];

// =============================================================================
// DATA TABLE TYPES
// =============================================================================

export type UserStatus = 'active' | 'inactive' | 'pending';

export type StatusFilter = '' | 'all' | UserStatus;

export type SortDirection = 'asc' | 'desc';

export type UserRole = 'Admin' | 'Editor' | 'Viewer';

// =============================================================================
// SEARCH & FILTER TYPES
// =============================================================================

export const SearchCategory = {
	Frontend: 'Frontend',
	Backend: 'Backend',
	API: 'API',
	Database: 'Database',
	DevOps: 'DevOps',
	Language: 'Language',
} as const;

export type SearchCategory = typeof SearchCategory[keyof typeof SearchCategory];

export const FilterCategory = {
	All: 'all',
	Frontend: 'frontend',
	Backend: 'backend',
	Database: 'database',
} as const;

export type FilterCategory = typeof FilterCategory[keyof typeof FilterCategory];

// =============================================================================
// STAR RATING TYPES
// =============================================================================

export type RatingCategory = 'bad' | 'average' | 'good';

// =============================================================================
// DRAG & DROP TYPES
// =============================================================================

export type DragEffect = 'move' | 'copy' | 'link' | 'none';

export const DataTransferType = {
	TextPlain: 'text/plain',
} as const;
