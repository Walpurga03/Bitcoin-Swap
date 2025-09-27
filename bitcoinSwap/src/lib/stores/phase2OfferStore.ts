// Erweiterte Angebots-Store für Phase 2
import { writable, derived } from 'svelte/store';
import type { BitcoinOffer, OfferInterest, OfferStats, Phase2OfferFilter } from '$lib/nostr/types';
import type { OfferStoreState, OfferNotification } from '$lib/types/offers';
import { sortOffersByRelevance, isOfferValid } from '$lib/utils/offers';

// Haupt-Store für Angebote
const initialState: OfferStoreState = {
  offers: [],
  interests: [],
  notifications: [],
  filter: {},
  stats: {
    totalOffers: 0,
    activeOffers: 0,
    buyOffers: 0,
    sellOffers: 0,
    totalVolume: 0,
    averagePrice: 0
  },
  loading: false,
  error: null
};

export const offerStore = writable<OfferStoreState>(initialState);

// Einzelne Stores für bessere Reaktivität
export const bitcoinOffers = writable<BitcoinOffer[]>([]);
export const offerInterests = writable<OfferInterest[]>([]);
export const offerNotifications = writable<OfferNotification[]>([]);
export const offerFilter = writable<Phase2OfferFilter>({});
export const offerLoading = writable<boolean>(false);
export const offerError = writable<string | null>(null);

// Derived Stores
export const activeOffers = derived(bitcoinOffers, ($offers) => 
  $offers.filter(offer => isOfferValid(offer))
);

export const buyOffers = derived(activeOffers, ($activeOffers) => 
  $activeOffers.filter(offer => offer.type === 'buy')
);

export const sellOffers = derived(activeOffers, ($activeOffers) => 
  $activeOffers.filter(offer => offer.type === 'sell')
);

export const filteredOffers = derived(
  [bitcoinOffers, offerFilter],
  ([$offers, $filter]) => {
    let filtered = $offers;
    
    // Filter nach Typ
    if ($filter.type) {
      filtered = filtered.filter(offer => offer.type === $filter.type);
    }
    
    // Filter nach Betrag
    if ($filter.minAmount) {
      filtered = filtered.filter(offer => offer.amount >= $filter.minAmount!);
    }
    if ($filter.maxAmount) {
      filtered = filtered.filter(offer => offer.amount <= $filter.maxAmount!);
    }
    
    // Filter nach Preis
    if ($filter.minPrice) {
      filtered = filtered.filter(offer => offer.price >= $filter.minPrice!);
    }
    if ($filter.maxPrice) {
      filtered = filtered.filter(offer => offer.price <= $filter.maxPrice!);
    }
    
    // Filter nach Zahlungsmethoden
    if ($filter.paymentMethods && $filter.paymentMethods.length > 0) {
      filtered = filtered.filter(offer => 
        offer.paymentMethods.some(pm => $filter.paymentMethods!.includes(pm.type))
      );
    }
    
    // Filter nach Ort
    if ($filter.location) {
      filtered = filtered.filter(offer => 
        offer.location?.toLowerCase().includes($filter.location!.toLowerCase())
      );
    }
    
    // Filter nach Status
    if ($filter.status && $filter.status.length > 0) {
      filtered = filtered.filter(offer => $filter.status!.includes(offer.status));
    }
    
    return sortOffersByRelevance(filtered);
  }
);

export const offerStats = derived(bitcoinOffers, ($offers): OfferStats => {
  const active = $offers.filter(offer => isOfferValid(offer));
  const buy = active.filter(offer => offer.type === 'buy');
  const sell = active.filter(offer => offer.type === 'sell');
  
  const totalVolume = active.reduce((sum, offer) => sum + offer.amount, 0);
  const averagePrice = active.length > 0 
    ? active.reduce((sum, offer) => sum + offer.price, 0) / active.length 
    : 0;
  
  return {
    totalOffers: $offers.length,
    activeOffers: active.length,
    buyOffers: buy.length,
    sellOffers: sell.length,
    totalVolume,
    averagePrice
  };
});

export const unreadNotifications = derived(offerNotifications, ($notifications) => 
  $notifications.filter(n => !n.read)
);

// Store-Aktionen
export const offerActions = {
  // Angebot hinzufügen
  addOffer: (offer: BitcoinOffer) => {
    bitcoinOffers.update(current => {
      // Duplikate vermeiden
      if (current.find(o => o.id === offer.id)) {
        return current;
      }
      return [...current, offer];
    });
  },

  // Angebot aktualisieren
  updateOffer: (offerId: string, updates: Partial<BitcoinOffer>) => {
    bitcoinOffers.update(current => 
      current.map(offer => 
        offer.id === offerId ? { ...offer, ...updates } : offer
      )
    );
  },

  // Angebot entfernen
  removeOffer: (offerId: string) => {
    bitcoinOffers.update(current => current.filter(offer => offer.id !== offerId));
  },

  // Interesse hinzufügen
  addInterest: (interest: OfferInterest) => {
    offerInterests.update(current => {
      if (current.find(i => i.id === interest.id)) {
        return current;
      }
      return [...current, interest];
    });
  },

  // Interesse für Angebot abrufen
  getInterestsForOffer: (offerId: string): OfferInterest[] => {
    let interests: OfferInterest[] = [];
    offerInterests.subscribe(current => {
      interests = current.filter(i => i.offerId === offerId);
    })();
    return interests;
  },

  // Benachrichtigung hinzufügen
  addNotification: (notification: OfferNotification) => {
    offerNotifications.update(current => [...current, notification]);
  },

  // Benachrichtigung als gelesen markieren
  markNotificationRead: (notificationId: string) => {
    offerNotifications.update(current => 
      current.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  },

  // Alle Benachrichtigungen als gelesen markieren
  markAllNotificationsRead: () => {
    offerNotifications.update(current => 
      current.map(n => ({ ...n, read: true }))
    );
  },

  // Filter setzen
  setFilter: (filter: Phase2OfferFilter) => {
    offerFilter.set(filter);
  },

  // Filter zurücksetzen
  clearFilter: () => {
    offerFilter.set({});
  },

  // Loading-Status setzen
  setLoading: (loading: boolean) => {
    offerLoading.set(loading);
  },

  // Fehler setzen
  setError: (error: string | null) => {
    offerError.set(error);
  },

  // Alle Daten zurücksetzen
  reset: () => {
    bitcoinOffers.set([]);
    offerInterests.set([]);
    offerNotifications.set([]);
    offerFilter.set({});
    offerLoading.set(false);
    offerError.set(null);
  },

  // Angebot nach ID finden
  getOfferById: (offerId: string): BitcoinOffer | undefined => {
    let offer: BitcoinOffer | undefined;
    bitcoinOffers.subscribe(current => {
      offer = current.find(o => o.id === offerId);
    })();
    return offer;
  },

  // Abgelaufene Angebote bereinigen
  cleanupExpiredOffers: () => {
    bitcoinOffers.update(current => 
      current.filter(offer => isOfferValid(offer) || offer.status !== 'expired')
    );
  }
};

// Persistierung im localStorage
if (typeof window !== 'undefined') {
  // Angebote laden
  const storedOffers = localStorage.getItem('bitcoin-offers-phase2');
  if (storedOffers) {
    try {
      const parsed = JSON.parse(storedOffers);
      bitcoinOffers.set(parsed);
    } catch (error) {
      console.warn('Fehler beim Laden der Angebote aus localStorage:', error);
    }
  }

  // Interesse laden
  const storedInterests = localStorage.getItem('bitcoin-interests-phase2');
  if (storedInterests) {
    try {
      const parsed = JSON.parse(storedInterests);
      offerInterests.set(parsed);
    } catch (error) {
      console.warn('Fehler beim Laden der Interessen aus localStorage:', error);
    }
  }

  // Benachrichtigungen laden
  const storedNotifications = localStorage.getItem('bitcoin-notifications-phase2');
  if (storedNotifications) {
    try {
      const parsed = JSON.parse(storedNotifications);
      offerNotifications.set(parsed);
    } catch (error) {
      console.warn('Fehler beim Laden der Benachrichtigungen aus localStorage:', error);
    }
  }

  // Automatisches Speichern
  bitcoinOffers.subscribe(value => {
    localStorage.setItem('bitcoin-offers-phase2', JSON.stringify(value));
  });

  offerInterests.subscribe(value => {
    localStorage.setItem('bitcoin-interests-phase2', JSON.stringify(value));
  });

  offerNotifications.subscribe(value => {
    localStorage.setItem('bitcoin-notifications-phase2', JSON.stringify(value));
  });
}

// Automatische Bereinigung abgelaufener Angebote (alle 5 Minuten)
if (typeof window !== 'undefined') {
  setInterval(() => {
    offerActions.cleanupExpiredOffers();
  }, 5 * 60 * 1000);
}