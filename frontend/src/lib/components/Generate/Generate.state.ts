import { writable, get } from 'svelte/store';
import { API_CONFIG, KML_CONFIG, TEST_TYPES } from '$lib/constants';

export const lat0 = writable<number>(KML_CONFIG.DEFAULT_VALUES.LAT0);
export const lon0 = writable<number>(KML_CONFIG.DEFAULT_VALUES.LON0);
export const ground_msl = writable<number>(KML_CONFIG.DEFAULT_VALUES.GROUND_MSL);
export const local_xy_mode = writable<'east' | 'north' | 'heading'>('east');
export const heading_true_deg = writable<number>(KML_CONFIG.DEFAULT_VALUES.HEADING_TRUE_DEG);
export const testType = writable<string>('');

export const loading = writable<boolean>(false);
export const errorMessage = writable<string>('');
export const generationResult = writable<{
	kml: { filename: string; content: string };
	plan?: { filename: string; content: string };
} | null>(null);
export const downloadUrls = writable<{
	kml: string | null;
	plan: string | null;
}>({ kml: null, plan: null });

function revokeUrls() {
	const urls = get(downloadUrls);
	if (urls.kml) URL.revokeObjectURL(urls.kml);
	if (urls.plan) URL.revokeObjectURL(urls.plan);
}

export async function submitGenerate() {
	loading.set(true);
	errorMessage.set('');
	revokeUrls();
	generationResult.set(null);
	downloadUrls.set({ kml: null, plan: null });

	const payload = {
		lat0: get(lat0),
		lon0: get(lon0),
		ground_msl: get(ground_msl),
		local_xy_mode: get(local_xy_mode),
		heading_true_deg: get(heading_true_deg),
		testType: get(testType)
	};

	try {
		const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GENERATE_KML}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		
		if (!res.ok) {
			throw new Error('Failed to generate files');
		}
		
		const data = await res.json();
		generationResult.set(data);
		
		// Create download URLs
		const kmlBlob = new Blob([data.kml.content], { type: 'application/vnd.google-earth.kml+xml' });
		const kmlUrl = URL.createObjectURL(kmlBlob);
		
		let planUrl = null;
		if (data.plan) {
			const planBlob = new Blob([data.plan.content], { type: 'application/json' });
			planUrl = URL.createObjectURL(planBlob);
		}
		
		downloadUrls.set({ kml: kmlUrl, plan: planUrl });
	} catch (e: any) {
		errorMessage.set(e?.message || 'Failed to generate files');
	} finally {
		loading.set(false);
	}
} 