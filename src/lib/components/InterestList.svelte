<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { truncatePubkey } from '$lib/utils';
  import type { Interest } from '$lib/nostr/nip17';
  
  export let show = false;
  export let interests: Interest[] = [];
  export let loading = false;
  
  const dispatch = createEventDispatcher();
  
  function close() {
    show = false;
  }
  
  async function copyPubkey(pubkey: string) {
    try {
      await navigator.clipboard.writeText(pubkey);
      alert('✅ Public Key kopiert!\n\nDu kannst den User nun außerhalb der App kontaktieren.');
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
      prompt('Public Key (kopiere ihn manuell):', pubkey);
    }
  }
</script>

{#if show}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click={close}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h2>� Deal-Anfragen ({interests.length})</h2>
        <button class="close-btn" on:click={close}>✕</button>
      </div>
      
      <div class="modal-body">
        {#if loading}
          <div class="loading">
            <div class="spinner"></div>
            <p>Lade Interessenten...</p>
          </div>
        {:else if interests.length === 0}
          <div class="empty-state">
            <p>😴 Noch keine Deal-Anfragen</p>
            <p class="hint">Sobald jemand eine private Anfrage sendet, erscheint sie hier.</p>
          </div>
        {:else}
          <div class="interests-list">
            {#each interests as interest (interest.userPubkey)}
              <div class="interest-card">
                <div class="interest-header">
                  <div class="user-info">
                    <span class="user-icon">👤</span>
                    <div>
                      <strong>{interest.userName || 'Anonym'}</strong>
                      <!-- svelte-ignore a11y-click-events-have-key-events -->
                      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
                      <p class="pubkey" on:click={() => copyPubkey(interest.userPubkey)}>
                        {truncatePubkey(interest.userPubkey, 8)}
                        <span class="copy-hint">📋</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                {#if interest.message}
                  <div class="message">
                    <p>"{interest.message}"</p>
                  </div>
                {/if}
                
                <div class="interest-footer">
                  <button 
                    class="btn-contact"
                    on:click={() => copyPubkey(interest.userPubkey)}
                  >
                    📋 Public Key kopieren
                  </button>
                  <button 
                    class="btn-deal"
                    on:click={() => dispatch('selectPartner', interest)}
                  >
                    🤝 User auswählen
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
      <div class="modal-footer">
        <button class="btn-secondary" on:click={close}>
          Schließen
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }
  
  .modal-content {
    background: #1a1a2e;
    border-radius: 12px;
    max-width: 700px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #2d2d44;
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #f39c12;
  }
  
  .close-btn {
    background: transparent;
    border: none;
    font-size: 2rem;
    color: #888;
    cursor: pointer;
    padding: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
  }
  
  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  
  .modal-body {
    padding: 1.5rem;
    min-height: 200px;
  }
  
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 0;
    color: #888;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #2d2d44;
    border-top-color: #f39c12;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .empty-state {
    text-align: center;
    padding: 3rem 0;
    color: #888;
  }
  
  .empty-state p:first-child {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }
  
  .hint {
    font-size: 0.9rem;
    color: #666;
  }
  
  .interests-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .interest-card {
    background: #16213e;
    border-radius: 8px;
    padding: 1.25rem;
    border: 1px solid #2d2d44;
    transition: all 0.2s;
  }
  
  .interest-card:hover {
    border-color: #f39c12;
    transform: translateY(-2px);
  }
  
  .interest-header {
    margin-bottom: 1rem;
  }
  
  .user-info {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .user-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }
  
  .user-info strong {
    color: #f39c12;
    font-size: 1.1rem;
  }
  
  .pubkey {
    margin: 0.25rem 0 0 0;
    font-family: monospace;
    font-size: 0.85rem;
    color: #888;
    cursor: pointer;
    transition: color 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .pubkey:hover {
    color: #f39c12;
  }
  
  .copy-hint {
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .pubkey:hover .copy-hint {
    opacity: 1;
  }
  
  .message {
    background: rgba(52, 152, 219, 0.1);
    border-left: 3px solid #3498db;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }
  
  .message p {
    margin: 0;
    color: #eee;
    font-style: italic;
  }
  
  .interest-footer {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  
  .btn-contact {
    background: #2d2d44;
    color: #eee;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }
  
  .btn-contact:hover {
    background: #f39c12;
    color: #1a1a2e;
  }
  
  .btn-deal {
    background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s;
  }
  
  .btn-deal:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(243, 156, 18, 0.4);
  }
  
  .modal-footer {
    display: flex;
    gap: 1rem;
    padding: 1.5rem;
    border-top: 1px solid #2d2d44;
    justify-content: flex-end;
  }
  
  .btn-secondary {
    background: #2d2d44;
    color: #eee;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s;
  }
  
  .btn-secondary:hover {
    background: #3d3d54;
  }
  
  @media (max-width: 640px) {
    .modal-content {
      margin: 0;
      max-height: 100vh;
      border-radius: 0;
    }
    
    .interest-footer {
      flex-direction: column;
    }
    
    .interest-footer button {
      width: 100%;
    }
  }
</style>
