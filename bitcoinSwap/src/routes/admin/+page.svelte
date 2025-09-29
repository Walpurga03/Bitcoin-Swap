<script lang="ts">
	import { onMount } from 'svelte';
	import { validateRelayUrl } from '$lib/security/validation';
	import { 
		loadConfig, 
		getAvailableGroups, 
		getAllowedRelays, 
		createSecureInviteLink,
		getDefaultRelay 
	} from '$lib/config';
	import { PUBLIC_ALLOWED_PUBKEYS } from '$env/static/public';

	let relay = '';
	let selectedGroup = '';
	let generatedLink = '';
	let baseUrl = '';
	let error = '';
	let success = '';
	let loading = true;

	// Dynamisch geladene Optionen
	let relayOptions: string[] = [];
	let groupOptions: Array<{key: string, name: string}> = [];
	
	// Whitelist aus Environment Variables
	let allowedUsers: Array<{name: string, pubkey: string}> = [];

	onMount(async () => {
		baseUrl = window.location.origin;
		
		try {
			// Lade Konfiguration
			await loadConfig();
			
			// Lade verfügbare Relays und Gruppen
			relayOptions = await getAllowedRelays();
			groupOptions = await getAvailableGroups();
			relay = await getDefaultRelay();
			
			if (groupOptions.length > 0) {
				selectedGroup = groupOptions[0].key;
			}
			
			// Parse Whitelist aus Environment Variable
			const allowedPubkeysEnv = PUBLIC_ALLOWED_PUBKEYS || '';
			const pubkeys = allowedPubkeysEnv.split(',').map((key: string) => key.trim()).filter((key: string) => key.length > 0);
			allowedUsers = pubkeys.map((pubkey, index) => ({
				name: `User_${index + 1}`,
				pubkey: pubkey
			}));
			
			loading = false;
		} catch (err) {
			error = 'Fehler beim Laden der Konfiguration: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler');
			loading = false;
		}
	});

	async function generateInviteLink() {
		error = '';
		success = '';

		// Validierung
		if (!relay || !selectedGroup) {
			error = 'Bitte wählen Sie Relay und Gruppe aus';
			return;
		}

		const relayValidation = validateRelayUrl(relay);
		if (!relayValidation.isValid) {
			error = `Ungültige Relay-URL: ${relayValidation.errors.join(', ')}`;
			return;
		}

		// Link generieren mit sicherem Secret aus Konfiguration
		try {
			generatedLink = await createSecureInviteLink(baseUrl, relay, selectedGroup);
			success = 'Einladungslink erfolgreich generiert!';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Fehler beim Generieren des Links';
		}
	}

	function copyToClipboard() {
		if (generatedLink) {
			navigator.clipboard.writeText(generatedLink).then(() => {
				success = 'Link in Zwischenablage kopiert!';
			}).catch(() => {
				error = 'Fehler beim Kopieren in die Zwischenablage';
			});
		}
	}

	function testLink() {
		if (generatedLink) {
			window.open(generatedLink, '_blank');
		}
	}
</script>

<svelte:head>
	<title>Admin - Einladungslink Generator</title>
</svelte:head>

<div class="admin-container">
	<h1>🔧 Admin Panel - Einladungslink Generator</h1>
	
	<div class="whitelist-info">
		<h2>📋 Aktuelle Whitelist ({allowedUsers.length} Benutzer)</h2>
		<div class="whitelist-users">
			{#each allowedUsers as user}
				<div class="user-entry">
					<span class="name">{user.name}</span>
					<span class="pubkey">{user.pubkey.substring(0, 20)}...</span>
				</div>
			{/each}
		</div>
	</div>

	<div class="generator-section">
		<h2>🔗 Einladungslink erstellen</h2>
		
		{#if loading}
			<div class="loading">⏳ Lade Konfiguration...</div>
		{:else}
			{#if error}
				<div class="error">{error}</div>
			{/if}
			
			{#if success}
				<div class="success">{success}</div>
			{/if}

			<div class="form-group">
				<label for="group">Gruppe auswählen:</label>
				<select id="group" bind:value={selectedGroup}>
					{#each groupOptions as group}
						<option value={group.key}>{group.name}</option>
					{/each}
				</select>
				<small>Wählen Sie eine vorkonfigurierte Gruppe aus config.json</small>
			</div>

			<div class="form-group">
				<label for="relay">Nostr Relay:</label>
				<select id="relay" bind:value={relay}>
					{#each relayOptions as relayOption}
						<option value={relayOption}>{relayOption}</option>
					{/each}
				</select>
				<small>Wählen Sie einen zuverlässigen Nostr-Relay für die Gruppe</small>
			</div>

			<button on:click={generateInviteLink} class="create-btn">
				🚀 Einladungslink erstellen
			</button>
		{/if}

		{#if generatedLink}
			<div class="result-section">
				<h3>✅ Generierter Einladungslink:</h3>
				<div class="link-display">
					<input 
						type="text" 
						value={generatedLink} 
						readonly 
						class="link-input"
					/>
					<button on:click={copyToClipboard} class="copy-btn">📋 Kopieren</button>
					<button on:click={testLink} class="test-btn">🧪 Testen</button>
				</div>
				
				<div class="link-info">
					<h4>📊 Link-Details:</h4>
					<ul>
						<li><strong>Gruppe:</strong> {groupOptions.find(g => g.key === selectedGroup)?.name || selectedGroup}</li>
						<li><strong>Relay:</strong> {relay}</li>
						<li><strong>Base URL:</strong> {baseUrl}</li>
						<li><strong>Erlaubte Benutzer:</strong> {allowedUsers.length}</li>
					</ul>
				</div>
			</div>
		{/if}
	</div>

	<div class="instructions">
		<h3>📖 Anweisungen:</h3>
		<ol>
			<li>Wählen Sie eine vorkonfigurierte Gruppe aus</li>
			<li>Wählen Sie einen zuverlässigen Nostr-Relay</li>
			<li>Klicken Sie auf "Einladungslink erstellen"</li>
			<li>Kopieren Sie den Link und senden Sie ihn an Whitelist-Benutzer</li>
			<li>Benutzer müssen ihren nsec/hex-Schlüssel eingeben</li>
			<li>Das System prüft automatisch die Whitelist-Berechtigung</li>
		</ol>
	</div>

	<div class="security-notes">
		<h3>🔒 Sicherheitshinweise:</h3>
		<ul>
			<li>Gruppen-Secrets werden sicher in config.json gespeichert (nicht in Git)</li>
			<li>Senden Sie Einladungslinks über sichere Kanäle</li>
			<li>Nur Personen in der Whitelist können der Gruppe beitreten</li>
			<li>Secrets werden für die Verschlüsselung aller Nachrichten verwendet</li>
			<li>Erstellen Sie config.json basierend auf config.example.json</li>
		</ul>
	</div>

	<div class="config-info">
		<h3>⚙️ Konfiguration:</h3>
		<p>Erstellen Sie eine <code>src/config.json</code> Datei basierend auf <code>src/config.example.json</code>:</p>
		<pre><code>{JSON.stringify({
			"groupSecrets": {
				"bitcoin-traders": "IhrSicheresSecret123",
				"premium-group": "AnotherSecureSecret456"
			},
			"defaultRelay": "wss://nostr-relay.online",
			"allowedRelays": [
				"wss://nostr-relay.online",
				"wss://relay.damus.io", 
				"wss://nos.lol"
			]
		}, null, 2)}</code></pre>
	</div>
</div>

<style>
	.admin-container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	h1 {
		color: #333;
		text-align: center;
		margin-bottom: 2rem;
	}

	h2, h3 {
		color: #555;
		margin-top: 2rem;
		margin-bottom: 1rem;
	}

	.whitelist-info {
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 2rem;
		border-left: 4px solid #007bff;
	}

	.whitelist-users {
		display: grid;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.user-entry {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem;
		background: white;
		border-radius: 4px;
		border: 1px solid #e9ecef;
	}

	.name {
		font-weight: 600;
		color: #333;
	}

	.pubkey {
		font-family: monospace;
		color: #666;
		font-size: 0.9rem;
	}

	.generator-section {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
		margin-bottom: 2rem;
	}

	.loading {
		text-align: center;
		padding: 2rem;
		color: #666;
		font-style: italic;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: #333;
	}

	select, input {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #e1e5e9;
		border-radius: 6px;
		font-size: 1rem;
	}

	select:focus, input:focus {
		outline: none;
		border-color: #007bff;
	}

	.create-btn {
		width: 100%;
		padding: 1rem;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
	}

	.create-btn:hover {
		background: #0056b3;
	}

	.result-section {
		margin-top: 2rem;
		padding: 1rem;
		background: #d4edda;
		border-radius: 6px;
		border: 1px solid #c3e6cb;
	}

	.link-display {
		display: flex;
		gap: 0.5rem;
		margin: 1rem 0;
	}

	.link-input {
		flex: 1;
		font-family: monospace;
		font-size: 0.9rem;
	}

	.copy-btn, .test-btn {
		padding: 0.75rem 1rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		white-space: nowrap;
	}

	.copy-btn {
		background: #6c757d;
		color: white;
	}

	.test-btn {
		background: #17a2b8;
		color: white;
	}

	.copy-btn:hover {
		background: #545b62;
	}

	.test-btn:hover {
		background: #138496;
	}

	.link-info {
		margin-top: 1rem;
	}

	.link-info ul {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
	}

	.instructions, .security-notes, .config-info {
		background: #fff3cd;
		padding: 1rem;
		border-radius: 6px;
		border: 1px solid #ffeaa7;
		margin-bottom: 1rem;
	}

	.security-notes {
		background: #f8d7da;
		border-color: #f5c6cb;
	}

	.config-info {
		background: #e2e3e5;
		border-color: #d6d8db;
	}

	.instructions ol, .security-notes ul {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
	}

	.instructions li, .security-notes li {
		margin-bottom: 0.5rem;
	}

	pre {
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
		font-size: 0.85rem;
		border: 1px solid #e9ecef;
	}

	code {
		font-family: 'Courier New', monospace;
		background: #f8f9fa;
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
		font-size: 0.9rem;
	}

	small {
		display: block;
		margin-top: 0.25rem;
		color: #6c757d;
		font-size: 0.875rem;
	}

	.error {
		background: #f8d7da;
		color: #721c24;
		padding: 0.75rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		border: 1px solid #f5c6cb;
	}

	.success {
		background: #d4edda;
		color: #155724;
		padding: 0.75rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		border: 1px solid #c3e6cb;
	}
</style>