import { writable, derived, get } from 'svelte/store';
import type { GroupConfig, GroupMessage, MarketplaceOffer, OfferReply } from '$lib/nostr/types';
import { deriveChannelId, deriveKeyFromSecret } from '$lib/nostr/crypto';
import { 
  fetchGroupMessages, 
  fetchMarketplaceOffers,
  sendGroupMessage,
  createMarketplaceOffer,
  sendOfferInterest,
  deleteEvent
} from '$lib/nostr/client';

// Group Store State
interface GroupState {
  channelId: string | null;
  relay: string | null;
  secret: string | null;
  groupKey: string | null;
  messages: GroupMessage[];
  offers: MarketplaceOffer[];
  isConnected: boolean;
  lastFetch: number;
}

const initialState: GroupState = {
  channelId: null,
  relay: null,
  secret: null,
  groupKey: null,
  messages: [],
  offers: [],
  isConnected: false,
  lastFetch: 0
};

function createGroupStore() {
  const { subscribe, set, update } = writable<GroupState>(initialState);

  return {
    subscribe,

    /**
     * Initialisiere Gruppe mit Secret und Relay
     */
    initialize: async (secret: string, relay: string) => {
      try {
        const channelId = await deriveChannelId(secret);
        const groupKey = await deriveKeyFromSecret(secret);

        update(state => ({
          ...state,
          channelId,
          relay,
          secret,
          groupKey,
          isConnected: true
        }));

        return { channelId, groupKey };
      } catch (error) {
        console.error('Fehler beim Initialisieren der Gruppe:', error);
        throw error;
      }
    },

    /**
     * Lade Nachrichten
     */
    loadMessages: async (loadAll: boolean = false) => {
      const state = get({ subscribe });
      
      if (!state.channelId || !state.groupKey || !state.relay) {
        throw new Error('Gruppe nicht initialisiert');
      }

      try {
        // Beim ersten Laden oder wenn explizit gewünscht, lade alle Nachrichten
        const since = loadAll ? undefined : state.lastFetch;
        
        const events = await fetchGroupMessages(
          state.channelId,
          state.groupKey,
          [state.relay],
          since,
          loadAll ? 200 : 100 // Mehr Nachrichten beim ersten Laden
        );

        const messages: GroupMessage[] = events
          .filter((e: any) => e.decrypted)
          .map((e: any) => ({
            id: e.id,
            content: e.decrypted!,
            pubkey: e.pubkey,
            created_at: e.created_at
          }))
          .sort((a: GroupMessage, b: GroupMessage) => a.created_at - b.created_at);

        // Beim ersten Laden ersetze alle Nachrichten, sonst füge neue hinzu
        update(state => {
          if (loadAll) {
            return {
              ...state,
              messages: messages,
              lastFetch: Math.floor(Date.now() / 1000)
            };
          } else {
            // Verhindere Duplikate
            const existingIds = new Set(state.messages.map(m => m.id));
            const newMessages = messages.filter(m => !existingIds.has(m.id));
            
            return {
              ...state,
              messages: [...state.messages, ...newMessages],
              lastFetch: Math.floor(Date.now() / 1000)
            };
          }
        });

        return messages;
      } catch (error) {
        console.error('Fehler beim Laden der Nachrichten:', error);
        throw error;
      }
    },

    /**
     * Sende Nachricht
     */
    sendMessage: async (content: string, privateKey: string) => {
      const state = get({ subscribe });
      
      if (!state.channelId || !state.groupKey || !state.relay) {
        throw new Error('Gruppe nicht initialisiert');
      }

      try {
        const event = await sendGroupMessage(
          content,
          state.channelId,
          state.groupKey,
          privateKey,
          [state.relay]
        );

        // Füge Nachricht lokal hinzu
        const message: GroupMessage = {
          id: event.id,
          content,
          pubkey: event.pubkey,
          created_at: event.created_at
        };

        update(state => ({
          ...state,
          messages: [...state.messages, message]
        }));

        return message;
      } catch (error) {
        console.error('Fehler beim Senden der Nachricht:', error);
        throw error;
      }
    },

    /**
     * Lade Marketplace-Angebote
     */
    loadOffers: async () => {
      const state = get({ subscribe });
      
      if (!state.channelId || !state.groupKey || !state.relay) {
        throw new Error('Gruppe nicht initialisiert');
      }

      try {
        const events = await fetchMarketplaceOffers(
          state.channelId,
          state.groupKey,
          [state.relay]
        );

        const offers: MarketplaceOffer[] = events
          .filter((e: any) => e.decrypted)
          .map((e: any) => ({
            id: e.id,
            content: e.decrypted!,
            tempPubkey: e.pubkey,
            created_at: e.created_at,
            replies: [],
            status: 'active' as const
          }));

        update(state => ({
          ...state,
          offers
        }));

        return offers;
      } catch (error) {
        console.error('Fehler beim Laden der Angebote:', error);
        throw error;
      }
    },

    /**
     * Erstelle neues Angebot
     */
    createOffer: async (content: string, tempPrivateKey: string) => {
      const state = get({ subscribe });
      
      if (!state.channelId || !state.groupKey || !state.relay) {
        throw new Error('Gruppe nicht initialisiert');
      }

      try {
        const event = await createMarketplaceOffer(
          content,
          state.channelId,
          state.groupKey,
          tempPrivateKey,
          [state.relay]
        );

        const offer: MarketplaceOffer = {
          id: event.id,
          content,
          tempPubkey: event.pubkey,
          created_at: event.created_at,
          replies: [],
          status: 'active'
        };

        update(state => ({
          ...state,
          offers: [...state.offers, offer]
        }));

        return offer;
      } catch (error) {
        console.error('Fehler beim Erstellen des Angebots:', error);
        throw error;
      }
    },

    /**
     * Sende Interesse an Angebot
     */
    sendInterest: async (offerId: string, message: string, privateKey: string) => {
      const state = get({ subscribe });
      
      if (!state.channelId || !state.groupKey || !state.relay) {
        throw new Error('Gruppe nicht initialisiert');
      }

      try {
        await sendOfferInterest(
          offerId,
          message,
          state.channelId,
          state.groupKey,
          privateKey,
          [state.relay]
        );
      } catch (error) {
        console.error('Fehler beim Senden des Interesses:', error);
        throw error;
      }
    },

    /**
     * Lösche Angebot
     */
    deleteOffer: async (offerId: string, privateKey: string) => {
      const state = get({ subscribe });
      
      if (!state.relay) {
        throw new Error('Gruppe nicht initialisiert');
      }

      try {
        await deleteEvent(offerId, privateKey, [state.relay], 'Angebot gelöscht');

        update(state => ({
          ...state,
          offers: state.offers.filter(o => o.id !== offerId)
        }));
      } catch (error) {
        console.error('Fehler beim Löschen des Angebots:', error);
        throw error;
      }
    },

    /**
     * Füge Nachricht hinzu (für Echtzeit-Updates)
     */
    addMessage: (message: GroupMessage) => {
      update(state => ({
        ...state,
        messages: [...state.messages, message]
      }));
    },

    /**
     * Lösche alle Daten
     */
    clearGroupData: () => {
      set(initialState);
    },

    /**
     * Reset Store
     */
    reset: () => set(initialState)
  };
}

export const groupStore = createGroupStore();

// Derived Stores
export const channelId = derived(
  groupStore,
  $group => $group.channelId
);

export const isGroupConnected = derived(
  groupStore,
  $group => $group.isConnected
);

export const groupMessages = derived(
  groupStore,
  $group => $group.messages
);

export const marketplaceOffers = derived(
  groupStore,
  $group => $group.offers
);

export const activeOffers = derived(
  groupStore,
  $group => $group.offers.filter(o => o.status === 'active')
);