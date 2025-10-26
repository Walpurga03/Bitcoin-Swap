<script lang="ts">
  import { onMount } from 'svelte';
  import { userStore } from '$lib/stores/userStore';
  import { groupStore } from '$lib/stores/groupStore';
  import { loadWhitelist, addToWhitelist, removeFromWhitelist, type WhitelistData } from '$lib/nostr/whitelist';
  import { validatePublicKey } from '$lib/security/validation';
  import { createInviteLink } from '$lib/utils';
  import { saveUserConfig } from '$lib/nostr/userConfig';
  import type { UserConfig } from '$lib/nostr/userConfig';
  // @ts-ignore
  import { goto } from '$app/navigation';

  let whitelist: WhitelistData | null = null;
  let loading = false;
  let saving = false;
  let error = '';
  let success = '';
  let newPubkey = '';
  let isAdmin = false;
  let inviteLink = '';

  onMount(async () => {
    const user = $userStore;
    const group = $groupStore;
    
    if (!user || !user.isAuthenticated) {
      goto('/');
      return;
    }

    if (!group || !group.relay || !group.secret) {
      error = 'Gruppe nicht initialisiert';
      setTimeout(() => goto('/group'), 2000);
      return;
    }

    console.log('🔐 [ADMIN-PAGE] Admin-Seitenzugriff prüfen...');
    
    try {
      const { loadGroupAdmin, deriveSecretHash } = await import('$lib/nostr/groupConfig');
      const secretHash = await deriveSecretHash(group.secret);
      const adminPubkey = await loadGroupAdmin(secretHash, [group.relay]);
      
      console.log('🔐 [ADMIN-PAGE] Admin-Status:', {
        adminPubkey: adminPubkey?.substring(0, 16) + '...',
        userPubkey: user.pubkey?.substring(0, 16) + '...',
        isAdmin: adminPubkey?.toLowerCase() === user.pubkey?.toLowerCase()
      });
      
      if (!adminPubkey || adminPubkey.toLowerCase() !== user.pubkey?.toLowerCase()) {
        console.log('❌ [ADMIN-PAGE] Zugriff verweigert - kein Admin');
        error = 'Zugriff verweigert. Du bist kein Administrator.';
        setTimeout(() => goto('/group'), 2000);
        return;
      }

      console.log('✅ [ADMIN-PAGE] Admin erkannt - Zugriff erlaubt');
      isAdmin = true;
      await loadWhitelistData(adminPubkey);
    } catch (e: any) {
      console.error('❌ [ADMIN-PAGE] Fehler beim Prüfen des Admin-Status:', e);
      error = e.message || 'Fehler beim Prüfen des Admin-Status';
      setTimeout(() => goto('/group'), 2000);
    }
  });

  async function loadWhitelistData(adminPubkey: string) {
    try {
      loading = true;
      error = '';
      
      const group = $groupStore;
      if (!group || !group.relay || !group.channelId) {
        error = 'Gruppe nicht initialisiert';
        return;
      }

      console.log('📋 Lade Whitelist für Gruppe:', group.channelId.substring(0, 16) + '...');
      whitelist = await loadWhitelist([group.relay], adminPubkey, group.channelId);
      
      if (!whitelist) {
        whitelist = {
          pubkeys: [],
          updated_at: Math.floor(Date.now() / 1000),
          admin_pubkey: adminPubkey,
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

      if (whitelist.pubkeys.includes(validation.hex!)) {
        error = 'Public Key ist bereits in der Whitelist';
        return;
      }

      saving = true;

      // Schreibe auf den Gruppen-Relay
      const result = await addToWhitelist(validation.hex!, user.privateKey, [group.relay], group.channelId);

      if (result) {
        const adminPubkey = whitelist.admin_pubkey;
        await loadWhitelistData(adminPubkey);
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

      // Lösche vom Gruppen-Relay
      const result = await removeFromWhitelist(pubkey, user.privateKey, [group.relay], group.channelId);

      if (result) {
        const adminPubkey = whitelist.admin_pubkey;
        await loadWhitelistData(adminPubkey);
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
    if (whitelist) {
      await loadWhitelistData(whitelist.admin_pubkey);
    }
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

  async function generateInviteLink() {
    try {
      const group = $groupStore;
      
      if (!group || !group.relay || !group.secret) {
        error = 'Gruppe nicht initialisiert';
        return;
      }

      // Generiere Link mit Gruppen-Relay (so wie die Gruppe erstellt wurde)
      const domain = window.location.origin;
      inviteLink = createInviteLink(domain, group.secret, group.relay);
      
      success = 'Link generiert! ✅';
    } catch (e: any) {
      error = e.message || 'Fehler beim Generieren des Links';
    }
  }

  async function copyInviteLink() {
    await copyToClipboard(inviteLink);
  }
</script>

<div class="admin-container">
  <div class="admin-header">
    <h1>🔐 Whitelist-Verwaltung</h1>
    <button class="btn-secondary" on:click={() => goto('/group')}>← Zurück</button>
  </div>

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

      <div class="whitelist-section">
        <div class="section-header">
          <h2>Whitelist ({whitelist.pubkeys.length})</h2>
          <button class="btn-secondary" on:click={handleRefresh} disabled={saving}>
            🔄 Aktualisieren
          </button>
        </div>

        {#if whitelist.pubkeys.length === 0}
          <div class="empty-state">
            <p>Keine Public Keys in der Whitelist</p>
          </div>
        {:else}
          <div class="pubkey-list">
            {#each whitelist.pubkeys as pubkey}
              <div class="pubkey-item">
                <button class="pubkey-hex" on:click={() => copyToClipboard(pubkey)}>
                  {formatPubkey(pubkey)}
                </button>
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

      <div class="invite-section">
        <div class="section-header">
          <h2>🔗 Einladungslink</h2>
        </div>
        
        <p class="hint-text">
          Der Einladungslink wurde bereits bei der Gruppenerstellung generiert.
          Du kannst ihn hier erneut anzeigen und kopieren.
        </p>
        
        <button class="btn-primary full-width" on:click={generateInviteLink}>
          {inviteLink ? '🔄 Erneut anzeigen' : '👁️ Link anzeigen'}
        </button>
        
        {#if inviteLink}
          <div class="invite-link-container">
            <code class="invite-link-text">{inviteLink}</code>
            <button class="btn-secondary" on:click={copyInviteLink}>📋 Kopieren</button>
          </div>
        {/if}
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
  .invite-section {
    background: var(--bg-secondary);
    border-radius: 0.5rem;
    padding: 1.5rem;
  }

  .add-section h2,
  .whitelist-section h2,
  .invite-section h2 {
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

  .pubkey-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .pubkey-item {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    padding: 1rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
  }

  .pubkey-hex {
    flex: 1;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    cursor: pointer;
    padding: 0.5rem;
    background: transparent;
    border: none;
    text-align: left;
    color: var(--primary-color);
  }

  .pubkey-hex:hover {
    text-decoration: underline;
  }

  .invite-link-container {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .invite-link-text {
    flex: 1;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: var(--primary-color);
    word-break: break-all;
    padding: 0.75rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
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
    opacity: 0.9;
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


  .hint-text {
    color: var(--text-muted);
    font-size: 0.9375rem;
    margin-bottom: 1rem;
    line-height: 1.5;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .full-width {
    width: 100%;
  }
</style>
