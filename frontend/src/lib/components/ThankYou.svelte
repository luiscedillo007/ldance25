<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { API_CONFIG } from '../constants';
	import { io, type Socket } from 'socket.io-client';
	import { optitrackClient } from '$lib/OptitrackClient';
	
	export let testType: string;
	export let sessionId: string;
	
	let socket: Socket | null = null;
	let scoreReceived = false;
	let userScore: number | null = null;
	let scoreFeedback = '';
	
	onMount(async () => {
		// Stop OptiTrack and disconnect when showing thank you
		await optitrackClient.stopOptitrack();
		optitrackClient.disconnect();
		
		// Connect to WebSocket to listen for scores
		try {
			socket = io(API_CONFIG.WEBSOCKET_URL);
			
			socket.on('score-received', (data) => {
				if (data.sessionId === sessionId) {
					scoreReceived = true;
					userScore = data.score;
					scoreFeedback = data.feedback || '';
				}
			});
			
			console.log('Connected to score updates for session:', sessionId);
		} catch (error) {
			console.error('Failed to connect to score updates:', error);
		}
	});
	
	onDestroy(() => {
		if (socket) {
			socket.disconnect();
		}
	});
</script>

<div class="flex justify-center items-center min-h-[calc(100vh-120px)] py-8">
	<div class="bg-white border border-gray-300 p-8 w-11/12 max-w-md text-center">
		{#if !scoreReceived}
			<!-- Waiting for score -->
			<div class="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
				<svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
				</svg>
			</div>
			
			<h1 class="text-4xl font-bold text-green-600 mb-4">Thank You!</h1>
			<p class="text-xl text-gray-700 mb-6">Your {testType} test has been completed successfully.</p>
			
			<div class="bg-blue-50 border border-blue-200 p-6 rounded mb-6">
				<p class="text-blue-800 font-medium mb-2">Your test is being evaluated...</p>
				<p class="text-blue-700 text-sm">Please wait while our team reviews your performance and calculates your score.</p>
			</div>
			
			<div class="animate-pulse">
				<p class="text-gray-600">⏳ Waiting for your score...</p>
			</div>
		{:else}
			<!-- Score received -->
			<div class="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
				<svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
				</svg>
			</div>
			
			<h1 class="text-4xl font-bold text-blue-600 mb-4">Your Score</h1>
			
			<div class="bg-green-50 border border-green-200 p-6 rounded mb-6">
				<p class="text-6xl font-bold text-green-600 mb-2">{userScore}</p>
				<p class="text-green-700 font-medium">out of 100</p>
			</div>
			
			{#if scoreFeedback}
				<div class="bg-gray-50 border border-gray-200 p-4 rounded mb-6">
					<p class="text-gray-800 font-medium mb-2">Feedback:</p>
					<p class="text-gray-700">{scoreFeedback}</p>
				</div>
			{/if}
			
			<p class="text-gray-600 mb-6">Thank you for participating in the {testType} evaluation!</p>
			
			<button 
				on:click={() => window.location.reload()}
				class="bg-blue-600 text-white px-6 py-3 hover:bg-blue-700"
			>
				Take Another Test
			</button>
		{/if}
	</div>
</div>