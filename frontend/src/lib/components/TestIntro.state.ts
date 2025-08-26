import { writable } from 'svelte/store';

// State stores
export const errorMessage = writable<string | null>(null);

// Image mapping for test types
const testTypeImages = {
	'wind_test': {
		src: '/images/wind_test.png',
		alt: 'Wind Test Setup - Aerodynamic performance testing equipment'
	},
	'battery_test': {
		src: '/images/battery_test.png',
		alt: 'Battery Test Setup - Power consumption analysis equipment'
	},
	'stability_test': {
		src: '/images/stability_test.png',
		alt: 'Stability Test Setup - Flight stability evaluation equipment'
	},
	'other': {
		src: '/images/other_test.png',
		alt: 'Custom Test Setup - General testing configuration'
	}
};

// Get image for test type
export function getImageForTestType(testType: string) {
	return testTypeImages[testType as keyof typeof testTypeImages] || testTypeImages.other;
}

// Handle image loading errors
export function onImageError() {
	errorMessage.set('Image could not be loaded. Please check that the test image exists.');
}