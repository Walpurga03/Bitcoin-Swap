<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  // @ts-ignore
  import { page } from '$app/stores';
  // @ts-ignore
  import { goto } from '$app/navigation';
  import { userStore } from '$lib/stores/userStore';
  import { formatTimestamp, truncatePubkey } from '$lib/utils';
  import { nip44Encrypt, nip44Decrypt } from '$lib/nostr/crypto';
  import { createEvent, publishEvent, fetchEvents } from '$lib/nostr/client';
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
      // Hole gesendete Nachrichten (von mir an Empfänger)
      const sentEvents = await fetchEvents(
        [$page.data.relay || 'wss://relay.damus.io'],
        {
          kinds: [4], // NIP-04 DMs (vereinfacht, sollte NIP-17 sein)
          authors: [$userStore.pubkey],
          '#p': [recipientPubkey],
          limit: 50
        }
      );

      // Hole empfangene Nachrichten (von Empfänger an mich)
      const receivedEvents = await fetchEvents(
        [$page.data.relay || 'wss://relay.damus.io'],
        {
          kinds: [4],
          authors: [recipientPubkey],
          '#p': [$userStore.pubkey],
          limit: 50
        }
      );

      // Kombiniere und sortiere
      const allEvents = [...sentEvents, ...receivedEvents];
      
      const decryptedMessages: DMMessage[] = [];
      
      for (const event of allEvents) {
        try {
          const isSent = event.pubkey === $userStore.pubkey;
          const otherPubkey = isSent ? recipientPubkey : event.pubkey;
          
          const decrypted = nip44Decrypt(
            event.content,
            $userStore.privateKey,
            otherPubkey
          );

          decryptedMessages.push({
            id: event.id,
            content: event.content,
            sender: event.pubkey,
            recipient: isSent ? recipientPubkey : $userStore.pubkey,
            created_at: event.created_at,
            decrypted
          });
        } catch (e) {
          console.error('Entschlüsselung fehlgeschlagen:', e);
        }
      }

      // Sortiere nach Zeitstempel
      messages = decryptedMessages.sort((a, b) => a.created_at - b.created_at);
    } catch (e: any) {
      console.error('Fehler beim Laden der Nachrichten:', e);
    }
  }

  async function sendMessage() {
    if (!messageInput.trim() || !$userStore.privateKey) return;

    try {
      loading = true;
      error = '';

      // Verschlüssele Nachricht
      const encrypted = nip44Encrypt(
        messageInput,
        $userStore.privateKey,
        recipientPubkey
      );

      // Erstelle Event
      const event = await createEvent(
        4, // DM Kind
        encrypted,
        [['p', recipientPubkey]],
        $userStore.privateKey
      );

      // Publiziere
      await publishEvent(event, [$page.data.relay || 'wss://relay.damus.io']);

      // Füge lokal hinzu
      messages = [...messages, {
        id: event.id,
        content: encrypted,
        sender: $userStore.pubkey!,
        recipient: recipientPubkey,
        created_at: event.created_at,
        decrypted: messageInput
      }];

      messageInput = '';
      scrollToBottom();
    } catch (e: any) {
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
      <h1>💬 Privater Chat</h1>
      <p class="recipient-info">
        Mit: <strong>{truncatePubkey(recipientPubkey)}</strong>
      </p>
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