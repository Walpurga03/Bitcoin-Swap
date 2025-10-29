<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { validateOfferSecret, formatSecretForDisplay } from '$lib/nostr/offerSecret';

  export let show = false;

  const dispatch = createEventDispatcher();

  let secretInput = '';
  let error = '';
  let loading = false;

  function handleClose() {
    show = false;
    secretInput = '';
    error = '';
  }

  async function handleLogin() {
    error = '';

    if (!secretInput.trim()) {
      error = 'Bitte gib dein Secret ein';
      return;
    }

    // Validiere Secret-Format
    if (!validateOfferSecret(secretInput.trim())) {
      error = 'Ungültiges Secret-Format. Secret muss 64 Hex-Zeichen sein.';
      return;
    }

    try {
      loading = true;
      
      // Dispatch Event mit Secret
      dispatch('login', { secret: secretInput.trim() });
      
      // Modal schließen
      handleClose();
    } catch (e: any) {
      error = e.message || 'Fehler beim Login';
    } finally {
      loading = false;
    }
  }

  function handlePaste(event: ClipboardEvent) {
    // Entferne Leerzeichen und Zeilenumbrüche beim Einfügen
    event.preventDefault();
    const paste = event.clipboardData?.getData('text') || '';
    const cleaned = paste.replace(/\s+/g, '').toLowerCase();
    secretInput = cleaned;
  }
</script>

{#if show}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <div class="modal-overlay" on:click={handleClose} role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h2 id="login-modal-title">🔐 Mit Secret anmelden</h2>
        <button class="close-btn" on:click={handleClose}>✕</button>
      </div>

      <div class="modal-body">
        <div class="info-box">
          <p>
            <strong>💡 Hinweis:</strong> Gib dein Angebots-Secret ein, um auf dein bestehendes Angebot zuzugreifen.
          </p>
          <p class="text-muted">
            Das Secret wurde dir beim Erstellen des Angebots angezeigt.
          </p>
        </div>

        <form on:submit|preventDefault={handleLogin}>
          <div class="form-group">
            <label for="secret-input">Dein Secret:</label>
            <textarea
              id="secret-input"
              class="secret-input"
              bind:value={secretInput}
              on:paste={handlePaste}
              placeholder="Füge hier dein 64-stelliges Secret ein..."
              rows="3"
              disabled={loading}
              autocomplete="off"
              spellcheck="false"
            ></textarea>
            <small class="hint">
              Format: 64 Hex-Zeichen (0-9, a-f)
            </small>
          </div>

          {#if error}
            <div class="error-message">
              ❌ {error}
            </div>
          {/if}

          <div class="form-actions">
            <button
              type="button"
              class="btn btn-secondary"
              on:click={handleClose}
              disabled={loading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={loading || !secretInput.trim()}
            >
              {#if loading}
                <span class="spinner"></span>
                <span>Wird geladen...</span>
              {:else}
                🔓 Anmelden
              {/if}
            </button>
          </div>
        </form>

        <div class="warning-box">
          <div class="warning-icon">⚠️</div>
          <div class="warning-text">
            <strong>Sicherheitshinweis:</strong>
            <p>Teile dein Secret niemals mit anderen! Jeder mit Zugriff auf dein Secret kann dein Angebot verwalten.</p>
          </div>
        </div>
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
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    backdrop-filter: blur(4px);
  }

  .modal-content {
    background: linear-gradient(135deg, var(--surface-color) 0%, var(--surface-elevated) 100%);
    border-radius: 1rem;
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    border: 1px solid var(--border-color);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-muted);
    transition: color 0.2s;
    padding: 0.25rem;
    line-height: 1;
  }

  .close-btn:hover {
    color: var(--text-color);
  }

  .modal-body {
    padding: 1.5rem;
  }

  .info-box {
    padding: 1rem;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1));
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .info-box strong {
    display: block;
    color: #3b82f6;
    margin-bottom: 0.5rem;
  }

  .info-box p {
    margin: 0.5rem 0 0 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .text-muted {
    color: var(--text-muted) !important;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--text-color);
  }

  .secret-input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--border-color);
    border-radius: 0.75rem;
    background: var(--bg-color);
    color: var(--text-color);
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    resize: vertical;
    transition: border-color 0.2s;
  }

  .secret-input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .secret-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .hint {
    display: block;
    margin-top: 0.5rem;
    color: var(--text-muted);
    font-size: 0.8125rem;
  }

  .error-message {
    padding: 0.75rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 0.5rem;
    color: #ef4444;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .warning-box {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1));
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 0.75rem;
  }

  .warning-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .warning-text {
    flex: 1;
  }

  .warning-text strong {
    display: block;
    color: #f59e0b;
    margin-bottom: 0.5rem;
  }

  .warning-text p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 0.9375rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    flex: 1;
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--primary-color), #d90062);
    color: white;
    box-shadow: 0 4px 12px rgba(255, 0, 110, 0.4);
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 0, 110, 0.5);
  }

  .btn-secondary {
    background: var(--surface-elevated);
    color: var(--text-color);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-color);
    border-color: var(--primary-color);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .spinner {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 640px) {
    .modal-content {
      max-width: 100%;
      margin: 0;
      border-radius: 0;
      max-height: 100vh;
    }

    .form-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>