<script lang="ts">
  import { onMount } from 'svelte';
  // @ts-ignore
  import { goto } from '$app/navigation';
  // @ts-ignore
  import { page } from '$app/stores';
  import { userStore } from '$lib/stores/userStore';
  import { groupStore } from '$lib/stores/groupStore';
  import { parseInviteLink } from '$lib/utils';
  import { validatePrivateKey, validateRelayUrl } from '$lib/security/validation';
  import { loadWhitelist, type WhitelistData } from '$lib/nostr/whitelist';
  import { fetchUserProfile } from '$lib/nostr/client';
  // @ts-ignore
  import { env } from '$env/dynamic/public';
  
  // Admin Public Key (für Whitelist-Verwaltung)
  // Wird aus .env.production geladen, Fallback nur für lokale Entwicklung
  const ADMIN_PUBKEY = env.PUBLIC_ADMIN_PUBKEY || 'npub1z90zurzsh00cmg6qfuyc5ca4auyjsp8kqxyf4hykyynxjj42ps6svpfgt3';

  let nsecInput = '';
  let error = '';
  let loading = false;
  let loadingProfile = false;
  let profileName = '';
  let inviteData: { relay: string; secret: string } | null = null;
  let whitelist: WhitelistData | null = null;
  let whitelistLoading = false;

  onMount(async () => {
    // Parse URL-Parameter
    const url = window.location.href;
    const parsed = parseInviteLink(url);
    
    if (parsed) {
      inviteData = parsed;
      
      // Lade Whitelist vom Relay
      await loadWhitelistFromRelay(parsed.relay);
    } else {
      error = 'Ungültiger Einladungslink. Bitte verwende einen gültigen Link.';
    }
  });

  async function loadWhitelistFromRelay(relay: string) {
    try {
      whitelistLoading = true;
      console.log('📋 Lade Whitelist vom Relay:', relay);
      
      if (!inviteData) {
        console.error('❌ Keine Einladungsdaten vorhanden');
        return;
      }
      
      // Leite channelId aus Secret ab
      const { deriveChannelId } = await import('$lib/nostr/crypto');
      const channelId = await deriveChannelId(inviteData.secret);
      console.log('🔑 Channel ID abgeleitet:', channelId.substring(0, 16) + '...');
      
      // Konvertiere Admin NPUB zu Hex
      const { nip19 } = await import('nostr-tools');
      let adminPubkeyHex = ADMIN_PUBKEY;
      
      if (ADMIN_PUBKEY.startsWith('npub1')) {
        const decoded = nip19.decode(ADMIN_PUBKEY as any);
        if ((decoded as any).type === 'npub') {
          adminPubkeyHex = (decoded as any).data as string;
        }
      }
      
      // Lade Whitelist für diese Gruppe
      whitelist = await loadWhitelist([relay], adminPubkeyHex, channelId);
      
      if (whitelist) {
        console.log('✅ Whitelist für Gruppe geladen:', whitelist.pubkeys.length, 'Einträge');
      } else {
        console.warn('⚠️ Keine Whitelist für diese Gruppe gefunden');
      }
    } catch (e) {
      console.error('❌ Fehler beim Laden der Whitelist:', e);
    } finally {
      whitelistLoading = false;
    }
  }

  async function handleLogin() {
    error = '';
    loading = true;

    try {
      // Validiere NSEC
      const keyValidation = validatePrivateKey(nsecInput);
      if (!keyValidation.valid || !keyValidation.hex) {
        throw new Error(keyValidation.error || 'Ungültiger Private Key');
      }

      // Validiere Relay
      if (!inviteData) {
        throw new Error('Keine Einladungsdaten gefunden');
      }

      const relayValidation = validateRelayUrl(inviteData.relay);
      if (!relayValidation.valid) {
        throw new Error(relayValidation.error || 'Ungültige Relay-URL');
      }

      // Prüfe Whitelist
      const { getPublicKey, nip19 } = await import('nostr-tools');
      const pubkey = getPublicKey(keyValidation.hex! as any);
      
      // Konvertiere Admin NPUB zu Hex für Vergleich
      let adminPubkeyHex = ADMIN_PUBKEY;
      if (ADMIN_PUBKEY.startsWith('npub1')) {
        const decoded = nip19.decode(ADMIN_PUBKEY as any);
        if ((decoded as any).type === 'npub') {
          adminPubkeyHex = (decoded as any).data as string;
        }
      }
      
      // Admin darf sich IMMER einloggen (auch wenn Whitelist leer ist)
      const isAdmin = pubkey.toLowerCase() === adminPubkeyHex.toLowerCase();
      
      if (isAdmin) {
        console.log('✅ Admin-Login erkannt - Whitelist-Prüfung übersprungen');
      } else {
        // Normale Benutzer: Prüfe Whitelist
        if (!whitelist || whitelist.pubkeys.length === 0) {
          throw new Error('Whitelist ist leer. Bitte kontaktiere den Administrator.');
        }
        
        // Prüfe ob Pubkey in Whitelist
        const isInWhitelist = whitelist.pubkeys.some(
          allowed => allowed.toLowerCase() === pubkey.toLowerCase()
        );
        
        if (!isInWhitelist) {
          throw new Error('Dein Public Key ist nicht in der Whitelist. Zugriff verweigert.');
        }
      }

      // Lade Profil vom Nostr-Netzwerk
      loadingProfile = true;
      console.log('👤 Lade Nostr-Profil...');
      
      const profile = await fetchUserProfile(pubkey);
      
      let userName = 'Anonym';
      if (profile) {
        // Priorität: display_name > name > nip05 (nur Username-Teil)
        userName = profile.display_name || profile.name ||
                   (profile.nip05 ? profile.nip05.split('@')[0] : 'Anonym');
        console.log('✅ Profil-Name gefunden:', userName);
        profileName = userName;
      } else {
        console.log('⚠️ Kein Profil gefunden, verwende "Anonym"');
      }
      
      loadingProfile = false;

      // Setze User mit Profil-Namen
      userStore.setUserFromNsec(nsecInput, userName);

      // Initialisiere Gruppe
      await groupStore.initialize(inviteData.secret, inviteData.relay);

      // Lade alle Nachrichten beim ersten Login
      try {
        await groupStore.loadMessages(true);
      } catch (e) {
        console.warn('Nachrichten konnten nicht geladen werden:', e);
      }

      // Prüfe ob ein Chat-Redirect ausstehend ist
      const pendingChatRedirect = localStorage.getItem('pending_chat_redirect');
      if (pendingChatRedirect) {
        // Hole auch den Angebotstext falls vorhanden
        const pendingChatOffer = localStorage.getItem('pending_chat_offer');
        
        // Speichere Angebotstext für Chat-Anzeige
        if (pendingChatOffer) {
          localStorage.setItem(`chat_offer_${pendingChatRedirect}`, pendingChatOffer);
          localStorage.removeItem('pending_chat_offer');
        }
        
        console.log('✅ Redirect zu ausstehenden Chat:', pendingChatRedirect.substring(0, 16) + '...');
        localStorage.removeItem('pending_chat_redirect');
        await goto(`/dm/${pendingChatRedirect}`);
        return;
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

<div class="login-container">
  <div class="login-card card">
    <h1>🔐 NostrGroupChat</h1>
    <p class="subtitle">Dezentraler Gruppen-Chat mit Nostr</p>

    {#if inviteData}
      <div class="invite-info">
        <p><strong>Relay:</strong> {inviteData.relay}</p>
        <p><strong>Gruppe:</strong> {inviteData.secret}</p>
        {#if whitelistLoading}
          <p class="whitelist-status loading">⏳ Lade Whitelist...</p>
        {:else if whitelist}
          <p class="whitelist-status success">✅ Whitelist geladen ({whitelist.pubkeys.length} Einträge)</p>
        {:else}
          <p class="whitelist-status warning">⚠️ Keine Whitelist gefunden</p>
        {/if}
      </div>
    {/if}

    <form on:submit|preventDefault={handleLogin}>
      <div class="form-group">
        <label for="nsec">Private Key (NSEC oder Hex) *</label>
        <input
          id="nsec"
          type="password"
          class="input"
          bind:value={nsecInput}
          placeholder="nsec1... oder hex"
          required
          disabled={loading}
        />
        <small>Dein Private Key wird nur lokal gespeichert und nie übertragen.</small>
      </div>

      {#if loadingProfile}
        <div class="info-message">
          ⏳ Lade dein Nostr-Profil von populären Relays...
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

      <button type="submit" class="btn btn-primary" disabled={loading || loadingProfile || !inviteData}>
        {loading ? 'Verbinde...' : loadingProfile ? 'Lade Profil...' : 'Gruppe beitreten'}
      </button>
    </form>

    <div class="info-box">
      <h3>ℹ️ Hinweise</h3>
      <ul>
        <li>Du benötigst einen gültigen Einladungslink</li>
        <li>Dein Public Key muss in der Whitelist sein</li>
        <li>Dein Name wird automatisch von deinem Nostr-Profil geladen (Kind 0)</li>
        <li>Alle Nachrichten sind Ende-zu-Ende verschlüsselt</li>
        <li>Dein Private Key verlässt niemals deinen Browser</li>
      </ul>
    </div>
  </div>
</div>

<style>
  .login-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .login-card {
    max-width: 500px;
    width: 100%;
  }

  h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    text-align: center;
  }

  .subtitle {
    text-align: center;
    color: var(--text-muted);
    margin-bottom: 2rem;
  }

  .invite-info {
    background-color: var(--bg-color);
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
  }

  .invite-info p {
    margin: 0.25rem 0;
    word-break: break-all;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  small {
    display: block;
    margin-top: 0.5rem;
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  button[type="submit"] {
    width: 100%;
    margin-top: 1rem;
  }

  .info-box {
    margin-top: 2rem;
    padding: 1rem;
    background-color: var(--bg-color);
    border-radius: 0.5rem;
  }

  .info-box h3 {
    font-size: 1rem;
    margin-bottom: 0.75rem;
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

  .whitelist-status {
    margin-top: 0.5rem;
    padding: 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .whitelist-status.loading {
    background-color: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }

  .whitelist-status.success {
    background-color: rgba(16, 185, 129, 0.1);
    color: #10b981;
  }

  .whitelist-status.warning {
    background-color: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
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
</style>