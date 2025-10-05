<script lang="ts">
  import { validatePrivateKey, validatePublicKey, validateRelayUrl, isInWhitelist } from '$lib/security/validation';
  import { getPublicKeyFromPrivate, pubkeyToNpub, privkeyToNsec } from '$lib/nostr/crypto';

  let nsecInput = '';
  let npubInput = '';
  let relayInput = 'wss://nostr-relay.online';
  let whitelistInput = 'npub1test123,npub1test456';
  
  let results: string[] = [];

  function testNsecValidation() {
    results = [...results, '\n=== NSEC Validierung ==='];
    const validation = validatePrivateKey(nsecInput);
    
    if (validation.valid && validation.hex) {
      results = [...results, `✅ NSEC ist gültig`];
      results = [...results, `Hex: ${validation.hex}`];
      
      try {
        const pubkey = getPublicKeyFromPrivate(validation.hex);
        results = [...results, `Public Key: ${pubkey}`];
        results = [...results, `NPUB: ${pubkeyToNpub(pubkey)}`];
      } catch (e: any) {
        results = [...results, `❌ Fehler beim Ableiten des Public Keys: ${e.message}`];
      }
    } else {
      results = [...results, `❌ NSEC ungültig: ${validation.error}`];
    }
  }

  function testNpubValidation() {
    results = [...results, '\n=== NPUB Validierung ==='];
    const validation = validatePublicKey(npubInput);
    
    if (validation.valid && validation.hex) {
      results = [...results, `✅ NPUB ist gültig`];
      results = [...results, `Hex: ${validation.hex}`];
    } else {
      results = [...results, `❌ NPUB ungültig: ${validation.error}`];
    }
  }

  function testRelayValidation() {
    results = [...results, '\n=== Relay Validierung ==='];
    const validation = validateRelayUrl(relayInput);
    
    if (validation.valid) {
      results = [...results, `✅ Relay-URL ist gültig: ${relayInput}`];
    } else {
      results = [...results, `❌ Relay-URL ungültig: ${validation.error}`];
    }
  }

  function testWhitelist() {
    results = [...results, '\n=== Whitelist Test ==='];
    
    if (!npubInput) {
      results = [...results, `❌ Bitte NPUB eingeben`];
      return;
    }

    const validation = validatePublicKey(npubInput);
    if (!validation.valid || !validation.hex) {
      results = [...results, `❌ Ungültiger NPUB`];
      return;
    }

    const isAllowed = isInWhitelist(validation.hex, whitelistInput);
    
    if (isAllowed) {
      results = [...results, `✅ Public Key ist in der Whitelist`];
    } else {
      results = [...results, `❌ Public Key ist NICHT in der Whitelist`];
    }
  }

  function testInvalidInputs() {
    results = [...results, '\n=== Ungültige Eingaben Test ==='];
    
    const tests = [
      { input: '', name: 'Leerer String' },
      { input: 'invalid', name: 'Ungültiger String' },
      { input: '123', name: 'Nur Zahlen' },
      { input: 'nsec1invalid', name: 'Ungültiges NSEC' },
      { input: 'a'.repeat(63), name: 'Zu kurzer Hex (63 Zeichen)' },
      { input: 'a'.repeat(65), name: 'Zu langer Hex (65 Zeichen)' }
    ];

    for (const test of tests) {
      const validation = validatePrivateKey(test.input);
      if (!validation.valid) {
        results = [...results, `✅ ${test.name}: Korrekt als ungültig erkannt`];
      } else {
        results = [...results, `❌ ${test.name}: Fälschlicherweise als gültig erkannt`];
      }
    }
  }

  function testRelayUrls() {
    results = [...results, '\n=== Relay URL Tests ==='];
    
    const tests = [
      { url: 'wss://relay.damus.io', valid: true },
      { url: 'wss://nostr-relay.online', valid: true },
      { url: 'ws://localhost:8080', valid: true },
      { url: 'https://relay.com', valid: false },
      { url: 'http://relay.com', valid: false },
      { url: 'relay.com', valid: false },
      { url: '', valid: false }
    ];

    for (const test of tests) {
      const validation = validateRelayUrl(test.url);
      const passed = validation.valid === test.valid;
      
      if (passed) {
        results = [...results, `✅ ${test.url || '(leer)'}: Korrekt validiert`];
      } else {
        results = [...results, `❌ ${test.url || '(leer)'}: Falsch validiert`];
      }
    }
  }

  function generateTestKeys() {
    results = [...results, '\n=== Test-Keys generieren ==='];
    
    // Generiere einen zufälligen Hex-Key (32 Bytes = 64 Hex-Zeichen)
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    results = [...results, `Test Private Key (Hex): ${randomHex}`];
    
    try {
      const nsec = privkeyToNsec(randomHex);
      results = [...results, `Test Private Key (NSEC): ${nsec}`];
      
      const pubkey = getPublicKeyFromPrivate(randomHex);
      results = [...results, `Test Public Key (Hex): ${pubkey}`];
      
      const npub = pubkeyToNpub(pubkey);
      results = [...results, `Test Public Key (NPUB): ${npub}`];
      
      results = [...results, `✅ Test-Keys erfolgreich generiert`];
    } catch (e: any) {
      results = [...results, `❌ Fehler: ${e.message}`];
    }
  }

  function clearResults() {
    results = [];
  }

  function runAllTests() {
    clearResults();
    testNsecValidation();
    testNpubValidation();
    testRelayValidation();
    testWhitelist();
    testInvalidInputs();
    testRelayUrls();
    generateTestKeys();
  }
</script>

<div class="container">
  <div class="card">
    <h1>🧪 Login-Validierung Tests</h1>
    <p class="subtitle">Teste verschiedene Validierungs-Szenarien</p>

    <div class="form-section">
      <h2>Test-Eingaben</h2>
      
      <div class="form-group">
        <label for="nsec">Private Key (NSEC oder Hex)</label>
        <input 
          id="nsec" 
          type="text" 
          class="input" 
          bind:value={nsecInput}
          placeholder="nsec1... oder hex"
        />
      </div>

      <div class="form-group">
        <label for="npub">Public Key (NPUB oder Hex)</label>
        <input 
          id="npub" 
          type="text" 
          class="input" 
          bind:value={npubInput}
          placeholder="npub1... oder hex"
        />
      </div>

      <div class="form-group">
        <label for="relay">Relay URL</label>
        <input 
          id="relay" 
          type="text" 
          class="input" 
          bind:value={relayInput}
        />
      </div>

      <div class="form-group">
        <label for="whitelist">Whitelist (komma-separiert)</label>
        <input 
          id="whitelist" 
          type="text" 
          class="input" 
          bind:value={whitelistInput}
        />
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-primary" on:click={runAllTests}>
        Alle Tests ausführen
      </button>
      <button class="btn btn-secondary" on:click={clearResults}>
        Ergebnisse löschen
      </button>
    </div>

    <div class="manual-tests">
      <h2>Einzelne Tests</h2>
      <div class="button-grid">
        <button class="btn btn-secondary" on:click={testNsecValidation}>
          NSEC validieren
        </button>
        <button class="btn btn-secondary" on:click={testNpubValidation}>
          NPUB validieren
        </button>
        <button class="btn btn-secondary" on:click={testRelayValidation}>
          Relay validieren
        </button>
        <button class="btn btn-secondary" on:click={testWhitelist}>
          Whitelist prüfen
        </button>
        <button class="btn btn-secondary" on:click={testInvalidInputs}>
          Ungültige Eingaben
        </button>
        <button class="btn btn-secondary" on:click={testRelayUrls}>
          Relay URLs
        </button>
        <button class="btn btn-secondary" on:click={generateTestKeys}>
          Test-Keys generieren
        </button>
      </div>
    </div>

    {#if results.length > 0}
      <div class="results-section">
        <h2>Test-Ergebnisse</h2>
        <div class="results-log">
          {#each results as result}
            <div class="log-entry">{result}</div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="info-box">
      <h3>ℹ️ Test-Szenarien</h3>
      <ul>
        <li><strong>NSEC Validierung:</strong> Prüft ob NSEC oder Hex-Format gültig ist</li>
        <li><strong>NPUB Validierung:</strong> Prüft ob NPUB oder Hex-Format gültig ist</li>
        <li><strong>Relay Validierung:</strong> Prüft ob URL mit wss:// oder ws:// beginnt</li>
        <li><strong>Whitelist:</strong> Prüft ob Public Key in der Whitelist ist</li>
        <li><strong>Ungültige Eingaben:</strong> Testet verschiedene ungültige Formate</li>
        <li><strong>Relay URLs:</strong> Testet verschiedene URL-Formate</li>
        <li><strong>Test-Keys:</strong> Generiert zufällige Test-Keys</li>
      </ul>
    </div>
  </div>
</div>

<style>
  .container {
    min-height: 100vh;
    padding: 2rem;
  }

  .card {
    max-width: 900px;
    margin: 0 auto;
  }

  h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: var(--text-muted);
    margin-bottom: 2rem;
  }

  h2 {
    font-size: 1.25rem;
    margin: 2rem 0 1rem 0;
  }

  h3 {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }

  .form-section {
    margin-bottom: 2rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .manual-tests {
    margin-bottom: 2rem;
  }

  .button-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .results-section {
    background-color: var(--bg-color);
    padding: 1.5rem;
    border-radius: 0.5rem;
    margin-bottom: 2rem;
  }

  .results-log {
    max-height: 500px;
    overflow-y: auto;
  }

  .log-entry {
    padding: 0.5rem;
    margin-bottom: 0.25rem;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .info-box {
    background-color: var(--bg-color);
    padding: 1.5rem;
    border-radius: 0.5rem;
  }

  .info-box ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .info-box li {
    margin: 0.5rem 0;
    font-size: 0.875rem;
  }
</style>