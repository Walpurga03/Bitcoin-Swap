<script lang="ts">
  import { onMount } from 'svelte';
  // @ts-ignore
  import { goto } from '$app/navigation';
  import { userStore } from '$lib/stores/userStore';
  import { groupStore } from '$lib/stores/groupStore';
  import { validatePrivateKey, validateRelayUrl } from '$lib/security/validation';
  import { DEFAULT_RELAYS, GROUP_CONFIG_RELAYS, RELAY_ALIASES } from '$lib/config';
  import { deriveChannelId } from '$lib/nostr/crypto';
  import { saveUserConfig, loadUserConfig, migrateLocalStorageToNostr } from '$lib/nostr/userConfig';
  import { saveGroupConfig, loadGroupAdmin, deriveSecretHash, loadGroupConfigFromRelays } from '$lib/nostr/groupConfig';
  import { createInviteLink } from '$lib/utils';
  import type { UserConfig } from '$lib/nostr/userConfig';

  let mode: 'create' | 'join' = 'create';
  
  // Create Group Form
  let adminNsec = '';
  let groupSecret = '';
  let autoGenerateSecret = true;
  
  // Link-Generierung
  let linkType: 'multi' | 'alias' | 'custom' = 'multi';
  let selectedAlias: number = 1;
  let customLinkRelay = '';
  let generatedInviteLink = '';
  let showLinkSuccess = false;
  let showInfoModal = false;
  
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
      console.log('💾 Speichere Gruppen-Config auf ALLE Multi-Relays...');
      const secretHash = await deriveSecretHash(finalSecret);
      
      const groupConfigData = {
        relay: relay,
        admin_pubkey: pubkey,
        secret_hash: secretHash,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000)
      };
      
      // Publiziere auf ALLE GROUP_CONFIG_RELAYS für echte Multi-Relay-Robustheit
      await saveGroupConfig(groupConfigData, keyValidation.hex!, GROUP_CONFIG_RELAYS);
      console.log('✅ Gruppen-Config auf', GROUP_CONFIG_RELAYS.length, 'Relays publiziert');

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

      // Generiere Einladungslink basierend auf gewähltem Typ
      const domain = window.location.origin;
      let relayForLink: string | number | undefined;
      
      if (linkType === 'multi') {
        relayForLink = undefined; // Kein Relay → Multi-Relay-Fallback
      } else if (linkType === 'alias') {
        relayForLink = selectedAlias; // Zahl 1-5
      } else if (linkType === 'custom') {
        relayForLink = customLinkRelay; // Custom Relay-URL
      }
      
      generatedInviteLink = createInviteLink(domain, finalSecret, relayForLink);
      showLinkSuccess = true;
      
      console.log('🔗 Einladungslink generiert:', {
        type: linkType,
        relay: relayForLink,
        link: generatedInviteLink.substring(0, 50) + '...'
      });

      // KEIN Auto-Redirect mehr → User muss Link kopieren
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

      // Bestimme Relay-Liste
      let relaysToUse: string[] = [];
      
      // Option 1: Relay direkt angegeben (Legacy-Support)
      if (relayParam) {
        const relayValidation = validateRelayUrl(relayParam);
        if (!relayValidation.valid) {
          throw new Error(relayValidation.error || 'Ungültige Relay-URL');
        }
        relaysToUse = [relayParam];
        console.log('📡 Verwende Relay aus Link:', relayParam);
      }
      // Option 2: Relay-Alias (z.B. ?r=1)
      else if (relayAliasParam) {
        const aliasNum = parseInt(relayAliasParam, 10);
        const aliasRelay = RELAY_ALIASES[aliasNum];
        if (aliasRelay) {
          relaysToUse = [aliasRelay];
          console.log('📡 Verwende Relay-Alias', aliasNum, '→', aliasRelay);
        } else {
          console.warn('⚠️ Unbekannter Relay-Alias:', aliasNum, '- verwende Multi-Relay-Fallback');
          relaysToUse = GROUP_CONFIG_RELAYS;
        }
      }
      // Option 3: Kein Relay angegeben → Multi-Relay-Fallback
      else {
        relaysToUse = GROUP_CONFIG_RELAYS;
        console.log('📡 Kein Relay im Link → Multi-Relay-Fallback mit', relaysToUse.length, 'Relays');
      }

      // Validiere NSEC
      const keyValidation = validatePrivateKey(joinNsec);
      if (!keyValidation.valid || !keyValidation.hex) {
        throw new Error(keyValidation.error || 'Ungültiger Private Key');
      }

      // 🔐 Lade GroupConfig (mit Multi-Relay-Fallback)
      console.log('📥 Lade GroupConfig...');
      const groupConfig = await loadGroupConfigFromRelays(secret, relaysToUse);
      
      if (!groupConfig) {
        throw new Error('❌ Gruppe nicht gefunden. Bitte prüfe den Link oder kontaktiere den Admin.');
      }
      
      console.log('✅ GroupConfig geladen von Relay:', groupConfig.relay);
      
      // Extrahiere Relay aus Config für weitere Nutzung
      const relay = groupConfig.relay;

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

        <div class="form-group">
          <div class="form-label-with-info">
            <p class="form-label">Einladungslink-Typ *</p>
            <button 
              type="button" 
              class="btn-info"
              on:click={() => showInfoModal = true}
              title="Erklärung der Link-Typen"
            >
              ℹ️ Info
            </button>
          </div>
          <div class="link-type-options">
            <label class="radio-label">
              <input
                type="radio"
                bind:group={linkType}
                value="multi"
                disabled={loading}
              />
              <div>
                <strong>Multi-Relay (empfohlen)</strong>
                <small>Höchste Privatsphäre - kein Relay im Link</small>
              </div>
            </label>

            <label class="radio-label">
              <input
                type="radio"
                bind:group={linkType}
                value="alias"
                disabled={loading}
              />
              <div>
                <strong>Relay-Alias</strong>
                <small>Kurzer Link mit Alias-Nummer</small>
              </div>
            </label>
            {#if linkType === 'alias'}
              <select
                class="input alias-select"
                bind:value={selectedAlias}
                disabled={loading}
              >
                {#each Object.entries(RELAY_ALIASES) as [num, relay]}
                  <option value={parseInt(num)}>{num}: {relay}</option>
                {/each}
              </select>
            {/if}

            <label class="radio-label">
              <input
                type="radio"
                bind:group={linkType}
                value="custom"
                disabled={loading}
              />
              <div>
                <strong>Eigenes Relay im Link</strong>
                <small>Spezifisches Relay angeben</small>
              </div>
            </label>
            {#if linkType === 'custom'}
              <input
                type="text"
                class="input"
                bind:value={customLinkRelay}
                placeholder="wss://relay.example.com"
                disabled={loading}
              />
            {/if}
          </div>
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

      <!-- Erfolgs-Box nach Gruppenerstellung -->
      {#if showLinkSuccess && generatedInviteLink}
        <div class="success-box">
          <h3>✅ Gruppe erfolgreich erstellt!</h3>
          <p>Kopiere den Einladungslink und teile ihn mit den Teilnehmern:</p>
          
          <div class="link-display">
            <input
              type="text"
              class="input link-input"
              value={generatedInviteLink}
              readonly
            />
            <button
              type="button"
              class="btn btn-secondary"
              on:click={() => {
                navigator.clipboard.writeText(generatedInviteLink);
                alert('Link kopiert! ✅');
              }}
            >
              📋 Kopieren
            </button>
          </div>
          
          <button
            type="button"
            class="btn btn-primary"
            on:click={() => goto('/group')}
          >
            Zur Gruppe →
          </button>
        </div>
      {/if}

      <!-- Info-Modal für Link-Typen -->
      {#if showInfoModal}
        <div 
          class="modal-overlay" 
          on:click={() => showInfoModal = false}
          on:keydown={(e) => e.key === 'Escape' && (showInfoModal = false)}
          role="button"
          tabindex="-1"
        >
          <div 
            class="modal-content" 
            role="dialog"
            aria-labelledby="modal-title"
          >
            <div class="modal-header">
              <h3 id="modal-title">🔗 Einladungslink-Typen Erklärung</h3>
              <button class="modal-close" on:click={() => showInfoModal = false}>✕</button>
            </div>
            
            <div class="modal-body">
              <div class="info-section">
                <h4>🌐 Multi-Relay (empfohlen)</h4>
                <p><strong>Link-Format:</strong> <code>?secret=abc123</code></p>
                <p><strong>Wie funktioniert es?</strong></p>
                <ul>
                  <li>Kein Relay im Link sichtbar → <strong>höchste Privatsphäre</strong></li>
                  <li>App sucht automatisch auf 5 vordefinierten Relays parallel</li>
                  <li>Funktioniert auch wenn ein Relay offline ist</li>
                </ul>
                <p class="recommendation">✅ Beste Wahl für maximale Privacy und Robustheit</p>
              </div>

              <div class="info-section">
                <h4>🔢 Relay-Alias</h4>
                <p><strong>Link-Format:</strong> <code>?r=1&secret=abc123</code></p>
                <p><strong>Wie funktioniert es?</strong></p>
                <ul>
                  <li>Kurze Zahl (1-5) verweist auf vordefiniertes Relay</li>
                  <li>Kürzerer Link als vollständige URL</li>
                  <li>Relay-Zuordnung im Code hinterlegt</li>
                </ul>
                <p class="recommendation">⚖️ Guter Kompromiss: kurz & ausreichend privat</p>
              </div>

              <div class="info-section">
                <h4>🛠️ Eigenes Relay im Link</h4>
                <p><strong>Link-Format:</strong> <code>?relay=wss://custom.relay&secret=abc123</code></p>
                <p><strong>Wie funktioniert es?</strong></p>
                <ul>
                  <li>Du gibst ein spezifisches Relay im Link an</li>
                  <li>Relay-URL steht im Klartext im Link (niedrige Privacy)</li>
                  <li>Gruppendaten werden trotzdem auf alle Standard-Relays repliziert</li>
                  <li>Nützlich wenn Nutzer ein bestimmtes Relay bevorzugen</li>
                </ul>
                <p class="recommendation">⚠️ Niedrigere Privacy - aber volle Kontrolle über primäres Relay</p>
              </div>

              <div class="info-note">
                <strong>💡 Wichtig:</strong> Unabhängig vom Link-Typ werden alle Gruppen-Daten (GroupConfig & Whitelist) 
                automatisch auf 5 Relays repliziert. Das garantiert Ausfallsicherheit - wenn ein Relay offline ist, 
                funktioniert die Gruppe weiterhin. Multi-Relay-Links bieten die beste Privacy!
              </div>
            </div>
          </div>
        </div>
      {/if}
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
        <li><strong>Gruppe beitreten:</strong> Du benötigst einen Einladungslink vom Admin (Format: <code>?secret=...</code> oder <code>?r=1&secret=...</code>)</li>
        <li><strong>Multi-Relay:</strong> Falls kein Relay im Link angegeben ist, werden automatisch mehrere Relays durchsucht</li>
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

  .form-label-with-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .form-label-with-info .form-label {
    margin: 0;
  }

  .btn-info {
    padding: 0.375rem 0.75rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .btn-info:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  /* Modal Styles */
  .modal-overlay {
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
    backdrop-filter: blur(4px);
  }

  .modal-content {
    background: var(--bg-primary);
    border-radius: 1rem;
    max-width: 700px;
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

  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--text-primary);
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    transition: color 0.2s;
  }

  .modal-close:hover {
    color: var(--text-primary);
  }

  .modal-body {
    padding: 1.5rem;
  }

  .info-section {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--bg-secondary);
    border-radius: 0.5rem;
    border-left: 3px solid var(--primary-color);
  }

  .info-section h4 {
    margin: 0 0 0.75rem 0;
    color: var(--text-primary);
    font-size: 1.125rem;
  }

  .info-section p {
    margin: 0.5rem 0;
    color: var(--text-primary);
  }

  .info-section code {
    background: var(--bg-primary);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: var(--primary-color);
  }

  .info-section ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  .info-section li {
    margin: 0.375rem 0;
    color: var(--text-secondary);
  }

  .recommendation {
    margin-top: 0.75rem;
    padding: 0.5rem;
    background: var(--bg-primary);
    border-radius: 0.375rem;
    font-weight: 500;
    font-size: 0.9375rem;
  }

  .info-note {
    background: linear-gradient(135deg, rgba(255, 0, 110, 0.1), rgba(127, 0, 255, 0.1));
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--primary-color);
    color: var(--text-primary);
  }

  .info-note strong {
    color: var(--primary-color);
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