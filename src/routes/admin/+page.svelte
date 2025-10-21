<script lang="ts">
  import { onMount } from 'svelte';
  import { userStore } from '$lib/stores/userStore';
  import { groupStore } from '$lib/stores/groupStore';
  import { loadWhitelist, saveWhitelist, addToWhitelist, removeFromWhitelist, type WhitelistData } from '$lib/nostr/whitelist';
  import { validatePublicKey } from '$lib/security/validation';
  import { createInviteLink } from '$lib/utils';
  import { saveUserConfig, loadUserConfig } from '$lib/nostr/userConfig';
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

    // 🔐 NEU: Versuche Config von Nostr zu laden
    let userConfig: UserConfig | null = null;
    if (user.privateKey) {
      try {
        console.log('📥 Lade User-Config von Nostr...');
        userConfig = await loadUserConfig(user.privateKey, [group.relay]);
        if (userConfig) {
          console.log('✅ Config von Nostr geladen');
          // Setze Einladungslink aus Config
          if (userConfig.invite_link) {
            inviteLink = userConfig.invite_link;
          }
        }
      } catch (configError) {
        // Config existiert nicht oder Relay nicht erreichbar
        console.log('ℹ️ Keine Config gefunden oder Relay nicht erreichbar');
        // Zeige Warnung aber blockiere nicht den Zugriff
        error = '⚠️ Warnung: Config konnte nicht von Nostr geladen werden. Relay möglicherweise nicht erreichbar.';
        setTimeout(() => error = '', 5000);
      }
    }

    // Prüfe ob User Admin ist (aus Config oder localStorage)
    const isGroupAdmin = userConfig?.is_group_admin || localStorage.getItem('is_group_admin') === 'true';
    const adminPubkey = userConfig?.admin_pubkey || localStorage.getItem('admin_pubkey');
    
    if (!isGroupAdmin || adminPubkey !== user.pubkey) {
      error = 'Zugriff verweigert. Du bist kein Administrator.';
      setTimeout(() => goto('/group'), 2000);
      return;
    }

    isAdmin = true;
    await loadWhitelistData();
    
    // Fallback: Lade gespeicherten Einladungslink aus localStorage (falls nicht in Config)
    if (!inviteLink) {
      const savedLink = localStorage.getItem('invite_link');
      if (savedLink) {
        inviteLink = savedLink;
      }
    }
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

      // Hole Admin-Pubkey aus localStorage
      const adminPubkey = localStorage.getItem('admin_pubkey');
      if (!adminPubkey) {
        error = 'Admin-Pubkey nicht gefunden';
        return;
      }

      console.log('📋 Lade Whitelist für Gruppe:', group.channelId.substring(0, 16) + '...');
      whitelist = await loadWhitelist([group.relay], adminPubkey, group.channelId);
      
      if (!whitelist) {
        // Erstelle neue leere Whitelist für diese Gruppe
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

  async function generateInviteLink() {
    try {
      const group = $groupStore;
      const user = $userStore;
      
      if (!group || !group.relay) {
        error = 'Gruppe nicht initialisiert';
        return;
      }

      if (!user || !user.privateKey) {
        error = 'Nicht eingeloggt';
        return;
      }

      // Hole Secret aus localStorage
      const secret = localStorage.getItem('group_secret');
      if (!secret) {
        error = 'Secret nicht gefunden. Bitte melde dich neu an.';
        return;
      }

      // Generiere Link mit aktueller Domain
      const domain = window.location.origin;
      inviteLink = createInviteLink(domain, group.relay, secret);
      
      // 🔐 NEU: Speichere Link in User-Config auf Nostr
      console.log('💾 Speichere Einladungslink in User-Config...');
      
      const adminPubkey = localStorage.getItem('admin_pubkey');
      if (!adminPubkey) {
        error = 'Admin-Pubkey nicht gefunden';
        return;
      }

      const config: UserConfig = {
        is_group_admin: true,
        admin_pubkey: adminPubkey,
        group_secret: secret,
        invite_link: inviteLink,  // 🔐 Link in Config speichern
        relay: group.relay,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000)
      };

      try {
        await saveUserConfig(config, user.privateKey, [group.relay]);
        console.log('✅ Einladungslink in Config gespeichert');
        success = 'Einladungslink generiert und auf Nostr gespeichert!';
      } catch (configError: any) {
        console.error('❌ Config konnte nicht auf Nostr gespeichert werden:', configError);
        error = configError.message || '❌ Relay nicht erreichbar. Link konnte nicht gespeichert werden.';
        inviteLink = ''; // Reset Link da Speicherung fehlgeschlagen
      }
    } catch (e: any) {
      error = `Fehler beim Generieren: ${e.message}`;
    }
  }

  async function copyInviteLink() {
    await copyToClipboard(inviteLink);
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

      <!-- Invite Link Section -->
      <div class="invite-section">
        <div class="section-header">
          <h2>🔗 Einladungslink</h2>
          {#if !inviteLink}
            <button class="btn-primary" on:click={generateInviteLink}>
              ✨ Link generieren
            </button>
          {:else}
            <button class="btn-secondary" on:click={generateInviteLink}>
              🔄 Neu generieren
            </button>
          {/if}
        </div>
        
        {#if inviteLink}
          <div class="invite-link-container">
            <div class="invite-link-display">
              <code class="invite-link-text">{inviteLink}</code>
            </div>
            <button class="btn-secondary" on:click={copyInviteLink}>
              📋 Kopieren
            </button>
          </div>
          <p class="hint">
            💡 Dieser Link ist permanent gespeichert. Teile ihn mit Benutzern, die du zur Gruppe einladen möchtest.
            Sie müssen sich mit ihrem nsec anmelden und werden gegen die Whitelist geprüft.
          </p>
        {:else}
          <p class="hint">
            ℹ️ Generiere einen Einladungslink, um neue Benutzer zur Gruppe einzuladen.
            Der Link wird automatisch gespeichert und bleibt verfügbar.
          </p>
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
          <li>Generiere Einladungslinks für neue Benutzer über den "Einladungslink" Bereich</li>
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
  .invite-section,
  .info-section {
    background: var(--bg-secondary);
    border-radius: 0.5rem;
    padding: 1.5rem;
  }

  .add-section h2,
  .whitelist-section h2,
  .invite-section h2,
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
  .invite-link-container {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    margin-bottom: 1rem;
  }

  .invite-link-display {
    flex: 1;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    padding: 0.75rem;
    overflow-x: auto;
  }

  .invite-link-text {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: var(--primary-color);
    word-break: break-all;
  }

  .hint {
    font-size: 0.875rem;
    color: var(--text-muted);
    line-height: 1.5;
    padding: 0.75rem;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(147, 51, 234, 0.05));
    border-radius: 0.375rem;
    border: 1px solid rgba(59, 130, 246, 0.2);
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

    .invite-link-container {
      flex-direction: column;
    }

    .invite-link-display {
      width: 100%;
    }
  }
</style>