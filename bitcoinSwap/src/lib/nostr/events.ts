// Hilfsfunktionen zum Erstellen von Nostr-Events

import { type Event as NostrEvent, type UnsignedEvent, finalizeEvent } from 'nostr-tools';
import type { Offer, PaymentMethod } from './types';

/**
 * Erstellt ein Nostr-Event für ein Bitcoin-Angebot
 */
export function createOfferEvent(
  offer: Omit<Offer, 'id' | 'createdAt' | 'interests'>,
  userPubkey: string,
  userPrivkey: Uint8Array
): NostrEvent {
  // Tags für das Angebot
  const tags: string[][] = [
    ['t', 'bitcoin-offer'], // Angebots-Tag
    ['amount', offer.amount.toString()], // Bitcoin-Betrag
    ['currency', offer.currency], // Währung (EUR, USD, etc.)
  ];

  // Füge Zahlungsmethoden als Tags hinzu
  offer.paymentMethods.forEach(method => {
    tags.push(['payment', method]);
  });

  // Event-Struktur
  const event: UnsignedEvent = {
    kind: 30078, // NIP-78 App-specific data
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: JSON.stringify({
      title: offer.title,
      description: offer.description,
      amount: offer.amount,
      currency: offer.currency,
      paymentMethods: offer.paymentMethods
    }),
    pubkey: userPubkey
  };

  return finalizeEvent(event, userPrivkey);
}

/**
 * Erstellt eine Interest-Reaction für ein Angebot
 */
export function createInterestReaction(offerId: string, userPubkey: string, userPrivkey: Uint8Array): NostrEvent {
  const tags: string[][] = [
    ['e', offerId], // Referenz zum Angebot
  ];

  const event: UnsignedEvent = {
    kind: 7, // NIP-25 Reaction
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: '👍',
    pubkey: userPubkey,
  };

  return finalizeEvent(event, userPrivkey);
}

/**
 * Parst ein Nostr-Event zu einem Offer-Objekt
 */
export function parseOfferEvent(event: NostrEvent): Offer | null {
  try {
    const content = JSON.parse(event.content);
    
    // Extrahiere Zahlungsmethoden aus Tags
    const paymentMethods: PaymentMethod[] = [];
    for (const tag of event.tags) {
      if (tag[0] === 'payment' && tag[1]) {
        paymentMethods.push(tag[1] as PaymentMethod);
      }
    }

    return {
      id: event.id,
      title: content.title || 'Unbekanntes Angebot',
      description: content.description || '',
      amount: content.amount || 0,
      currency: content.currency || 'EUR',
      paymentMethods: paymentMethods.length > 0 ? paymentMethods : content.paymentMethods || [],
      createdAt: event.created_at,
      interests: []
    };
  } catch (error) {
    console.error('Fehler beim Parsen des Offer-Events:', error);
    return null;
  }
}

/**
 * Prüft ob ein Event ein Bitcoin-Angebot ist
 */
export function isOfferEvent(event: NostrEvent): boolean {
  return event.kind === 30078 && 
         event.tags.some(tag => tag[0] === 't' && tag[1] === 'bitcoin-offer');
}

/**
 * Prüft ob ein Event eine Interesse-Reaktion ist
 */
export function isInterestReaction(event: NostrEvent): boolean {
  return event.kind === 7 && event.content === '👍';
}