/**
 * Zentrale Konfiguration für das Bitcoin-Tausch-Netzwerk
 *
 * Diese Datei enthält alle wichtigen Konstanten, die an mehreren Stellen verwendet werden.
 * Änderungen hier wirken sich auf die gesamte Anwendung aus.
 */

/**
 * Gruppen-Tag für Nostr Events
 * Dieser Tag identifiziert alle Events, die zu dieser Bitcoin-Gruppe gehören.
 * WICHTIG: Änderungen hier machen die App inkompatibel mit bestehenden Daten!
 */
export const GROUP_TAG = 'bitcoin-group';

/**
 * Standard-Relays zur Auswahl
 * Nur eigener Relay für volle Kontrolle
 */
export const DEFAULT_RELAYS = [
  'wss://nostr-relay.online'
];

/**
 * Lightning-Adresse für Spenden
 */
export const LIGHTNING_ADDRESS = 'aldo.barazutti@walletofsatoshi.com'

/**
 * Nostr Event Kinds
 * Diese Kinds werden tatsächlich im Code verwendet
 */
export const EVENT_KINDS = {
  /** Gruppen-Nachrichten (Kind 1 - normale Nostr Notes) */
  GROUP_MESSAGE: 1,
  
  /** Marketplace-Angebote (Kind 30000 - Replaceable Event) */
  MARKETPLACE_OFFER: 30000,
  
  /** Interesse an Angeboten (Kind 1 - normale Nostr Notes mit reply-Tag) */
  MARKETPLACE_INTEREST: 1,
  
  /** Deal-Room Events (Kind 30080 - Replaceable Event) */
  DEAL_ROOM: 30080,
  
  /** Deal-Room Nachrichten (Kind 1 - normale Nostr Notes) */
  DEAL_MESSAGE: 1,
  
  /** Whitelist (Kind 30000 - NIP-33 Replaceable Event) */
  WHITELIST: 30000,
  
  /** Delete Event (Kind 5 - NIP-09) */
  DELETE: 5
} as const;

/**
 * Populäre Nostr Relays für Profil-Abfragen (Kind 0 Metadata)
 * Diese werden NUR verwendet um User-Namen/Profile zu laden
 * NICHT für Gruppen-Daten!
 */
export const POPULAR_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://nostr.wine'
];