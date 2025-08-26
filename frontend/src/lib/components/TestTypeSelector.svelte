<script lang="ts">
	import { selectedTestType, loading, chooseTestType, goBack } from './TestTypeSelector.state';
	import { TEST_TYPES } from '../constants';

	export let onTestTypeSelected: (e: { testType: string }) => void = () => {};
	export let onGoBack: () => void = () => {};

	function pick(testType: string) {
		chooseTestType(testType, (t) => onTestTypeSelected({ testType: t }));
	}

	function back() {
		goBack(onGoBack);
	}
</script>

<div class="flex justify-center items-center min-h-[calc(100vh-120px)]">
	<div class="bg-stone-100 p-6 md:p-8 w-11/12 max-w-sm md:max-w-lg shadow-lg">
		<h1 class="text-xl md:text-3xl font-bold mb-3 md:mb-6 text-center text-gray-900">Test Type Selection</h1>
		<div class="w-24 md:w-32 h-0.5 bg-blue-900 mx-auto mb-6 md:mb-8"></div>
		<div class="space-y-3">
			{#each TEST_TYPES.AVAILABLE_TYPES as testType}
				<button 
					on:click={() => pick(testType.id)} 
					disabled={$loading} 
					class="w-full bg-blue-900 text-white px-3 md:px-6 py-3 md:py-4 text-sm md:text-base hover:bg-blue-800 disabled:opacity-50 transition-colors duration-200 group"
				>
					<div class="text-left">
						<div class="font-medium">
							{$loading ? 'Processing...' : testType.name}
						</div>
						{#if !$loading}
							<div class="text-xs opacity-80 mt-1">
								{testType.description}
							</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	</div>
</div>