<!-- Angebots-Tab für Phase 2 Bitcoin-Handel -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    bitcoinOffers,
    filteredOffers,
    offerStats,
    offerFilter,
    offerActions
  } from '$lib/stores/phase2OfferStore';
  import { userStore } from '$lib/stores/userStore';
  import { groupConfig } from '$lib/stores/groupStore';
  import type { Phase2OfferFilter, UserProfile, GroupConfig } from '$lib/nostr/types';
  import type { CreateOfferForm as CreateOfferFormType } from '$lib/types/offers';
  import BitcoinOfferCard from './BitcoinOfferCard.svelte';
  import CreateOfferForm from './CreateOfferForm.svelte';
  import OfferFilter from './OfferFilter.svelte';
  import { formatSatoshis, formatPrice } from '$lib/utils/offers';
  import { OfferService } from '$lib/nostr/offerService';
  import { NostrClient } from '$lib/nostr/client';

  // UI-State
  let activeView: 'list' | 'create' | 'filter' = 'list';
  let showCreateForm = false;
  let showFilterPanel = false;

  // Filter-State
  let currentFilter: Phase2OfferFilter = {};

  // Service-State
  let offerService: OfferService | null = null;
  let isServiceConnected = false;
  let connectionError = '';

  // Event Handler Types
  interface FilterEvent {
    detail: Phase2OfferFilter;
  }

  // Reaktive Statements
  $: totalOffers = $offerStats.totalOffers;
  $: activeOffers = $offerStats.activeOffers;
  $: buyOffers = $offerStats.buyOffers;
  $: sellOffers = $offerStats.sellOffers;

  // Event Handlers
  function handleCreateOffer() {
    showCreateForm = true;
    activeView = 'create';
  }

  function handleFilterToggle() {
    showFilterPanel = !showFilterPanel;
    if (showFilterPanel) {
      activeView = 'filter';
    } else {
      activeView = 'list';
    }
  }

  function handleBackToList() {
    showCreateForm = false;
    showFilterPanel = false;
    activeView = 'list';
  }

  function handleOfferCreated() {
    showCreateForm = false;
    activeView = 'list';
    // Angebote neu laden (wird automatisch durch Store-Updates passieren)
  }

  function handleFilterApplied(filter: Phase2OfferFilter) {
    currentFilter = filter;
    offerActions.setFilter(filter);
    showFilterPanel = false;
    activeView = 'list';
  }

  function handleFilterReset() {
    currentFilter = {};
    offerActions.clearFilter();
  }

  onMount(async () => {
    // Initiale Daten laden falls nötig
    console.log('OfferTab mounted, offers:', $bitcoinOffers.length);
    await initializeOfferService();
  });

  onDestroy(() => {
    // Service beenden
    if (offerService) {
      offerService.disconnect();
    }
  });

  async function initializeOfferService() {
    const user = $userStore;
    const config = $groupConfig;

    if (!user || !config) {
      connectionError = 'Benutzer oder Gruppe nicht konfiguriert';
      return;
    }

    try {
      // NostrClient initialisieren
      const client = new NostrClient();
      client.setUserProfile(user);
      await client.configureGroup(config);
      await client.connectToRelays([config.relay]);

      // OfferService initialisieren
      offerService = new OfferService(
        client.pool,
        [config.relay],
        config.channelId
      );
      
      offerService.initialize(user);
      offerService.subscribeToOffers();
      
      // Historische Angebote laden
      await offerService.loadHistoricalOffers();

      isServiceConnected = true;
      connectionError = '';
      
      console.log('OfferService erfolgreich initialisiert');
    } catch (error) {
      console.error('Fehler beim Initialisieren des OfferService:', error);
      connectionError = error instanceof Error ? error.message : 'Verbindungsfehler';
      isServiceConnected = false;
    }
  }

  async function handleShowInterest(event: CustomEvent<{ offerId: string }>) {
    const { offerId } = event.detail;
    
    if (!offerService || !isServiceConnected) {
      console.error('OfferService nicht verfügbar');
      return;
    }

    try {
      // Einfaches Interesse zeigen (später erweitern mit Modal für Kontaktdaten)
      await offerService.showInterest(
        offerId,
        'Ich bin an Ihrem Angebot interessiert.',
        'nostr',
        'Kontakt über Nostr'
      );
      
      console.log('Interesse erfolgreich gezeigt für Angebot:', offerId);
    } catch (error) {
      console.error('Fehler beim Zeigen von Interesse:', error);
    }
  }

  async function handleViewDetails(event: CustomEvent<{ offerId: string }>) {
    const { offerId } = event.detail;
    console.log('Details anzeigen für Angebot:', offerId);
    // TODO: Details-Modal implementieren
  }
</script>

<div class="offer-tab">
  <!-- Header mit Navigation -->
  <div class="offer-header">
    <div class="header-content">
      <h2>Bitcoin-Angebote</h2>
      
      <!-- Statistiken -->
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value">{totalOffers}</span>
          <span class="stat-label">Gesamt</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{activeOffers}</span>
          <span class="stat-label">Aktiv</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{buyOffers}</span>
          <span class="stat-label">Kaufen</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{sellOffers}</span>
          <span class="stat-label">Verkaufen</span>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="header-actions">
      {#if activeView === 'list'}
        <button 
          class="btn btn-secondary"
          on:click={handleFilterToggle}
          class:active={showFilterPanel}
        >
          🔍 Filter
        </button>
        <button 
          class="btn btn-primary"
          on:click={handleCreateOffer}
        >
          ➕ Angebot erstellen
        </button>
      {:else}
        <button 
          class="btn btn-secondary"
          on:click={handleBackToList}
        >
          ← Zurück
        </button>
      {/if}
    </div>
  </div>

  <!-- Content Area -->
  <div class="offer-content">
    {#if activeView === 'create'}
      <!-- Angebot erstellen -->
      <div class="create-section">
        <h3>Neues Angebot erstellen</h3>
        <CreateOfferForm 
          on:created={handleOfferCreated}
          on:cancel={handleBackToList}
        />
      </div>
    
    {:else if activeView === 'filter'}
      <!-- Filter Panel -->
      <div class="filter-section">
        <h3>Angebote filtern</h3>
        <OfferFilter
          {currentFilter}
          on:applied={(e: FilterEvent) => handleFilterApplied(e.detail)}
          on:reset={handleFilterReset}
          on:cancel={handleBackToList}
        />
      </div>
    
    {:else}
      <!-- Angebots-Liste -->
      <div class="offers-section">
        <!-- Aktive Filter anzeigen -->
        {#if Object.keys(currentFilter).length > 0}
          <div class="active-filters">
            <span class="filter-label">Aktive Filter:</span>
            {#if currentFilter.type}
              <span class="filter-tag">
                {currentFilter.type === 'buy' ? '🟢 Kaufen' : '🔴 Verkaufen'}
                <button on:click={() => {
                  delete currentFilter.type;
                  handleFilterApplied(currentFilter);
                }}>×</button>
              </span>
            {/if}
            {#if currentFilter.minAmount || currentFilter.maxAmount}
              <span class="filter-tag">
                💰 {currentFilter.minAmount ? formatSatoshis(currentFilter.minAmount) : '0'} - 
                {currentFilter.maxAmount ? formatSatoshis(currentFilter.maxAmount) : '∞'}
                <button on:click={() => {
                  delete currentFilter.minAmount;
                  delete currentFilter.maxAmount;
                  handleFilterApplied(currentFilter);
                }}>×</button>
              </span>
            {/if}
            {#if currentFilter.paymentMethods && currentFilter.paymentMethods.length > 0}
              <span class="filter-tag">
                💳 {currentFilter.paymentMethods.join(', ')}
                <button on:click={() => {
                  delete currentFilter.paymentMethods;
                  handleFilterApplied(currentFilter);
                }}>×</button>
              </span>
            {/if}
            <button class="btn btn-sm btn-secondary" on:click={handleFilterReset}>
              Alle Filter löschen
            </button>
          </div>
        {/if}

        <!-- Angebots-Liste -->
        <div class="offers-list">
          {#if $filteredOffers.length === 0}
            <div class="empty-state">
              {#if totalOffers === 0}
                <div class="empty-icon">📋</div>
                <h3>Noch keine Angebote</h3>
                <p>Erstelle das erste Bitcoin-Angebot in dieser Gruppe!</p>
                <button class="btn btn-primary" on:click={handleCreateOffer}>
                  Erstes Angebot erstellen
                </button>
              {:else}
                <div class="empty-icon">🔍</div>
                <h3>Keine Angebote gefunden</h3>
                <p>Versuche andere Filter-Einstellungen.</p>
                <button class="btn btn-secondary" on:click={handleFilterReset}>
                  Filter zurücksetzen
                </button>
              {/if}
            </div>
          {:else}
            {#each $filteredOffers as offer (offer.id)}
              <BitcoinOfferCard
                {offer}
                on:showInterest={handleShowInterest}
                on:viewDetails={handleViewDetails}
              />
            {/each}
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .offer-tab {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary);
  }

  .offer-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
  }

  .header-content h2 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary);
    font-size: 1.5rem;
  }

  .stats-row {
    display: flex;
    gap: 1rem;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 60px;
  }

  .stat-value {
    font-size: 1.2rem;
    font-weight: bold;
    color: var(--accent-color);
  }

  .stat-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .offer-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .create-section,
  .filter-section {
    max-width: 600px;
    margin: 0 auto;
  }

  .create-section h3,
  .filter-section h3 {
    margin-bottom: 1rem;
    color: var(--text-primary);
  }

  .offers-section {
    max-width: 800px;
    margin: 0 auto;
  }

  .active-filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: var(--bg-tertiary);
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }

  .filter-label {
    font-weight: 500;
    color: var(--text-secondary);
  }

  .filter-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    background: var(--accent-color);
    color: white;
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .filter-tag button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0;
    margin-left: 0.25rem;
    font-size: 1rem;
    line-height: 1;
  }

  .filter-tag button:hover {
    opacity: 0.8;
  }

  .offers-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-secondary);
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .empty-state h3 {
    margin-bottom: 0.5rem;
    color: var(--text-primary);
  }

  .empty-state p {
    margin-bottom: 1.5rem;
  }

  /* Button Styles */
  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .btn-primary {
    background: var(--accent-color);
    color: white;
  }

  .btn-primary:hover {
    background: var(--accent-hover);
  }

  .btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover {
    background: var(--bg-hover);
  }

  .btn-secondary.active {
    background: var(--accent-color);
    color: white;
    border-color: var(--accent-color);
  }

  .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .offer-header {
      flex-direction: column;
      gap: 1rem;
    }

    .header-actions {
      width: 100%;
      justify-content: space-between;
    }

    .stats-row {
      justify-content: space-around;
      width: 100%;
    }

    .active-filters {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>