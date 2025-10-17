import { writable, derived, get } from 'svelte/store';
import type { DealRoom, DealMessage } from '$lib/nostr/types';
import {
  createDealRoom,
  fetchDealRooms,
  sendDealMessage,
  fetchDealMessages,
  deleteEvent
} from '$lib/nostr/client';

// Deal Store State
interface DealState {
  rooms: DealRoom[];
  activeRoomId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: DealState = {
  rooms: [],
  activeRoomId: null,
  isLoading: false,
  error: null
};

function createDealStore() {
  const { subscribe, set, update } = writable<DealState>(initialState);

  return {
    subscribe,

    /**
     * Lade alle Deal-Rooms für einen User
     */
    loadRooms: async (userPubkey: string, groupKey: string, relay: string) => {
      try {
        console.log('🏠 [DEAL-STORE] Lade Deal-Rooms...');
        update(state => ({ ...state, isLoading: true, error: null }));

        const events = await fetchDealRooms(userPubkey, groupKey, [relay]);

        // Konvertiere Events zu DealRoom-Objekten
        const rooms: DealRoom[] = events.map(event => {
          const metadata = event.decrypted;
          const dealId = event.tags.find(t => t[0] === 'd')?.[1] || event.id;

          return {
            id: dealId,
            offerId: metadata.offerId,
            offerContent: metadata.offerContent,
            participants: {
              seller: metadata.sellerPubkey,
              buyer: metadata.buyerPubkey
            },
            created_at: event.created_at,
            status: 'active' as const,
            messages: []
          };
        });

        console.log('✅ [DEAL-STORE] Deal-Rooms geladen:', rooms.length);

        update(state => ({
          ...state,
          rooms,
          isLoading: false
        }));

        return rooms;
      } catch (error: any) {
        console.error('❌ [DEAL-STORE] Fehler beim Laden:', error);
        update(state => ({
          ...state,
          isLoading: false,
          error: error.message || 'Fehler beim Laden der Deal-Rooms'
        }));
        return [];
      }
    },

    /**
     * Erstelle neuen Deal-Room
     */
    createRoom: async (
      offerId: string,
      offerContent: string,
      sellerPubkey: string,
      buyerPubkey: string,
      channelId: string,
      groupKey: string,
      privateKey: string,
      relay: string
    ) => {
      try {
        console.log('🏠 [DEAL-STORE] Erstelle Deal-Room...');
        update(state => ({ ...state, isLoading: true, error: null }));

        const event = await createDealRoom(
          offerId,
          offerContent,
          sellerPubkey,
          buyerPubkey,
          channelId,
          groupKey,
          privateKey,
          [relay]
        );

        const dealId = event.tags.find(t => t[0] === 'd')?.[1] || event.id;

        const newRoom: DealRoom = {
          id: dealId,
          offerId,
          offerContent,
          participants: {
            seller: sellerPubkey,
            buyer: buyerPubkey
          },
          created_at: event.created_at,
          status: 'active',
          messages: []
        };

        update(state => ({
          ...state,
          rooms: [...state.rooms, newRoom],
          activeRoomId: dealId,
          isLoading: false
        }));

        console.log('✅ [DEAL-STORE] Deal-Room erstellt:', dealId);

        return newRoom;
      } catch (error: any) {
        console.error('❌ [DEAL-STORE] Fehler beim Erstellen:', error);
        update(state => ({
          ...state,
          isLoading: false,
          error: error.message || 'Fehler beim Erstellen des Deal-Rooms'
        }));
        throw error;
      }
    },

    /**
     * Lade Nachrichten für einen Deal-Room
     */
    loadMessages: async (dealId: string, groupKey: string, relay: string, since?: number) => {
      try {
        console.log('💬 [DEAL-STORE] Lade Nachrichten für Deal-Room:', dealId);

        const events = await fetchDealMessages(dealId, groupKey, [relay], since);

        const messages: DealMessage[] = events
          .filter(e => e.decrypted)
          .map(e => ({
            id: e.id,
            content: e.decrypted!,
            sender: e.pubkey,
            created_at: e.created_at
          }))
          .sort((a, b) => a.created_at - b.created_at);

        // Update Room mit Nachrichten
        update(state => {
          const rooms = state.rooms.map(room => {
            if (room.id === dealId) {
              // Verhindere Duplikate
              const existingIds = new Set(room.messages.map(m => m.id));
              const newMessages = messages.filter(m => !existingIds.has(m.id));
              
              return {
                ...room,
                messages: [...room.messages, ...newMessages]
              };
            }
            return room;
          });

          return { ...state, rooms };
        });

        console.log('✅ [DEAL-STORE] Nachrichten geladen:', messages.length);

        return messages;
      } catch (error: any) {
        console.error('❌ [DEAL-STORE] Fehler beim Laden der Nachrichten:', error);
        throw error;
      }
    },

    /**
     * Sende Nachricht in Deal-Room
     */
    sendMessage: async (
      dealId: string,
      content: string,
      groupKey: string,
      privateKey: string,
      relay: string
    ) => {
      try {
        console.log('💬 [DEAL-STORE] Sende Nachricht...');

        const event = await sendDealMessage(dealId, content, groupKey, privateKey, [relay]);

        const message: DealMessage = {
          id: event.id,
          content,
          sender: event.pubkey,
          created_at: event.created_at
        };

        // Füge Nachricht lokal hinzu
        update(state => {
          const rooms = state.rooms.map(room => {
            if (room.id === dealId) {
              return {
                ...room,
                messages: [...room.messages, message]
              };
            }
            return room;
          });

          return { ...state, rooms };
        });

        console.log('✅ [DEAL-STORE] Nachricht gesendet');

        return message;
      } catch (error: any) {
        console.error('❌ [DEAL-STORE] Fehler beim Senden:', error);
        throw error;
      }
    },

    /**
     * Lösche Deal-Room (NIP-09)
     */
    deleteDealRoom: async (dealId: string, privateKey: string, relay: string) => {
      try {
        console.log('🗑️ [DEAL-STORE] Lösche Deal-Room:', dealId);
        update(state => ({ ...state, isLoading: true, error: null }));

        // Finde Deal-Room Event-ID
        const state = get({ subscribe });
        const room = state.rooms.find(r => r.id === dealId);
        
        if (!room) {
          throw new Error('Deal-Room nicht gefunden');
        }

        // Lösche Deal-Room Event
        await deleteEvent(dealId, privateKey, [relay], 'Deal abgeschlossen');

        // Entferne aus Store
        update(state => ({
          ...state,
          rooms: state.rooms.filter(r => r.id !== dealId),
          activeRoomId: state.activeRoomId === dealId ? null : state.activeRoomId,
          isLoading: false
        }));

        console.log('✅ [DEAL-STORE] Deal-Room gelöscht');
      } catch (error: any) {
        console.error('❌ [DEAL-STORE] Fehler beim Löschen:', error);
        update(state => ({
          ...state,
          isLoading: false,
          error: error.message || 'Fehler beim Löschen des Deal-Rooms'
        }));
        throw error;
      }
    },

    /**
     * Setze aktiven Deal-Room
     */
    setActiveRoom: (roomId: string | null) => {
      update(state => ({ ...state, activeRoomId: roomId }));
    },

    /**
     * Reset Store
     */
    reset: () => set(initialState)
  };
}

export const dealStore = createDealStore();

// Derived Stores
export const activeDealRoom = derived(
  dealStore,
  $deal => $deal.rooms.find(r => r.id === $deal.activeRoomId) || null
);

export const dealRooms = derived(
  dealStore,
  $deal => $deal.rooms
);

export const isLoadingDeals = derived(
  dealStore,
  $deal => $deal.isLoading
);