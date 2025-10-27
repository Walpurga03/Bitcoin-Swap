<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { userStore } from '$lib/stores/userStore';
  import { groupStore } from '$lib/stores/groupStore';
  
  interface DealInvitation {
    id: string;
    dealId: string;
    senderPubkey: string;
    senderName: string;
    offerContent: string;
    message: string;
    timestamp: number;
    type: 'deal-invitation';
  }
  
  interface InterestNotification {
    id: string;
    senderPubkey: string;
    senderName: string;
    message: string;
    offerContent: string;
    timestamp: number;
    type: 'interest-request';
  }
  
  type Notification = DealInvitation | InterestNotification;
  
  let notifications: Notification[] = [];
  let loading = false;
  let checkInterval: NodeJS.Timeout;
  
  // Lade alle Notifications (Deal-Einladungen + Interest-Anfragen)
  async function loadNotifications() {
    if (!$userStore.privateKey || loading) return;
    
    try {
      loading = true;
      
      const { loadDealInvitations } = await import('$lib/nostr/nip17');
      
      // 1. Lade Deal-Einladungen (für Interessenten) - NUR für diese Gruppe
      const dealInvitations = await loadDealInvitations(
        $userStore.privateKey, 
        $groupStore.relay,
        $groupStore.channelId // 🔥 Gruppen-Filter
      );
      const dealNotifications: DealInvitation[] = dealInvitations.map(inv => ({
        ...inv,
        type: 'deal-invitation' as const
      }));
      
      // 2. Kombiniere alle Notifications (aktuell nur Deal-Invitations)
      // ℹ️ Interest-Requests werden NICHT als Notifications angezeigt
      // ℹ️ Stattdessen nutzt der Angebotsgeber die Interest-Liste auf der Group-Page
      const allNotifications = [...dealNotifications];
      
      // Nur neue Notifications anzeigen (vermeide Spam)
      const existingIds = notifications.map(notif => notif.id);
      const freshNotifications = allNotifications.filter(notif => !existingIds.includes(notif.id));
      
      if (freshNotifications.length > 0) {
        notifications = [...freshNotifications, ...notifications].slice(0, 5); // Max 5 Notifications
        console.log(`📨 ${freshNotifications.length} neue Notification(en) erhalten`);
      }
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der Notifications:', error);
    } finally {
      loading = false;
    }
  }
  
  // Deal-Einladung annehmen
  async function acceptDealInvitation(invitation: DealInvitation) {
    console.log('✅ [ACCEPT-INVITATION] Trete Deal-Room bei:', invitation.dealId.substring(0, 16) + '...');
    
    // Entferne Notification aus Liste
    notifications = notifications.filter(notif => notif.id !== invitation.id);
    
    // Navigation zum Deal-Room mit window.location
    window.location.href = `/deal/${invitation.dealId}`;
  }
  
  // Interest-Anfrage anzeigen (öffnet Interest-Liste)
  function viewInterestRequests() {
    console.log('👀 [VIEW-INTERESTS] Öffne Interest-Liste...');
    
    // Entferne alle Interest-Notifications
    notifications = notifications.filter(notif => notif.type !== 'interest-request');
    
    // Trigger Event für Parent-Komponente (falls auf Group-Page)
    window.dispatchEvent(new CustomEvent('show-interest-list'));
  }
  
  // Notification ablehnen/schließen
  function dismissNotification(notification: Notification) {
    console.log('❌ [DISMISS] Schließe Notification:', notification.id.substring(0, 16) + '...');
    
    // Entferne Notification aus Liste
    notifications = notifications.filter(notif => notif.id !== notification.id);
  }
  
  // Formatiere Zeitstempel
  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Gerade eben';
    if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min`;
    if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std`;
    return date.toLocaleDateString('de-DE');
  }
  
  onMount(() => {
    // Sofortiger Check
    loadNotifications();
    
    // Alle 15 Sekunden nach neuen Notifications suchen
    checkInterval = setInterval(loadNotifications, 15000);
  });
  
  onDestroy(() => {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
  });
</script>

{#if notifications.length > 0}
  <div class="notification-container">
    {#each notifications as notification (notification.id)}
      <div class="notification-card" style="animation: slideDown 0.3s ease-out;">
        
        {#if notification.type === 'deal-invitation'}
          <!-- Deal-Room Einladung -->
          <div class="notification-header">
            <h3>🤝 Deal-Room Einladung</h3>
            <span class="timestamp">{formatTimestamp(notification.timestamp)}</span>
          </div>
          
          <div class="notification-body">
            <p><strong>Von:</strong> {notification.senderName}</p>
            <p><strong>Angebot:</strong> {notification.offerContent}</p>
            <p class="message">"{notification.message}"</p>
          </div>
          
          <div class="notification-actions">
            <button 
              class="btn-accept" 
              on:click={() => acceptDealInvitation(notification)}
            >
              ✅ Annehmen
            </button>
            <button 
              class="btn-decline" 
              on:click={() => dismissNotification(notification)}
            >
              ❌ Ablehnen
            </button>
          </div>
          
        {:else if notification.type === 'interest-request'}
          <!-- Interest-Anfrage -->
          <div class="notification-header">
            <h3>💬 Neue Anfrage</h3>
            <span class="timestamp">{formatTimestamp(notification.timestamp)}</span>
          </div>
          
          <div class="notification-body">
            <p><strong>Von:</strong> {notification.senderName}</p>
            <p><strong>Für Angebot:</strong> {notification.offerContent}</p>
            <p class="message">"{notification.message}"</p>
          </div>
          
          <div class="notification-actions">
            <button 
              class="btn-view" 
              on:click={viewInterestRequests}
            >
              👀 Anfragen ansehen
            </button>
            <button 
              class="btn-dismiss" 
              on:click={() => dismissNotification(notification)}
            >
              ✕ Schließen
            </button>
          </div>
        {/if}
        
      </div>
    {/each}
  </div>
{/if}

<style>
  .notification-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    max-width: 400px;
  }
  
  .notification-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: 2px solid #4c51bf;
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    color: white;
  }
  
  .notification-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  
  .notification-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: bold;
  }
  
  .timestamp {
    font-size: 0.8rem;
    opacity: 0.8;
  }
  
  .notification-body p {
    margin: 0.5rem 0;
    font-size: 0.9rem;
  }
  
  .message {
    font-style: italic;
    opacity: 0.9;
    margin-top: 0.75rem !important;
  }
  
  .notification-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
  }
  
  .notification-actions button {
    flex: 1;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .btn-accept {
    background: #10b981;
    color: white;
  }
  
  .btn-accept:hover {
    background: #059669;
    transform: translateY(-1px);
  }
  
  .btn-decline {
    background: #ef4444;
    color: white;
  }
  
  .btn-decline:hover {
    background: #dc2626;
    transform: translateY(-1px);
  }
  
  .btn-view {
    background: #3b82f6;
    color: white;
  }
  
  .btn-view:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }
  
  .btn-dismiss {
    background: #6b7280;
    color: white;
  }
  
  .btn-dismiss:hover {
    background: #4b5563;
    transform: translateY(-1px);
  }
  
  @keyframes slideDown {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @media (max-width: 768px) {
    .notification-container {
      top: 10px;
      right: 10px;
      left: 10px;
      max-width: none;
    }
    
    .notification-card {
      padding: 0.75rem;
    }
    
    .notification-actions {
      flex-direction: column;
    }
  }
</style>