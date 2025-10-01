<script lang="ts">
	import { onMount } from 'svelte';
	import { parseInviteLink } from '$lib/utils';

	let testResults: Array<{
		secret: string;
		channelId: string;
		input: string;
		url: string;
		parsedSecret: string;
	}> = [];

	let customSecret = 'premium-group123';
	let customResult = '';

	// Channel-ID deterministisch aus Secret ableiten (gleiche Funktion wie in +page.svelte)
	async function deriveChannelIdFromSecret(secret: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(secret + 'bitcoin-group-channel');
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const channelId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
		
		console.log('🔧 Channel-ID Ableitung:');
		console.log('  🔐 Secret:', secret);
		console.log('  📋 Input:', secret + 'bitcoin-group-channel');
		console.log('  📋 Channel-ID:', channelId);
		
		return channelId;
	}

	async function testSecret(secret: string): Promise<{
		secret: string;
		channelId: string;
		input: string;
		url: string;
		parsedSecret: string;
	}> {
		// URL erstellen
		const url = `http://localhost:5173/?relay=wss%3A%2F%2Fnostr-relay.online&secret=${encodeURIComponent(secret)}`;
		
		// URL parsen
		const parsed = parseInviteLink(url);
		const parsedSecret = parsed?.secret || 'FEHLER';
		
		// Channel-ID generieren
		const channelId = await deriveChannelIdFromSecret(secret);
		const input = secret + 'bitcoin-group-channel';
		
		return {
			secret,
			channelId,
			input,
			url,
			parsedSecret
		};
	}

	async function runTests() {
		testResults = [];
		
		const secrets = [
			'premium-group123',
			'premium-group12',
			'premium-group1',
			'premium-group',
			'test123',
			'test12',
			'a',
			'ab',
			'abc'
		];

		for (const secret of secrets) {
			const result = await testSecret(secret);
			testResults.push(result);
		}
		
		testResults = testResults; // Trigger reactivity
	}

	async function testCustomSecret() {
		if (!customSecret.trim()) return;
		
		const result = await testSecret(customSecret.trim());
		customResult = JSON.stringify(result, null, 2);
	}

	onMount(() => {
		runTests();
	});

	// Hilfsfunktion: Zeige nur ersten Teil der Channel-ID
	function shortChannelId(channelId: string): string {
		return channelId.substring(0, 16) + '...';
	}

	// Prüfe ob zwei Channel-IDs gleich sind
	function isDuplicate(channelId: string, index: number): boolean {
		return testResults.some((result, i) => i !== index && result.channelId === channelId);
	}
</script>

<svelte:head>
	<title>Secret Debug Test</title>
</svelte:head>

<div class="debug-container">
	<header class="debug-header">
		<h1>🔍 Secret Debug Test</h1>
		<p>Teste die Channel-ID Generierung für verschiedene Secrets</p>
		<button on:click={runTests} class="refresh-btn">🔄 Tests neu ausführen</button>
	</header>

	<section class="custom-test">
		<h2>🧪 Custom Secret Test</h2>
		<div class="input-group">
			<input 
				type="text" 
				bind:value={customSecret} 
				placeholder="Eigenes Secret eingeben..."
				on:keydown={(e) => e.key === 'Enter' && testCustomSecret()}
			/>
			<button on:click={testCustomSecret}>Test</button>
		</div>
		{#if customResult}
			<pre class="result">{customResult}</pre>
		{/if}
	</section>

	<section class="test-results">
		<h2>📊 Test Ergebnisse</h2>
		<div class="results-table">
			<div class="table-header">
				<div>Secret</div>
				<div>Parsed Secret</div>
				<div>Channel-ID (kurz)</div>
				<div>Vollständige Channel-ID</div>
				<div>Status</div>
			</div>
			{#each testResults as result, index}
				<div class="table-row" class:duplicate={isDuplicate(result.channelId, index)}>
					<div class="secret">"{result.secret}"</div>
					<div class="parsed-secret">"{result.parsedSecret}"</div>
					<div class="channel-short">{shortChannelId(result.channelId)}</div>
					<div class="channel-full">{result.channelId}</div>
					<div class="status">
						{#if result.secret !== result.parsedSecret}
							❌ Parse-Fehler
						{:else if isDuplicate(result.channelId, index)}
							⚠️ DUPLIKAT!
						{:else}
							✅ Unique
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section class="analysis">
		<h2>🔬 Analyse</h2>
		<div class="analysis-content">
			<h3>Duplikate gefunden:</h3>
			{#each testResults as result, index}
				{#if isDuplicate(result.channelId, index)}
					<div class="duplicate-warning">
						⚠️ Secret "{result.secret}" hat die gleiche Channel-ID wie ein anderes Secret!
					</div>
				{/if}
			{/each}
			
			<h3>URL Parsing:</h3>
			{#each testResults as result}
				{#if result.secret !== result.parsedSecret}
					<div class="parse-error">
						❌ Secret "{result.secret}" wurde als "{result.parsedSecret}" geparst
					</div>
				{/if}
			{/each}
		</div>
	</section>

	<section class="debug-info">
		<h2>🛠️ Debug Info</h2>
		<div class="debug-details">
			<p><strong>Hash-Algorithmus:</strong> SHA-256</p>
			<p><strong>Input-Format:</strong> secret + "bitcoin-group-channel"</p>
			<p><strong>Output-Format:</strong> 64-stelliger Hex-String</p>
			<p><strong>URL-Encoding:</strong> encodeURIComponent()</p>
		</div>
	</section>
</div>

<style>
	.debug-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: 'Courier New', monospace;
	}

	.debug-header {
		text-align: center;
		margin-bottom: 2rem;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 8px;
	}

	.debug-header h1 {
		margin: 0 0 0.5rem 0;
		color: #333;
	}

	.refresh-btn {
		padding: 0.5rem 1rem;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		margin-top: 1rem;
	}

	.refresh-btn:hover {
		background: #0056b3;
	}

	.custom-test {
		margin-bottom: 2rem;
		padding: 1rem;
		background: #fff3cd;
		border-radius: 8px;
		border: 1px solid #ffeaa7;
	}

	.input-group {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.input-group input {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-family: 'Courier New', monospace;
	}

	.input-group button {
		padding: 0.5rem 1rem;
		background: #28a745;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.result {
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
		font-size: 0.9rem;
	}

	.test-results {
		margin-bottom: 2rem;
	}

	.results-table {
		display: grid;
		grid-template-columns: 150px 150px 200px 1fr 100px;
		gap: 0.5rem;
		font-size: 0.9rem;
	}

	.table-header {
		display: contents;
		font-weight: bold;
		background: #e9ecef;
	}

	.table-header > div {
		padding: 0.75rem 0.5rem;
		background: #e9ecef;
		border-radius: 4px;
	}

	.table-row {
		display: contents;
	}

	.table-row.duplicate > div {
		background: #f8d7da;
		color: #721c24;
	}

	.table-row > div {
		padding: 0.5rem;
		border: 1px solid #dee2e6;
		background: white;
		word-break: break-all;
	}

	.secret, .parsed-secret {
		font-weight: bold;
		color: #0066cc;
	}

	.channel-short {
		font-family: 'Courier New', monospace;
		font-size: 0.8rem;
	}

	.channel-full {
		font-family: 'Courier New', monospace;
		font-size: 0.7rem;
		word-break: break-all;
	}

	.status {
		text-align: center;
		font-weight: bold;
	}

	.analysis {
		margin-bottom: 2rem;
		padding: 1rem;
		background: #d1ecf1;
		border-radius: 8px;
		border: 1px solid #bee5eb;
	}

	.duplicate-warning, .parse-error {
		padding: 0.5rem;
		margin: 0.5rem 0;
		border-radius: 4px;
		font-weight: bold;
	}

	.duplicate-warning {
		background: #f8d7da;
		color: #721c24;
		border: 1px solid #f5c6cb;
	}

	.parse-error {
		background: #f8d7da;
		color: #721c24;
		border: 1px solid #f5c6cb;
	}

	.debug-info {
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #dee2e6;
	}

	.debug-details p {
		margin: 0.5rem 0;
	}
</style>