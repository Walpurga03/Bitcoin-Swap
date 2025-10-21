// Nostr Event Types
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface UnsignedEvent {
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
}

// User Profile
export interface UserProfile {
  pubkey: string;
  name?: string;
  tempPrivkey?: string;
}

// Group Configuration
export interface GroupConfig {
  channelId: string;
  relay: string;
  secret: string;
}

// Group Message
export interface GroupMessage {
  id: string;
  content: string;
  pubkey: string;
  created_at: number;
  author?: string;
}

// Marketplace Offer
export interface MarketplaceOffer {
  id: string;
  content: string;
  tempPubkey: string;
  created_at: number;
  replies: OfferReply[];
  status: 'active' | 'selected' | 'deleted';
}

// Offer Reply
export interface OfferReply {
  id: string;
  offerId: string;
  pubkey: string;
  content: string;
  created_at: number;
  author?: string;
}

// DM Message
export interface DMMessage {
  id: string;
  content: string;
  sender: string;
  recipient: string;
  created_at: number;
  decrypted?: string;
}

// Relay Connection
export interface RelayConnection {
  url: string;
  connected: boolean;
  relay?: any;
}

// Filter for fetching events
export interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  '#e'?: string[];
  '#p'?: string[];
  '#t'?: string[];
  '#d'?: string[];
  since?: number;
  until?: number;
  limit?: number;
}

// Invite Link Data
export interface InviteLinkData {
  relay: string;
  secret: string;
}

// Deal-Room Types
export interface DealRoom {
  id: string;                    // Unique Deal-Room ID (from d-tag)
  eventId: string;               // Nostr Event ID (for deletion)
  offerId: string;               // Original Offer ID
  offerContent: string;          // Original Offer Content
  participants: {
    seller: string;              // Seller's real pubkey
    buyer: string;               // Buyer's pubkey
  };
  created_at: number;
  status: 'active' | 'completed' | 'cancelled';
  messages: DealMessage[];
}

export interface DealMessage {
  id: string;
  content: string;
  sender: string;                // pubkey of sender
  created_at: number;
  decrypted?: string;
}

export interface DealRoomMetadata {
  dealId: string;
  offerId: string;
  offerContent: string;
  sellerPubkey: string;
  buyerPubkey: string;
  created_at: number;
}

/**
 * NIP-17 Gift-Wrapped Event
 */
export interface GiftWrappedEvent extends NostrEvent {
  kind: 1059;  // Gift-Wrapped
  tags: Array<['p', string]>;  // Nur 'p' Tag für Recipient
}

/**
 * Sealed Direct Message (Inneres NIP-17 Event)
 */
export interface SealedMessage extends NostrEvent {
  kind: 14;  // Sealed Direct Message
  tags: Array<['p', string]>;  // Recipient Pubkey
}

/**
 * Verschlüsselte Metadaten
 */
export interface EncryptedMetadata {
  pubkey?: string;
  name?: string;
  message?: string;
  sellerPubkey?: string;
  buyerPubkey?: string;
  offerId?: string;
  offerContent?: string;
  created_at?: number;
  [key: string]: any;
}