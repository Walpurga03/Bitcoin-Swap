<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	// Test-Daten
	const testLinks = [
		{
			name: "✅ Premium Gruppe (Korrekt)",
			url: "/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group123",
			expected: "Erfolg"
		},
		{
			name: "✅ Premium Gruppe Verkürzt (Andere Gruppe!)",
			url: "/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group12",
			expected: "Erfolg (aber ANDERE Channel-ID!)"
		},
		{
			name: "✅ VIP Gruppe (Korrekt)",
			url: "/?relay=wss%3A%2F%2Fnostr-relay.online&secret=vip-traders-456",
			expected: "Erfolg"
		},
		{
			name: "✅ Test Gruppe (Korrekt)",
			url: "/?relay=wss%3A%2F%2Fnostr-relay.online&secret=test-group-789",
			expected: "Erfolg"
		},
		{
			name: "✅ Minimaler Secret",
			url: "/?relay=wss%3A%2F%2Fnostr-relay.online&secret=abc",
			expected: "Erfolg (eigene Gruppe)"
		},
		{
			name: "❌ Fehlender Relay",
			url: "/?secret=premium-group123",
			expected: "Fehler: Ungültiger Einladungslink"
		},
		{
			name: "❌ Fehlender Secret",
			url: "/?relay=wss%3A%2F%2Fnostr-relay.online",
			expected: "Fehler: Ungültiger Einladungslink"
		},
		{
			name: "❌ Ungültiger Relay (HTTP)",
			url: "/?relay=http%3A%2F%2Finvalid-relay.com&secret=premium-group123",
			expected: "Fehler: Ungültige Relay-URL"
		},
		{
			name: "❌ Leerer Secret",
			url: "/?relay=wss%3A%2F%2Fnostr-relay.online&secret=",
			expected: "Fehler: Ungültiges Secret"
		}
	];

	const testNsecs = [
		{
			name: "✅ NSEC 1 (Gültig)",
			nsec: "nsec1fxae3wdgqhcwgwm0e3f38fg7dxr0xvmyyzxv542k3uwfrwv4ww9srh5du8",
			expected: "Erfolg (falls auf Whitelist)"
		},
		{
			name: "✅ NSEC 2 (Gültig)",
			nsec: "nsec1wcvy0qsgc06pe8403zphyekm0wrlwr8np9mx45x0jha2yaqa4ddqmkn9c9",
			expected: "Erfolg (falls auf Whitelist)"
		},
		{
			name: "❌ Ungültiger NSEC",
			nsec: "nsec1invalid123456789abcdefghijklmnopqrstuvwxyz1234567890abcdef",
			expected: "Fehler: Ungültiger nsec-Schlüssel"
		},
		{
			name: "❌ Zu kurzer NSEC",
			nsec: "nsec1kurz",
			expected: "Fehler: Ungültiger nsec-Schlüssel"
		},
		{
			name: "❌ Kein NSEC-Format",
			nsec: "nicht-nsec-format-12345678901234567890123456789012345678901234567890",
			expected: "Fehler: Ungültiger privater Schlüssel"
		}
	];

	let selectedLink = testLinks[0];
	let selectedNsec = testNsecs[0];
	let testResults: string[] = [];

	function addResult(message: string) {
		const timestamp = new Date().toLocaleTimeString();
		testResults = [`[${timestamp}] ${message}`, ...testResults];
	}

	function testLink(link: typeof testLinks[0]) {
		addResult(`🔗 Teste Link: ${link.name}`);
		addResult(`   URL: ${link.url}`);
		addResult(`   Erwartet: ${link.expected}`);
		
		// Link öffnen
		window.open(window.location.origin + link.url, '_blank');
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text).then(() => {
			addResult(`📋 Kopiert: ${text.substring(0, 50)}...`);
		});
	}

	function clearResults() {
		testResults = [];
	}

	function goToMainLogin() {
		goto('/');
	}
</script>

<svelte:head>
	<title>Login Test Suite - Bitcoin Tausch Netzwerk</title>
</svelte:head>

<div class="test-container">
	<h1>🧪 Login Test Suite</h1>
	<p>Systematisches Testen des Anmelde-Systems</p>

	<div class="test-sections">
		<!-- Test Links Sektion -->
		<div class="section">
			<h2>🔗 Test-Links</h2>
			<div class="test-grid">
				{#each testLinks as link}
					<div class="test-item" class:success={link.expected === "Erfolg"} class:error={link.expected.startsWith("Fehler")}>
						<div class="test-header">
							<strong>{link.name}</strong>
						</div>
						<div class="test-url">
							<code>{link.url}</code>
						</div>
						<div class="test-expected">
							<em>Erwartet: {link.expected}</em>
						</div>
						<div class="test-actions">
							<button on:click={() => testLink(link)} class="test-btn">
								🚀 Testen
							</button>
							<button on:click={() => copyToClipboard(window.location.origin + link.url)} class="copy-btn">
								📋 Kopieren
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Test NSECs Sektion -->
		<div class="section">
			<h2>🔑 Test-NSECs</h2>
			<div class="test-grid">
				{#each testNsecs as nsec}
					<div class="test-item" class:success={nsec.expected.startsWith("Erfolg")} class:error={nsec.expected.startsWith("Fehler")}>
						<div class="test-header">
							<strong>{nsec.name}</strong>
						</div>
						<div class="test-nsec">
							<code>{nsec.nsec}</code>
						</div>
						<div class="test-expected">
							<em>Erwartet: {nsec.expected}</em>
						</div>
						<div class="test-actions">
							<button on:click={() => copyToClipboard(nsec.nsec)} class="copy-btn">
								📋 NSEC kopieren
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Test-Protokoll -->
	<div class="section">
		<h2>📊 Test-Protokoll</h2>
		<div class="protocol-controls">
			<button on:click={clearResults} class="clear-btn">🗑️ Löschen</button>
			<button on:click={goToMainLogin} class="main-btn">🏠 Zum Hauptlogin</button>
		</div>
		<div class="results">
			{#each testResults as result}
				<div class="result-line">{result}</div>
			{/each}
			{#if testResults.length === 0}
				<div class="no-results">Keine Test-Ergebnisse</div>
			{/if}
		</div>
	</div>

	<!-- Anleitung -->
	<div class="section">
		<h3>📋 Test-Anleitung</h3>
		<ol>
			<li><strong>Link testen:</strong> Klicken Sie "🚀 Testen" um den Link in einem neuen Tab zu öffnen</li>
			<li><strong>NSEC eingeben:</strong> Kopieren Sie einen Test-NSEC und fügen Sie ihn im Login-Formular ein</li>
			<li><strong>Ergebnis prüfen:</strong> Vergleichen Sie das tatsächliche Ergebnis mit der Erwartung</li>
			<li><strong>Protokollieren:</strong> Dokumentieren Sie Erfolg/Fehler im Test-Protokoll</li>
		</ol>

		<div class="info-box">
			<h4>⚠️ Wichtige Hinweise:</h4>
			<ul>
				<li>Stellen Sie sicher, dass die Test-NPUBs in der Whitelist stehen</li>
				<li>Öffnen Sie die Browser-Konsole für detaillierte Logs</li>
				<li>Testen Sie sowohl positive als auch negative Szenarien</li>
				<li>Dokumentieren Sie unerwartete Ergebnisse</li>
			</ul>
		</div>
	</div>
</div>

<style>
	.test-container {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	h1 {
		color: #333;
		text-align: center;
		margin-bottom: 0.5rem;
	}

	p {
		text-align: center;
		color: #666;
		margin-bottom: 2rem;
	}

	.test-sections {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		margin-bottom: 2rem;
	}

	.section {
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 1.5rem;
		background: #fafafa;
	}

	.section h2 {
		margin: 0 0 1rem 0;
		color: #333;
		font-size: 1.3rem;
	}

	.test-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.test-item {
		border: 1px solid #ddd;
		border-radius: 6px;
		padding: 1rem;
		background: white;
	}

	.test-item.success {
		border-left: 4px solid #28a745;
	}

	.test-item.error {
		border-left: 4px solid #dc3545;
	}

	.test-header {
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
	}

	.test-url, .test-nsec {
		margin-bottom: 0.5rem;
		font-size: 0.8rem;
		word-break: break-all;
	}

	.test-expected {
		margin-bottom: 1rem;
		font-size: 0.8rem;
		color: #666;
	}

	.test-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.test-btn {
		background: #007bff;
		color: white;
		border: none;
		padding: 0.4rem 0.8rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
	}

	.copy-btn {
		background: #6c757d;
		color: white;
		border: none;
		padding: 0.4rem 0.8rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
	}

	.clear-btn {
		background: #dc3545;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
	}

	.main-btn {
		background: #28a745;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
	}

	.protocol-controls {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.results {
		max-height: 300px;
		overflow-y: auto;
		background: white;
		border: 1px solid #ddd;
		border-radius: 4px;
		padding: 1rem;
		font-family: monospace;
		font-size: 0.85rem;
	}

	.result-line {
		margin-bottom: 0.5rem;
		padding: 0.25rem;
		border-left: 3px solid #007bff;
		padding-left: 0.5rem;
	}

	.no-results {
		color: #999;
		font-style: italic;
		text-align: center;
		padding: 2rem;
	}

	.info-box {
		background: #e9ecef;
		border: 1px solid #dee2e6;
		border-radius: 4px;
		padding: 1rem;
		margin-top: 1rem;
	}

	.info-box h4 {
		margin: 0 0 0.5rem 0;
		color: #495057;
	}

	.info-box ul {
		margin: 0;
		padding-left: 1.5rem;
	}

	.info-box li {
		margin-bottom: 0.25rem;
		color: #6c757d;
	}

	code {
		background: #f8f9fa;
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
		font-size: 0.85em;
		border: 1px solid #e9ecef;
	}

	@media (max-width: 768px) {
		.test-sections {
			grid-template-columns: 1fr;
		}
		
		.test-actions {
			flex-direction: column;
		}
		
		.protocol-controls {
			flex-direction: column;
		}
	}
</style>