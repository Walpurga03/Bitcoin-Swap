<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  // @ts-ignore
  import { goto } from '$app/navigation';
  import { userStore, isAuthenticated } from '$lib/stores/userStore';
  import { groupStore } from '$lib/stores/groupStore';
  import { logger, marketplaceLogger, securityLogger } from '$lib/utils/logger';
  import { truncatePubkey, getTimeRemaining, isExpiringSoon, getErrorMessage } from '$lib/utils';
  import { generateOfferSecret, deriveKeypairFromSecret, validateOfferSecret } from '$lib/nostr/offerSecret';
  import { createOffer as createOfferMarketplace, deleteOffer as deleteOfferMarketplace, loadOffers, type Offer } from '$lib/nostr/marketplace';
  import WhitelistModal from '$lib/components/WhitelistModal.svelte';
  import InterestListSimple from '$lib/components/InterestListSimple.svelte';
  import SecretBackupModal from '$lib/components/SecretBackupModal.svelte';
  import SecretLoginModal from '$lib/components/SecretLoginModal.svelte';
  import DealNotificationModal from '$lib/components/DealNotificationModal.svelte';
  import MarketplaceHeader from '$lib/components/MarketplaceHeader.svelte';
  import OfferForm from '$lib/components/OfferForm.svelte';
  
  let isAdmin = false;
  let offers: Offer[] = [];
  let offerInput = '';
  let showOfferForm = false;
  let loading = false;
  let error = '';
  let offerSecret: string | null = null;
  let offerKeypair: { privateKey: string; publicKey: string } | null = null;
  let showSecretBackup = false;
  let showSecretLogin = false;
  let showWhitelistModal = false;
  let showInterestList = false;
  let selectedOffer: Offer | null = null;
  let interests: Array<{ pubkey: string; tempPubkey: string; name?: string; timestamp: number }> = [];
  let myInterestOfferIds: Set<string> = new Set();
  let interestCounts: Record<string, number> = {};
  
  // Deal Notification Modal
  let showDealModal = false;
  let dealModalData: { roomId: string; message: string; type: 'accepted' | 'created' } | null = null;
  let autoRefreshInterval: NodeJS.Timeout;
  let isLoadingOffers = false;

  $: hasActiveOffer = offerKeypair && offers.some(offer => offer.tempPubkey === offerKeypair?.publicKey);
  $: anyOfferExists = offers.length > 0;

  async function loadMyInterestsFromStorage(): Promise<void> {
    try {
      myInterestOfferIds.clear();
      
      const { loadMyInterestSignals } = await import('$lib/nostr/interestSignal');
      const localInterests = loadMyInterestSignals();
      for (const interest of localInterests) {
        myInterestOfferIds.add(interest.offerId);
      }
      
      myInterestOfferIds = myInterestOfferIds;
    } catch (e) {
      logger.warn('Fehler beim Laden von Interest Signals', e);
    }
  }

  /**
   * Prüfe auf eingehende NIP-04 Deal-Benachrichtigungen
   * 
   * Lädt alle Interest Temp-Keys aus sessionStorage und prüft
   * ob es verschlüsselte Nachrichten für sie gibt.
   */
  async function checkForDealNotifications(): Promise<void> {
    if (!$groupStore.relay) return;
    
    try {
      logger.debug('🔄 Auto-Refresh: Suche nach Deal-Benachrichtigungen...');
      
      // Lade alle Interest Temp-Keys
      const { loadMyInterestSignals } = await import('$lib/nostr/interestSignal');
      const myInterests = loadMyInterestSignals();
      
      if (myInterests.length === 0) {
        return; // Keine Interessen = keine Benachrichtigungen zu erwarten
      }
      
      const { deriveKeypairFromSecret } = await import('$lib/nostr/offerSecret');
      const { loadEncryptedMessages } = await import('$lib/nostr/nip04');
      
      // Prüfe für jeden Interest Temp-Key
      for (const interest of myInterests) {
        try {
          const tempKeypair = deriveKeypairFromSecret(interest.tempSecret);
          
          // Lade NIP-04 Messages für diesen Temp-Key
          const messages = await loadEncryptedMessages(
            tempKeypair.publicKey,
            tempKeypair.privateKey,
            $groupStore.relay,
            Math.floor(Date.now() / 1000) - 3600 // Letzte Stunde
          );
          
          // Verarbeite Nachrichten
          for (const msg of messages) {
            try {
              const data = JSON.parse(msg.content);
              
              if (data.type === 'deal-accepted') {
                logger.success('🎉 [DEAL-BENACHRICHTIGUNG] Dein Interesse wurde AKZEPTIERT!');
                logger.info(`📦 Angebot: ${data.offerId.substring(0, 16)}...`);
                logger.info(`🔑 Room-ID: ${data.roomId}`);
                logger.info(`📝 Inhalt: ${data.offerContent}`);
                
                // Zeige Modal statt Alert
                dealModalData = {
                  roomId: data.roomId,
                  message: `🎉 Dein Interesse wurde akzeptiert!\n\nAngebot: ${data.offerContent}`,
                  type: 'accepted'
                };
                showDealModal = true;
                
                // Entferne Interest aus localStorage (Deal abgeschlossen)
                sessionStorage.removeItem(`interest-secret-${interest.offerId}`);
                
              } else {
                // Unbekannter Message Type
                logger.warn('⚠️ Unbekannter Nachrichtentyp:', data.type);
              }
              
            } catch (parseError) {
              logger.warn('Konnte Nachricht nicht parsen', parseError);
            }
          }
          
        } catch (keyError) {
          logger.warn(`Fehler beim Prüfen von Interest ${interest.offerId}`, keyError);
        }
      }
      
    } catch (e) {
      logger.warn('Fehler beim Prüfen von Deal-Benachrichtigungen', e);
    }
  }

  async function loadAllOffers() {
    if (!$groupStore.relay || !$groupStore.channelId) return;
    if (isLoadingOffers) return;
    
    try {
      isLoadingOffers = true;
      const ownTempPubkey = offerKeypair?.publicKey;
      offers = await loadOffers($groupStore.relay, $groupStore.channelId, ownTempPubkey, $groupStore.secretHash);
      
      for (const offer of offers) {
        if (offer.isOwnOffer) {
          const { countInterestSignals } = await import('$lib/nostr/interestSignal');
          interestCounts[offer.id] = await countInterestSignals(offer.id, $groupStore.relay);
        }
      }
      
      marketplaceLogger.offer('✅ ' + offers.length + ' Angebote geladen');
    } catch (e) {
      logger.error('Fehler beim Laden der Angebote', e);
    } finally {
      isLoadingOffers = false;
    }
  }

  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/');
      return;
    }
    
    try {
      const group = $groupStore;
      const userPubkey = $userStore.pubkey;
      
      if (group && group.relay && group.secret) {
        try {
          const { loadGroupAdmin, deriveSecretHash } = await import('$lib/nostr/groupConfig');
          const secretHash = await deriveSecretHash(group.secret);
          const adminPubkey = await loadGroupAdmin(secretHash, [group.relay]);
          isAdmin = adminPubkey?.toLowerCase() === userPubkey?.toLowerCase();
        } catch (adminCheckError) {
          logger.warn('Admin-Check Fehler', adminCheckError);
          isAdmin = false;
        }
      }
      
      const savedSecret = sessionStorage.getItem('offerSecret');
      if (savedSecret) {
        try {
          offerSecret = savedSecret;
          offerKeypair = deriveKeypairFromSecret(savedSecret);
        } catch (e) {
          logger.warn('Ungültiges Secret in sessionStorage', e);
          sessionStorage.removeItem('offerSecret');
        }
      }
      
      await loadAllOffers();
      await loadMyInterestsFromStorage();
      await checkForDealNotifications();

      autoRefreshInterval = setInterval(async () => {
        try {
          await loadAllOffers();
          await loadMyInterestsFromStorage();
          await checkForDealNotifications();
        } catch (e) {
          logger.error('Auto-Refresh Fehler', e);
        }
      }, 10000);

    } catch (e: unknown) {
      logger.error('Fehler beim Laden der Daten', e);
      error = getErrorMessage(e) || 'Fehler beim Laden der Daten';
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

    if (anyOfferExists) {
      alert('❌ Es existiert bereits ein aktives Angebot!');
      return;
    }

    try {
      loading = true;
      error = '⏳ Angebot wird erstellt...';

      if (!offerKeypair) {
        offerSecret = generateOfferSecret();
        offerKeypair = deriveKeypairFromSecret(offerSecret);
        sessionStorage.setItem('offerSecret', offerSecret);
      }

      const offerId = await createOfferMarketplace(
        offerInput,
        offerKeypair,
        $groupStore.relay,
        $groupStore.channelId,
        $userStore.pubkey,
        $groupStore.secretHash
      );
      
      error = '✅ Angebot veröffentlicht!';
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadAllOffers();
      
      offerInput = '';
      showOfferForm = false;
      showSecretBackup = true;
      
      setTimeout(() => { error = ''; }, 3000);
    } catch (e: unknown) {
      error = '❌ ' + (getErrorMessage(e) || 'Fehler beim Erstellen');
    } finally {
      loading = false;
    }
  }

  async function handleShowInterest(offer: Offer) {
    if (!$userStore.pubkey || !$groupStore.relay) return;
    
    if (!confirm(`📤 Interesse zeigen für:\n\n"${offer.content.substring(0, 100)}..."\n\nDer Angebotsgeber wird deine Public Key sehen und kann dich auswählen.`)) {
      return;
    }

    try {
      loading = true;
      error = '⏳ Interesse wird gesendet...';

      const { sendInterestSignal, saveInterestSecret } = await import('$lib/nostr/interestSignal');
      
      const { event, tempSecret } = await sendInterestSignal(
        offer.id,
        offer.tempPubkey,
        'Ich habe Interesse!',
        $userStore.name || undefined,
        $userStore.privateKey,
        $groupStore.relay
      );

      saveInterestSecret(offer.id, tempSecret);
      
      myInterestOfferIds.add(offer.id);
      myInterestOfferIds = myInterestOfferIds;

      error = '';
      alert(`✅ Interesse gezeigt!\n\n⏳ Warte auf Auswahl durch den Angebotsgeber.\n\n🎭 Dein Interesse ist vollständig anonym!`);
      
    } catch (e: unknown) {
      logger.error('Fehler beim Senden des Interesses', e);
      error = '❌ ' + (getErrorMessage(e) || 'Fehler beim Senden des Interesses');
    } finally {
      loading = false;
    }
  }

  async function openInterestList(offer: Offer) {
    if (!$groupStore.relay) {
      error = '❌ Kein Relay verbunden';
      return;
    }
    
    if (!offerKeypair?.privateKey) {
      error = '❌ Secret nicht verfügbar!';
      showSecretLogin = true;
      return;
    }
    
    try {
      loading = true;
      selectedOffer = offer;
      
      const { loadInterestSignals } = await import('$lib/nostr/interestSignal');
      const signals = await loadInterestSignals(offer.id, offerKeypair.privateKey, $groupStore.relay);
      
      interests = signals.map(signal => ({
        pubkey: signal.interestedPubkey,     // Echter Pubkey (für Anzeige)
        tempPubkey: signal.tempPubkey,       // Temp-Pubkey (für NIP-04!)
        name: signal.userName || undefined,
        timestamp: signal.timestamp
      }));
      
      showInterestList = true;
      loading = false;
    } catch (e: unknown) {
      logger.error('Fehler beim Laden der Interesse-Signale', e);
      error = '❌ ' + (getErrorMessage(e) || 'Fehler beim Laden der Interesse-Signale');
      loading = false;
    }
  }

  /**
   * Angebotsgeber wählt einen Interessenten aus → Deal wird erstellt
   */
  async function handleSelectInterest(selectedPubkey: string) {
    if (!selectedOffer || !offerKeypair || !$userStore.pubkey || !$groupStore.relay) {
      logger.error('handleSelectInterest - fehlende Daten!');
      return;
    }

    try {
      loading = true;
      error = '';
      
      // Schritt 0: Generiere Room-ID für Chat
      logger.info('🎲 Schritt 0: Generiere Room-ID...');
      const { generateRoomId } = await import('$lib/utils');
      const roomId = generateRoomId();
      logger.success('✅ Room-ID generiert: ' + roomId);
      
      // Schritt 1: Sende NIP-04 Nachricht NUR an den Gewinner
      logger.info('📤 Schritt 1: Sende Benachrichtigung an ausgewählten Interessent...');
      
      if (!offerSecret) {
        throw new Error('Angebots-Secret fehlt');
      }
      
      // Hole alle Interessenten für dieses Angebot
      const allInterests = interests || [];
      logger.info(`📊 ${allInterests.length} Interessenten gefunden`);
      
      // Finde den ausgewählten Interessenten
      const winner = allInterests.find(i => i.pubkey === selectedPubkey);
      
      if (!winner) {
        throw new Error('Ausgewählter Interessent nicht gefunden!');
      }
      
      const { sendEncryptedMessage } = await import('$lib/nostr/nip04');
      
      const message = JSON.stringify({
        type: 'deal-accepted',
        roomId: roomId,
        offerId: selectedOffer.id,
        offerContent: selectedOffer.content.substring(0, 100),
        timestamp: Math.floor(Date.now() / 1000)
      });
      
      try {
        logger.info(`📧 Sende 🎉 DEAL-AKZEPTIERT an ${winner.pubkey.substring(0, 16)}... (Temp: ${winner.tempPubkey.substring(0, 8)})`);
        
        await sendEncryptedMessage(
          offerKeypair.privateKey,  // Sender: Temp-Key vom Angebot (anonym!)
          winner.tempPubkey,         // Empfänger: Interest TEMP-Key des Gewinners!
          message,
          $groupStore.relay
        );
        
        logger.success('✅ Benachrichtigung an Gewinner gesendet');
      } catch (e) {
        logger.error('❌ Fehler beim Senden der Benachrichtigung:', e);
        throw new Error('Konnte Benachrichtigung nicht senden');
      }
      
      logger.info('💡 Abgelehnte Interessenten: Sehen dass Angebot gelöscht wurde (Privacy!)');
      
      // Schritt 2: Lösche alle Interesse-Signale
      logger.info('🗑️ Schritt 2: Lösche alle Interesse-Signale...');
      
      const { deleteAllInterestSignals } = await import('$lib/nostr/interestSignal');
      await deleteAllInterestSignals(selectedOffer.id, offerSecret, $groupStore.relay);
      
      logger.success('✅ Interesse-Signale gelöscht');
      
      // Schritt 3: Lösche Angebot
      logger.info('🗑️ Schritt 3: Lösche Angebot...');
      
      await deleteOfferMarketplace(
        selectedOffer.id,
        offerKeypair.privateKey,
        offerKeypair.publicKey,
        $groupStore.relay
      );
      
      logger.success('✅ Angebot gelöscht');
      
      // Reset Zustand
      offerSecret = null;
      offerKeypair = null;
      sessionStorage.removeItem('offerSecret');
      
      // Lade Angebote neu
      await loadAllOffers();
      
      logger.success('🎉 Fertig! Deal abgeschlossen.');
      logger.info(`💬 Room-ID für Chat: ${roomId}`);
      logger.info(`👤 Gewinner: ${winner.pubkey.substring(0, 16)}...`);
      
      // Zeige Modal statt Alert
      dealModalData = {
        roomId: roomId,
        message: `✅ Deal abgeschlossen!\n\nGewinner: ${selectedPubkey.substring(0, 16)}...`,
        type: 'created'
      };
      showDealModal = true;
      
      // Schließe Interesse-Liste
      showInterestList = false;
      
    } catch (e: unknown) {
      logger.error('Fehler in handleSelectInterest', e);
      error = '❌ ' + (getErrorMessage(e) || 'Fehler');
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



  async function handleDeleteMyOffer(offer: Offer) {
    if (!confirm(`⚠️ Angebot "${offer.content.substring(0, 50)}..." wirklich löschen?`)) return;

    try {
      loading = true;
      error = '';

      if (!offerKeypair?.privateKey || !offerSecret) {
        throw new Error('Angebots-Keypair oder Secret fehlt');
      }

      error = '🗑️ Lösche Interesse-Signale...';
      try {
        const { deleteAllInterestSignals } = await import('$lib/nostr/interestSignal');
        await deleteAllInterestSignals(offer.id, offerSecret, $groupStore.relay);
      } catch (err) {
        logger.warn('Fehler beim Löschen der Interesse-Signale:', err);
      }

      error = '🗑️ Lösche Angebot...';
      await deleteOfferMarketplace(offer.id, offerKeypair.privateKey, offerKeypair.publicKey, $groupStore.relay);
      
      offerSecret = null;
      offerKeypair = null;
      sessionStorage.removeItem('offerSecret');
      
      await loadAllOffers();
      
      alert('✅ Angebot gelöscht!');
      error = '';
      
    } catch (e: unknown) {
      logger.error('Fehler beim Löschen', e);
      error = '❌ ' + (getErrorMessage(e) || 'Fehler beim Löschen');
    } finally {
      loading = false;
    }
  }


  // Secret-Login Handler
  async function handleSecretLogin(event: CustomEvent<{ secret: string }>) {
    const secret = event.detail.secret;
    
    try {
      loading = true;
      error = '';

      logger.info('Validiere Secret...');

      if (!validateOfferSecret(secret)) {
        throw new Error('Ungültiges Secret-Format');
      }

      // Leite Keypair aus Secret ab
      offerSecret = secret;
      offerKeypair = deriveKeypairFromSecret(secret);
      sessionStorage.setItem('offerSecret', secret);

      logger.success('Keypair erfolgreich abgeleitet');
      logger.debug('Public Key: ' + offerKeypair.publicKey.substring(0, 16) + '...');

      // Lade Angebote neu
      await loadAllOffers();

      alert('✅ Erfolgreich mit Secret angemeldet!\n\nDu kannst jetzt dein Angebot verwalten.');
      
    } catch (e: unknown) {
      logger.error('Secret-Login Fehler', e);
      error = '❌ Fehler beim Login: ' + (getErrorMessage(e) || 'Unbekannter Fehler');
      offerSecret = null;
      offerKeypair = null;
      sessionStorage.removeItem('offerSecret');
    } finally {
      loading = false;
    }
  }
</script>

<div class="group-container">
  <MarketplaceHeader
    userName={$userStore.name}
    userPubkey={$userStore.pubkey}
    {isAdmin}
    hasOfferKeypair={!!offerKeypair}
    onOpenWhitelist={() => showWhitelistModal = true}
    onOpenSecretLogin={() => showSecretLogin = true}
    onLogout={handleLogout}
  />

  {#if error}
    <div class="status-message" class:loading={error.includes('⏳')} class:success={error.includes('✅')} class:error={error.includes('❌')}>
      {error}
    </div>
  {/if}

  <div class="marketplace-container">
    <OfferForm
      bind:show={showOfferForm}
      bind:value={offerInput}
      {loading}
      {anyOfferExists}
      onToggle={() => showOfferForm = !showOfferForm}
      onSubmit={createOffer}
      onInput={(v) => offerInput = v}
    />

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
                <!-- Nur Angebotsgeber sieht Interest-Count -->
                {#if offer.isOwnOffer && interestCounts[offer.id] > 0}
                  <button 
                    class="interest-badge clickable"
                    on:click={() => openInterestList(offer)}
                    disabled={loading}
                  >
                    💌 {interestCounts[offer.id]} {interestCounts[offer.id] === 1 ? 'Interessent' : 'Interessenten'}
                    <span class="expand-icon">▶</span>
                  </button>
                {/if}
              </div>
              <div class="offer-actions">
                {#if offer.isOwnOffer}
                  <button 
                    class="btn btn-danger btn-sm" 
                    on:click={() => handleDeleteMyOffer(offer)}
                    disabled={loading}
                  >
                    🗑️ Mein Angebot löschen
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
                    on:click={() => handleShowInterest(offer)}
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
  /* Container */
  .group-container {
    min-height: 100vh;
    background: linear-gradient(135deg, var(--bg-color), var(--bg-secondary));
  }

  /* Buttons */
  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .btn:hover:not(:disabled) { opacity: 0.9; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.875rem; }

  .btn-secondary { background: var(--surface-elevated); color: var(--text-color); border: 1px solid var(--border-color); }
  .btn-success { background: #10b981; color: white; }
  .btn-warning { background: #f59e0b; color: white; }
  .btn-danger { background: #ef4444; color: white; }

  /* Marketplace */
  .marketplace-container {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  /* Messages */
  .status-message {
    padding: 1rem;
    border-radius: 0.5rem;
    margin: 1rem;
  }

  .status-message.loading { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
  .status-message.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
  .status-message.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

  /* Forms */
  .card {
    background: var(--surface-color);
    border-radius: 1rem;
    padding: 1.5rem;
    border: 1px solid var(--border-color);
  }

  /* Offers */
  .offers-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .offer-card {
    transition: transform 0.2s;
  }

  .offer-card:hover {
    transform: translateY(-4px);
  }

  .offer-card.own-offer {
    border-left: 4px solid var(--primary-color);
    background: rgba(255, 0, 110, 0.05);
  }

  .offer-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
  }

  .badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .badge-primary { background: var(--primary-color); color: white; }
  .badge-secondary { background: var(--surface-elevated); color: var(--text-muted); }

  .offer-content {
    margin-bottom: 1rem;
    white-space: pre-wrap;
    line-height: 1.6;
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
    gap: 0.75rem;
    align-items: center;
  }

  .offer-id {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-family: monospace;
  }

  .interest-badge {
    padding: 0.25rem 0.5rem;
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 0.375rem;
    font-size: 0.8125rem;
    cursor: pointer;
  }

  .interest-badge:hover { background: rgba(16, 185, 129, 0.2); }

  .offer-actions {
    display: flex;
    gap: 0.5rem;
  }

  /* States */
  .loading-state, .empty-state {
    text-align: center;
    color: var(--text-muted);
    padding: 3rem 1rem;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: var(--surface-color);
    border-radius: 1rem;
    padding: 1.5rem;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .marketplace-container {
      padding: 1rem;
    }

    .offers-list {
      grid-template-columns: 1fr;
    }

    .offer-footer {
      flex-direction: column;
      gap: 0.75rem;
    }
  }
</style>

<!-- Whitelist Modal -->
<WhitelistModal 
  bind:show={showWhitelistModal}
  onClose={() => showWhitelistModal = false}
/>

<!-- Interest List (vereinfacht) -->
{#if showInterestList && selectedOffer}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click={() => showInterestList = false}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal-content" on:click|stopPropagation>
      <InterestListSimple
        {interests}
        {loading}
        onSelect={handleSelectInterest}
      />
      <button class="btn btn-secondary" on:click={() => showInterestList = false}>
        Schließen
      </button>
    </div>
  </div>
{/if}

<!-- Secret Backup Modal -->
<SecretBackupModal
  bind:show={showSecretBackup}
  secret={offerSecret || ''}
  offerTitle={offerInput}
/>

<!-- Secret Login Modal -->
<SecretLoginModal
  bind:show={showSecretLogin}
  on:login={handleSecretLogin}
/>

<!-- Deal Notification Modal -->
<DealNotificationModal
  bind:show={showDealModal}
  data={dealModalData}
  onClose={() => showDealModal = false}
/>