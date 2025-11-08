import { writable, derived, get } from 'svelte/store';
import type { GroupConfig, MarketplaceOffer, OfferReply } from '$lib/nostr/types';
import { 
  deriveChannelId, 
  deriveKeyFromSecret,
  generateTempKeypair
} from '$lib/nostr/crypto';
import { 
  fetchMarketplaceOffers,
  fetchOfferInterests,
  createMarketplaceOffer,
  sendOfferInterest,
  deleteEvent
} from '$lib/nostr/client';
import {
  createOffer as createOfferMarketplace,
  deleteOffer as deleteOfferMarketplace,
  loadOffers,
  hasActiveOffer as checkActiveOffer
} from '$lib/nostr/marketplace';

// Group Store State
interface GroupState {
  channelId: string | null;
  relay: string | null;
  secret: string | null;
  secretHash: string | null;
  groupKey: string | null;
  offers: MarketplaceOffer[];
  isConnected: boolean;
  lastFetch: number;
}

const initialState: GroupState = {
  channelId: null,
  relay: null,
  secret: null,
  secretHash: null,
  groupKey: null,
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
        const secretHash = await deriveChannelId(secret); // Identisch mit channelId für Gruppen-Isolation

        update(state => ({
          ...state,
          channelId,
          relay,
          secret,
          secretHash,
          groupKey,
          isConnected: true,
          lastFetch: 0,
          offers: []
        }));

        console.log('✅ [STORE] Gruppe initialisiert');
        return { channelId, groupKey };
      } catch (error) {
        console.error('Fehler beim Initialisieren der Gruppe:', error);
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
  // 🔐 VERBESSERUNG: Parse Pubkeys aus verschlüsselten Metadaten
  interests.forEach((interest: any) => {
    const offer = offers.find(o => o.id === interest.offerId);
    if (offer && interest.decrypted) {
      try {
        // Versuche Metadaten zu parsen
        const metadata = JSON.parse(interest.decrypted);
        offer.replies.push({
          id: interest.id,
          offerId: interest.offerId,
          pubkey: metadata.pubkey || interest.pubkey,  // 🔐 Aus Metadaten!
          content: `${metadata.name || 'Anonym'}: ${metadata.message || interest.decrypted}`,
          created_at: interest.created_at
        });
      } catch (e) {
        // Fallback für alte Events (vor Update)
        console.warn('⚠️ Könnte Interesse-Metadaten nicht parsen, verwende Fallback');
        offer.replies.push({
          id: interest.id,
          offerId: interest.offerId,
          pubkey: interest.pubkey,
          content: interest.decrypted,
          created_at: interest.created_at
        });
      }
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
    sendInterest: async (offerId: string, message: string, userName: string, privateKey: string) => {
      const state = get({ subscribe });
      
      if (!state.channelId || !state.groupKey || !state.relay) {
        throw new Error('Gruppe nicht initialisiert');
      }

      try {
        await sendOfferInterest(
          offerId,
          message,
          userName,
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

export const marketplaceOffers = derived(
  groupStore,
  $group => $group.offers
);

export const activeOffers = derived(
  groupStore,
  $group => $group.offers.filter(o => o.status === 'active')
);