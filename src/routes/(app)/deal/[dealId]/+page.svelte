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
  import { fetchUserProfile } from '$lib/nostr/client';

  // Deal-Room ID aus URL
  $: dealId = $page.params.dealId;

  let messageInput = '';
  let loading = false;
  let error = '';
  let messagesContainer: HTMLDivElement;
  let autoRefreshInterval: ReturnType<typeof setInterval>;
  
  // Profile der Teilnehmer
  let sellerName = '';
  let buyerName = '';
  let profilesLoaded = false;

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
  
  // Name des anderen Teilnehmers
  $: otherParticipantName = $activeDealRoom && $userStore.pubkey
    ? ($activeDealRoom.participants.seller === $userStore.pubkey
        ? buyerName
        : sellerName)
    : '';
  
  /**
   * Lade Profile der Teilnehmer
   */
  async function loadParticipantProfiles() {
    if (!$activeDealRoom) return;
    
    try {
      console.log('👤 [DEAL-PAGE] Lade Teilnehmer-Profile...');
      
      // Lade Seller-Profil
      const sellerProfile = await fetchUserProfile($activeDealRoom.participants.seller);
      sellerName = sellerProfile?.name || sellerProfile?.display_name || truncatePubkey($activeDealRoom.participants.seller);
      
      // Lade Buyer-Profil
      const buyerProfile = await fetchUserProfile($activeDealRoom.participants.buyer);
      buyerName = buyerProfile?.name || buyerProfile?.display_name || truncatePubkey($activeDealRoom.participants.buyer);
      
      profilesLoaded = true;
      console.log('✅ [DEAL-PAGE] Profile geladen:');
      console.log('  Seller:', sellerName);
      console.log('  Buyer:', buyerName);
    } catch (error) {
      console.error('❌ [DEAL-PAGE] Fehler beim Laden der Profile:', error);
      // Fallback zu truncated pubkeys
      sellerName = truncatePubkey($activeDealRoom.participants.seller);
      buyerName = truncatePubkey($activeDealRoom.participants.buyer);
      profilesLoaded = true;
    }
  }
  
  /**
   * Hole Namen für einen Sender
   */
  function getSenderName(senderPubkey: string): string {
    if (!$activeDealRoom) return truncatePubkey(senderPubkey);
    
    if (senderPubkey === $userStore.pubkey) {
      return 'Du';
    } else if (senderPubkey === $activeDealRoom.participants.seller) {
      return sellerName || truncatePubkey(senderPubkey);
    } else if (senderPubkey === $activeDealRoom.participants.buyer) {
      return buyerName || truncatePubkey(senderPubkey);
    }
    
    return truncatePubkey(senderPubkey);
  }

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

      // Prüfe Berechtigung (direkt, nicht über reactive isParticipant)
      const userPubkey = $userStore.pubkey!;
      const isSeller = $activeDealRoom.participants.seller === userPubkey;
      const isBuyer = $activeDealRoom.participants.buyer === userPubkey;
      
      if (!isSeller && !isBuyer) {
        console.error('❌ [DEAL-PAGE] Berechtigungsfehler:');
        console.error('  User:', userPubkey.substring(0, 16));
        console.error('  Seller:', $activeDealRoom.participants.seller.substring(0, 16));
        console.error('  Buyer:', $activeDealRoom.participants.buyer.substring(0, 16));
        error = 'Du bist kein Teilnehmer dieses Deal-Rooms';
        return;
      }

      // Lade Teilnehmer-Profile
      await loadParticipantProfiles();

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
      {#if $activeDealRoom && profilesLoaded}
        <p class="deal-meta">
          Mit: <strong>{otherParticipantName || truncatePubkey(otherParticipant || '')}</strong>
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
                  {getSenderName(message.sender)}
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
    background: linear-gradient(135deg, var(--bg-color) 0%, var(--bg-secondary) 100%);
  }

  .deal-header {
    background: linear-gradient(135deg, var(--surface-color) 0%, var(--surface-elevated) 100%);
    padding: 1.25rem 2rem;
    border-bottom: 2px solid var(--border-color);
    box-shadow: 0 4px 20px rgba(255, 0, 110, 0.15);
    display: flex;
    align-items: center;
    gap: 1.5rem;
    position: sticky;
    top: 0;
    z-index: 100;
    flex-wrap: wrap;
  }

  .btn-back {
    background: linear-gradient(135deg, var(--surface-elevated), var(--surface-color));
    border: 1px solid var(--border-color);
    color: var(--text-color);
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    padding: 0.625rem 1.25rem;
    border-radius: 0.75rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .btn-back:hover {
    background: linear-gradient(135deg, var(--surface-color), var(--bg-secondary));
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 0, 110, 0.2);
    border-color: var(--primary-color);
  }

  .deal-info {
    flex: 1;
  }

  .deal-info h1 {
    font-size: 1.75rem;
    margin: 0;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 700;
  }

  .deal-meta {
    font-size: 0.9375rem;
    color: var(--text-muted);
    margin: 0.375rem 0 0 0;
    font-weight: 500;
  }

  .error-message {
    padding: 1.25rem;
    margin: 1.5rem;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%);
    border: 2px solid rgba(239, 68, 68, 0.4);
    border-radius: 1rem;
    color: #ef4444;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
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
    margin: 1.5rem;
    padding: 1.5rem;
    border: 1px solid var(--border-color);
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
    line-height: 1.7;
    color: var(--text-color);
    padding: 1rem 1.25rem;
    background: linear-gradient(135deg, rgba(255, 0, 110, 0.1) 0%, rgba(139, 92, 246, 0.08) 100%);
    border-radius: 0.75rem;
    border-left: 4px solid var(--primary-color);
    font-size: 0.9375rem;
  }

  .chat-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
    overflow: hidden;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    background: linear-gradient(135deg, var(--surface-color) 0%, var(--surface-elevated) 100%);
    border-radius: 1rem;
    margin-bottom: 1.5rem;
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-color);
  }

  .empty-state {
    text-align: center;
    color: var(--text-muted);
    padding: 2rem;
  }

  .message {
    margin-bottom: 1.25rem;
    padding: 1rem 1.25rem;
    background: linear-gradient(135deg, var(--surface-elevated) 0%, var(--surface-color) 100%);
    border-radius: 1rem 1rem 1rem 0.25rem;
    max-width: 75%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-color);
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .message.own {
    background: linear-gradient(135deg, var(--primary-color) 0%, #d90062 100%);
    color: white;
    margin-left: auto;
    border-radius: 1rem 1rem 0.25rem 1rem;
    border: none;
    box-shadow: 0 4px 16px rgba(255, 0, 110, 0.4);
  }

  .message.own .message-author,
  .message.own .message-time {
    color: rgba(255, 255, 255, 0.95);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  .message.own .message-content {
    color: white;
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .message-author {
    font-weight: 600;
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
    gap: 0.75rem;
    padding: 1rem;
    background: linear-gradient(135deg, var(--surface-color) 0%, var(--surface-elevated) 100%);
    border-radius: 1rem;
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-color);
  }

  .message-form input {
    flex: 1;
    font-size: 0.9375rem;
  }

  .card {
    background: linear-gradient(135deg, var(--surface-color) 0%, var(--surface-elevated) 100%);
    border-radius: 1rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .btn {
    padding: 0.625rem 1.25rem;
    border: none;
    border-radius: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 0.9375rem;
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--primary-color) 0%, #d90062 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(255, 0, 110, 0.4);
  }

  .btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #d90062 0%, #b30052 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 0, 110, 0.5);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .input {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 2px solid var(--border-color);
    border-radius: 0.75rem;
    background-color: var(--bg-secondary);
    color: var(--text-color);
    font-size: 0.9375rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(255, 0, 110, 0.2);
    background-color: var(--surface-color);
  }

  /* ===== RESPONSIVE DESIGN ===== */
  
  /* Tablet (768px - 1023px) */
  @media (max-width: 1023px) {
    .deal-header {
      padding: 1rem 1.5rem;
    }

    .deal-info h1 {
      font-size: 1.5rem;
    }

    .chat-section {
      padding: 1.25rem;
    }

    .message {
      max-width: 80%;
    }
  }

  /* Mobile (max 767px) */
  @media (max-width: 767px) {
    .deal-header {
      padding: 1rem;
      gap: 1rem;
    }

    .btn-back {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }

    .deal-info h1 {
      font-size: 1.25rem;
    }

    .deal-meta {
      font-size: 0.8125rem;
    }

    .offer-preview {
      margin: 1rem;
      padding: 1rem;
    }

    .offer-content {
      padding: 0.875rem 1rem;
      font-size: 0.875rem;
    }

    .chat-section {
      padding: 1rem;
    }

    .messages-container {
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .message {
      max-width: 85%;
      padding: 0.875rem 1rem;
      font-size: 0.9375rem;
    }

    .message-form {
      padding: 0.75rem;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .message-form input {
      font-size: 0.875rem;
      padding: 0.75rem;
    }

    .message-form button {
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
    }
  }

  /* Small Mobile (max 480px) */
  @media (max-width: 480px) {
    .deal-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .btn-back {
      width: 100%;
      text-align: center;
    }

    .deal-info h1 {
      font-size: 1.125rem;
    }

    .message {
      max-width: 90%;
    }

    .message-form {
      flex-direction: column;
    }

    .message-form input,
    .message-form button {
      width: 100%;
    }
  }
</style>