<script lang="ts">
	import Navbar from '$lib/Navbar.svelte';
	import EventsFeed from '$lib/EventsFeed.svelte';
</script>

<div class="page">
	<Navbar />
	<main>
		<EventsFeed />
	</main>
</div>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		height: 100%;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
	}

	.page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: linear-gradient(135deg, #5ddb7f 0%, #a8e6cf 100%);
	}

	main {
		flex: 1;
	}
</style>
