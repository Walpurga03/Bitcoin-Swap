<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { userStore } from '$lib/stores/userStore';
	import { groupConfig, groupMessages, addGroupMessage } from '$lib/stores/groupStore';
	import { NostrClient } from '$lib/nostr/client';
	import { formatTime, truncatePubkey, debounce } from '$lib/utils';
	import { sanitizeInput } from '$lib/security/validation';
	import ErrorBoundary from '../../../components/ErrorBoundary.svelte';
	import LoadingSpinner from '../../../components/LoadingSpinner.svelte';
	import type { GroupMessage, UserProfile, GroupConfig } from '$lib/nostr/types';
	
	let client: NostrClient | null = null;
	let messageInput = '';
	let user: UserProfile | null = null;
	let config: GroupConfig | null = null;
	let messages: GroupMessage[] = [];
	let loading = true;
	let error = '';
	let messagesContainer: HTMLElement;
	let connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
	let retryCount = 0;
	let maxRetries = 3;
	let refreshing = false;
	let lastRefresh = '';

	// Reactive subscriptions mit Unsubscribe-Funktionen
	const unsubscribeUser = userStore.subscribe(value => user = value);
	const unsubscribeConfig = groupConfig.subscribe(value => config = value);
	const unsubscribeMessages = groupMessages.subscribe(value => messages = value);

	// Debounced scroll function für Performance
	const debouncedScrollToBottom = debounce(scrollToBottom, 100);

	onMount(async () => {
		console.log('🚀 Group page mounted');
		console.log('👤 User:', user ? user.pubkey.substring(0, 8) : 'null');
		console.log('⚙️ Config:', config ? config.channelId : 'null');
		
		if (!user || !config) {
			console.warn('❌ User oder Config fehlt, redirect zur Anmeldung');
			window.location.href = '/';
			return;
		}

		await initializeConnection();
	});

	async function initializeConnection() {
		try {
			loading = true;
			error = '';
			connectionStatus = 'connecting';
			console.log('🔄 Initialisiere Verbindung...');

			// NostrClient initialisieren
			client = new NostrClient();
			console.log('✅ NostrClient erstellt');
			
			client.setUserProfile(user!);
			console.log('✅ User-Profil gesetzt');
			
			await client.configureGroup(config!);
			console.log('✅ Gruppe konfiguriert:', config!.channelId);
			
			await client.connectToRelays([config!.relay]);
			console.log('✅ Relay-Verbindung hergestellt:', config!.relay);

			connectionStatus = client.getConnectionStatus();
			console.log('📊 Verbindungsstatus:', connectionStatus);

			// Auf Nachrichten hören
			client.subscribeToGroupMessages((message: GroupMessage) => {
				console.log('📨 Neue Nachricht empfangen:', message.id);
				addGroupMessage(message);
				debouncedScrollToBottom();
			});
			console.log('👂 Subscription für Gruppennachrichten gestartet');

			loading = false;
			retryCount = 0;
			console.log('🎉 Verbindung erfolgreich initialisiert');
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Verbindungsfehler';
			console.error('❌ Fehler bei Verbindungsinitialisierung:', errorMsg);
			error = errorMsg;
			loading = false;
			connectionStatus = 'disconnected';

			// Automatischer Retry bei Verbindungsfehlern
			if (retryCount < maxRetries) {
				retryCount++;
				console.log(`🔄 Wiederhole Verbindungsversuch ${retryCount}/${maxRetries} in 3 Sekunden...`);
				setTimeout(() => initializeConnection(), 3000);
			} else {
				console.error('💥 Maximale Anzahl Wiederverbindungsversuche erreicht');
			}
		}
	}

	onDestroy(() => {
		// Alle Subscriptions ordnungsgemäß beenden
		unsubscribeUser();
		unsubscribeConfig();
		unsubscribeMessages();

		if (client) {
			try {
				client.close();
			} catch (err) {
				console.warn('Fehler beim Schließen der Client-Verbindungen:', err);
			}
		}
	});

	function scrollToBottom() {
		setTimeout(() => {
			if (messagesContainer) {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}
		}, 50);
	}

	async function sendMessage() {
		const cleanMessage = sanitizeInput(messageInput.trim(), 280);
		if (!cleanMessage || !client) {
			console.warn('⚠️ Nachricht leer oder Client nicht verfügbar');
			return;
		}

		console.log('📤 Sende Nachricht:', cleanMessage.substring(0, 50) + '...');
		
		try {
			// 🚀 Nachricht mit sofortiger lokaler Anzeige senden
			await client.sendGroupMessage(cleanMessage, (localMessage) => {
				console.log('⚡ Lokale Nachricht sofort hinzugefügt:', localMessage.id);
				addGroupMessage(localMessage);
				debouncedScrollToBottom();
			});
			console.log('✅ Nachricht erfolgreich gesendet');
			messageInput = '';
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Fehler beim Senden';
			console.error('❌ Fehler beim Senden der Nachricht:', errorMsg);
			error = errorMsg;
		}
	}

	async function refreshMessages() {
		if (!client || refreshing) {
			console.warn('⚠️ Client nicht verfügbar oder Refresh bereits aktiv');
			return;
		}

		refreshing = true;
		console.log('🔄 Starte manuelle Nachrichten-Aktualisierung...');
		
		try {
			const newMessageCount = await client.refreshGroupMessages((message) => {
				console.log('🔄 Neue Nachricht durch Refresh:', message.id);
				addGroupMessage(message);
				debouncedScrollToBottom();
			});
			
			const now = new Date().toLocaleTimeString();
			lastRefresh = `${now} (${newMessageCount} neue)`;
			console.log(`✅ Refresh abgeschlossen: ${newMessageCount} neue Nachrichten`);
			
			if (newMessageCount === 0) {
				lastRefresh = `${now} (keine neuen)`;
			}
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Fehler beim Aktualisieren';
			console.error('❌ Fehler beim Refresh:', errorMsg);
			error = errorMsg;
			lastRefresh = `Fehler: ${errorMsg}`;
		} finally {
			refreshing = false;
		}
	}

	// Fehler-Handler für ErrorBoundary
	let chatError: Error | null = null;

	function handleRetry() {
		chatError = null;
		error = '';
		initializeConnection();
	}

	// Verbindungsstatus-Indikator
	$: statusColor = connectionStatus === 'connected' ? '#10b981' :
					 connectionStatus === 'connecting' ? '#f59e0b' : '#ef4444';
	$: statusText = connectionStatus === 'connected' ? 'Verbunden' :
					connectionStatus === 'connecting' ? 'Verbinde...' : 'Getrennt';
</script>

<svelte:head>
	<title>Private Gruppe - Bitcoin Tausch</title>
</svelte:head>

<div class="chat-container">
	<header class="chat-header">
		<div class="header-left">
			<h1>🔐 Private Bitcoin-Gruppe</h1>
			<div class="refresh-controls">
				<button
					on:click={refreshMessages}
					disabled={refreshing || connectionStatus !== 'connected'}
					class="refresh-btn"
					title="Neue Nachrichten vom Relay laden"
				>
					{#if refreshing}
						🔄 Lädt...
					{:else}
						🔄 Aktualisieren
					{/if}
				</button>
				{#if lastRefresh}
					<span class="last-refresh">Zuletzt: {lastRefresh}</span>
				{/if}
			</div>
		</div>
		<div class="group-info">
			<span class="connection-status" style="color: {statusColor}">
				● {statusText}
			</span>
			<span class="relay-info">📡 {config?.relay || 'Unbekannt'}</span>
			<span class="user-info">👤 {user?.name || truncatePubkey(user?.pubkey || '')}</span>
		</div>
	</header>

	{#if loading}
		<LoadingSpinner
			size="large"
			variant="bitcoin"
			text="Verbinde zur Gruppe..."
			overlay={true}
		/>
	{:else if error}
		<div class="error">
			<p>❌ {error}</p>
			<button on:click={() => window.location.href = '/'}>Zurück zur Anmeldung</button>
		</div>
	{:else}
		<div class="chat-content">
			<div class="messages" bind:this={messagesContainer}>
				{#each messages as message (message.id)}
					<div class="message {message.pubkey === user?.pubkey ? 'own' : 'other'}">
						<div class="message-header">
							<span class="sender">{truncatePubkey(message.pubkey)}</span>
							<span class="time">{formatTime(message.timestamp)}</span>
							{#if !message.decrypted}
								<span class="unencrypted" title="Unverschlüsselte Nachricht">🔓</span>
							{:else}
								<span class="encrypted" title="Verschlüsselte Nachricht">🔒</span>
							{/if}
						</div>
						<div class="message-content">
							{message.content}
						</div>
					</div>
				{/each}
				{#if messages.length === 0}
					<div class="no-messages">
						<p>🔮 Noch keine Nachrichten in der Gruppe</p>
						<p>Seien Sie der erste, der etwas schreibt!</p>
					</div>
				{/if}
			</div>

			<div class="input-area">
				<form on:submit|preventDefault={sendMessage}>
					<input 
						type="text" 
						bind:value={messageInput}
						placeholder="Nachricht eingeben..."
						maxlength="280"
					/>
					<button type="submit" disabled={!messageInput.trim()}>
						📤
					</button>
				</form>
			</div>
		</div>

		<nav class="bottom-nav">
			<a href="/group" class="nav-item active">
				💬 Chat
			</a>
			<a href="/offers" class="nav-item">
				🏷️ Angebote
			</a>
			<a href="/debug" class="nav-item">
				🔍 Debug
			</a>
			<a href="/admin" class="nav-item">
				⚙️ Admin
			</a>
		</nav>
	{/if}
</div>

<style>
	.chat-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.chat-header {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		padding: 1rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.chat-header h1 {
		margin: 0;
		font-size: 1.2rem;
		color: #333;
	}

	.refresh-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.refresh-btn {
		padding: 0.25rem 0.75rem;
		background: #28a745;
		color: white;
		border: none;
		border-radius: 15px;
		cursor: pointer;
		font-size: 0.8rem;
		transition: all 0.3s;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.refresh-btn:hover:not(:disabled) {
		background: #218838;
		transform: translateY(-1px);
	}

	.refresh-btn:disabled {
		background: #6c757d;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.last-refresh {
		font-size: 0.7rem;
		color: #666;
		font-style: italic;
	}

	.group-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		font-size: 0.8rem;
		color: #666;
		gap: 0.25rem;
	}

	.connection-status {
		font-weight: 600;
		font-size: 0.75rem;
	}


	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.chat-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.message {
		max-width: 70%;
		word-wrap: break-word;
	}

	.message.own {
		align-self: flex-end;
	}

	.message.other {
		align-self: flex-start;
	}

	.message-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
		font-size: 0.8rem;
		opacity: 0.8;
	}

	.message.own .message-header {
		justify-content: flex-end;
		color: rgba(255, 255, 255, 0.8);
	}

	.message.other .message-header {
		color: rgba(0, 0, 0, 0.6);
	}

	.message-content {
		padding: 0.75rem 1rem;
		border-radius: 18px;
		line-height: 1.4;
	}

	.message.own .message-content {
		background: rgba(102, 126, 234, 0.9);
		color: white;
		border-bottom-right-radius: 4px;
	}

	.message.other .message-content {
		background: rgba(255, 255, 255, 0.9);
		color: #333;
		border-bottom-left-radius: 4px;
	}

	.unencrypted {
		color: #ffc107;
		font-size: 0.9rem;
		cursor: help;
	}

	.encrypted {
		color: #10b981;
		font-size: 0.9rem;
		cursor: help;
	}

	.no-messages {
		text-align: center;
		color: rgba(255, 255, 255, 0.8);
		padding: 2rem;
		font-style: italic;
	}

	.input-area {
		padding: 1rem;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
	}

	.input-area form {
		display: flex;
		gap: 0.5rem;
	}

	.input-area input {
		flex: 1;
		padding: 0.75rem 1rem;
		border: 2px solid #e1e5e9;
		border-radius: 25px;
		font-size: 1rem;
		outline: none;
	}

	.input-area input:focus {
		border-color: #667eea;
	}

	.input-area button {
		padding: 0.75rem 1rem;
		background: #667eea;
		color: white;
		border: none;
		border-radius: 50%;
		cursor: pointer;
		font-size: 1rem;
		width: 50px;
		height: 50px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.input-area button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.bottom-nav {
		display: flex;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		border-top: 1px solid rgba(0, 0, 0, 0.1);
	}

	.nav-item {
		flex: 1;
		padding: 1rem;
		text-align: center;
		text-decoration: none;
		color: #666;
		font-weight: 500;
		transition: all 0.3s;
	}

	.nav-item.active {
		background: rgba(102, 126, 234, 0.1);
		color: #667eea;
	}

	.nav-item:hover {
		background: rgba(0, 0, 0, 0.05);
	}
</style>