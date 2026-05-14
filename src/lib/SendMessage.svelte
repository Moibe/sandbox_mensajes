<script lang="ts">
	import { onMount } from 'svelte';
	import { API_URL, APP_ORIGIN } from './api';

	const DRY_RUN_KEY = 'sandbox-mensajes:dry-run:v1';

	let numero = $state('+5215534002530');
	let mensaje = $state('Prueba X');
	let dryRun = $state(true);
	let sending = $state(false);
	let result = $state<
		| { kind: 'ok'; sid: string; info: string; dryRun: boolean; raw: string; status: number }
		| { kind: 'err'; detail: string; raw: string; status: number }
		| null
	>(null);

	onMount(() => {
		try {
			const stored = localStorage.getItem(DRY_RUN_KEY);
			if (stored !== null) dryRun = stored === '1';
		} catch {
			// ignore
		}
	});

	$effect(() => {
		try {
			localStorage.setItem(DRY_RUN_KEY, dryRun ? '1' : '0');
		} catch {
			// ignore
		}
	});

	const payload = $derived(
		JSON.stringify(
			dryRun
				? { numero: numero.trim(), mensaje, dry_run: true }
				: { numero: numero.trim(), mensaje },
			null,
			2
		)
	);

	async function send(e: Event) {
		e.preventDefault();
		if (!numero.trim() || !mensaje.trim() || sending) return;
		sending = true;
		result = null;
		try {
			const body: Record<string, unknown> = { numero: numero.trim(), mensaje };
			if (dryRun) body.dry_run = true;
			const res = await fetch(`${API_URL}/enviar_mensaje`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Origin': APP_ORIGIN
				},
				body: JSON.stringify(body)
			});
			const text = await res.text();
			let data: any = {};
			let raw = text;
			try {
				data = JSON.parse(text);
				raw = JSON.stringify(data, null, 2);
			} catch {
				// not JSON, keep text as-is
			}
			if (res.ok) {
				const isDry = data.status === 'dry-run';
				result = {
					kind: 'ok',
					sid: data.message_sid ?? '',
					info: data.info ?? '',
					dryRun: isDry,
					raw,
					status: res.status
				};
				mensaje = '';
			} else {
				result = {
					kind: 'err',
					detail: data.detail ?? `HTTP ${res.status}`,
					raw,
					status: res.status
				};
			}
		} catch (err) {
			result = {
				kind: 'err',
				detail: err instanceof Error ? err.message : String(err),
				raw: '',
				status: 0
			};
		} finally {
			sending = false;
		}
	}
</script>

<section class="sender">
	<header>
		<h2>Enviar mensaje</h2>
		<span class="endpoint">POST /enviar_mensaje</span>
	</header>

	<form onsubmit={send}>
		<label>
			Número
			<input
				type="text"
				bind:value={numero}
				placeholder="+521234567890 o 1234567890"
				disabled={sending}
				required
			/>
		</label>

		<label>
			Mensaje
			<textarea
				bind:value={mensaje}
				placeholder="Escribe el mensaje a enviar…"
				rows="3"
				disabled={sending}
				required
			></textarea>
		</label>

		<label class="dry-toggle" class:active={dryRun}>
			<input type="checkbox" bind:checked={dryRun} disabled={sending} />
			<span>Modo prueba <em>(dry-run — no envía a Twilio)</em></span>
		</label>

		<div class="preview">
			<span class="preview-label">JSON a enviar</span>
			<pre>{payload}</pre>
		</div>

		<div class="actions">
			<button
				type="submit"
				class:dry={dryRun}
				disabled={sending || !numero.trim() || !mensaje.trim()}
			>
				{sending ? 'Enviando…' : dryRun ? 'Enviar (prueba)' : 'Enviar'}
			</button>
			{#if result?.kind === 'ok'}
				<span class="result ok" class:dry={result.dryRun}>
					{result.dryRun ? '⚡' : '✓'} {result.info}
					{#if result.sid}<code>{result.sid}</code>{/if}
				</span>
			{:else if result?.kind === 'err'}
				<span class="result err">✗ {result.detail}</span>
			{/if}
		</div>

		{#if result && result.raw}
			<div class="preview">
				<span class="preview-label">
					JSON devuelto
					<span class="status-pill" class:ok={result.kind === 'ok'} class:err={result.kind === 'err'}>
						HTTP {result.status}
					</span>
				</span>
				<pre>{result.raw}</pre>
			</div>
		{/if}
	</form>
</section>

<style>
	.sender {
		background: rgba(255, 255, 255, 0.92);
		border-radius: 12px;
		margin: 1.25rem;
		padding: 1rem 1.25rem;
		box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
		max-width: 1100px;
	}

	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #075e54;
	}

	.endpoint {
		font-family:
			ui-monospace, 'Cascadia Mono', Menlo, Consolas, 'Courier New', monospace;
		font-size: 0.72rem;
		color: #666;
		background: #f3f4f6;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.8rem;
		color: #333;
	}

	input,
	textarea {
		font: inherit;
		padding: 0.5rem 0.7rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		outline: none;
		transition: border-color 0.15s;
		font-size: 0.9rem;
		background: #fff;
	}

	input:focus,
	textarea:focus {
		border-color: #075e54;
	}

	textarea {
		resize: vertical;
		min-height: 3rem;
		font-family: inherit;
	}

	.preview {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.preview-label {
		font-size: 0.75rem;
		color: #666;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-pill {
		font-size: 0.68rem;
		font-weight: 700;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		letter-spacing: 0.02em;
		text-transform: none;
	}

	.status-pill.ok {
		background: rgba(22, 163, 74, 0.15);
		color: #15803d;
	}

	.status-pill.err {
		background: rgba(220, 38, 38, 0.15);
		color: #b91c1c;
	}

	.preview pre {
		margin: 0;
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

	.dry-toggle {
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		background: #fafbfa;
		cursor: pointer;
		user-select: none;
		transition: all 0.15s;
		font-size: 0.85rem;
	}

	.dry-toggle.active {
		border-color: #d97706;
		background: rgba(217, 119, 6, 0.08);
		color: #92400e;
	}

	.dry-toggle em {
		font-style: normal;
		color: #888;
		font-size: 0.78rem;
	}

	.dry-toggle.active em {
		color: #b45309;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	button[type='submit'] {
		background: #075e54;
		color: #fff;
		border: none;
		padding: 0.5rem 1.1rem;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
		transition: background 0.15s;
	}

	button[type='submit']:hover:not(:disabled) {
		background: #064d44;
	}

	button[type='submit'].dry {
		background: #d97706;
	}

	button[type='submit'].dry:hover:not(:disabled) {
		background: #b45309;
	}

	button[type='submit']:disabled {
		opacity: 0.55;
		cursor: default;
	}

	.result {
		font-size: 0.8rem;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.result.ok {
		color: #16a34a;
	}

	.result.ok.dry {
		color: #b45309;
	}

	.result.err {
		color: #dc2626;
	}

	.result code {
		font-family:
			ui-monospace, 'Cascadia Mono', Menlo, Consolas, 'Courier New', monospace;
		font-size: 0.72rem;
		background: #f3f4f6;
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		color: #333;
	}
</style>
