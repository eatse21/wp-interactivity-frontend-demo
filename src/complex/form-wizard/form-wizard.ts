/**
 * Form Wizard Store - Complex Example #12
 *
 * Demonstrates:
 * - Multi-step form state management
 * - Complex validation logic
 * - Async submit with loading states
 * - data-wp-bind--disabled for navigation
 */

import { store, getContext, getElement, splitTask } from '@wordpress/interactivity';
import { KeyboardKey } from '@shared/types';

// Validation constants
const MIN_NAME_LENGTH = 2;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_ERROR = 'Name must be at least 2 characters';
const EMAIL_ERROR = 'Please enter a valid email address';

// Validation helpers (return true if valid)
const isValidName = ( name: string ): boolean => name.trim().length >= MIN_NAME_LENGTH;
const isValidEmail = ( email: string ): boolean => {
	if ( ! email ) {
		return false;
	}
	return EMAIL_REGEX.test( email.toLowerCase() );
};

interface FormWizardContext {
	currentStep: number;
	totalSteps: number;
	isSubmitting: boolean;
	isComplete: boolean;

	// Form fields
	name: string;
	email: string;
	phone: string;
	message: string;
	preferences: string[];

	// Validation
	errors: Record<string, string>;

	// Local context for inputs
	fieldName?: keyof FormWizardContext;
	// Local context for wizard steps
	stepNumber?: number;

    // Focus
    needsFocus: boolean;
}

const { state, actions } = store( 'formWizard', {
	state: {
		get canGoBack(): boolean {
			const context = getContext<FormWizardContext>();
			return context.currentStep > 1 && !context.isSubmitting;
		},
		get canGoForward(): boolean {
			const context = getContext<FormWizardContext>();
			return context.currentStep < context.totalSteps && state.isStepValid;
		},
		get isStepValid(): boolean {
			const context = getContext<FormWizardContext>();
			const step = context.currentStep;

			switch ( step ) {
				case 1:
					return isValidName( context.name );
				case 2:
					return isValidEmail( context.email );
				case 3:
					return isValidName( context.name ) && isValidEmail( context.email );
				default:
					return true;
			}
		},
		// Derived state: is this step active?
		get isStepActive(): boolean {
			const context = getContext<FormWizardContext>();
			return context.currentStep === context.stepNumber;
		},
		// Derived state: is this step completed?
		get isStepCompleted(): boolean {
			const context = getContext<FormWizardContext>();
			if ( context.stepNumber === undefined ) return false;
			return context.currentStep > context.stepNumber;
		},
		// Derived state: should show this step panel?
		get shouldShowStepPanel(): boolean {
			const context = getContext<FormWizardContext>();
			return context.currentStep === context.stepNumber;
		},
		// Derived state: is this the final step?
		get shouldShowCompletePanel(): boolean {
			const context = getContext<FormWizardContext>();
			return context.currentStep === 3 && ! context.isComplete;
		},
		// Derived state: should show submit button text
		get shouldShowSubmitting(): boolean {
			const context = getContext<FormWizardContext>();
			return context.isSubmitting;
		},
		// Derived state: should show continue button
		get shouldShowContinueButton(): boolean {
			const context = getContext<FormWizardContext>();
			return context.currentStep !== 3;
		},
		// Derived state: should show submit button
		get shouldShowSubmitButton(): boolean {
			const context = getContext<FormWizardContext>();
			return context.currentStep === 3;
		},
		// Derived state: does this field have an error?
		get hasFieldError(): boolean {
			const context = getContext<FormWizardContext>();
			const field = context.fieldName;
			if ( ! field ) return false;
			return !! context.errors[ field as string ];
		},
	},
	actions: {
		nextStep: () => {
			const context = getContext<FormWizardContext>();
			if ( context.currentStep < context.totalSteps ) {
				context.currentStep++;
			}
            context.needsFocus = true;
		},

		handleEnter: ( event: KeyboardEvent ) => {
			if ( event.key !== KeyboardKey.Enter || !state.canGoForward ) return;
            actions.nextStep();
		},

		prevStep: () => {
			const context = getContext<FormWizardContext>();
			if ( context.currentStep > 1 ) {
				context.currentStep--;
			}
            context.needsFocus = true;
		},

		updateField: ( event: InputEvent ) => {
			const context = getContext<FormWizardContext>();
			const field = context.fieldName;
			if ( ! field ) return;

			const value = ( event.target as HTMLInputElement ).value;

			// Type-safe field updates
			switch ( field ) {
				case 'name':
					context.name = value;
					break;
				case 'email':
					context.email = value;
					break;
				case 'phone':
					context.phone = value;
					break;
				case 'message':
					context.message = value;
					break;
			}

			// Validate field in real-time
			const isValid = field === 'email'
				? isValidEmail( value )
				: field === 'name'
					? isValidName( value )
					: true;

			if ( ! isValid ) {
				const errorMessage = field === 'email' ? EMAIL_ERROR : NAME_ERROR;
				context.errors = { ...context.errors, [ field ]: errorMessage };
			} else {
				const { [ field ]: _, ...rest } = context.errors;
				context.errors = rest;
			}
		},

		*submitForm() {
			const context = getContext<FormWizardContext>();

			if ( ! state.isStepValid ) return;

			context.isSubmitting = true;
			yield splitTask();

			// Simulate API call
			yield new Promise( ( resolve ) => setTimeout( resolve, 1500 ) );

			context.isSubmitting = false;
			context.isComplete = true;

			console.log( 'Form submitted:', {
				name: context.name,
				email: context.email,
				phone: context.phone,
				message: context.message,
				preferences: context.preferences,
			} );
		},

	},
	callbacks: {
		focusWhenVisible: () => {
			const { ref } = getElement();
            const context = getContext<FormWizardContext>();

            if (ref && context.needsFocus) {
              const toFocus: HTMLElement | null =
                    ref.querySelector(':scope :not([hidden]) :is(input, [data-wp-on--click="actions.submitForm"]:not([hidden]))');

              if (toFocus) {
                toFocus.focus();
                context.needsFocus = false;
              }
            }
		},
	},
} );
