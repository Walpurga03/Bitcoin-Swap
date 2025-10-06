import { SimplePool, finalizeEvent, getPublicKey, type Event } from 'nostr-tools';
import type { NostrEvent, NostrFilter, RelayConnection } from './types';
import { deriveChannelId, encryptForGroup, decryptForGroup } from './crypto';
import { RateLimiter } from '$lib/security/validation';

// Globaler Pool für Relay-Verbindungen
let pool: SimplePool | null = null;

// Rate Limiter
const rateLimiter = new RateLimiter(20, 60000); // 20 Requests pro Minute

/**
 * Initialisiere den Nostr Pool
 */
export function initPool(): SimplePool {
  if (!pool) {
    pool = new SimplePool();
  }
  return pool;
}

/**
 * Verbinde zu einem Relay
 */
export async function connectToRelay(relayUrl: string): Promise<RelayConnection> {
  const pool = initPool();
  
  try {
    // Pool verwaltet Verbindungen automatisch
    return {
      url: relayUrl,
      connected: true,
      relay: pool
    };
  } catch (error) {
    console.error(`Fehler beim Verbinden zu ${relayUrl}:`, error);
    return {
      url: relayUrl,
      connected: false
    };
  }
}

/**
 * Erstelle ein Nostr Event
 */
export async function createEvent(
  kind: number,
  content: string,
  tags: string[][],
  privateKey: string
): Promise<NostrEvent> {
  try {
    const pubkey = getPublicKey(privateKey as any);
    
    const event = {
      kind,
      pubkey,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content
    };

    const signedEvent = finalizeEvent(event, privateKey as any);
    return signedEvent as NostrEvent;
  } catch (error) {
    console.error('Fehler beim Erstellen des Events:', error);
    throw new Error('Event konnte nicht erstellt werden');
  }
}

/**
 * Publiziere ein Event zu Relays
 */
export async function publishEvent(
  event: NostrEvent,
  relays: string[]
): Promise<{ success: boolean; relays: string[] }> {
  const pool = initPool();
  const successfulRelays: string[] = [];

  try {
    // Rate Limiting
    if (!rateLimiter.isAllowed(event.pubkey)) {
      throw new Error('Rate Limit überschritten. Bitte warte einen Moment.');
    }

    // Publiziere zu allen Relays
    const promises = relays.map(async (relay) => {
      try {
        await pool.publish([relay], event as Event);
        successfulRelays.push(relay);
      } catch (error) {
        console.error(`Fehler beim Publizieren zu ${relay}:`, error);
      }
    });

    await Promise.all(promises);

    return {
      success: successfulRelays.length > 0,
      relays: successfulRelays
    };
  } catch (error) {
    console.error('Fehler beim Publizieren:', error);
    throw error;
  }
}

/**
 * Hole Events von Relays
 */
export async function fetchEvents(
  relays: string[],
  filter: NostrFilter,
  timeout: number = 5000
): Promise<NostrEvent[]> {
  const pool = initPool();
  const events: NostrEvent[] = [];

  try {
    const sub = pool.subscribeMany(
      relays,
      [filter] as any,
      {
        onevent(event) {
          events.push(event as NostrEvent);
        },
        oneose() {
          // End of stored events
        }
      }
    );

    // Warte auf Timeout
    await new Promise(resolve => setTimeout(resolve, timeout));
    
    // Schließe Subscription
    sub.close();

    return events;
  } catch (error) {
    console.error('Fehler beim Abrufen von Events:', error);
    return events;
  }
}

/**
 * Erstelle und publiziere eine Gruppen-Nachricht
 */
export async function sendGroupMessage(
  content: string,
  channelId: string,
  groupKey: string,
  privateKey: string,
  relays: string[]
): Promise<NostrEvent> {
  try {
    // Verschlüssele Content
    const encrypted = await encryptForGroup(content, groupKey);

    // Erstelle Event mit vollständigen Tags für Gruppen-Kommunikation
    const publicKey = getPublicKey(privateKey as any);
    const tags = [
      ['e', channelId, '', 'root'],     // Channel-ID als root event
      ['p', publicKey],                  // Empfänger (für Gruppen: eigener pubkey)
      ['t', 'bitcoin-group']             // Hashtag für Relay-Filter (WICHTIG!)
    ];
    const event = await createEvent(1, encrypted, tags, privateKey);

    // Publiziere
    await publishEvent(event, relays);

    return event;
  } catch (error) {
    console.error('Fehler beim Senden der Gruppen-Nachricht:', error);
    throw error;
  }
}

/**
 * Hole Gruppen-Nachrichten
 */
export async function fetchGroupMessages(
  channelId: string,
  groupKey: string,
  relays: string[],
  since?: number,
  limit: number = 100
): Promise<Array<NostrEvent & { decrypted?: string }>> {
  try {
    const filter: NostrFilter = {
      kinds: [1],
      '#e': [channelId],
      limit
    };

    if (since) {
      filter.since = since;
    }

    const events = await fetchEvents(relays, filter);

    // Entschlüssele Events
    const decryptedEvents = await Promise.all(
      events.map(async (event) => {
        try {
          const decrypted = await decryptForGroup(event.content, groupKey);
          return { ...event, decrypted };
        } catch (error) {
          console.error('Entschlüsselung fehlgeschlagen für Event:', event.id);
          return event;
        }
      })
    );

    return decryptedEvents;
  } catch (error) {
    console.error('Fehler beim Abrufen von Gruppen-Nachrichten:', error);
    return [];
  }
}

/**
 * Erstelle ein Marketplace-Angebot
 */
export async function createMarketplaceOffer(
  content: string,
  channelId: string,
  groupKey: string,
  tempPrivateKey: string,
  relays: string[]
): Promise<NostrEvent> {
  try {
    // Verschlüssele Content
    const encrypted = await encryptForGroup(content, groupKey);

    // Erstelle Event (Kind 30000 für Marketplace)
    const publicKey = getPublicKey(tempPrivateKey as any);
    const tags = [
      ['e', channelId, '', 'root'],      // Channel-ID als root event
      ['p', publicKey],                   // Empfänger
      ['t', 'bitcoin-group'],             // Hashtag für Relay-Filter
      ['d', `offer-${Date.now()}`]        // Replaceable event identifier
    ];
    
    const event = await createEvent(30000, encrypted, tags, tempPrivateKey);

    // Publiziere
    await publishEvent(event, relays);

    return event;
  } catch (error) {
    console.error('Fehler beim Erstellen des Angebots:', error);
    throw error;
  }
}

/**
 * Hole Marketplace-Angebote
 */
export async function fetchMarketplaceOffers(
  channelId: string,
  groupKey: string,
  relays: string[]
): Promise<Array<NostrEvent & { decrypted?: string }>> {
  try {
    const filter: NostrFilter = {
      kinds: [30000],
      '#e': [channelId],
      limit: 50
    };

    const events = await fetchEvents(relays, filter);

    // Entschlüssele Events
    const decryptedEvents = await Promise.all(
      events.map(async (event) => {
        try {
          const decrypted = await decryptForGroup(event.content, groupKey);
          return { ...event, decrypted };
        } catch (error) {
          return event;
        }
      })
    );

    return decryptedEvents;
  } catch (error) {
    console.error('Fehler beim Abrufen von Angeboten:', error);
    return [];
  }
}

/**
 * Sende Interesse an einem Angebot
 */
export async function sendOfferInterest(
  offerId: string,
  message: string,
  channelId: string,
  groupKey: string,
  privateKey: string,
  relays: string[]
): Promise<NostrEvent> {
  try {
    const encrypted = await encryptForGroup(message, groupKey);

    const tags = [
      ['e', offerId, '', 'reply'],                   // Referenz zum Angebot
      ['e', channelId, '', 'root'],                  // Channel-Tag als root
      ['p', getPublicKey(privateKey as any)],        // Eigener Pubkey für Identifikation
      ['t', 'bitcoin-group']                         // Hashtag für Relay-Filter
    ];

    const event = await createEvent(1, encrypted, tags, privateKey);
    await publishEvent(event, relays);

    return event;
  } catch (error) {
    console.error('Fehler beim Senden des Interesses:', error);
    throw error;
  }
}

/**
 * Lösche ein Event (NIP-09)
 */
export async function deleteEvent(
  eventId: string,
  privateKey: string,
  relays: string[],
  reason?: string
): Promise<NostrEvent> {
  try {
    const tags = [['e', eventId]];
    const content = reason || '';

    const event = await createEvent(5, content, tags, privateKey);
    await publishEvent(event, relays);

    return event;
  } catch (error) {
    console.error('Fehler beim Löschen des Events:', error);
    throw error;
  }
}

/**
 * Cleanup: Schließe alle Verbindungen
 */
export function cleanup(): void {
  if (pool) {
    pool.close([]); // Schließe alle Relays
    pool = null;
  }
}