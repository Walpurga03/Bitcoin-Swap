<script lang="ts">
	import { onMount } from 'svelte';
	import { NostrClient } from '$lib/nostr/client';
	import { setUser } from '$lib/stores/userStore';
	import { setGroupConfig, groupMessages, addGroupMessage } from '$lib/stores/groupStore';
	import type { UserProfile, GroupConfig, GroupMessage } from '$lib/nostr/types';
	import whitelistData from '../../whitelist.json';

	let testResults: string[] = [];
	let client: NostrClient | null = null;
	let messages: GroupMessage[] = [];

	// Test-Konfiguration
	const testConfig: GroupConfig = {
		channelId: 'test-channel-12345678901234567890123456789012',
		relay: 'wss://relay.damus.io',
		secret: 'test-secret-123',
		name: 'Test Gruppe'
	};

	const testUser: UserProfile = {
		pubkey: 'test-pubkey-123',
		privkey: 'test-privkey-123',
		name: 'Test User'
	};

	// Subscribe to messages
	const unsubscribeMessages = groupMessages.subscribe(value => {
		messages = value;
		log(`📨 Messages updated: ${messages.length} total`);
	});

	onMount(() => {
		log('🚀 Test-Seite geladen');
		return () => {
			unsubscribeMessages();
			if (client) {
				client.close();
			}
		};
	});

	function log(message: string) {
		const timestamp = new Date().toLocaleTimeString();
		testResults = [...testResults, `[${timestamp}] ${message}`];
		console.log(message);
	}

	async function testStores() {
		log('🧪 Teste Stores...');
		
		try {
			// User Store testen
			setUser(testUser);
			log('✅ User Store gesetzt');

			// Group Store testen
			setGroupConfig(testConfig);
			log('✅ Group Store gesetzt');

			// Test-Nachricht hinzufügen
			const testMessage: GroupMessage = {
				id: 'test-msg-' + Date.now(),
				pubkey: testUser.pubkey,
				content: 'Test Nachricht ' + new Date().toLocaleTimeString(),
				timestamp: Math.floor(Date.now() / 1000),
				decrypted: true
			};

			addGroupMessage(testMessage);
			log('✅ Test-Nachricht hinzugefügt');

		} catch (error) {
			log(`❌ Store-Test fehlgeschlagen: ${error}`);
		}
	}

	async function testNostrClient() {
		log('🧪 Teste NostrClient...');
		
		try {
			client = new NostrClient();
			log('✅ NostrClient erstellt');

			client.setUserProfile(testUser);
			log('✅ User-Profil gesetzt');

			await client.configureGroup(testConfig);
			log('✅ Gruppe konfiguriert');

			await client.connectToRelays([testConfig.relay]);
			log('✅ Relay-Verbindung hergestellt');

			// Auf Nachrichten hören
			client.subscribeToGroupMessages((message: GroupMessage) => {
				log(`📨 Nachricht empfangen: ${message.id}`);
				addGroupMessage(message);
			});
			log('✅ Subscription gestartet');

		} catch (error) {
			log(`❌ NostrClient-Test fehlgeschlagen: ${error}`);
		}
	}

	async function sendTestMessage() {
		if (!client) {
			log('❌ Client nicht initialisiert');
			return;
		}

		try {
			const testContent = `Test-Nachricht um ${new Date().toLocaleTimeString()}`;
			log(`📤 Sende Test-Nachricht: ${testContent}`);
			
			await client.sendGroupMessage(testContent);
			log('✅ Test-Nachricht gesendet');
		} catch (error) {
			log(`❌ Fehler beim Senden: ${error}`);
		}
	}

	function clearResults() {
		testResults = [];
		messages = [];
		groupMessages.set([]);
	}

	function testWhitelist() {
		log('🧪 Teste Whitelist...');
		log(`📋 Whitelist enthält ${whitelistData.allowed_pubkeys.length} Einträge:`);
		whitelistData.allowed_pubkeys.forEach((entry, index) => {
			log(`  ${index + 1}. ${entry.name}: ${entry.pubkey.substring(0, 20)}...`);
		});
	}
</script>

<svelte:head>
	<title>Chat System Test</title>
</svelte:head>

<div class="test-container">
	<h1>🧪 Chat System Test & Debug</h1>
	
	<div class="test-controls">
		<button on:click={testWhitelist}>Test Whitelist</button>
		<button on:click={testStores}>Test Stores</button>
		<button on:click={testNostrClient}>Test NostrClient</button>
		<button on:click={sendTestMessage} disabled={!client}>Send Test Message</button>
		<button on:click={clearResults}>Clear Results</button>
	</div>

	<div class="test-sections">
		<div class="section">
			<h2>📊 Test Results</h2>
			<div class="results">
				{#each testResults as result}
					<div class="result-line">{result}</div>
				{/each}
				{#if testResults.length === 0}
					<div class="no-results">Keine Test-Ergebnisse</div>
				{/if}
			</div>
		</div>

		<div class="section">
			<h2>💬 Messages ({messages.length})</h2>
			<div class="messages">
				{#each messages as message}
					<div class="message">
						<div class="message-header">
							<span class="id">{message.id.substring(0, 8)}...</span>
							<span class="pubkey">{message.pubkey.substring(0, 8)}...</span>
							<span class="time">{new Date(message.timestamp * 1000).toLocaleTimeString()}</span>
							<span class="encrypted">{message.decrypted ? '🔓' : '🔒'}</span>
						</div>
						<div class="content">{message.content}</div>
					</div>
				{/each}
				{#if messages.length === 0}
					<div class="no-messages">Keine Nachrichten</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="info">
		<h3>ℹ️ Debug-Informationen</h3>
		<ul>
			<li><strong>Test Channel ID:</strong> {testConfig.channelId}</li>
			<li><strong>Test Relay:</strong> {testConfig.relay}</li>
			<li><strong>Client Status:</strong> {client ? client.getConnectionStatus() : 'Nicht initialisiert'}</li>
			<li><strong>Cache Stats:</strong> {client ? JSON.stringify(client.getCacheStats()) : 'N/A'}</li>
		</ul>
	</div>
</div>

<style>
	.test-container {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
		font-family: monospace;
	}

	h1 {
		color: #333;
		margin-bottom: 2rem;
	}

	.test-controls {
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	button {
		padding: 0.5rem 1rem;
		background: #667eea;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
	}

	button:hover:not(:disabled) {
		background: #5a6fd8;
	}

	button:disabled {
		background: #ccc;
		cursor: not-allowed;
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
		padding: 1rem;
	}

	.section h2 {
		margin: 0 0 1rem 0;
		color: #555;
		font-size: 1.2rem;
	}

	.results, .messages {
		max-height: 400px;
		overflow-y: auto;
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 4px;
		font-size: 0.85rem;
	}

	.result-line {
		margin-bottom: 0.5rem;
		padding: 0.25rem;
		border-left: 3px solid #667eea;
		padding-left: 0.5rem;
	}

	.message {
		margin-bottom: 1rem;
		padding: 0.5rem;
		background: white;
		border-radius: 4px;
		border: 1px solid #eee;
	}

	.message-header {
		display: flex;
		gap: 1rem;
		font-size: 0.75rem;
		color: #666;
		margin-bottom: 0.25rem;
	}

	.content {
		font-size: 0.9rem;
		color: #333;
	}

	.no-results, .no-messages {
		color: #999;
		font-style: italic;
		text-align: center;
		padding: 2rem;
	}

	.info {
		background: #f0f0f0;
		padding: 1rem;
		border-radius: 8px;
		border-left: 4px solid #667eea;
	}

	.info h3 {
		margin: 0 0 1rem 0;
		color: #333;
	}

	.info ul {
		margin: 0;
		padding-left: 1.5rem;
	}

	.info li {
		margin-bottom: 0.5rem;
		color: #555;
	}

	@media (max-width: 768px) {
		.test-sections {
			grid-template-columns: 1fr;
		}
		
		.test-controls {
			flex-direction: column;
		}
	}
</style>