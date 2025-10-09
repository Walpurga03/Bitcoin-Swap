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
  since?: number;
  until?: number;
  limit?: number;
}

// Invite Link Data
export interface InviteLinkData {
  relay: string;
  secret: string;
}