<script lang="ts">
	import { onMount } from 'svelte';
	import { userStore } from '$lib/stores/userStore';
	import { groupConfig, groupMessages } from '$lib/stores/groupStore';
	import { NostrClient } from '$lib/nostr/client';
	import type { UserProfile, GroupConfig, GroupMessage } from '$lib/nostr/types';

	let user: UserProfile | null = null;
	let config: GroupConfig | null = null;
	let messages: GroupMessage[] = [];
	let debugInfo: string[] = [];
	let relayEvents: string[] = [];
	let debugClient: NostrClient | null = null;
	let isMonitoring = false;

	// Subscribe to stores
	const unsubscribeUser = userStore.subscribe(value => {
		user = value;
		log(`👤 User Store Update: ${user ? user.name + ' (' + user.pubkey.substring(0, 8) + '...)' : 'null'}`);
	});

	const unsubscribeConfig = groupConfig.subscribe(value => {
		config = value;
		log(`⚙️ Config Store Update: ${config ? 'Channel: ' + config.channelId.substring(0, 16) + '...' : 'null'}`);
	});

	const unsubscribeMessages = groupMessages.subscribe(value => {
		messages = value;
		log(`💬 Messages Store Update: ${messages.length} messages`);
	});

	onMount(() => {
		log('🚀 Debug-Seite geladen');
		return () => {
			unsubscribeUser();
			unsubscribeConfig();
			unsubscribeMessages();
		};
	});

	function log(message: string) {
		const timestamp = new Date().toLocaleTimeString();
		debugInfo = [...debugInfo, `[${timestamp}] ${message}`];
		console.log(message);
	}

	function clearDebug() {
		debugInfo = [];
	}

	// Test Channel-ID Ableitung
	async function testChannelIdDerivation() {
		const testSecrets = [
			'test-secret-123',
			'bitcoin-traders-secret',
			'same-secret',
			'same-secret' // Sollte gleiche Channel-ID ergeben
		];

		log('🧪 Teste Channel-ID Ableitung:');
		
		for (const secret of testSecrets) {
			const channelId = await deriveChannelIdFromSecret(secret);
			log(`  Secret: "${secret}" → Channel-ID: ${channelId.substring(0, 16)}...`);
		}
	}

	async function deriveChannelIdFromSecret(secret: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(secret + 'bitcoin-group-channel');
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	}

	function analyzeCurrentState() {
		log('📊 Aktuelle System-Analyse:');
		
		if (user) {
			log(`  👤 Benutzer: ${user.name}`);
			log(`  🔑 Public Key: ${user.pubkey}`);
			log(`  🔐 Hat Private Key: ${user.privkey ? 'Ja' : 'Nein'}`);
		} else {
			log('  👤 Kein Benutzer angemeldet');
		}

		if (config) {
			log(`  📋 Channel-ID: ${config.channelId}`);
			log(`  📡 Relay: ${config.relay}`);
			log(`  🔐 Secret (first 8): ${config.secret.substring(0, 8)}...`);
			log(`  📛 Gruppenname: ${config.name || 'Unbenannt'}`);
		} else {
			log('  ⚙️ Keine Gruppenkonfiguration');
		}

		log(`  💬 Nachrichten im Store: ${messages.length}`);
		messages.forEach((msg, index) => {
			log(`    ${index + 1}. ${msg.id.substring(0, 8)}... von ${msg.pubkey.substring(0, 8)}... (${msg.decrypted ? 'entschlüsselt' : 'verschlüsselt'})`);
		});

		// LocalStorage prüfen
		try {
			const storedUser = localStorage.getItem('nostr-user-profile');
			const storedConfig = localStorage.getItem('nostr-group-config');
			const storedMessages = localStorage.getItem('nostr-group-messages');
			
			log('  💾 LocalStorage:');
			log(`    User: ${storedUser ? 'Vorhanden' : 'Nicht vorhanden'}`);
			log(`    Config: ${storedConfig ? 'Vorhanden' : 'Nicht vorhanden'}`);
			log(`    Messages: ${storedMessages ? 'Vorhanden' : 'Nicht vorhanden'}`);
		} catch (error) {
			log(`  💾 LocalStorage Fehler: ${error}`);
		}
	}

	function clearLocalStorage() {
		localStorage.removeItem('nostr-user-profile');
		localStorage.removeItem('nostr-group-config');
		localStorage.removeItem('nostr-group-messages');
		log('🗑️ LocalStorage geleert');
	}

	function simulateSecondUser() {
		log('🎭 Simuliere zweiten Benutzer mit gleichem Secret...');
		
		if (!config) {
			log('❌ Keine Gruppenkonfiguration vorhanden');
			return;
		}

		// Simuliere Channel-ID Ableitung für zweiten Benutzer
		deriveChannelIdFromSecret(config.secret).then(channelId => {
			log(`🔍 Zweiter Benutzer würde Channel-ID bekommen: ${channelId}`);
			log(`🔍 Aktuelle Channel-ID: ${config!.channelId}`);
			log(`✅ Channel-IDs ${channelId === config!.channelId ? 'STIMMEN ÜBEREIN' : 'UNTERSCHEIDEN SICH'}`);
		});
	}

	async function startRelayMonitoring() {
		if (!user || !config) {
			log('❌ Benutzer und Konfiguration erforderlich für Relay-Monitoring!');
			return;
		}

		if (isMonitoring) {
			log('⚠️ Monitoring läuft bereits');
			return;
		}

		log('🔍 Starte Relay-Monitoring...');
		isMonitoring = true;
		relayEvents = ['🔍 Monitoring gestartet...'];
		
		try {
			debugClient = new NostrClient();
			debugClient.setUserProfile(user);
			await debugClient.configureGroup(config);
			await debugClient.connectToRelays([config.relay]);
			
			// Alle Events für diese Channel überwachen
			debugClient.subscribeToGroupMessages((message) => {
				const timestamp = new Date().toLocaleTimeString();
				const eventInfo = `📨 [${timestamp}] Von: ${message.pubkey.substring(0, 8)}... | Inhalt: ${message.content.substring(0, 50)}...`;
				relayEvents = [eventInfo, ...relayEvents.slice(0, 19)]; // Nur letzte 20 Events
				log(`🔍 Relay Event empfangen: ${eventInfo}`);
			});
			
			relayEvents = ['✅ Monitoring aktiv - Warte auf Events...', ...relayEvents];
			log('✅ Relay-Monitoring erfolgreich gestartet');
		} catch (error) {
			log(`❌ Fehler beim Relay-Monitoring: ${error}`);
			relayEvents = [`❌ Fehler: ${error}`, ...relayEvents];
			isMonitoring = false;
		}
	}

	function stopRelayMonitoring() {
		if (debugClient) {
			debugClient.close();
			debugClient = null;
		}
		isMonitoring = false;
		relayEvents = ['🛑 Monitoring gestoppt'];
		log('🛑 Relay-Monitoring gestoppt');
	}

	function clearRelayEvents() {
		relayEvents = [];
	}
</script>

<svelte:head>
	<title>Debug - System-Analyse</title>
</svelte:head>

<div class="debug-container">
	<h1>🔍 System Debug & Analyse</h1>
	
	<div class="controls">
		<button on:click={analyzeCurrentState}>📊 System analysieren</button>
		<button on:click={testChannelIdDerivation}>🧪 Channel-ID Test</button>
		<button on:click={simulateSecondUser}>🎭 Zweiten User simulieren</button>
		<button on:click={clearLocalStorage}>🗑️ LocalStorage leeren</button>
		<button on:click={clearDebug}>🧹 Debug leeren</button>
	</div>

	<div class="relay-controls">
		<h3>🔍 Relay-Monitoring</h3>
		<div class="relay-buttons">
			{#if !isMonitoring}
				<button on:click={startRelayMonitoring} class="start-btn">🚀 Monitoring starten</button>
			{:else}
				<button on:click={stopRelayMonitoring} class="stop-btn">🛑 Monitoring stoppen</button>
			{/if}
			<button on:click={clearRelayEvents}>🧹 Events leeren</button>
		</div>
		<div class="relay-status">
			Status: {isMonitoring ? '🟢 Aktiv' : '🔴 Inaktiv'}
		</div>
	</div>

	<div class="sections">
		<div class="section">
			<h2>📋 Aktuelle Stores</h2>
			<div class="store-info">
				<div class="store-item">
					<h3>👤 User Store</h3>
					{#if user}
						<ul>
							<li><strong>Name:</strong> {user.name}</li>
							<li><strong>Public Key:</strong> {user.pubkey.substring(0, 20)}...</li>
							<li><strong>Private Key:</strong> {user.privkey ? 'Vorhanden' : 'Nicht vorhanden'}</li>
						</ul>
					{:else}
						<p>Kein Benutzer angemeldet</p>
					{/if}
				</div>

				<div class="store-item">
					<h3>⚙️ Group Config Store</h3>
					{#if config}
						<ul>
							<li><strong>Channel-ID:</strong> {config.channelId}</li>
							<li><strong>Relay:</strong> {config.relay}</li>
							<li><strong>Secret:</strong> {config.secret.substring(0, 8)}...</li>
							<li><strong>Name:</strong> {config.name || 'Unbenannt'}</li>
						</ul>
					{:else}
						<p>Keine Gruppenkonfiguration</p>
					{/if}
				</div>

				<div class="store-item">
					<h3>💬 Messages Store</h3>
					<p><strong>Anzahl:</strong> {messages.length}</p>
					{#if messages.length > 0}
						<div class="messages-list">
							{#each messages.slice(-5) as message}
								<div class="message-item">
									<span class="id">{message.id.substring(0, 8)}...</span>
									<span class="pubkey">{message.pubkey.substring(0, 8)}...</span>
									<span class="status">{message.decrypted ? '🔓' : '🔒'}</span>
									<span class="content">{message.content.substring(0, 30)}...</span>
								</div>
							{/each}
						</div>
					{:else}
						<p>Keine Nachrichten</p>
					{/if}
				</div>
			</div>
		</div>

		<div class="section">
			<h2>📝 Debug Log</h2>
			<div class="debug-log">
				{#each debugInfo as info}
					<div class="log-line">{info}</div>
				{/each}
				{#if debugInfo.length === 0}
					<div class="no-logs">Keine Debug-Informationen</div>
				{/if}
			</div>
		</div>

		<div class="section relay-section">
			<h2>📡 Relay Events</h2>
			<div class="relay-log">
				{#each relayEvents as event}
					<div class="relay-line">{event}</div>
				{/each}
				{#if relayEvents.length === 0}
					<div class="no-logs">Keine Relay-Events</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="instructions">
		<h3>📖 Debug-Anweisungen</h3>
		<ol>
			<li>Melden Sie sich mit dem ersten Benutzer an</li>
			<li>Klicken Sie "System analysieren" und notieren Sie die Channel-ID</li>
			<li>Senden Sie eine Testnachricht</li>
			<li>Öffnen Sie ein neues Browser-Tab/Fenster</li>
			<li>Melden Sie sich mit dem zweiten Benutzer an (gleicher Einladungslink!)</li>
			<li>Klicken Sie wieder "System analysieren"</li>
			<li>Vergleichen Sie die Channel-IDs - sie müssen identisch sein!</li>
		</ol>
	</div>
</div>

<style>
	.debug-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: monospace;
	}

	h1 {
		color: #333;
		margin-bottom: 2rem;
	}

	.controls {
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	button {
		padding: 0.5rem 1rem;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
	}

	button:hover {
		background: #0056b3;
	}

	.relay-controls {
		background: #e3f2fd;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 2rem;
		border: 1px solid #bbdefb;
	}

	.relay-controls h3 {
		margin: 0 0 1rem 0;
		color: #1976d2;
	}

	.relay-buttons {
		display: flex;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.start-btn {
		background: #4caf50;
	}

	.start-btn:hover {
		background: #45a049;
	}

	.stop-btn {
		background: #f44336;
	}

	.stop-btn:hover {
		background: #da190b;
	}

	.relay-status {
		font-weight: bold;
		color: #333;
	}

	.sections {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 2rem;
		margin-bottom: 2rem;
	}

	.relay-section {
		grid-column: span 1;
	}

	.section {
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 1rem;
		background: #f8f9fa;
	}

	.section h2 {
		margin: 0 0 1rem 0;
		color: #555;
		font-size: 1.2rem;
	}

	.store-info {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.store-item {
		background: white;
		padding: 1rem;
		border-radius: 4px;
		border: 1px solid #e9ecef;
	}

	.store-item h3 {
		margin: 0 0 0.5rem 0;
		color: #333;
		font-size: 1rem;
	}

	.store-item ul {
		margin: 0;
		padding-left: 1.5rem;
		font-size: 0.85rem;
	}

	.store-item li {
		margin-bottom: 0.25rem;
	}

	.messages-list {
		max-height: 200px;
		overflow-y: auto;
		font-size: 0.8rem;
	}

	.message-item {
		display: grid;
		grid-template-columns: auto auto auto 1fr;
		gap: 0.5rem;
		padding: 0.25rem;
		border-bottom: 1px solid #eee;
		align-items: center;
	}

	.id, .pubkey {
		font-family: monospace;
		color: #666;
	}

	.status {
		font-size: 1rem;
	}

	.content {
		color: #333;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.debug-log, .relay-log {
		max-height: 400px;
		overflow-y: auto;
		background: #2d3748;
		color: #e2e8f0;
		padding: 1rem;
		border-radius: 4px;
		font-size: 0.85rem;
	}

	.relay-log {
		background: #1a202c;
		border: 1px solid #4a5568;
	}

	.log-line, .relay-line {
		margin-bottom: 0.25rem;
		word-break: break-all;
	}

	.relay-line {
		color: #68d391;
	}

	.no-logs {
		color: #a0aec0;
		font-style: italic;
		text-align: center;
		padding: 2rem;
	}

	.instructions {
		background: #fff3cd;
		padding: 1rem;
		border-radius: 6px;
		border: 1px solid #ffeaa7;
	}

	.instructions h3 {
		margin: 0 0 1rem 0;
		color: #333;
	}

	.instructions ol {
		margin: 0;
		padding-left: 1.5rem;
	}

	.instructions li {
		margin-bottom: 0.5rem;
	}

	@media (max-width: 768px) {
		.sections {
			grid-template-columns: 1fr;
		}
		
		.controls, .relay-buttons {
			flex-direction: column;
		}
	}
</style>