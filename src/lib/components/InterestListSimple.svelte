<script lang="ts">
  import { truncatePubkey } from '$lib/utils';

  export let interests: Array<{ pubkey: string; name?: string; timestamp: number }>;
  export let onSelect: (pubkey: string) => void;
  export let loading = false;

  function handleSelect(pubkey: string) {
    if (loading) return;
    if (confirm('Möchtest du diesen Interessenten für den Deal auswählen?')) {
      onSelect(pubkey);
    }
  }
</script>

<div class="interest-list">
  <div class="list-header">
    <h3>📋 Interessenten ({interests.length})</h3>
    <p class="subtitle">Wähle einen Interessenten für den Deal aus</p>
  </div>

  {#if interests.length === 0}
    <div class="empty-state">
      <p>⏳ Noch keine Interessenten</p>
      <small>Warte, bis jemand Interesse an deinem Angebot zeigt</small>
    </div>
  {:else}
    <div class="interest-items">
      {#each interests as interest}
        <div class="interest-item">
          <div class="interest-info">
            <div class="pubkey-row">
              <span class="icon">👤</span>
              <span class="pubkey">{truncatePubkey(interest.pubkey, 16)}</span>
            </div>
            {#if interest.name}
              <div class="name">{interest.name}</div>
            {/if}
            <div class="timestamp">
              {new Date(interest.timestamp).toLocaleString('de-DE')}
            </div>
          </div>
          <button 
            class="btn-select" 
            on:click={() => handleSelect(interest.pubkey)}
            disabled={loading}
          >
            ✅ Auswählen
          </button>
        </div>
      {/each}
    </div>

    <div class="note">
      <p><strong>Hinweis:</strong> Nach der Auswahl wird ein Deal mit diesem Nutzer erstellt.</p>
      <p>Alle anderen Interessenten werden automatisch benachrichtigt, dass das Angebot vergeben ist.</p>
    </div>
  {/if}
</div>

<style>
  .interest-list {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 2px solid #8b5cf6;
    border-radius: 16px;
    padding: 24px;
    margin: 16px 0;
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.2);
  }

  .list-header {
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(139, 92, 246, 0.3);
  }

  .list-header h3 {
    margin: 0 0 8px 0;
    font-size: 1.5rem;
    color: #fff;
  }

  .subtitle {
    margin: 0;
    color: #9ca3af;
    font-size: 0.875rem;
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
  }

  .empty-state p {
    font-size: 1.25rem;
    color: #9ca3af;
    margin-bottom: 8px;
  }

  .empty-state small {
    color: #6b7280;
  }

  .interest-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .interest-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 12px;
    transition: all 0.3s ease;
    gap: 12px;
  }

  .interest-item:hover {
    background: rgba(139, 92, 246, 0.15);
    border-color: rgba(139, 92, 246, 0.5);
    transform: translateY(-2px);
  }

  .interest-info {
    flex: 1;
    min-width: 0; /* Wichtig für text-overflow */
  }

  .pubkey-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .pubkey {
    font-family: 'Courier New', monospace;
    color: #fff;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .name {
    color: #c4b5fd;
    font-size: 0.875rem;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .timestamp {
    color: #6b7280;
    font-size: 0.75rem;
  }

  .btn-select {
    padding: 10px 20px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .btn-select:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);
  }

  .btn-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .note {
    margin-top: 20px;
    padding: 16px;
    background: rgba(139, 92, 246, 0.1);
    border-left: 4px solid #8b5cf6;
    border-radius: 8px;
  }

  .note p {
    margin: 8px 0;
    color: #e0e7ff;
    font-size: 0.875rem;
    line-height: 1.6;
  }

  .note strong {
    color: #c4b5fd;
  }

  /* Mobile Responsive */
  @media (max-width: 640px) {
    .interest-list {
      padding: 16px;
    }

    .list-header h3 {
      font-size: 1.25rem;
    }

    .interest-item {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }

    .interest-info {
      width: 100%;
    }

    .pubkey-row {
      flex-wrap: wrap;
    }

    .pubkey {
      font-size: 0.8125rem;
      word-break: break-all;
      white-space: normal;
    }

    .btn-select {
      width: 100%;
      padding: 12px;
      font-size: 1rem;
    }

    .note {
      padding: 12px;
    }

    .note p {
      font-size: 0.8125rem;
    }
  }
</style>
