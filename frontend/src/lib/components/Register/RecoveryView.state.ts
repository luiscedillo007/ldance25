import { writable, get } from 'svelte/store';
import { userService, type User } from '$lib/services/userService';
import { PASSWORD_VALIDATION } from '$lib/constants';

export const accountId = writable('');
export const newPassword = writable('');
export const confirmPassword = writable('');

export const loading = writable(false);
export const showPassword = writable(false);
export const step = writable(1); // 1 or 2
export const user = writable<User | null>(null);

export const accountIdError = writable(false);
export const passwordError = writable(false);
export const confirmPasswordError = writable(false);

export const generalError = writable('');
export const success = writable(false);

export function validatePassword(pw: string) {
	const longEnough = pw.length >= PASSWORD_VALIDATION.MIN_LENGTH;
	const hasSpecial = PASSWORD_VALIDATION.SPECIAL_CHAR_PATTERN.test(pw);
	const numbers = pw.match(PASSWORD_VALIDATION.NUMBER_PATTERN) || [];
	const hasNumbers = numbers.length >= PASSWORD_VALIDATION.REQUIRED_NUMBERS;
	return longEnough && hasSpecial && hasNumbers;
}

export function clearFieldError(field: 'accountId' | 'newPassword' | 'confirmPassword', values?: { accountId?: string; newPassword?: string; confirmPassword?: string }) {
	if (field === 'accountId' && values?.accountId?.trim()) {
		accountIdError.set(false);
		generalError.set('');
	}
	if (field === 'newPassword' && values?.newPassword && validatePassword(values.newPassword)) {
		passwordError.set(false);
		generalError.set('');
	}
	if (field === 'confirmPassword' && values?.confirmPassword && values?.newPassword === values?.confirmPassword) {
		confirmPasswordError.set(false);
		generalError.set('');
	}
}

function validateStep1(val: { accountId: string }) {
	accountIdError.set(false);
	generalError.set('');
	if (!val.accountId.trim()) {
		accountIdError.set(true);
		generalError.set('Please enter your account ID');
		return false;
	}
	return true;
}

function validateStep2(val: { newPassword: string; confirmPassword: string }) {
	passwordError.set(false);
	confirmPasswordError.set(false);
	generalError.set('');

	let ok = true;
	const missing: string[] = [];

	if (!val.newPassword) { passwordError.set(true); missing.push('New Password'); ok = false; }
	if (!val.confirmPassword) { confirmPasswordError.set(true); missing.push('Confirm Password'); ok = false; }

	if (missing.length) {
		generalError.set(`Please fill in: ${missing.join(', ')}`);
	}

	if (val.newPassword && !validatePassword(val.newPassword)) {
		passwordError.set(true);
		confirmPasswordError.set(true);
		generalError.set(`Password must be at least ${PASSWORD_VALIDATION.MIN_LENGTH} characters with ${PASSWORD_VALIDATION.REQUIRED_SPECIAL_CHARS} special character and ${PASSWORD_VALIDATION.REQUIRED_NUMBERS} numbers`);
		ok = false;
	}

	if (val.newPassword && val.confirmPassword && val.newPassword !== val.confirmPassword) {
		confirmPasswordError.set(true);
		generalError.set('Passwords do not match');
		ok = false;
	}

	return ok;
}

export async function handleStep1Submit(e: Event, val: { accountId: string }) {
	e.preventDefault();
	loading.set(true);
	if (!validateStep1(val)) { loading.set(false); return; }
	try {
		const res = await userService.verifyAccount(val.accountId.trim());
		if (res.success) {
			user.set(res.data?.user || null);
			step.set(2);
			generalError.set('');
		} else {
			accountIdError.set(true);
			generalError.set(res.error || 'Invalid account ID');
		}
	} catch {
		generalError.set('Network error. Please check if the backend server is running.');
	} finally {
		loading.set(false);
	}
}

export async function handleStep2Submit(e: Event, val: { accountId: string; newPassword: string; confirmPassword: string }) {
	e.preventDefault();
	loading.set(true);
	if (!validateStep2(val)) { loading.set(false); return; }
	try {
		const res = await userService.resetPassword(val.accountId.trim(), val.newPassword);
		if (res.success) {
			success.set(true);
			generalError.set('');
		} else {
			generalError.set(res.error || 'Failed to reset password');
		}
	} catch {
		generalError.set('Network error. Please check if the backend server is running.');
	} finally {
		loading.set(false);
	}
}

export function goBackToStep1() {
	step.set(1);
	user.set(null);
	newPassword.set('');
	confirmPassword.set('');
	passwordError.set(false);
	confirmPasswordError.set(false);
	generalError.set('');
	success.set(false);
} 