// Svelte Store für Angebote

import { writable } from 'svelte/store';
import type { Offer, TempKeyMapping } from '../nostr/types';

export const offers = writable<Offer[]>([]);

export const tempKeyMappings = writable<TempKeyMapping[]>([]);

// Hilfsfunktionen für den Offer Store
export function addOffer(offer: Offer) {
  offers.update(currentOffers => {
    // Duplikate vermeiden
    const exists = currentOffers.some(o => o.id === offer.id);
    if (!exists) {
      return [...currentOffers, offer].sort((a, b) => b.createdAt - a.createdAt);
    }
    return currentOffers;
  });
}

export function removeOffer(offerId: string) {
  offers.update(currentOffers => 
    currentOffers.filter(offer => offer.id !== offerId)
  );
}

export function addInterestToOffer(offerId: string, pubkey: string) {
  offers.update(currentOffers =>
    currentOffers.map(offer => {
      if (offer.id === offerId && !offer.interests.includes(pubkey)) {
        return {
          ...offer,
          interests: [...offer.interests, pubkey]
        };
      }
      return offer;
    })
  );
}

export function addTempKeyMapping(mapping: TempKeyMapping) {
  tempKeyMappings.update(mappings => {
    // Existierende Zuordnung überschreiben oder neue hinzufügen
    const filtered = mappings.filter(m => m.tempPubkey !== mapping.tempPubkey);
    return [...filtered, mapping];
  });
}

export function getTempKeyMapping(tempPubkey: string): TempKeyMapping | undefined {
  let result: TempKeyMapping | undefined;
  tempKeyMappings.subscribe(mappings => {
    result = mappings.find(m => m.tempPubkey === tempPubkey);
  })();
  return result;
}

export function clearOffers() {
  offers.set([]);
  tempKeyMappings.set([]);
}

// Persistierung im localStorage
if (typeof window !== 'undefined') {
  // Laden beim Start
  const savedMappings = localStorage.getItem('nostr-temp-keys');
  if (savedMappings) {
    try {
      const mappings = JSON.parse(savedMappings);
      tempKeyMappings.set(mappings);
    } catch (error) {
      console.warn('Fehler beim Laden der Temp-Key-Mappings:', error);
    }
  }

  // Speichern bei Änderungen (nur Temp-Key-Mappings, Angebote sind temporär)
  tempKeyMappings.subscribe((mappings) => {
    localStorage.setItem('nostr-temp-keys', JSON.stringify(mappings));
  });
}