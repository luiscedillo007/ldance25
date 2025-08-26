import { writable } from 'svelte/store';

export const selectedSite = writable<string>('');
export const loading = writable<boolean>(false);
export const siteSelected = writable<boolean>(false);

export function selectSite(site: string, onSuccess: (site: string) => void) {
	loading.set(true);
	
	// Simulate async operation (you can add actual logic here if needed)
	setTimeout(() => {
		selectedSite.set(site);
		siteSelected.set(true);
		loading.set(false);
		onSuccess(site);
	}, 300);
}

export function resetSite() {
	selectedSite.set('');
	siteSelected.set(false);
	loading.set(false);
} 