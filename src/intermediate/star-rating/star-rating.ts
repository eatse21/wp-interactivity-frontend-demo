/**
 * Star Rating Store - Intermediate Example #10
 *
 * Demonstrates:
 * - data-wp-on--click (selection)
 * - data-wp-on--mouseenter / data-wp-on--mouseleave (hover preview)
 * - data-wp-class (visual feedback)
 * - Combined interaction patterns
 */

import { store, getContext } from '@wordpress/interactivity';
import { RatingCategory } from '@shared/types';

interface StarRatingContext {
	rating: number;
	hoverRating: number;
	maxRating: number;
	hasSubmitted: boolean;
	ratingTexts: string[];
	ratingClasses: Record<RatingCategory, string>;
	// Item added by wp-each context wrapper
	item?: number;
}

const { state } = store( 'starRating', {
	state: {
		get currentRating(): number {
			const context = getContext<StarRatingContext>();
			return context.hoverRating > 0 ? context.hoverRating : context.rating;
		},
		get ratingText(): string {
			const context = getContext<StarRatingContext>();
			const rating = context.hoverRating > 0 ? context.hoverRating : context.rating;
			return context.ratingTexts[ rating ] || '';
		},
		get stars(): number[] {
			const context = getContext<StarRatingContext>();
			return Array.from( { length: context.maxRating }, ( _, i ) => i + 1 );
		},
		get isBad(): boolean {
			const context = getContext<StarRatingContext>();
			const midpoint = Math.ceil( context.maxRating / 2 );
			return context.maxRating > 1 && state.currentRating < midpoint;
		},
		get isAverage(): boolean {
			const context = getContext<StarRatingContext>();
			const midpoint = Math.ceil( context.maxRating / 2 );
			return context.maxRating > 1 && state.currentRating === midpoint;
		},
		get isGood(): boolean {
			const context = getContext<StarRatingContext>();
			const midpoint = Math.ceil( context.maxRating / 2 );
			return state.currentRating > midpoint || ( context.maxRating === 1 && state.currentRating === 1 );
		},
		// Derived state: is this star filled? (for wp-each items)
		get isStarFilled(): boolean {
			const context = getContext<StarRatingContext>();
			if ( context.item === undefined ) return false;
			const currentRating = context.hoverRating > 0 ? context.hoverRating : context.rating;
			return currentRating >= context.item;
		},
		// Derived state: has a rating been selected?
		get hasNoRating(): boolean {
			const context = getContext<StarRatingContext>();
			return context.rating === 0;
		},
		// Derived state: should show submit button?
		get shouldShowSubmitButton(): boolean {
			const context = getContext<StarRatingContext>();
			return ! context.hasSubmitted && context.rating > 0;
		},
	},
	actions: {
		setRating: () => {
			const context = getContext<StarRatingContext>();
			// The item is provided by wp-each context wrapper
			if ( context.item !== undefined ) {
				context.rating = context.item;
			}
		},
		setHoverRating: () => {
			const context = getContext<StarRatingContext>();
			// The item is provided by wp-each context wrapper
			if ( context.item !== undefined ) {
				context.hoverRating = context.item;
			}
		},
		clearHoverRating: () => {
			const context = getContext<StarRatingContext>();
			context.hoverRating = 0;
		},
		submitRating: () => {
			const context = getContext<StarRatingContext>();
			if ( context.rating > 0 ) {
				context.hasSubmitted = true;

				// In a real app, this would send to server
				console.log( 'Submitted rating:', context.rating );
			}
		},
	},
} );
