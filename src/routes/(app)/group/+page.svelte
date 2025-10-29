<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  // @ts-ignore
  import { goto } from '$app/navigation';
  import { userStore, isAuthenticated } from '$lib/stores/userStore';
  import { groupStore } from '$lib/stores/groupStore';
  

  import { formatTimestamp, truncatePubkey, getTimeRemaining, isExpiringSoon } from '$lib/utils';
  import {
    generateOfferSecret,
    deriveKeypairFromSecret,
    validateOfferSecret
  } from '$lib/nostr/offerSecret';
  import {
    getRemainingTime,
    formatRemainingTime,
    isExpiringSoon as isOfferExpiringSoon
  } from '$lib/nostr/offerExpiration';
  import {
    createOffer as createOfferMarketplace,
    deleteOffer as deleteOfferMarketplace,
    loadOffers,
    type Offer
  } from '$lib/nostr/marketplace';
  import {
    type Interest
  } from '$lib/nostr/nip17';
  import WhitelistModal from '$lib/components/WhitelistModal.svelte';
  import InterestModal from '$lib/components/InterestModal.svelte';
  import InterestList from '$lib/components/InterestList.svelte';
  import SecretBackupModal from '$lib/components/SecretBackupModal.svelte';
  import SecretLoginModal from '$lib/components/SecretLoginModal.svelte';
  
  let isAdmin = false;

  // Marketplace State
  let offers: Offer[] = [];
  let offerInput = '';
  let showOfferForm = false;
  let loading = false;
  let error = '';
  // Neues Secret-basiertes System (kein localStorage mehr!)
  let offerSecret: string | null = null;
  let offerKeypair: { privateKey: string; publicKey: string } | null = null;
  let showSecretBackup = false;
  let showSecretLogin = false;
  
  // Modals
  let showWhitelistModal = false;
  let showInterestModal = false;
  let showInterestList = false;
  let selectedOffer: Offer | null = null;
  
  // Interests State
  let interests: Interest[] = [];
  let interestCounts: Record<string, number> = {};
  let myInterestOfferIds: Set<string> = new Set();
  
  // Vergebene Angebote (nach Deal-Erstellung ausblenden)
  let assignedOfferIds: Set<string> = new Set();
  
    let autoRefreshInterval: NodeJS.Timeout;
  let handleShowInterestList: () => void;

  /**
   * Lade MEINE gesendeten Interesse-Signale vom Relay
   * Filtert nach Kind 30078 Events die ICH gesendet habe
   */
  async function loadMyInterests(): Promise<void> {
    if (!$userStore.pubkey || !$groupStore.relay) return;

    try {
      console.log('📥 [MY-INTERESTS] Lade meine gesendeten Interesse-Signale...');
      
      const { loadMyInterestSignals } = await import('$lib/nostr/interestSignal');
      const mySignals = await loadMyInterestSignals($userStore.pubkey, $groupStore.relay);
      
      console.log('✅ [MY-INTERESTS] Gefunden:', mySignals.length, 'Interesse-Signale');
      
      // Extrahiere Offer-IDs
      myInterestOfferIds.clear();
      for (const signal of mySignals) {
        if (signal.offerId) {
          myInterestOfferIds.add(signal.offerId);
          console.log('  ✅ Signal für Offer:', signal.offerId.substring(0, 16) + '...');
        }
      }
      
      myInterestOfferIds = myInterestOfferIds; // Trigger Svelte reactivity
      
      console.log('✅ [MY-INTERESTS] Insgesamt:', myInterestOfferIds.size, 'Offer-IDs');
    } catch (e) {
      console.warn('⚠️ [MY-INTERESTS] Fehler beim Laden:', e);
    }
  }

  // Prüfe ob User ein aktives Angebot hat
  $: hasActiveOffer = offerKeypair && offers.some(
    offer => offer.tempPubkey === offerKeypair?.publicKey
  );

  // GLOBALE Sperre: Wenn IRGENDEIN Angebot existiert, kann NIEMAND ein neues erstellen
  $: anyOfferExists = offers.length > 0;

  // Loading-Lock: Verhindert parallele loadAllOffers() Aufrufe
  let isLoadingOffers = false;

  async function loadAllOffers() {
    if (!$groupStore.relay || !$groupStore.channelId) {
      console.warn('⚠️ [LOAD-OFFERS] Abbruch - Relay oder ChannelId fehlt:', {
        relay: $groupStore.relay || 'fehlt',
        channelId: $groupStore.channelId || 'fehlt'
      });
      return;
    }

    // Wenn bereits ein Load läuft, überspringe diesen Call
    if (isLoadingOffers) {
      console.log('⏸️ [LOAD-OFFERS] Übersprungen - läuft bereits');
      return;
    }
    
    try {
      isLoadingOffers = true;
      console.log('🔍 [LOAD-OFFERS] Relay:', $groupStore.relay);
      console.log('🔍 [LOAD-OFFERS] Channel ID:', $groupStore.channelId);
      console.log('🔍 [LOAD-OFFERS] Secret Hash:', $groupStore.secret ? 'vorhanden' : 'fehlt');
      console.log('🔍 [LOAD-OFFERS] Eigener temp_pubkey:', offerKeypair?.publicKey?.substring(0, 16) + '...' || 'keiner');
      
      const ownTempPubkey = offerKeypair?.publicKey;
      offers = await loadOffers($groupStore.relay, $groupStore.channelId, ownTempPubkey, $groupStore.secretHash);
      
      console.log('📊 [LOAD-OFFERS] Ergebnis:', {
        anzahl: offers.length,
        offers: offers.map(o => ({
          id: o.id.substring(0, 16) + '...',
          tempPubkey: o.tempPubkey.substring(0, 16) + '...',
          content: o.content.substring(0, 30) + '...',
          isOwn: o.isOwnOffer
        }))
      });
      
      // Lade Interesse-Signal-Counts nur für EIGENE Angebote (Performance-Optimierung)
      for (const offer of offers) {
        if (offer.isOwnOffer) {
          const { countInterestSignals } = await import('$lib/nostr/interestSignal');
          interestCounts[offer.id] = await countInterestSignals(offer.id, $groupStore.relay);
        }
      }
      
      console.log(`✅ ${offers.length} Angebote geladen`);
    } catch (e) {
      console.error('❌ Fehler beim Laden der Angebote:', e);
    } finally {
      isLoadingOffers = false;
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
    // Kein localStorage mehr - Secret-basiertes System
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
      
      // Secret-basiertes System - kein automatisches Laden mehr
      console.log('💡 [PAGE] Verwende Secret-basiertes System (kein localStorage)');
      
      // Lade Marketplace-Angebote ZUERST
      await loadAllOffers();

      // ✅ Dann lade meine gesendeten Interests vom Relay
      await loadMyInterests();

      // Auto-Refresh alle 10 Sekunden
      autoRefreshInterval = setInterval(async () => {
        try {
          await loadAllOffers();
        } catch (e) {
          console.error('Auto-Refresh Fehler:', e);
        }
      }, 10000);
      
      // Event-Listener für "Interest-Liste anzeigen" von Notification-System
      handleShowInterestList = () => {
        console.log('📨 [EVENT] Interest-Liste öffnen durch Notification-System');
        // Finde das erste eigene Angebot und öffne dessen Interest-Liste
        const ownOffer = offers.find(offer => offer.isOwnOffer);
        if (ownOffer) {
          openInterestList(ownOffer);
        }
      };
      
      window.addEventListener('show-interest-list', handleShowInterestList);

    } catch (e: any) {
      console.error('❌ [PAGE] Fehler beim Laden:', e);
      error = e.message || 'Fehler beim Laden der Daten';
    }
  });

  onDestroy(() => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }
    
    // Cleanup Event-Listener
    if (handleShowInterestList) {
      window.removeEventListener('show-interest-list', handleShowInterestList);
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

      // Generiere neues Secret und leite Keypair ab
      if (!offerKeypair) {
        offerSecret = generateOfferSecret();
        offerKeypair = deriveKeypairFromSecret(offerSecret);
        console.log('✅ Neues Angebots-Secret generiert (deterministisches Keypair)');
      }

      // Erstelle Angebot
      await createOfferMarketplace(
        offerInput,
        offerKeypair,
        $groupStore.relay,
        $groupStore.channelId,
        $userStore.pubkey, // Echter Public Key für NIP-17 DMs
        $groupStore.secretHash // Gruppen-spezifischer Hash
      );
      
      error = '✅ Angebot veröffentlicht! Lade Angebote neu...';
      
      // Warte 2 Sekunden damit Relay das Event verarbeiten kann
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadAllOffers();
      
      offerInput = '';
      showOfferForm = false;
      error = '✅ Angebot erfolgreich erstellt!';
      
      // Zeige Secret-Backup Modal
      showSecretBackup = true;
      
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
    if (!offerKeypair?.privateKey || !$groupStore.relay) return;
    if (!confirm('Möchtest du dieses Angebot wirklich löschen?')) return;

    try {
      loading = true;
      error = '⏳ Angebot wird gelöscht...';

      await deleteOfferMarketplace(
        offerId,
        offerKeypair.privateKey,
        offerKeypair.publicKey,
        $groupStore.relay
      );
      
    // Lösche Secret und Keypair
    offerSecret = null;
    offerKeypair = null;
      
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

  async function handleSendInterest(event: CustomEvent<{ message: string; recipientPubkey: string }>) {
    if (!selectedOffer || !$userStore.privateKey || !$userStore.pubkey || !$groupStore.relay) return;

    try {
      loading = true;
      error = '⏳ Private Anfrage wird gesendet...';
      showInterestModal = false;

      console.log('� [SEND-PRIVATE-REQUEST] Sende NIP-17 DM:', {
        to: event.detail.recipientPubkey.substring(0, 16) + '...',
        offer: selectedOffer.content.substring(0, 30) + '...'
      });

      // Sende verschlüsseltes Interesse-Signal (NIP-04)
      const { sendInterestSignal } = await import('$lib/nostr/interestSignal');
      
      await sendInterestSignal(
        selectedOffer.id,
        event.detail.recipientPubkey,
        event.detail.message,
        $userStore.name || 'Anonym',
        $userStore.privateKey,
        $groupStore.relay
      );

      console.log('✅ [SEND-INTEREST-SIGNAL] Interesse-Signal gesendet');
      
      // Merke, dass ich Interesse gezeigt habe
      myInterestOfferIds.add(selectedOffer.id);
      myInterestOfferIds = myInterestOfferIds;

      error = '';
      alert(`✅ Interesse-Signal gesendet!\n\n📤 Dein Interesse wurde verschlüsselt an den Angebotsgeber gesendet.\n🔒 Nur der Angebotsgeber kann es sehen!\n\n⏳ Warte auf Auswahl durch den Angebotsgeber.`);
      
    } catch (e: any) {
      console.error('❌ Fehler beim Senden des Interesse-Signals:', e);
      error = '❌ ' + (e.message || 'Fehler beim Senden des Interesse-Signals');
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
    if (!$groupStore.relay || !offerKeypair?.privateKey) return;
    
    try {
      loading = true;
      selectedOffer = offer;
      console.log('📋 [ANGEBOTSGEBER] Lade Interesse-Signale für mein Angebot...');
      
      // Lade verschlüsselte Interesse-Signale (nur Anbieter kann entschlüsseln)
      const { loadInterestSignals } = await import('$lib/nostr/interestSignal');
      const signals = await loadInterestSignals(
        offer.id,
        offerKeypair.privateKey,
        $groupStore.relay
      );
      
      // Konvertiere zu Interest-Format für bestehende UI
      interests = signals.map(signal => ({
        userPubkey: signal.interestedPubkey,
        userName: signal.userName || 'Anonym',
        message: signal.message || '',
        timestamp: Math.floor(signal.timestamp / 1000) // Convert ms to seconds
      }));
      
      console.log(`📊 [ANGEBOTSGEBER] ${interests.length} Interesse-Signale für dieses Angebot`);
      
      showInterestList = true;
      loading = false;
    } catch (e: any) {
      console.error('❌ Fehler beim Laden der Interesse-Signale:', e);
      error = '❌ ' + (e.message || 'Fehler beim Laden der Interesse-Signale');
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



  // 🗑️ Lösche mein eigenes Angebot
  async function handleDeleteMyOffer(offer: Offer) {
    if (!confirm(`⚠️ Angebot "${offer.content.substring(0, 50)}..." wirklich löschen?\n\nDies kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    try {
      loading = true;
      error = '';

      console.log('🗑️ [DELETE-OFFER] Lösche Angebot:', offer.id.substring(0, 8) + '...');

      // WICHTIG: Verwende Angebots-Keypair, da das Angebot damit erstellt wurde!
      if (!offerKeypair?.privateKey) {
        throw new Error('Angebots-Keypair fehlt - kann Angebot nicht löschen');
      }

      await deleteOfferMarketplace(
        offer.id,
        offerKeypair.privateKey,
        offerKeypair.publicKey,
        $groupStore.relay
      );

      console.log('✅ [DELETE-OFFER] Angebot gelöscht');
      
      // Reset Zustand
      offerSecret = null;
      offerKeypair = null;
      
      // Lade Angebote neu
      await loadAllOffers();
      
      alert('✅ Angebot erfolgreich gelöscht!');
      
    } catch (e: any) {
      console.error('❌ Fehler beim Löschen des Angebots:', e);
      error = '❌ Fehler beim Löschen: ' + (e.message || 'Unbekannter Fehler');
    } finally {
      loading = false;
    }
  }

  // 🤝 Wählt einen Partner aus und sendet Absagen an alle anderen
  async function handleSelectPartner(event: CustomEvent<any>) {
    const selectedInterest = event.detail;
    
    if (!confirm(`🤝 Partner "${selectedInterest.userName || 'Anonym'}" auswählen?\n\n✅ Dieser Partner wird ausgewählt\n❌ Alle anderen erhalten eine Absage\n💬 Dann wird ein Deal-Room erstellt`)) {
      return;
    }

    try {
      loading = true;
      error = '';

      console.log('🤝 [SELECT-PARTNER] Wähle Partner aus:', selectedInterest.userName);

      if (!selectedOffer || !offerKeypair) {
        throw new Error('Angebot oder Keypair fehlt');
      }

      // 1. Partner auswählen und Absagen senden
      const { selectPartner } = await import('$lib/nostr/offerSelection');
      const { loadInterestSignals } = await import('$lib/nostr/interestSignal');
      
      // Lade alle Interesse-Signale
      const allSignals = await loadInterestSignals(
        selectedOffer.id,
        offerKeypair.privateKey,
        $groupStore.relay
      );

      console.log(`📋 [SELECT-PARTNER] ${allSignals.length} Interesse-Signale gefunden`);

      // Wähle Partner aus (sendet automatisch Absagen)
      const selectionResult = await selectPartner(
        offerKeypair,
        selectedInterest.userPubkey,
        allSignals,
        selectedOffer.id,
        selectedOffer.content,
        $groupStore.relay
      );

      console.log(`✅ [SELECT-PARTNER] Auswahl abgeschlossen:`, {
        selected: selectionResult.selectedPubkey.substring(0, 16) + '...',
        rejected: selectionResult.rejectedPubkeys.length,
        errors: selectionResult.errors.length
      });

      // 2. Deal-Room erstellen
      const { createDealRoom } = await import('$lib/nostr/nip17');
      
      const dealId = await createDealRoom(
        $userStore.privateKey,
        selectedInterest.userPubkey,
        selectedOffer.content || 'Bitcoin Swap Deal',
        $groupStore.relay,
        $groupStore.channelId
      );

      console.log('✅ [SELECT-PARTNER] Deal-Room erstellt:', dealId.substring(0, 16) + '...');
      
      // 3. Lösche Angebot permanent aus dem Nostr-Relay
      try {
        console.log('🗑️ [DELETE-OFFER] Lösche Angebot aus Nostr-Relay:', selectedOffer.id.substring(0, 16) + '...');
        
        await deleteOfferMarketplace(
          selectedOffer.id,
          offerKeypair.privateKey,
          offerKeypair.publicKey,
          $groupStore.relay
        );
        
        console.log('✅ [DELETE-OFFER] Angebot erfolgreich gelöscht');
        assignedOfferIds.add(selectedOffer.id);
        
      } catch (deleteError) {
        console.error('❌ [DELETE-OFFER] Fehler beim Löschen:', deleteError);
        assignedOfferIds.add(selectedOffer.id);
      }
      
      // Schließe Interest-Liste
      showInterestList = false;
      
      // Lade Offers neu
      setTimeout(() => {
        loadAllOffers();
      }, 1000);
      
      const rejectionInfo = selectionResult.rejectedPubkeys.length > 0 
        ? `\n📤 ${selectionResult.rejectedPubkeys.length} Absagen gesendet`
        : '';
      
      alert(`✅ Partner erfolgreich ausgewählt!\n\n🤝 Partner: ${selectedInterest.userName || 'Anonym'}${rejectionInfo}\n💬 Deal-ID: ${dealId.substring(0, 16)}...\n🗑️ Dein Angebot wurde gelöscht\n\n🚪 Du wirst zum Deal-Room weitergeleitet...`);
      
      // Navigation zum Deal-Room
      setTimeout(() => {
        goto(`/deal/${dealId}`);
      }, 2000);
      
    } catch (e: any) {
      console.error('❌ Fehler bei Partner-Auswahl:', e);
      error = '❌ Fehler bei Partner-Auswahl: ' + (e.message || 'Unbekannter Fehler');
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

      console.log('🔐 [SECRET-LOGIN] Validiere Secret...');

      if (!validateOfferSecret(secret)) {
        throw new Error('Ungültiges Secret-Format');
      }

      // Leite Keypair aus Secret ab
      offerSecret = secret;
      offerKeypair = deriveKeypairFromSecret(secret);

      console.log('✅ [SECRET-LOGIN] Keypair erfolgreich abgeleitet');
      console.log('  📋 Public Key:', offerKeypair.publicKey.substring(0, 16) + '...');

      // Lade Angebote neu
      await loadAllOffers();

      alert('✅ Erfolgreich mit Secret angemeldet!\n\nDu kannst jetzt dein Angebot verwalten.');
      
    } catch (e: any) {
      console.error('❌ [SECRET-LOGIN] Fehler:', e);
      error = '❌ Fehler beim Login: ' + (e.message || 'Unbekannter Fehler');
      offerSecret = null;
      offerKeypair = null;
    } finally {
      loading = false;
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
      {#if !offerKeypair}
        <button class="btn btn-secret" on:click={() => showSecretLogin = true}>
          🔑 Mit Secret anmelden
        </button>
      {/if}
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
      {:else if offers.length === 0 || offers.filter(offer => !assignedOfferIds.has(offer.id)).length === 0}
        <div class="empty-state">
          <div class="empty-icon">🛒</div>
          {#if offers.length === 0}
            <p><strong>Noch keine Angebote vorhanden</strong></p>
            <p class="text-muted">Sei der Erste und erstelle ein Bitcoin-Tauschangebot!</p>
          {:else}
            <p><strong>Alle Angebote sind bereits vergeben</strong></p>
            <p class="text-muted">Erstelle ein neues Angebot oder warte auf neue Angebote von anderen.</p>
          {/if}
        </div>
      {:else}
        <div class="offers-count">
          {#if offers.filter(offer => !assignedOfferIds.has(offer.id)).length !== offers.length}
            {offers.filter(offer => !assignedOfferIds.has(offer.id)).length} aktive Angebote ({assignedOfferIds.size} vergeben)
          {:else}
            {offers.length} {offers.length === 1 ? 'Angebot' : 'Angebote'}
          {/if}
        </div>
        {#each offers.filter(offer => !assignedOfferIds.has(offer.id)) as offer (offer.id)}
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

  .btn-secret {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 0.875rem;
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
  }

  .btn-secret:hover {
    background: linear-gradient(135deg, #d97706, #b45309);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5);
  }



  .btn-danger {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 0.875rem;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  }

  .btn-danger:hover {
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5);
  }

  .btn-danger:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
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
  offerPubkey={selectedOffer?.authorPubkey || selectedOffer?.tempPubkey || ''}
  on:send={handleSendInterest}
/>

<!-- Interest List Modal -->
<InterestList
  bind:show={showInterestList}
  {interests}
  {loading}
  on:selectPartner={handleSelectPartner}
/>

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