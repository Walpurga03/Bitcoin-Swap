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
  let expandedOffers: Set<string> = new Set();

  let messagesContainer: HTMLDivElement;
  let autoRefreshInterval: ReturnType<typeof setInterval>;

  function toggleOfferExpand(offerId: string) {
    if (expandedOffers.has(offerId)) {
      expandedOffers.delete(offerId);
    } else {
      expandedOffers.add(offerId);
    }
    expandedOffers = expandedOffers; // Trigger reactivity
  }

  $: if (!$isAuthenticated) {
    goto('/');
  }

  onMount(async () => {
    try {
      console.log('🚀 [PAGE] onMount - Lade Daten...');
      
      // Lade initiale Nachrichten (alle beim ersten Mal)
      await groupStore.loadMessages(true);
      console.log('✅ [PAGE] Nachrichten geladen');
      
      await groupStore.loadOffers();
      console.log('✅ [PAGE] Marketplace-Angebote geladen');

      // Auto-Refresh alle 15 Sekunden (nur neue Nachrichten)
      autoRefreshInterval = setInterval(async () => {
        try {
          await groupStore.loadMessages(false);
          await groupStore.loadOffers();
        } catch (e) {
          console.error('Auto-Refresh Fehler:', e);
        }
      }, 15000);

      // Scroll zu neuesten Nachrichten
      scrollToBottom();
    } catch (e: any) {
      console.error('❌ [PAGE] Fehler beim Laden:', e);
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
        <button class="btn btn-primary btn-sm" on:click={() => showOfferForm = !showOfferForm}>
          {showOfferForm ? '✕ Abbrechen' : '+ Neues Angebot'}
        </button>
      </div>

      {#if showOfferForm}
        <form class="offer-form card" on:submit|preventDefault={createOffer}>
          <h3>📝 Neues Angebot erstellen</h3>
          <textarea
            class="input"
            bind:value={offerInput}
            placeholder="z.B. Verkaufe 0.01 BTC gegen EUR-Bargeld in Berlin..."
            rows="5"
            disabled={loading}
          ></textarea>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" disabled={loading || !offerInput.trim()}>
              {loading ? '⏳ Wird veröffentlicht...' : '🚀 Angebot veröffentlichen'}
            </button>
          </div>
          <small class="hint">
            💡 <strong>Hinweis:</strong> Dein Angebot wird anonym mit einem temporären Key veröffentlicht.
            Andere Nutzer können Interesse zeigen und du siehst deren Public Keys.
          </small>
        </form>
      {/if}

      <div class="offers-list">
        {#if loading && $marketplaceOffers.length === 0}
          <div class="loading-state">
            <p>⏳ Lade Angebote...</p>
          </div>
        {:else if $marketplaceOffers.length === 0}
          <div class="empty-state">
            <div class="empty-icon">🛒</div>
            <p><strong>Noch keine Angebote vorhanden</strong></p>
            <p class="text-muted">Sei der Erste und erstelle ein Bitcoin-Tauschangebot!</p>
          </div>
        {:else}
          <div class="offers-count">
            {$marketplaceOffers.length} {$marketplaceOffers.length === 1 ? 'Angebot' : 'Angebote'}
          </div>
          {#each $marketplaceOffers as offer (offer.id)}
            <div class="offer-card card" class:own-offer={offer.tempPubkey === tempKeypair?.publicKey}>
              <div class="offer-header">
                <div class="offer-meta">
                  <span class="offer-author">
                    {#if offer.tempPubkey === tempKeypair?.publicKey}
                      <span class="badge badge-primary">Dein Angebot</span>
                    {:else}
                      <span class="badge badge-secondary">Anonym</span>
                    {/if}
                  </span>
                  <span class="offer-time">
                    {formatTimestamp(offer.created_at)}
                  </span>
                </div>
              </div>
              <div class="offer-content">
                {offer.content}
              </div>
              <div class="offer-footer">
                <div class="offer-info">
                  <span class="offer-id">ID: {truncatePubkey(offer.tempPubkey)}</span>
                  {#if offer.replies.length > 0}
                    <button 
                      class="interest-badge"
                      on:click={() => toggleOfferExpand(offer.id)}
                    >
                      💌 {offer.replies.length} {offer.replies.length === 1 ? 'Interessent' : 'Interessenten'}
                      <span class="expand-icon">{expandedOffers.has(offer.id) ? '▼' : '▶'}</span>
                    </button>
                  {/if}
                </div>
                <div class="offer-actions">
                  {#if offer.tempPubkey === tempKeypair?.publicKey}
                    <button 
                      class="btn btn-danger btn-sm" 
                      on:click={() => deleteOffer(offer.id)}
                      disabled={loading}
                    >
                      🗑️ Löschen
                    </button>
                  {:else}
                    <button 
                      class="btn btn-success btn-sm" 
                      on:click={() => sendInterest(offer.id)}
                      disabled={loading}
                    >
                      ✋ Interesse zeigen
                    </button>
                  {/if}
                </div>
              </div>

              {#if expandedOffers.has(offer.id) && offer.replies.length > 0}
                <div class="interest-list">
                  <div class="interest-header">
                    <strong>Interessenten:</strong>
                  </div>
                  {#each offer.replies as reply (reply.id)}
                    <div class="interest-item">
                      <div class="interest-meta">
                        <span class="interest-pubkey">
                          👤 {truncatePubkey(reply.pubkey)}
                        </span>
                        <span class="interest-time">
                          {formatTimestamp(reply.created_at)}
                        </span>
                      </div>
                      <div class="interest-message">
                        {reply.content}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
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
    padding: 1.5rem;
  }

  .offer-form h3 {
    font-size: 1.125rem;
    margin-bottom: 1rem;
    font-weight: 600;
  }

  .offer-form textarea {
    margin-bottom: 1rem;
    resize: vertical;
    font-size: 0.9375rem;
    line-height: 1.5;
  }

  .form-actions {
    margin-bottom: 1rem;
  }

  .hint {
    display: block;
    padding: 0.75rem;
    background-color: rgba(var(--primary-rgb), 0.1);
    border-radius: 0.5rem;
    color: var(--text-muted);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .hint strong {
    color: var(--text-color);
  }

  .offers-list {
    flex: 1;
    overflow-y: auto;
  }

  .offers-count {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
    font-weight: 500;
  }

  .loading-state {
    text-align: center;
    color: var(--text-muted);
    padding: 3rem 1rem;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .text-muted {
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  .offer-card {
    margin-bottom: 1rem;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .offer-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .offer-card.own-offer {
    border-left: 3px solid var(--primary-color);
  }

  .offer-header {
    margin-bottom: 0.75rem;
  }

  .offer-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
  }

  .badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .badge-primary {
    background-color: var(--primary-color);
    color: white;
  }

  .badge-secondary {
    background-color: var(--surface-color);
    color: var(--text-muted);
  }

  .offer-time {
    color: var(--text-muted);
    font-size: 0.8125rem;
  }

  .offer-content {
    margin-bottom: 1rem;
    white-space: pre-wrap;
    line-height: 1.6;
    color: var(--text-color);
  }

  .offer-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-color);
  }

  .offer-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .offer-id {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-family: monospace;
  }

  .interest-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.5rem;
    background-color: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .interest-badge:hover {
    background-color: rgba(16, 185, 129, 0.2);
    border-color: rgba(16, 185, 129, 0.5);
  }

  .expand-icon {
    font-size: 0.75rem;
    opacity: 0.7;
  }

  .interest-list {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .interest-header {
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
    color: var(--text-muted);
  }

  .interest-item {
    padding: 0.75rem;
    background-color: rgba(16, 185, 129, 0.05);
    border-left: 3px solid #10b981;
    border-radius: 0.375rem;
    margin-bottom: 0.5rem;
  }

  .interest-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.8125rem;
  }

  .interest-pubkey {
    font-weight: 600;
    color: #10b981;
    font-family: monospace;
  }

  .interest-time {
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  .interest-message {
    font-size: 0.875rem;
    color: var(--text-color);
    line-height: 1.5;
  }

  .offer-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }

  .btn-success {
    background-color: #10b981;
    color: white;
  }

  .btn-success:hover:not(:disabled) {
    background-color: #059669;
  }

  .btn-danger {
    background-color: #ef4444;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background-color: #dc2626;
  }
</style>