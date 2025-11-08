<script lang="ts">
  import { onMount } from 'svelte';
  import { logger } from '$lib/utils/logger';
  import QRCode from 'qrcode';

  let showDonation = false;
  let copied = false;
  let qrCodeDataUrl = '';

  const LIGHTNING_ADDRESS = 'aldo.barazutti@walletofsatoshi.com';

  onMount(async () => {
    // Generiere QR-Code beim Mount
    try {
      qrCodeDataUrl = await QRCode.toDataURL(`lightning:${LIGHTNING_ADDRESS}`, {
        width: 200,
        margin: 2,
        color: {
          dark: '#FF006E',  // Nostr Pink
          light: '#0a0a0a'  // Schwarz
        }
      });
    } catch (err) {
      logger.error('Fehler beim Generieren des QR-Codes:', err);
    }
  });

  function toggleDonation() {
    showDonation = !showDonation;
    if (!showDonation) {
      copied = false;
    }
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(LIGHTNING_ADDRESS);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (err) {
      logger.error('Fehler beim Kopieren:', err);
      alert(`Lightning-Adresse:\n${LIGHTNING_ADDRESS}`);
    }
  }
</script>

<!-- Floating Donation Button -->
<div class="donation-container">
  <button 
    class="donation-btn" 
    on:click={toggleDonation}
    title="Projekt unterstützen"
    aria-label="Spenden"
  >
    ⚡
  </button>

  {#if showDonation}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="donation-popup" on:click|stopPropagation on:keydown|stopPropagation>
      <div class="popup-header">
        <h3>⚡ Projekt unterstützen</h3>
        <button class="close-btn" on:click={toggleDonation} aria-label="Schließen">✕</button>
      </div>
      
      <div class="popup-content">
        <p class="donation-text">
          Gefällt dir dieses Projekt? Unterstütze die Entwicklung mit ein paar Sats! 🙏
        </p>
        
        {#if qrCodeDataUrl}
          <div class="qr-container">
            <img src={qrCodeDataUrl} alt="Lightning QR Code" class="qr-code" />
            <p class="qr-hint">Scanne mit deiner Lightning-Wallet</p>
          </div>
        {/if}
        
        <div class="address-container">
          <div class="address-label">Lightning-Adresse:</div>
          <div class="address-box">
            <code class="address">{LIGHTNING_ADDRESS}</code>
            <button
              class="copy-btn"
              on:click={copyAddress}
              class:copied
              title={copied ? 'Kopiert!' : 'Kopieren'}
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
        </div>

        <div class="donation-footer">
          <small>Vielen Dank für deine Unterstützung! 💜</small>
        </div>
      </div>
    </div>
  {/if}
</div>

{#if showDonation}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="donation-overlay"
    on:click={toggleDonation}
    on:keydown={(e) => e.key === 'Escape' && toggleDonation()}
  ></div>
{/if}

<style>
  .donation-container {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    z-index: 1000;
  }

  .donation-btn {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 50%;
    background: linear-gradient(135deg, #f7931a 0%, #ff9500 100%);
    border: none;
    font-size: 1.75rem;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(247, 147, 26, 0.4);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: pulse 2s ease-in-out infinite;
  }

  .donation-btn:hover {
    transform: translateY(-4px) scale(1.05);
    box-shadow: 0 8px 32px rgba(247, 147, 26, 0.6);
  }

  .donation-btn:active {
    transform: translateY(-2px) scale(1.02);
  }

  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 4px 20px rgba(247, 147, 26, 0.4);
    }
    50% {
      box-shadow: 0 4px 32px rgba(247, 147, 26, 0.6);
    }
  }

  .donation-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .donation-popup {
    position: absolute;
    bottom: 5rem;
    right: 0;
    width: 380px;
    max-width: calc(100vw - 4rem);
    background: linear-gradient(135deg, var(--surface-color) 0%, var(--surface-elevated) 100%);
    border: 2px solid var(--primary-color);
    border-radius: 1rem;
    box-shadow: 0 12px 48px rgba(255, 0, 110, 0.3);
    animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    background: linear-gradient(135deg, rgba(255, 0, 110, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    border-bottom: 1px solid var(--border-color);
  }

  .popup-header h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.375rem;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background-color: rgba(255, 0, 110, 0.1);
    color: var(--primary-color);
  }

  .popup-content {
    padding: 1.25rem;
  }

  .donation-text {
    margin: 0 0 1rem 0;
    color: var(--text-secondary);
    line-height: 1.5;
    font-size: 0.9375rem;
  }

  .qr-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 1.25rem;
    padding: 1rem;
    background: linear-gradient(135deg, rgba(255, 0, 110, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%);
    border-radius: 0.75rem;
    border: 1px solid var(--border-color);
  }

  .qr-code {
    width: 200px;
    height: 200px;
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .qr-hint {
    margin: 0.75rem 0 0 0;
    font-size: 0.8125rem;
    color: var(--text-muted);
    text-align: center;
  }

  .address-container {
    margin-bottom: 1rem;
  }

  .address-label {
    font-size: 0.8125rem;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .address-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background-color: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    transition: all 0.2s;
  }

  .address-box:hover {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(255, 0, 110, 0.1);
  }

  .address {
    flex: 1;
    font-family: 'Courier New', monospace;
    font-size: 0.8125rem;
    color: var(--text-color);
    word-break: break-all;
    line-height: 1.4;
  }

  .copy-btn {
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
    border: none;
    border-radius: 0.375rem;
    color: white;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .copy-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 0, 110, 0.4);
  }

  .copy-btn:active {
    transform: translateY(0);
  }

  .copy-btn.copied {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  }

  .donation-footer {
    text-align: center;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-color);
  }

  .donation-footer small {
    color: var(--text-muted);
    font-size: 0.8125rem;
  }

  /* Mobile Responsive */
  @media (max-width: 767px) {
    .donation-container {
      bottom: 1rem;
      right: 1rem;
    }

    .donation-btn {
      width: 3rem;
      height: 3rem;
      font-size: 1.5rem;
    }

    .donation-popup {
      width: calc(100vw - 2rem);
      right: -1rem;
      bottom: 4.5rem;
    }

    .popup-header {
      padding: 0.875rem 1rem;
    }

    .popup-header h3 {
      font-size: 1rem;
    }

    .popup-content {
      padding: 1rem;
    }

    .address {
      font-size: 0.75rem;
    }
  }

  /* Small Mobile */
  @media (max-width: 480px) {
    .donation-popup {
      bottom: 4rem;
    }

    .address-box {
      flex-direction: column;
      align-items: stretch;
    }

    .copy-btn {
      width: 100%;
      height: 2.25rem;
    }
  }
</style>