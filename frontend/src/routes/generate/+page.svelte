<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { loggedInUser } from '$lib/stores/userStore';
	import { NAVIGATION } from '$lib/constants';
	import Generate from '$lib/components/Generate/Generate.svelte';

	// Route protection
	onMount(() => {
		if (!$loggedInUser) {
			goto(NAVIGATION.ROUTES.HOME);
			return;
		}
	});
</script>

<Generate />