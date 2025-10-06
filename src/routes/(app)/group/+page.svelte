<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  // @ts-ignore
  import { goto } from '$app/navigation';
  import { userStore, isAuthenticated } from '$lib/stores/userStore';
  import { groupStore, groupMessages, marketplaceOffers } from '$lib/stores/groupStore';
  import { formatTimestamp, truncatePubkey } from '$lib/utils';
  import { generateTempKeypair } from '$lib/nostr/crypto';

  let messageInput = '';
  let offerInput = '';
  let showOfferForm = false;
  let loading = false;
  let error = '';
  let tempKeypair: { privateKey: string; publicKey: string } | null = null;

  let messagesContainer: HTMLDivElement;
  let autoRefreshInterval: ReturnType<typeof setInterval>;

  $: if (!$isAuthenticated) {
    goto('/');
  }

  onMount(async () => {
    try {
      // Lade initiale Nachrichten (alle beim ersten Mal)
      await groupStore.loadMessages(true);
      await groupStore.loadOffers();

      // Auto-Refresh alle 10 Sekunden (nur neue Nachrichten)
      autoRefreshInterval = setInterval(async () => {
        try {
          await groupStore.loadMessages(false);
          await groupStore.loadOffers();
        } catch (e) {
          console.error('Auto-Refresh Fehler:', e);
        }
      }, 10000);

      // Scroll zu neuesten Nachrichten
      scrollToBottom();
    } catch (e: any) {
      error = e.message || 'Fehler beim Laden der Daten';
    }
  });

  onDestroy(() => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }
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

      await groupStore.sendMessage(messageInput, $userStore.privateKey);
      messageInput = '';
      scrollToBottom();
    } catch (e: any) {
      error = e.message || 'Fehler beim Senden';
    } finally {
      loading = false;
    }
  }

  async function createOffer() {
    if (!offerInput.trim()) return;

    try {
      loading = true;
      error = '';

      // Generiere temporäres Keypair falls noch nicht vorhanden
      if (!tempKeypair) {
        tempKeypair = generateTempKeypair();
        userStore.setTempPrivkey(tempKeypair.privateKey);
      }

      await groupStore.createOffer(offerInput, tempKeypair.privateKey);
      offerInput = '';
      showOfferForm = false;
      await groupStore.loadOffers();
    } catch (e: any) {
      error = e.message || 'Fehler beim Erstellen des Angebots';
    } finally {
      loading = false;
    }
  }

  async function sendInterest(offerId: string) {
    if (!$userStore.privateKey) return;

    try {
      loading = true;
      error = '';

      await groupStore.sendInterest(
        offerId,
        'Ich habe Interesse an deinem Angebot!',
        $userStore.privateKey
      );

      alert('Interesse gesendet! Der Anbieter wird sich bei dir melden.');
    } catch (e: any) {
      error = e.message || 'Fehler beim Senden des Interesses';
    } finally {
      loading = false;
    }
  }

  async function deleteOffer(offerId: string) {
    if (!tempKeypair?.privateKey) return;

    if (!confirm('Möchtest du dieses Angebot wirklich löschen?')) return;

    try {
      loading = true;
      error = '';

      await groupStore.deleteOffer(offerId, tempKeypair.privateKey);
    } catch (e: any) {
      error = e.message || 'Fehler beim Löschen';
    } finally {
      loading = false;
    }
  }

  function handleLogout() {
    if (confirm('Möchtest du dich wirklich abmelden?')) {
      userStore.logout();
      groupStore.clearGroupData();
      goto('/');
    }
  }
</script>

<div class="group-container">
  <header class="group-header">
    <div>
      <h1>💬 Gruppen-Chat</h1>
      <p class="user-info">
        Angemeldet als: <strong>{$userStore.name || 'Anonym'}</strong>
        ({truncatePubkey($userStore.pubkey || '')})
      </p>
    </div>
    <button class="btn btn-secondary" on:click={handleLogout}>
      Abmelden
    </button>
  </header>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  <div class="content-grid">
    <!-- Chat-Bereich -->
    <div class="chat-section">
      <div class="messages-container" bind:this={messagesContainer}>
        {#if $groupMessages.length === 0}
          <div class="empty-state">
            <p>Noch keine Nachrichten. Sei der Erste!</p>
          </div>
        {:else}
          {#each $groupMessages as message (message.id)}
            <div class="message" class:own={message.pubkey === $userStore.pubkey}>
              <div class="message-header">
                <span class="message-author">
                  {message.author || truncatePubkey(message.pubkey)}
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
          Senden
        </button>
      </form>
    </div>

    <!-- Marketplace-Bereich -->
    <div class="marketplace-section">
      <div class="marketplace-header">
        <h2>🛒 Marketplace</h2>
        <button class="btn btn-primary" on:click={() => showOfferForm = !showOfferForm}>
          {showOfferForm ? 'Abbrechen' : '+ Neues Angebot'}
        </button>
      </div>

      {#if showOfferForm}
        <form class="offer-form card" on:submit|preventDefault={createOffer}>
          <h3>Neues Angebot erstellen</h3>
          <textarea
            class="input"
            bind:value={offerInput}
            placeholder="Beschreibe dein Angebot..."
            rows="4"
            disabled={loading}
          ></textarea>
          <button type="submit" class="btn btn-primary" disabled={loading || !offerInput.trim()}>
            Angebot veröffentlichen
          </button>
          <small>Dein Angebot wird anonym mit einem temporären Key veröffentlicht.</small>
        </form>
      {/if}

      <div class="offers-list">
        {#if $marketplaceOffers.length === 0}
          <div class="empty-state">
            <p>Noch keine Angebote vorhanden.</p>
          </div>
        {:else}
          {#each $marketplaceOffers as offer (offer.id)}
            <div class="offer-card card">
              <div class="offer-header">
                <span class="offer-author">
                  Anonym ({truncatePubkey(offer.tempPubkey)})
                </span>
                <span class="offer-time">
                  {formatTimestamp(offer.created_at)}
                </span>
              </div>
              <div class="offer-content">
                {offer.content}
              </div>
              <div class="offer-actions">
                {#if offer.tempPubkey === tempKeypair?.publicKey}
                  <button 
                    class="btn btn-secondary" 
                    on:click={() => deleteOffer(offer.id)}
                    disabled={loading}
                  >
                    Löschen
                  </button>
                {:else}
                  <button 
                    class="btn btn-primary" 
                    on:click={() => sendInterest(offer.id)}
                    disabled={loading}
                  >
                    Interesse zeigen
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .group-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .group-header {
    background-color: var(--surface-color);
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .group-header h1 {
    font-size: 1.5rem;
    margin: 0;
  }

  .user-info {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin: 0.25rem 0 0 0;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1rem;
    padding: 1rem;
    flex: 1;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    .content-grid {
      grid-template-columns: 1fr;
    }
  }

  .chat-section {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 120px);
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
  }

  .message.own {
    background-color: var(--primary-color);
    margin-left: 2rem;
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
    display: flex;
    gap: 0.5rem;
  }

  .message-form input {
    flex: 1;
  }

  .marketplace-section {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 120px);
  }

  .marketplace-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .marketplace-header h2 {
    font-size: 1.25rem;
    margin: 0;
  }

  .offer-form {
    margin-bottom: 1rem;
  }

  .offer-form h3 {
    font-size: 1rem;
    margin-bottom: 1rem;
  }

  .offer-form textarea {
    margin-bottom: 1rem;
    resize: vertical;
  }

  .offer-form small {
    display: block;
    margin-top: 0.5rem;
    color: var(--text-muted);
  }

  .offers-list {
    flex: 1;
    overflow-y: auto;
  }

  .offer-card {
    margin-bottom: 1rem;
  }

  .offer-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
  }

  .offer-author {
    font-weight: 500;
    color: var(--primary-color);
  }

  .offer-time {
    color: var(--text-muted);
  }

  .offer-content {
    margin-bottom: 1rem;
    white-space: pre-wrap;
  }

  .offer-actions {
    display: flex;
    gap: 0.5rem;
  }

  .offer-actions button {
    flex: 1;
  }
</style>