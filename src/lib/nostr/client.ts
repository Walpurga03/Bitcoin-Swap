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
  console.log('🔗 [RELAY] Verbinde zu:', relayUrl);
  const pool = initPool();
  
  try {
    // Pool verwaltet Verbindungen automatisch
    console.log('  ✅ Relay-Verbindung hergestellt:', relayUrl);
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
  console.log('📡 [PUBLISH] Starte Event-Publishing...');
  console.log('  🆔 Event-ID:', event.id);
  console.log('  📡 Ziel-Relays:', relays);
  
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
        console.log('  ⏳ Sende zu:', relay);
        await pool.publish([relay], event as Event);
        successfulRelays.push(relay);
        console.log('  ✅ Erfolgreich:', relay);
      } catch (error) {
        console.error(`  ❌ Fehler bei ${relay}:`, error);
      }
    });

    await Promise.all(promises);

    console.log('📊 [PUBLISH] Ergebnis:');
    console.log('  ✅ Erfolgreich:', successfulRelays.length + '/' + relays.length);
    console.log('  📡 Erfolgreiche Relays:', successfulRelays);

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
  console.log('🔍 [FETCH] Starte Event-Abfrage...');
  console.log('  📡 Relays:', relays);
  console.log('  🔎 Filter:', JSON.stringify(filter, null, 2));
  console.log('  ⏱️ Timeout:', timeout + 'ms');
  
  const pool = initPool();
  const events: NostrEvent[] = [];

  try {
    const sub = pool.subscribeMany(
      relays,
      [filter] as any,
      {
        onevent(event) {
          console.log('  📨 Event empfangen:', event.id.substring(0, 16) + '...');
          events.push(event as NostrEvent);
        },
        oneose() {
          console.log('  ✅ EOSE (End of Stored Events) empfangen');
        }
      }
    );

    // Warte auf Timeout
    await new Promise(resolve => setTimeout(resolve, timeout));
    
    console.log('📊 [FETCH] Ergebnis:', events.length + ' Events geladen');
    
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
    console.log('📤 [SEND] Sende Gruppennachricht...');
    console.log('  📋 Channel-ID:', channelId);
    console.log('  📡 Relays:', relays);
    console.log('  📝 Content (Vorschau):', content.substring(0, 30) + '...');
    
    // Verschlüssele Content
    const encrypted = await encryptForGroup(content, groupKey);
    console.log('  🔐 Content verschlüsselt ✅');

    // Erstelle Event mit vollständigen Tags für Gruppen-Kommunikation
    const publicKey = getPublicKey(privateKey as any);
    const tags = [
      ['e', channelId, '', 'root'],     // Channel-ID als root event
      ['p', publicKey],                  // Empfänger (für Gruppen: eigener pubkey)
      ['t', 'bitcoin-group']             // Hashtag für Relay-Filter (WICHTIG!)
    ];
    
    console.log('  🏷️ Event-Tags erstellt:');
    console.log('    ├─ e-Tag (root):', channelId.substring(0, 16) + '...');
    console.log('    ├─ p-Tag:', publicKey.substring(0, 16) + '...');
    console.log('    └─ t-Tag: bitcoin-group ✅');
    
    const event = await createEvent(1, encrypted, tags, privateKey);
    console.log('  ✅ Event erstellt:', event.id);

    // Publiziere
    console.log('  📡 Publiziere zu Relays...');
    const result = await publishEvent(event, relays);
    console.log('  ✅ Event published:', result.relays.length + '/' + relays.length + ' Relays');

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
    console.log('📥 [FETCH] Lade Gruppen-Nachrichten...');
    console.log('  📋 Channel-ID:', channelId);
    console.log('  📡 Relays:', relays);
    console.log('  🏷️ Filter: #t=bitcoin-group');
    if (since) {
      console.log('  ⏰ Since:', new Date(since * 1000).toLocaleString());
    }
    console.log('  📊 Limit:', limit);
    
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