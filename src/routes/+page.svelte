<script lang="ts">
  import { onMount } from 'svelte';
  // @ts-ignore
  import { goto } from '$app/navigation';
  import { userStore } from '$lib/stores/userStore';
  import { groupStore } from '$lib/stores/groupStore';
  

  import { validatePrivateKey, validateRelayUrl } from '$lib/security/validation';
  import { DEFAULT_RELAYS } from '$lib/config';
  import { deriveChannelId } from '$lib/nostr/crypto';
  import { saveUserConfig, loadUserConfig } from '$lib/nostr/userConfig';
  import { saveGroupConfig, loadGroupAdmin, deriveSecretHash, loadGroupConfigFromRelays } from '$lib/nostr/groupConfig';
  import type { UserConfig } from '$lib/nostr/userConfig';
  import { getPublicKey, nip19 } from 'nostr-tools';

  let mode: 'create' | 'join' = 'create';
  
  // Create Group Form
  let adminNsec = '';
  let groupSecret = '';
  let autoGenerateSecret = true;
  
  // Keypair-Generator für Login
  let showKeypairGenerator = false;
  let generatedNsec = '';
  let generatedNpub = '';
  
  // Join Group Form (für normale User)
  let joinNsec = '';
  let inviteLink = '';
  
  let error = '';
  let loading = false;
  let loadingProfile = false;
  let profileName = '';

  onMount(() => {
    // Prüfe ob bereits eingeloggt
    if ($userStore.isAuthenticated) {
      goto('/group');
    }
    
    // Prüfe ob Einladungslink in URL (dann zeige Join-Modus)
    const params = new URLSearchParams(window.location.search);
    const secret = params.get('secret');
    if (secret) {
      mode = 'join';
      // Extrahiere Link automatisch
      inviteLink = window.location.href;
    }
  });

  function generateRandomSecret(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function handleGenerateSecret() {
    groupSecret = generateRandomSecret();
    autoGenerateSecret = false;
  }

  function handleGenerateKeypair() {
    // Generiere neues Keypair mit nostr-tools
    const privateKeyBytes = new Uint8Array(32);
    crypto.getRandomValues(privateKeyBytes);
    const privateKeyHex = Array.from(privateKeyBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const publicKeyHex = getPublicKey(privateKeyHex as any);
    
    // Konvertiere zu bech32 Format (nip19 erwartet Uint8Array)
    generatedNsec = nip19.nsecEncode(privateKeyBytes);
    generatedNpub = nip19.npubEncode(publicKeyHex);
    
    // Zeige Generator
    showKeypairGenerator = true;
    
    // Setze NSEC ins Eingabefeld
    joinNsec = generatedNsec;
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  async function handleCreateGroup() {
    error = '';
    loading = true;

    try {
      // Validiere Admin NSEC
      const keyValidation = validatePrivateKey(adminNsec);
      if (!keyValidation.valid || !keyValidation.hex) {
        throw new Error(keyValidation.error || 'Ungültiger Private Key');
      }

      // Verwende Standard-Relay für Admin-Login/Whitelist
      const relay = DEFAULT_RELAYS[0];

      // Generiere Secret falls nötig
      let finalSecret = groupSecret.trim();
      if (!finalSecret || autoGenerateSecret) {
        finalSecret = generateRandomSecret();
        groupSecret = finalSecret;
      }

      if (finalSecret.length < 8) {
        throw new Error('Secret muss mindestens 8 Zeichen lang sein');
      }

      // Lade Profil
      loadingProfile = true;
      const { getPublicKey } = await import('nostr-tools');
      const { fetchUserProfile } = await import('$lib/nostr/client');
      
      const pubkey = getPublicKey(keyValidation.hex! as any);
      const profile = await fetchUserProfile(pubkey);
      
      let userName = 'Admin';
      if (profile) {
        userName = profile.display_name || profile.name ||
                   (profile.nip05 ? profile.nip05.split('@')[0] : 'Admin');
        profileName = userName;
      }
      
      loadingProfile = false;

      // Setze User als Admin
      userStore.setUserFromNsec(adminNsec, userName);
      
      // 🔐 NEU: Speichere Gruppen-Config öffentlich (für Admin-Erkennung)
      console.log('💾 Speichere Gruppen-Config...');
      const secretHash = await deriveSecretHash(finalSecret);
      
      const groupConfigData = {
        relay: relay,
        admin_pubkey: pubkey,
        secret_hash: secretHash,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000)
      };
      
      // Publiziere auf den ausgewählten Relay
      await saveGroupConfig(groupConfigData, keyValidation.hex!, [relay]);
      console.log('✅ Gruppen-Config publiziert');

        // Kein localStorage mehr: Admin-Status, Pubkey und Secret werden NICHT mehr im Browser gespeichert.
        // Admin-Status wird immer live vom Relay geladen.
        console.log('� [SECURITY] Admin-Status, Pubkey und Secret werden NICHT im localStorage gespeichert.');

      // Initialisiere Gruppe
      await groupStore.initialize(finalSecret, relay);

      // Erstelle leere Whitelist für diese Gruppe
      const channelId = await deriveChannelId(finalSecret);
      console.log('✅ Gruppe erstellt:', {
        admin: pubkey.substring(0, 16) + '...',
        relay,
        channelId: channelId.substring(0, 16) + '...'
      });

      // Navigiere direkt zum Angebotsraum (Link wird später im WhitelistModal generiert)
      await goto('/group');
    } catch (e: any) {
      error = e.message || 'Ein Fehler ist aufgetreten';
    } finally {
      loading = false;
    }
  }

  async function handleJoinGroup() {
    error = '';
    loading = true;

    try {
      // Parse Einladungslink
      const url = new URL(inviteLink);
      const relayParam = url.searchParams.get('relay');
      const relayAliasParam = url.searchParams.get('r');
      const secret = url.searchParams.get('secret');

      if (!secret) {
        throw new Error('Ungültiger Einladungslink - Secret fehlt');
      }

      // Bestimme Relay aus Link
      let relay: string;
      
      if (relayParam) {
        const relayValidation = validateRelayUrl(relayParam);
        if (!relayValidation.valid) {
          throw new Error(relayValidation.error || 'Ungültige Relay-URL');
        }
        relay = relayParam;
        console.log('📡 Verwende Relay aus Link:', relay);
      } else {
        // Fallback: Lade GroupConfig vom Standard-Relay
        relay = DEFAULT_RELAYS[0];
        console.log('📡 Kein Relay im Link → Verwende Standard-Relay:', relay);
      }

      // Validiere NSEC
      const keyValidation = validatePrivateKey(joinNsec);
      if (!keyValidation.valid || !keyValidation.hex) {
        throw new Error(keyValidation.error || 'Ungültiger Private Key');
      }

      // 🔐 Lade GroupConfig vom Relay
      console.log('📥 Lade GroupConfig von Relay:', relay);
      const groupConfig = await loadGroupConfigFromRelays(secret, [relay]);
      
      if (!groupConfig) {
        throw new Error('❌ Gruppe nicht gefunden. Bitte prüfe den Link oder kontaktiere den Admin.');
      }
      
      console.log('✅ GroupConfig geladen');
      
      // Verwende Relay aus Config
      const configRelay = groupConfig.relay;

      // Lade Profil
      loadingProfile = true;
      const { getPublicKey } = await import('nostr-tools');
      const { fetchUserProfile } = await import('$lib/nostr/client');
      const { loadWhitelist } = await import('$lib/nostr/whitelist');
      
      const pubkey = getPublicKey(keyValidation.hex! as any);
      const profile = await fetchUserProfile(pubkey);
      
      let userName = 'Anonym';
      if (profile) {
        userName = profile.display_name || profile.name ||
                   (profile.nip05 ? profile.nip05.split('@')[0] : 'Anonym');
        profileName = userName;
      }
      
      loadingProfile = false;

      // Prüfe Whitelist (außer für Admin)
      const channelId = await deriveChannelId(secret);
      
      // 🔐 Extrahiere Admin-Pubkey aus GroupConfig
      const adminPubkey = groupConfig.admin_pubkey;
      console.log('✅ Admin-Pubkey aus GroupConfig:', adminPubkey.substring(0, 16) + '...');
      
      // Prüfe ob User der Admin ist
      const isAdmin = adminPubkey.toLowerCase() === pubkey.toLowerCase();
      
      console.log('🔐 Admin-Status:', isAdmin ? 'JA ✅' : 'NEIN');
      
      if (!isAdmin) {
        // Nur für normale User: Whitelist-Prüfung
        const whitelist = await loadWhitelist([configRelay], adminPubkey, channelId);
        
        if (!whitelist || whitelist.pubkeys.length === 0) {
          throw new Error('Whitelist ist leer. Bitte kontaktiere den Administrator.');
        }

        // Prüfe ob User in Whitelist
        const isInWhitelist = whitelist.pubkeys.some(
          allowed => allowed.toLowerCase() === pubkey.toLowerCase()
        );

        if (!isInWhitelist) {
          throw new Error('Dein Public Key ist nicht in der Whitelist. Zugriff verweigert.');
        }
      } else {
        console.log('✅ Admin-Login erkannt - Whitelist-Prüfung übersprungen');
      }

      // Setze User
      userStore.setUserFromNsec(joinNsec, userName);
      
      // Speichere Admin-Status im Browser
        // Kein localStorage mehr: Admin-Status, Pubkey und Secret werden NICHT mehr im Browser gespeichert.
        // Admin-Status wird immer live vom Relay geladen.
        console.log('� [SECURITY] Admin-Status, Pubkey und Secret werden NICHT im localStorage gespeichert.');

      // Initialisiere Gruppe
      await groupStore.initialize(secret, configRelay);

      // Weiterleitung zum Marketplace (kein Gruppen-Chat mehr!)
      await goto('/group');
    } catch (e: any) {
      error = e.message || 'Ein Fehler ist aufgetreten';
    } finally {
      loading = false;
    }
  }
</script>

<div class="container">
  <div class="card">
    <h1 class="title">🪙 Bitcoin Tausch Netzwerk</h1>
    <p class="subtitle">Dezentraler P2P-Marketplace mit Nostr</p>    {#if mode === 'create'}
      <!-- Create Group Form -->
      <form on:submit|preventDefault={handleCreateGroup}>
        <h2>Neue Gruppe erstellen</h2>
        <p class="info">Als Gruppen-Admin kannst du die Whitelist verwalten und Einladungslinks erstellen.</p>

        <div class="form-group">
          <label for="admin-nsec">Dein Private Key (NSEC) *</label>
          <input
            id="admin-nsec"
            type="password"
            class="input"
            bind:value={adminNsec}
            placeholder="nsec1... oder hex"
            required
            disabled={loading}
          />
          <small>Du wirst automatisch Admin dieser Gruppe</small>
        </div>

        <div class="form-group">
          <label for="secret">Gruppen-Secret *</label>
          <div class="secret-input">
            <input
              id="secret"
              type="text"
              class="input"
              bind:value={groupSecret}
              placeholder="Wird automatisch generiert..."
              disabled={loading || autoGenerateSecret}
            />
            <button
              type="button"
              class="btn btn-secondary"
              on:click={handleGenerateSecret}
              disabled={loading}
            >
              🎲 Generieren
            </button>
          </div>
          <label class="checkbox-label">
            <input
              type="checkbox"
              bind:checked={autoGenerateSecret}
              disabled={loading}
            />
            Automatisch generieren
          </label>
          <small>Das Secret wird für die Verschlüsselung verwendet (min. 8 Zeichen)</small>
        </div>

        {#if loadingProfile}
          <div class="info-message">
            ⏳ Lade dein Nostr-Profil...
          </div>
        {/if}

        {#if profileName}
          <div class="success-message">
            ✅ Profil gefunden: <strong>{profileName}</strong>
          </div>
        {/if}

        {#if error}
          <div class="error">{error}</div>
        {/if}

        <button type="submit" class="btn btn-primary" disabled={loading || loadingProfile}>
          {loading ? '⏳ Erstelle Gruppe...' : loadingProfile ? 'Lade Profil...' : '🚀 Gruppe erstellen'}
        </button>
      </form>
    {:else}
      <!-- Join Group Form -->
      <form on:submit|preventDefault={handleJoinGroup}>
        <h2>Gruppe beitreten</h2>
        <p class="info">Trete einer bestehenden Gruppe mit einem Einladungslink bei.</p>

        <!-- Sicherheitshinweis -->
        <div class="security-warning">
          <h3>🔒 Sicherheitsempfehlung</h3>
          <p><strong>Erstelle ein neues Schlüsselpaar nur für diese App!</strong></p>
          <p>Nutze nicht deinen Haupt-NSEC, den du für andere Nostr-Apps verwendest.</p>
          
          <button 
            type="button" 
            class="btn btn-secondary"
            on:click={handleGenerateKeypair}
            disabled={loading}
          >
            🔑 Neues Schlüsselpaar generieren
          </button>
        </div>

        {#if showKeypairGenerator && generatedNsec}
          <div class="keypair-display">
            <h4>✅ Neues Schlüsselpaar erstellt</h4>
            <div class="key-item">
              <span class="key-label">NSEC (Private Key) - Sicher speichern!</span>
              <div class="key-copy">
                <code>{generatedNsec}</code>
                <button type="button" class="btn-copy" on:click={() => copyToClipboard(generatedNsec)}>
                  📋 Kopieren
                </button>
              </div>
            </div>
            <div class="key-item">
              <span class="key-label">NPUB (Public Key)</span>
              <div class="key-copy">
                <code>{generatedNpub}</code>
                <button type="button" class="btn-copy" on:click={() => copyToClipboard(generatedNpub)}>
                  📋 Kopieren
                </button>
              </div>
            </div>
            <small class="warning">⚠️ Speichere deinen NSEC sicher (z.B. Passwort-Manager)! Ohne ihn verlierst du den Zugang.</small>
          </div>
        {/if}

        <div class="form-group">
          <label for="invite-link">Einladungslink *</label>
          <input
            id="invite-link"
            type="text"
            class="input"
            bind:value={inviteLink}
            placeholder="https://..."
            required
            disabled={loading}
          />
          <small>Link vom Gruppen-Admin erhalten</small>
        </div>

        <div class="form-group">
          <label for="join-nsec">Dein Private Key (NSEC) *</label>
          <input
            id="join-nsec"
            type="password"
            class="input"
            bind:value={joinNsec}
            placeholder="nsec1... oder hex"
            required
            disabled={loading}
          />
          <small>⚠️ Nur verwenden, wenn du ein separates NSEC für diese App hast</small>
        </div>

        {#if loadingProfile}
          <div class="info-message">
            ⏳ Lade dein Nostr-Profil...
          </div>
        {/if}

        {#if profileName}
          <div class="success-message">
            ✅ Profil gefunden: <strong>{profileName}</strong>
          </div>
        {/if}

        {#if error}
          <div class="error">{error}</div>
        {/if}

        <button type="submit" class="btn btn-primary" disabled={loading || loadingProfile}>
          {loading ? '⏳ Trete bei...' : loadingProfile ? 'Lade Profil...' : '🔗 Gruppe beitreten'}
        </button>
      </form>
    {/if}

    <div class="info-box">
      <h3>ℹ️ Hinweise</h3>
      <ul>
        <li><strong>Neue Gruppe:</strong> Du wirst automatisch Admin und kannst die Whitelist im Angebotsraum verwalten</li>
        <li><strong>Gruppe beitreten:</strong> Du benötigst einen Einladungslink vom Admin (Format: <code>?secret=...</code>)</li>
        <li><strong>Einladungslink:</strong> Admin erstellt den Link nach Gruppenerstellung im Whitelist-Modal</li>
        <li><strong>Sicherheit:</strong> Dein Private Key verlässt niemals deinen Browser</li>
        <li><strong>Verschlüsselung:</strong> Alle Nachrichten sind Ende-zu-Ende verschlüsselt</li>
      </ul>
    </div>
  </div>
</div>

<style>
  .container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: linear-gradient(135deg, var(--bg-color) 0%, var(--bg-secondary) 100%);
  }

  .card {
    max-width: 900px;
    width: 100%;
    background: linear-gradient(135deg, var(--surface-color) 0%, var(--surface-elevated) 100%);
    border-radius: 1rem;
    padding: 2.5rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-color);
  }

  /* Responsive: auf kleinen Bildschirmen schmaler */
  @media (max-width: 768px) {
    .card {
      max-width: 600px;
      padding: 1.5rem;
    }
  }

  h1 {
    font-size: 2rem;
    margin: 0 0 0.5rem 0;
    text-align: center;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    text-align: center;
    color: var(--text-muted);
    margin: 0 0 2rem 0;
  }

  h2 {
    font-size: 1.5rem;
    margin: 0 0 0.5rem 0;
  }

  .info {
    color: var(--text-muted);
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-color);
  }

  .input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    background-color: var(--surface-color);
    color: var(--text-color);
    font-size: 1rem;
    transition: border-color 0.2s;
  }

  .input:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  small {
    display: block;
    margin-top: 0.5rem;
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
    font-weight: normal;
  }

  .checkbox-label input[type="checkbox"] {
    width: auto;
  }

  .secret-input {
    display: flex;
    gap: 0.5rem;
  }

  .secret-input .input {
    flex: 1;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 1rem;
  }

  .btn-primary {
    width: 100%;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    color: white;
    box-shadow: 0 4px 12px rgba(255, 0, 110, 0.3);
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 0, 110, 0.4);
  }

  .btn-secondary {
    background: var(--surface-elevated);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    white-space: nowrap;
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-color);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .info-message {
    padding: 0.75rem;
    background-color: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .success-message {
    padding: 0.75rem;
    background-color: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .error {
    padding: 0.75rem;
    background-color: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .info-box {
    margin-top: 2rem;
    padding: 1.5rem;
    background: var(--bg-color);
    border-radius: 0.75rem;
    border: 1px solid var(--border-color);
  }

  .info-box h3 {
    font-size: 1rem;
    margin: 0 0 0.75rem 0;
  }

  .info-box ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .info-box li {
    margin: 0.5rem 0;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .security-warning {
    background: linear-gradient(135deg, rgba(255, 165, 0, 0.1) 0%, rgba(255, 165, 0, 0.05) 100%);
    border: 2px solid rgba(255, 165, 0, 0.3);
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .security-warning h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
    color: var(--accent-color);
  }

  .security-warning p {
    margin: 0.5rem 0;
    font-size: 0.9rem;
  }

  .security-warning .btn {
    margin-top: 1rem;
    width: 100%;
  }

  .keypair-display {
    background: var(--surface-elevated);
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .keypair-display h4 {
    margin: 0 0 1rem 0;
    color: #10b981;
    font-size: 1rem;
  }

  .key-item {
    margin-bottom: 1rem;
  }

  .key-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-color);
  }

  .key-copy {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .key-copy code {
    flex: 1;
    background: var(--bg-color);
    padding: 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    word-break: break-all;
    border: 1px solid var(--border-color);
  }

  .btn-copy {
    padding: 0.5rem 1rem;
    background: var(--accent-color);
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    white-space: nowrap;
    transition: all 0.2s;
  }

  .btn-copy:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
  }

  .keypair-display .warning {
    display: block;
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 0.5rem;
    color: #ef4444;
    font-size: 0.875rem;
  }

  @media (max-width: 640px) {
    .card {
      padding: 1.5rem;
    }

    h1 {
      font-size: 1.5rem;
    }

    .secret-input {
      flex-direction: column;
    }

    .key-copy {
      flex-direction: column;
    }

    .btn-copy {
      width: 100%;
    }
  }
</style>