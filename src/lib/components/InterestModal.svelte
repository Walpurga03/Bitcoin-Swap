<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let show = false;
  export let offerContent = '';
  
  const dispatch = createEventDispatcher();
  
  let message = '';
  let sending = false;
  
  function close() {
    show = false;
    message = '';
  }
  
  async function sendInterest() {
    if (sending) return;
    
    sending = true;
    try {
      dispatch('send', { message });
      close();
    } catch (error) {
      console.error('Fehler:', error);
      alert('❌ Fehler beim Senden des Interesses');
    } finally {
      sending = false;
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
        <h2>💌 Interesse zeigen</h2>
        <button class="close-btn" on:click={close}>✕</button>
      </div>
      
      <div class="modal-body">
        <div class="offer-preview">
          <p><strong>Angebot:</strong></p>
          <p class="offer-text">{offerContent}</p>
        </div>
        
        <div class="form-group">
          <label for="message">
            Optionale Nachricht an Anbieter
            <span class="hint">(Nur Anbieter kann sie lesen)</span>
          </label>
          <textarea
            id="message"
            bind:value={message}
            placeholder="z.B. 'Wann können wir uns treffen?', 'Ich habe auch XMR...'"
            rows="4"
            maxlength="500"
          ></textarea>
          <div class="char-count">
            {message.length}/500
          </div>
        </div>
        
        <div class="info-box">
          <strong>🔐 Privatsphäre:</strong>
          <ul>
            <li>Nur der Anbieter sieht deine Identität</li>
            <li>Nachricht ist NIP-17 verschlüsselt</li>
            <li>Andere User sehen nur die Anzahl der Interessen</li>
          </ul>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-secondary" on:click={close}>
          Abbrechen
        </button>
        <button 
          class="btn-primary" 
          on:click={sendInterest}
          disabled={sending}
        >
          {sending ? '⏳ Sende...' : '📤 Interesse senden'}
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
    max-width: 600px;
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
  }
  
  .offer-preview {
    background: #16213e;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    border-left: 4px solid #f39c12;
  }
  
  .offer-preview p {
    margin: 0.5rem 0;
  }
  
  .offer-text {
    color: #eee;
    font-size: 1.1rem;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: #eee;
    font-weight: 500;
  }
  
  .hint {
    color: #888;
    font-size: 0.9rem;
    font-weight: normal;
  }
  
  textarea {
    width: 100%;
    padding: 0.75rem;
    background: #16213e;
    border: 1px solid #2d2d44;
    border-radius: 8px;
    color: #eee;
    font-family: inherit;
    font-size: 1rem;
    resize: vertical;
    transition: border-color 0.2s;
  }
  
  textarea:focus {
    outline: none;
    border-color: #f39c12;
  }
  
  .char-count {
    text-align: right;
    font-size: 0.85rem;
    color: #888;
    margin-top: 0.25rem;
  }
  
  .info-box {
    background: rgba(52, 152, 219, 0.1);
    border: 1px solid rgba(52, 152, 219, 0.3);
    border-radius: 8px;
    padding: 1rem;
    margin-top: 1rem;
  }
  
  .info-box strong {
    color: #3498db;
  }
  
  .info-box ul {
    margin: 0.5rem 0 0 0;
    padding-left: 1.5rem;
  }
  
  .info-box li {
    margin: 0.25rem 0;
    color: #aaa;
    font-size: 0.9rem;
  }
  
  .modal-footer {
    display: flex;
    gap: 1rem;
    padding: 1.5rem;
    border-top: 1px solid #2d2d44;
    justify-content: flex-end;
  }
  
  button {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }
  
  .btn-secondary {
    background: #2d2d44;
    color: #eee;
  }
  
  .btn-secondary:hover {
    background: #3d3d54;
  }
  
  .btn-primary {
    background: linear-gradient(135deg, #f39c12 0%, #e74c3c 100%);
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);
  }
  
  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  @media (max-width: 640px) {
    .modal-content {
      margin: 0;
      max-height: 100vh;
      border-radius: 0;
    }
    
    .modal-footer {
      flex-direction: column-reverse;
    }
    
    .modal-footer button {
      width: 100%;
    }
  }
</style>
