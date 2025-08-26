import { writable, get } from 'svelte/store';
import { goto } from '$app/navigation';
import { userService, type User } from '$lib/services/userService';
import { loggedInUser } from '$lib/stores/userStore';
import { NAVIGATION } from '$lib/constants';

/* Form state */
export const username = writable('');
export const password = writable('');

/* UI state */
export const loading = writable(false);

/* Errors and messages */
export const usernameError = writable(false);
export const passwordError = writable(false);
export const generalError = writable('');

/* Input handlers */
export function handleUsernameInput(event: Event) {
	const v = (event.target as HTMLInputElement).value.toLowerCase();
	username.set(v);
	if (v.trim()) usernameError.set(false);
	generalError.set('');
}

export function handlePasswordInput(event: Event) {
	const v = (event.target as HTMLInputElement).value;
	password.set(v);
	if (v) passwordError.set(false);
	generalError.set('');
}

/* Validation + submit */
function validateForm(): boolean {
	usernameError.set(false);
	passwordError.set(false);
	generalError.set('');

	let ok = true;
	const missing: string[] = [];

	if (!get(username).trim()) { usernameError.set(true); missing.push('Username'); ok = false; }
	if (!get(password)) { passwordError.set(true); missing.push('Password'); ok = false; }

	if (missing.length > 0) {
		generalError.set(`Please fill in: ${missing.join(', ')}`);
	}

	return ok;
}

export async function handleSubmit(event: Event) {
	event.preventDefault();
	loading.set(true);

	if (!validateForm()) { 
		loading.set(false); 
		return; 
	}

	try {
		const res = await userService.login({
			username: get(username),
			password: get(password)
		});

		if (res.success) {
			const isAdmin = res.data?.isAdmin;
			const user = res.data?.user || null;

			if (isAdmin) {
				loggedInUser.set({
					username: 'admin',
					firstName: 'Admin',
					lastName: 'User',
					uniqueId: 'admin',
					createdAt: new Date().toISOString()
				});
				goto(NAVIGATION.ROUTES.ADMIN);
			} else {
				if (user) loggedInUser.set(user as User);
				goto(NAVIGATION.ROUTES.DASHBOARD);
			}
		} else {
			const err = res.error || 'Login failed';
			if (String(err).includes('Invalid credentials')) {
				usernameError.set(true);
				passwordError.set(true);
				generalError.set('Invalid username or password');
			} else {
				generalError.set(err);
			}
			password.set('');
		}
	} catch (error) {
		console.error('Login error:', error);
		generalError.set('Network error. Please check if the backend server is running.');
		password.set('');
	} finally {
		loading.set(false);
	}
} 