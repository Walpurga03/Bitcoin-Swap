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
      console.log('  ⏰ Since:', new Date(since * 1000).toLocaleString(), `(${since})`);
      console.log('  ⚠️ Nur Events NACH diesem Zeitpunkt werden geladen!');
    } else {
      console.log('  📦 Lade ALLE Events (kein since-Filter)');
    }
    console.log('  📊 Limit:', limit);
    
    // ✅ Unser eigenes Relay unterstützt #t Filter (NIP-12)!
    // Test mit websocat bestätigt: ["REQ","test",{"kinds":[1],"#t":["bitcoin-group"]}]
    const filter = {
      kinds: [1],
      '#t': ['bitcoin-group'],  // 🎯 Direkter Tag-Filter
      limit: limit
    } as NostrFilter;

    if (since) {
      filter.since = since;
    }

    console.log('  🎯 Verwende #t Filter direkt (Relay unterstützt NIP-12)');
    const events = await fetchEvents(relays, filter);
    
    console.log(`  📦 ${events.length} Events mit #t=bitcoin-group geladen`);

    // Filtere Interesse-Events aus (die haben 'reply' als 4. Element im e-Tag)
    const chatEvents = events.filter((event: any) => {
      // Prüfe ob es ein Interesse-Event ist (hat e-Tag mit 'reply')
      const hasReplyTag = event.tags.some((tag: string[]) => 
        tag[0] === 'e' && tag[3] === 'reply'
      );
      
      // Nur Events OHNE reply-Tag sind Chat-Nachrichten
      return !hasReplyTag;
    });

    console.log(`  💬 ${chatEvents.length} Chat-Nachrichten (ohne Interesse-Events)`);

    // Entschlüssele Events
    const decryptedEvents = await Promise.all(
      chatEvents.map(async (event) => {
        try {
          const decrypted = await decryptForGroup(event.content, groupKey);
          return { ...event, decrypted };
        } catch (error) {
          // ⚠️ Entschlüsselung fehlgeschlagen - Event wurde mit anderem Secret erstellt
          // Dies ist normal und wird stillschweigend ignoriert
          return null; // Markiere ungültiges Event
        }
      })
    );

    // Filtere null-Werte (ungültige/alte Events)
    const validEvents = decryptedEvents.filter(e => e !== null) as Array<NostrEvent & { decrypted?: string }>;
    
    console.log(`  ✅ ${validEvents.length}/${chatEvents.length} Nachrichten erfolgreich entschlüsselt`);

    return validEvents;
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
    // ✅ Unser Relay unterstützt #t Filter (NIP-12)
    const filter = {
      kinds: [30000],
      '#t': ['bitcoin-group'],  // 🎯 Direkter Tag-Filter
      limit: 100
    } as NostrFilter;

    const events = await fetchEvents(relays, filter);
    
    console.log(`  🔍 Marketplace: ${events.length} Events mit #t=bitcoin-group geladen`);

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
    
    // Füge Name zur Nachricht hinzu
    const messageWithName = `${userName}: ${message}`;
    const encrypted = await encryptForGroup(messageWithName, groupKey);

    const publicKey = getPublicKey(privateKey as any);
    const tags = [
      ['e', offerId, '', 'reply'],                   // Referenz zum Angebot
      ['e', channelId, '', 'root'],                  // Channel-Tag als root
      ['p', publicKey],                              // Eigener Pubkey für Identifikation
      ['name', userName],                            // Name als eigener Tag
      ['t', 'bitcoin-group']                         // Hashtag für Relay-Filter
    ];

    console.log('  📋 Tags:', tags.map(t => t[0] + '=' + t[1].substring(0, 16) + '...'));

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
      kinds: [1],
      '#t': ['bitcoin-group'],
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

    // Metadata für Deal-Room
    const metadata = {
      offerId,
      offerContent,
      sellerPubkey,
      buyerPubkey,
      created_at: Math.floor(Date.now() / 1000)
    };

    // Verschlüssele Metadata
    const encrypted = await encryptForGroup(JSON.stringify(metadata), groupKey);

    // Erstelle Deal-Room Event (Kind 30080)
    const dealId = `deal-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const tags = [
      ['d', dealId],                          // Unique Deal-Room ID
      ['e', offerId, '', 'root'],             // Referenz zum Original-Angebot
      ['e', channelId, '', 'channel'],        // Channel-ID
      ['p', sellerPubkey],                    // Seller
      ['p', buyerPubkey],                     // Buyer
      ['t', 'bitcoin-deal']                   // Tag für Deal-Rooms
    ];

    console.log('  🏷️ Deal-Room Tags:', tags.map(t => `${t[0]}=${t[1].substring(0, 16)}...`));

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

    // Entschlüssele Metadata
    const decryptedEvents = await Promise.all(
      events.map(async (event) => {
        try {
          const decryptedStr = await decryptForGroup(event.content, groupKey);
          const decrypted = JSON.parse(decryptedStr);
          return { ...event, decrypted };
        } catch (error) {
          console.error('  ⚠️ Entschlüsselung fehlgeschlagen für Event:', event.id.substring(0, 16));
          return null;
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
export async function sendDealMessage(
  dealId: string,
  content: string,
  groupKey: string,
  privateKey: string,
  relays: string[]
): Promise<NostrEvent> {
  try {
    console.log('💬 [DEAL-MSG] Sende Nachricht in Deal-Room:', dealId);

    // Verschlüssele Content
    const encrypted = await encryptForGroup(content, groupKey);

    const publicKey = getPublicKey(privateKey as any);
    const tags = [
      ['e', dealId, '', 'root'],             // Referenz zum Deal-Room
      ['p', publicKey],                      // Sender
      ['t', 'bitcoin-deal']                  // Deal-Tag
    ];

    const event = await createEvent(1, encrypted, tags, privateKey);
    const result = await publishEvent(event, relays);

    console.log('  ✅ Nachricht gesendet:', result.relays.length + '/' + relays.length + ' Relays');

    return event;
  } catch (error) {
    console.error('❌ [DEAL-MSG] Fehler beim Senden:', error);
    throw error;
  }
}

/**
 * Hole Nachrichten für einen Deal-Room
 */
export async function fetchDealMessages(
  dealId: string,
  groupKey: string,
  relays: string[],
  since?: number,
  limit: number = 100
): Promise<Array<NostrEvent & { decrypted?: string }>> {
  try {
    console.log('💬 [DEAL-MSGS] Lade Nachrichten für Deal-Room:', dealId);

    const filter = {
      kinds: [1],
      '#e': [dealId],                        // Nachrichten für diesen Deal-Room
      '#t': ['bitcoin-deal'],                // Deal-Tag
      limit
    } as NostrFilter;

    if (since) {
      filter.since = since;
    }

    const events = await fetchEvents(relays, filter);
    console.log('  📦 Gefundene Nachrichten:', events.length);

    // Entschlüssele Nachrichten
    const decryptedEvents = await Promise.all(
      events.map(async (event) => {
        try {
          const decrypted = await decryptForGroup(event.content, groupKey);
          return { ...event, decrypted };
        } catch (error) {
          return null;
        }
      })
    );

    const validMessages = decryptedEvents.filter(e => e !== null) as Array<NostrEvent & { decrypted?: string }>;
    console.log('  ✅ Entschlüsselte Nachrichten:', validMessages.length);

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
    const profileRelays = relays || [
      'wss://relay.damus.io',
      'wss://relay.nostr.band',
      'wss://nos.lol',
      'wss://relay.snort.social',
      'wss://nostr.wine',
      'wss://relay.current.fyi',
      'wss://nostr-pub.wellorder.net',
      'wss://relay.nostr.info'
    ];

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