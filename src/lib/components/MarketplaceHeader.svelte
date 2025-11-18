<script lang="ts">
  import { truncatePubkey } from '$lib/utils';

  export let userName: string;
  export let userPubkey: string;
  export let isAdmin: boolean;
  export let hasOfferKeypair: boolean;
  export let onOpenWhitelist: () => void;
  export let onOpenSecretLogin: () => void;
  export let onLogout: () => void;
</script>

<header class="group-header">
  <div>
    <h1>🛒 Bitcoin Tausch Netzwerk</h1>
    <p class="user-info">
      Angemeldet als: <strong>{userName || 'Anonym'}</strong>
      ({truncatePubkey(userPubkey || '')})
      {#if isAdmin}
        <span class="admin-badge">👑 Admin</span>
      {/if}
    </p>
  </div>
  <div class="header-actions">
    {#if !hasOfferKeypair}
      <button class="btn btn-secret" on:click={onOpenSecretLogin}>
        🔑 Mit Secret anmelden
      </button>
    {/if}
    {#if isAdmin}
      <button class="btn btn-admin" on:click={onOpenWhitelist}>
        🔐 Whitelist verwalten
      </button>
    {/if}
    <button class="btn btn-secondary" on:click={onLogout}>
      Abmelden
    </button>
  </div>
</header>

<style>
  .group-header {
    background: var(--surface-color);
    padding: 1rem 2rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .group-header h1 {
    font-size: 1.5rem;
    margin: 0;
    color: var(--primary-color);
  }

  .user-info {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .admin-badge {
    padding: 0.125rem 0.5rem;
    background: var(--accent-color);
    color: white;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--surface-elevated);
    color: var(--text-color);
    border: 1px solid var(--border-color);
  }

  .btn-admin {
    background: var(--secondary-color);
    color: white;
  }

  .btn-secret {
    background: #f59e0b;
    color: white;
  }

  @media (max-width: 768px) {
    .group-header {
      flex-direction: column;
      align-items: stretch;
      padding: 1rem;
    }

    .header-actions {
      flex-direction: column;
      gap: 0.5rem;
    }

    .btn {
      width: 100%;
    }
  }
</style>
