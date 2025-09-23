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
  currency: string;
  paymentMethods: PaymentMethod[];
  createdAt: number;
  tempPubkey?: string; // Für anonyme Angebote
  interests: string[]; // Array von pubkeys, die Interesse gezeigt haben
}

export type PaymentMethod = 'rechnung' | 'bargeld' | 'ueberweisung';

export interface GroupMessage {
  id: string;
  pubkey: string;
  content: string;
  timestamp: number;
  decrypted?: boolean;
}

export interface UserProfile {
  pubkey: string;
  privkey?: string;
  name?: string;
  picture?: string;
}

export interface GroupConfig {
  channelId: string;
  relay: string;
  secret: string;
}

export interface TempKeyMapping {
  tempPubkey: string;
  realPubkey: string;
  privkey: string;
  offerId: string;
}