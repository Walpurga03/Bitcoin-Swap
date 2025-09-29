<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { userStore } from '$lib/stores/userStore';
  import { feedback } from '$lib/feedback/feedbackManager';
  import { simpleOffers } from '$lib/nostr/simpleOfferService';
  import type {
    SimpleOffer,
    OfferReaction,
    SimpleOfferStats,
    OfferValidation
  } from '$lib/types/simpleOffers';
  import {
    validateOfferText,
    formatOfferTime,
    truncateText,
    countReactions,
    DEFAULT_OFFER_CONFIG
  } from '$lib/types/simpleOffers';

  // Props (keine Props benötigt für vereinfachte Version)

  // State
  let offers: SimpleOffer[] = [];
  let newOfferText = '';
  let isCreating = false;
  let isLoading = true;
  let showMyOffers = false;
  let searchText = '';
  let stats: SimpleOfferStats = {
    totalOffers: 0,
    todayOffers: 0,
    myOffers: 0,
    totalReactions: 0
  };

  // User
  let currentUser: any = null;
  let unsubscribeUser: (() => void) | null = null;
  let unsubscribeOffers: (() => void) | null = null;

  // Reactive validation
  $: validation = validateOfferText(newOfferText);
  $: filteredOffers = filterOffers(offers, showMyOffers, searchText);
  $: characterCount = newOfferText.length;
  $: maxLength = DEFAULT_OFFER_CONFIG.maxTextLength;

  onMount(() => {
    // User-Store abonnieren
    unsubscribeUser = userStore.subscribe(user => currentUser = user);
    
    // Angebote laden und abonnieren
    loadOffers();
    subscribeToOffers();
  });

  onDestroy(() => {
    // Subscriptions beenden
    if (unsubscribeUser) unsubscribeUser();
    if (unsubscribeOffers) unsubscribeOffers();
  });

  function filterOffers(allOffers: SimpleOffer[], myOnly: boolean, search: string): SimpleOffer[] {
    let filtered = allOffers;

    // Filter nach eigenen Angeboten
    if (myOnly && currentUser) {
      filtered = filtered.filter(offer => offer.authorPubkey === currentUser.pubkey);
    }

    // Textsuche
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(offer => 
        offer.text.toLowerCase().includes(searchLower)
      );
    }

    // Nach Erstellungszeit sortieren (neueste zuerst)
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }

  async function createOffer() {
    if (!validation.isValid || !currentUser) {
      return;
    }

    isCreating = true;
    
    try {
      // Angebot über Service erstellen
      const newOffer = await simpleOffers.create(newOfferText.trim());

      // Optimistic update
      offers = [newOffer, ...offers];
      updateStats();
      
      // In localStorage speichern für andere Browser-Sessions
      saveOffersToLocalStorage(offers);
      
      feedback.success('Angebot erstellt', 'Ihr Angebot wurde erfolgreich veröffentlicht');
      newOfferText = '';
      
    } catch (error) {
      feedback.error(
        'Fehler beim Erstellen',
        `Angebot konnte nicht erstellt werden: ${(error as Error).message}`,
        { component: 'simple-offer-interface', action: 'create_offer' }
      );
    } finally {
      isCreating = false;
    }
  }

  async function reactToOffer(offer: SimpleOffer, type: OfferReaction['type'], message?: string) {
    if (!currentUser) return;

    try {
      // Reaktion über Service senden
      const reaction = await simpleOffers.react(offer, type, message);

      // Optimistic update
      const offerIndex = offers.findIndex(o => o.id === offer.id);
      if (offerIndex !== -1) {
        offers[offerIndex].reactions = [...offers[offerIndex].reactions, reaction];
        offers = [...offers]; // Trigger reactivity
        updateStats();
        
        // In localStorage speichern
        saveOffersToLocalStorage(offers);
      }

      // Benachrichtigung für Angebotssteller senden
      if (offer.authorPubkey !== currentUser.pubkey) {
        try {
          await simpleOffers.notify(
            offer.authorPubkey,
            offer,
            reaction,
            currentUser.name || currentUser.pubkey.slice(0, 8)
          );
        } catch (error) {
          console.warn('Benachrichtigung konnte nicht gesendet werden:', error);
        }
      }

      feedback.success('Reaktion gesendet', 'Ihre Reaktion wurde übermittelt');

    } catch (error) {
      feedback.error(
        'Fehler bei Reaktion',
        `Reaktion konnte nicht gesendet werden: ${(error as Error).message}`,
        { component: 'simple-offer-interface', action: 'react_to_offer' }
      );
    }
  }

  async function deleteOffer(offerId: string) {
    if (!currentUser) return;

    // Bestätigung anfordern
    if (!confirm('Möchten Sie dieses Angebot wirklich löschen?')) {
      return;
    }

    try {
      // Angebot über Service löschen
      await simpleOffers.delete(offerId);

      // Optimistic update - Angebot aus Liste entfernen
      offers = offers.filter(offer => offer.id !== offerId);
      updateStats();
      
      // In localStorage speichern
      saveOffersToLocalStorage(offers);

      feedback.success('Angebot gelöscht', 'Ihr Angebot wurde erfolgreich entfernt');

    } catch (error) {
      feedback.error(
        'Fehler beim Löschen',
        `Angebot konnte nicht gelöscht werden: ${(error as Error).message}`,
        { component: 'simple-offer-interface', action: 'delete_offer' }
      );
    }
  }


  async function reactWithMessage(offer: SimpleOffer, type: OfferReaction['type']) {
    const message = prompt(`${type === 'interested' ? 'Interesse bekunden' : type === 'question' ? 'Frage stellen' : 'Kommentar'} - Nachricht (optional):`);
    
    if (message !== null) { // null = abgebrochen, '' = leere Nachricht OK
      await reactToOffer(offer, type, message.trim() || undefined);
    }
  }

  async function loadOffers() {
    isLoading = true;
    
    try {
      // Angebote über Service laden
      const loadedOffers = await simpleOffers.load();
      offers = loadedOffers;
      updateStats();
      
    } catch (error) {
      // Fallback: Lade gespeicherte Angebote aus localStorage + Demo-Daten
      console.warn('Fehler beim Laden von Nostr, verwende lokale Daten:', error);
      
      const savedOffers = loadOffersFromLocalStorage();
      const demoOffers = [
        {
          id: 'demo1',
          text: 'Verkaufe 1 Million Satoshis für 650€. Zahlung per Überweisung oder bar in Wien möglich. Schnelle Abwicklung garantiert!',
          authorPubkey: 'demo_user_1',
          createdAt: Date.now() - 3600000, // 1 Stunde alt
          reactions: [
            {
              id: 'r1',
              offerId: 'demo1',
              reactorPubkey: 'demo_user_2',
              type: 'interested' as const,
              message: 'Bin interessiert! Können wir uns in Wien treffen?',
              createdAt: Date.now() - 1800000
            }
          ]
        },
        {
          id: 'demo2',
          text: 'Suche jemanden der mir beim Bitcoin-Kauf hilft. Bin Anfänger und brauche Unterstützung.',
          authorPubkey: 'demo_user_3',
          createdAt: Date.now() - 7200000, // 2 Stunden alt
          reactions: [
            {
              id: 'r2',
              offerId: 'demo2',
              reactorPubkey: 'demo_user_1',
              type: 'like' as const,
              createdAt: Date.now() - 3600000
            }
          ]
        }
      ];
      
      // Kombiniere gespeicherte und Demo-Angebote
      offers = [...savedOffers, ...demoOffers];
      updateStats();
      
    } finally {
      isLoading = false;
    }
  }

  function loadOffersFromLocalStorage(): SimpleOffer[] {
    try {
      const saved = localStorage.getItem('bitcoin_offers');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Fehler beim Laden aus localStorage:', error);
    }
    return [];
  }

  function saveOffersToLocalStorage(offers: SimpleOffer[]) {
    try {
      // Nur echte Angebote speichern (keine Demo-Angebote)
      const realOffers = offers.filter(offer => !offer.id.startsWith('demo'));
      localStorage.setItem('bitcoin_offers', JSON.stringify(realOffers));
    } catch (error) {
      console.warn('Fehler beim Speichern in localStorage:', error);
    }
  }

  function subscribeToOffers() {
    try {
      // Neue Angebote und Reaktionen abonnieren
      unsubscribeOffers = simpleOffers.subscribe((newOffers) => {
        offers = newOffers;
        updateStats();
      });
    } catch (error) {
      console.warn('Fehler beim Abonnieren von Angebots-Updates:', error);
    }
  }

  function updateStats() {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    stats = {
      totalOffers: offers.length,
      todayOffers: offers.filter(o => o.createdAt > oneDayAgo).length,
      myOffers: currentUser ? offers.filter(o => o.authorPubkey === currentUser.pubkey).length : 0,
      totalReactions: offers.reduce((sum, offer) => sum + offer.reactions.length, 0)
    };
  }

  function handleKeydown(event: KeyboardEvent) {
    // Ctrl/Cmd + Enter zum Senden
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (validation.isValid && !isCreating) {
        createOffer();
      }
    }
  }
</script>

<div class="simple-offer-interface">
  <!-- Header mit Statistiken -->
  <header class="interface-header">
    <h2>🏷️ Angebote</h2>
    <div class="stats">
      <span class="stat">📊 {stats.totalOffers} Gesamt</span>
      <span class="stat">📅 {stats.todayOffers} Heute</span>
      <span class="stat">👤 {stats.myOffers} Meine</span>
      <span class="stat">💬 {stats.totalReactions} Reaktionen</span>
    </div>
  </header>

  <!-- Angebot erstellen -->
  <section class="create-offer">
    <h3>✍️ Neues Angebot erstellen</h3>
    
    <div class="textarea-container">
      <textarea
        bind:value={newOfferText}
        on:keydown={handleKeydown}
        placeholder="Beschreiben Sie Ihr Bitcoin-Angebot hier...

Beispiele:
• Verkaufe 500.000 Satoshis für 320€
• Suche jemanden für Bitcoin-Beratung
• Tausche Bitcoin gegen Bargeld in München
• Biete Hilfe beim Wallet-Setup an"
        class="offer-textarea"
        class:error={!validation.isValid && newOfferText.length > 0}
        class:warning={validation.warnings.length > 0}
        maxlength={maxLength}
        rows="6"
        disabled={isCreating}
      ></textarea>
      
      <div class="textarea-footer">
        <div class="character-count" class:warning={characterCount > maxLength * 0.8} class:error={characterCount > maxLength}>
          {characterCount} / {maxLength}
        </div>
        
        {#if validation.errors.length > 0}
          <div class="validation-errors">
            {#each validation.errors as error}
              <span class="error-message">❌ {error}</span>
            {/each}
          </div>
        {/if}
        
        {#if validation.warnings.length > 0}
          <div class="validation-warnings">
            {#each validation.warnings as warning}
              <span class="warning-message">⚠️ {warning}</span>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <div class="create-actions">
      <button 
        class="create-btn"
        class:loading={isCreating}
        disabled={!validation.isValid || isCreating || !newOfferText.trim()}
        on:click={createOffer}
      >
        {#if isCreating}
          <span class="spinner"></span>
          Erstelle...
        {:else}
          📤 Angebot veröffentlichen
        {/if}
      </button>
      
      <div class="create-hint">
        💡 Tipp: Strg/Cmd + Enter zum schnellen Senden
      </div>
    </div>
  </section>

  <!-- Filter und Suche -->
  <section class="offer-controls">
    <div class="search-container">
      <input
        type="text"
        bind:value={searchText}
        placeholder="🔍 Angebote durchsuchen..."
        class="search-input"
      />
    </div>
    
    <div class="filter-controls">
      <label class="filter-checkbox">
        <input type="checkbox" bind:checked={showMyOffers} />
        <span>👤 Nur meine Angebote</span>
      </label>
      
      <button class="refresh-btn" on:click={loadOffers} disabled={isLoading}>
        {#if isLoading}
          <span class="spinner small"></span>
        {:else}
          🔄
        {/if}
        Aktualisieren
      </button>
    </div>
  </section>

  <!-- Angebots-Liste -->
  <section class="offers-list">
    {#if isLoading}
      <div class="loading-state">
        <span class="spinner"></span>
        <p>Lade Angebote...</p>
      </div>
    {:else if filteredOffers.length === 0}
      <div class="empty-state">
        {#if searchText}
          <p>🔍 Keine Angebote gefunden für "{searchText}"</p>
        {:else if showMyOffers}
          <p>📝 Sie haben noch keine Angebote erstellt</p>
        {:else}
          <p>📋 Noch keine Angebote vorhanden</p>
        {/if}
      </div>
    {:else}
      {#each filteredOffers as offer (offer.id)}
        <article class="offer-card">
          <div class="offer-header">
            <div class="offer-meta">
              <span class="offer-author">
                {#if offer.authorPubkey === currentUser?.pubkey}
                  👤 Sie
                {:else}
                  👥 {offer.authorPubkey.slice(0, 8)}...
                {/if}
              </span>
              <span class="offer-time">⏰ {formatOfferTime(offer.createdAt)}</span>
            </div>
            
            {#if offer.authorPubkey === currentUser?.pubkey}
              <div class="offer-actions">
                <button
                  class="delete-btn"
                  on:click={() => deleteOffer(offer.id)}
                  title="Angebot löschen"
                >
                  🗑️ Löschen
                </button>
              </div>
            {/if}
          </div>
          
          <div class="offer-content">
            <p class="offer-text">{offer.text}</p>
          </div>
          
          <div class="offer-footer">
            <div class="reaction-summary">
              {#each Object.entries(countReactions(offer.reactions)) as [type, count]}
                <span class="reaction-count">
                  {#if type === 'interested'}👀{:else if type === 'like'}👍{:else}❓{/if}
                  {count}
                </span>
              {/each}
            </div>
            
            {#if offer.authorPubkey !== currentUser?.pubkey}
              <div class="reaction-buttons">
                <button
                  class="reaction-btn interested"
                  on:click={() => reactWithMessage(offer, 'interested')}
                  title="Interesse zeigen (mit optionaler Nachricht)"
                >
                  👀 Interessiert
                </button>
                <button
                  class="reaction-btn like"
                  on:click={() => reactToOffer(offer, 'like')}
                  title="Gefällt mir"
                >
                  👍 Gefällt mir
                </button>
                <button
                  class="reaction-btn question"
                  on:click={() => reactWithMessage(offer, 'question')}
                  title="Frage stellen (mit Nachricht)"
                >
                  ❓ Frage
                </button>
              </div>
            {:else}
              <div class="own-offer-info">
                <span class="own-offer-label">📝 Ihr Angebot</span>
              </div>
            {/if}
          </div>
          
          <!-- Reaktionen anzeigen -->
          {#if offer.reactions.length > 0}
            <div class="reactions-list">
              {#each offer.reactions.slice(0, 3) as reaction}
                <div class="reaction-item">
                  <span class="reaction-type">
                    {#if reaction.type === 'interested'}👀{:else if reaction.type === 'like'}👍{:else}❓{/if}
                  </span>
                  <span class="reaction-author">
                    {reaction.reactorPubkey === currentUser?.pubkey ? 'Sie' : reaction.reactorPubkey.slice(0, 8) + '...'}
                  </span>
                  {#if reaction.message}
                    <span class="reaction-message">"{truncateText(reaction.message, 50)}"</span>
                  {/if}
                  <span class="reaction-time">{formatOfferTime(reaction.createdAt)}</span>
                </div>
              {/each}
              
              {#if offer.reactions.length > 3}
                <div class="more-reactions">
                  +{offer.reactions.length - 3} weitere Reaktionen
                </div>
              {/if}
            </div>
          {/if}
        </article>
      {/each}
    {/if}
  </section>
</div>

<style>
  .simple-offer-interface {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* Header */
  .interface-header {
    text-align: center;
    padding: 1rem;
    background: var(--bg-secondary, #ffffff);
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .interface-header h2 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #1e293b);
    font-size: 1.5rem;
  }

  .stats {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .stat {
    font-size: 0.9rem;
    color: var(--text-secondary, #64748b);
    background: var(--bg-tertiary, #f1f5f9);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  /* Angebot erstellen */
  .create-offer {
    background: var(--bg-secondary, #ffffff);
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .create-offer h3 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #1e293b);
    font-size: 1.2rem;
  }

  .textarea-container {
    position: relative;
    margin-bottom: 1rem;
  }

  .offer-textarea {
    width: 100%;
    min-height: 120px;
    padding: 1rem;
    border: 2px solid var(--border-color, #e2e8f0);
    border-radius: 8px;
    font-family: inherit;
    font-size: 1rem;
    line-height: 1.5;
    resize: vertical;
    transition: border-color 0.2s;
  }

  .offer-textarea:focus {
    outline: none;
    border-color: var(--accent-color, #667eea);
  }

  .offer-textarea.error {
    border-color: var(--error-color, #ef4444);
  }

  .offer-textarea.warning {
    border-color: var(--warning-color, #f59e0b);
  }

  .textarea-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-top: 0.5rem;
    gap: 1rem;
  }

  .character-count {
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
  }

  .character-count.warning {
    color: var(--warning-color, #f59e0b);
  }

  .character-count.error {
    color: var(--error-color, #ef4444);
  }

  .validation-errors,
  .validation-warnings {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .error-message {
    font-size: 0.8rem;
    color: var(--error-color, #ef4444);
  }

  .warning-message {
    font-size: 0.8rem;
    color: var(--warning-color, #f59e0b);
  }

  .create-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .create-btn {
    padding: 0.75rem 1.5rem;
    background: var(--accent-color, #667eea);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .create-btn:hover:not(:disabled) {
    background: var(--accent-hover, #5a67d8);
    transform: translateY(-1px);
  }

  .create-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .create-hint {
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
  }

  /* Filter und Suche */
  .offer-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .search-container {
    flex: 1;
    min-width: 200px;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 6px;
    font-size: 0.9rem;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--accent-color, #667eea);
  }

  .filter-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .filter-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .refresh-btn {
    padding: 0.5rem 1rem;
    background: var(--bg-tertiary, #f1f5f9);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: background-color 0.2s;
  }

  .refresh-btn:hover:not(:disabled) {
    background: var(--bg-hover, #e2e8f0);
  }

  /* Angebots-Liste */
  .offers-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .loading-state,
  .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary, #64748b);
  }

  .offer-card {
    background: var(--bg-secondary, #ffffff);
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--border-color, #e2e8f0);
    transition: box-shadow 0.2s;
  }

  .offer-card:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .offer-header {
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .offer-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
    flex: 1;
  }

  .offer-actions {
    display: flex;
    gap: 0.5rem;
  }

  .delete-btn {
    padding: 0.25rem 0.5rem;
    background: var(--error-color, #ef4444);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .delete-btn:hover {
    background: #dc2626;
    transform: translateY(-1px);
  }

  .own-offer-info {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .own-offer-label {
    font-size: 0.8rem;
    color: var(--accent-color, #667eea);
    background: var(--bg-tertiary, #f1f5f9);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    border: 1px solid var(--accent-color, #667eea);
  }

  .offer-content {
    margin-bottom: 1rem;
  }

  .offer-text {
    margin: 0;
    line-height: 1.6;
    color: var(--text-primary, #1e293b);
    white-space: pre-wrap;
  }

  .offer-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .reaction-summary {
    display: flex;
    gap: 0.5rem;
  }

  .reaction-count {
    font-size: 0.8rem;
    background: var(--bg-tertiary, #f1f5f9);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .reaction-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .reaction-btn {
    padding: 0.375rem 0.75rem;
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 4px;
    background: var(--bg-secondary, #ffffff);
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s;
  }

  .reaction-btn:hover {
    background: var(--bg-tertiary, #f1f5f9);
    transform: translateY(-1px);
  }

  .reaction-btn.interested:hover {
    background: #fef3c7;
    border-color: #f59e0b;
  }

  .reaction-btn.like:hover {
    background: #dcfce7;
    border-color: #10b981;
  }

  .reaction-btn.question:hover {
    background: #dbeafe;
    border-color: #3b82f6;
  }

  .reactions-list {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color, #e2e8f0);
  }

  .reaction-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
  }

  .reaction-message {
    font-style: italic;
  }

  .more-reactions {
    font-size: 0.8rem;
    color: var(--text-secondary, #64748b);
    text-align: center;
    margin-top: 0.5rem;
  }

  /* Spinner */
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .spinner.small {
    width: 12px;
    height: 12px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Mobile Optimierung */
  @media (max-width: 768px) {
    .simple-offer-interface {
      padding: 0.5rem;
    }

    .stats {
      gap: 0.5rem;
    }

    .stat {
      font-size: 0.8rem;
    }

    .create-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .offer-controls {
      flex-direction: column;
      align-items: stretch;
    }

    .filter-controls {
      justify-content: space-between;
    }

    .reaction-buttons {
      justify-content: center;
    }

    .offer-footer {
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }
  }

  /* Dark Mode */
  @media (prefers-color-scheme: dark) {
    .offer-textarea {
      background: var(--bg-secondary, #1e293b);
      color: var(--text-primary, #f8fafc);
    }
  }
</style>