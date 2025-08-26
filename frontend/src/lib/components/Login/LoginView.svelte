<script lang="ts">
	import {
		username, password, loading,
		usernameError, passwordError, generalError,
		handleUsernameInput, handlePasswordInput, handleSubmit
	} from './LoginView.state';
</script>

<svelte:head>
	<title>User Login</title>
</svelte:head>

<div class="flex justify-center items-center h-screen">
	<div class="bg-stone-100 p-6 md:p-8 w-11/12 max-w-sm md:max-w-lg shadow-lg">
		<h1 class="text-xl md:text-3xl font-bold mb-3 md:mb-6 text-center">Login</h1>
		<div class="w-24 md:w-32 h-0.5 bg-blue-900 mx-auto mb-6 md:mb-8"></div>

		{#if $generalError}
			<div class="mb-4 p-4 bg-red-50 border border-red-200 rounded text-center">
				<p class="text-red-800">{$generalError}</p>
			</div>
		{/if}

		<form on:submit={handleSubmit}>
			<div class="mb-3 md:mb-6">
				<label for="username" class="block text-sm md:text-lg font-medium text-gray-700 mb-1 md:mb-2">Username</label>
				<input
					id="username"
					bind:value={$username}
					on:input={handleUsernameInput}
					type="text"
					disabled={$loading}
					class="mt-1 block w-full p-2 md:p-3 border rounded shadow-sm { $usernameError ? 'border-red-500 bg-red-50' : 'border-gray-300' }"
					placeholder="Username"
				/>
			</div>

			<div class="mb-3 md:mb-6">
				<label for="password" class="block text-sm md:text-lg font-medium text-gray-700 mb-1 md:mb-2">Password</label>
				<input
					id="password"
					bind:value={$password}
					on:input={handlePasswordInput}
					type="password"
					disabled={$loading}
					class="mt-1 block w-full p-2 md:p-3 border rounded shadow-sm { $passwordError ? 'border-red-500 bg-red-50' : 'border-gray-300' }"
					placeholder="Password"
				/>
			</div>

			<button
				type="submit"
				disabled={$loading}
				class="w-full bg-blue-900 text-white px-3 md:px-6 py-2 md:py-3 text-sm md:text-base hover:bg-blue-800 mb-4 md:mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if $loading} Logging in... {:else} Log In {/if}
			</button>
		</form>

		<div class="text-center">
			<span class="text-sm md:text-base text-gray-600">Don't have an account?</span>
			<a href="/register" class="text-blue-900 font-medium text-sm md:text-base hover:underline ml-1">Sign up</a>
		</div>
		<div class="text-center mt-2">
			<span class="text-sm md:text-base text-gray-600">Need to reset your password?</span>
			<a href="/recovery" class="text-blue-900 font-medium text-sm md:text-base hover:underline ml-1">Recover</a>
		</div>
	</div>
</div>