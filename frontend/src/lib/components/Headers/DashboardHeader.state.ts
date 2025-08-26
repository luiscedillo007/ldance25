import { goto } from '$app/navigation';
import { loggedInUser } from '$lib/stores/userStore';
import { API_CONFIG, NAVIGATION } from '$lib/constants';
import { optitrackClient } from '$lib/OptitrackClient';

export function goToAdmin() {
	goto(NAVIGATION.ROUTES.ADMIN);
}

export function goToDashboard() {
	goto(NAVIGATION.ROUTES.DASHBOARD);
}

export function goToGenerate() {
	goto(NAVIGATION.ROUTES.GENERATE);
}

export function logout() {
	// Reset OptitrackClient state
	optitrackClient.resetState();
	
	// Clear user session
	loggedInUser.set(null);
	goto(NAVIGATION.ROUTES.HOME);
}

export async function fetchClientIp(): Promise<string> {
	try {
		const res = await fetch(`${API_CONFIG.BASE_URL}/api/network-info`, { cache: 'no-store' });
		if (!res.ok) return '';
		const json = await res.json();
		return json?.ip || '';
	} catch {
		return '';
	}
} 