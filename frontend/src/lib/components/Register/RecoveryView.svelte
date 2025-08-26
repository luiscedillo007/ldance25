<script lang="ts">
import {
	accountId, newPassword, confirmPassword, loading, showPassword, step, user,
	accountIdError, passwordError, confirmPasswordError, generalError, success,
	handleStep1Submit, handleStep2Submit, validatePassword, clearFieldError, goBackToStep1
} from './RecoveryView.state';
import { PASSWORD_VALIDATION, NAVIGATION } from '$lib/constants';
</script>

<svelte:head>
	<title>Account Recovery</title>
</svelte:head>

<div class="flex justify-center items-center h-screen">
	<div class="bg-stone-100 p-6 md:p-8 w-11/12 max-w-sm md:max-w-lg shadow-lg">
		<h1 class="text-xl md:text-3xl font-bold mb-3 md:mb-6 text-center">Recovery</h1>
		<div class="w-24 md:w-32 h-0.5 bg-blue-900 mx-auto mb-6 md:mb-8"></div>

		{#if $success}
			<div class="mb-4 p-4 bg-green-50 border border-green-200 rounded text-center">
				<p class="text-green-800 font-medium">Password reset successfully!</p>
				<p class="text-green-700 text-sm mt-2">You can now login with your new password.</p>
				<div class="mt-4">
					<a href={NAVIGATION.ROUTES.HOME} class="inline-block bg-blue-900 text-white px-4 py-2 rounded hover:bg-blue-800">Go to Login</a>
				</div>
			</div>
		{:else}
			{#if $generalError}
				<div class="mb-4 p-4 bg-red-50 border border-red-200 rounded text-center">
					<p class="text-red-800">{$generalError}</p>
				</div>
			{/if}

			{#if $step === 1}
				<div class="mb-4">
					<p class="text-sm md:text-base text-gray-600 text-center mb-6">
						Enter your account ID to recover your account.<br>
						This ID was provided when you created your account.
					</p>
				</div>

				<form on:submit|preventDefault={(e) => handleStep1Submit(e, { accountId: $accountId })}>
					<div class="mb-3 md:mb-6">
						<label for="accountId" class="block text-sm md:text-lg font-medium text-gray-700 mb-1 md:mb-2">Account ID</label>
						<input
							id="accountId"
							bind:value={$accountId}
							on:input={() => clearFieldError('accountId', { accountId: $accountId })}
							type="text"
							disabled={$loading}
							class="mt-1 block w-full p-2 md:p-3 border rounded shadow-sm { $accountIdError ? 'border-red-500 bg-red-50' : 'border-gray-300' }"
							placeholder="Enter your account ID"
						/>
					</div>
					<button type="submit" disabled={$loading} class="w-full bg-blue-900 text-white px-3 md:px-6 py-2 md:py-3 text-sm md:text-base hover:bg-blue-800 mb-4 md:mb-6 disabled:opacity-50 disabled:cursor-not-allowed">
						{#if $loading}Verifying...{:else}Proceed{/if}
					</button>
				</form>
			{:else if $step === 2}
				<div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
					<p class="text-blue-800 font-medium text-sm mb-2">Account Found:</p>
					<p class="text-blue-700 text-sm"><strong>Name:</strong> {$user?.firstName} {$user?.lastName}</p>
					<p class="text-blue-700 text-sm"><strong>Username:</strong> {$user?.username}</p>
				</div>

				<form on:submit|preventDefault={(e) => handleStep2Submit(e, { accountId: $accountId, newPassword: $newPassword, confirmPassword: $confirmPassword })}>
					<div class="mb-3 md:mb-6">
						<label for="newPassword" class="block text-sm md:text-lg font-medium text-gray-700 mb-1 md:mb-2">New Password</label>
						<div class="relative">
							<input
								id="newPassword"
								bind:value={$newPassword}
								on:input={() => clearFieldError('newPassword', { newPassword: $newPassword })}
								type={$showPassword ? 'text' : 'password'}
								disabled={$loading}
								class="mt-1 block w-full p-2 md:p-3 pr-12 border rounded shadow-sm { $passwordError ? 'border-red-500 bg-red-50' : 'border-gray-300' }"
								placeholder="New Password"
							/>
							<button type="button" on:click={() => showPassword.update(v => !v)} disabled={$loading} class="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs disabled:opacity-50">{$showPassword ? 'Hide' : 'Show'}</button>
						</div>
						<p class="text-xs md:text-sm text-gray-500 mt-1">Must be {PASSWORD_VALIDATION.MIN_LENGTH}+ characters with {PASSWORD_VALIDATION.REQUIRED_SPECIAL_CHARS} special character and {PASSWORD_VALIDATION.REQUIRED_NUMBERS} numbers</p>
					</div>
					<div class="mb-3 md:mb-6">
						<label for="confirmPassword" class="block text-sm md:text-lg font-medium text-gray-700 mb-1 md:mb-2">Confirm New Password</label>
						<input
							id="confirmPassword"
							bind:value={$confirmPassword}
							on:input={() => clearFieldError('confirmPassword', { newPassword: $newPassword, confirmPassword: $confirmPassword })}
							type="password"
							disabled={$loading}
							class="mt-1 block w-full p-2 md:p-3 border rounded shadow-sm { ($confirmPasswordError || ($confirmPassword && $newPassword !== $confirmPassword)) ? 'border-red-500 bg-red-50' : 'border-gray-300' }"
							placeholder="Confirm New Password"
						/>
					</div>
					<button type="submit" disabled={$loading} class="w-full bg-blue-900 text-white px-3 md:px-6 py-2 md:py-3 text-sm md:text-base hover:bg-blue-800 mb-4 md:mb-6 disabled:opacity-50 disabled:cursor-not-allowed">
						{#if $loading}Resetting Password...{:else}Reset Password{/if}
					</button>
				</form>

				<div class="text-center">
					<button on:click={goBackToStep1} disabled={$loading} class="text-blue-900 font-medium text-sm md:text-base hover:underline disabled:opacity-50">Back to Account ID</button>
				</div>
			{/if}
		{/if}

		<div class="text-center mt-4">
			<span class="text-sm md:text-base text-gray-600">Remember your password?</span>
			<a href={NAVIGATION.ROUTES.HOME} class="text-blue-900 font-medium text-sm md:text-base hover:underline ml-1">Login</a>
		</div>
	</div>
</div> 