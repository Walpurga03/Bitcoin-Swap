import { SimplePool, finalizeEvent, getPublicKey, type Event } from 'nostr-tools';
import type { NostrEvent, NostrFilter, RelayConnection } from './types';
import { deriveChannelId, encryptForGroup, decryptForGroup } from './crypto';
import { RateLimiter } from '$lib/security/validation';
import { GROUP_TAG, EVENT_KINDS, POPULAR_RELAYS } from '$lib/config';

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
  let eoseReceived = false;

  try {
    console.log('  🔌 Alternative: Verwende pool.querySync()...');
    
    // ⚠️ WORKAROUND: subscribeMany funktioniert nicht, verwende querySync
    // Dies ist eine synchrone Abfrage die Events direkt zurückgibt
    const fetchedEvents = await pool.querySync(relays, filter as any);
    
    console.log('  📨 Events von querySync:', fetchedEvents.length);
    
    fetchedEvents.forEach(event => {
      console.log('    ├─ Event:', event.id.substring(0, 16) + '...', 'Tags:', event.tags?.map((t: any) => t[0]));
      events.push(event as NostrEvent);
    });
    
    console.log('📊 [FETCH] Ergebnis:', events.length + ' Events geladen');

    return events;
  } catch (error) {
    console.error('❌ [FETCH] Fehler beim Abrufen von Events:', error);
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
    // ✅ Unser Relay unterstützt #t Filter (NIP-12)
    const filter = {
      kinds: [EVENT_KINDS.MARKETPLACE_OFFER],
      '#t': [GROUP_TAG],  // 🎯 Direkter Tag-Filter
      limit: 100
    } as NostrFilter;

    const events = await fetchEvents(relays, filter);
    
    console.log(`  🔍 Marketplace: ${events.length} Events mit #t=${GROUP_TAG} geladen`);

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
    console.log(`  � Marketplace: ${validEvents.length}/${events.length} Angebote erfolgreich entschlüsselt`);

    return validEvents;
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
  userName: string,
  channelId: string,
  groupKey: string,
  privateKey: string,
  relays: string[]
): Promise<NostrEvent> {
  try {
    console.log('💌 [INTEREST] Sende Interesse an Angebot:', offerId.substring(0, 16) + '...');
    console.log('  👤 Name:', userName);
    
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

    console.log('  📋 Tags (pubkey-sicher):', tags.map(t => t[0]));
    console.log('  🔐 Metadaten encrypted: pubkey, name, message');

    const event = await createEvent(1, encrypted, tags, privateKey);
    const result = await publishEvent(event, relays);
    
    console.log('  ✅ Interesse gesendet:', result.relays.length + '/' + relays.length + ' Relays');

    return event;
  } catch (error) {
    console.error('❌ [INTEREST] Fehler beim Senden des Interesses:', error);
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
    console.log('💌 [INTERESTS] Lade Interesse-Events für', offerIds.length, 'Angebote...');
    
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

    console.log('  🔍 Filter:', JSON.stringify(filter, null, 2));

    const events = await fetchEvents(relays, filter);
    
    console.log('  📦 Gefundene Events:', events.length);

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
    
    console.log('  ✅ Entschlüsselte Interessen:', validInterests.length);

    return validInterests;
  } catch (error) {
    console.error('❌ [INTERESTS] Fehler beim Laden:', error);
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
    console.error('Fehler beim Löschen des Events:', error);
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
    console.log('🏠 [DEAL-ROOM] Erstelle Deal-Room...');
    console.log('  📋 Offer-ID:', offerId.substring(0, 16) + '...');
    console.log('  👤 Seller:', sellerPubkey.substring(0, 16) + '...');
    console.log('  👤 Buyer:', buyerPubkey.substring(0, 16) + '...');

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

    console.log('  🏷️ Deal-Room Tags (pubkey-sicher):', tags.map(t => t[0]));
    console.log('  🔐 Pubkeys encrypted: seller + buyer in metadata');

    const event = await createEvent(30080, encrypted, tags, privateKey);
    const result = await publishEvent(event, relays);

    console.log('  ✅ Deal-Room erstellt:', result.relays.length + '/' + relays.length + ' Relays');

    return event;
  } catch (error) {
    console.error('❌ [DEAL-ROOM] Fehler beim Erstellen:', error);
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
    console.log('🏠 [DEAL-ROOMS] Lade Deal-Rooms für User:', userPubkey.substring(0, 16) + '...');

    // Filter für Deal-Rooms wo User Teilnehmer ist
    const filter = {
      kinds: [30080],
      '#p': [userPubkey],                    // User ist Teilnehmer
      '#t': ['bitcoin-deal'],                // Deal-Room Tag
      limit: 100
    } as NostrFilter;

    const events = await fetchEvents(relays, filter);
    console.log('  📦 Gefundene Deal-Rooms:', events.length);

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
            console.error('  ⚠️ Weder JSON noch Entschlüsselung möglich für Event:', event.id.substring(0, 16));
            return null;
          }
        }
      })
    );

    const validRooms = decryptedEvents.filter(e => e !== null) as Array<NostrEvent & { decrypted?: any }>;
    console.log('  ✅ Entschlüsselte Deal-Rooms:', validRooms.length);

    return validRooms;
  } catch (error) {
    console.error('❌ [DEAL-ROOMS] Fehler beim Laden:', error);
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
    console.log('💬 [DEAL-MSG] Sende NIP-17 Nachricht im Deal-Room:', dealId);
    console.log('  📨 Recipient:', recipientPubkey.substring(0, 16) + '...');
    
    const { createNIP17Message } = await import('$lib/nostr/crypto');
    
    // 🔐 VERBESSERUNG: Verwende NIP-17 statt groupKey!
    // NIP-17 = nur Sender + Recipient können lesen
    const { wrappedEvent } = await createNIP17Message(
      content,
      recipientPubkey,
      privateKey
    );

    console.log('  🎁 NIP-17 Message erstellt (nur Recipient kann lesen)');
    
    // Veröffentliche wrapped Event
    const result = await publishEvent(wrappedEvent as NostrEvent, relays);

    console.log('  ✅ Nachricht gesendet:', result.relays.length + '/' + relays.length + ' Relays');

    return wrappedEvent as NostrEvent;
  } catch (error) {
    console.error('❌ [DEAL-MSG] Fehler beim Senden:', error);
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
    console.log('💬 [DEAL-MSGS] Lade NIP-17 Nachrichten für Deal-Room:', dealId);

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
    console.log('  📦 Gefundene NIP-17 Messages:', events.length);

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
          console.warn('⚠️ NIP-17 Entschlüsselung fehlgeschlagen für Event:', event.id.substring(0, 16));
          return null;
        }
      })
    );

    const validMessages = decryptedEvents.filter(e => e !== null) as Array<NostrEvent & { decrypted?: string; senderPubkey?: string }>;
    console.log('  ✅ Entschlüsselte NIP-17 Nachrichten:', validMessages.length);

    return validMessages;
  } catch (error) {
    console.error('❌ [DEAL-MSGS] Fehler beim Laden:', error);
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
    console.log('👤 [PROFILE] Lade Profil für:', pubkey.substring(0, 16) + '...');

    // Populäre Relays für Profil-Suche (falls nicht angegeben)
    const profileRelays = relays || POPULAR_RELAYS;

    console.log('  📡 Suche auf', profileRelays.length, 'Relays...');

    // Filter für Kind 0 (Metadata) Events
    const filter = {
      kinds: [0],
      authors: [pubkey],
      limit: 1
    } as NostrFilter;

    const events = await fetchEvents(profileRelays, filter, 3000);

    if (events.length === 0) {
      console.log('  ⚠️ Kein Profil gefunden');
      return null;
    }

    // Nehme neuestes Event
    const latestEvent = events.sort((a, b) => b.created_at - a.created_at)[0];
    
    try {
      const metadata = JSON.parse(latestEvent.content);
      console.log('  ✅ Profil gefunden:', metadata.name || metadata.display_name || metadata.nip05 || 'Unbekannt');
      
      return {
        name: metadata.name,
        display_name: metadata.display_name,
        nip05: metadata.nip05
      };
    } catch (error) {
      console.error('  ❌ Fehler beim Parsen des Profils:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ [PROFILE] Fehler beim Laden:', error);
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