<!-- Bitcoin-Angebots-Karte für Phase 2 -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { BitcoinOffer } from '$lib/nostr/types';
  import { 
    formatSatoshis, 
    formatPrice, 
    getOfferAge, 
    isOfferExpired,
    formatPaymentMethods 
  } from '$lib/utils/offers';
  import { userStore } from '$lib/stores/userStore';

  export let offer: BitcoinOffer;

  const dispatch = createEventDispatcher<{
    showInterest: { offerId: string };
    viewDetails: { offerId: string };
  }>();

  $: user = $userStore;
  $: isOwnOffer = user?.pubkey === offer.authorPubkey;
  $: isExpired = isOfferExpired(offer);
  $: canShowInterest = !isOwnOffer && !isExpired && offer.status === 'active';
  $: offerAge = getOfferAge(offer);
  $: totalValue = (offer.amount / 100_000_000) * offer.price;

  function handleShowInterest() {
    dispatch('showInterest', { offerId: offer.id });
  }

  function handleViewDetails() {
    dispatch('viewDetails', { offerId: offer.id });
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'active': return '#10b981';
      case 'expired': return '#ef4444';
      case 'completed': return '#6366f1';
      case 'cancelled': return '#6b7280';
      default: return '#6b7280';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'expired': return 'Abgelaufen';
      case 'completed': return 'Abgeschlossen';
      case 'cancelled': return 'Storniert';
      default: return status;
    }
  }

  function getTypeIcon(type: string): string {
    return type === 'buy' ? '🟢' : '🔴';
  }

  function getTypeLabel(type: string): string {
    return type === 'buy' ? 'Kaufe Bitcoin' : 'Verkaufe Bitcoin';
  }
</script>

<div class="bitcoin-offer-card" class:own={isOwnOffer} class:expired={isExpired}>
  <!-- Header -->
  <div class="offer-header">
    <div class="offer-type">
      <span class="type-icon">{getTypeIcon(offer.type)}</span>
      <span class="type-label">{getTypeLabel(offer.type)}</span>
    </div>
    <div class="offer-meta">
      <span class="offer-age">{offerAge}</span>
      <span 
        class="status-badge" 
        style="background-color: {getStatusColor(offer.status)}"
      >
        {getStatusLabel(offer.status)}
      </span>
    </div>
  </div>

  <!-- Main Content -->
  <div class="offer-content">
    <!-- Amount & Price -->
    <div class="amount-section">
      <div class="bitcoin-amount">
        <span class="amount-value">{formatSatoshis(offer.amount)}</span>
        <span class="amount-label">Bitcoin</span>
      </div>
      <div class="price-info">
        <div class="unit-price">
          <span class="price-value">{formatPrice(offer.price)}</span>
          <span class="price-label">pro BTC</span>
        </div>
        <div class="total-value">
          <span class="total-label">Gesamt:</span>
          <span class="total-amount">{formatPrice(totalValue)}</span>
        </div>
      </div>
    </div>

    <!-- Payment Methods -->
    <div class="payment-section">
      <span class="payment-label">Zahlungsmethoden:</span>
      <div class="payment-methods">
        {#each offer.paymentMethods as method}
          <span class="payment-method">
            {#if method.type === 'cash'}
              💰 {method.label}
            {:else if method.type === 'bank'}
              🏦 {method.label}
            {:else if method.type === 'rechnung'}
              📄 {method.label}
            {:else}
              💳 {method.label}
            {/if}
          </span>
        {/each}
      </div>
    </div>

    <!-- Location (if provided) -->
    {#if offer.location}
      <div class="location-section">
        <span class="location-icon">📍</span>
        <span class="location-text">{offer.location}</span>
      </div>
    {/if}

    <!-- Description (if provided) -->
    {#if offer.description}
      <div class="description-section">
        <p class="description-text">{offer.description}</p>
      </div>
    {/if}
  </div>

  <!-- Footer -->
  <div class="offer-footer">
    <div class="footer-info">
      {#if isOwnOffer}
        <span class="own-badge">Ihr Angebot</span>
      {/if}
      {#if offer.encrypted}
        <span class="encrypted-badge">🔒 Verschlüsselt</span>
      {/if}
    </div>

    <div class="footer-actions">
      <button 
        class="btn btn-secondary"
        on:click={handleViewDetails}
      >
        Details
      </button>
      
      {#if canShowInterest}
        <button 
          class="btn btn-primary"
          on:click={handleShowInterest}
        >
          🙋 Interesse zeigen
        </button>
      {:else if isExpired}
        <span class="expired-text">⏰ Abgelaufen</span>
      {:else if isOwnOffer}
        <span class="own-text">Ihr Angebot</span>
      {/if}
    </div>
  </div>
</div>

<style>
  .bitcoin-offer-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    transition: all 0.3s ease;
    position: relative;
  }

  .bitcoin-offer-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    border-color: var(--accent-color);
  }

  .bitcoin-offer-card.own {
    border-left: 4px solid var(--accent-color);
    background: var(--bg-tertiary);
  }

  .bitcoin-offer-card.expired {
    opacity: 0.7;
    background: var(--bg-disabled);
  }

  .offer-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .offer-type {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .type-icon {
    font-size: 1.2rem;
  }

  .type-label {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 1.1rem;
  }

  .offer-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }

  .offer-age {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .status-badge {
    color: white;
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
    font-weight: 500;
  }

  .offer-content {
    margin-bottom: 1rem;
  }

  .amount-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    padding: 1rem;
    background: var(--bg-tertiary);
    border-radius: 8px;
  }

  .bitcoin-amount {
    display: flex;
    flex-direction: column;
  }

  .amount-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--accent-color);
  }

  .amount-label {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .price-info {
    text-align: right;
  }

  .unit-price {
    margin-bottom: 0.25rem;
  }

  .price-value {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .price-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-left: 0.25rem;
  }

  .total-value {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .total-label {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .total-amount {
    font-size: 1rem;
    font-weight: 600;
    color: var(--success-color);
  }

  .payment-section {
    margin-bottom: 1rem;
  }

  .payment-label {
    display: block;
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .payment-methods {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .payment-method {
    background: var(--bg-primary);
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    font-size: 0.85rem;
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .location-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: var(--bg-tertiary);
    border-radius: 6px;
  }

  .location-icon {
    font-size: 1rem;
  }

  .location-text {
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .description-section {
    margin-bottom: 1rem;
  }

  .description-text {
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
    font-size: 0.9rem;
    padding: 0.75rem;
    background: var(--bg-tertiary);
    border-radius: 6px;
    border-left: 3px solid var(--accent-color);
  }

  .offer-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .footer-info {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .own-badge {
    background: var(--accent-color);
    color: white;
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
    font-weight: 500;
  }

  .encrypted-badge {
    background: var(--success-color);
    color: white;
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
    font-weight: 500;
  }

  .footer-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

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
    transform: translateY(-1px);
  }

  .btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover {
    background: var(--bg-hover);
  }

  .expired-text,
  .own-text {
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-style: italic;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .bitcoin-offer-card {
      padding: 1rem;
    }

    .offer-header {
      flex-direction: column;
      gap: 0.5rem;
    }

    .offer-meta {
      align-items: flex-start;
    }

    .amount-section {
      flex-direction: column;
      gap: 1rem;
    }

    .price-info {
      text-align: left;
    }

    .offer-footer {
      flex-direction: column;
      align-items: stretch;
    }

    .footer-actions {
      justify-content: space-between;
    }

    .btn {
      flex: 1;
    }
  }
</style>