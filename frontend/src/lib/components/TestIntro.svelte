<script lang="ts">
	import { errorMessage, getImageForTestType, onImageError } from './TestIntro.state';

	export let testType: string;
	export let testTypeName: string;

	const img = getImageForTestType(testType);
</script>

<div class="bg-stone-100 p-6 w-full max-w-4xl mx-auto shadow-lg mb-6">
	<div class="bg-white border border-gray-300 p-6">
		<div class="text-center mb-6">
			<h3 class="text-lg font-semibold text-gray-800 mb-2">{testTypeName} Setup</h3>
			<p class="text-sm text-gray-600">Please review the test setup below</p>
		</div>

		<div class="relative mb-6">
			<div class="w-full h-96 md:h-[32rem] bg-gray-100 border border-gray-200 flex items-center justify-center">
				<img 
					src={img.src} 
					alt={img.alt} 
					class="max-w-full max-h-full object-contain" 
					on:error={onImageError}
				/>
			</div>
			{#if $errorMessage}
				<div class="mt-2 text-center text-xs text-red-600">{$errorMessage}</div>
			{/if}
		</div>

		<div class="text-center">
			<p class="text-sm text-gray-600">Ensure all equipment is properly connected and positioned before starting tracking</p>
		</div>
	</div>
</div>