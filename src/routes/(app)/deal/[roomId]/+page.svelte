<script lang="ts">
  // @ts-ignore
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  // @ts-ignore
  import { goto } from '$app/navigation';
  import { userStore } from '$lib/stores/userStore';
  import { dealRoomStore } from '$lib/stores/dealRoomStore';
  import DealRoom from '$lib/components/DealRoom.svelte';
  import { logger } from '$lib/utils/logger';

  /**
   * ============================================
   * Deal-Room Page
   * ============================================
   * 
   * Route: /deal/[roomId]
   * 
   * Features:
   * - Validierung der Room-ID
   * - Prüfung ob User Zugriff hat
   * - Einbindung der DealRoom Component
   */

  $: roomId = $page.params.roomId;
  $: room = $dealRoomStore.rooms.get(roomId);
  $: isAuthenticated = !!$userStore.pubkey;

  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    logger.info(`📂 Lade Deal-Room: ${roomId.substring(0, 16)}...`);

    // Prüfe Authentifizierung
    if (!isAuthenticated) {
      logger.warn('⚠️ Nicht authentifiziert');
      error = 'Du musst angemeldet sein um auf Deal-Rooms zuzugreifen.';
      loading = false;
      
      // Redirect zu Home nach 2 Sekunden
      setTimeout(() => goto('/'), 2000);
      return;
    }

    // Prüfe ob Room existiert
    if (!room) {
      logger.warn(`⚠️ Room nicht gefunden: ${roomId}`);
      error = 'Dieser Deal-Room existiert nicht oder wurde noch nicht geladen.';
      loading = false;
      
      // Redirect zu Home nach 3 Sekunden
      setTimeout(() => goto('/'), 3000);
      return;
    }

    logger.success(`✅ Deal-Room geladen: ${room.partnerName || 'Unbekannt'}`);
    loading = false;
  });
</script>

<svelte:head>
  <title>Deal-Room | Bitcoin-Tausch-Netzwerk</title>
</svelte:head>

<div class="deal-page">
  {#if loading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Lade Deal-Room...</p>
    </div>
  {:else if error}
    <div class="error-container">
      <div class="error-icon">⚠️</div>
      <h2>Zugriff verweigert</h2>
      <p>{error}</p>
      <button class="btn-back" on:click={() => goto('/')}>
        ← Zurück zur Startseite
      </button>
    </div>
  {:else if room}
    <div class="room-container">
      <div class="room-header-nav">
        <button class="btn-back-nav" on:click={() => goto('/')}>
          ← Zurück zum Marktplatz
        </button>
        <div class="room-info">
          <span class="room-id-label">Room-ID:</span>
          <code class="room-id">{roomId.substring(0, 16)}...</code>
        </div>
      </div>

      <div class="room-content">
        <DealRoom 
          {roomId} 
          partnerPubkey={room.partnerPubkey}
          partnerName={room.partnerName || ''}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .deal-page {
    min-height: 100vh;
    padding: 20px;
    background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
  }

  /* ========================================== */
  /* Loading */
  /* ========================================== */

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    color: #a78bfa;
  }

  .loading-spinner {
    width: 60px;
    height: 60px;
    border: 4px solid rgba(139, 92, 246, 0.2);
    border-top-color: #8b5cf6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-container p {
    margin-top: 20px;
    font-size: 1.1rem;
  }

  /* ========================================== */
  /* Error */
  /* ========================================== */

  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    color: #fff;
  }

  .error-icon {
    font-size: 4rem;
    margin-bottom: 20px;
  }

  .error-container h2 {
    font-size: 2rem;
    margin: 0 0 16px 0;
    color: #ef4444;
  }

  .error-container p {
    font-size: 1.1rem;
    color: #a78bfa;
    margin: 0 0 32px 0;
    max-width: 500px;
  }

  .btn-back {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    border: none;
    color: #fff;
    padding: 12px 32px;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }

  .btn-back:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
  }

  /* ========================================== */
  /* Room Container */
  /* ========================================== */

  .room-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .room-header-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 16px;
    background: rgba(139, 92, 246, 0.1);
    border-radius: 12px;
    border: 1px solid rgba(139, 92, 246, 0.2);
  }

  .btn-back-nav {
    background: transparent;
    border: 1px solid rgba(139, 92, 246, 0.5);
    color: #a78bfa;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-back-nav:hover {
    background: rgba(139, 92, 246, 0.2);
    border-color: #8b5cf6;
  }

  .room-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .room-id-label {
    font-size: 0.85rem;
    color: #a78bfa;
  }

  .room-id {
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    color: #fff;
    background: rgba(139, 92, 246, 0.2);
    padding: 4px 12px;
    border-radius: 6px;
  }

  .room-content {
    height: calc(100vh - 160px);
    min-height: 500px;
  }

  /* ========================================== */
  /* Responsive */
  /* ========================================== */

  @media (max-width: 768px) {
    .deal-page {
      padding: 12px;
    }

    .room-header-nav {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
    }

    .room-info {
      justify-content: center;
    }

    .room-content {
      height: calc(100vh - 200px);
    }
  }
</style>
