<script lang="ts">
  import { onMount } from 'svelte';
  import { groupStore } from '$lib/stores/groupStore';
  import { userStore } from '$lib/stores/userStore';
  import QRCode from 'qrcode';

  export let show = false;
  export let onClose: () => void;

  let newNpub = '';
  let whitelist: string[] = [];
  let loading = false;
  let error = '';
  let success = '';
  let inviteLink = '';
  let qrCodeDataUrl = '';
  let showQR = false;

  onMount(async () => {
    await loadWhitelist();
    generateInviteLink();
  });

  async function loadWhitelist() {
    try {
      loading = true;
      const group = $groupStore;
      if (!group || !group.relay || !group.secret) {
        throw new Error('Gruppe nicht initialisiert');
      }

      const { loadWhitelist: loadWhitelistFromNostr } = await import('$lib/nostr/whitelist');
      const { deriveChannelId } = await import('$lib/nostr/crypto');
      
      const channelId = await deriveChannelId(group.secret);
      const adminPubkey = $userStore.pubkey;

      if (!adminPubkey) {
        throw new Error('User nicht authentifiziert');
      }

      const whitelistData = await loadWhitelistFromNostr([group.relay], adminPubkey, channelId);
      whitelist = whitelistData?.pubkeys || [];
      
      console.log('✅ Whitelist geladen:', whitelist.length, 'Einträge');
    } catch (e: any) {
      error = 'Fehler beim Laden der Whitelist: ' + e.message;
      console.error(e);
    } finally {
      loading = false;
    }
  }

  async function addToWhitelist() {
    if (!newNpub.trim()) {
      error = 'Bitte NPUB eingeben';
      return;
    }

    try {
      loading = true;
      error = '';
      success = '';

      const { nip19 } = await import('nostr-tools');
      
      // Konvertiere NPUB zu Hex
      let pubkeyHex = newNpub.trim();
      if (pubkeyHex.startsWith('npub1')) {
        const decoded = nip19.decode(pubkeyHex);
        pubkeyHex = decoded.data as string;
      }

      // Prüfe ob bereits in Whitelist
      if (whitelist.includes(pubkeyHex)) {
        error = 'Dieser User ist bereits in der Whitelist';
        return;
      }

      const group = $groupStore;
      if (!group || !group.relay || !group.secret) {
        throw new Error('Gruppe nicht initialisiert');
      }

      const { saveWhitelist } = await import('$lib/nostr/whitelist');
      const { deriveChannelId } = await import('$lib/nostr/crypto');
      
      const channelId = await deriveChannelId(group.secret);
      const adminPrivateKey = $userStore.privateKey;

      if (!adminPrivateKey) {
        throw new Error('Private Key nicht verfügbar');
      }

      // Füge zur Whitelist hinzu
      const updatedWhitelist = [...whitelist, pubkeyHex];
      
      await saveWhitelist(updatedWhitelist, adminPrivateKey, [group.relay], channelId);
      
      whitelist = updatedWhitelist;
      newNpub = '';
      success = '✅ User zur Whitelist hinzugefügt!';
      
      setTimeout(() => success = '', 3000);
    } catch (e: any) {
      error = 'Fehler: ' + e.message;
      console.error(e);
    } finally {
      loading = false;
    }
  }

  async function removeFromWhitelist(pubkeyToRemove: string) {
    if (!confirm('Möchtest du diesen User wirklich aus der Whitelist entfernen?')) {
      return;
    }

    try {
      loading = true;
      error = '';
      success = '';

      const group = $groupStore;
      if (!group || !group.relay || !group.secret) {
        throw new Error('Gruppe nicht initialisiert');
      }

      const { saveWhitelist } = await import('$lib/nostr/whitelist');
      const { deriveChannelId } = await import('$lib/nostr/crypto');
      
      const channelId = await deriveChannelId(group.secret);
      const adminPrivateKey = $userStore.privateKey;

      if (!adminPrivateKey) {
        throw new Error('Private Key nicht verfügbar');
      }

      // Entferne aus Whitelist
      const updatedWhitelist = whitelist.filter(pk => pk !== pubkeyToRemove);
      
      await saveWhitelist(updatedWhitelist, adminPrivateKey, [group.relay], channelId);
      
      whitelist = updatedWhitelist;
      success = '✅ User aus Whitelist entfernt!';
      
      setTimeout(() => success = '', 3000);
    } catch (e: any) {
      error = 'Fehler: ' + e.message;
      console.error(e);
    } finally {
      loading = false;
    }
  }

  function generateInviteLink() {
    const group = $groupStore;
    if (!group || !group.secret) {
      inviteLink = '';
      return;
    }

    // Nur Secret im Link (kein Relay!)
    const baseUrl = window.location.origin;
    inviteLink = `${baseUrl}/?secret=${encodeURIComponent(group.secret)}`;
  }

  async function generateQRCode() {
    try {
      qrCodeDataUrl = await QRCode.toDataURL(inviteLink, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      showQR = true;
    } catch (e) {
      console.error('QR-Code-Fehler:', e);
      error = 'Fehler beim Generieren des QR-Codes';
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    success = '✅ Link kopiert!';
    setTimeout(() => success = '', 2000);
  }

  function truncatePubkey(pubkey: string): string {
    if (!pubkey) return '';
    return pubkey.substring(0, 8) + '...' + pubkey.substring(pubkey.length - 8);
  }

  function handleClose() {
    show = false;
    onClose();
  }
</script>

{#if show}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-backdrop" on:click={handleClose}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal" on:click|stopPropagation>
      <div class="modal-header">
        <h2>🔐 Whitelist verwalten</h2>
        <button class="btn-close" on:click={handleClose}>✕</button>
      </div>

      <div class="modal-content">
        <!-- NPUB hinzufügen -->
        <div class="section">
          <h3>User hinzufügen</h3>
          <div class="add-form">
            <input
              type="text"
              class="input"
              bind:value={newNpub}
              placeholder="npub1... oder hex"
              disabled={loading}
            />
            <button class="btn btn-primary" on:click={addToWhitelist} disabled={loading || !newNpub.trim()}>
              {loading ? '⏳' : '➕'} Hinzufügen
            </button>
          </div>
        </div>

        <!-- Whitelist-Einträge -->
        <div class="section">
          <h3>Erlaubte User ({whitelist.length})</h3>
          {#if whitelist.length === 0}
            <p class="empty-message">Noch keine User in der Whitelist</p>
          {:else}
            <div class="whitelist-items">
              {#each whitelist as pubkey (pubkey)}
                <div class="whitelist-item">
                  <code class="pubkey">{truncatePubkey(pubkey)}</code>
                  <button class="btn-delete" on:click={() => removeFromWhitelist(pubkey)} disabled={loading}>
                    🗑️ Entfernen
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Einladungslink -->
        <div class="section">
          <h3>Einladungslink</h3>
          <div class="invite-link-box">
            <code class="link">{inviteLink}</code>
            <button class="btn btn-secondary btn-sm" on:click={() => copyToClipboard(inviteLink)}>
              📋 Kopieren
            </button>
          </div>
          <button class="btn btn-secondary" on:click={generateQRCode}>
            {showQR ? '🔄 QR-Code neu generieren' : '📱 QR-Code anzeigen'}
          </button>
          
          {#if showQR && qrCodeDataUrl}
            <div class="qr-code-container">
              <img src={qrCodeDataUrl} alt="QR Code" class="qr-code" />
              <p class="qr-hint">User können diesen QR-Code scannen, um beizutreten</p>
            </div>
          {/if}
        </div>

        <!-- Status-Meldungen -->
        {#if error}
          <div class="error-message">{error}</div>
        {/if}
        {#if success}
          <div class="success-message">{success}</div>
        {/if}
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={handleClose}>Fertig</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
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

  .modal {
    background: var(--bg-color);
    border-radius: 1rem;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
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
  }

  .btn-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-muted);
    padding: 0.5rem;
    line-height: 1;
  }

  .btn-close:hover {
    color: var(--text-color);
  }

  .modal-content {
    padding: 1.5rem;
  }

  .section {
    margin-bottom: 2rem;
  }

  .section h3 {
    font-size: 1.1rem;
    margin: 0 0 1rem 0;
    color: var(--accent-color);
  }

  .add-form {
    display: flex;
    gap: 0.5rem;
  }

  .add-form .input {
    flex: 1;
  }

  .input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    background: var(--surface-color);
    color: var(--text-color);
    font-size: 0.875rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 0, 110, 0.4);
  }

  .btn-secondary {
    background: var(--surface-elevated);
    color: var(--text-color);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-color);
  }

  .btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .whitelist-items {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .whitelist-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background: var(--surface-color);
    border-radius: 0.5rem;
    border: 1px solid var(--border-color);
  }

  .pubkey {
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: var(--text-color);
    background: var(--bg-color);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  }

  .btn-delete {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .btn-delete:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.2);
  }

  .empty-message {
    text-align: center;
    color: var(--text-muted);
    padding: 2rem;
    font-style: italic;
  }

  .invite-link-box {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1rem;
  }

  .link {
    flex: 1;
    background: var(--surface-color);
    padding: 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    word-break: break-all;
    border: 1px solid var(--border-color);
    display: block;
  }

  .qr-code-container {
    margin-top: 1rem;
    text-align: center;
    padding: 1rem;
    background: var(--surface-color);
    border-radius: 0.5rem;
  }

  .qr-code {
    max-width: 300px;
    width: 100%;
    height: auto;
  }

  .qr-hint {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .error-message {
    padding: 0.75rem;
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border-radius: 0.5rem;
    border: 1px solid rgba(239, 68, 68, 0.3);
    font-size: 0.875rem;
  }

  .success-message {
    padding: 0.75rem;
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border-radius: 0.5rem;
    font-size: 0.875rem;
  }

  .modal-footer {
    padding: 1.5rem;
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: flex-end;
  }

  @media (max-width: 640px) {
    .add-form {
      flex-direction: column;
    }

    .invite-link-box {
      flex-direction: column;
    }

    .whitelist-item {
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }
  }
</style>
