<script lang="ts">
  import { onMount } from 'svelte';
  import { userStore } from '$lib/stores/userStore';
  import { groupStore } from '$lib/stores/groupStore';
  import { loadWhitelist, saveWhitelist, addToWhitelist, removeFromWhitelist, type WhitelistData } from '$lib/nostr/whitelist';
  import { validatePublicKey } from '$lib/security/validation';
  // @ts-ignore
  import { goto } from '$app/navigation';
  import { ADMIN_PUBKEY } from '$lib/config';

  let whitelist: WhitelistData | null = null;
  let loading = false;
  let saving = false;
  let error = '';
  let success = '';
  let newPubkey = '';
  let isAdmin = false;

  onMount(async () => {
    // Prüfe ob User eingeloggt ist
    const user = $userStore;
    const group = $groupStore;
    
    if (!user || !user.isAuthenticated) {
      goto('/');
      return;
    }

    if (!group || !group.relay) {
      error = 'Gruppe nicht initialisiert';
      setTimeout(() => goto('/group'), 2000);
      return;
    }

    // Prüfe ob User Admin ist
    const { nip19 } = await import('nostr-tools');
    let adminHex = ADMIN_PUBKEY;
    if (ADMIN_PUBKEY.startsWith('npub1')) {
      const decoded = nip19.decode(ADMIN_PUBKEY as any);
      if ((decoded as any).type === 'npub') {
        adminHex = (decoded as any).data as string;
      }
    }

    if (user.pubkey?.toLowerCase() !== adminHex.toLowerCase()) {
      error = 'Zugriff verweigert. Du bist kein Administrator.';
      setTimeout(() => goto('/group'), 2000);
      return;
    }

    isAdmin = true;
    await loadWhitelistData();
  });

  async function loadWhitelistData() {
    try {
      loading = true;
      error = '';
      
      const group = $groupStore;
      if (!group || !group.relay || !group.channelId) {
        error = 'Gruppe nicht initialisiert';
        return;
      }

      const { nip19 } = await import('nostr-tools');
      let adminHex = ADMIN_PUBKEY;
      if (ADMIN_PUBKEY.startsWith('npub1')) {
        const decoded = nip19.decode(ADMIN_PUBKEY as any);
        if ((decoded as any).type === 'npub') {
          adminHex = (decoded as any).data as string;
        }
      }

      console.log('📋 Lade Whitelist für Gruppe:', group.channelId.substring(0, 16) + '...');
      whitelist = await loadWhitelist([group.relay], adminHex, group.channelId);
      
      if (!whitelist) {
        // Erstelle neue leere Whitelist für diese Gruppe
        whitelist = {
          pubkeys: [],
          updated_at: Math.floor(Date.now() / 1000),
          admin_pubkey: adminHex,
          channel_id: group.channelId
        };
        success = 'Neue Whitelist für diese Gruppe erstellt';
      } else {
        success = `Whitelist geladen: ${whitelist.pubkeys.length} Einträge`;
      }
    } catch (e) {
      error = `Fehler beim Laden: ${e}`;
      console.error(e);
    } finally {
      loading = false;
    }
  }

  async function handleAddPubkey() {
    try {
      error = '';
      success = '';

      if (!newPubkey.trim()) {
        error = 'Bitte gib einen Public Key ein';
        return;
      }

      // Validiere Public Key
      const validation = validatePublicKey(newPubkey);
      if (!validation.valid) {
        error = validation.error || 'Ungültiger Public Key';
        return;
      }

      if (!whitelist) {
        error = 'Whitelist nicht geladen';
        return;
      }

      const user = $userStore;
      const group = $groupStore;
      
      if (!user || !user.privateKey) {
        error = 'Nicht eingeloggt';
        return;
      }

      if (!group || !group.relay || !group.channelId) {
        error = 'Gruppe nicht initialisiert';
        return;
      }

      // Prüfe ob bereits vorhanden
      if (whitelist.pubkeys.includes(validation.hex!)) {
        error = 'Public Key ist bereits in der Whitelist';
        return;
      }

      saving = true;

      // Füge hinzu und speichere (mit channelId)
      const result = await addToWhitelist(validation.hex!, user.privateKey, [group.relay], group.channelId);

      if (result) {
        // Lade Whitelist neu
        await loadWhitelistData();
        success = `Public Key hinzugefügt: ${newPubkey.substring(0, 20)}...`;
        newPubkey = '';
      } else {
        error = 'Fehler beim Hinzufügen';
      }
    } catch (e) {
      error = `Fehler beim Hinzufügen: ${e}`;
      console.error(e);
    } finally {
      saving = false;
    }
  }

  async function handleRemovePubkey(pubkey: string) {
    try {
      error = '';
      success = '';

      if (!whitelist) {
        error = 'Whitelist nicht geladen';
        return;
      }

      const user = $userStore;
      const group = $groupStore;
      
      if (!user || !user.privateKey) {
        error = 'Nicht eingeloggt';
        return;
      }

      if (!group || !group.relay || !group.channelId) {
        error = 'Gruppe nicht initialisiert';
        return;
      }

      saving = true;

      // Entferne und speichere (mit channelId)
      const result = await removeFromWhitelist(pubkey, user.privateKey, [group.relay], group.channelId);

      if (result) {
        // Lade Whitelist neu
        await loadWhitelistData();
        success = `Public Key entfernt: ${pubkey.substring(0, 20)}...`;
      } else {
        error = 'Fehler beim Entfernen';
      }
    } catch (e) {
      error = `Fehler beim Entfernen: ${e}`;
      console.error(e);
    } finally {
      saving = false;
    }
  }

  async function handleRefresh() {
    await loadWhitelistData();
  }

  function formatPubkey(hex: string): string {
    return `${hex.substring(0, 8)}...${hex.substring(hex.length - 8)}`;
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      success = 'In Zwischenablage kopiert';
      setTimeout(() => success = '', 2000);
    } catch (e) {
      error = 'Kopieren fehlgeschlagen';
    }
  }
</script>

<div class="admin-container">
  <div class="admin-header">
    <h1>🔐 Whitelist-Verwaltung</h1>
    <button class="btn-secondary" on:click={() => goto('/group')}>
      ← Zurück zur Gruppe
    </button>
  </div>

  {#if $groupStore && $groupStore.channelId}
    <div class="group-info">
      <h3>📍 Aktuelle Gruppe</h3>
      <p><strong>Channel ID:</strong> <code>{$groupStore.channelId.substring(0, 16)}...{$groupStore.channelId.substring($groupStore.channelId.length - 8)}</code></p>
      <p><strong>Relay:</strong> {$groupStore.relay}</p>
      <p class="hint">Diese Whitelist gilt nur für diese Gruppe. Andere Gruppen haben separate Whitelists.</p>
    </div>
  {/if}

  {#if error}
    <div class="alert alert-error">{error}</div>
  {/if}

  {#if success}
    <div class="alert alert-success">{success}</div>
  {/if}

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Lade Whitelist...</p>
    </div>
  {:else if isAdmin && whitelist}
    <div class="admin-content">
      <!-- Add Section -->
      <div class="add-section">
        <h2>Public Key hinzufügen</h2>
        <div class="add-form">
          <input
            type="text"
            bind:value={newPubkey}
            placeholder="npub1... oder hex"
            disabled={saving}
          />
          <button
            class="btn-primary"
            on:click={handleAddPubkey}
            disabled={saving || !newPubkey.trim()}
          >
            {saving ? '⏳ Speichere...' : '➕ Hinzufügen'}
          </button>
        </div>
      </div>

      <!-- Whitelist Section -->
      <div class="whitelist-section">
        <div class="section-header">
          <h2>Whitelist ({whitelist.pubkeys.length} Einträge)</h2>
          <button class="btn-secondary" on:click={handleRefresh} disabled={saving}>
            🔄 Aktualisieren
          </button>
        </div>

        {#if whitelist.pubkeys.length === 0}
          <div class="empty-state">
            <p>Keine Public Keys in der Whitelist</p>
            <p class="hint">Füge Public Keys hinzu, um Benutzern Zugriff zu gewähren</p>
          </div>
        {:else}
          <div class="pubkey-list">
            {#each whitelist.pubkeys as pubkey}
              <div class="pubkey-item">
                <div class="pubkey-info">
                  <button
                    class="pubkey-hex"
                    on:click={() => copyToClipboard(pubkey)}
                    type="button"
                    title="In Zwischenablage kopieren"
                  >
                    {formatPubkey(pubkey)}
                  </button>
                  <span class="copy-hint">Klicken zum Kopieren</span>
                </div>
                <button
                  class="btn-danger"
                  on:click={() => handleRemovePubkey(pubkey)}
                  disabled={saving}
                >
                  🗑️ Entfernen
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Info Section -->
      <div class="info-section">
        <h3>ℹ️ Informationen</h3>
        <ul>
          <li>Die Whitelist wird als Nostr Event (Kind 30000) auf dem Relay gespeichert</li>
          <li>Nur du als Admin kannst die Whitelist bearbeiten</li>
          <li>Änderungen werden sofort auf dem Relay gespeichert</li>
          <li>Benutzer müssen sich neu einloggen, um Änderungen zu sehen</li>
          <li>Letzte Aktualisierung: {new Date(whitelist.updated_at * 1000).toLocaleString('de-DE')}</li>
        </ul>
      </div>
    </div>
  {/if}
</div>

<style>
  .admin-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .admin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .group-info {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .group-info h3 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    color: var(--primary-color);
  }

  .group-info p {
    margin: 0.5rem 0;
    font-size: 0.875rem;
  }

  .group-info code {
    background: var(--bg-secondary);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-family: 'Courier New', monospace;
    font-size: 0.8125rem;
  }

  .group-info .hint {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(59, 130, 246, 0.2);
    color: var(--text-muted);
    font-style: italic;
  }

  .admin-header h1 {
    margin: 0;
    font-size: 1.75rem;
  }

  .admin-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .add-section,
  .whitelist-section,
  .info-section {
    background: var(--bg-secondary);
    border-radius: 0.5rem;
    padding: 1.5rem;
  }

  .add-section h2,
  .whitelist-section h2,
  .info-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
  }

  .add-form {
    display: flex;
    gap: 0.75rem;
  }

  .add-form input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted);
  }

  .empty-state .hint {
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }

  .pubkey-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .pubkey-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
  }

  .pubkey-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .pubkey-hex {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    background: var(--bg-secondary);
    border: 1px solid transparent;
    border-radius: 0.25rem;
    transition: all 0.2s;
    color: inherit;
  }

  .pubkey-hex:hover {
    background: var(--border-color);
  }

  .pubkey-hex:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .copy-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .info-section ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .info-section li {
    margin: 0.5rem 0;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .alert {
    padding: 1rem;
    border-radius: 0.375rem;
    margin-bottom: 1rem;
  }

  .alert-error {
    background-color: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .alert-success {
    background-color: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .loading {
    text-align: center;
    padding: 3rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto 1rem;
    border: 4px solid var(--border-color);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .btn-primary,
  .btn-secondary,
  .btn-danger {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background-color: var(--primary-color);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: var(--primary-hover);
  }

  .btn-secondary {
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover:not(:disabled) {
    background-color: var(--border-color);
  }

  .btn-danger {
    background-color: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .btn-danger:hover:not(:disabled) {
    background-color: rgba(239, 68, 68, 0.2);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .admin-container {
      padding: 1rem;
    }

    .admin-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .add-form {
      flex-direction: column;
    }

    .pubkey-item {
      flex-direction: column;
      gap: 0.75rem;
      align-items: flex-start;
    }
  }
</style>