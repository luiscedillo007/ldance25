// userService.ts - Frontend user service with dynamic backend URL support
import { API_CONFIG } from '../constants';

export interface RegisterData {
	firstName: string;
	lastName: string;
	username: string;
	password: string;
}

export interface LoginData {
	username: string;
	password: string;
}

export interface User {
	username: string;
	firstName: string;
	lastName: string;
	uniqueId: string;
	createdAt: string;
}

export interface RegisterResponse {
	success: boolean;
	data?: {
		user: User;
	};
	error?: string;
}

export interface LoginResponse {
	success: boolean;
	data?: {
		user: User;
		isAdmin: boolean;
	};
	error?: string;
}

class UserService {
	// Helper to get correct backend URL
	private getBackendUrl(): string {
		const currentHost = window.location.hostname;
		if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
			const url = new URL(API_CONFIG.BASE_URL);
			return `${url.protocol}//${currentHost}:${url.port}`;
		}
		return API_CONFIG.BASE_URL;
	}

	async register(userData: RegisterData): Promise<RegisterResponse> {
		try {
			const backendUrl = this.getBackendUrl();
			const response = await fetch(`${backendUrl}${API_CONFIG.ENDPOINTS.REGISTER}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(userData)
			});

			const result = await response.json();
			return result;
		} catch (error) {
			return {
				success: false,
				error: 'Network error. Please check if the backend server is running.'
			};
		}
	}

	async login(loginData: LoginData): Promise<LoginResponse> {
		try {
			const backendUrl = this.getBackendUrl();
			const response = await fetch(`${backendUrl}${API_CONFIG.ENDPOINTS.LOGIN}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(loginData)
			});

			const result = await response.json();
			return result;
		} catch (error) {
			return {
				success: false,
				error: 'Network error. Please check if the backend server is running.'
			};
		}
	}

	async verifyAccount(accountId: string): Promise<{ success: boolean; data?: { user: User }; error?: string }> {
		try {
			const backendUrl = this.getBackendUrl();
			const response = await fetch(`${backendUrl}${API_CONFIG.ENDPOINTS.VERIFY_ACCOUNT}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ accountId })
			});

			const result = await response.json();
			return result;
		} catch (error) {
			return {
				success: false,
				error: 'Network error. Please check if the backend server is running.'
			};
		}
	}

	async resetPassword(accountId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
		try {
			const backendUrl = this.getBackendUrl();
			const response = await fetch(`${backendUrl}${API_CONFIG.ENDPOINTS.RESET_PASSWORD}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ accountId, newPassword })
			});

			const result = await response.json();
			return result;
		} catch (error) {
			return {
				success: false,
				error: 'Network error. Please check if the backend server is running.'
			};
		}
	}
}

export const userService = new UserService(); 