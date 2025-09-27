// Nostr Event-Handler für Bitcoin-Angebote (Phase 2)

import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools';
import type { 
  BitcoinOffer, 
  OfferInterest, 
  OfferEvent, 
  InterestEvent,
  AnonymousKeyPair 
} from '$lib/nostr/types';
import { createOfferTags, createInterestTags } from '$lib/utils/offers';

/**
 * Erstellt ein Nostr-Event für ein Bitcoin-Angebot (Kind 30402)
 */
export function createOfferEvent(
  offer: BitcoinOffer,
  channelId: string,
  anonymousPrivKey: Uint8Array
): OfferEvent {
  // Angebots-Daten als JSON serialisieren
  const offerData = {
    id: offer.id,
    type: offer.type,
    amount: offer.amount,
    price: offer.price,
    paymentMethods: offer.paymentMethods,
    location: offer.location,
    description: offer.description,
    expiresAt: offer.expiresAt,
    encrypted: true // Wird verschlüsselt übertragen
  };

  // Tags für das Event erstellen
  const tags = createOfferTags(offer, channelId);

  // Event-Template erstellen
  const eventTemplate = {
    kind: 30402, // Parametrized Replaceable Event für Angebote
    created_at: offer.createdAt,
    content: JSON.stringify(offerData), // Später verschlüsseln
    tags
  };

  // Event finalisieren und signieren
  const signedEvent = finalizeEvent(eventTemplate, anonymousPrivKey) as OfferEvent;
  
  return signedEvent;
}

/**
 * Erstellt ein Nostr-Event für Interesse an einem Angebot (Kind 7 - Reaction)
 */
export function createInterestEvent(
  interest: OfferInterest,
  offerEventId: string,
  offerAuthor: string,
  anonymousPrivKey: Uint8Array
): InterestEvent {
  // Interesse-Daten als JSON serialisieren
  const interestData = {
    id: interest.id,
    offerId: interest.offerId,
    message: interest.message,
    contactMethod: interest.contactMethod,
    encrypted: true // Kontaktdaten werden verschlüsselt
  };

  // Tags für das Event erstellen
  const tags = createInterestTags(interest, offerEventId, offerAuthor);

  // Event-Template erstellen
  const eventTemplate = {
    kind: 7, // Reaction Event
    created_at: interest.createdAt,
    content: JSON.stringify(interestData), // Später verschlüsseln
    tags
  };

  // Event finalisieren und signieren
  const signedEvent = finalizeEvent(eventTemplate, anonymousPrivKey) as InterestEvent;
  
  return signedEvent;
}

/**
 * Parst ein Nostr-Event zu einem Bitcoin-Angebot
 */
export function parseOfferEvent(event: OfferEvent): BitcoinOffer | null {
  try {
    // Content als JSON parsen
    const offerData = JSON.parse(event.content);
    
    // Tags parsen
    const parsedTags = parseEventTags(event.tags);
    
    // BitcoinOffer-Objekt erstellen
    const offer: BitcoinOffer = {
      id: offerData.id,
      type: offerData.type,
      amount: offerData.amount,
      price: offerData.price,
      paymentMethods: offerData.paymentMethods || [],
      location: offerData.location,
      description: offerData.description,
      createdAt: event.created_at,
      expiresAt: offerData.expiresAt,
      status: 'active', // Default status
      anonymousKey: event.pubkey,
      encrypted: offerData.encrypted || false,
      eventId: event.id,
      authorPubkey: event.pubkey
    };

    return offer;
  } catch (error) {
    console.error('Fehler beim Parsen des Angebots-Events:', error);
    return null;
  }
}

/**
 * Parst ein Nostr-Event zu einem Angebots-Interesse
 */
export function parseInterestEvent(event: InterestEvent): OfferInterest | null {
  try {
    // Content als JSON parsen
    const interestData = JSON.parse(event.content);
    
    // Angebots-Event-ID aus Tags extrahieren
    const offerEventId = event.tags.find(tag => tag[0] === 'e')?.[1];
    if (!offerEventId) {
      console.warn('Keine Angebots-Event-ID in Interest-Event gefunden');
      return null;
    }

    // OfferInterest-Objekt erstellen
    const interest: OfferInterest = {
      id: interestData.id,
      offerId: interestData.offerId,
      interestedParty: event.pubkey,
      message: interestData.message,
      contactMethod: interestData.contactMethod,
      createdAt: event.created_at,
      eventId: event.id
    };

    return interest;
  } catch (error) {
    console.error('Fehler beim Parsen des Interest-Events:', error);
    return null;
  }
}

/**
 * Prüft ob ein Event ein Bitcoin-Angebots-Event ist
 */
export function isOfferEvent(event: any): event is OfferEvent {
  return event.kind === 30402 && 
         event.tags.some((tag: string[]) => tag[0] === 't' && tag[1] === 'bitcoin-offer');
}

/**
 * Prüft ob ein Event ein Interest-Event ist
 */
export function isInterestEvent(event: any): event is InterestEvent {
  return event.kind === 7 && 
         event.tags.some((tag: string[]) => tag[0] === 'k' && tag[1] === '30402');
}

/**
 * Hilfsfunktion zum Parsen von Event-Tags
 */
function parseEventTags(tags: string[][]): Record<string, any> {
  const parsed: Record<string, any> = {};
  
  for (const tag of tags) {
    switch (tag[0]) {
      case 'e':
        parsed.channelId = tag[1];
        break;
      case 'offer_type':
        parsed.offerType = tag[1];
        break;
      case 'amount':
        parsed.amount = parseInt(tag[1]);
        break;
      case 'price':
        parsed.price = parseFloat(tag[1]);
        break;
      case 'expires':
        parsed.expires = parseInt(tag[1]);
        break;
      case 'payment':
        parsed.payment = tag[1].split(',');
        break;
      case 'location':
        parsed.location = tag[1];
        break;
      case 'contact':
        parsed.contactMethod = tag[1];
        break;
    }
  }
  
  return parsed;
}

/**
 * Erstellt Filter für Angebots-Events
 */
export function createOfferFilters(channelId: string, since?: number) {
  const filters = [
    {
      kinds: [30402], // Bitcoin-Angebote
      '#t': ['bitcoin-offer'],
      '#e': [channelId],
      since: since || Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) // Letzte 7 Tage
    },
    {
      kinds: [7], // Interest-Reaktionen
      '#k': ['30402'],
      since: since || Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60) // Letzte 7 Tage
    }
  ];

  return filters;
}

/**
 * Erstellt Filter für spezifische Angebots-Updates
 */
export function createOfferUpdateFilters(offerEventIds: string[]) {
  return [
    {
      kinds: [7], // Interest-Reaktionen
      '#e': offerEventIds,
      '#k': ['30402']
    }
  ];
}

/**
 * Validiert ein Angebots-Event
 */
export function validateOfferEvent(event: OfferEvent): boolean {
  try {
    // Grundlegende Event-Validierung
    if (!event.id || !event.pubkey || !event.sig) {
      return false;
    }

    // Kind prüfen
    if (event.kind !== 30402) {
      return false;
    }

    // Tags prüfen
    const hasOfferTag = event.tags.some(tag => tag[0] === 't' && tag[1] === 'bitcoin-offer');
    const hasChannelTag = event.tags.some(tag => tag[0] === 'e');
    
    if (!hasOfferTag || !hasChannelTag) {
      return false;
    }

    // Content parsen und validieren
    const offerData = JSON.parse(event.content);
    if (!offerData.id || !offerData.type || !offerData.amount || !offerData.price) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Fehler bei der Event-Validierung:', error);
    return false;
  }
}

/**
 * Validiert ein Interest-Event
 */
export function validateInterestEvent(event: InterestEvent): boolean {
  try {
    // Grundlegende Event-Validierung
    if (!event.id || !event.pubkey || !event.sig) {
      return false;
    }

    // Kind prüfen
    if (event.kind !== 7) {
      return false;
    }

    // Tags prüfen
    const hasOfferReference = event.tags.some(tag => tag[0] === 'e');
    const hasKindTag = event.tags.some(tag => tag[0] === 'k' && tag[1] === '30402');
    
    if (!hasOfferReference || !hasKindTag) {
      return false;
    }

    // Content parsen und validieren
    const interestData = JSON.parse(event.content);
    if (!interestData.id || !interestData.offerId || !interestData.contactMethod) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Fehler bei der Interest-Event-Validierung:', error);
    return false;
  }
}

/**
 * Extrahiert die Channel-ID aus einem Event
 */
export function extractChannelId(event: OfferEvent | InterestEvent): string | null {
  const channelTag = event.tags.find(tag => tag[0] === 'e');
  return channelTag ? channelTag[1] : null;
}

/**
 * Extrahiert die Angebots-ID aus einem Interest-Event
 */
export function extractOfferIdFromInterest(event: InterestEvent): string | null {
  try {
    const interestData = JSON.parse(event.content);
    return interestData.offerId || null;
  } catch (error) {
    console.error('Fehler beim Extrahieren der Angebots-ID:', error);
    return null;
  }
}