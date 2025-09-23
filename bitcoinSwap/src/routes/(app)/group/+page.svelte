<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { userStore } from '$lib/stores/userStore';
	import { groupConfig, groupMessages, addGroupMessage } from '$lib/stores/groupStore';
	import { NostrClient } from '$lib/nostr/client';
	import type { GroupMessage, UserProfile, GroupConfig } from '$lib/nostr/types';
	
	let client: NostrClient | null = null;
	let messageInput = '';
	let user: UserProfile | null = null;
	let config: GroupConfig | null = null;
	let messages: GroupMessage[] = [];
	let loading = true;
	let error = '';
	let messagesContainer: HTMLElement;

	// Reactive subscriptions
	userStore.subscribe(value => user = value);
	groupConfig.subscribe(value => config = value);
	groupMessages.subscribe(value => messages = value);

	onMount(async () => {
		if (!user || !config) {
			window.location.href = '/';
			return;
		}

		try {
			// NostrClient initialisieren
			client = new NostrClient();
			client.setUserProfile(user);
			await client.configureGroup(config);
			await client.connectToRelays([config.relay]);

			// Auf Nachrichten hören
			client.subscribeToGroupMessages((message: GroupMessage) => {
				addGroupMessage(message);
				scrollToBottom();
			});

			loading = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Verbindungsfehler';
			loading = false;
		}
	});

	onDestroy(() => {
		if (client) {
			client.close();
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
		if (!messageInput.trim() || !client) return;

		try {
			await client.sendGroupMessage(messageInput.trim());
			messageInput = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Fehler beim Senden';
		}
	}

	function formatTime(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleTimeString('de-DE', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatPubkey(pubkey: string): string {
		return `${pubkey.substring(0, 8)}...${pubkey.substring(-8)}`;
	}
</script>

<svelte:head>
	<title>Private Gruppe - Bitcoin Tausch</title>
</svelte:head>

<div class="chat-container">
	<header class="chat-header">
		<h1>🔐 Private Bitcoin-Gruppe</h1>
		<div class="group-info">
			<span class="relay-info">📡 {config?.relay || 'Unbekannt'}</span>
			<span class="user-info">👤 {user?.name || formatPubkey(user?.pubkey || '')}</span>
		</div>
	</header>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Verbinde zur Gruppe...</p>
		</div>
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
							<span class="sender">{formatPubkey(message.pubkey)}</span>
							<span class="time">{formatTime(message.timestamp)}</span>
							{#if !message.decrypted}
								<span class="unencrypted">🔓</span>
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

	.chat-header h1 {
		margin: 0;
		font-size: 1.2rem;
		color: #333;
	}

	.group-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		font-size: 0.8rem;
		color: #666;
		gap: 0.25rem;
	}

	.loading, .error {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		color: white;
		text-align: center;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid rgba(255, 255, 255, 0.3);
		border-top: 4px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
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