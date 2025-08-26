<script lang="ts">
	import {
		firstName, lastName, username, password, confirmPassword,
		loading, showPassword, showConfirmPassword,
		firstNameError, lastNameError, usernameError, passwordError, confirmPasswordError,
		generalError, success, createdUser,
		handleFirstNameInput, handleLastNameInput, handleUsernameInput,
		handlePasswordInput, handleConfirmPasswordInput, toggleShowPassword,
		handleSubmit, validatePassword
	} from './RegisterView.state';
	import { PASSWORD_VALIDATION, NAVIGATION } from '$lib/constants';
</script>

<svelte:head>
	<title>User SignUp</title>
</svelte:head>

<div class="flex justify-center items-center h-screen">
	<div class="bg-stone-100 p-6 md:p-8 w-11/12 max-w-sm md:max-w-lg shadow-lg">
		<h1 class="text-xl md:text-3xl font-bold mb-3 md:mb-6 text-center">Sign Up</h1>
		<div class="w-24 md:w-32 h-0.5 bg-blue-900 mx-auto mb-6 md:mb-8"></div>

		{#if $success}
			<div class="mb-4 p-4 bg-green-50 border border-green-200 rounded text-center">
				<p class="text-green-800 font-medium">Account created successfully!</p>
				<div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
					<p class="text-yellow-800 font-medium text-sm mb-2">Account ID</p>
					<div class="bg-gray-100 p-2 rounded font-mono text-sm break-all">
						{$createdUser?.uniqueId}
					</div>
					<p class="text-yellow-700 text-xs mt-2">Save this ID. You'll need it for account recovery.</p>
				</div>
				<div class="mt-4">
					<a href={NAVIGATION.ROUTES.HOME} class="inline-block bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800">
						Go to Login
					</a>
				</div>
			</div>
		{:else}
			{#if $generalError}
				<div class="mb-4 p-4 bg-red-50 border border-red-200 rounded text-center">
					<p class="text-red-800">{$generalError}</p>
				</div>
			{/if}

			<form on:submit={handleSubmit}>
				<div class="mb-3 md:mb-6">
					<label for="firstName" class="block text-sm md:text-lg font-medium text-gray-700 mb-1 md:mb-2">Name</label>
					<div class="grid grid-cols-2 gap-2 md:gap-4">
						<div>
							<input
								id="firstName"
								bind:value={$firstName}
								on:input={handleFirstNameInput}
								type="text"
								disabled={$loading}
								class="mt-1 block w-full p-2 md:p-3 border rounded shadow-sm { $firstNameError ? 'border-red-500 bg-red-50' : 'border-gray-300' }"
								placeholder="First Name"
							/>
						</div>
						<div>
							<input
								id="lastName"
								bind:value={$lastName}
								on:input={handleLastNameInput}
								type="text"
								disabled={$loading}
								class="mt-1 block w-full p-2 md:p-3 border rounded shadow-sm { $lastNameError ? 'border-red-500 bg-red-50' : 'border-gray-300' }"
								placeholder="Last Name"
							/>
						</div>
					</div>
				</div>

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
					<div class="relative">
						<input
							id="password"
							bind:value={$password}
							on:input={handlePasswordInput}
							type={$showPassword ? 'text' : 'password'}
							disabled={$loading}
							class="mt-1 block w-full p-2 md:p-3 pr-12 border rounded shadow-sm { $passwordError ? 'border-red-500 bg-red-50' : 'border-gray-300' }"
							placeholder="Password"
						/>
						<button
							type="button"
							on:click={toggleShowPassword}
							disabled={$loading}
							class="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs disabled:opacity-50"
						>
							{$showPassword ? 'Hide' : 'Show'}
						</button>
					</div>
					<p class="text-xs md:text-sm text-gray-500 mt-1">Must be {PASSWORD_VALIDATION.MIN_LENGTH}+ characters with {PASSWORD_VALIDATION.REQUIRED_SPECIAL_CHARS} special character and {PASSWORD_VALIDATION.REQUIRED_NUMBERS} numbers</p>
				</div>

				<div class="mb-3 md:mb-6">
					<label for="confirmPassword" class="block text-sm md:text-lg font-medium text-gray-700 mb-1 md:mb-2">Confirm Password</label>
					<input
						id="confirmPassword"
						bind:value={$confirmPassword}
						on:input={handleConfirmPasswordInput}
						type="password"
						disabled={$loading}
						class="mt-1 block w-full p-2 md:p-3 border rounded shadow-sm { ($confirmPasswordError || ($confirmPassword && $password !== $confirmPassword)) ? 'border-red-500 bg-red-50' : 'border-gray-300' }"
						placeholder="Confirm Password"
					/>
				</div>

				<button
					type="submit"
					disabled={$loading}
					class="w-full bg-blue-900 text-white px-3 md:px-6 py-2 md:py-3 text-sm md:text-base hover:bg-blue-800 mb-4 md:mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if $loading} Creating Account... {:else} Sign Up {/if}
				</button>
			</form>

			<div class="text-center">
				<span class="text-sm md:text-base text-gray-600">Already have an account?</span>
				<a href={NAVIGATION.ROUTES.HOME} class="text-blue-900 font-medium text-sm md:text-base hover:underline ml-1">Login</a>
			</div>
		{/if}
	</div>
</div>