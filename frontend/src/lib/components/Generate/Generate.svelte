<script lang="ts">
	import {
		lat0, lon0, ground_msl, local_xy_mode, heading_true_deg, testType,
		loading, errorMessage, generationResult, downloadUrls, submitGenerate
	} from './Generate.state';
	import { KML_CONFIG, TEST_TYPES } from '$lib/constants';
	import DashboardHeader from '$lib/components/Headers/DashboardHeader.svelte';
</script>

<svelte:head>
	<title>Generate KML & Plan</title>
</svelte:head>

<DashboardHeader />

<div class="flex justify-center items-start py-6">
	<div class="w-11/12 max-w-2xl">
		<form class="bg-stone-100 p-6 md:p-8 shadow-lg" on:submit|preventDefault={submitGenerate}>
			<h1 class="text-xl md:text-3xl font-bold mb-3 md:mb-6 text-center">Generate KML & Plan Files</h1>
			<div class="w-24 md:w-32 h-0.5 bg-blue-900 mx-auto mb-6 md:mb-8"></div>

			{#if $errorMessage}
				<div class="mb-4 p-3 text-center bg-red-50 border border-red-200 text-red-700">{$errorMessage}</div>
			{/if}

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label for="lat0" class="block text-sm font-medium text-gray-700 mb-1">Latitude (lat0)</label>
					<input 
						id="lat0" 
						class="w-full border border-gray-300 px-3 py-2" 
						type="number" 
						step="any" 
						bind:value={$lat0} 
					/>
				</div>
				<div>
					<label for="lon0" class="block text-sm font-medium text-gray-700 mb-1">Longitude (lon0)</label>
					<input 
						id="lon0" 
						class="w-full border border-gray-300 px-3 py-2" 
						type="number" 
						step="any" 
						bind:value={$lon0} 
					/>
				</div>

				<div>
					<label for="ground-msl" class="block text-sm font-medium text-gray-700 mb-1">Ground MSL (meters)</label>
					<input 
						id="ground-msl" 
						class="w-full border border-gray-300 px-3 py-2" 
						type="number" 
						step="any" 
						bind:value={$ground_msl} 
					/>
				</div>
				<div>
					<label for="local-xy" class="block text-sm font-medium text-gray-700 mb-1">Local XY Mode</label>
					<select id="local-xy" class="w-full border border-gray-300 px-3 py-2" bind:value={$local_xy_mode}>
						{#each KML_CONFIG.LOCAL_XY_MODES as mode}
							<option value={mode.value}>{mode.label}</option>
						{/each}
					</select>
				</div>

				<div class="md:col-span-2">
					<label for="heading-deg" class="block text-sm font-medium text-gray-700 mb-1">Heading True (deg, only if mode = heading)</label>
					<input 
						id="heading-deg" 
						class="w-full border border-gray-300 px-3 py-2" 
						type="number" 
						step="any" 
						bind:value={$heading_true_deg} 
					/>
				</div>
			</div>

			<div class="mt-6">
				<label for="test-type" class="block text-sm font-medium text-gray-700 mb-1">Test Type</label>
				<select id="test-type" class="w-full border border-gray-300 px-3 py-2" bind:value={$testType}>
					<option value="">Select a test...</option>
					{#each TEST_TYPES.AVAILABLE_TYPES as type}
						<option value={type.name}>{type.name}</option>
					{/each}
				</select>
			</div>

			<div class="mt-8 flex justify-end space-x-3">
				<button 
					type="button" 
					class="px-4 py-2 border border-gray-400 hover:bg-gray-100" 
					on:click={() => history.back()}
				>
					Cancel
				</button>
				<button 
					type="submit" 
					disabled={$loading} 
					class="px-5 py-2 bg-blue-900 text-white hover:bg-blue-800 disabled:opacity-50"
				>
					{$loading ? 'Generating...' : 'Generate Files'}
				</button>
			</div>
		</form>
		
		{#if $generationResult && ($downloadUrls.kml || $downloadUrls.plan)}
			<div class="mt-4 bg-white border border-gray-300 shadow p-4">
				<h3 class="text-lg font-semibold mb-3">Generated Files</h3>
				
				<!-- KML File -->
				{#if $downloadUrls.kml}
					<div class="flex items-center justify-between mb-3 p-3 bg-gray-50 border border-gray-200">
						<div>
							<div class="text-sm text-gray-700">KML File</div>
							<div class="text-base font-semibold">{$generationResult.kml.filename}</div>
						</div>
						<a 
							href={$downloadUrls.kml} 
							download={$generationResult.kml.filename} 
							class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
						>
							Download KML
						</a>
					</div>
				{/if}
				
				<!-- Plan File -->
				{#if $downloadUrls.plan && $generationResult.plan}
					<div class="flex items-center justify-between p-3 bg-gray-50 border border-gray-200">
						<div>
							<div class="text-sm text-gray-700">QGroundControl Plan</div>
							<div class="text-base font-semibold">{$generationResult.plan.filename}</div>
						</div>
						<a 
							href={$downloadUrls.plan} 
							download={$generationResult.plan.filename} 
							class="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded"
						>
							Download Plan
						</a>
					</div>
				{/if}
				
				<!-- Download Both Button -->
				{#if $downloadUrls.kml && $downloadUrls.plan}
					<div class="mt-3 pt-3 border-t border-gray-200">
						<button 
							class="w-full px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded"
							on:click={() => {
								// Trigger both downloads
								if ($downloadUrls.kml && $generationResult) {
									const kmlLink = document.createElement('a');
									kmlLink.href = $downloadUrls.kml;
									kmlLink.download = $generationResult.kml.filename;
									kmlLink.click();
								}
								
								setTimeout(() => {
									if ($downloadUrls.plan && $generationResult?.plan) {
										const planLink = document.createElement('a');
										planLink.href = $downloadUrls.plan;
										planLink.download = $generationResult.plan.filename;
										planLink.click();
									}
								}, 100);
							}}
						>
							Download Both Files
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div> 