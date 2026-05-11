<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { API_URL } from './api';

	type CallEvent = {
		ts: string;
		method: string;
		path: string;
		status: number;
		duration_ms: number;
		client?: string | null;
		summary?: string;
	};

	let events = $state<CallEvent[]>([]);
	let connected = $state(false);
	let es: EventSource | undefined;

	const MAX_EVENTS = 200;

	function connect() {
		es = new EventSource(`${API_URL}/events`);
		es.onopen = () => {
			connected = true;
		};
		es.onmessage = (e) => {
			try {
				const evt = JSON.parse(e.data) as CallEvent;
				events = [evt, ...events].slice(0, MAX_EVENTS);
			} catch {
				// ignore malformed
			}
		};
		es.onerror = () => {
			connected = false;
		};
	}

	onMount(connect);

	onDestroy(() => {
		es?.close();
	});

	function methodClass(m: string) {
		const k = m.toUpperCase();
		if (k === 'GET') return 'm-get';
		if (k === 'POST') return 'm-post';
		if (k === 'PUT' || k === 'PATCH') return 'm-put';
		if (k === 'DELETE') return 'm-delete';
		return 'm-other';
	}

	function statusClass(s: number) {
		if (s >= 500) return 's-5xx';
		if (s >= 400) return 's-4xx';
		if (s >= 300) return 's-3xx';
		if (s >= 200) return 's-2xx';
		return 's-other';
	}

	function fmtTime(iso: string) {
		const d = new Date(iso);
		return d.toLocaleTimeString('es-MX', { hour12: false }) +
			'.' + String(d.getMilliseconds()).padStart(3, '0');
	}

	function clear() {
		events = [];
	}
</script>

<section class="feed">
	<header>
		<h2>Llamadas en tiempo real</h2>
		<div class="meta">
			<span class="conn" class:on={connected} class:off={!connected}>
				<span class="dot"></span>
				{connected ? 'conectado' : 'desconectado'}
			</span>
			<span class="count">{events.length} {events.length === 1 ? 'evento' : 'eventos'}</span>
			<button type="button" onclick={clear} disabled={events.length === 0}>Limpiar</button>
		</div>
	</header>

	{#if events.length === 0}
		<div class="empty">
			{connected
				? 'Esperando llamadas… haz un request a la API para verlo aquí.'
				: 'Sin conexión al stream de eventos.'}
		</div>
	{:else}
		<ul>
			{#each events as evt (evt.ts + evt.path + Math.random())}
				<li>
					<span class="time">{fmtTime(evt.ts)}</span>
					<span class="method {methodClass(evt.method)}">{evt.method}</span>
					<span class="path">{evt.path}</span>
					<span class="status {statusClass(evt.status)}">{evt.status}</span>
					<span class="dur">{evt.duration_ms}ms</span>
					{#if evt.client}<span class="client">{evt.client}</span>{/if}
					{#if evt.summary}<span class="summary">{evt.summary}</span>{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.feed {
		background: rgba(255, 255, 255, 0.92);
		border-radius: 12px;
		margin: 1.25rem;
		padding: 1rem 1.25rem;
		box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
		max-width: 1100px;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
		flex-wrap: wrap;
	}

	h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #075e54;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.8rem;
		color: #555;
	}

	.conn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.conn .dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: #999;
	}

	.conn.on .dot {
		background: #25d366;
		box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.6);
		animation: pulse 2s ease-in-out infinite;
	}

	.conn.off .dot {
		background: #ef4444;
	}

	@keyframes pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.5);
		}
		50% {
			box-shadow: 0 0 0 5px rgba(37, 211, 102, 0);
		}
	}

	button {
		background: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 0.25rem 0.6rem;
		font-size: 0.75rem;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.empty {
		padding: 2rem 0.5rem;
		text-align: center;
		color: #666;
		font-size: 0.9rem;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 60vh;
		overflow-y: auto;
		font-family:
			ui-monospace, 'Cascadia Mono', Menlo, Consolas, 'Courier New', monospace;
		font-size: 0.8rem;
	}

	li {
		display: grid;
		grid-template-columns: 9ch 5rem 1fr 4ch 5rem auto auto;
		gap: 0.6rem;
		align-items: center;
		padding: 0.4rem 0.4rem;
		border-bottom: 1px solid #eef2ef;
	}

	li:last-child {
		border-bottom: none;
	}

	.time {
		color: #888;
	}

	.method {
		display: inline-block;
		text-align: center;
		font-weight: 700;
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		font-size: 0.72rem;
		color: #fff;
	}

	.m-get { background: #2563eb; }
	.m-post { background: #16a34a; }
	.m-put { background: #d97706; }
	.m-delete { background: #dc2626; }
	.m-other { background: #6b7280; }

	.path {
		color: #111;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.status {
		font-weight: 700;
		text-align: right;
	}

	.s-2xx { color: #16a34a; }
	.s-3xx { color: #2563eb; }
	.s-4xx { color: #d97706; }
	.s-5xx { color: #dc2626; }
	.s-other { color: #6b7280; }

	.dur {
		color: #666;
		text-align: right;
	}

	.client {
		color: #888;
		font-size: 0.72rem;
	}

	.summary {
		color: #555;
		font-size: 0.72rem;
		max-width: 30ch;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
