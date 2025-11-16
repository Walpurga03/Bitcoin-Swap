import { writable, derived, get } from 'svelte/store';
import type { NostrEvent } from 'nostr-tools';
import { SimplePool } from 'nostr-tools';
import { logger } from '$lib/utils/logger';
import { createNIP17Message } from '$lib/nostr/crypto';
import { DEFAULT_RELAYS } from '$lib/config';
import { padMessageForAnonymity, generateRandomDelay } from '$lib/utils/padding';

/**
 * ============================================
 * Deal-Room Store für NIP-17 Chat-Räume
 * ============================================
 * 
 * Verwaltet private 1:1 Chat-Räume zwischen Angebotsgeber und Interessent
 * 
 * Features:
 * - Room-ID Generierung (deterministisch aus Secret + Pubkeys)
 * - Nachrichten-Verwaltung (NIP-17 verschlüsselt)
 * - Teilnehmer-Info
 * - Echtzeit-Updates
 */

export interface DealRoomMessage {
  id: string;
  roomId: string;
  content: string;
  senderPubkey: string;
  timestamp: number;
  isOwn: boolean; // Vom aktuellen User gesendet
}

export interface DealRoom {
  roomId: string;
  offerId: string;
  partnerPubkey: string;
  partnerName?: string;
  messages: DealRoomMessage[];
  lastActivity: number;
  unreadCount: number;
  status: 'active' | 'completed' | 'cancelled';
}

export interface DealRoomStoreState {
  rooms: Map<string, DealRoom>;
  activeRoomId: string | null;
  loading: boolean;
}

/**
 * Generiere deterministische Room-ID
 * 
 * @param secret - Angebots-Secret (nur Angebotsgeber hat es)
 * @param userPubkey - Eigener Pubkey
 * @param partnerPubkey - Partner Pubkey
 * @param offerId - Angebots-ID
 */
export async function generateRoomId(
  secret: string,
  userPubkey: string,
  partnerPubkey: string,
  offerId: string
): Promise<string> {
  // Sortiere Pubkeys für Konsistenz (beide Parteien erhalten gleiche ID)
  const sortedPubkeys = [userPubkey, partnerPubkey].sort();
  
  const input = `${secret}:${sortedPubkeys[0]}:${sortedPubkeys[1]}:${offerId}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Verwende nur erste 32 Zeichen für lesbarere URLs
  return hashHex.substring(0, 32);
}

/**
 * ============================================
 * Store Initialisierung
 * ============================================
 */

function createDealRoomStore() {
  const initialState: DealRoomStoreState = {
    rooms: new Map(),
    activeRoomId: null,
    loading: false
  };
  
  const { subscribe, set, update } = writable<DealRoomStoreState>(initialState);
  
  return {
    subscribe,
    
    /**
     * Erstelle einen neuen Deal-Room
     */
    createRoom: (params: {
      offerId: string;
      partnerPubkey: string;
      partnerName?: string;
      role: 'seller' | 'buyer';
      offerSecret: string;
    }): string => {
      logger.info(`💬 Erstelle Deal-Room für Angebot: ${params.offerId.substring(0, 16)}...`);
      
      // Generiere Room-ID synchron (vereinfachte Version)
      const sortedPubkeys = [params.partnerPubkey].sort();
      const roomId = `${params.offerId.substring(0, 16)}-${sortedPubkeys[0].substring(0, 8)}`;
      
      const newRoom: DealRoom = {
        roomId,
        offerId: params.offerId,
        partnerPubkey: params.partnerPubkey,
        partnerName: params.partnerName,
        messages: [],
        lastActivity: Date.now(),
        unreadCount: 0,
        status: 'active'
      };
      
      update(state => {
        state.rooms.set(roomId, newRoom);
        return state;
      });
      
      logger.success(`✅ Deal-Room erstellt: ${roomId}`);
      return roomId;
    },
    
    /**
     * Sende Einladung an Partner (NIP-17)
     */
    sendInvitation: async (
      roomId: string,
      recipientPubkey: string,
      inviteData: {
        type: 'invitation';
        roomId: string;
        offerId: string;
        offerTitle: string;
        message: string;
      },
      senderPrivateKey: string
    ) => {
      logger.info(`📧 Sende Einladung für Room: ${roomId.substring(0, 16)}...`);
      
      try {
        // Erstelle NIP-17 verschlüsselte Nachricht
        const inviteMessage = JSON.stringify(inviteData);
        const { giftWrapEvent } = await createNIP17Message(
          inviteMessage,
          recipientPubkey,
          senderPrivateKey
        );
        
        // Publiziere auf Relays
        const pool = new SimplePool();
        await pool.publish(DEFAULT_RELAYS, giftWrapEvent);
        pool.close(DEFAULT_RELAYS);
        
        logger.success('✅ Einladung erfolgreich gesendet');
      } catch (error) {
        logger.error('❌ Fehler beim Senden der Einladung:', error);
        throw error;
      }
    },
    
    /**
     * Sende anonyme Benachrichtigungen an alle Whitelist-Mitglieder
     * 
     * Alle Empfänger bekommen eine Nachricht - aber nur die 2 Partner bekommen roomId
     * Alle Nachrichten sind gepaddet auf gleiche Größe (Anonymität!)
     * Versand erfolgt mit randomisierten Delays (0-30s)
     * 
     * @param whitelistPubkeys - Alle Whitelist-Mitglieder (inkl. Admin)
     * @param selectedPubkey - Der ausgewählte Interessent
     * @param creatorPubkey - Der Angebotsgeber (temp pubkey vom Angebot)
     * @param offerId - Die Angebots-ID
     * @param roomId - Die Chat-Room ID (nur für Partner sichtbar)
     * @param senderPrivateKey - Der private Key des Angebots (temporär, anonym)
     */
    sendAnonymousNotifications: async (
      whitelistPubkeys: string[],
      selectedPubkey: string,
      creatorPubkey: string,
      offerId: string,
      roomId: string,
      senderPrivateKey: string
    ) => {
      try {
        logger.debug(`📢 Sende anonyme Benachrichtigungen an ${whitelistPubkeys.length} Mitglieder...`);
        
        const notifications: Array<{
          event: NostrEvent;
          delay: number;
          recipient: string;
        }> = [];
        
        // 1. Erstelle Nachricht für jedes Whitelist-Mitglied
        for (const pubkey of whitelistPubkeys) {
          const isPartner = (pubkey === selectedPubkey || pubkey === creatorPubkey);
          
          // Basis-Nachricht
          const message = {
            type: 'deal_finalized',
            offerId: offerId,
            role: isPartner ? 'partner' : 'observer',
            roomId: isPartner ? roomId : null,
            partnerPubkey: isPartner 
              ? (pubkey === creatorPubkey ? selectedPubkey : creatorPubkey)
              : null,
            message: '✅ Deal wurde finalisiert',
            timestamp: Date.now()
          };
          
          // 2. Padding auf gleiche Größe (500 Zeichen)
          const paddedMessage = padMessageForAnonymity(message, 500);
          
          // 3. NIP-17 Verschlüsselung
          const { giftWrapEvent } = await createNIP17Message(
            paddedMessage,
            pubkey,  // Empfänger
            senderPrivateKey
          );
          
          // 4. Randomisierter Delay (0-30 Sekunden)
          const randomDelay = generateRandomDelay(30);
          
          notifications.push({
            event: giftWrapEvent,
            delay: randomDelay,
            recipient: pubkey.substring(0, 16) + '...'
          });
          
          logger.debug(`  - Nachricht erstellt für ${pubkey.substring(0, 16)}... (Delay: ${(randomDelay/1000).toFixed(1)}s, Role: ${message.role})`);
        }
        
        logger.debug(`✅ ${notifications.length} Nachrichten erstellt. Starte verzögerten Versand...`);
        
        // 5. Sende alle Nachrichten mit ihren jeweiligen Delays
        const pool = new SimplePool();
        
        // Erstelle Promises für alle Nachrichten
        // WICHTIG: Jedes Promise wartet MINDESTENS den Delay, auch bei Fehlern!
        const sendPromises = notifications.map(notification => {
          return new Promise<void>((resolve) => {
            setTimeout(async () => {
              logger.debug(`⏰ setTimeout FIRED für ${notification.recipient} (nach ${(notification.delay/1000).toFixed(1)}s)`);
              try {
                // pool.publish() gibt Promise-Array zurück (ein Promise pro Relay)
                const publishPromises = pool.publish(DEFAULT_RELAYS, notification.event);
                logger.debug(`📤 pool.publish() aufgerufen für ${notification.recipient}, warte auf Relays...`);
                
                // Warte auf ALLE Relays (nicht nur das erste mit Promise.race)
                const results = await Promise.allSettled(publishPromises);
                logger.debug(`📥 Promise.allSettled() abgeschlossen für ${notification.recipient}`);
                
                // Prüfe ob mindestens ein Relay erfolgreich war
                const successCount = results.filter(r => r.status === 'fulfilled').length;
                const failedCount = results.filter(r => r.status === 'rejected').length;
                
                if (successCount > 0) {
                  logger.debug(`✅ Nachricht gesendet an ${notification.recipient} (${successCount}/${DEFAULT_RELAYS.length} Relays)`);
                } else {
                  logger.error(`❌ Alle Relays fehlgeschlagen für ${notification.recipient}:`, results);
                }
                
                if (failedCount > 0) {
                  logger.warn(`⚠️ ${failedCount} Relay(s) fehlgeschlagen für ${notification.recipient}`);
                  // Zeige Details der Fehler
                  results.forEach((result, i) => {
                    if (result.status === 'rejected') {
                      logger.debug(`   Relay ${i}: ${result.reason}`);
                    }
                  });
                }
              } catch (error) {
                logger.error(`❌ Unerwarteter Fehler beim Senden an ${notification.recipient}:`, error);
              } finally {
                logger.debug(`🏁 Resolve Promise für ${notification.recipient}`);
                // Resolve nach erfolgreichem Delay + Publish-Versuch
                resolve();
              }
            }, notification.delay);
          });
        });
        
        // Warte auf alle Nachrichten
        const maxDelay = Math.max(...notifications.map(n => n.delay));
        logger.debug(`📬 Warte auf Versand aller ${notifications.length} Nachrichten (max ${(maxDelay/1000).toFixed(1)}s + Puffer)...`);
        
        logger.debug(`🔍 Starte Promise.all() - warte auf ${sendPromises.length} Promises...`);
        await Promise.all(sendPromises);
        logger.debug(`🔍 Promise.all() abgeschlossen - alle Sends fertig!`);
        
        // Pool schließen nach erfolgreichem Versand
        pool.close(DEFAULT_RELAYS);
        logger.debug('🔒 Pool geschlossen - alle Nachrichten wurden gesendet');
        
      } catch (error) {
        logger.error('❌ Fehler beim Erstellen der anonymen Benachrichtigungen:', error);
        throw error;
      }
    },
    
    /**
     * Sende Broadcast-Nachricht (z.B. "Absage" bei Auswahl eines anderen) an ein Mitglied (NIP-17)
     */
    sendBroadcast: async (
      recipientPubkey: string,
      broadcastData: {
        type: 'selection_rejected' | 'offer_closed' | 'offer_created';
        offerId: string;
        offerTitle: string;
        message: string;
      },
      senderPrivateKey: string
    ) => {
      try {
        // Erstelle NIP-17 verschlüsselte Nachricht
        const broadcastMessage = JSON.stringify(broadcastData);
        const { giftWrapEvent } = await createNIP17Message(
          broadcastMessage,
          recipientPubkey,
          senderPrivateKey
        );
        
        // Publiziere auf Relays mit Timeout
        const pool = new SimplePool();
        const publishPromises = pool.publish(DEFAULT_RELAYS, giftWrapEvent);
        
        // Warte max 5 Sekunden auf Bestätigung
        await Promise.race([
          publishPromises,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Publish timeout')), 5000)
          )
        ]).catch(error => {
          // Ignoriere Timeout/WebSocket-Fehler - Event wurde trotzdem gesendet
          logger.debug(`⏱️ Timeout - Event wurde an Relay gesendet`);
        });
        
        pool.close(DEFAULT_RELAYS);
        
        logger.debug(`📢 Broadcast gesendet an ${recipientPubkey.substring(0, 16)}...`);
      } catch (error) {
        logger.error('❌ Fehler beim Senden des Broadcasts:', error);
        throw error;
      }
    },
    
    /**
     * Setze aktiven Room
     */
    setActiveRoom: (roomId: string | null) => {
      update(state => {
        state.activeRoomId = roomId;
        
        // Reset unread count wenn Room geöffnet wird
        if (roomId && state.rooms.has(roomId)) {
          const room = state.rooms.get(roomId)!;
          room.unreadCount = 0;
          state.rooms.set(roomId, room);
        }
        
        return state;
      });
      
      if (roomId) {
        logger.debug(`📂 Aktiver Room: ${roomId.substring(0, 16)}...`);
      }
    },
    
    /**
     * Füge Nachricht zu Room hinzu
     */
    addMessage: (message: DealRoomMessage) => {
      update(state => {
        const room = state.rooms.get(message.roomId);
        
        if (!room) {
          logger.warn(`⚠️ Room nicht gefunden: ${message.roomId}`);
          return state;
        }
        
        // Prüfe ob Nachricht bereits existiert (Duplikat-Schutz)
        if (room.messages.some(m => m.id === message.id)) {
          return state;
        }
        
        // Füge Nachricht hinzu
        room.messages.push(message);
        room.messages.sort((a, b) => a.timestamp - b.timestamp);
        room.lastActivity = message.timestamp;
        
        // Erhöhe unread count wenn nicht eigene Nachricht und Room nicht aktiv
        if (!message.isOwn && state.activeRoomId !== message.roomId) {
          room.unreadCount++;
        }
        
        state.rooms.set(message.roomId, room);
        
        logger.debug(`📨 Nachricht hinzugefügt zu Room ${message.roomId.substring(0, 8)}...`);
        
        return state;
      });
    },
    
    /**
     * Aktualisiere Room-Status
     */
    updateRoomStatus: (roomId: string, status: DealRoom['status']) => {
      update(state => {
        const room = state.rooms.get(roomId);
        
        if (!room) {
          logger.warn(`⚠️ Room nicht gefunden: ${roomId}`);
          return state;
        }
        
        room.status = status;
        state.rooms.set(roomId, room);
        
        logger.info(`📊 Room Status aktualisiert: ${status}`);
        
        return state;
      });
    },
    
    /**
     * Hole Room nach ID
     */
    getRoom: (roomId: string): DealRoom | undefined => {
      const state = get({ subscribe });
      return state.rooms.get(roomId);
    },
    
    /**
     * Lösche Room
     */
    deleteRoom: (roomId: string) => {
      update(state => {
        state.rooms.delete(roomId);
        
        if (state.activeRoomId === roomId) {
          state.activeRoomId = null;
        }
        
        logger.info(`🗑️ Room gelöscht: ${roomId.substring(0, 16)}...`);
        
        return state;
      });
    },
    
    /**
     * Setze Loading-Status
     */
    setLoading: (loading: boolean) => {
      update(state => {
        state.loading = loading;
        return state;
      });
    },
    
    /**
     * Reset Store
     */
    reset: () => {
      logger.info('🔄 Deal-Room Store zurückgesetzt');
      set(initialState);
    }
  };
}

export const dealRoomStore = createDealRoomStore();

/**
 * ============================================
 * Derived Stores (Auto-computed)
 * ============================================
 */

/**
 * Aktiver Room (oder null)
 */
export const activeRoom = derived(
  dealRoomStore,
  $store => $store.activeRoomId ? $store.rooms.get($store.activeRoomId) : null
);

/**
 * Alle Rooms als sortierte Liste
 * Sortiert nach letzter Aktivität (neueste zuerst)
 */
export const roomList = derived(
  dealRoomStore,
  $store => {
    const rooms = Array.from($store.rooms.values());
    return rooms.sort((a, b) => b.lastActivity - a.lastActivity);
  }
);

/**
 * Anzahl ungelesener Nachrichten (gesamt)
 */
export const totalUnreadCount = derived(
  dealRoomStore,
  $store => {
    let total = 0;
    for (const room of $store.rooms.values()) {
      total += room.unreadCount;
    }
    return total;
  }
);

/**
 * Aktive Rooms (status = 'active')
 */
export const activeRooms = derived(
  roomList,
  $rooms => $rooms.filter(room => room.status === 'active')
);
