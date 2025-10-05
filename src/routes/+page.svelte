<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { userStore } from '$lib/stores/userStore';
  import { groupStore } from '$lib/stores/groupStore';
  import { parseInviteLink } from '$lib/utils';
  import { validatePrivateKey, validateRelayUrl, isInWhitelist } from '$lib/security/validation';
  import { env } from '$env/dynamic/public';
  
  // Fallback für Environment Variable
  const PUBLIC_ALLOWED_PUBKEYS = env.PUBLIC_ALLOWED_PUBKEYS || 'npub1s98sys9c58fy2xn62wp8cy5ke2rak3hjdd3z7ahc4jm5tck4fadqrfd9f5,npub1vj0rae3fxgx5k7uluvgg2fk2hzagaqpqqdxxtt9lrmuqgzwspv6qw5vdam,npub1z90zurzsh00cmg6qfuyc5ca4auyjsp8kqxyf4hykyynxjj42ps6svpfgt3';

  let nsecInput = '';
  let nameInput = '';
  let error = '';
  let loading = false;
  let inviteData: { relay: string; secret: string } | null = null;

  onMount(() => {
    // Parse URL-Parameter
    const url = window.location.href;
    const parsed = parseInviteLink(url);
    
    if (parsed) {
      inviteData = parsed;
    } else {
      error = 'Ungültiger Einladungslink. Bitte verwende einen gültigen Link.';
    }
  });

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
      const pubkey = await import('nostr-tools').then(m => m.getPublicKey(keyValidation.hex!));
      
      if (!isInWhitelist(pubkey, PUBLIC_ALLOWED_PUBKEYS)) {
        throw new Error('Dein Public Key ist nicht in der Whitelist. Zugriff verweigert.');
      }

      // Setze User
      userStore.setUserFromNsec(nsecInput, nameInput || undefined);

      // Initialisiere Gruppe
      await groupStore.initialize(inviteData.secret, inviteData.relay);

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
      </div>
    {/if}

    <form on:submit|preventDefault={handleLogin}>
      <div class="form-group">
        <label for="name">Name (optional)</label>
        <input
          id="name"
          type="text"
          class="input"
          bind:value={nameInput}
          placeholder="Dein Anzeigename"
          disabled={loading}
        />
      </div>

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

      {#if error}
        <div class="error">{error}</div>
      {/if}

      <button type="submit" class="btn btn-primary" disabled={loading || !inviteData}>
        {loading ? 'Verbinde...' : 'Gruppe beitreten'}
      </button>
    </form>

    <div class="info-box">
      <h3>ℹ️ Hinweise</h3>
      <ul>
        <li>Du benötigst einen gültigen Einladungslink</li>
        <li>Dein Public Key muss in der Whitelist sein</li>
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
</style>