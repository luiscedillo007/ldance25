import { writable } from 'svelte/store';

export interface User {
	username: string;
	firstName: string;
	lastName: string;
	uniqueId: string;
	createdAt: string;
}

export const loggedInUser = writable<User | null>(null); 