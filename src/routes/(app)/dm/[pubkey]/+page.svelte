<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  // @ts-ignore
  import { page } from '$app/stores';
  // @ts-ignore
  import { goto } from '$app/navigation';
  import { userStore } from '$lib/stores/userStore';
  import { groupStore } from '$lib/stores/groupStore';
  import { formatTimestamp, truncatePubkey } from '$lib/utils';
  import { sendNIP17Message, fetchNIP17Conversation } from '$lib/nostr/nip17';
  import type { DMMessage } from '$lib/nostr/types';

  let recipientPubkey = '';
  let messages: DMMessage[] = [];
  let messageInput = '';
  let loading = false;
  let error = '';
  let messagesContainer: HTMLDivElement;
  let autoRefreshInterval: ReturnType<typeof setInterval>;

  $: recipientPubkey = $page.params.pubkey;

  onMount(async () => {
    if (!$userStore.isAuthenticated || !$userStore.privateKey) {
      goto('/');
      return;
    }

    try {
      await loadMessages();

      // Auto-Refresh alle 5 Sekunden
      autoRefreshInterval = setInterval(async () => {
        try {
          await loadMessages();
        } catch (e) {
          console.error('Auto-Refresh Fehler:', e);
        }
      }, 5000);

      scrollToBottom();
    } catch (e: any) {
      error = e.message || 'Fehler beim Laden der Nachrichten';
    }
  });

  onDestroy(() => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }
  });

  async function loadMessages() {
    if (!$userStore.pubkey || !$userStore.privateKey) return;

    try {
      console.log('💬 [DM] Lade NIP-17 Konversation...');
      console.log('  Mein Pubkey:', $userStore.pubkey.substring(0, 16) + '...');
      console.log('  Empfänger:', recipientPubkey.substring(0, 16) + '...');
      
      const relay = $groupStore.relay || 'wss://relay.damus.io';
      
      // Lade NIP-17 Konversation
      // fetchNIP17Conversation(userPubkey, userPrivateKey, otherPubkey, relays, limit)
      const conversation = await fetchNIP17Conversation(
        $userStore.pubkey,
        $userStore.privateKey,
        recipientPubkey,
        [relay],
        50
      );

      console.log('✅ [DM] Konversation geladen:', conversation.length, 'Nachrichten');

      // Konvertiere zu DMMessage Format
      messages = conversation.map(msg => ({
        id: msg.id,
        content: msg.content, // Bereits entschlüsselt
        sender: msg.senderPubkey,
        recipient: msg.recipientPubkey,
        created_at: msg.timestamp,
        decrypted: msg.content
      })).sort((a, b) => a.created_at - b.created_at);

    } catch (e: any) {
      console.error('❌ [DM] Fehler beim Laden der Nachrichten:', e);
      error = e.message || 'Fehler beim Laden der Nachrichten';
    }
  }

  async function sendMessage() {
    if (!messageInput.trim() || !$userStore.privateKey) return;

    try {
      loading = true;
      error = '';

      console.log('📤 [DM] Sende NIP-17 Nachricht...');
      
      const relay = $groupStore.relay || 'wss://relay.damus.io';
      const content = messageInput;

      // Sende NIP-17 Gift-Wrapped Message
      // sendNIP17Message(content, recipientPubkey, senderPrivateKey, relays)
      const giftWrap = await sendNIP17Message(
        content,
        recipientPubkey,
        $userStore.privateKey,
        [relay]
      );

      console.log('✅ [DM] Nachricht gesendet:', giftWrap.id.substring(0, 16) + '...');

      // Füge lokal hinzu (optimistisch)
      messages = [...messages, {
        id: giftWrap.id,
        content: content,
        sender: $userStore.pubkey!,
        recipient: recipientPubkey,
        created_at: Math.floor(Date.now() / 1000),
        decrypted: content
      }];

      messageInput = '';
      scrollToBottom();

      // Lade Nachrichten neu nach kurzer Verzögerung
      setTimeout(() => loadMessages(), 1000);

    } catch (e: any) {
      console.error('❌ [DM] Fehler beim Senden:', e);
      error = e.message || 'Fehler beim Senden';
    } finally {
      loading = false;
    }
  }

  function scrollToBottom() {
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    }
  }

  function goBack() {
    goto('/group');
  }
</script>

<div class="dm-container">
  <header class="dm-header">
    <button class="btn btn-secondary" on:click={goBack}>
      ← Zurück
    </button>
    <div>
      <h1>💬 Privater Chat (NIP-17)</h1>
      <p class="recipient-info">
        Mit: <strong>{truncatePubkey(recipientPubkey)}</strong>
      </p>
      <p class="nip17-badge">🔒 Ende-zu-Ende verschlüsselt (Gift-Wrapped)</p>
    </div>
  </header>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  <div class="messages-container" bind:this={messagesContainer}>
    {#if messages.length === 0}
      <div class="empty-state">
        <p>Noch keine Nachrichten. Starte die Konversation!</p>
      </div>
    {:else}
      {#each messages as message (message.id)}
        <div class="message" class:own={message.sender === $userStore.pubkey}>
          <div class="message-header">
            <span class="message-author">
              {message.sender === $userStore.pubkey ? 'Du' : truncatePubkey(message.sender)}
            </span>
            <span class="message-time">
              {formatTimestamp(message.created_at)}
            </span>
          </div>
          <div class="message-content">
            {message.decrypted || '[Verschlüsselt]'}
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <form class="message-form" on:submit|preventDefault={sendMessage}>
    <input
      type="text"
      class="input"
      bind:value={messageInput}
      placeholder="Nachricht schreiben..."
      disabled={loading}
    />
    <button type="submit" class="btn btn-primary" disabled={loading || !messageInput.trim()}>
      Senden
    </button>
  </form>
</div>

<style>
  .dm-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    max-width: 800px;
    margin: 0 auto;
  }

  .dm-header {
    background-color: var(--surface-color);
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .dm-header h1 {
    font-size: 1.5rem;
    margin: 0;
  }

  .recipient-info {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin: 0.25rem 0 0 0;
  }

  .nip17-badge {
    font-size: 0.75rem;
    color: #10b981;
    margin: 0.25rem 0 0 0;
    font-weight: 500;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    background-color: var(--bg-color);
  }

  .empty-state {
    text-align: center;
    color: var(--text-muted);
    padding: 2rem;
  }

  .message {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background-color: var(--surface-color);
    border-radius: 0.5rem;
    max-width: 70%;
  }

  .message.own {
    background-color: var(--primary-color);
    margin-left: auto;
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .message-author {
    font-weight: 500;
  }

  .message-time {
    color: var(--text-muted);
  }

  .message-content {
    word-wrap: break-word;
  }
 

  .message-form {
    padding: 1rem;
    background-color: var(--surface-color);
    border-top: 1px solid var(--border-color);
    display: flex;
    gap: 0.5rem;
  }

  .message-form input {
    flex: 1;
  }
</style>