import { writable } from 'svelte/store';

// Test type state
export const selectedTestType = writable<string | null>(null);
export const loading = writable<boolean>(false);
export const testTypeSelected = writable<boolean>(false);

// Actions
export function chooseTestType(testType: string, callback?: (testType: string) => void) {
	loading.set(true);
	
	// Simulate a brief loading state for better UX
	setTimeout(() => {
		selectedTestType.set(testType);
		testTypeSelected.set(true);
		loading.set(false);
		
		if (callback) {
			callback(testType);
		}
	}, 300);
}

export function resetTestType() {
	selectedTestType.set(null);
	testTypeSelected.set(false);
	loading.set(false);
}

export function goBack(callback?: () => void) {
	resetTestType();
	if (callback) {
		callback();
	}
}