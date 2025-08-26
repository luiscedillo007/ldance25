<script lang="ts">
	import { selectedSite, loading, selectSite } from './SiteSelector.state';
	import { SITE_CONFIG } from '$lib/constants';

	export let onSiteSelected: (e: { site: string }) => void = () => {};

	function choose(site: string) {
		selectSite(site, (s) => onSiteSelected({ site: s }));
	}
</script>

<div class="flex justify-center items-center min-h-[calc(100vh-120px)]">
	<div class="bg-stone-100 p-6 md:p-8 w-11/12 max-w-sm md:max-w-lg shadow-lg">
		<h1 class="text-xl md:text-3xl font-bold mb-3 md:mb-6 text-center">Test Site Location</h1>
		<div class="w-24 md:w-32 h-0.5 bg-blue-900 mx-auto mb-6 md:mb-8"></div>

		<div class="text-center mb-6 md:mb-8">
			<p class="text-gray-600 text-sm md:text-base mb-6">Please select your test site location:</p>
		</div>

		<div class="space-y-3">
			{#each SITE_CONFIG.AVAILABLE_SITES as site}
				<button 
					on:click={() => choose(site.id)} 
					disabled={$loading} 
					class="w-full bg-blue-900 text-white px-3 md:px-6 py-2 md:py-3 text-sm md:text-base hover:bg-blue-800 disabled:opacity-50 transition-colors duration-200"
				>
					{$loading ? 'Selecting...' : site.name}
				</button>
			{/each}
		</div>
	</div>
</div> 