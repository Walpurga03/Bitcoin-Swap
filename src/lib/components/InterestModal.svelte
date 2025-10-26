<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let show = false;
  export let offerContent = '';
  export let offerPubkey = ''; // Public Key des Angebotgebers
  
  const dispatch = createEventDispatcher();
  
  let sending = false;
  let message = '';
  
  function close() {
    show = false;
    message = '';
  }
  
  async function sendInterest() {
    if (sending) return;
    
    sending = true;
    try {
      dispatch('send', { 
        message: message.trim() || `Hallo! Ich interessiere mich für dein Angebot: "${offerContent.substring(0, 50)}..."`,
        recipientPubkey: offerPubkey
      });
      close();
    } catch (error) {
      console.error('Fehler:', error);
      alert('❌ Fehler beim Senden der Anfrage');
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
        <h2>💌 Private Anfrage senden</h2>
        <button class="close-btn" on:click={close}>✕</button>
      </div>
      
      <div class="modal-body">
        <div class="offer-preview">
          <p><strong>Angebot:</strong></p>
          <p class="offer-text">{offerContent}</p>
        </div>
        
        <div class="message-section">
          <label for="message">📝 Persönliche Nachricht (optional):</label>
          <textarea
            id="message"
            bind:value={message}
            placeholder="z.B. Hallo! Wann und wo können wir uns treffen?"
            rows="3"
            maxlength="500"
          ></textarea>
          <div class="char-counter">
            {message.length}/500 Zeichen
          </div>
        </div>
        
        <div class="info-text">
          <p>💌 Deine Nachricht wird als <strong>private NIP-17 DM</strong> an den Angebotsgeber gesendet.</p>
          <p>🔒 Nur ihr beide könnt sie sehen!</p>
        </div>
        
        <div class="info-box">
          <strong>ℹ️ So funktioniert es:</strong>
          <ul>
            <li>Du zeigst <strong>stilles Interesse</strong> - der Anbieter sieht nur die Anzahl</li>
            <li>Wenn er dich auswählt, wird ein privater Chat gestartet</li>
            <li>Andere Interessenten erfahren nichts davon</li>
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
          {sending ? '⏳ Sende...' : '📤 Anfrage senden'}
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
  
  .confirmation-text {
    text-align: center;
    margin: 1.5rem 0;
  }
  
  .confirmation-text p {
    font-size: 1.1rem;
    color: #eee;
    margin: 0;
  }
  
  .info-box {
    background: rgba(46, 204, 113, 0.1);
    border: 1px solid rgba(46, 204, 113, 0.3);
    border-radius: 8px;
    padding: 1rem;
    margin-top: 1rem;
  }
  
  .info-box strong {
    color: #2ecc71;
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
  
  .message-section {
    margin-bottom: 1.5rem;
  }
  
  .message-section label {
    display: block;
    margin-bottom: 0.5rem;
    color: #f39c12;
    font-weight: 500;
  }
  
  .message-section textarea {
    width: 100%;
    background: #0f1419;
    border: 1px solid #2d2d44;
    border-radius: 6px;
    padding: 0.75rem;
    color: #eee;
    font-family: inherit;
    font-size: 0.95rem;
    resize: vertical;
    min-height: 80px;
    transition: border-color 0.2s;
  }
  
  .message-section textarea:focus {
    outline: none;
    border-color: #f39c12;
  }
  
  .message-section textarea::placeholder {
    color: #666;
  }
  
  .char-counter {
    text-align: right;
    margin-top: 0.25rem;
    font-size: 0.8rem;
    color: #888;
  }
  
  .info-text {
    background: rgba(52, 152, 219, 0.1);
    border-left: 3px solid #3498db;
    border-radius: 4px;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  .info-text p {
    margin: 0 0 0.5rem 0;
    color: #eee;
    font-size: 0.9rem;
  }
  
  .info-text p:last-child {
    margin-bottom: 0;
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
