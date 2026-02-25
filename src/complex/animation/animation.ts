/**
 * Animation Store - Complex Example #15
 *
 * Demonstrates:
 * - Animation state management with requestAnimationFrame
 * - Multiple animation types
 * - CSS-driven animations with JS control
 */

import { store, getContext } from '@wordpress/interactivity';

type AnimationToggle = 'slideEnabled' | 'scaleEnabled' | 'rotateEnabled' | 'colorEnabled';

interface AnimationContext {
	isPlaying: boolean;
	progress: number;
	duration: number;
	speed: number;
	loopCount: number;
	// Speed configuration
	minSpeed: number;
	maxSpeed: number;
	speedStep: number;
	// Animation toggles (cumulative)
	slideEnabled: boolean;
	scaleEnabled: boolean;
	rotateEnabled: boolean;
	colorEnabled: boolean;
	// Animation frame ID stored on context
	_animationFrameId?: number;
	// Local context for type buttons
	toggleKey?: AnimationToggle;
}

store( 'animation', {
	state: {
		get progressFloatingPercent(): string {
			const context = getContext<AnimationContext>();
			return `${ context.progress * 100 }%`;
		},
		get progressPercent(): string {
			const context = getContext<AnimationContext>();
			return `${ Math.round( context.progress * 100 ) }%`;
		},
		get transformStyle(): string {
			const context = getContext<AnimationContext>();
			const progress = context.progress;
			const transforms: string[] = [];

			if ( context.slideEnabled ) {
				transforms.push( `translateX(${ ( progress - 0.5 ) * 200 }px)` );
			}
			if ( context.scaleEnabled ) {
				transforms.push( `scale(${ 0.5 + progress * 0.5 })` );
			}
			if ( context.rotateEnabled ) {
				transforms.push( `rotate(${ progress * 360 }deg)` );
			}

			return transforms.join( ' ' );
		},
		get colorStyle(): string {
			const context = getContext<AnimationContext>();
			if ( ! context.colorEnabled ) return '';

			const progress = context.progress;
			// Interpolate between cyan and magenta
			const r = Math.round( 0 + ( 247 - 0 ) * progress );
			const g = Math.round( 245 - ( 245 - 37 ) * progress );
			const b = Math.round( 212 + ( 133 - 212 ) * progress );
			return `rgb(${ r }, ${ g }, ${ b })`;
		},
		// Derived state: is this animation toggle button active?
		get isAnimationTypeActive(): boolean {
			const context = getContext<AnimationContext>();
			if ( ! context.toggleKey ) return false;
			return context[ context.toggleKey ];
		},
		// Derived state: is speed at minimum?
		get isMinSpeed(): boolean {
			const context = getContext<AnimationContext>();
			return context.speed <= context.minSpeed;
		},
		// Derived state: is speed at maximum?
		get isMaxSpeed(): boolean {
			const context = getContext<AnimationContext>();
			return context.speed >= context.maxSpeed;
		},
	},
	actions: {
		togglePlay() {
			const context = getContext<AnimationContext>();
			context.isPlaying = ! context.isPlaying;

			// Cancel existing animation if any
			if ( context._animationFrameId !== undefined ) {
				cancelAnimationFrame( context._animationFrameId );
				context._animationFrameId = undefined;
			}
		},

		reset() {
			const context = getContext<AnimationContext>();
			context.progress = 0;
			context.loopCount = 0;
		},

		toggleAnimationType() {
			const context = getContext<AnimationContext>();
			if ( ! context.toggleKey ) return;
			const key = context.toggleKey;
			context[ key ] = ! context[ key ];
		},

		speedUp() {
			const context = getContext<AnimationContext>();
			context.speed = Math.min( context.maxSpeed, context.speed + context.speedStep );
		},

		slowDown() {
			const context = getContext<AnimationContext>();
			context.speed = Math.max( context.minSpeed, context.speed - context.speedStep );
		},
	},

	callbacks: {
		// Set up animation loop - monitors isPlaying changes
		setupAnimation() {
			const context = getContext<AnimationContext>();

			// Read isPlaying to establish reactive dependency
			// This callback will re-run when isPlaying changes
			if ( context.isPlaying ) {
				let oldTimestamp: number | undefined;

				const animate = ( timestamp: number ) => {
					if ( ! context.isPlaying ) return;

					// Initialize oldTimestamp time on first frame
					if ( oldTimestamp === undefined ) {
						oldTimestamp = timestamp;
					}

					const elapsed = ( timestamp - oldTimestamp ) * context.speed;
					oldTimestamp = timestamp;

					const progression = ( elapsed % context.duration ) / context.duration;
					context.progress += progression;

					// Check if we completed a loop
					if ( context.progress > 1.0 ) {
						context.progress = context.progress % 1.0;
						context.loopCount++;
					}

					context._animationFrameId = requestAnimationFrame( animate );
				};

				context._animationFrameId = requestAnimationFrame( animate );
			}
		},
	},
} );
