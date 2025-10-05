<script lang="ts">
  import { deriveChannelId } from '$lib/nostr/crypto';
  import { createInviteLink, parseInviteLink } from '$lib/utils';

  let secret = 'premium-group123';
  let relay = 'wss://nostr-relay.online';
  let domain = 'https://example.com';
  let channelId = '';
  let inviteLink = '';
  let parsedData: any = null;
  let testResults: string[] = [];

  async function generateChannelId() {
    try {
      channelId = await deriveChannelId(secret);
      testResults = [...testResults, `✅ Channel-ID generiert: ${channelId}`];
    } catch (e: any) {
      testResults = [...testResults, `❌ Fehler: ${e.message}`];
    }
  }

  function generateInviteLink() {
    try {
      inviteLink = createInviteLink(domain, relay, secret);
      testResults = [...testResults, `✅ Einladungslink erstellt: ${inviteLink}`];
    } catch (e: any) {
      testResults = [...testResults, `❌ Fehler: ${e.message}`];
    }
  }

  function parseLink() {
    try {
      parsedData = parseInviteLink(inviteLink);
      if (parsedData) {
        testResults = [...testResults, `✅ Link geparst: Relay=${parsedData.relay}, Secret=${parsedData.secret}`];
      } else {
        testResults = [...testResults, `❌ Parsen fehlgeschlagen`];
      }
    } catch (e: any) {
      testResults = [...testResults, `❌ Fehler: ${e.message}`];
    }
  }

  async function testDuplicates() {
    try {
      const id1 = await deriveChannelId(secret);
      const id2 = await deriveChannelId(secret);
      
      if (id1 === id2) {
        testResults = [...testResults, `✅ Duplikat-Test bestanden: IDs sind identisch`];
      } else {
        testResults = [...testResults, `❌ Duplikat-Test fehlgeschlagen: IDs unterschiedlich`];
      }
    } catch (e: any) {
      testResults = [...testResults, `❌ Fehler: ${e.message}`];
    }
  }

  async function testDifferentSecrets() {
    try {
      const id1 = await deriveChannelId('secret1');
      const id2 = await deriveChannelId('secret2');
      
      if (id1 !== id2) {
        testResults = [...testResults, `✅ Unterschiedliche Secrets erzeugen unterschiedliche IDs`];
      } else {
        testResults = [...testResults, `❌ Fehler: Gleiche IDs für unterschiedliche Secrets`];
      }
    } catch (e: any) {
      testResults = [...testResults, `❌ Fehler: ${e.message}`];
    }
  }

  function clearResults() {
    testResults = [];
    channelId = '';
    inviteLink = '';
    parsedData = null;
  }

  async function runAllTests() {
    clearResults();
    await generateChannelId();
    generateInviteLink();
    parseLink();
    await testDuplicates();
    await testDifferentSecrets();
  }
</script>

<div class="container">
  <div class="card">
    <h1>🔍 Debug: Secret & Channel-ID</h1>
    <p class="subtitle">Teste die Channel-ID-Generierung und Einladungslinks</p>

    <div class="form-section">
      <h2>Eingaben</h2>
      
      <div class="form-group">
        <label for="domain">Domain</label>
        <input id="domain" type="text" class="input" bind:value={domain} />
      </div>

      <div class="form-group">
        <label for="relay">Relay URL</label>
        <input id="relay" type="text" class="input" bind:value={relay} />
      </div>

      <div class="form-group">
        <label for="secret">Gruppen-Secret</label>
        <input id="secret" type="text" class="input" bind:value={secret} />
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

    <div class="results-section">
      <h2>Ergebnisse</h2>
      
      {#if channelId}
        <div class="result-item">
          <strong>Channel-ID:</strong>
          <code>{channelId}</code>
        </div>
      {/if}

      {#if inviteLink}
        <div class="result-item">
          <strong>Einladungslink:</strong>
          <code class="link">{inviteLink}</code>
        </div>
      {/if}

      {#if parsedData}
        <div class="result-item">
          <strong>Geparste Daten:</strong>
          <pre>{JSON.stringify(parsedData, null, 2)}</pre>
        </div>
      {/if}

      {#if testResults.length > 0}
        <div class="test-results">
          <h3>Test-Log</h3>
          {#each testResults as result}
            <div class="log-entry">{result}</div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="manual-tests">
      <h2>Manuelle Tests</h2>
      <div class="button-grid">
        <button class="btn btn-secondary" on:click={generateChannelId}>
          Channel-ID generieren
        </button>
        <button class="btn btn-secondary" on:click={generateInviteLink}>
          Einladungslink erstellen
        </button>
        <button class="btn btn-secondary" on:click={parseLink}>
          Link parsen
        </button>
        <button class="btn btn-secondary" on:click={testDuplicates}>
          Duplikat-Test
        </button>
        <button class="btn btn-secondary" on:click={testDifferentSecrets}>
          Unterschiedliche Secrets
        </button>
      </div>
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
    margin: 1rem 0 0.5rem 0;
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

  .results-section {
    background-color: var(--bg-color);
    padding: 1.5rem;
    border-radius: 0.5rem;
    margin-bottom: 2rem;
  }

  .result-item {
    margin-bottom: 1.5rem;
  }

  .result-item strong {
    display: block;
    margin-bottom: 0.5rem;
  }

  code {
    display: block;
    background-color: var(--surface-color);
    padding: 0.75rem;
    border-radius: 0.25rem;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    word-break: break-all;
  }

  code.link {
    color: var(--primary-color);
  }

  pre {
    background-color: var(--surface-color);
    padding: 1rem;
    border-radius: 0.25rem;
    overflow-x: auto;
    font-size: 0.875rem;
  }

  .test-results {
    margin-top: 1.5rem;
  }

  .log-entry {
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    background-color: var(--surface-color);
    border-radius: 0.25rem;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
  }

  .manual-tests {
    margin-top: 2rem;
  }

  .button-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
</style>