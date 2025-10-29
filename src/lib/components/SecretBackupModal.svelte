<script lang="ts">
  import { createSecretBackup, formatSecretForDisplay } from '$lib/nostr/offerSecret';

  export let show = false;
  export let secret: string;
  export let offerTitle: string = '';

  let copied = false;

  function handleClose() {
    show = false;
  }

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
      alert('Fehler beim Kopieren. Bitte manuell kopieren.');
    }
  }

  function downloadBackup() {
    const backup = createSecretBackup(secret, offerTitle);
    const blob = new Blob([backup], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitcoin-offer-secret-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  $: formattedSecret = formatSecretForDisplay(secret);
</script>

{#if show}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <div class="modal-overlay" on:click={handleClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h2 id="modal-title">🔐 Dein Angebots-Secret</h2>
        <button class="close-btn" on:click={handleClose}>✕</button>
      </div>

      <div class="modal-body">
        <div class="warning-box">
          <div class="warning-icon">⚠️</div>
          <div class="warning-text">
            <strong>WICHTIG: Speichere dieses Secret sicher!</strong>
            <p>Du benötigst es, um:</p>
            <ul>
              <li>Interessenten-Signale zu entschlüsseln</li>
              <li>Dein Angebot zu verwalten</li>
              <li>Einen Partner auszuwählen</li>
            </ul>
            <p class="warning-highlight">
              ⚠️ Ohne dieses Secret kannst du NICHT auf dein Angebot zugreifen!
            </p>
          </div>
        </div>

        <div class="secret-display">
          <label for="secret-display-code">Dein Secret:</label>
          <div class="secret-box">
            <code id="secret-display-code">{formattedSecret}</code>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-primary" on:click={copySecret}>
            {#if copied}
              ✅ Kopiert!
            {:else}
              📋 Secret kopieren
            {/if}
          </button>
          <button class="btn btn-secondary" on:click={downloadBackup}>
            💾 Backup herunterladen
          </button>
        </div>

        <div class="info-box">
          <p><strong>💡 Empfehlung:</strong></p>
          <ul>
            <li>Speichere das Secret in einem Passwort-Manager</li>
            <li>Oder lade das Backup herunter und bewahre es sicher auf</li>
            <li>Teile das Secret NIEMALS mit anderen!</li>
          </ul>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-confirm" on:click={handleClose}>
          ✅ Ich habe mein Secret gespeichert
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
    max-width: 600px;
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

  .warning-box {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1));
    border: 2px solid rgba(239, 68, 68, 0.3);
    border-radius: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .warning-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .warning-text {
    flex: 1;
  }

  .warning-text strong {
    display: block;
    color: #ef4444;
    margin-bottom: 0.5rem;
    font-size: 1.125rem;
  }

  .warning-text p {
    margin: 0.5rem 0;
    color: var(--text-color);
    font-size: 0.9375rem;
  }

  .warning-text ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
    color: var(--text-secondary);
  }

  .warning-text li {
    margin: 0.25rem 0;
  }

  .warning-highlight {
    color: #ef4444 !important;
    font-weight: 600;
    margin-top: 0.75rem !important;
  }

  .secret-display {
    margin-bottom: 1.5rem;
  }

  .secret-display label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--text-color);
  }

  .secret-box {
    background: var(--bg-color);
    border: 2px solid var(--primary-color);
    border-radius: 0.75rem;
    padding: 1rem;
    overflow-x: auto;
  }

  .secret-box code {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: var(--primary-color);
    word-break: break-all;
    line-height: 1.6;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  .info-box {
    padding: 1rem;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1));
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 0.75rem;
    font-size: 0.875rem;
  }

  .info-box strong {
    display: block;
    color: #3b82f6;
    margin-bottom: 0.5rem;
  }

  .info-box ul {
    margin: 0.5rem 0 0 0;
    padding-left: 1.5rem;
    color: var(--text-secondary);
  }

  .info-box li {
    margin: 0.25rem 0;
  }

  .modal-footer {
    padding: 1.5rem;
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: center;
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
    gap: 0.5rem;
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--primary-color), #d90062);
    color: white;
    box-shadow: 0 4px 12px rgba(255, 0, 110, 0.4);
    flex: 1;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 0, 110, 0.5);
  }

  .btn-secondary {
    background: var(--surface-elevated);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    flex: 1;
  }

  .btn-secondary:hover {
    background: var(--bg-color);
    border-color: var(--primary-color);
  }

  .btn-confirm {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    min-width: 250px;
  }

  .btn-confirm:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
  }

  @media (max-width: 640px) {
    .modal-content {
      max-width: 100%;
      margin: 0;
      border-radius: 0;
      max-height: 100vh;
    }

    .actions {
      flex-direction: column;
    }

    .btn-primary,
    .btn-secondary {
      width: 100%;
    }

    .btn-confirm {
      width: 100%;
      min-width: auto;
    }
  }
</style>