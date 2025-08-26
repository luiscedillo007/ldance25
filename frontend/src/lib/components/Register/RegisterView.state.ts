import { writable, get } from 'svelte/store';
import { userService, type User } from '$lib/services/userService';
import { PASSWORD_VALIDATION } from '$lib/constants';

/* Form state */
export const firstName = writable('');
export const lastName = writable('');
export const username = writable('');
export const password = writable('');
export const confirmPassword = writable('');

/* UI state */
export const loading = writable(false);
export const showPassword = writable(false);
export const showConfirmPassword = writable(false);

/* Errors and messages */
export const firstNameError = writable(false);
export const lastNameError = writable(false);
export const usernameError = writable(false);
export const passwordError = writable(false);
export const confirmPasswordError = writable(false);
export const generalError = writable('');

/* Result state */
export const success = writable(false);
export const createdUser = writable<User | null>(null);

/* Helpers */
export function validatePassword(pw: string): boolean {
	const longEnough = pw.length >= PASSWORD_VALIDATION.MIN_LENGTH;
	const hasSpecial = PASSWORD_VALIDATION.SPECIAL_CHAR_PATTERN.test(pw);
	const numbers = pw.match(PASSWORD_VALIDATION.NUMBER_PATTERN) || [];
	const hasEnoughNumbers = numbers.length >= PASSWORD_VALIDATION.REQUIRED_NUMBERS;
	return longEnough && hasSpecial && hasEnoughNumbers;
}

function normalizeName(s: string): string {
	const t = s.trim();
	if (!t) return '';
	return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/* Input handlers */
export function handleFirstNameInput(event: Event) {
	const v = (event.target as HTMLInputElement).value;
	firstName.set(normalizeName(v));
	if (v.trim()) firstNameError.set(false);
	generalError.set('');
}

export function handleLastNameInput(event: Event) {
	const v = (event.target as HTMLInputElement).value;
	lastName.set(normalizeName(v));
	if (v.trim()) lastNameError.set(false);
	generalError.set('');
}

export function handleUsernameInput(event: Event) {
	const v = (event.target as HTMLInputElement).value.toLowerCase();
	username.set(v);
	if (v.trim()) usernameError.set(false);
	if (get(generalError) !== 'Username already exists') generalError.set('');
}

export function handlePasswordInput(event: Event) {
	const v = (event.target as HTMLInputElement).value;
	password.set(v);
	if (v && validatePassword(v)) passwordError.set(false);
	generalError.set('');
}

export function handleConfirmPasswordInput(event: Event) {
	const v = (event.target as HTMLInputElement).value;
	confirmPassword.set(v);
	if (v && v === get(password)) {
		confirmPasswordError.set(false);
		generalError.set('');
	}
}

export function toggleShowPassword() {
	showPassword.update(v => !v);
}

/* Validation + submit */
function validateForm(): boolean {
	firstNameError.set(false);
	lastNameError.set(false);
	usernameError.set(false);
	passwordError.set(false);
	confirmPasswordError.set(false);
	generalError.set('');

	let ok = true;
	const missing: string[] = [];

	if (!get(firstName).trim()) { firstNameError.set(true); missing.push('First Name'); ok = false; }
	if (!get(lastName).trim()) { lastNameError.set(true); missing.push('Last Name'); ok = false; }
	if (!get(username).trim()) { usernameError.set(true); missing.push('Username'); ok = false; }
	if (!get(password)) { passwordError.set(true); missing.push('Password'); ok = false; }
	if (!get(confirmPassword)) { confirmPasswordError.set(true); missing.push('Confirm Password'); ok = false; }

	if (missing.length > 0) {
		generalError.set(`Please fill in: ${missing.join(', ')}`);
	}

	const pw = get(password);
	if (pw && !validatePassword(pw)) {
		passwordError.set(true);
		confirmPasswordError.set(true);
		generalError.set(`Password must be at least ${PASSWORD_VALIDATION.MIN_LENGTH} characters with ${PASSWORD_VALIDATION.REQUIRED_SPECIAL_CHARS} special character and ${PASSWORD_VALIDATION.REQUIRED_NUMBERS} numbers`);
		ok = false;
	}

	const cpw = get(confirmPassword);
	if (pw && cpw && pw !== cpw) {
		confirmPasswordError.set(true);
		generalError.set('Passwords do not match');
		ok = false;
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
		const fn = get(firstName);
		const ln = get(lastName);
		const res = await userService.register({
			firstName: normalizeName(fn),
			lastName: normalizeName(ln),
			username: get(username).trim().toLowerCase(),
			password: get(password)
		});

		if (res && res.success) {
			success.set(true);
			const user = res.data?.user || null;
			createdUser.set(user);
			firstName.set('');
			lastName.set('');
			username.set('');
			password.set('');
			confirmPassword.set('');
		} else {
			const err = res?.error || 'Failed to create account';
			if (String(err).includes('Username already exists')) {
				usernameError.set(true);
				generalError.set('Username already exists');
			} else {
				generalError.set(err);
			}
		}
	} catch {
		generalError.set('Network error. Please check if the backend server is running.');
	} finally {
		loading.set(false);
	}
} 