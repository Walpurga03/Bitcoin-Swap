<script lang="ts">
  export let show: boolean;
  export let value: string;
  export let loading: boolean;
  export let anyOfferExists: boolean;
  export let onToggle: () => void;
  export let onSubmit: () => void;
  export let onInput: (value: string) => void;
</script>

<div class="marketplace-header">
  <h2>🛒 Marketplace</h2>
  <button
    class="btn btn-primary btn-sm"
    on:click={onToggle}
    disabled={anyOfferExists && !show}
    title={anyOfferExists ? 'Es existiert bereits ein aktives Angebot' : 'Neues Angebot erstellen'}
  >
    {show ? '✕ Abbrechen' : '+ Neues Angebot'}
  </button>
</div>

{#if anyOfferExists && !show}
  <div class="info-banner">
    ℹ️ Es existiert bereits ein aktives Angebot. Nur 1 Angebot gleichzeitig erlaubt.
  </div>
{/if}

{#if show}
  <form class="offer-form card" on:submit|preventDefault={onSubmit}>
    <h3>📝 Neues Angebot erstellen</h3>
    <textarea
      class="input"
      bind:value
      on:input={(e) => onInput(e.currentTarget.value)}
      placeholder="z.B. Verkaufe 0.01 BTC gegen EUR-Bargeld in Berlin..."
      rows="5"
      disabled={loading}
    ></textarea>
    <div class="form-actions">
      <button type="submit" class="btn btn-primary" disabled={loading || !value.trim()}>
        {#if loading}
          <span class="spinner"></span>
          <span>Wird veröffentlicht...</span>
        {:else}
          🚀 Angebot veröffentlichen
        {/if}
      </button>
    </div>
    <small class="hint">
      💡 <strong>Hinweis:</strong> Dein Angebot wird anonym veröffentlicht.
      Andere Nutzer können Interesse zeigen und du kannst dann einen privaten Deal-Room starten.
    </small>
  </form>
{/if}

<style>
  .marketplace-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    gap: 1rem;
  }

  .marketplace-header h2 {
    font-size: 1.5rem;
    margin: 0;
  }

  .info-banner {
    padding: 1rem;
    background: rgba(255, 0, 110, 0.1);
    border: 1px solid rgba(255, 0, 110, 0.3);
    border-radius: 0.5rem;
    color: var(--primary-color);
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
  }

  .card {
    background: var(--surface-color);
    border-radius: 1rem;
    padding: 1.5rem;
    border: 1px solid var(--border-color);
    margin-bottom: 2rem;
  }

  .offer-form h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--primary-color);
  }

  .input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    background: var(--surface-color);
    color: var(--text-color);
    font-family: inherit;
    font-size: 1rem;
    resize: vertical;
    margin-bottom: 1rem;
  }

  .input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .form-actions {
    margin-bottom: 1rem;
  }

  .hint {
    display: block;
    padding: 0.75rem;
    background: rgba(255, 0, 110, 0.08);
    border-radius: 0.5rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--primary-color);
    color: white;
  }

  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
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

  @media (max-width: 768px) {
    .marketplace-header {
      flex-direction: column;
      align-items: stretch;
    }

    .btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
