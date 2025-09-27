// Utility-Funktionen für Bitcoin-Angebote (Phase 2)

import type { BitcoinOffer, OfferInterest, AnonymousKeyPair, CreateOfferForm } from '$lib/types/offers';
import type { OfferEvent, InterestEvent } from '$lib/nostr/types';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';

/**
 * Formatierung von Satoshi-Beträgen
 */
export function formatSatoshis(satoshis: number): string {
  if (satoshis >= 100_000_000) {
    return `${(satoshis / 100_000_000).toFixed(2)} BTC`;
  } else if (satoshis >= 1_000_000) {
    return `${(satoshis / 1_000_000).toFixed(1)}M Sats`;
  } else if (satoshis >= 1_000) {
    return `${(satoshis / 1_000).toFixed(0)}k Sats`;
  } else {
    return `${satoshis} Sats`;
  }
}

/**
 * Formatierung von EUR-Preisen
 */
export function formatPrice(eur: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(eur);
}

/**
 * Berechnung des Gesamtbetrags
 */
export function calculateTotal(satoshis: number, pricePerBtc: number): number {
  const btc = satoshis / 100_000_000;
  return btc * pricePerBtc;
}

/**
 * Prüfung ob Angebot abgelaufen ist
 */
export function isOfferExpired(offer: BitcoinOffer): boolean {
  return Date.now() > offer.expiresAt * 1000;
}

/**
 * Berechnung des Angebots-Alters
 */
export function getOfferAge(offer: BitcoinOffer): string {
  const now = Date.now();
  const created = offer.createdAt * 1000;
  const diffMs = now - created;
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (days > 0) {
    return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  } else if (hours > 0) {
    return `vor ${hours} Stunde${hours > 1 ? 'n' : ''}`;
  } else if (minutes > 0) {
    return `vor ${minutes} Minute${minutes > 1 ? 'n' : ''}`;
  } else {
    return 'gerade eben';
  }
}

/**
 * Validierung von Angebots-Formulardaten
 */
export function validateOfferForm(form: CreateOfferForm): string[] {
  const errors: string[] = [];
  
  // Betrag validieren
  const amount = parseInt(form.amount);
  if (isNaN(amount) || amount <= 0) {
    errors.push('Betrag muss eine positive Zahl sein');
  } else if (amount < 1000) {
    errors.push('Mindestbetrag: 1.000 Satoshis');
  } else if (amount > 100_000_000) {
    errors.push('Maximalbetrag: 1 BTC (100M Satoshis)');
  }
  
  // Preis validieren
  const price = parseFloat(form.price);
  if (isNaN(price) || price <= 0) {
    errors.push('Preis muss eine positive Zahl sein');
  } else if (price < 1) {
    errors.push('Mindestpreis: 1 EUR');
  } else if (price > 1_000_000) {
    errors.push('Maximalpreis: 1.000.000 EUR');
  }
  
  // Zahlungsmethoden validieren
  if (form.paymentMethods.length === 0) {
    errors.push('Mindestens eine Zahlungsmethode erforderlich');
  }
  
  // Ablaufzeit validieren
  if (form.expiresInHours < 1) {
    errors.push('Mindestablaufzeit: 1 Stunde');
  } else if (form.expiresInHours > 168) {
    errors.push('Maximale Ablaufzeit: 7 Tage (168 Stunden)');
  }
  
  // Ort validieren (optional)
  if (form.location && form.location.length > 100) {
    errors.push('Ort darf maximal 100 Zeichen haben');
  }
  
  // Beschreibung validieren (optional)
  if (form.description && form.description.length > 500) {
    errors.push('Beschreibung darf maximal 500 Zeichen haben');
  }
  
  return errors;
}

/**
 * Generierung eines temporären Schlüsselpaars
 */
export function generateAnonymousKeyPair(purpose: 'offer' | 'interest' | 'contact'): AnonymousKeyPair {
  const privateKey = generateSecretKey();
  const publicKey = getPublicKey(privateKey);
  const npub = nip19.npubEncode(publicKey);
  
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (7 * 24 * 60 * 60); // 7 Tage
  
  return {
    privateKey: Array.from(privateKey, b => b.toString(16).padStart(2, '0')).join(''),
    publicKey,
    npub,
    createdAt: now,
    expiresAt,
    purpose
  };
}

/**
 * Erstellung von Nostr-Tags für Angebote
 */
export function createOfferTags(offer: BitcoinOffer, channelId: string): string[][] {
  const tags: string[][] = [
    ['e', channelId], // Channel-ID
    ['t', 'bitcoin-offer'], // Tag für Angebote
    ['offer_type', offer.type], // buy/sell
    ['amount', offer.amount.toString()], // Satoshis
    ['price', offer.price.toString()], // EUR
    ['expires', offer.expiresAt.toString()], // Unix timestamp
    ['payment', offer.paymentMethods.map(pm => pm.type).join(',')], // Zahlungsmethoden
  ];
  
  // Optionale Tags
  if (offer.location) {
    tags.push(['location', offer.location]);
  }
  
  return tags;
}

/**
 * Erstellung von Nostr-Tags für Interesse
 */
export function createInterestTags(
  interest: OfferInterest, 
  offerEventId: string, 
  offerAuthor: string
): string[][] {
  return [
    ['e', offerEventId], // Referenz zur Angebots-Event-ID
    ['p', offerAuthor], // Public Key des Angebots-Erstellers
    ['k', '30402'], // Kind des referenzierten Events
    ['contact', interest.contactMethod], // Kontaktmethode
  ];
}

/**
 * Parsing von Angebots-Tags
 */
export function parseOfferTags(tags: string[][]): {
  channelId?: string;
  offerType?: 'buy' | 'sell';
  amount?: number;
  price?: number;
  expires?: number;
  payment?: string[];
  location?: string;
} {
  const result: any = {};
  
  for (const tag of tags) {
    switch (tag[0]) {
      case 'e':
        result.channelId = tag[1];
        break;
      case 'offer_type':
        result.offerType = tag[1] as 'buy' | 'sell';
        break;
      case 'amount':
        result.amount = parseInt(tag[1]);
        break;
      case 'price':
        result.price = parseFloat(tag[1]);
        break;
      case 'expires':
        result.expires = parseInt(tag[1]);
        break;
      case 'payment':
        result.payment = tag[1].split(',');
        break;
      case 'location':
        result.location = tag[1];
        break;
    }
  }
  
  return result;
}

/**
 * Konvertierung von Satoshis zu BTC
 */
export function satoshisToBtc(satoshis: number): number {
  return satoshis / 100_000_000;
}

/**
 * Konvertierung von BTC zu Satoshis
 */
export function btcToSatoshis(btc: number): number {
  return Math.round(btc * 100_000_000);
}

/**
 * Berechnung des Bitcoin-Preises pro BTC basierend auf Angebot
 */
export function calculateBtcPrice(satoshis: number, eurAmount: number): number {
  const btc = satoshisToBtc(satoshis);
  return eurAmount / btc;
}

/**
 * Formatierung der Zahlungsmethoden für Anzeige
 */
export function formatPaymentMethods(methods: string[]): string {
  const methodLabels: Record<string, string> = {
    cash: '💰 Bar',
    bank: '🏦 Bank',
    rechnung: '📄 Rechnung'
  };
  
  return methods.map(method => methodLabels[method] || method).join(', ');
}

/**
 * Generierung einer eindeutigen Angebots-ID
 */
export function generateOfferId(): string {
  return `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generierung einer eindeutigen Interesse-ID
 */
export function generateInterestId(): string {
  return `interest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Prüfung ob ein Angebot noch gültig ist
 */
export function isOfferValid(offer: BitcoinOffer): boolean {
  return offer.status === 'active' && !isOfferExpired(offer);
}

/**
 * Sortierung von Angeboten nach Relevanz
 */
export function sortOffersByRelevance(offers: BitcoinOffer[]): BitcoinOffer[] {
  return offers.sort((a, b) => {
    // Aktive Angebote zuerst
    if (a.status !== b.status) {
      if (a.status === 'active') return -1;
      if (b.status === 'active') return 1;
    }
    
    // Dann nach Erstellungsdatum (neueste zuerst)
    return b.createdAt - a.createdAt;
  });
}