<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  // @ts-ignore
  import { goto } from '$app/navigation';
  import { userStore } from '$lib/stores/userStore';
  import { dealRoomStore } from '$lib/stores/dealRoomStore';
  import { decryptNIP17Message } from '$lib/nostr/crypto';
  import { SimplePool } from 'nostr-tools';
  import { DEFAULT_RELAYS } from '$lib/config';
  import { logger } from '$lib/utils/logger';

  interface Invitation {
    type: 'invitation';
    roomId: string;
    offerId: string;
    offerTitle: string;
    message: string;
  }

  interface OfferClosedNotice {
    type: 'offer_closed' | 'offer_created';
    offerId: string;
    offerTitle: string;
    message: string;
  }

  let invitations: Invitation[] = [];
  let notices: OfferClosedNotice[] = [];
  let loading = true;
  let pool: SimplePool | null = null;
  let refreshInterval: NodeJS.Timeout | null = null;

  onMount(async () => {
    if (!$userStore.privateKey) {
      logger.warn('⚠️ Kein Private Key - überspringe Einladungs-Suche');
      loading = false;
      return;
    }

    await loadInvitations();
    
    // Auto-Refresh alle 10 Sekunden
    refreshInterval = setInterval(async () => {
      logger.debug('🔄 Auto-Refresh: Suche nach neuen Benachrichtigungen...');
      await loadInvitations();
    }, 10000); // 10 Sekunden
  });

  onDestroy(() => {
    if (pool) {
      pool.close(DEFAULT_RELAYS);
    }
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  async function loadInvitations() {
    if (!$userStore.privateKey || !$userStore.pubkey) return;

    try {
      const wasLoading = loading;
      if (!wasLoading) loading = true; // Nur beim ersten Mal Loading-Indicator zeigen
      
      logger.debug('📧 Suche nach Deal-Einladungen...');
      
      if (!pool) {
        pool = new SimplePool();
      }

      // Hole alle NIP-17 Gift Wrap Events für diesen User
      const events = await pool.querySync(DEFAULT_RELAYS, {
        kinds: [1059], // NIP-17 Gift Wrap
        '#p': [$userStore.pubkey],
        limit: 100 // Erhöht von 50 auf 100
      });

      logger.debug(`📦 ${events.length} Gift Wrap Events gefunden`);

      // Entschlüssele Events und filter Einladungen
      const decryptedInvitations: Invitation[] = [];
      const decryptedNotices: OfferClosedNotice[] = [];

      for (const event of events) {
        try {
          const { content } = await decryptNIP17Message(event as any, $userStore.privateKey);
          
          logger.debug(`📨 Entschlüsselter Inhalt: ${content.substring(0, 200)}`);
          
          // Versuche als JSON zu parsen
          try {
            const parsed = JSON.parse(content);
            
            logger.debug(`✅ JSON geparst:`, parsed);
            
            if (parsed.type === 'invitation' && parsed.roomId && parsed.offerId) {
              // Prüfe ob bereits ein Room existiert
              const existingRoom = dealRoomStore.getRoom(parsed.roomId);
              
              if (!existingRoom) {
                decryptedInvitations.push(parsed);
                logger.debug(`✉️ Neue Einladung gefunden: ${parsed.roomId.substring(0, 16)}...`);
              }
            } else if ((parsed.type === 'offer_closed' || parsed.type === 'offer_created') && parsed.offerId) {
              // "Angebot beendet" oder "Angebot erstellt" Nachricht
              // Prüfe ob bereits in der Liste (Duplikat-Schutz)
              const isDuplicate = decryptedNotices.some(n => 
                n.type === parsed.type && n.offerId === parsed.offerId
              );
              
              if (!isDuplicate) {
                decryptedNotices.push(parsed);
                logger.debug(`📢 Benachrichtigung: ${parsed.type} - ${parsed.offerId.substring(0, 16)}...`);
              }
            }
          } catch {
            // Keine JSON-Nachricht - überspringen
          }
        } catch (err) {
          // Konnte Event nicht entschlüsseln (möglicherweise alte Nachricht oder für anderen User)
        }
      }

      invitations = decryptedInvitations;
      notices = decryptedNotices;
      
      if (wasLoading) {
        logger.success(`✅ ${invitations.length} neue Einladungen gefunden`);
        logger.success(`✅ ${notices.length} Angebots-Benachrichtigungen gefunden`);
      }
    } catch (error) {
      logger.error('❌ Fehler beim Laden der Einladungen:', error);
    } finally {
      loading = false;
    }
  }

  function handleAccept(invitation: Invitation) {
    // Erstelle Room im Store
    dealRoomStore.createRoom({
      offerId: invitation.offerId,
      partnerPubkey: '', // Wird beim Laden der Nachrichten ermittelt
      role: 'buyer',
      offerSecret: '' // Buyer kennt Secret nicht
    });

    // Entferne Einladung
    invitations = invitations.filter(i => i.roomId !== invitation.roomId);

    // Navigiere zum Room
    goto(`/deal/${invitation.roomId}`);
  }

  function handleDecline(invitation: Invitation) {
    if (confirm('Möchtest du diese Einladung wirklich ablehnen?')) {
      invitations = invitations.filter(i => i.roomId !== invitation.roomId);
      logger.info('🚫 Einladung abgelehnt');
    }
  }

  function dismissNotice(notice: OfferClosedNotice) {
    notices = notices.filter(n => n.offerId !== notice.offerId);
    logger.info('✅ Benachrichtigung gelesen');
  }
</script>

{#if loading}
  <div class="loading">
    <p>🔍 Suche nach Benachrichtigungen...</p>
  </div>
{:else if invitations.length > 0 || notices.length > 0}
  <div class="notifications-container">
    
    <!-- Angebots-Benachrichtigungen ("Angebot beendet") -->
    {#if notices.length > 0}
      <div class="notices-section">
        <h3>📢 Benachrichtigungen ({notices.length})</h3>
        
        <div class="notices-list">
          {#each notices as notice}
            <div class="notice-card">
              <div class="notice-header">
                <span class="icon">{notice.type === 'offer_created' ? '📢' : 'ℹ️'}</span>
                <h4>{notice.type === 'offer_created' ? 'Neues Angebot' : 'Angebot beendet'}</h4>
                <button class="btn-close" on:click={() => dismissNotice(notice)}>✕</button>
              </div>
              
              <div class="notice-content">
                <div class="offer-info">
                  <strong>Angebot:</strong>
                  <p>{notice.offerTitle}</p>
                </div>
                
                <div class="message">
                  {notice.message}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Deal-Einladungen -->
    {#if invitations.length > 0}
      <div class="invitations-section">
        <h2>📬 Deal-Einladungen ({invitations.length})</h2>
        
        <div class="invitations-list">
          {#each invitations as invitation}
            <div class="invitation-card">
              <div class="invitation-header">
                <span class="badge">NEU</span>
                <h3>🎉 Du wurdest für einen Deal ausgewählt!</h3>
              </div>
              
              <div class="invitation-content">
                <div class="offer-info">
                  <strong>Angebot:</strong>
                  <p>{invitation.offerTitle}</p>
                </div>
                
                <div class="message">
                  {invitation.message}
                </div>
              </div>
              
              <div class="invitation-actions">
                <button class="btn btn-accept" on:click={() => handleAccept(invitation)}>
                  ✅ Annehmen & Chat öffnen
                </button>
                <button class="btn btn-decline" on:click={() => handleDecline(invitation)}>
                  ❌ Ablehnen
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .loading {
    text-align: center;
    padding: 40px 20px;
    color: #9ca3af;
  }

  .notifications-container {
    margin: 24px 0;
  }

  .notices-section {
    margin-bottom: 24px;
  }

  .notices-section h3 {
    margin: 0 0 16px 0;
    font-size: 1.25rem;
    color: #fff;
  }

  .notices-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .notice-card {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 12px;
    padding: 16px;
    transition: all 0.3s ease;
  }

  .notice-card:hover {
    border-color: rgba(59, 130, 246, 0.5);
    transform: translateY(-1px);
  }

  .notice-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .notice-header .icon {
    font-size: 1.25rem;
  }

  .notice-header h4 {
    flex: 1;
    margin: 0;
    font-size: 1rem;
    color: #60a5fa;
  }

  .btn-close {
    background: none;
    border: none;
    color: #9ca3af;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 4px;
    line-height: 1;
    transition: color 0.2s ease;
  }

  .btn-close:hover {
    color: #fff;
  }

  .notice-content .offer-info {
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  }

  .notice-content .message {
    background: rgba(59, 130, 246, 0.05);
    border-left: 3px solid #3b82f6;
    padding: 10px 14px;
    border-radius: 6px;
    color: #bfdbfe;
    font-size: 0.9rem;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .invitations-section h2 {
    margin: 0 0 20px 0;
    font-size: 1.75rem;
    color: #fff;
  }

  .invitations-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .invitation-card {
    background: rgba(139, 92, 246, 0.1);
    border: 1px solid rgba(139, 92, 246, 0.4);
    border-radius: 12px;
    padding: 20px;
    transition: all 0.3s ease;
  }

  .invitation-card:hover {
    border-color: rgba(139, 92, 246, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(139, 92, 246, 0.2);
  }

  .invitation-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .badge {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #fff;
  }

  .invitation-content {
    margin-bottom: 20px;
  }

  .offer-info {
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(139, 92, 246, 0.2);
  }

  .offer-info strong {
    color: #c4b5fd;
    font-size: 0.875rem;
    display: block;
    margin-bottom: 6px;
  }

  .offer-info p {
    margin: 0;
    color: #e0e7ff;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .message {
    background: rgba(139, 92, 246, 0.05);
    border-left: 3px solid #8b5cf6;
    padding: 12px 16px;
    border-radius: 8px;
    color: #e0e7ff;
    font-size: 0.95rem;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .invitation-actions {
    display: flex;
    gap: 12px;
  }

  .btn {
    flex: 1;
    padding: 12px 24px;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.95rem;
  }

  .btn-accept {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
  }

  .btn-accept:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(16, 185, 129, 0.4);
  }

  .btn-decline {
    background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
    color: white;
  }

  .btn-decline:hover {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(239, 68, 68, 0.4);
  }

  @media (max-width: 768px) {
    .invitation-actions {
      flex-direction: column;
    }

    h2 {
      font-size: 1.5rem;
    }

    h3 {
      font-size: 1.1rem;
    }
  }
</style>
