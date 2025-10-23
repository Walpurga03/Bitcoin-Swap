<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  // @ts-ignore
  import { goto } from '$app/navigation';
  import { userStore, isAuthenticated } from '$lib/stores/userStore';
  import { groupStore } from '$lib/stores/groupStore';
  import { formatTimestamp, truncatePubkey, getTimeRemaining, isExpiringSoon } from '$lib/utils';
  import { 
    generateTempKeypair, 
    saveTempKeypair, 
    loadTempKeypair, 
    deleteTempKeypair 
  } from '$lib/nostr/crypto';
  import {
    createOffer as createOfferMarketplace,
    deleteOffer as deleteOfferMarketplace,
    loadOffers,
    type Offer
  } from '$lib/nostr/marketplace';
  import {
    sendInterest as sendInterestNIP17,
    loadInterests,
    getInterestCount,
    type Interest
  } from '$lib/nostr/nip17';
  import WhitelistModal from '$lib/components/WhitelistModal.svelte';
  import InterestModal from '$lib/components/InterestModal.svelte';
  import InterestList from '$lib/components/InterestList.svelte';
  
  let isAdmin = false;

  // Marketplace State
  let offers: Offer[] = [];
  let offerInput = '';
  let showOfferForm = false;
  let loading = false;
  let error = '';
  let tempKeypair: { privateKey: string; publicKey: string } | null = null;
  
  // Modals
  let showWhitelistModal = false;
  let showInterestModal = false;
  let showInterestList = false;
  let selectedOffer: Offer | null = null;
  
  // Interests State
  let interests: Interest[] = [];
  let interestCounts: Record<string, number> = {};
  let myInterestOfferIds: Set<string> = new Set();
  
  let autoRefreshInterval: ReturnType<typeof setInterval>;

  // Prüfe ob User ein aktives Angebot hat
  $: hasActiveOffer = tempKeypair && offers.some(
    offer => offer.tempPubkey === tempKeypair?.publicKey
  );

  // GLOBALE Sperre: Wenn IRGENDEIN Angebot existiert, kann NIEMAND ein neues erstellen
  $: anyOfferExists = offers.length > 0;

  async function loadAllOffers() {
    if (!$groupStore.relay || !$groupStore.channelId) return;
    
    try {
      console.log('🔍 Relay:', $groupStore.relay);
      console.log('🔍 Channel ID:', $groupStore.channelId?.substring(0, 16) + '...');
      
      const ownTempPubkey = tempKeypair?.publicKey;
      offers = await loadOffers($groupStore.relay, $groupStore.channelId, ownTempPubkey);
      
      // Lade Interest-Counts für alle Angebote
      for (const offer of offers) {
        interestCounts[offer.id] = await getInterestCount(offer.tempPubkey, $groupStore.relay);
      }
      
      console.log(`✅ ${offers.length} Angebote geladen`);
    } catch (e) {
      console.error('❌ Fehler beim Laden der Angebote:', e);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert(`✅ Public Key kopiert!\n\n${text}\n\nDu kannst den User nun außerhalb der App kontaktieren.`);
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
      prompt('Public Key (kopiere ihn manuell):', text);
    }
  }

  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/');
      return;
    }
    try {
      console.log('🚀 [PAGE] onMount - Lade Daten...');
      
      // 🔐 Lade Admin-Status dynamisch von Nostr
      const group = $groupStore;
      const userPubkey = $userStore.pubkey;
      
      if (group && group.relay && group.secret) {
        try {
          const { loadGroupAdmin, deriveSecretHash } = await import('$lib/nostr/groupConfig');
          const secretHash = await deriveSecretHash(group.secret);
          const adminPubkey = await loadGroupAdmin(secretHash, [group.relay]);
          
          const isCurrentUserAdmin = adminPubkey?.toLowerCase() === userPubkey?.toLowerCase();
          isAdmin = isCurrentUserAdmin;
          
          console.log('🔐 [ADMIN-CHECK]', {
            adminPubkey: adminPubkey?.substring(0, 16) + '...',
            userPubkey: userPubkey?.substring(0, 16) + '...',
            isAdmin: isCurrentUserAdmin ? '✅ JA' : '❌ NEIN'
          });
        } catch (adminCheckError) {
          console.warn('⚠️ [ADMIN-CHECK] Fehler:', adminCheckError);
          isAdmin = false;
        }
      }
      
      // Versuche temp_keypair zu laden (mit Recovery)
      if ($userStore.privateKey) {
        tempKeypair = loadTempKeypair($userStore.privateKey);
        if (tempKeypair) {
          console.log('✅ [PAGE] temp_keypair wiederhergestellt');
        }
      }
      
      // Lade Marketplace-Angebote
      await loadAllOffers();

      // Auto-Refresh alle 10 Sekunden
      autoRefreshInterval = setInterval(async () => {
        try {
          await loadAllOffers();
        } catch (e) {
          console.error('Auto-Refresh Fehler:', e);
        }
      }, 10000);

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

  async function createOffer() {
    if (!offerInput.trim()) return;
    if (!$groupStore.relay || !$groupStore.channelId || !$userStore.privateKey) return;

    // GLOBALE Prüfung: Wenn IRGENDEIN Angebot existiert, kann NIEMAND ein neues erstellen
    if (anyOfferExists) {
      alert('❌ Es existiert bereits ein aktives Angebot!\n\nBitte warte, bis das aktuelle Angebot abgeschlossen oder gelöscht wurde.');
      return;
    }

    try {
      loading = true;
      error = '⏳ Angebot wird erstellt...';

      // Generiere oder lade temp_keypair
      if (!tempKeypair) {
        tempKeypair = generateTempKeypair();
        saveTempKeypair(tempKeypair, $userStore.privateKey);
        console.log('✅ Neuer temp_keypair erstellt & gespeichert');
      }

      // Erstelle Angebot
      await createOfferMarketplace(
        offerInput,
        tempKeypair,
        $groupStore.relay,
        $groupStore.channelId
      );
      
      error = '✅ Angebot veröffentlicht! Lade Angebote neu...';
      
      // Warte 2 Sekunden damit Relay das Event verarbeiten kann
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadAllOffers();
      
      offerInput = '';
      showOfferForm = false;
      error = '✅ Angebot erfolgreich erstellt!';
      
      setTimeout(() => {
        error = '';
      }, 3000);
    } catch (e: any) {
      error = '❌ ' + (e.message || 'Fehler beim Erstellen des Angebots');
    } finally {
      loading = false;
    }
  }

  async function deleteOffer(offerId: string) {
    if (!tempKeypair?.privateKey || !$groupStore.relay) return;
    if (!confirm('Möchtest du dieses Angebot wirklich löschen?')) return;

    try {
      loading = true;
      error = '⏳ Angebot wird gelöscht...';

      await deleteOfferMarketplace(
        offerId,
        tempKeypair.privateKey,
        tempKeypair.publicKey,
        $groupStore.relay
      );
      
      // Lösche temp_keypair
      deleteTempKeypair();
      tempKeypair = null;
      
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadAllOffers();
      
      error = '';
      alert('✅ Angebot erfolgreich gelöscht!');
    } catch (e: any) {
      error = '❌ ' + (e.message || 'Fehler beim Löschen');
    } finally {
      loading = false;
    }
  }

  function openInterestModal(offer: Offer) {
    selectedOffer = offer;
    showInterestModal = true;
  }

  async function handleSendInterest(event: CustomEvent<{ message: string }>) {
    if (!selectedOffer || !$userStore.privateKey || !$userStore.pubkey || !$groupStore.relay) return;

    try {
      loading = true;
      error = '⏳ Interesse wird gesendet...';
      showInterestModal = false;

      const userName = $userStore.name || 'Anonym';
      
      await sendInterestNIP17(
        $userStore.privateKey,
        $userStore.pubkey,
        userName,
        event.detail.message,
        selectedOffer.tempPubkey,
        $groupStore.relay
      );

      myInterestOfferIds.add(selectedOffer.id);
      myInterestOfferIds = myInterestOfferIds;

      await new Promise(resolve => setTimeout(resolve, 500));
      await loadAllOffers();

      error = '';
      alert('✅ Interesse gesendet!');
    } catch (e: any) {
      console.error('❌ Fehler beim Senden des Interesses:', e);
      error = '❌ ' + (e.message || 'Fehler beim Senden des Interesses');
      if (selectedOffer) {
        myInterestOfferIds.delete(selectedOffer.id);
        myInterestOfferIds = myInterestOfferIds;
      }
    } finally {
      loading = false;
      selectedOffer = null;
    }
  }

  async function openInterestList(offer: Offer) {
    if (!tempKeypair?.privateKey || !$groupStore.relay) return;
    
    try {
      loading = true;
      selectedOffer = offer;
      
      // Lade Interessen
      interests = await loadInterests(tempKeypair.privateKey, $groupStore.relay);
      
      showInterestList = true;
      loading = false;
    } catch (e: any) {
      console.error('❌ Fehler beim Laden der Interessen:', e);
      error = '❌ ' + (e.message || 'Fehler beim Laden der Interessen');
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
      <h1>🛒 Bitcoin Tausch Netzwerk</h1>
      <p class="user-info">
        Angemeldet als: <strong>{$userStore.name || 'Anonym'}</strong>
        ({truncatePubkey($userStore.pubkey || '')})
        {#if isAdmin}
          <span class="admin-badge">👑 Admin</span>
        {/if}
      </p>
    </div>
    <div class="header-actions">
      {#if isAdmin}
        <button class="btn btn-admin" on:click={() => showWhitelistModal = true}>
          🔐 Whitelist verwalten
        </button>
      {/if}
      <button class="btn btn-secondary" on:click={handleLogout}>
        Abmelden
      </button>
    </div>
  </header>

  {#if error}
    <div class="status-message" class:loading={error.includes('⏳')} class:success={error.includes('✅')} class:error={error.includes('❌')}>
      {error}
    </div>
  {/if}

  <div class="marketplace-container">
    <div class="marketplace-header">
      <h2>🛒 Marketplace</h2>
      <button
        class="btn btn-primary btn-sm"
        on:click={() => showOfferForm = !showOfferForm}
        disabled={anyOfferExists && !showOfferForm}
        title={anyOfferExists ? 'Es existiert bereits ein aktives Angebot' : 'Neues Angebot erstellen'}
      >
        {showOfferForm ? '✕ Abbrechen' : '+ Neues Angebot'}
      </button>
    </div>

    {#if anyOfferExists && !showOfferForm}
      <div class="info-banner">
        ℹ️ Es existiert bereits ein aktives Angebot. Nur 1 Angebot gleichzeitig erlaubt.
      </div>
    {/if}

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
            {#if loading}
              <span class="spinner"></span>
              <span>Wird veröffentlicht...</span>
            {:else}
              🚀 Angebot veröffentlichen
            {/if}
          </button>
        </div>
        <small class="hint">
          💡 <strong>Hinweis:</strong> Dein Angebot wird anonym veröffentlicht.
          Andere Nutzer können Interesse zeigen und du kannst dann einen privaten Deal-Room starten.
        </small>
      </form>
    {/if}

    <div class="offers-list">
      {#if loading && offers.length === 0}
        <div class="loading-state">
          <p>⏳ Lade Angebote...</p>
        </div>
      {:else if offers.length === 0}
        <div class="empty-state">
          <div class="empty-icon">🛒</div>
          <p><strong>Noch keine Angebote vorhanden</strong></p>
          <p class="text-muted">Sei der Erste und erstelle ein Bitcoin-Tauschangebot!</p>
        </div>
      {:else}
        <div class="offers-count">
          {offers.length} {offers.length === 1 ? 'Angebot' : 'Angebote'}
        </div>
        {#each offers as offer (offer.id)}
          <div class="offer-card card" class:own-offer={offer.isOwnOffer}>
            <div class="offer-header">
              <div class="offer-meta">
                <span class="offer-author">
                  {#if offer.isOwnOffer}
                    <span class="badge badge-primary">Dein Angebot</span>
                  {:else}
                    <span class="badge badge-secondary">Anonym</span>
                  {/if}
                </span>
                <span class="offer-time" class:expiring-soon={isExpiringSoon(offer.expiresAt)}>
                  ⏰ {getTimeRemaining(offer.expiresAt)}
                </span>
              </div>
            </div>
            <div class="offer-content">
              {offer.content}
            </div>
            <div class="offer-footer">
              <div class="offer-info">
                <span class="offer-id">ID: {truncatePubkey(offer.tempPubkey)}</span>
                {#if interestCounts[offer.id] > 0}
                  {#if offer.isOwnOffer}
                    <button 
                      class="interest-badge clickable"
                      on:click={() => openInterestList(offer)}
                      disabled={loading}
                    >
                      💌 {interestCounts[offer.id]} {interestCounts[offer.id] === 1 ? 'Interessent' : 'Interessenten'}
                      <span class="expand-icon">▶</span>
                    </button>
                  {:else}
                    <span class="interest-badge">
                      💌 {interestCounts[offer.id]} {interestCounts[offer.id] === 1 ? 'Interessent' : 'Interessenten'}
                    </span>
                  {/if}
                {/if}
              </div>
              <div class="offer-actions">
                {#if offer.isOwnOffer}
                  <button 
                    class="btn btn-danger btn-sm" 
                    on:click={() => deleteOffer(offer.id)}
                    disabled={loading}
                  >
                    🗑️ Löschen
                  </button>
                {:else if myInterestOfferIds.has(offer.id)}
                  <button 
                    class="btn btn-warning btn-sm" 
                    disabled
                    title="Du hast bereits Interesse gezeigt"
                  >
                    ✅ Interesse gezeigt
                  </button>
                {:else}
                  <button 
                    class="btn btn-success btn-sm" 
                    on:click={() => openInterestModal(offer)}
                    disabled={loading}
                  >
                    ✋ Interesse zeigen
                  </button>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .group-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, var(--bg-color) 0%, var(--bg-secondary) 100%);
  }

  .group-header {
    background: linear-gradient(135deg, var(--surface-color) 0%, var(--surface-elevated) 100%);
    padding: 1.25rem 2rem;
    border-bottom: 2px solid var(--border-color);
    box-shadow: 0 4px 20px rgba(255, 0, 110, 0.15);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .group-header h1 {
    font-size: 1.75rem;
    margin: 0;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 700;
  }

  .user-info {
    font-size: 0.9375rem;
    color: var(--text-muted);
    margin: 0.25rem 0 0 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .admin-badge {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    background: linear-gradient(135deg, var(--accent-color), var(--secondary-color));
    color: white;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 8px rgba(192, 38, 211, 0.3);
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .btn-admin {
    background: linear-gradient(135deg, var(--secondary-color), var(--accent-color));
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 0.875rem;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
  }

  .btn-admin:hover {
    background: linear-gradient(135deg, var(--accent-color), var(--secondary-color));
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
  }

  /* .btn-deals für zukünftige Deal-Rooms Feature
  .btn-deals {
    background: linear-gradient(135deg, var(--primary-color), #d90062);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 0.875rem;
    box-shadow: 0 4px 12px rgba(255, 0, 110, 0.4);
  }

  .btn-deals:hover {
    background: linear-gradient(135deg, #d90062, #b30052);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 0, 110, 0.5);
  }
  */

  .marketplace-container {
    flex: 1;
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }

  .marketplace-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .marketplace-header h2 {
    font-size: 1.75rem;
    margin: 0;
    font-weight: 700;
    color: var(--text-color);
  }

  .info-banner {
    padding: 1rem;
    background: linear-gradient(135deg, rgba(255, 0, 110, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    border: 1px solid rgba(255, 0, 110, 0.3);
    border-radius: 0.75rem;
    color: var(--primary-color);
    margin-bottom: 1rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .offer-form {
    margin-bottom: 1.5rem;
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
    background: linear-gradient(135deg, rgba(255, 0, 110, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
    border-radius: 0.75rem;
    border: 1px solid rgba(255, 0, 110, 0.2);
    color: var(--text-secondary);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .hint strong {
    color: var(--text-color);
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .offers-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 400px), 1fr));
    gap: 1.5rem;
  }

  @media (min-width: 1024px) {
    .offers-list {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1400px) {
    .offers-list {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .offers-count {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .loading-state,
  .empty-state {
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
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid var(--border-color);
    height: 100%;
    display: flex;
    flex-direction: column;
    background: linear-gradient(135deg, var(--surface-color) 0%, var(--surface-elevated) 100%);
  }

  .offer-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(255, 0, 110, 0.25);
    border-color: var(--primary-color);
  }

  .offer-card.own-offer {
    border-left: 4px solid var(--primary-color);
    background: linear-gradient(135deg, rgba(255, 0, 110, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    box-shadow: 0 4px 16px rgba(255, 0, 110, 0.2);
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
    background: linear-gradient(135deg, var(--primary-color), #d90062);
    color: white;
    box-shadow: 0 2px 8px rgba(255, 0, 110, 0.3);
  }

  .badge-secondary {
    background-color: var(--surface-elevated);
    color: var(--text-muted);
    border: 1px solid var(--border-color);
  }

  .offer-time {
    color: var(--text-muted);
    font-size: 0.8125rem;
  }
  
  .offer-time.expiring-soon {
    color: #f59e0b;
    font-weight: 600;
    animation: pulse 2s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
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
    transition: all 0.2s;
  }
  
  .interest-badge.clickable {
    cursor: pointer;
  }

  .interest-badge:hover {
    background-color: rgba(16, 185, 129, 0.2);
    border-color: rgba(16, 185, 129, 0.5);
  }

  .expand-icon {
    font-size: 0.75rem;
    opacity: 0.7;
  }

  .offer-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }

  .btn-primary {
    background-color: var(--primary-color);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .btn-secondary {
    background-color: var(--surface-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: var(--bg-color);
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

  .btn-warning {
    background-color: #f59e0b;
    color: white;
  }

  .btn-warning:hover:not(:disabled) {
    background-color: #d97706;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .status-message {
    padding: 1rem;
    border-radius: 0.5rem;
    margin: 1rem 1.5rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-message.loading {
    background-color: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #3b82f6;
  }

  .status-message.success {
    background-color: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #10b981;
  }

  .status-message.error {
    background-color: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
  }

  .spinner {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin-anim 0.8s linear infinite;
  }

  @keyframes spin-anim {
    to {
      transform: rotate(360deg);
    }
  }

  .card {
    background: linear-gradient(135deg, var(--surface-color) 0%, var(--surface-elevated) 100%);
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-color);
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

  .clickable {
    cursor: pointer;
  }

  /* ===== RESPONSIVE DESIGN ===== */
  
  /* Tablet (768px - 1023px) */
  @media (max-width: 1023px) {
    .group-header {
      padding: 1rem 1.5rem;
    }

    .group-header h1 {
      font-size: 1.5rem;
    }

    .marketplace-container {
      padding: 1.5rem;
    }

    .marketplace-header h2 {
      font-size: 1.5rem;
    }

    .offers-list {
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 350px), 1fr));
    }
  }

  /* Mobile (max 767px) */
  @media (max-width: 767px) {
    .group-header {
      padding: 1rem;
      flex-direction: column;
      align-items: flex-start;
    }

    .group-header h1 {
      font-size: 1.25rem;
    }

    .user-info {
      font-size: 0.8125rem;
    }

    .header-actions {
      width: 100%;
      flex-wrap: wrap;
    }

    .header-actions .btn {
      flex: 1;
      min-width: 120px;
      font-size: 0.8125rem;
      padding: 0.5rem 0.75rem;
    }

    .marketplace-container {
      padding: 1rem;
    }

    .marketplace-header {
      flex-direction: column;
      align-items: stretch;
    }

    .marketplace-header h2 {
      font-size: 1.25rem;
      margin-bottom: 0.5rem;
    }

    .marketplace-header .btn {
      width: 100%;
    }

    .offers-list {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .offer-card {
      padding: 1rem;
    }

    .offer-footer {
      flex-direction: column;
      gap: 0.75rem;
      align-items: stretch;
    }

    .offer-actions {
      width: 100%;
    }

    .offer-actions .btn {
      flex: 1;
    }

    /* .interest-actions für zukünftige Features
    .interest-actions {
      flex-direction: column;
    }

    .interest-actions .btn {
      width: 100%;
    }
    */
  }

  /* Small Mobile (max 480px) */
  @media (max-width: 480px) {
    .group-header h1 {
      font-size: 1.125rem;
    }

    .marketplace-header h2 {
      font-size: 1.125rem;
    }

    .card {
      padding: 1rem;
      border-radius: 0.75rem;
    }

    .offer-form textarea {
      font-size: 0.875rem;
    }
  }
</style>

<!-- Whitelist Modal -->
<WhitelistModal 
  bind:show={showWhitelistModal}
  onClose={() => showWhitelistModal = false}
/>

<!-- Interest Modal -->
<InterestModal 
  bind:show={showInterestModal}
  offerContent={selectedOffer?.content || ''}
  on:send={handleSendInterest}
/>

<!-- Interest List Modal -->
<InterestList
  bind:show={showInterestList}
  {interests}
  {loading}
/>