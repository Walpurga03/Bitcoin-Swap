<script lang="ts">
  import type { Offer } from '$lib/nostr/marketplace';
  import { truncatePubkey, getTimeRemaining, isExpiringSoon } from '$lib/utils';

  export let offers: Offer[];
  export let loading: boolean;
  export let interestCounts: Record<string, number>;
  export let myInterestOfferIds: Set<string>;
  export let onShowInterest: (offer: Offer) => void;
  export let onDeleteOffer: (offer: Offer) => void;
  export let onOpenInterestList: (offer: Offer) => void;
</script>

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
                on:click={() => onOpenInterestList(offer)}
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
                on:click={() => onDeleteOffer(offer)}
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
                on:click={() => onShowInterest(offer)}
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

<style>
  .offers-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .offers-count {
    grid-column: 1 / -1;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
  }

  .card {
    background: var(--surface-color);
    border-radius: 1rem;
    padding: 1.5rem;
    border: 1px solid var(--border-color);
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

  .offer-header {
    margin-bottom: 0.75rem;
  }

  .offer-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    margin-bottom: 0;
  }

  .badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .badge-primary {
    background: var(--primary-color);
    color: white;
  }

  .badge-secondary {
    background: var(--surface-elevated);
    color: var(--text-muted);
  }

  .offer-time {
    color: var(--text-muted);
  }

  .offer-time.expiring-soon {
    color: #f59e0b;
    font-weight: 600;
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
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
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
    border: none;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    transition: background 0.2s;
  }

  .interest-badge:hover:not(:disabled) {
    background: rgba(16, 185, 129, 0.2);
  }

  .interest-badge:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .expand-icon {
    font-size: 0.625rem;
    transition: transform 0.2s;
  }

  .interest-badge:hover .expand-icon {
    transform: translateX(2px);
  }

  .offer-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }

  .btn-success {
    background: #10b981;
    color: white;
  }

  .btn-warning {
    background: #f59e0b;
    color: white;
  }

  .btn-danger {
    background: #ef4444;
    color: white;
  }

  /* States */
  .loading-state,
  .empty-state {
    text-align: center;
    color: var(--text-muted);
    padding: 3rem 1rem;
    grid-column: 1 / -1;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .text-muted {
    color: var(--text-muted);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .offers-list {
      grid-template-columns: 1fr;
    }

    .offer-footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .offer-actions {
      width: 100%;
    }

    .btn {
      flex: 1;
    }
  }
</style>
