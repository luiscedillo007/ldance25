<script lang="ts">
	import { loggedInUser } from '$lib/stores/userStore';
	import { goToAdmin, goToDashboard, goToGenerate, logout } from './DashboardHeader.state';
	import { NAVIGATION } from '$lib/constants';
	
	export let isAdminView = false;
</script>

<nav class="bg-stone-100 shadow-lg">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between items-center py-6">
			<div class="flex items-center">
				{#if $loggedInUser}
					<div class="text-gray-900">
						<div class="text-lg md:text-xl font-medium">
							{$loggedInUser.firstName} {$loggedInUser.lastName}
						</div>
						<div class="text-sm md:text-base text-gray-700 mt-1 flex flex-col md:flex-row md:items-center">
							<span class="md:mr-4">
								<span class="font-bold">username:</span> {$loggedInUser.username}
							</span>
							<span class="text-xs md:text-sm text-gray-600 mt-1 md:mt-0">
								<span class="font-bold">ID:</span>
								<span class="font-mono bg-gray-200 px-2 py-1">
									{$loggedInUser.uniqueId || 'N/A'}
								</span>
							</span>
						</div>
					</div>
				{/if}
			</div>
			<div class="flex items-center">
				{#if $loggedInUser}
					<button 
						on:click={goToGenerate} 
						class="bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700 text-sm md:text-base mr-2"
					>
						{NAVIGATION.LABELS.GENERATE_KML}
					</button>
					{#if $loggedInUser.username === 'admin'}
						<!-- Admin navigation -->
						{#if !isAdminView}
							<button 
								on:click={goToAdmin} 
								class="bg-purple-600 text-white px-4 py-2 hover:bg-purple-700 text-sm md:text-base mr-2"
							>
								{NAVIGATION.LABELS.ADMIN_PORTAL}
							</button>
						{:else}
							<button 
								on:click={goToDashboard} 
								class="bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 text-sm md:text-base mr-2"
							>
								{NAVIGATION.LABELS.USER_DASHBOARD}
							</button>
						{/if}
					{/if}
					<button 
						on:click={logout} 
						class="bg-blue-900 text-white px-4 py-2 hover:bg-blue-800 text-sm md:text-base"
					>
						{NAVIGATION.LABELS.LOGOUT}
					</button>
				{/if}
			</div>
		</div>
	</div>
	<div class="w-full h-0.5 bg-blue-900"></div>
</nav> 