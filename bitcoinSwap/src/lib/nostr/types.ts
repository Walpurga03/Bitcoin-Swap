// TypeScript-Typdefinitionen für Nostr und unser Projekt

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: Currency;
  paymentMethods: PaymentMethod[];
  createdAt: number;
  tempPubkey?: string; // Für anonyme Angebote
  interests: string[]; // Array von pubkeys, die Interesse gezeigt haben
  status?: OfferStatus;
  expiresAt?: number; // Optional: Ablaufzeit für Angebote
}

export type PaymentMethod = 'rechnung' | 'bargeld' | 'ueberweisung';
export type Currency = 'BTC' | 'EUR' | 'USD' | 'CHF';
export type OfferStatus = 'active' | 'completed' | 'cancelled' | 'expired';

export interface GroupMessage {
  id: string;
  pubkey: string;
  content: string;
  timestamp: number;
  decrypted?: boolean;
  type?: MessageType;
}

export type MessageType = 'text' | 'offer' | 'reaction' | 'system';

export interface UserProfile {
  pubkey: string;
  privkey?: string;
  name?: string;
  picture?: string;
  about?: string;
  nip05?: string; // Nostr address
}

export interface GroupConfig {
  channelId: string;
  relay: string;
  secret: string;
  name?: string;
  description?: string;
}

export interface TempKeyMapping {
  tempPubkey: string;
  realPubkey: string;
  privkey: string;
  offerId: string;
  createdAt: number;
}

// Verbindungsstatus-Typen
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Event-Handler-Typen
export type EventHandler<T = any> = (data: T) => void;
export type ErrorHandler = (error: Error) => void;

// Konfigurationstypen
export interface ClientConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  cacheSize?: number;
}

// Relay-Informationen
export interface RelayInfo {
  url: string;
  status: ConnectionStatus;
  lastConnected?: number;
  errorCount: number;
}

// Filter-Typen für bessere Typsicherheit
export interface OfferFilter {
  currency?: Currency;
  paymentMethods?: PaymentMethod[];
  minAmount?: number;
  maxAmount?: number;
  status?: OfferStatus;
  since?: number;
  until?: number;
}

// API-Response-Typen
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// Validierungstypen
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Utility-Typen
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// ===== PHASE 2: Erweiterte Angebots-Typen =====

/**
 * Erweiterte Bitcoin-Angebots-Struktur für Phase 2
 */
export interface BitcoinOffer {
  id: string;
  type: 'buy' | 'sell';
  amount: number; // in Satoshis
  price: number; // in EUR
  paymentMethods: Array<{
    type: 'cash' | 'bank' | 'rechnung';
    label: string;
    details?: string; // Verschlüsselte Details
  }>;
  location?: string;
  description?: string;
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'expired' | 'completed' | 'cancelled';
  
  // Anonymität
  anonymousKey: string; // Temporärer Public Key
  encrypted: boolean;
  
  // Nostr-spezifisch
  eventId?: string;
  authorPubkey: string;
}

/**
 * Interesse an einem Angebot
 */
export interface OfferInterest {
  id: string;
  offerId: string;
  interestedParty: string; // Anonymer Public Key
  message?: string;
  contactMethod: 'nostr' | 'signal' | 'telegram' | 'email';
  createdAt: number;
  eventId?: string;
}

/**
 * Nostr Event für Bitcoin-Angebote (Kind 30402)
 */
export interface OfferEvent extends Omit<NostrEvent, 'kind' | 'tags'> {
  kind: 30402;
  content: string; // Verschlüsseltes BitcoinOffer JSON
  tags: string[][]; // Standard Nostr tags format
}

/**
 * Nostr Event für Interesse (Kind 7 - Reaction)
 */
export interface InterestEvent extends Omit<NostrEvent, 'kind' | 'tags'> {
  kind: 7;
  content: string; // Verschlüsselte Kontaktdaten
  tags: string[][]; // Standard Nostr tags format
}

/**
 * Helper-Funktionen für Tag-Erstellung
 */
export interface OfferTags {
  createOfferTags: (offer: BitcoinOffer, channelId: string) => string[][];
  createInterestTags: (interest: OfferInterest, offerEventId: string, offerAuthor: string) => string[][];
  parseOfferTags: (tags: string[][]) => {
    channelId?: string;
    offerType?: 'buy' | 'sell';
    amount?: string;
    price?: string;
    expires?: string;
    payment?: string;
    location?: string;
  };
}

/**
 * Temporäres Schlüsselpaar für Anonymität
 */
export interface AnonymousKeyPair {
  privateKey: string;
  publicKey: string;
  npub: string;
  createdAt: number;
  expiresAt: number;
  purpose: 'offer' | 'interest' | 'contact';
}

/**
 * Erweiterte Filter für Phase 2
 */
export interface Phase2OfferFilter {
  type?: 'buy' | 'sell';
  minAmount?: number; // Satoshis
  maxAmount?: number; // Satoshis
  minPrice?: number; // EUR
  maxPrice?: number; // EUR
  paymentMethods?: ('cash' | 'bank' | 'rechnung')[];
  location?: string;
  status?: ('active' | 'expired' | 'completed' | 'cancelled')[];
}

/**
 * Angebots-Statistiken
 */
export interface OfferStats {
  totalOffers: number;
  activeOffers: number;
  buyOffers: number;
  sellOffers: number;
  totalVolume: number; // Satoshis
  averagePrice: number; // EUR
}