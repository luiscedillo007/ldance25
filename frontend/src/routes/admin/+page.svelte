<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { loggedInUser } from '$lib/stores/userStore';
	import { API_CONFIG, NAVIGATION } from '$lib/constants';
	import DashboardHeader from '$lib/components/Headers/DashboardHeader.svelte';
	
	interface Session {
		sessionId: string;
		testType: string;
		testSite: string; // Add this back
		createdAt: string;
		score: number | null;
		feedback: string | null;
		hasScore: boolean;
		user: {
			username: string;
			firstName: string;
			lastName: string;
			uniqueId: string;
		} | null;
	}
	
	let sessions: Session[] = [];
	let selectedSession: Session | null = null;
	let score = '';
	let feedback = '';
	let isSubmitting = false;
	let submitted = false;
	let loading = true;
	let backendUrl = API_CONFIG.BASE_URL;
	
	// Route protection and backend URL detection
	onMount(() => {
		// Detect correct backend URL
		const currentHost = window.location.hostname;
		if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
			const url = new URL(API_CONFIG.BASE_URL);
			backendUrl = `${url.protocol}//${currentHost}:${url.port}`;
		}
		
		console.log('Backend URL detected:', backendUrl);
		
		if (!$loggedInUser || $loggedInUser.username !== 'admin') {
			goto(NAVIGATION.ROUTES.HOME);
			return;
		}
		
		// Load sessions after auth check
		loadSessions();
	});
	
	async function loadSessions() {
		loading = true;
		try {
			const response = await fetch(`${backendUrl}/api/admin/sessions`);
			const result = await response.json();
			
			if (result.success) {
				sessions = result.data.sessions;
			} else {
				alert('Failed to load sessions: ' + result.error);
			}
		} catch (error) {
			alert('Error loading sessions: ' + error);
		} finally {
			loading = false;
		}
	}
	
	async function submitScore() {
		if (!score || !selectedSession) return;
		
		isSubmitting = true;
		try {
			const response = await fetch(`${backendUrl}/api/admin/submit-score`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					score: parseFloat(score),
					feedback: feedback.trim(),
					sessionId: selectedSession.sessionId
				})
			});
			
			const result = await response.json();
			if (result.success) {
				submitted = true;
				// Refresh sessions to show updated score
				await loadSessions();
			} else {
				alert('Failed to submit score: ' + result.error);
			}
		} catch (error) {
			alert('Error submitting score: ' + error);
		} finally {
			isSubmitting = false;
		}
	}

	async function deleteSession(sessionId: string) {
		if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
			return;
		}
		
		try {
			const response = await fetch(`${backendUrl}/api/admin/sessions/${sessionId}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' }
			});
			
			const result = await response.json();
			if (result.success) {
				// Refresh sessions list
				await loadSessions();
				// Clear selection if deleted session was selected
				if (selectedSession?.sessionId === sessionId) {
					selectedSession = null;
					score = '';
					feedback = '';
					submitted = false;
				}
			} else {
				alert('Failed to delete session: ' + result.error);
			}
		} catch (error) {
			alert('Error deleting session: ' + error);
		}
	}
	
	function selectSession(session: Session) {
		selectedSession = session;
		score = '';
		feedback = '';
		submitted = false;
	}
	
	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleString();
	}
</script>

<svelte:head>
	<title>Admin Dashboard - Score Submission</title>
</svelte:head>

<DashboardHeader isAdminView={true} />

<div class="min-h-screen bg-white p-8">
	<div class="max-w-6xl mx-auto">
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
			<p class="text-gray-600">Select a user session and submit their test score</p>
		</div>

		{#if loading}
			<div class="text-center py-8">
				<p class="text-gray-600">Loading sessions...</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<!-- Sessions List -->
				<div class="bg-stone-100 p-6 shadow-lg">
					<div class="bg-white border border-gray-300 p-6">
						<div class="flex justify-between items-center mb-6">
							<h2 class="text-xl font-semibold text-gray-800">User Sessions</h2>
							<button 
								on:click={loadSessions}
								class="bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700"
							>
								Refresh
							</button>
						</div>
						
						{#if sessions.length === 0}
							<p class="text-gray-600 text-center py-8">No sessions found</p>
						{:else}
							<div class="space-y-3 max-h-96 overflow-y-auto">
								{#each sessions as session}
									<div
										class="w-full text-left p-4 border border-gray-200 hover:bg-gray-50 cursor-pointer
											{selectedSession?.sessionId === session.sessionId ? 'bg-blue-50 border-blue-300' : ''}"
										on:click={() => selectSession(session)}
										on:keydown={(e) => e.key === 'Enter' && selectSession(session)}
										role="button"
										tabindex="0"
									>
										<div class="flex justify-between items-start">
											<div class="flex-1">
												<div class="flex items-center gap-2 mb-1">
													<span class="font-medium text-gray-900">
														{session.user ? `${session.user.firstName} ${session.user.lastName}` : 'Anonymous User'}
													</span>
													<span class="text-sm text-gray-500">@{session.user?.username || 'unknown'}</span>
												</div>
												<!-- Test Type Display (keep this, don't replace with site) -->
												<div class="flex items-center">
													<span class="text-sm font-medium mr-2">Test Type:</span>
													<span class="text-sm font-semibold text-blue-900">{session.testType}</span>
												</div>
												<p class="text-sm text-gray-500">
													{formatDate(session.createdAt)}
													{#if session.hasScore}
														• Score: {session.score}
													{/if}
												</p>
											</div>
											
											<!-- Delete button -->
											<button
												class="ml-4 p-2 text-red-600 hover:bg-red-50 rounded"
												on:click|stopPropagation={() => deleteSession(session.sessionId)}
												title="Delete session"
												aria-label="Delete session"
											>
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
												</svg>
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- Score Submission -->
				<div class="bg-stone-100 p-6 shadow-lg">
					<div class="bg-white border border-gray-300 p-6">
						{#if !selectedSession}
							<div class="text-center py-8">
								<p class="text-gray-600">Select a session from the left to submit a score</p>
							</div>
						{:else}
							<h2 class="text-xl font-semibold text-gray-800 mb-6">Submit Score</h2>
							
							<!-- Selected Session Info -->
							<div class="bg-blue-50 border border-blue-200 p-4 mb-6 rounded">
								<p class="font-medium text-blue-900">
									{selectedSession.user ? `${selectedSession.user.firstName} ${selectedSession.user.lastName}` : 'Anonymous User'}
								</p>
								<p class="text-sm text-blue-700">Test: {selectedSession.testType || 'Unknown'}</p>
								<p class="text-sm text-blue-700">Session: {selectedSession.sessionId}</p>
								<p class="text-xs text-blue-600">{formatDate(selectedSession.createdAt)}</p>
							</div>

							{#if !submitted}
								<div class="space-y-4">
									<div>
										<label for="score-input" class="block text-sm font-medium text-gray-700 mb-2">
											Score (0-100)
										</label>
										<input 
											id="score-input"
											type="number" 
											bind:value={score}
											min="0" 
											max="100" 
											step="0.1"
											class="w-full border border-gray-300 p-3 text-lg"
											placeholder="Enter score..."
										/>
									</div>
									
									<div>
										<label for="feedback-input" class="block text-sm font-medium text-gray-700 mb-2">
											Feedback (Optional)
										</label>
										<textarea 
											id="feedback-input"
											bind:value={feedback}
											rows="4"
											class="w-full border border-gray-300 p-3"
											placeholder="Additional comments or feedback..."
										></textarea>
									</div>
									
									<button 
										on:click={submitScore}
										disabled={isSubmitting || !score || score === ''}
										class="w-full bg-green-600 text-white px-6 py-3 text-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
									>
										{isSubmitting ? 'Submitting...' : 'Submit Score'}
									</button>
								</div>
							{:else}
								<div class="text-center py-8">
									<div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
										<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
										</svg>
									</div>
									<h3 class="text-xl font-bold text-green-600 mb-2">Score Submitted!</h3>
									<p class="text-gray-600 mb-4">The participant will receive their score shortly.</p>
									<button 
										on:click={() => { selectedSession = null; submitted = false; }}
										class="bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
									>
										Submit Another Score
									</button>
								</div>
							{/if}
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>