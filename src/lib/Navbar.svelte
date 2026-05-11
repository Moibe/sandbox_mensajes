<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { API_URL, API_HOST, APP_VERSION } from './api';

	let online = $state<boolean | null>(null);
	let timer: ReturnType<typeof setInterval> | undefined;

	async function check() {
		try {
			const res = await fetch(`${API_URL}/health`, { cache: 'no-store' });
			online = res.ok;
		} catch {
			online = false;
		}
	}

	onMount(() => {
		check();
		timer = setInterval(check, 5000);
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});
</script>

<nav class="navbar">
	<div class="brand">
		<div class="logo">📧</div>
		<div class="info">
			<h1>Sandbox Mensajes 📧</h1>
			<div class="sub">
				<span class="version">versión {APP_VERSION}</span>
				<span
					class="status"
					class:online={online === true}
					class:offline={online === false}
					class:pending={online === null}
				>
					<span class="dot"></span>
					{online === true ? 'API en línea' : online === false ? 'API offline' : 'verificando…'}
				</span>
			</div>
		</div>
	</div>

	<div class="right">
		{#if API_HOST}
			<a class="docs-link" href={`http://${API_HOST}/docs`} target="_blank" rel="noopener">
				Docs ↗
			</a>
			<div class="host-chip">
				<span class="label">HOST</span>
				<code>{API_HOST}</code>
			</div>
		{/if}
	</div>
</nav>

<style>
	.navbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1.25rem;
		background: #075e54;
		color: #fff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		min-width: 0;
	}

	.logo {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.25);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	h1 {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
		line-height: 1.2;
		color: #fff;
	}

	.sub {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.85);
		margin-top: 0.15rem;
	}

	.version {
		opacity: 0.85;
	}

	.status {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 50%;
		background: #999;
		box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
	}

	.status.online .dot {
		background: #25d366;
		animation: pulse 2s ease-in-out infinite;
	}

	.status.offline .dot {
		background: #ef4444;
	}

	.status.pending .dot {
		background: #f0b429;
	}

	@keyframes pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.6);
		}
		50% {
			box-shadow: 0 0 0 6px rgba(37, 211, 102, 0);
		}
	}

	.right {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-shrink: 0;
	}

	.docs-link {
		display: inline-flex;
		align-items: center;
		padding: 0.4rem 0.7rem;
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		font-size: 0.78rem;
		color: #fff;
		text-decoration: none;
		transition: background 0.15s;
	}

	.docs-link:hover {
		background: rgba(255, 255, 255, 0.22);
	}

	.host-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.7rem;
		background: rgba(0, 0, 0, 0.25);
		border-radius: 6px;
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.95);
		flex-shrink: 0;
	}

	.host-chip .label {
		font-weight: 700;
		letter-spacing: 0.05em;
		opacity: 0.85;
	}

	.host-chip code {
		font-family:
			ui-monospace, 'Cascadia Mono', Menlo, Consolas, 'Courier New', monospace;
		font-size: 0.78rem;
	}
</style>
