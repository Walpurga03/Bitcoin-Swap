<script lang="ts">
  import type { Deal } from '$lib/nostr/dealStatus';
  import { truncatePubkey, formatTimestamp } from '$lib/utils';

  export let deal: Deal;
  export let userPubkey: string;
  export let onComplete: (() => void) | undefined = undefined;
  export let onCancel: (() => void) | undefined = undefined;

  $: isUserSeller = deal.sellerPubkey === userPubkey;
  $: partnerPubkey = isUserSeller ? deal.buyerPubkey : deal.sellerPubkey;
  $: partnerRole = isUserSeller ? 'Käufer' : 'Verkäufer';
  $: statusText = deal.status === 'active' ? 'Aktiv' : deal.status === 'completed' ? 'Abgeschlossen' : 'Abgebrochen';
  $: statusIcon = deal.status === 'active' ? '🟢' : deal.status === 'completed' ? '✅' : '❌';
</script>

<div class="deal-card" class:active={deal.status === 'active'} class:completed={deal.status === 'completed'} class:cancelled={deal.status === 'cancelled'}>
  <div class="deal-header">
    <h3>{statusIcon} Deal {statusText}</h3>
    <span class="deal-role">Du bist: {isUserSeller ? 'Verkäufer' : 'Käufer'}</span>
  </div>

  <div class="deal-info">
    <div class="info-row">
      <span class="label">{partnerRole}:</span>
      <span class="value">{truncatePubkey(partnerPubkey, 16)}</span>
    </div>

    <div class="info-row">
      <span class="label">Gestartet:</span>
      <span class="value">{formatTimestamp(deal.createdAt)}</span>
    </div>

    {#if deal.updatedAt}
      <div class="info-row">
        <span class="label">Aktualisiert:</span>
        <span class="value">{formatTimestamp(deal.updatedAt)}</span>
      </div>
    {/if}
  </div>

  {#if deal.status === 'active'}
    <div class="deal-actions">
      {#if onComplete}
        <button class="btn btn-success" on:click={onComplete}>
          ✅ Deal abschließen
        </button>
      {/if}
      {#if onCancel}
        <button class="btn btn-cancel" on:click={onCancel}>
          ❌ Deal abbrechen
        </button>
      {/if}
    </div>
  {/if}

  {#if deal.status === 'active'}
    <div class="deal-note">
      <p>💬 <strong>Wichtig:</strong> Kontaktiere deinen Partner außerhalb der App, um die Details zu besprechen!</p>
      <p>📋 Du kannst den Public Key kopieren und außerhalb der Plattform Nachrichten senden.</p>
    </div>
  {/if}
</div>

<style>
  .deal-card {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 2px solid #8b5cf6;
    border-radius: 16px;
    padding: 24px;
    margin: 16px 0;
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.2);
  }

  .deal-card.active {
    border-color: #10b981;
    box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
  }

  .deal-card.completed {
    border-color: #3b82f6;
    opacity: 0.8;
  }

  .deal-card.cancelled {
    border-color: #ef4444;
    opacity: 0.7;
  }

  .deal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(139, 92, 246, 0.3);
  }

  .deal-header h3 {
    margin: 0;
    font-size: 1.5rem;
    color: #fff;
  }

  .deal-role {
    background: rgba(139, 92, 246, 0.2);
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 0.875rem;
    color: #c4b5fd;
  }

  .deal-info {
    margin-bottom: 20px;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .label {
    color: #9ca3af;
    font-weight: 600;
  }

  .value {
    color: #fff;
    font-family: 'Courier New', monospace;
  }

  .deal-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
  }

  .btn {
    flex: 1;
    padding: 12px 24px;
    border: none;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-success {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
  }

  .btn-success:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);
  }

  .btn-cancel {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
  }

  .btn-cancel:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3);
  }

  .deal-note {
    margin-top: 20px;
    padding: 16px;
    background: rgba(139, 92, 246, 0.1);
    border-left: 4px solid #8b5cf6;
    border-radius: 8px;
  }

  .deal-note p {
    margin: 8px 0;
    color: #e0e7ff;
    font-size: 0.875rem;
    line-height: 1.6;
  }

  .deal-note strong {
    color: #c4b5fd;
  }
</style>
