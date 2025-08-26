<!-- Dashboard - Main Optitrack control and visualization interface -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { loggedInUser } from '$lib/stores/userStore';
	import { optitrackClient, type TrackingData } from '$lib/OptitrackClient';
	import { VISUALIZATION, UI_CONFIG, TEST_TYPES, NAVIGATION, SITE_CONFIG } from '$lib/constants';
	import SiteSelector from '$lib/components/SiteSelector.svelte';
	import TestTypeSelector from '$lib/components/TestTypeSelector.svelte';
	import TestIntro from '$lib/components/TestIntro.svelte';
	import { selectedTestType, testTypeSelected } from '$lib/components/TestTypeSelector.state';
	import { selectedSite, siteSelected } from '$lib/components/SiteSelector.state';
	import { getImageForTestType } from '$lib/components/TestIntro.state';
	import ThankYou from '$lib/components/ThankYou.svelte';
	import DashboardHeader from '$lib/components/Headers/DashboardHeader.svelte';
	import SiteHeader from '$lib/components/Headers/SiteHeader.svelte';

	// Route protection
	onMount(() => {
		if (!$loggedInUser) {
			goto(NAVIGATION.ROUTES.HOME);
			return;
		}
		
		// Reset dashboard state on fresh login - but don't reset OptitrackClient
		// Let it maintain its connection but ensure it's not running
		showSiteSelector = true;
		showTestTypeSelector = false;
		showTestIntro = false;
		showThankYou = false;
		currentSite = null;
		currentTestType = null;
		currentTestTypeName = '';
		sessionId = '';
		
		// Only stop if it's currently running, don't disconnect
		if ($connectionStatus.isOptitrackRunning) {
			optitrackClient.stopOptitrack();
		}
	});

	// Reactive stores
	$: trackingData = optitrackClient.trackingData;
	$: connectionStatus = optitrackClient.connectionStatus;
	$: statusMessages = optitrackClient.statusMessages;
	$: dataFlowStatus = optitrackClient.dataFlowStatus;
	$: testCompletion = optitrackClient.testCompletion;

	// Component state
	let isStarting = false;
	let isStopping = false;
	let latestPosition: { x: number; y: number } | null = null;

	// Site and test type selection state
	let showSiteSelector = true;
	let showTestTypeSelector = false;
	let showTestIntro = false;
	let showThankYou = false;
	let currentSite: string | null = null;
	let currentTestType: string | null = null;
	let currentTestTypeName: string = '';
	let sessionId = '';

	// Handle site selection
	function handleSiteSelected(e: { site: string }) {
		currentSite = e.site;
		showSiteSelector = false;
		showTestTypeSelector = true;
		
		// Set site in OptitrackClient
		optitrackClient.setSite(e.site);
		
		console.log('Site selected:', e.site);
	}

	// Handle test type selection
	function handleTestTypeSelected(e: { testType: string }) {
		currentTestType = e.testType;
		showTestTypeSelector = false;
		showTestIntro = true;
		
		// Find the test type name for display
		const testTypeInfo = TEST_TYPES.AVAILABLE_TYPES.find(t => t.id === e.testType);
		currentTestTypeName = testTypeInfo ? testTypeInfo.name : e.testType;
		
		// Set test type in OptitrackClient
		optitrackClient.setTestType(currentTestTypeName);
		
		console.log('Test type selected:', e.testType);
	}

	// Handle start tracking from TestIntro
	function handleStartFromIntro() {
		showTestIntro = false;
		// The dashboard will now show with the selected test type
	}

	// Reset to site selection (for going back)
	function resetToSiteSelection() {
		showSiteSelector = true;
		showTestTypeSelector = false;
		showTestIntro = false;
		showThankYou = false;
		currentSite = null;
		currentTestType = null;
		currentTestTypeName = '';
		sessionId = '';
	}

	// Reset to test type selection (for going back from intro)
	function resetToTestTypeSelection() {
		showTestTypeSelector = true;
		showTestIntro = false;
		currentTestType = null;
		currentTestTypeName = '';
	}

	// Convert world coordinates to screen coordinates - Updated with axis inversion
	function worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
		// Apply axis inversion if enabled
		const effectiveX = VISUALIZATION.INVERT_X_AXIS ? -worldX : worldX;
		const effectiveY = VISUALIZATION.INVERT_Y_AXIS ? -worldY : worldY;
		
		// Convert to screen coordinates
		const screenX = ((effectiveX - VISUALIZATION.MIN_X) / (VISUALIZATION.MAX_X - VISUALIZATION.MIN_X)) * VISUALIZATION.CANVAS_WIDTH;
		const screenY = VISUALIZATION.CANVAS_HEIGHT - ((effectiveY - VISUALIZATION.MIN_Y) / (VISUALIZATION.MAX_Y - VISUALIZATION.MIN_Y)) * VISUALIZATION.CANVAS_HEIGHT;
		
		return { x: screenX, y: screenY };
	}

	// Generate grid lines
	function generateGridLines(): { x1: number; y1: number; x2: number; y2: number }[] {
		const lines = [];
		
		// Vertical lines
		for (let x = VISUALIZATION.MIN_X; x <= VISUALIZATION.MAX_X; x += VISUALIZATION.GRID_STEP) {
			const screenStart = worldToScreen(x, VISUALIZATION.MIN_Y);
			const screenEnd = worldToScreen(x, VISUALIZATION.MAX_Y);
			lines.push({
				x1: screenStart.x,
				y1: screenStart.y,
				x2: screenEnd.x,
				y2: screenEnd.y
			});
		}
		
		// Horizontal lines
		for (let y = VISUALIZATION.MIN_Y; y <= VISUALIZATION.MAX_Y; y += VISUALIZATION.GRID_STEP) {
		                const screenStart = worldToScreen(VISUALIZATION.MIN_X, y);
			const screenEnd = worldToScreen(VISUALIZATION.MAX_X, y);
			lines.push({
				x1: screenStart.x,
				y1: screenStart.y,
				x2: screenEnd.x,
				y2: screenEnd.y
			});
		}
		
		return lines;
	}

	// Function to calculate safe region coordinates - Fixed for axis inversion
	function getSafeRegionCoords() {
		const { MIN_X, MAX_X, MIN_Y, MAX_Y } = VISUALIZATION.SAFE_REGION;
		
		// Handle -Infinity and Infinity cases
		const safeMinX = MIN_X === -Infinity ? VISUALIZATION.MIN_X : Math.max(MIN_X, VISUALIZATION.MIN_X);
		const safeMaxX = MAX_X === Infinity ? VISUALIZATION.MAX_X : Math.min(MAX_X, VISUALIZATION.MAX_X);
		const safeMinY = MIN_Y === -Infinity ? VISUALIZATION.MIN_Y : Math.max(MIN_Y, VISUALIZATION.MIN_Y);
		const safeMaxY = MAX_Y === Infinity ? VISUALIZATION.MAX_Y : Math.min(MAX_Y, VISUALIZATION.MAX_Y);
		
		// Convert to screen coordinates (this handles inversion automatically)
		const topLeft = worldToScreen(safeMinX, safeMaxY);
		const bottomRight = worldToScreen(safeMaxX, safeMinY);
		
		// Calculate proper x, y, width, height regardless of inversion
		const x = Math.min(topLeft.x, bottomRight.x);
		const y = Math.min(topLeft.y, bottomRight.y);
		const width = Math.abs(bottomRight.x - topLeft.x);
		const height = Math.abs(bottomRight.y - topLeft.y);
		
		return { x, y, width, height };
	}

	// Function to calculate test region coordinates - Fixed for axis inversion
	function getTestRegionCoords() {
		const { MIN_X, MAX_X, MIN_Y, MAX_Y } = VISUALIZATION.TEST_REGION;
		
		// Handle -Infinity and Infinity cases for 2D visualization
		const testMinX = MIN_X === -Infinity ? VISUALIZATION.MIN_X : Math.max(MIN_X, VISUALIZATION.MIN_X);
		const testMaxX = MAX_X === Infinity ? VISUALIZATION.MAX_X : Math.min(MAX_X, VISUALIZATION.MAX_X);
		const testMinY = MIN_Y === -Infinity ? VISUALIZATION.MIN_Y : Math.max(MIN_Y, VISUALIZATION.MIN_Y);
		const testMaxY = MAX_Y === Infinity ? VISUALIZATION.MAX_Y : Math.min(MAX_Y, VISUALIZATION.MAX_Y);
		
		// Convert to screen coordinates (this handles inversion automatically)
		const topLeft = worldToScreen(testMinX, testMaxY);
		const bottomRight = worldToScreen(testMaxX, testMinY);
		
		// Calculate proper x, y, width, height regardless of inversion
		const x = Math.min(topLeft.x, bottomRight.x);
		const y = Math.min(topLeft.y, bottomRight.y);
		const width = Math.abs(bottomRight.x - topLeft.x);
		const height = Math.abs(bottomRight.y - topLeft.y);
		
		return { x, y, width, height };
	}

	// Modified handle start to check test type
	async function handleStart() {
		if (isStarting || $connectionStatus.isOptitrackRunning || !currentTestType) return;
		
		isStarting = true;
		try {
			await optitrackClient.startOptitrack();
		} finally {
			isStarting = false;
		}
	}

	// Handle stop button click
	async function handleStop() {
		if (isStopping || !$connectionStatus.isOptitrackRunning) return;
		
		isStopping = true;
		try {
			await optitrackClient.stopOptitrack();
		} finally {
			isStopping = false;
		}
	}

	// Update latest position when tracking data changes
	$: if ($trackingData.length > 0) {
		const latest = $trackingData[$trackingData.length - 1];
		latestPosition = { x: latest.pos.x, y: latest.pos.y };
	}

	// Get recent trail points
	$: trailPoints = $trackingData.map(data => worldToScreen(data.pos.x, data.pos.y));

	// Automatically switch from intro to dashboard when tracking starts
	$: if ($connectionStatus.isOptitrackRunning && showTestIntro) {
		showTestIntro = false;
	}

	// Watch for test completion
	$: if ($testCompletion.isTestCompleted && !showThankYou) {
		showThankYou = true;
		sessionId = $testCompletion.sessionId || Date.now().toString();
		console.log('Test completed - showing thank you screen');
	}

	// Cleanup on component destroy
	onDestroy(() => {
		// Don't disconnect here as other components might be using it
		// optitrackClient.disconnect();
	});
</script>

<svelte:head>
	<title>Optitrack Dashboard</title>
</svelte:head>

<!-- Add header before existing content -->
<DashboardHeader />

<!-- Add site header when site is selected but not on thank you page -->
{#if currentSite && !showSiteSelector && !showThankYou}
	<SiteHeader 
		selectedSite={currentSite} 
		isActive={$connectionStatus.isOptitrackRunning}
	/>
{/if}

<!-- Show site selector first, then test type selector, then rest -->
{#if showThankYou}
	<!-- Thank You Screen -->
	<ThankYou 
		testType={$testCompletion.testType || currentTestType || 'Unknown'}
		sessionId={$testCompletion.sessionId || sessionId}
	/>
{:else if showSiteSelector}
	<SiteSelector onSiteSelected={handleSiteSelected} />
{:else if showTestTypeSelector}
	<TestTypeSelector onTestTypeSelected={handleTestTypeSelected} />
{:else if showTestIntro}
	<!-- Show test introduction with image -->
	<div class="min-h-screen bg-white p-8">
		<div class="max-w-6xl mx-auto">
			<!-- Header -->
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Optitrack Dashboard</h1>
				<p class="text-gray-600">Real-time motion capture visualization</p>
			</div>

			<!-- Status Bar -->
			<div class="bg-gray-50 border border-gray-300 p-4 mb-6">
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center space-x-4">
						<!-- Back Button to Test Type -->
						<button 
							on:click={resetToTestTypeSelection}
							class="px-4 py-2 border font-medium text-sm transition-colors duration-200 bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
							title="Go back to test type selection"
						>
							← Back
						</button>

						<!-- Test Type Display -->
						<div class="flex items-center">
							<span class="text-sm font-medium mr-2">Test Type:</span>
							<span class="text-sm font-semibold text-blue-900">{currentTestTypeName}</span>
						</div>
						
						<div class="flex items-center">
							<div class="w-3 h-3 rounded-full mr-2 {$connectionStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}"></div>
							<span class="text-sm font-medium">
								Server: {$connectionStatus.isConnected ? 'Connected' : 'Disconnected'}
							</span>
						</div>
						<div class="flex items-center">
							<div class="w-3 h-3 rounded-full mr-2 {$connectionStatus.isOptitrackRunning ? 'bg-green-500' : 'bg-gray-400'}"></div>
							<span class="text-sm font-medium">
								Optitrack: {$connectionStatus.autoReconnecting ? 'Auto-reconnecting...' : $connectionStatus.isOptitrackRunning ? 'Running' : 'Stopped'}
							</span>
						</div>
						<!-- Data Flow Indicator -->
						<div class="flex items-center">
							<div class="w-3 h-3 rounded-full mr-2 {$dataFlowStatus.isReceivingData ? 'bg-green-500 animate-pulse' : 'bg-red-500'}"></div>
							<span class="text-sm font-medium">
								Data: {$dataFlowStatus.isReceivingData ? 'Flowing' : 'Stopped'} ({$dataFlowStatus.frameCount} frames)
							</span>
						</div>
						<!-- Test Recording Indicator -->
						<div class="flex items-center">
							<div class="w-3 h-3 rounded-full mr-2 {
								$connectionStatus.testState === 'started' ? 'bg-green-500' :
								$connectionStatus.testState === 'waiting_to_stop' ? 'bg-yellow-500 animate-pulse' :
								$connectionStatus.testState === 'can_stop' ? 'bg-orange-500 animate-pulse' :
								'bg-red-500'
							}"></div>
							<span class="text-sm font-medium">
								Test-Recording: {
									$connectionStatus.testState === 'started' ? 'Active' :
									$connectionStatus.testState === 'waiting_to_stop' ? 'Exiting...' :
									$connectionStatus.testState === 'can_stop' ? 'Ready to Stop' :
									'Standby'
								}
							</span>
						</div>
					</div>
					
					<!-- Control Button -->
					<div>
						{#if !$connectionStatus.isOptitrackRunning}
							<button
								on:click={() => { handleStart(); showTestIntro = false; }}
								disabled={isStarting || !$connectionStatus.isConnected || !currentTestType}
								class="px-4 py-2 border font-medium text-sm transition-colors duration-200 
									{isStarting || !$connectionStatus.isConnected || !currentTestType
										? 'bg-gray-400 text-gray-200 cursor-not-allowed border-gray-400' 
										: 'bg-green-500 hover:bg-green-600 text-white border-green-500'}"
							>
								{isStarting ? 'Starting...' : 'Start Tracking'}
							</button>
						{:else}
							<!-- If tracking is running, automatically switch to main dashboard -->
							{showTestIntro = false}
						{/if}
					</div>
				</div>

				<!-- Status Messages -->
				{#if $statusMessages.length > 0}
					<div class="border-t border-gray-300 pt-4">
						<h4 class="text-sm font-semibold text-gray-700 mb-2">Recent Messages</h4>
						<div class="bg-white border border-gray-200 p-3 max-h-32 overflow-y-auto">
							{#each $statusMessages.slice(-5) as message}
								<div class="text-xs mb-1">
									<span class="text-gray-500">{new Date().toLocaleTimeString()}:</span>
									<span class="{message.type === 'error' ? 'text-red-600' : message.type === 'success' ? 'text-green-600' : 'text-gray-700'}">
										{message.message}
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Test Introduction Component (only show if not tracking) -->
			{#if !$connectionStatus.isOptitrackRunning}
				<TestIntro 
					testType={currentTestType || ''} 
					testTypeName={currentTestTypeName}
				/>
			{/if}
		</div>
	</div>
{:else}
	<!-- Main dashboard with 2D canvas -->
	<div class="min-h-screen bg-white p-8">
		<div class="max-w-6xl mx-auto">
			<!-- Simplified Header -->
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Optitrack Dashboard</h1>
				<p class="text-gray-600">Real-time motion capture visualization</p>
			</div>

			<!-- Status Bar with Test Type -->
			<div class="bg-gray-50 border border-gray-300 p-4 mb-6">
				<div class="flex items-center justify-between mb-4">
					<div class="flex items-center space-x-4">
						<!-- Back Button - First item, same style as tracking button -->
						<button 
							on:click={resetToSiteSelection}
							class="px-4 py-2 border font-medium text-sm transition-colors duration-200 
								{$connectionStatus.isOptitrackRunning 
									? 'bg-gray-400 text-gray-200 cursor-not-allowed border-gray-400' 
									: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'}"
							disabled={$connectionStatus.isOptitrackRunning}
							title="Go back to site selection"
						>
							← Back
						</button>

						<!-- Site Display -->
						<div class="flex items-center">
							<span class="text-sm font-medium mr-2">Site:</span>
							<span class="text-sm font-semibold text-blue-900">{currentSite || 'N/A'}</span>
						</div>
						
						<div class="flex items-center">
							<div class="w-3 h-3 rounded-full mr-2 {$connectionStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}"></div>
							<span class="text-sm font-medium">
								Server: {$connectionStatus.isConnected ? 'Connected' : 'Disconnected'}
							</span>
						</div>
						<div class="flex items-center">
							<div class="w-3 h-3 rounded-full mr-2 {$connectionStatus.isOptitrackRunning ? 'bg-green-500' : 'bg-gray-400'}"></div>
							<span class="text-sm font-medium">
								Optitrack: {$connectionStatus.autoReconnecting ? 'Auto-reconnecting...' : $connectionStatus.isOptitrackRunning ? 'Running' : 'Stopped'}
							</span>
						</div>
						<!-- Data Flow Indicator -->
						<div class="flex items-center">
							<div class="w-3 h-3 rounded-full mr-2 {$dataFlowStatus.isReceivingData ? 'bg-green-500 animate-pulse' : 'bg-red-500'}"></div>
							<span class="text-sm font-medium">
								Data: {$dataFlowStatus.isReceivingData ? 'Flowing' : 'Stopped'} ({$dataFlowStatus.frameCount} frames)
							</span>
						</div>
						<!-- Update the Test Recording Indicator -->
						<div class="flex items-center">
							<div class="w-3 h-3 rounded-full mr-2 {
								$connectionStatus.testState === 'started' ? 'bg-green-500' :
								$connectionStatus.testState === 'waiting_to_stop' ? 'bg-yellow-500 animate-pulse' :
								$connectionStatus.testState === 'can_stop' ? 'bg-orange-500 animate-pulse' :
								'bg-red-500'
							}"></div>
							<span class="text-sm font-medium">
								Test-Recording: {
									$connectionStatus.testState === 'started' ? 'Active' :
									$connectionStatus.testState === 'waiting_to_stop' ? 'Exiting...' :
									$connectionStatus.testState === 'can_stop' ? 'Ready to Stop' :
									'Standby'
								}
							</span>
						</div>
					</div>
					
					<!-- Control Button - Updated with test type check -->
					<div>
						{#if !$connectionStatus.isOptitrackRunning}
							<button
								on:click={handleStart}
								disabled={isStarting || !$connectionStatus.isConnected || !currentTestType}
								class="px-4 py-2 border font-medium text-sm transition-colors duration-200 
									{isStarting || !$connectionStatus.isConnected || !currentTestType
										? 'bg-gray-400 text-gray-200 cursor-not-allowed border-gray-400' 
										: 'bg-green-500 hover:bg-green-600 text-white border-green-500'}"
							>
								{isStarting ? 'Starting...' : 'Start Tracking'}
							</button>
						{:else}
							<button
								on:click={handleStop}
								disabled={isStopping}
								class="px-4 py-2 border font-medium text-sm transition-colors duration-200 
									{isStopping 
										? 'bg-gray-400 text-gray-200 cursor-not-allowed border-gray-400' 
										: 'bg-red-500 hover:bg-red-600 text-white border-red-500'}"
							>
								{isStopping ? 'Stopping...' : 'Stop Tracking'}
							</button>
						{/if}
					</div>
				</div>

				<!-- Status Messages inside the same card -->
				{#if $statusMessages.length > 0}
					<div class="border-t border-gray-300 pt-4">
						<h4 class="text-sm font-semibold text-gray-700 mb-2">Recent Messages</h4>
						<div class="bg-white border border-gray-200 p-3 max-h-32 overflow-y-auto">
							{#each $statusMessages.slice(-5) as message}
								<div class="text-xs mb-1">
									<span class="text-gray-500">{new Date().toLocaleTimeString()}:</span>
									<span class="{message.type === 'error' ? 'text-red-600' : message.type === 'success' ? 'text-green-600' : 'text-gray-700'}">
										{message.message}
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- TestIntro Component (when not tracking) -->
			{#if !$connectionStatus.isOptitrackRunning}
				<TestIntro 
					testType={currentTestType || ''} 
					testTypeName={currentTestTypeName}
				/>
			{/if}

			<!-- Visualization Area -->
			{#if $connectionStatus.isOptitrackRunning}
				<div class="flex justify-center items-start min-h-[calc(100vh-300px)] gap-6">
					<!-- Main 2D Canvas -->
					<div class="bg-stone-100 p-6 w-full max-w-4xl shadow-lg">
						<div class="bg-white border border-gray-300 p-6 flex justify-center items-center">
							<svg 
								width={VISUALIZATION.CANVAS_WIDTH} 
								height={VISUALIZATION.CANVAS_HEIGHT}
								class="border border-black max-w-full h-auto" 
								style="background-color: {VISUALIZATION.COLORS.BACKGROUND}"
								viewBox="0 0 {VISUALIZATION.CANVAS_WIDTH} {VISUALIZATION.CANVAS_HEIGHT}"
							>
								<!-- Grid Lines -->
								{#if VISUALIZATION.SHOW_GRID}
									{#each generateGridLines() as line}
										<line
											x1={line.x1}
											y1={line.y1}
											x2={line.x2}
											y2={line.y2}
											stroke={VISUALIZATION.COLORS.GRID_LINES}
											stroke-width="1"
										/>
									{/each}
								{/if}

								<!-- Safe Region Overlay -->
								{#if VISUALIZATION.SAFE_REGION.ENABLED}
									{@const safeRegion = getSafeRegionCoords()}
									<rect
										x={safeRegion.x}
										y={safeRegion.y}
										width={safeRegion.width}
										height={safeRegion.height}
										fill={VISUALIZATION.SAFE_REGION.COLOR}
										opacity={VISUALIZATION.SAFE_REGION.OPACITY}
									/>
								{/if}

								<!-- Test Region Overlay -->
								{#if VISUALIZATION.TEST_REGION.ENABLED}
                                    {@const testRegion = getTestRegionCoords()}
									<rect
										x={testRegion.x}
										y={testRegion.y}
										width={testRegion.width}
										height={testRegion.height}
										fill={VISUALIZATION.TEST_REGION.COLOR}
										opacity={VISUALIZATION.TEST_REGION.OPACITY}
									/>
								{/if}

								<!-- Axis Lines -->
								{#if VISUALIZATION.SHOW_ORIGIN}
									<!-- X-axis -->
									{@const xAxisY = worldToScreen(0, 0).y}
									<line
										x1="0"
										y1={xAxisY}
										x2={VISUALIZATION.CANVAS_WIDTH}
										y2={xAxisY}
										stroke={VISUALIZATION.COLORS.AXIS_LINES}
										stroke-width="2"
									/>
									
									<!-- Y-axis -->
									{@const yAxisX = worldToScreen(0, 0).x}
									<line
										x1={yAxisX}
										y1="0"
										x2={yAxisX}
										y2={VISUALIZATION.CANVAS_HEIGHT}
										stroke={VISUALIZATION.COLORS.AXIS_LINES}
										stroke-width="2"
									/>

									<!-- Origin point - Black dot -->
									{@const origin = worldToScreen(0, 0)}
									<circle
										cx={origin.x}
										cy={origin.y}
										r="4"
										fill="black"
									/>
								{/if}

								<!-- Trail -->
								{#if trailPoints.length > 1}
									{#each trailPoints.slice(0, -1) as point, i}
										<circle
											cx={point.x}
											cy={point.y}
											r={2 + (i / trailPoints.length) * 4}
											fill={VISUALIZATION.COLORS.TRAIL}
											opacity={0.3 + (i / trailPoints.length) * 0.7}
										/>
									{/each}
								{/if}

								<!-- Current Position -->
								{#if latestPosition}
									{@const screenPos = worldToScreen(latestPosition.x, latestPosition.y)}
									<circle
										cx={screenPos.x}
										cy={screenPos.y}
										r={VISUALIZATION.POINT_RADIUS}
										fill={VISUALIZATION.COLORS.POINT}
										stroke="white"
										stroke-width="2"
									/>
								{/if}
							</svg>
						</div>
					</div>

					<!-- Side Test Image (even larger) -->
					<div class="bg-stone-100 shadow-lg flex-shrink-0 inline-block">
						<div class="bg-white border border-gray-300">
							<div class="text-center p-2">
								<h4 class="text-sm font-semibold text-gray-800 mb-1">{currentTestTypeName}</h4>
								<p class="text-xs text-gray-600">Test Setup Reference</p>
							</div>
							
							<div class="w-[28rem] h-96 bg-gray-100 flex items-center justify-center">
								{#if currentTestType}
									{@const img = getImageForTestType(currentTestType)}
									<img 
										src={img.src} 
										alt={img.alt} 
										class="max-w-full max-h-full object-contain" 
										on:error={() => {}}
									/>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
