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
		_id: number;
	};

	type Row = CallEvent & { count: number };

	let events = $state<CallEvent[]>([]);
	let connected = $state(false);
	let query = $state('');
	let hideHealth = $state(false);
	let groupRepeats = $state(false);
	let selected = $state<CallEvent | null>(null);
	let es: EventSource | undefined;
	let nextId = 0;

	const MAX_EVENTS = 500;
	const STORAGE_KEY = 'sandbox-mensajes:events:v1';

	function connect() {
		es = new EventSource(`${API_URL}/events`);
		es.onopen = () => {
			connected = true;
		};
		es.onmessage = (e) => {
			try {
				const raw = JSON.parse(e.data) as Omit<CallEvent, '_id'>;
				events = [{ ...raw, _id: nextId++ }, ...events].slice(0, MAX_EVENTS);
			} catch {
				// ignore malformed
			}
		};
		es.onerror = () => {
			connected = false;
		};
	}

	onMount(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as CallEvent[];
				if (Array.isArray(parsed)) {
					events = parsed.slice(0, MAX_EVENTS);
					nextId = parsed.reduce((max, e) => Math.max(max, e._id ?? 0), -1) + 1;
				}
			}
		} catch {
			// corrupt storage, ignore
		}
		connect();
	});

	onDestroy(() => {
		es?.close();
	});

	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => {
		events;
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
			} catch {
				// quota exceeded or unavailable
			}
		}, 400);
	});

	$effect(() => {
		if (!selected) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') selected = null;
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	});

	function isDryRun(e: { summary?: string }) {
		return e.summary?.startsWith('DRY-RUN') ?? false;
	}

	const filtered = $derived(
		events.filter((e) => {
			if (hideHealth && e.path === '/health') return false;
			const q = query.trim().toLowerCase();
			if (!q) return true;
			return (
				e.method.toLowerCase().includes(q) ||
				e.path.toLowerCase().includes(q) ||
				String(e.status).includes(q) ||
				(e.summary ?? '').toLowerCase().includes(q) ||
				(e.client ?? '').toLowerCase().includes(q)
			);
		})
	);

	const dryRunCount = $derived(events.filter(isDryRun).length);

	const rows = $derived.by<Row[]>(() => {
		if (!groupRepeats) return filtered.map((e) => ({ ...e, count: 1 }));
		const out: Row[] = [];
		for (const e of filtered) {
			const last = out[out.length - 1];
			if (
				last &&
				last.method === e.method &&
				last.path === e.path &&
				last.status === e.status &&
				isDryRun(last) === isDryRun(e)
			) {
				last.count++;
			} else {
				out.push({ ...e, count: 1 });
			}
		}
		return out;
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
		return (
			d.toLocaleTimeString('es-MX', { hour12: false }) +
			'.' +
			String(d.getMilliseconds()).padStart(3, '0')
		);
	}

	function clearAll() {
		events = [];
		selected = null;
	}

	function openDetail(row: Row) {
		if (row.count > 1) return;
		selected = row;
	}

	function copyJson() {
		if (!selected) return;
		const { _id, ...clean } = selected;
		navigator.clipboard?.writeText(JSON.stringify(clean, null, 2));
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
			<span class="count">
				{events.length} {events.length === 1 ? 'evento' : 'eventos'}
				{#if dryRunCount > 0}· {dryRunCount} dry-run{/if}
				{#if filtered.length !== events.length}· {filtered.length} mostrados{/if}
			</span>
			<button type="button" onclick={clearAll} disabled={events.length === 0}>Limpiar</button>
		</div>
	</header>

	<div class="filters">
		<input
			class="search"
			type="search"
			placeholder="Buscar (método, path, status, summary, IP)…"
			bind:value={query}
		/>
		<label>
			<input type="checkbox" bind:checked={hideHealth} />
			Ocultar /health
		</label>
		<label>
			<input type="checkbox" bind:checked={groupRepeats} />
			Agrupar repetidos
		</label>
	</div>

	{#if rows.length === 0}
		<div class="empty">
			{#if events.length === 0}
				{connected
					? 'Esperando llamadas… haz un request a la API para verlo aquí.'
					: 'Sin conexión al stream de eventos.'}
			{:else}
				Ningún evento coincide con los filtros.
			{/if}
		</div>
	{:else}
		<ul>
			{#each rows as row (row._id)}
				<li
					class:groupable={row.count === 1}
					class:grouped={row.count > 1}
					class:dry={isDryRun(row)}
					onclick={() => openDetail(row)}
					onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && openDetail(row)}
					role="button"
					tabindex={row.count === 1 ? 0 : -1}
				>
					<span class="time">{fmtTime(row.ts)}</span>
					<span class="method {methodClass(row.method)}">{row.method}</span>
					<span class="path">
						{row.path}
						{#if isDryRun(row)}<span class="dry-badge">DRY</span>{/if}
					</span>
					<span class="status {statusClass(row.status)}">{row.status}</span>
					<span class="dur">{row.duration_ms}ms</span>
					{#if row.client}<span class="client">{row.client}</span>{/if}
					{#if row.summary}<span class="summary">{row.summary}</span>{/if}
					{#if row.count > 1}<span class="repeat">×{row.count}</span>{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

{#if selected}
	<div
		class="modal-backdrop"
		onclick={() => (selected = null)}
		onkeydown={(e) => e.key === 'Escape' && (selected = null)}
		role="button"
		tabindex="-1"
	>
		<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			tabindex="-1"
			aria-modal="true"
		>
			<header class="modal-header">
				<h3>
					<span class="method {methodClass(selected.method)}">{selected.method}</span>
					<code>{selected.path}</code>
					{#if isDryRun(selected)}<span class="dry-badge">DRY</span>{/if}
					<span class="status {statusClass(selected.status)}">{selected.status}</span>
				</h3>
				<button type="button" class="close" onclick={() => (selected = null)}>×</button>
			</header>

			<dl>
				<dt>Timestamp</dt>
				<dd>{selected.ts}</dd>
				<dt>Hora local</dt>
				<dd>{fmtTime(selected.ts)}</dd>
				<dt>Duración</dt>
				<dd>{selected.duration_ms} ms</dd>
				<dt>Cliente</dt>
				<dd>{selected.client ?? '—'}</dd>
				{#if selected.summary}
					<dt>Summary</dt>
					<dd>{selected.summary}</dd>
				{/if}
			</dl>

			<pre>{JSON.stringify(
					Object.fromEntries(Object.entries(selected).filter(([k]) => k !== '_id')),
					null,
					2
				)}</pre>

			<div class="modal-actions">
				<button type="button" onclick={copyJson}>Copiar JSON</button>
			</div>
		</div>
	</div>
{/if}

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

	.filters {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.6rem;
		flex-wrap: wrap;
		font-size: 0.78rem;
		color: #444;
	}

	.search {
		flex: 1 1 220px;
		min-width: 180px;
		padding: 0.35rem 0.6rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font: inherit;
		font-size: 0.8rem;
		outline: none;
		background: #fff;
	}

	.search:focus {
		border-color: #075e54;
	}

	.filters label {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		cursor: pointer;
		user-select: none;
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
		grid-template-columns: 13ch 5rem 1fr 4ch 5rem auto auto auto;
		gap: 0.6rem;
		align-items: center;
		padding: 0.4rem 0.4rem;
		border-bottom: 1px solid #eef2ef;
		background: transparent;
		text-align: left;
		font: inherit;
	}

	li:last-child {
		border-bottom: none;
	}

	li.groupable {
		cursor: pointer;
	}

	li.groupable:hover {
		background: #f5f9f5;
	}

	li.grouped {
		cursor: default;
		background: #fafbfa;
	}

	li.dry {
		background: rgba(217, 119, 6, 0.06);
	}

	li.dry.groupable:hover {
		background: rgba(217, 119, 6, 0.12);
	}

	.dry-badge {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		background: rgba(217, 119, 6, 0.18);
		color: #92400e;
		padding: 0.05rem 0.35rem;
		border-radius: 3px;
		margin-left: 0.4rem;
		vertical-align: middle;
	}

	.time {
		color: #888;
		white-space: nowrap;
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

	.repeat {
		font-size: 0.7rem;
		font-weight: 700;
		color: #075e54;
		background: rgba(7, 94, 84, 0.12);
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		justify-self: end;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
		padding: 1rem;
	}

	.modal {
		background: #fff;
		border-radius: 12px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		width: 100%;
		max-width: 640px;
		max-height: 85vh;
		overflow: auto;
		padding: 1rem 1.25rem;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.modal-header h3 {
		margin: 0;
		font-size: 0.95rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.modal-header code {
		font-family:
			ui-monospace, 'Cascadia Mono', Menlo, Consolas, 'Courier New', monospace;
		font-size: 0.9rem;
		color: #111;
	}

	.close {
		background: transparent;
		border: none;
		font-size: 1.5rem;
		line-height: 1;
		color: #666;
		cursor: pointer;
		padding: 0 0.4rem;
	}

	.close:hover {
		color: #111;
	}

	dl {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 0.3rem 0.9rem;
		margin: 0 0 0.75rem;
		font-size: 0.82rem;
	}

	dt {
		color: #666;
		font-weight: 500;
	}

	dd {
		margin: 0;
		color: #111;
		font-family:
			ui-monospace, 'Cascadia Mono', Menlo, Consolas, 'Courier New', monospace;
	}

	pre {
		margin: 0 0 0.75rem;
		background: #0f172a;
		color: #e2e8f0;
		padding: 0.7rem 0.9rem;
		border-radius: 6px;
		font-family:
			ui-monospace, 'Cascadia Mono', Menlo, Consolas, 'Courier New', monospace;
		font-size: 0.78rem;
		line-height: 1.45;
		overflow-x: auto;
		white-space: pre;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
	}

	.modal-actions button {
		background: #075e54;
		color: #fff;
		border: none;
		padding: 0.4rem 0.9rem;
		font-weight: 600;
	}

	.modal-actions button:hover {
		background: #064d44;
	}
</style>
