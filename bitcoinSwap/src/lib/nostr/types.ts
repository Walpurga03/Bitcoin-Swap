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