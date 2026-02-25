/**
 * Data Table Store - Complex Example #14
 *
 * Demonstrates:
 * - Multi-column sorting
 * - Pagination state
 * - Row selection
 * - Filtering
 */

import { store, getContext } from '@wordpress/interactivity';
import type { UserStatus, SortDirection, UserRole, StatusFilter } from '@shared/types';

// Helper function for sort direction comparison
const isAscending = ( dir: SortDirection | null ): boolean => dir === 'asc';

interface DataTableContext {
	sortColumn: string;
	sortDirection: SortDirection | null;
	currentPage: number;
	pageSize: number;
	selectedRows: number[];
	searchTerm: string;
	statusFilter: StatusFilter;
	// Local context for buttons/headers
	filterValue?: StatusFilter;
	columnName?: string;
	// Item added by wp-each context wrapper
	item?: TableRow;
}

interface TableRow {
	id: number;
	name: string;
	email: string;
	role: UserRole;
	status: UserStatus;
	createdAt: string;
	lastLogin: string;
}

// Sample data
const tableData: TableRow[] = [
	{ id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'active', createdAt: '2024-01-15', lastLogin: '2024-02-20' },
	{ id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Editor', status: 'active', createdAt: '2024-02-01', lastLogin: '2024-02-19' },
	{ id: 3, name: 'Carol White', email: 'carol@example.com', role: 'Viewer', status: 'inactive', createdAt: '2023-11-20', lastLogin: '2024-01-05' },
	{ id: 4, name: 'David Brown', email: 'david@example.com', role: 'Editor', status: 'pending', createdAt: '2024-02-10', lastLogin: '' },
	{ id: 5, name: 'Eve Davis', email: 'eve@example.com', role: 'Admin', status: 'active', createdAt: '2023-09-01', lastLogin: '2024-02-21' },
	{ id: 6, name: 'Frank Miller', email: 'frank@example.com', role: 'Viewer', status: 'active', createdAt: '2024-01-25', lastLogin: '2024-02-18' },
	{ id: 7, name: 'Grace Lee', email: 'grace@example.com', role: 'Editor', status: 'active', createdAt: '2023-12-15', lastLogin: '2024-02-20' },
	{ id: 8, name: 'Henry Wilson', email: 'henry@example.com', role: 'Viewer', status: 'inactive', createdAt: '2023-10-10', lastLogin: '2023-12-01' },
	{ id: 9, name: 'Ivy Chen', email: 'ivy@example.com', role: 'Admin', status: 'active', createdAt: '2024-02-05', lastLogin: '2024-02-21' },
	{ id: 10, name: 'Jack Taylor', email: 'jack@example.com', role: 'Editor', status: 'pending', createdAt: '2024-02-15', lastLogin: '' },
	{ id: 11, name: 'Kate Anderson', email: 'kate@example.com', role: 'Viewer', status: 'active', createdAt: '2023-08-20', lastLogin: '2024-02-17' },
	{ id: 12, name: 'Liam Thomas', email: 'liam@example.com', role: 'Editor', status: 'active', createdAt: '2024-01-08', lastLogin: '2024-02-19' },
];

// Helper functions (not in store)
const getFilteredData = ( searchTerm: string, statusFilter: string ): TableRow[] => {
	let result = tableData;

	if ( searchTerm ) {
		const term = searchTerm.toLowerCase();
		result = result.filter(
			( row ) =>
				row.name.toLowerCase().includes( term ) ||
				row.email.toLowerCase().includes( term ) ||
				row.role.toLowerCase().includes( term )
		);
	}

	if ( statusFilter && statusFilter !== 'all' ) {
		result = result.filter( ( row ) => row.status === statusFilter );
	}

	return result;
};

const getSortedData = ( data: TableRow[], sortColumn: string, sortDirection: SortDirection | null ): TableRow[] => {
	if ( ! sortColumn || ! sortDirection ) return data;

	// Validate sortColumn is a valid table column
	const validColumns: (keyof TableRow)[] = [ 'id', 'name', 'email', 'role', 'status', 'createdAt', 'lastLogin' ];
	if ( ! validColumns.includes( sortColumn as keyof TableRow ) ) return data;

	return [ ...data ].sort( ( a, b ) => {
		const aVal = a[ sortColumn as keyof TableRow ];
		const bVal = b[ sortColumn as keyof TableRow ];

		// Handle string comparison
		if ( typeof aVal === 'string' && typeof bVal === 'string' ) {
			const comparison = aVal.localeCompare( bVal );
			return isAscending( sortDirection ) ? comparison : -comparison;
		}

		// Handle numeric comparison (e.g., id column)
		if ( typeof aVal === 'number' && typeof bVal === 'number' ) {
			return isAscending( sortDirection ) ? aVal - bVal : bVal - aVal;
		}

		return 0;
	} );
};

const getPaginatedData = ( data: TableRow[], currentPage: number, pageSize: number ): TableRow[] => {
	const start = ( currentPage - 1 ) * pageSize;
	const end = start + pageSize;
	return data.slice( start, end );
};

// Combined data processing - called once per state change, not repeatedly
const getProcessedData = ( context: DataTableContext ): {
	filtered: TableRow[];
	sorted: TableRow[];
	paginated: TableRow[];
	totalCount: number;
	totalPages: number;
} => {
	const filtered = getFilteredData( context.searchTerm, context.statusFilter );
	const sorted = getSortedData( filtered, context.sortColumn, context.sortDirection );
	const paginated = getPaginatedData( sorted, context.currentPage, context.pageSize );
	return {
		filtered,
		sorted,
		paginated,
		totalCount: filtered.length,
		totalPages: Math.ceil( filtered.length / context.pageSize ),
	};
};

store( 'dataTable', {
	state: {
		get paginatedData(): TableRow[] {
			const context = getContext<DataTableContext>();
			return getProcessedData( context ).paginated;
		},
		get totalCount(): number {
			const context = getContext<DataTableContext>();
			return getProcessedData( context ).totalCount;
		},
		get totalPages(): number {
			const context = getContext<DataTableContext>();
			return getProcessedData( context ).totalPages;
		},
		// Derived state: is this filter button active?
		get isFilterActive(): boolean {
			const context = getContext<DataTableContext>();
			return context.statusFilter === context.filterValue;
		},
		// Derived state: is this sort column active?
		get isSortColumnActive(): boolean {
			const context = getContext<DataTableContext>();
			return context.sortColumn === context.columnName;
		},
		// Derived state: get sort icon for current column
		get sortIcon(): string {
			const context = getContext<DataTableContext>();
			if ( context.sortColumn !== context.columnName ) return '↕';
			return isAscending( context.sortDirection ) ? '↑' : '↓';
		},
		// Derived state: is this the first page?
		get isFirstPage(): boolean {
			const context = getContext<DataTableContext>();
			return context.currentPage === 1;
		},
		// Derived state: is this the last page?
		get isLastPage(): boolean {
			const context = getContext<DataTableContext>();
			return context.currentPage >= getProcessedData( context ).totalPages;
		},
		// Derived state: status badge classes
		get isStatusActive(): boolean {
			const context = getContext<DataTableContext>();
			return context.item?.status === 'active';
		},
		get isStatusPending(): boolean {
			const context = getContext<DataTableContext>();
			return context.item?.status === 'pending';
		},
		get isStatusInactive(): boolean {
			const context = getContext<DataTableContext>();
			return context.item?.status === 'inactive';
		},
	},
	actions: {
		sortBy() {
			const context = getContext<DataTableContext>();
			const column = context.columnName;
			if ( ! column ) return;

			if ( context.sortColumn === column ) {
				// Cycle: asc -> desc -> none
				if ( context.sortDirection === 'asc' ) {
					context.sortDirection = 'desc';
				} else if ( context.sortDirection === 'desc' ) {
					context.sortColumn = '';
					context.sortDirection = null;
				}
			} else {
				context.sortColumn = column;
				context.sortDirection = 'asc';
			}
		},

		nextPage() {
			const context = getContext<DataTableContext>();
			const count = getFilteredData( context.searchTerm, context.statusFilter ).length;
			const totalPages = Math.ceil( count / context.pageSize );
			if ( context.currentPage < totalPages ) {
				context.currentPage++;
			}
		},

		prevPage() {
			const context = getContext<DataTableContext>();
			if ( context.currentPage > 1 ) {
				context.currentPage--;
			}
		},

		updateSearch( event: InputEvent ) {
			const context = getContext<DataTableContext>();
			context.searchTerm = ( event.target as HTMLInputElement ).value;
			context.currentPage = 1;
			context.selectedRows = [];
		},

		setStatusFilter() {
			const context = getContext<DataTableContext>();
			if ( context.filterValue !== undefined ) {
				context.statusFilter = context.filterValue;
				context.currentPage = 1;
				context.selectedRows = [];
			}
		},
	},
} );
