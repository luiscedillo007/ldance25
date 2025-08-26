<script lang="ts">
	import { getSiteStatusText } from './SiteHeader.state';

	export let selectedSite: string;
	export let isActive: boolean = false;
	export let show: boolean = true; // Add this prop
</script>

{#if selectedSite && show}
	<div class="shadow-md border-b-2"
		class:bg-green-100={isActive}
		class:border-green-500={isActive}
		class:bg-blue-100={!isActive}
		class:border-blue-500={!isActive}>
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center py-3">
				<div class="flex items-center">
					<div class="text-sm md:text-base font-medium"
						class:text-green-700={isActive}
						class:text-blue-700={!isActive}>
						{getSiteStatusText(selectedSite, isActive)}
					</div>
				</div>
				<div class="flex items-center space-x-2">
					{#if isActive}
						<div class="bg-green-500 text-white text-xs px-2 py-1 rounded-full">ACTIVE</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if} 