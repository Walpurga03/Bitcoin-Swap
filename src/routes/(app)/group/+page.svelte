<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  // @ts-ignore
  import { goto } from '$app/navigation';
  // @ts-ignore
  import { env } from '$env/dynamic/public';
  import { userStore, isAuthenticated } from '$lib/stores/userStore';
  import { groupStore, marketplaceOffers } from '$lib/stores/groupStore';
  import { dealStore, dealRooms } from '$lib/stores/dealStore';
  import { formatTimestamp, truncatePubkey } from '$lib/utils';
  import { generateTempKeypair } from '$lib/nostr/crypto';

  // Admin Public Key
  const ADMIN_PUBKEY = env.PUBLIC_ADMIN_PUBKEY || 'npub1z90zurzsh00cmg6qfuyc5ca4auyjsp8kqxyf4hykyynxjj42ps6svpfgt3';
  let isAdmin = false;

  let offerInput = '';
  let showOfferForm = false;
  let loading = false;
  let error = '';
  let tempKeypair: { privateKey: string; publicKey: string } | null = null;
  let expandedOffers: Set<string> = new Set();
  let myInterests: Set<string> = new Set();
  let autoRefreshInterval: ReturnType<typeof setInterval>;

  // Prüfe ob User bereits ein aktives Angebot hat
  $: hasActiveOffer = tempKeypair && $marketplaceOffers.some(
    offer => offer.tempPubkey === tempKeypair?.publicKey
  );

  // GLOBALE Sperre: Wenn IRGENDEIN Angebot existiert, kann NIEMAND ein neues erstellen
  $: anyOfferExists = $marketplaceOffers.length > 0;

  // Prüfe ob User aktive Deal-Rooms hat
  $: hasActiveDeals = $dealRooms.length > 0;

  function hasMyInterest(offer: any): boolean {
    if (!$userStore.pubkey) return false;
    if (myInterests.has(offer.id)) return true;
    return offer.replies.some((r: any) => r.pubkey === $userStore.pubkey);
  }

  function getMyInterest(offer: any): any | null {
    if (!$userStore.pubkey) return null;
    return offer.replies.find((r: any) => r.pubkey === $userStore.pubkey) || null;
  }

  function toggleOfferExpand(offerId: string) {
    if (expandedOffers.has(offerId)) {
      expandedOffers.delete(offerId);
    } else {
      expandedOffers.add(offerId);
    }
    expandedOffers = expandedOffers;
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
      
      // Prüfe Admin-Status
      const { nip19 } = await import('nostr-tools');
      let adminHex = ADMIN_PUBKEY;
      if (ADMIN_PUBKEY.startsWith('npub1')) {
        const decoded = nip19.decode(ADMIN_PUBKEY as any);
        if ((decoded as any).type === 'npub') {
          adminHex = (decoded as any).data as string;
        }
      }
      isAdmin = $userStore.pubkey?.toLowerCase() === adminHex.toLowerCase();
      
      // Restore tempKeypair
      if ($userStore.tempPrivkey) {
        const { getPublicKeyFromPrivate } = await import('$lib/nostr/crypto');
        tempKeypair = {
          privateKey: $userStore.tempPrivkey,
          publicKey: getPublicKeyFromPrivate($userStore.tempPrivkey)
        };
        console.log('✅ [PAGE] tempKeypair wiederhergestellt');
      }
      
      // Lade Marketplace-Angebote
      await groupStore.loadOffers();
      console.log('✅ [PAGE] Marketplace-Angebote geladen');

      // Lade Deal-Rooms
      await dealStore.loadRooms(
        $userStore.pubkey!,
        $groupStore.groupKey!,
        $groupStore.relay!
      );
      console.log('✅ [PAGE] Deal-Rooms geladen:', $dealRooms.length);

      // Auto-Refresh alle 5 Sekunden
      autoRefreshInterval = setInterval(async () => {
        try {
          await groupStore.loadOffers();
          await dealStore.loadRooms(
            $userStore.pubkey!,
            $groupStore.groupKey!,
            $groupStore.relay!
          );
        } catch (e) {
          console.error('Auto-Refresh Fehler:', e);
        }
      }, 5000);

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

    // GLOBALE Prüfung: Wenn IRGENDEIN Angebot existiert, kann NIEMAND ein neues erstellen
    if (anyOfferExists) {
      alert('❌ Es existiert bereits ein aktives Angebot!\n\nBitte warte, bis das aktuelle Angebot abgeschlossen oder gelöscht wurde.');
      return;
    }

    try {
      loading = true;
      error = '⏳ Angebot wird erstellt...';

      if (!tempKeypair) {
        tempKeypair = generateTempKeypair();
        userStore.setTempPrivkey(tempKeypair.privateKey);
      }

      await groupStore.createOffer(offerInput, tempKeypair.privateKey);
      
      error = '✅ Angebot wird veröffentlicht...';
      await new Promise(resolve => setTimeout(resolve, 500));
      await groupStore.loadOffers();
      
      offerInput = '';
      showOfferForm = false;
      error = '';
      
      setTimeout(() => {
        alert('✅ Angebot erfolgreich erstellt!');
      }, 100);
    } catch (e: any) {
      error = '❌ ' + (e.message || 'Fehler beim Erstellen des Angebots');
    } finally {
      loading = false;
    }
  }

  async function sendInterest(offerId: string) {
    if (!$userStore.privateKey) return;

    try {
      loading = true;
      error = '⏳ Interesse wird gesendet...';

      const userName = $userStore.name || 'Unbekannt';
      
      await groupStore.sendInterest(
        offerId,
        'Ich habe Interesse an deinem Angebot!',
        userName,
        $userStore.privateKey
      );

      myInterests.add(offerId);
      myInterests = myInterests;

      await new Promise(resolve => setTimeout(resolve, 500));
      await groupStore.loadOffers();

      error = '';
      alert('✅ Interesse gesendet! Der Anbieter kann jetzt einen Deal-Room mit dir starten.');
    } catch (e: any) {
      console.error('❌ [UI] Fehler beim Senden des Interesses:', e);
      error = '❌ ' + (e.message || 'Fehler beim Senden des Interesses');
      myInterests.delete(offerId);
      myInterests = myInterests;
    } finally {
      loading = false;
    }
  }

  async function withdrawInterest(offerId: string, interestId: string) {
    if (!$userStore.privateKey) return;
    if (!confirm('Möchtest du dein Interesse wirklich zurückziehen?')) return;

    try {
      loading = true;
      error = '';

      await groupStore.deleteInterest(interestId, $userStore.privateKey);

      myInterests.delete(offerId);
      myInterests = myInterests;

      await new Promise(resolve => setTimeout(resolve, 500));
      await groupStore.loadOffers();

      alert('✅ Interesse zurückgezogen.');
    } catch (e: any) {
      error = e.message || 'Fehler beim Zurückziehen des Interesses';
      myInterests.add(offerId);
      myInterests = myInterests;
    } finally {
      loading = false;
    }
  }

  async function deleteOffer(offerId: string) {
    if (!tempKeypair?.privateKey) return;
    if (!confirm('Möchtest du dieses Angebot wirklich löschen?')) return;

    try {
      loading = true;
      error = '⏳ Angebot wird gelöscht...';

      await groupStore.deleteOffer(offerId, tempKeypair.privateKey);
      await new Promise(resolve => setTimeout(resolve, 500));
      await groupStore.loadOffers();
      
      error = '';
      alert('✅ Angebot erfolgreich gelöscht!');
    } catch (e: any) {
      error = '❌ ' + (e.message || 'Fehler beim Löschen');
    } finally {
      loading = false;
    }
  }

  async function startDealRoom(offerId: string, recipientPubkey: string, recipientName: string) {
    if (!tempKeypair?.privateKey || !$userStore.privateKey) {
      alert('❌ Fehler: Keine Keys vorhanden');
      return;
    }

    const offer = $marketplaceOffers.find(o => o.id === offerId);
    if (!offer || offer.tempPubkey !== tempKeypair.publicKey) {
      alert('❌ Fehler: Dies ist nicht dein Angebot');
      return;
    }

    const confirmMessage = `💬 Möchtest du einen Deal-Room mit ${recipientName} starten?\n\n` +
      `✅ VORTEILE:\n` +
      `• Privater verschlüsselter Chat nur für euch beide\n` +
      `• Dein Angebot wird gelöscht\n` +
      `• Andere User können weiter Angebote erstellen\n` +
      `• Whitelist bleibt unverändert`;
    
    if (!confirm(confirmMessage)) return;

    try {
      loading = true;
      error = '⏳ Deal-Room wird erstellt...';

      console.log('🏠 [UI] Erstelle Deal-Room...');

      // Erstelle Deal-Room
      const dealRoom = await dealStore.createRoom(
        offerId,
        offer.content,
        $userStore.pubkey!,
        recipientPubkey,
        $groupStore.channelId!,
        $groupStore.groupKey!,
        $userStore.privateKey,
        $groupStore.relay!
      );

      console.log('✅ [UI] Deal-Room erstellt:', dealRoom.id);

      // Lösche Angebot
      await groupStore.deleteOffer(offerId, tempKeypair.privateKey);
      console.log('✅ [UI] Angebot gelöscht');

      await new Promise(resolve => setTimeout(resolve, 500));
      await groupStore.loadOffers();

      error = '';
      loading = false;

      // Navigiere zum Deal-Room
      alert(`✅ Deal-Room erfolgreich erstellt!\n\nDu wirst jetzt zum privaten Chat weitergeleitet.`);
      goto(`/deal/${dealRoom.id}`);

    } catch (e: any) {
      console.error('❌ [UI] Fehler beim Deal-Room-Start:', e);
      error = '❌ ' + (e.message || 'Fehler beim Deal-Room-Start');
      loading = false;
    }
  }

  function handleLogout() {
    if (confirm('Möchtest du dich wirklich abmelden?')) {
      userStore.logout();
      groupStore.clearGroupData();
      dealStore.reset();
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
      {#if hasActiveDeals}
        <button class="btn btn-deals" on:click={() => goto('/deal/' + $dealRooms[0].id)}>
          💬 Meine Deals ({$dealRooms.length})
        </button>
      {/if}
      {#if isAdmin}
        <button class="btn btn-admin" on:click={() => goto('/admin')}>
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
                {:else if hasMyInterest(offer)}
                  {@const myInterest = getMyInterest(offer)}
                  <button 
                    class="btn btn-warning btn-sm" 
                    on:click={() => withdrawInterest(offer.id, myInterest.id)}
                    disabled={loading}
                    title="Interesse zurückziehen"
                  >
                    ✅ Interesse gezeigt
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
                {#if offer.tempPubkey === tempKeypair?.publicKey}
                  <div class="interest-header">
                    <strong>Interessenten:</strong>
                    <small class="hint-text">💡 Klicke auf "Deal starten" für privaten Chat</small>
                  </div>
                  {#each offer.replies as reply (reply.id)}
                    {@const userName = reply.content.split(':')[0]?.trim() || 'Unbekannt'}
                    {@const message = reply.content.split(':').slice(1).join(':').trim() || reply.content}
                    <div class="interest-item">
                      <div class="interest-meta">
                        <button
                          class="interest-name clickable"
                          on:click={() => copyToClipboard(reply.pubkey)}
                          title="Klicke zum Kopieren der Public Key: {reply.pubkey}"
                        >
                          👤 <strong>{userName}</strong>
                          <span class="copy-icon">📋</span>
                        </button>
                        <span class="interest-time">
                          {formatTimestamp(reply.created_at)}
                        </span>
                      </div>
                      <div class="interest-actions">
                        <button
                          class="interest-pubkey-detail clickable"
                          on:click={() => copyToClipboard(reply.pubkey)}
                          title="Klicke zum Kopieren: {reply.pubkey}"
                        >
                          🔑 {truncatePubkey(reply.pubkey)}
                        </button>
                        <button
                          class="btn btn-chat btn-sm"
                          on:click={() => startDealRoom(offer.id, reply.pubkey, userName)}
                          title="Deal-Room mit {userName} starten"
                          disabled={loading}
                        >
                          🏠 Deal starten
                        </button>
                      </div>
                      {#if message !== userName}
                        <div class="interest-message">
                          {message}
                        </div>
                      {/if}
                    </div>
                  {/each}
                {:else}
                  <div class="interest-header">
                    <strong>Dein Interesse:</strong>
                  </div>
                  {#each offer.replies.filter(r => r.pubkey === $userStore.pubkey) as reply (reply.id)}
                    {@const userName = reply.content.split(':')[0]?.trim() || 'Unbekannt'}
                    {@const message = reply.content.split(':').slice(1).join(':').trim() || reply.content}
                    <div class="interest-item own-interest">
                      <div class="interest-meta">
                        <span class="interest-name">
                          👤 <strong>{userName}</strong>
                        </span>
                        <span class="interest-time">
                          {formatTimestamp(reply.created_at)}
                        </span>
                      </div>
                      {#if message !== userName}
                        <div class="interest-message">
                          {message}
                        </div>
                      {/if}
                      <div class="interest-status">
                        ℹ️ Warte auf Deal-Room vom Anbieter...
                        <br>
                        <small>Der Anbieter kann einen privaten Deal-Room mit dir starten.</small>
                        <br><br>
                        <small>💡 Sobald der Deal-Room erstellt wurde, findest du ihn unter "Meine Deals" im Header.</small>
                      </div>
                    </div>
                  {/each}
                {/if}
              </div>
            {/if}
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
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
    color: var(--text-muted);
  }

  .hint-text {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: normal;
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

  .interest-name {
    font-weight: 600;
    color: #10b981;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    background: none;
    border: none;
    padding: 0.375rem 0.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.9375rem;
  }

  .interest-name:hover {
    background-color: rgba(16, 185, 129, 0.1);
    transform: translateY(-1px);
  }

  .interest-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }

  .interest-pubkey-detail {
    font-weight: 500;
    color: var(--text-muted);
    font-family: monospace;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    background: none;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.8125rem;
  }

  .interest-pubkey-detail:hover {
    background-color: rgba(0, 0, 0, 0.05);
    color: var(--text-color);
  }

  .btn-chat {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    border: none;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn-chat:hover:not(:disabled) {
    background: linear-gradient(135deg, #059669, #047857);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .copy-icon {
    opacity: 0;
    transition: opacity 0.2s;
    font-size: 0.875rem;
  }

  .interest-name:hover .copy-icon {
    opacity: 1;
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

  .own-interest {
    background-color: rgba(59, 130, 246, 0.05);
    border-left-color: #3b82f6;
  }

  .interest-status {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background-color: rgba(59, 130, 246, 0.1);
    border-radius: 0.25rem;
    font-size: 0.8125rem;
    color: #3b82f6;
    text-align: center;
    font-weight: 500;
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
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
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

    .interest-actions {
      flex-direction: column;
    }

    .interest-actions .btn {
      width: 100%;
    }
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