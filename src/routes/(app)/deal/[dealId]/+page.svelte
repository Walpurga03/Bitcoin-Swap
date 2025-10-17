<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  // @ts-ignore
  import { goto } from '$app/navigation';
  // @ts-ignore
  import { page } from '$app/stores';
  import { userStore, isAuthenticated } from '$lib/stores/userStore';
  import { groupStore } from '$lib/stores/groupStore';
  import { dealStore, activeDealRoom } from '$lib/stores/dealStore';
  import { formatTimestamp, truncatePubkey } from '$lib/utils';

  // Deal-Room ID aus URL
  $: dealId = $page.params.dealId;

  let messageInput = '';
  let loading = false;
  let error = '';
  let messagesContainer: HTMLDivElement;
  let autoRefreshInterval: ReturnType<typeof setInterval>;

  // Prüfe ob User Teilnehmer ist
  $: isParticipant = $activeDealRoom && $userStore.pubkey && (
    $activeDealRoom.participants.seller === $userStore.pubkey ||
    $activeDealRoom.participants.buyer === $userStore.pubkey
  );

  // Debug-Logging für Berechtigungsprüfung
  $: if ($activeDealRoom && $userStore.pubkey) {
    console.log('🔍 [DEAL-PAGE] Berechtigungsprüfung:');
    console.log('  User Pubkey:', $userStore.pubkey.substring(0, 16) + '...');
    console.log('  Seller:', $activeDealRoom.participants.seller.substring(0, 16) + '...');
    console.log('  Buyer:', $activeDealRoom.participants.buyer.substring(0, 16) + '...');
    console.log('  isParticipant:', isParticipant);
  }

  // Bestimme anderen Teilnehmer
  $: otherParticipant = $activeDealRoom && $userStore.pubkey
    ? ($activeDealRoom.participants.seller === $userStore.pubkey
        ? $activeDealRoom.participants.buyer
        : $activeDealRoom.participants.seller)
    : null;

  onMount(async () => {
    // Prüfe Authentication
    if (!$isAuthenticated) {
      goto('/');
      return;
    }

    try {
      console.log('🏠 [DEAL-PAGE] Lade Deal-Room:', dealId);

      // Setze aktiven Room
      dealStore.setActiveRoom(dealId);

      // Lade Deal-Rooms falls noch nicht geladen
      if (!$activeDealRoom) {
        await dealStore.loadRooms(
          $userStore.pubkey!,
          $groupStore.groupKey!,
          $groupStore.relay!
        );
      }

      // Prüfe ob Room existiert
      if (!$activeDealRoom) {
        error = 'Deal-Room nicht gefunden';
        return;
      }

      // Prüfe Berechtigung
      if (!isParticipant) {
        console.error('❌ [DEAL-PAGE] Berechtigungsfehler:');
        console.error('  User:', $userStore.pubkey?.substring(0, 16));
        console.error('  Seller:', $activeDealRoom?.participants.seller.substring(0, 16));
        console.error('  Buyer:', $activeDealRoom?.participants.buyer.substring(0, 16));
        error = 'Du bist kein Teilnehmer dieses Deal-Rooms';
        return;
      }

      // Lade Nachrichten
      await dealStore.loadMessages(
        dealId,
        $groupStore.groupKey!,
        $groupStore.relay!
      );

      // Auto-Refresh alle 5 Sekunden
      autoRefreshInterval = setInterval(async () => {
        try {
          await dealStore.loadMessages(
            dealId,
            $groupStore.groupKey!,
            $groupStore.relay!
          );
        } catch (e) {
          console.error('Auto-Refresh Fehler:', e);
        }
      }, 5000);

      scrollToBottom();
    } catch (e: any) {
      console.error('❌ [DEAL-PAGE] Fehler beim Laden:', e);
      error = e.message || 'Fehler beim Laden des Deal-Rooms';
    }
  });

  onDestroy(() => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }
    dealStore.setActiveRoom(null);
  });

  function scrollToBottom() {
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    }
  }

  async function sendMessage() {
    if (!messageInput.trim() || !$userStore.privateKey) return;

    try {
      loading = true;
      error = '';

      await dealStore.sendMessage(
        dealId,
        messageInput,
        $groupStore.groupKey!,
        $userStore.privateKey,
        $groupStore.relay!
      );

      messageInput = '';
      scrollToBottom();
    } catch (e: any) {
      error = e.message || 'Fehler beim Senden';
    } finally {
      loading = false;
    }
  }

  function handleBack() {
    goto('/group');
  }
</script>

<div class="deal-container">
  <header class="deal-header">
    <button class="btn-back" on:click={handleBack}>
      ← Zurück zum Marketplace
    </button>
    <div class="deal-info">
      <h1>💬 Deal-Room</h1>
      {#if $activeDealRoom}
        <p class="deal-meta">
          Mit: <strong>{truncatePubkey(otherParticipant || '')}</strong>
        </p>
      {/if}
    </div>
  </header>

  {#if error}
    <div class="error-message">
      ❌ {error}
    </div>
  {/if}

  {#if !$activeDealRoom}
    <div class="loading-state">
      <p>⏳ Lade Deal-Room...</p>
    </div>
  {:else if !isParticipant}
    <div class="error-state">
      <p>❌ Du bist kein Teilnehmer dieses Deal-Rooms</p>
      <button class="btn btn-primary" on:click={handleBack}>
        Zurück zum Marketplace
      </button>
    </div>
  {:else}
    <!-- Original-Angebot -->
    <div class="offer-preview card">
      <div class="offer-header">
        <strong>📋 Ursprüngliches Angebot:</strong>
        <span class="offer-time">{formatTimestamp($activeDealRoom.created_at)}</span>
      </div>
      <div class="offer-content">
        {$activeDealRoom.offerContent}
      </div>
    </div>

    <!-- Chat-Bereich -->
    <div class="chat-section">
      <div class="messages-container" bind:this={messagesContainer}>
        {#if $activeDealRoom.messages.length === 0}
          <div class="empty-state">
            <p>💬 Noch keine Nachrichten. Starte die Konversation!</p>
          </div>
        {:else}
          {#each $activeDealRoom.messages as message (message.id)}
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
                {message.content}
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
          {loading ? '⏳' : '📤'} Senden
        </button>
      </form>
    </div>
  {/if}
</div>

<style>
  .deal-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-color);
  }

  .deal-header {
    background-color: var(--surface-color);
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .btn-back {
    background: none;
    border: none;
    color: var(--primary-color);
    font-size: 1rem;
    cursor: pointer;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    transition: background-color 0.2s;
  }

  .btn-back:hover {
    background-color: rgba(var(--primary-rgb), 0.1);
  }

  .deal-info {
    flex: 1;
  }

  .deal-info h1 {
    font-size: 1.5rem;
    margin: 0;
  }

  .deal-meta {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin: 0.25rem 0 0 0;
  }

  .error-message {
    padding: 1rem;
    margin: 1rem;
    background-color: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 0.5rem;
    color: #ef4444;
  }

  .loading-state,
  .error-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-muted);
  }

  .error-state button {
    margin-top: 1rem;
  }

  .offer-preview {
    margin: 1rem;
    padding: 1rem;
  }

  .offer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
  }

  .offer-time {
    color: var(--text-muted);
  }

  .offer-content {
    white-space: pre-wrap;
    line-height: 1.6;
    color: var(--text-color);
    padding: 0.75rem;
    background-color: rgba(var(--primary-rgb), 0.05);
    border-radius: 0.5rem;
    border-left: 3px solid var(--primary-color);
  }

  .chat-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    overflow: hidden;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    background-color: var(--surface-color);
    border-radius: 0.75rem;
    margin-bottom: 1rem;
  }

  .empty-state {
    text-align: center;
    color: var(--text-muted);
    padding: 2rem;
  }

  .message {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background-color: var(--bg-color);
    border-radius: 0.5rem;
    max-width: 80%;
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
    line-height: 1.5;
  }

  .message-form {
    display: flex;
    gap: 0.5rem;
  }

  .message-form input {
    flex: 1;
  }

  .card {
    background-color: var(--surface-color);
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background-color: var(--primary-color);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    background-color: var(--surface-color);
    color: var(--text-color);
    font-size: 1rem;
  }

  .input:focus {
    outline: none;
    border-color: var(--primary-color);
  }
</style>