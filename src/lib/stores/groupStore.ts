import { writable, derived, get } from 'svelte/store';
import type { GroupConfig, GroupMessage, MarketplaceOffer, OfferReply } from '$lib/nostr/types';
import { deriveChannelId, deriveKeyFromSecret } from '$lib/nostr/crypto';
import { 
  fetchGroupMessages, 
  fetchMarketplaceOffers,
  fetchOfferInterests,
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
        console.log('🔧 [STORE] Initialize Gruppe...');
        const channelId = await deriveChannelId(secret);
        const groupKey = await deriveKeyFromSecret(secret);

        update(state => ({
          ...state,
          channelId,
          relay,
          secret,
          groupKey,
          isConnected: true,
          lastFetch: 0,  // ✅ Reset lastFetch beim Initialize!
          messages: [],  // ✅ Leere alte Nachrichten
          offers: []     // ✅ Leere alte Angebote
        }));

        console.log('✅ [STORE] Gruppe initialisiert, lastFetch auf 0 gesetzt');
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
      console.log('🔄 [STORE] loadMessages() aufgerufen:', { loadAll });
      const state = get({ subscribe });
      
      if (!state.channelId || !state.groupKey || !state.relay) {
        console.error('❌ [STORE] Gruppe nicht initialisiert!', { state });
        throw new Error('Gruppe nicht initialisiert');
      }

      console.log('✅ [STORE] Gruppe initialisiert:', { 
        channelId: state.channelId?.substring(0, 16) + '...', 
        relay: state.relay,
        lastFetch: state.lastFetch 
      });

      try {
        // ✅ FIX: Wenn lastFetch === 0, lade IMMER alle (auch wenn loadAll = false)
        // Das passiert beim ersten Login nach initialize()
        const shouldLoadAll = loadAll || state.lastFetch === 0;
        
        // Bei Updates: Nutze lastFetch mit 60 Sekunden Buffer (statt 10) wegen Relay-Delays
        const since = shouldLoadAll ? undefined : (state.lastFetch > 0 ? state.lastFetch - 60 : undefined);
        
        console.log('📊 [STORE] Fetch-Parameter:', { loadAll, shouldLoadAll, since, lastFetch: state.lastFetch });
        
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

        console.log('✅ [STORE] Nachrichten geladen:', messages.length);
        return messages;
      } catch (error) {
        console.error('❌ [STORE] Fehler beim Laden der Nachrichten:', error);
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
      console.log('🛒 [STORE] loadOffers() aufgerufen');
      const state = get({ subscribe });
      
      if (!state.channelId || !state.groupKey || !state.relay) {
        console.error('❌ [STORE] Gruppe nicht initialisiert für Offers!');
        throw new Error('Gruppe nicht initialisiert');
      }

      console.log('✅ [STORE] Gruppe initialisiert für Offers:', { 
        channelId: state.channelId?.substring(0, 16) + '...', 
        relay: state.relay
      });

      try {
        // 1. Lade Angebote
        const events = await fetchMarketplaceOffers(
          state.channelId,
          state.groupKey,
          [state.relay]
        );

        console.log('📦 [STORE] Angebote geladen:', events.length);

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

        // 2. Lade Interesse-Events für alle Angebote
        if (offers.length > 0) {
          const offerIds = offers.map(o => o.id);
          const interests = await fetchOfferInterests(
            offerIds,
            state.groupKey,
            [state.relay]
          );

          console.log('💌 [STORE] Interesse-Events geladen:', interests.length);

          // 3. Ordne Interessen den Angeboten zu
          interests.forEach((interest: any) => {
            const offer = offers.find(o => o.id === interest.offerId);
            if (offer && interest.decrypted) {
              offer.replies.push({
                id: interest.id,
                offerId: interest.offerId,
                pubkey: interest.pubkey,
                content: interest.decrypted,
                created_at: interest.created_at
              });
            }
          });

          // Sortiere replies nach Zeit
          offers.forEach(offer => {
            offer.replies.sort((a, b) => a.created_at - b.created_at);
          });

          console.log('✅ [STORE] Angebote mit Interessen:', 
            offers.filter(o => o.replies.length > 0).length + '/' + offers.length
          );
        }

        update(state => ({
          ...state,
          offers
        }));

        return offers;
      } catch (error) {
        console.error('❌ [STORE] Fehler beim Laden der Angebote:', error);
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
     * Lösche Interesse (zurückziehen)
     */
    deleteInterest: async (interestId: string, privateKey: string) => {
      const state = get({ subscribe });
      
      if (!state.relay) {
        throw new Error('Gruppe nicht initialisiert');
      }

      try {
        console.log('🗑️ [STORE] Ziehe Interesse zurück:', interestId.substring(0, 16) + '...');
        
        await deleteEvent(interestId, privateKey, [state.relay], 'Interesse zurückgezogen');

        // Entferne aus lokalem State
        update(state => {
          const offers = state.offers.map(offer => ({
            ...offer,
            replies: offer.replies.filter(r => r.id !== interestId)
          }));
          return { ...state, offers };
        });

        console.log('✅ [STORE] Interesse erfolgreich zurückgezogen');
      } catch (error) {
        console.error('❌ [STORE] Fehler beim Zurückziehen des Interesses:', error);
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