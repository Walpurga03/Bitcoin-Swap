<script lang="ts">
  import { goto } from '$app/navigation';

  export let show = false;
  export let data: { roomId: string; message: string; type: 'accepted' | 'created' } | null = null;
  export let onClose: () => void;

  function handleGoToChat() {
    if (data?.roomId) {
      onClose();
      goto(`/deal/${data.roomId}`);
    }
  }
</script>

{#if show && data}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click={onClose}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="deal-modal" on:click|stopPropagation>
      <div class="deal-modal-header">
        {#if data.type === 'accepted'}
          <h2>🎉 Interesse akzeptiert!</h2>
        {:else}
          <h2>✅ Deal erstellt!</h2>
        {/if}
      </div>
      
      <div class="deal-modal-body">
        <p style="white-space: pre-line;">{data.message}</p>
        
        <div class="room-id-box">
          <strong>Room-ID:</strong>
          <code>{data.roomId}</code>
        </div>
        
        <p class="info-text">
          💬 Beide Parteien können jetzt zum Chat navigieren!
        </p>
      </div>
      
      <div class="deal-modal-actions">
        <button 
          class="btn btn-primary"
          on:click={handleGoToChat}
        >
          🚀 Zum Chat
        </button>
        
        <button 
          class="btn btn-secondary"
          on:click={onClose}
        >
          Später
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Modal Overlay */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  /* Deal Modal */
  .deal-modal {
    background: var(--surface-color);
    border-radius: 1rem;
    padding: 0;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-color);
    overflow: hidden;
    animation: modalSlideIn 0.3s ease-out;
  }

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Header */
  .deal-modal-header {
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
    color: white;
    padding: 2rem 1.5rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .deal-modal-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at top right, rgba(255, 255, 255, 0.1), transparent);
    pointer-events: none;
  }

  .deal-modal-header h2 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    position: relative;
    z-index: 1;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  /* Body */
  .deal-modal-body {
    padding: 2rem 1.5rem;
    background: var(--surface-color);
  }

  .deal-modal-body p {
    margin: 0 0 1.5rem 0;
    line-height: 1.6;
    color: var(--text-secondary);
    font-size: 1rem;
  }

  /* Room-ID Box */
  .room-id-box {
    background: var(--surface-elevated);
    border: 2px solid var(--border-hover);
    border-radius: 0.75rem;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .room-id-box::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.05) 0%, rgba(var(--secondary-rgb), 0.05) 100%);
    pointer-events: none;
  }

  .room-id-box strong {
    display: block;
    margin-bottom: 0.75rem;
    color: var(--text-muted);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 600;
    position: relative;
    z-index: 1;
  }

  .room-id-box code {
    font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
    font-size: 1.25rem;
    color: var(--text-color);
    background: var(--bg-secondary);
    padding: 0.75rem 1.25rem;
    border-radius: 0.5rem;
    display: inline-block;
    border: 1px solid var(--border-color);
    font-weight: 600;
    letter-spacing: 0.05em;
    position: relative;
    z-index: 1;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .info-text {
    color: var(--text-muted) !important;
    font-size: 0.875rem !important;
    text-align: center;
    margin: 1rem 0 0 0 !important;
    line-height: 1.5;
  }

  /* Actions */
  .deal-modal-actions {
    display: flex;
    gap: 0.75rem;
    padding: 1.5rem;
    background: var(--surface-elevated);
    border-top: 1px solid var(--border-color);
  }

  .deal-modal-actions .btn {
    flex: 1;
    padding: 0.875rem 1.5rem;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .deal-modal-actions .btn-primary {
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
    color: white;
    border: none;
    box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.3);
  }

  .deal-modal-actions .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.4);
    filter: brightness(1.1);
  }

  .deal-modal-actions .btn-secondary {
    background: var(--surface-color);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
  }

  .deal-modal-actions .btn-secondary:hover {
    background: var(--bg-secondary);
    border-color: var(--border-hover);
    color: var(--text-color);
  }
</style>
