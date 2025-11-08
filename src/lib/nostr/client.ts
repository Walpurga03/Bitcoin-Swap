import { SimplePool, finalizeEvent, getPublicKey, type Event } from 'nostr-tools';
import type { NostrEvent, NostrFilter, RelayConnection } from './types';
import { deriveChannelId, encryptForGroup, decryptForGroup } from './crypto';
import { RateLimiter } from '$lib/security/validation';
import { GROUP_TAG, EVENT_KINDS, POPULAR_RELAYS } from '$lib/config';
import { logger, nostrLogger, marketplaceLogger } from '$lib/utils/logger';

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
  nostrLogger.relay('Verbinde zu: ' + relayUrl);
  const pool = initPool();
  
  try {
    // Pool verwaltet Verbindungen automatisch
    nostrLogger.relay('✅ Relay-Verbindung hergestellt: ' + relayUrl);
    return {
      url: relayUrl,
      connected: true,
      relay: pool
    };
  } catch (error) {
    logger.error('Fehler beim Verbinden zu ' + relayUrl, error);
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
    logger.error('Fehler beim Erstellen des Events', error);
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
  nostrLogger.event('Starte Event-Publishing...');
  nostrLogger.event('Event-ID: ' + event.id);
  nostrLogger.event('Ziel-Relays: ' + relays.join(', '));
  
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
        nostrLogger.relay('⏳ Sende zu: ' + relay);
        await pool.publish([relay], event as Event);
        successfulRelays.push(relay);
        nostrLogger.relay('✅ Erfolgreich: ' + relay);
      } catch (error) {
        logger.error('Fehler bei ' + relay, error);
      }
    });

    await Promise.all(promises);

    nostrLogger.event('Ergebnis: ' + successfulRelays.length + '/' + relays.length + ' erfolgreich');
    nostrLogger.relay('Erfolgreiche Relays: ' + successfulRelays.join(', '));

    return {
      success: successfulRelays.length > 0,
      relays: successfulRelays
    };
  } catch (error) {
    logger.error('Fehler beim Publizieren', error);
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
  nostrLogger.event('Starte Event-Abfrage...');
  nostrLogger.relay('Relays: ' + relays.join(', '));
  logger.debug('Filter: ' + JSON.stringify(filter, null, 2));
  logger.debug('Timeout: ' + timeout + 'ms');
  
  const pool = initPool();
  const events: NostrEvent[] = [];
  let eoseReceived = false;

  try {
    logger.debug('Alternative: Verwende pool.querySync()...');
    
    // ⚠️ WORKAROUND: subscribeMany funktioniert nicht, verwende querySync
    // Dies ist eine synchrone Abfrage die Events direkt zurückgibt
    const fetchedEvents = await pool.querySync(relays, filter as any);
    
    logger.debug('Events von querySync: ' + fetchedEvents.length);
    
    fetchedEvents.forEach(event => {
      logger.debug('Event: ' + event.id.substring(0, 16) + '... Tags: ' + event.tags?.map((t: any) => t[0]).join(', '));
      events.push(event as NostrEvent);
    });
    
    nostrLogger.event('Ergebnis: ' + events.length + ' Events geladen');

    return events;
  } catch (error) {
    logger.error('Fehler beim Abrufen von Events', error);
    return events;
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
      ['t', GROUP_TAG],                   // Hashtag für Relay-Filter
      ['d', `offer-${Date.now()}`]        // Replaceable event identifier
    ];
    
    const event = await createEvent(30000, encrypted, tags, tempPrivateKey);

    // Publiziere
    await publishEvent(event, relays);

    return event;
  } catch (error) {
    logger.error('Fehler beim Erstellen des Angebots', error);
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
    // ✅ Unser Relay unterstützt #t Filter (NIP-12)
    const filter = {
      kinds: [EVENT_KINDS.MARKETPLACE_OFFER],
      '#t': [GROUP_TAG],  // 🎯 Direkter Tag-Filter
      limit: 100
    } as NostrFilter;

    const events = await fetchEvents(relays, filter);
    
    logger.debug('Marketplace: ' + events.length + ' Events mit #t=' + GROUP_TAG + ' geladen');

    // Entschlüssele Events
    const decryptedEvents = await Promise.all(
      events.map(async (event) => {
        try {
          const decrypted = await decryptForGroup(event.content, groupKey);
          return { ...event, decrypted };
        } catch (error) {
          // ⚠️ Entschlüsselung fehlgeschlagen - ignoriere ungültige Events
          return null;
        }
      })
    );

    // Filtere ungültige Events
    const validEvents = decryptedEvents.filter(e => e !== null) as Array<NostrEvent & { decrypted?: string }>;
    logger.debug('Marketplace: ' + validEvents.length + '/' + events.length + ' Angebote erfolgreich entschlüsselt');

    return validEvents;
  } catch (error) {
    logger.error('Fehler beim Abrufen von Angeboten', error);
    return [];
  }
}

/**
 * Sende Interesse an einem Angebot
 */
export async function sendOfferInterest(
  offerId: string,
  message: string,
  userName: string,
  channelId: string,
  groupKey: string,
  privateKey: string,
  relays: string[]
): Promise<NostrEvent> {
  try {
    marketplaceLogger.interest('Sende Interesse an Angebot: ' + offerId.substring(0, 16) + '...');
    logger.debug('Name: ' + userName);
    
    const { encryptMetadata } = await import('$lib/nostr/crypto');
    
    // 🔐 VERBESSERUNG: Pubkey + Name in verschlüsselte Metadaten
    const publicKey = getPublicKey(privateKey as any);
    const metadata = {
      pubkey: publicKey,
      name: userName,
      message: message
    };
    
    // Verschlüssele komplette Nachricht inklusive Pubkey
    const encrypted = await encryptForGroup(JSON.stringify(metadata), groupKey);

    // 🔐 VERBESSERUNG: Tags enthalten KEINE Pubkeys mehr!
    const tags = [
      ['e', offerId, '', 'reply'],                   // Referenz zum Angebot
      ['e', channelId, '', 'root'],                  // Channel-Tag als root
      ['t', GROUP_TAG]                               // Hashtag für Relay-Filter
      // ❌ ENTFERNT: ['p', publicKey] - jetzt verschlüsselt
      // ❌ ENTFERNT: ['name', userName] - jetzt verschlüsselt
    ];

    logger.debug('Tags (pubkey-sicher): ' + tags.map(t => t[0]).join(', '));
    logger.debug('Metadaten encrypted: pubkey, name, message');

    const event = await createEvent(1, encrypted, tags, privateKey);
    const result = await publishEvent(event, relays);
    
    marketplaceLogger.interest('✅ Interesse gesendet: ' + result.relays.length + '/' + relays.length + ' Relays');

    return event;
  } catch (error) {
    logger.error('Fehler beim Senden des Interesses', error);
    throw error;
  }
}

/**
 * Hole Interesse-Antworten für Marketplace-Angebote
 */
export async function fetchOfferInterests(
  offerIds: string[],
  groupKey: string,
  relays: string[]
): Promise<Array<NostrEvent & { decrypted?: string; offerId?: string }>> {
  try {
    marketplaceLogger.interest('Lade Interesse-Events für ' + offerIds.length + ' Angebote...');
    
    if (offerIds.length === 0) {
      return [];
    }

    // Filter für alle Interesse-Events (kind:1 mit 'e' Tag reply zu den Angeboten)
    const filter = {
      kinds: [EVENT_KINDS.MARKETPLACE_INTEREST],
      '#t': [GROUP_TAG],
      '#e': offerIds,  // Alle Events die auf unsere Angebote referenzieren
      limit: 500
    } as NostrFilter;

    logger.debug('Filter: ' + JSON.stringify(filter, null, 2));

    const events = await fetchEvents(relays, filter);
    
    logger.debug('Gefundene Events: ' + events.length);

    // Entschlüssele und mappe zu Angebots-IDs
    const decryptedEvents = await Promise.all(
      events.map(async (event) => {
        try {
          // Finde welches Angebot referenziert wird
          const replyTag = event.tags.find((t: string[]) => t[0] === 'e' && t[3] === 'reply');
          const offerId = replyTag ? replyTag[1] : null;

          if (!offerId) {
            return null; // Kein gültiges reply
          }

          const decrypted = await decryptForGroup(event.content, groupKey);
          return { ...event, decrypted, offerId };
        } catch (error) {
          return null;
        }
      })
    );

    const validInterests = decryptedEvents.filter(e => e !== null) as Array<NostrEvent & { decrypted?: string; offerId?: string }>;
    
    marketplaceLogger.interest('✅ Entschlüsselte Interessen: ' + validInterests.length);

    return validInterests;
  } catch (error) {
    logger.error('Fehler beim Laden von Interessen', error);
    return [];
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
    logger.error('Fehler beim Löschen des Events', error);
    throw error;
  }
}

/**
 * Erstelle einen Deal-Room (Kind 30080)
 * Ein Deal-Room ist ein verschlüsselter 2-Personen-Chat zwischen Anbieter und Interessent
 */
export async function createDealRoom(
  offerId: string,
  offerContent: string,
  sellerPubkey: string,
  buyerPubkey: string,
  channelId: string,
  groupKey: string,
  privateKey: string,
  relays: string[]
): Promise<NostrEvent> {
  try {
    marketplaceLogger.deal('Erstelle Deal-Room...');
    logger.debug('Offer-ID: ' + offerId.substring(0, 16) + '...');
    logger.debug('Seller: ' + sellerPubkey.substring(0, 16) + '...');
    logger.debug('Buyer: ' + buyerPubkey.substring(0, 16) + '...');

    // 🔐 VERBESSERUNG: Pubkeys gehören in verschlüsselte Metadaten!
    const metadata = {
      offerId,
      offerContent,
      sellerPubkey,
      buyerPubkey,
      created_at: Math.floor(Date.now() / 1000)
    };

    // Verschlüssele komplette Metadata inklusive Pubkeys
    const encrypted = await encryptForGroup(JSON.stringify(metadata), groupKey);

    // Erstelle Deal-Room Event (Kind 30080)
    const dealId = `deal-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // 🔐 VERBESSERUNG: Tags enthalten KEINE Pubkeys mehr!
    const tags = [
      ['d', dealId],                          // Unique Deal-Room ID
      ['e', offerId, '', 'root'],             // Referenz zum Original-Angebot
      ['e', channelId, '', 'channel'],        // Channel-ID
      ['t', 'bitcoin-deal']                   // Tag für Deal-Rooms
      // ❌ ENTFERNT: ['p', sellerPubkey] - jetzt verschlüsselt
      // ❌ ENTFERNT: ['p', buyerPubkey] - jetzt verschlüsselt
    ];

    logger.debug('Deal-Room Tags (pubkey-sicher): ' + tags.map(t => t[0]).join(', '));
    logger.debug('Pubkeys encrypted: seller + buyer in metadata');

    const event = await createEvent(30080, encrypted, tags, privateKey);
    const result = await publishEvent(event, relays);

    marketplaceLogger.deal('✅ Deal-Room erstellt: ' + result.relays.length + '/' + relays.length + ' Relays');

    return event;
  } catch (error) {
    logger.error('Fehler beim Erstellen des Deal-Rooms', error);
    throw error;
  }
}

/**
 * Hole alle Deal-Rooms für einen User
 */
export async function fetchDealRooms(
  userPubkey: string,
  groupKey: string,
  relays: string[]
): Promise<Array<NostrEvent & { decrypted?: any }>> {
  try {
    marketplaceLogger.deal('Lade Deal-Rooms für User: ' + userPubkey.substring(0, 16) + '...');

    // Filter für Deal-Rooms wo User Teilnehmer ist
    const filter = {
      kinds: [30080],
      '#p': [userPubkey],                    // User ist Teilnehmer
      '#t': ['bitcoin-deal'],                // Deal-Room Tag
      limit: 100
    } as NostrFilter;

    const events = await fetchEvents(relays, filter);
    logger.debug('Gefundene Deal-Rooms: ' + events.length);

    // Parse Metadata (neue Events sind plain JSON, alte Events sind verschlüsselt)
    const decryptedEvents = await Promise.all(
      events.map(async (event) => {
        try {
          // Versuch 1: Plain JSON (neue Events)
          const decrypted = JSON.parse(event.content);
          return { ...event, decrypted };
        } catch (jsonError) {
          // Versuch 2: Verschlüsselt (alte Events)
          try {
            const decrypted = await decryptForGroup(event.content, groupKey);
            const parsed = JSON.parse(decrypted);
            return { ...event, decrypted: parsed };
          } catch (decryptError) {
            logger.warn('Weder JSON noch Entschlüsselung möglich für Event: ' + event.id.substring(0, 16));
            return null;
          }
        }
      })
    );

    const validRooms = decryptedEvents.filter(e => e !== null) as Array<NostrEvent & { decrypted?: any }>;
    marketplaceLogger.deal('✅ Entschlüsselte Deal-Rooms: ' + validRooms.length);

    return validRooms;
  } catch (error) {
    logger.error('Fehler beim Laden von Deal-Rooms', error);
    return [];
  }
}

/**
 * Sende Nachricht in Deal-Room
 */
/**
 * Sende Nachricht in Deal-Room mit NIP-17 (Ende-zu-Ende verschlüsselt)
 */
export async function sendDealMessage(
  dealId: string,
  content: string,
  recipientPubkey: string,
  privateKey: string,
  relays: string[]
): Promise<NostrEvent> {
  try {
    logger.info('Sende NIP-17 Nachricht im Deal-Room: ' + dealId);
    logger.debug('Recipient: ' + recipientPubkey.substring(0, 16) + '...');
    
    const { createNIP17Message } = await import('$lib/nostr/crypto');
    
    // 🔐 VERBESSERUNG: Verwende NIP-17 statt groupKey!
    // NIP-17 = nur Sender + Recipient können lesen
    const { wrappedEvent } = await createNIP17Message(
      content,
      recipientPubkey,
      privateKey
    );

    logger.debug('NIP-17 Message erstellt (nur Recipient kann lesen)');
    
    // Veröffentliche wrapped Event
    const result = await publishEvent(wrappedEvent as NostrEvent, relays);

    logger.success('Nachricht gesendet: ' + result.relays.length + '/' + relays.length + ' Relays');

    return wrappedEvent as NostrEvent;
  } catch (error) {
    logger.error('Fehler beim Senden der Deal-Message', error);
    throw error;
  }
}

/**
 * Hole Nachrichten für einen Deal-Room
 */
/**
 * Hole Nachrichten für einen Deal-Room (NIP-17 Gift-Wrapped)
 */
export async function fetchDealMessages(
  dealId: string,
  recipientPrivateKey: string,
  relays: string[],
  since?: number,
  limit: number = 100
): Promise<Array<NostrEvent & { decrypted?: string; senderPubkey?: string }>> {
  try {
    logger.info('Lade NIP-17 Nachrichten für Deal-Room: ' + dealId);

    const { decryptNIP17Message } = await import('$lib/nostr/crypto');
    
    // 🔐 VERBESSERUNG: Suche nach Kind 1059 (NIP-17 Gift-Wrapped)
    const filter = {
      kinds: [1059],  // 🔐 Kind 1059 = Gift-Wrapped Messages
      '#p': [getPublicKey(recipientPrivateKey as any)],  // Nur für uns bestimmte Messages
      limit
    } as NostrFilter;

    if (since) {
      filter.since = since;
    }

    const events = await fetchEvents(relays, filter);
    logger.debug('Gefundene NIP-17 Messages: ' + events.length);

    // Entschlüssele NIP-17 Messages
    const decryptedEvents = await Promise.all(
      events.map(async (event) => {
        try {
          const decrypted = await decryptNIP17Message(event, recipientPrivateKey);
          return { 
            ...event, 
            decrypted: decrypted.content,
            senderPubkey: decrypted.senderPubkey
          };
        } catch (error) {
          logger.warn('NIP-17 Entschlüsselung fehlgeschlagen für Event: ' + event.id.substring(0, 16));
          return null;
        }
      })
    );

    const validMessages = decryptedEvents.filter(e => e !== null) as Array<NostrEvent & { decrypted?: string; senderPubkey?: string }>;
    logger.info('✅ Entschlüsselte NIP-17 Nachrichten: ' + validMessages.length);

    return validMessages;
  } catch (error) {
    logger.error('Fehler beim Laden von Deal-Messages', error);
    return [];
  }
}

/**
 * Lade Nostr-Profil (Kind 0) von populären Relays
 * Sucht nach name, display_name oder nip05
 */
export async function fetchUserProfile(
  pubkey: string,
  relays?: string[]
): Promise<{ name?: string; display_name?: string; nip05?: string } | null> {
  try {
    nostrLogger.profile('Lade Profil für: ' + pubkey.substring(0, 16) + '...');

    // Populäre Relays für Profil-Suche (falls nicht angegeben)
    const profileRelays = relays || POPULAR_RELAYS;

    logger.debug('Suche auf ' + profileRelays.length + ' Relays...');

    // Filter für Kind 0 (Metadata) Events
    const filter = {
      kinds: [0],
      authors: [pubkey],
      limit: 1
    } as NostrFilter;

    const events = await fetchEvents(profileRelays, filter, 3000);

    if (events.length === 0) {
      logger.warn('Kein Profil gefunden');
      return null;
    }

    // Nehme neuestes Event
    const latestEvent = events.sort((a, b) => b.created_at - a.created_at)[0];
    
    try {
      const metadata = JSON.parse(latestEvent.content);
      nostrLogger.profile('✅ Profil gefunden: ' + (metadata.name || metadata.display_name || metadata.nip05 || 'Unbekannt'));
      
      return {
        name: metadata.name,
        display_name: metadata.display_name,
        nip05: metadata.nip05
      };
    } catch (error) {
      logger.error('Fehler beim Parsen des Profils', error);
      return null;
    }
  } catch (error) {
    logger.error('Fehler beim Laden des Profils', error);
    return null;
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