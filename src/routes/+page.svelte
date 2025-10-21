<script lang="ts">
  import { onMount } from 'svelte';
  // @ts-ignore
  import { goto } from '$app/navigation';
  import { userStore } from '$lib/stores/userStore';
  import { groupStore } from '$lib/stores/groupStore';
  import { validatePrivateKey, validateRelayUrl } from '$lib/security/validation';
  import { DEFAULT_RELAYS } from '$lib/config';
  import { deriveChannelId } from '$lib/nostr/crypto';
  import { saveUserConfig, loadUserConfig, migrateLocalStorageToNostr } from '$lib/nostr/userConfig';
  import { saveGroupConfig, loadGroupAdmin, deriveSecretHash } from '$lib/nostr/groupConfig';
  import type { UserConfig } from '$lib/nostr/userConfig';

  let mode: 'create' | 'join' = 'create';
  
  // Create Group Form
  let adminNsec = '';
  let selectedRelay = DEFAULT_RELAYS[0];
  let customRelay = '';
  let useCustomRelay = false;
  let groupSecret = '';
  let autoGenerateSecret = true;
  
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

  async function handleCreateGroup() {
    error = '';
    loading = true;

    try {
      // Validiere Admin NSEC
      const keyValidation = validatePrivateKey(adminNsec);
      if (!keyValidation.valid || !keyValidation.hex) {
        throw new Error(keyValidation.error || 'Ungültiger Private Key');
      }

      // Bestimme Relay
      const relay = useCustomRelay ? customRelay : selectedRelay;
      const relayValidation = validateRelayUrl(relay);
      if (!relayValidation.valid) {
        throw new Error(relayValidation.error || 'Ungültige Relay-URL');
      }

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
      console.log('💾 Speichere Gruppen-Config auf Nostr...');
      const secretHash = await deriveSecretHash(finalSecret);
      
      const groupConfigData = {
        relay: relay,
        admin_pubkey: pubkey,
        secret_hash: secretHash,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000)
      };
      
      // Publiziere öffentlich
      await saveGroupConfig(groupConfigData, keyValidation.hex!, [relay]);
      console.log('✅ Gruppen-Config publiziert');

      // 🔐 Speichere Admin-Status im Browser (nur für schnelle lokale Checks)
      // Aber: Admin-Status wird primär von Nostr geladen, nicht aus localStorage!
      localStorage.setItem('is_group_admin', 'true');
      localStorage.setItem('admin_pubkey', pubkey);
      localStorage.setItem('group_secret', finalSecret);
      
      console.log('💾 [STORAGE] Admin als Admin erkannt nach Erstellung:', {
        is_group_admin: true,
        admin_pubkey: pubkey.substring(0, 16) + '...',
        group_secret: finalSecret.substring(0, 10) + '...'
      });

      // Initialisiere Gruppe
      await groupStore.initialize(finalSecret, relay);

      // Erstelle leere Whitelist für diese Gruppe
      const channelId = await deriveChannelId(finalSecret);
      console.log('✅ Gruppe erstellt:', {
        admin: pubkey.substring(0, 16) + '...',
        relay,
        channelId: channelId.substring(0, 16) + '...'
      });

      // Weiterleitung zur Gruppen-Seite
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
      const relay = url.searchParams.get('relay');
      const secret = url.searchParams.get('secret');

      if (!relay || !secret) {
        throw new Error('Ungültiger Einladungslink');
      }

      // Validiere NSEC
      const keyValidation = validatePrivateKey(joinNsec);
      if (!keyValidation.valid || !keyValidation.hex) {
        throw new Error(keyValidation.error || 'Ungültiger Private Key');
      }

      // Validiere Relay
      const relayValidation = validateRelayUrl(relay);
      if (!relayValidation.valid) {
        throw new Error(relayValidation.error || 'Ungültige Relay-URL');
      }

      // 🔐 NEU: Versuche Config von Nostr zu laden
      console.log('📥 Versuche Config von Nostr zu laden...');
      let existingConfig: UserConfig | null = null;
      try {
        existingConfig = await loadUserConfig(keyValidation.hex!, [relay]);
        if (existingConfig) {
          console.log('✅ Config von Nostr geladen');
        }
      } catch (configError) {
        // Config existiert nicht oder Relay nicht erreichbar
        // Fahre trotzdem fort mit Login (Config wird beim Speichern erstellt)
        console.log('ℹ️ Keine existierende Config gefunden, wird beim Speichern erstellt');
      }

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
      
      // 🔐 NEU: Lade Admin-Pubkey von öffentlicher Gruppen-Config
      console.log('📥 Lade Admin-Pubkey von Nostr...');
      const secretHash = await deriveSecretHash(secret);
      let adminPubkey = await loadGroupAdmin(secretHash, [relay]);
      
      if (!adminPubkey) {
        throw new Error('❌ Admin-Pubkey nicht gefunden. Diese Gruppe scheint nicht zu existieren.');
      }
      
      console.log('✅ Admin-Pubkey geladen:', adminPubkey.substring(0, 16) + '...');
      
      // Prüfe ob User der Admin ist
      const isAdmin = adminPubkey.toLowerCase() === pubkey.toLowerCase();
      
      console.log('🔐 Admin-Status:', isAdmin ? 'JA ✅' : 'NEIN');
      
      if (!isAdmin) {
        // Nur für normale User: Whitelist-Prüfung
        const whitelist = await loadWhitelist([relay], adminPubkey, channelId);
        
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
      localStorage.setItem('is_group_admin', isAdmin ? 'true' : 'false');
      localStorage.setItem('admin_pubkey', adminPubkey);
      localStorage.setItem('group_secret', secret);
      
      console.log('💾 [STORAGE] Admin-Status gespeichert:', {
        is_group_admin: isAdmin,
        admin_pubkey: adminPubkey.substring(0, 16) + '...',
        group_secret: secret.substring(0, 10) + '...'
      });

      // Initialisiere Gruppe
      await groupStore.initialize(secret, relay);

      // Lade Nachrichten
      try {
        await groupStore.loadMessages(true);
      } catch (e) {
        console.warn('Nachrichten konnten nicht geladen werden:', e);
      }

      // Weiterleitung zum Chat
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
    <h1>🛒 Bitcoin Tausch Netzwerk</h1>
    <p class="subtitle">Dezentraler Gruppen-Chat mit Nostr</p>

    <!-- Mode Toggle -->
    <div class="mode-toggle">
      <button
        class="mode-btn"
        class:active={mode === 'create'}
        on:click={() => mode = 'create'}
      >
        🆕 Neue Gruppe erstellen
      </button>
      <button
        class="mode-btn"
        class:active={mode === 'join'}
        on:click={() => mode = 'join'}
      >
        🔗 Gruppe beitreten
      </button>
    </div>

    {#if mode === 'create'}
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
          <label for="relay">Relay auswählen *</label>
          <div class="relay-options">
            <label class="radio-label">
              <input
                type="radio"
                bind:group={useCustomRelay}
                value={false}
                disabled={loading}
              />
              Standard-Relay
            </label>
            {#if !useCustomRelay}
              <select
                id="relay"
                class="input"
                bind:value={selectedRelay}
                disabled={loading}
              >
                {#each DEFAULT_RELAYS as relay}
                  <option value={relay}>{relay}</option>
                {/each}
              </select>
            {/if}
          </div>
          
          <div class="relay-options">
            <label class="radio-label">
              <input
                type="radio"
                bind:group={useCustomRelay}
                value={true}
                disabled={loading}
              />
              Eigenes Relay
            </label>
            {#if useCustomRelay}
              <input
                type="text"
                class="input"
                bind:value={customRelay}
                placeholder="wss://relay.example.com"
                disabled={loading}
              />
            {/if}
          </div>
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
          <small>Dein Private Key wird nur lokal gespeichert</small>
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
        <li><strong>Neue Gruppe:</strong> Du wirst automatisch Admin und kannst die Whitelist verwalten</li>
        <li><strong>Gruppe beitreten:</strong> Du benötigst einen Einladungslink vom Admin</li>
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
    max-width: 600px;
    width: 100%;
    background: linear-gradient(135deg, var(--surface-color) 0%, var(--surface-elevated) 100%);
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border: 1px solid var(--border-color);
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

  .mode-toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-bottom: 2rem;
    background: var(--bg-color);
    padding: 0.5rem;
    border-radius: 0.75rem;
  }

  .mode-btn {
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 0.5rem;
    background: transparent;
    color: var(--text-muted);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .mode-btn.active {
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    color: white;
    box-shadow: 0 4px 12px rgba(255, 0, 110, 0.3);
  }

  .mode-btn:hover:not(.active) {
    background: var(--surface-color);
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

  .relay-options {
    margin-bottom: 0.75rem;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-weight: normal;
  }

  .radio-label input[type="radio"] {
    width: auto;
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

  @media (max-width: 640px) {
    .card {
      padding: 1.5rem;
    }

    h1 {
      font-size: 1.5rem;
    }

    .mode-toggle {
      grid-template-columns: 1fr;
    }

    .secret-input {
      flex-direction: column;
    }
  }
</style>