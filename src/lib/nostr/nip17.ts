/**
 * ============================================
 * NIP-17: Gift-Wrapped Interest Messages
 * ============================================
 * 
 * Verwendung von NDK für automatisches Gift-Wrapping:
 * - sendInterest() - Sende verschlüsseltes Interesse
 * - loadInterests() - Lade & entschlüssele Interessen (nur Ersteller)
 * - withdrawInterest() -    console.log(`  ✅ ${events.size} Interest-Events gefunden (Gesamt-Kind 30078)`);
    
    // 3. Filtere nur Events mit 'app' Tag = 'bitcoin-swap-interests'
    const tempPubkeys: string[] = [];
    
    for (const event of events) {
      try {
        // Prüfe ob 'app' Tag vorhanden ist
        const appTag = event.tags.find(tag => tag[0] === 'app');
        if (!appTag || appTag[1] !== 'bitcoin-swap-interests') {
          console.log(`  ⏭️ Überspringe Event ohne app-Tag:`, event.id.substring(0, 16));
          continue;
        }
        
        const data = JSON.parse(event.content);
        if (data.temp_pubkey) {
          tempPubkeys.push(data.temp_pubkey);
          console.log(`  ✅ Interest an: ${data.temp_pubkey.substring(0, 16)}...`);
        }
      } catch (err) {
        console.warn('  ⚠️ Fehler beim Parsen eines Events:', err);
      }
    }kziehen
 * - getInterestCount() - Anzahl ohne Entschlüsselung
 */

import NDK, { NDKEvent, NDKPrivateKeySigner, NDKUser, type NDKFilter } from '@nostr-dev-kit/ndk';
import { getPublicKey } from 'nostr-tools';

export interface Interest {
  userPubkey: string;
  userName: string;
  message: string;
  timestamp: number;
}

/**
 * Initialisiere NDK mit Relay
 */
function initNDK(relay: string): NDK {
  const ndk = new NDK({
    explicitRelayUrls: [relay],
    enableOutboxModel: false  // Verhindert Auto-Relay-Discovery
  });
  return ndk;
}

/**
 * VEREINFACHT: Sende Interesse (nur Silent-Tracking, keine DMs)
 * 
 * Erstellt nur Kind 30078 Event für eigene Interest-Liste.
 * KEINE NIP-17 DMs - der Angebotsgeber erfährt erst davon wenn er auswählt.
 * 
 * @param userPrivateKey - Private Key des Users
 * @param userPublicKey - Public Key des Users
 * @param userName - Name des Users (optional)
 * @param tempOfferPubkey - Public Key vom Angebot (temp_pubkey)
 * @param offerId - ID des Angebots
 * @param relay - Relay URL
 */
export async function sendInterest(
  userPrivateKey: string,
  userPublicKey: string,
  userName: string,
  tempOfferPubkey: string,
  offerId: string,
  relay: string
): Promise<void> {
  try {
    console.log('💌 [SILENT] Registriere Interesse...');
    
    // 1. NDK Setup
    const ndk = initNDK(relay);
    await ndk.connect();
    
    const signer = new NDKPrivateKeySigner(userPrivateKey);
    ndk.signer = signer;
    
    console.log('  ✅ NDK verbunden');
    
    // 2. Erstelle Kind 30078 Event für eigene Interest-Liste (SILENT)
    const interestData = {
      temp_pubkey: tempOfferPubkey,
      offer_id: offerId,
      user_name: userName,
      timestamp: Math.floor(Date.now() / 1000),
      status: 'pending' // pending = wartend auf Auswahl
    };
    
    // 3. Erstelle Application-Specific Event (Kind 30078)
    const event = new NDKEvent(ndk);
    event.kind = 30078;
    event.content = JSON.stringify(interestData);
    event.tags = [
      ['d', `interest-${tempOfferPubkey}`],
      ['app', 'bitcoin-swap-interests']
    ];
    
    console.log('  ✅ Event erstellt (Kind 30078)');
    
    // 4. Publiziere Silent-Interest
    const publishResult = await event.publish();
    
    console.log('  📤 [SILENT] Interest registriert');
    console.log('  🤐 Kein DM an Angebotsgeber gesendet');
    console.log('  📊 Publish Result:', publishResult.size, 'Relays');
    
    // Prüfe ob Publishing erfolgreich war
    if (publishResult.size === 0) {
      throw new Error('❌ Publishing fehlgeschlagen - keine Relays haben das Event akzeptiert');
    }
    
    console.log('  ✅ [SILENT] Interest erfolgreich registriert');
    console.log('  🤐 Angebotsgeber wird NICHT benachrichtigt');
    console.log('  ⏳ Interest wartet auf Auswahl durch Angebotsgeber');
    
  } catch (error) {
    console.error('❌ Fehler beim Senden des Interesses:', error);
    throw error;
  }
}

/**
 * NEUE FUNKTION: Lade alle Interessenten für ein Angebot
 * 
 * Durchsucht alle Kind 30078 Events nach Interests für diese temp_pubkey.
 * Angebotsgeber kann sehen wer sich interessiert und auswählen.
 * 
 * @param tempOfferPubkey - Public Key vom Angebot (temp_pubkey)  
 * @param relay - Relay URL
 * @returns Array von Interessenten mit deren Pubkeys und Namen
 */
export async function loadInterestedUsers(
  tempOfferPubkey: string,
  relay: string
): Promise<Array<{userPubkey: string, userName: string, timestamp: number}>> {
  try {
    console.log('📋 [ANGEBOTSGEBER] Lade Interessenten für Angebot...');
    
    // 1. NDK Setup
    const ndk = initNDK(relay);
    await ndk.connect();
    
    console.log('  ✅ NDK verbunden');
    
    // 2. Suche alle Kind 30078 Events die sich für dieses Angebot interessieren
    const filter: NDKFilter = {
      kinds: [30078],
      '#app': ['bitcoin-swap-interests'],
      limit: 100
    };
    
    const events = await ndk.fetchEvents(filter);
    console.log(`  📊 ${events.size} Interest-Events gefunden`);
    
    // 3. Filtere Events für diese temp_pubkey
    const interestedUsers: Array<{userPubkey: string, userName: string, timestamp: number}> = [];
    
    for (const event of events) {
      try {
        const data = JSON.parse(event.content);
        
        // Prüfe ob Interest für unser Angebot
        if (data.temp_pubkey === tempOfferPubkey && data.status === 'pending') {
          interestedUsers.push({
            userPubkey: event.pubkey, // Pubkey des Interessenten
            userName: data.user_name || 'Anonym',
            timestamp: data.timestamp
          });
          console.log(`  ✅ Interessent: ${data.user_name || 'Anonym'} (${event.pubkey.substring(0, 16)}...)`);
        }
      } catch (err) {
        console.warn('  ⚠️ Fehler beim Parsen eines Events:', err);
      }
    }
    
    console.log(`  📊 ${interestedUsers.length} aktive Interessenten gefunden`);
    return interestedUsers;
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der Interessenten:', error);
    return [];
  }
}

/**
 * DEPRECATED: Alte loadInterests Funktion (war für NIP-17 DMs)
 * 
 * @deprecated Wird durch loadInterestedUsers ersetzt
 */
export async function loadInterests(
  tempPrivateKey: string,
  relay: string
): Promise<Interest[]> {
  try {
    console.log('📥 Lade Interessen...');
    
    const tempPublicKey = getPublicKey(tempPrivateKey as any);
    
    // 1. NDK Setup mit temp_private_key
    const ndk = initNDK(relay);
    await ndk.connect();
    
    const signer = new NDKPrivateKeySigner(tempPrivateKey);
    ndk.signer = signer;
    
    console.log('  ✅ NDK verbunden (mit temp_privkey)');
    
    // 2. Filter: Alle Kind 1059 (Gift-Wrapped) Events an temp_pubkey
    const filter: NDKFilter = {
      kinds: [1059],
      '#p': [tempPublicKey],
      limit: 100
    };
    
    const events = await ndk.fetchEvents(filter);
    
    console.log(`  ✅ ${events.size} Gift-Wrapped Events gefunden`);
    
    // 3. Entschlüssele alle Events
    const interests: Interest[] = [];
    
    for (const event of events) {
      try {
        // NDK entschlüsselt automatisch beim decrypt() call
        // Der entschlüsselte Content ist dann in event.content verfügbar
        await event.decrypt();
        
        if (!event.content || event.content === '') {
          console.warn('  ⚠️ Event-Content ist leer');
          continue;
        }
        
        const data = JSON.parse(event.content);
        
        // 4. Verarbeite Interesse-Typen
        if (data.type === 'interest') {
          interests.push({
            userPubkey: data.user_pubkey,
            userName: data.user_name || 'Anonym',
            message: data.message || '',
            timestamp: data.timestamp
          });
          console.log(`  ✅ Interesse von: ${data.user_name || 'Anonym'}`);
        } else if (data.type === 'withdraw') {
          // Interesse zurückgezogen - entferne aus Liste
          const index = interests.findIndex(i => i.userPubkey === data.user_pubkey);
          if (index > -1) {
            interests.splice(index, 1);
            console.log(`  🔄 Interesse zurückgezogen: ${data.user_pubkey.substring(0, 16)}...`);
          }
        }
      } catch (err) {
        console.warn('  ⚠️ Fehler beim Entschlüsseln eines Events:', err);
      }
    }
    
    console.log(`  ✅ ${interests.length} aktive Interessen`);
    
    return interests;
  } catch (error) {
    console.error('❌ Fehler beim Laden der Interessen:', error);
    throw error;
  }
}

/**
 * Interesse zurückziehen
 * 
 * @param userPrivateKey - Private Key des Users
 * @param userPublicKey - Public Key des Users
 * @param tempOfferPubkey - Public Key vom Angebot (temp_pubkey)
 * @param relay - Relay URL
 */
export async function withdrawInterest(
  userPrivateKey: string,
  userPublicKey: string,
  tempOfferPubkey: string,
  relay: string
): Promise<void> {
  try {
    console.log('🔄 Ziehe Interesse zurück...');
    
    // 1. NDK Setup
    const ndk = initNDK(relay);
    await ndk.connect();
    
    const signer = new NDKPrivateKeySigner(userPrivateKey);
    ndk.signer = signer;
    
    // 2. Erstelle Withdraw-Nachricht
    const withdrawData = {
      type: 'withdraw',
      user_pubkey: userPublicKey,
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    // 3. Erstelle NDK Event (Kind 14 - Sealed Sender)
    const event = new NDKEvent(ndk);
    event.kind = 14;
    event.content = JSON.stringify(withdrawData);
    event.tags = [['p', tempOfferPubkey]];
    
    // 4. Publiziere (NDK macht Gift-Wrapping automatisch!)
    await event.publish();
    
    console.log('  ✅ Interesse zurückgezogen');
    
  } catch (error) {
    console.error('❌ Fehler beim Zurückziehen des Interesses:', error);
    throw error;
  }
}

/**
 * NEUE FUNKTION: Zähle Silent-Interests für Angebot
 * 
 * Zählt Kind 30078 Events die sich für dieses Angebot interessieren.
 * Verwendet für Interest-Badge am Angebot.
 * 
 * @param tempPublicKey - Public Key vom Angebot (temp_pubkey)
 * @param relay - Relay URL
 * @returns Anzahl der aktiven Interessenten
 */
export async function getInterestCount(
  tempPublicKey: string,
  relay: string
): Promise<number> {
  try {
    console.log(`🔢 [INTEREST-COUNT] Zähle Silent-Interests für: ${tempPublicKey.substring(0, 16)}...`);
    
    const ndk = initNDK(relay);
    await ndk.connect();
    
    console.log(`  ✅ NDK verbunden`);
    
    // Filter: Alle Kind 30078 Events (ohne #app Filter - teste alle)
    const filter: NDKFilter = {
      kinds: [30078],
      limit: 100
    };
    
    console.log(`  🔎 Filter:`, JSON.stringify(filter, null, 2));
    
    const events = await ndk.fetchEvents(filter);
    
    console.log(`  📊 ${events.size} Interest-Events gefunden (Gesamt)`);
    
    // DEBUG: Zeige alle gefundenen Events
    for (const event of events) {
      console.log(`  🔍 DEBUG Event: ${event.id.substring(0, 16)}... von ${event.pubkey.substring(0, 16)}...`);
      console.log(`  📝 DEBUG Content: ${event.content.substring(0, 100)}...`);
    }
    
    // Zähle Events für dieses spezifische Angebot
    let count = 0;
    
    for (const event of events) {
      try {
        const data = JSON.parse(event.content);
        
        console.log(`  🔍 DEBUG: Parsed data:`, data);
        console.log(`  🔍 DEBUG: Looking for temp_pubkey: ${tempPublicKey}`);
        console.log(`  🔍 DEBUG: Found temp_pubkey: ${data.temp_pubkey}`);
        console.log(`  🔍 DEBUG: Status: ${data.status}`);
        
        // Prüfe ob Interest für unser Angebot und Status 'pending'
        if (data.temp_pubkey === tempPublicKey && data.status === 'pending') {
          count++;
          console.log(`  ✅ Interessent gefunden: ${data.user_name || 'Anonym'}`);
        } else {
          console.log(`  ❌ Event passt nicht: temp_pubkey match: ${data.temp_pubkey === tempPublicKey}, status: ${data.status}`);
        }
      } catch (err) {
        console.warn('  ⚠️ Fehler beim Parsen eines Events:', err);
      }
    }
    
    console.log(`  📊 ${count} aktive Interessenten für dieses Angebot`);
    return count;
  } catch (error) {
    console.error('❌ Fehler beim Zählen der Interessen:', error);
    return 0;
  }
}

/**
 * Speichere "Interest gesendet" auf Relay (Kind 30078 - verschlüsselt)
 * Damit kann der User später sehen, welche Interests er gesendet hat
 * 
 * @param userPrivateKey - Mein Private Key
 * @param tempPubkey - temp_pubkey vom Angebot
 * @param relay - Relay URL
 */
export async function saveMyInterest(
  userPrivateKey: string,
  tempPubkey: string,
  relay: string
): Promise<void> {
  try {
    console.log('💾 [SAVE-MY-INTEREST] Speichere Interest auf Relay...');
    
    const userPublicKey = getPublicKey(userPrivateKey as any);
    
    // 1. NDK Setup
    const ndk = initNDK(relay);
    await ndk.connect();
    
    const signer = new NDKPrivateKeySigner(userPrivateKey);
    ndk.signer = signer;
    
    // 2. Erstelle verschlüsseltes Event
    const interestData = {
      temp_pubkey: tempPubkey,
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    // 3. Kind 30078 - Application-Specific Data (replaceable)
    // "d" Tag = identifier (wir nutzen temp_pubkey als unique ID)
    const event = new NDKEvent(ndk);
    event.kind = 30078;
    event.content = JSON.stringify(interestData);
    event.tags = [
      ['d', tempPubkey],  // Unique identifier
      ['app', 'bitcoin-swap-interests']  // App identifier
    ];
    
    console.log('  📝 Event erstellt:', {
      kind: event.kind,
      tags: event.tags,
      content: event.content.substring(0, 50) + '...'
    });

    await event.publish();
    
    console.log('  ✅ Interest gespeichert (Kind 30078)');
    
  } catch (error) {
    console.error('❌ Fehler beim Speichern des Interests:', error);
    throw error;
  }
}

/**
 * Lade MEINE gesendeten Interests vom Relay
 * Filtert nach Kind 30078 Events (verschlüsselt)
 * 
 * @param userPrivateKey - Mein Private Key
 * @param relay - Relay URL
 * @returns Array von temp_pubkeys für die ich Interesse gesendet habe
 */
export async function getMyInterests(
  userPrivateKey: string,
  relay: string
): Promise<string[]> {
  try {
    console.log('📥 [GET-MY-INTERESTS] Lade meine Interests vom Relay...');
    
    const userPublicKey = getPublicKey(userPrivateKey as any);
    
    // 1. NDK Setup
    const ndk = initNDK(relay);
    await ndk.connect();
    
    const signer = new NDKPrivateKeySigner(userPrivateKey);
    ndk.signer = signer;
    
    console.log('  ✅ NDK verbunden');
    
    // 2. Filter: Alle Kind 30078 Events von MIR
    // OHNE #app Filter (falls Relay das nicht unterstützt)
    const filter: NDKFilter = {
      kinds: [30078],
      authors: [userPublicKey],
      limit: 100
    };
    
    console.log('  🔎 Filter:', JSON.stringify(filter, null, 2));
    
    const events = await ndk.fetchEvents(filter);
    
    console.log(`  ✅ ${events.size} Interest-Events gefunden (Gesamt-Kind 30078)`);
    
    // 3. Extrahiere temp_pubkeys
    const tempPubkeys: string[] = [];
    
    for (const event of events) {
      try {
        const data = JSON.parse(event.content);
        if (data.temp_pubkey) {
          tempPubkeys.push(data.temp_pubkey);
          console.log(`  ✅ Interest an: ${data.temp_pubkey.substring(0, 16)}...`);
        }
      } catch (err) {
        console.warn('  ⚠️ Fehler beim Parsen eines Events:', err);
      }
    }
    
    console.log(`  ✅ ${tempPubkeys.length} Interests geladen`);
    
    return tempPubkeys;
  } catch (error) {
    console.error('❌ Fehler beim Laden meiner Interests:', error);
    return [];
  }
}

/**
 * Sendet eine direkte NIP-17 Nachricht an einen Empfänger
 * @param senderPrivateKey - Private Key des Senders
 * @param recipientPubkey - Public Key des Empfängers
 * @param message - Nachrichteninhalt
 * @param relay - Relay URL
 */
export async function sendDirectMessage(
  senderPrivateKey: string,
  recipientPubkey: string,
  message: string,
  relay: string
): Promise<void> {
  try {
    console.log('📤 [SEND-DM] Sende direkte Nachricht...');
    
    // 1. NDK Setup
    const ndk = initNDK(relay);
    await ndk.connect();
    
    const signer = new NDKPrivateKeySigner(senderPrivateKey);
    ndk.signer = signer;
    
    // 2. NIP-17 DM Event erstellen
    const dmEvent = new NDKEvent(ndk);
    dmEvent.kind = 14; // NIP-17 Direct Message
    dmEvent.content = message;
    dmEvent.tags = [
      ['p', recipientPubkey]  // Empfänger
    ];
    
    // 3. Event verschlüsseln und senden
    const recipientUser = new NDKUser({
      pubkey: recipientPubkey
    });
    recipientUser.ndk = ndk;
    
    await dmEvent.encrypt(recipientUser);
    await dmEvent.publish();
    
    console.log('  ✅ Direkte Nachricht gesendet');
    
  } catch (error) {
    console.error('❌ Fehler beim Senden der direkten Nachricht:', error);
    throw error;
  }
}

/**
 * Erstellt einen Deal-Room zwischen Angebotsgeber und ausgewähltem Interessenten
 * @param anbieterPrivateKey - Private Key des Angebotsgeber (User 1)  
 * @param interessentPubkey - Public Key des ausgewählten Interessenten
 * @param offerContent - Inhalt des Angebots für Kontext
 * @param relay - Relay URL
 * @returns Deal-ID für die Route
 */
export async function createDealRoom(
  anbieterPrivateKey: string,
  interessentPubkey: string,
  offerContent: string,
  relay: string
): Promise<string> {
  try {
    console.log('🤝 [CREATE-DEAL-ROOM] Erstelle Deal-Room...');
    console.log(`  👤 Anbieter: ${getPublicKey(anbieterPrivateKey as any).substring(0, 16)}...`);
    console.log(`  👤 Interessent: ${interessentPubkey.substring(0, 16)}...`);
    
    // 1. NDK Setup
    const ndk = initNDK(relay);
    await ndk.connect();
    
    const signer = new NDKPrivateKeySigner(anbieterPrivateKey);
    ndk.signer = signer;
    
    console.log('  ✅ NDK verbunden');
    
    // 2. Deal-ID generieren (eindeutige ID für den Deal-Room)
    const dealId = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    console.log(`  🆔 Deal-ID: ${dealId.substring(0, 16)}...`);
    
    // 3. Erste NIP-17 DM senden: Deal-Room Einladung
    const dealMessage = {
      type: 'deal-room-invitation',
      dealId: dealId,
      offerContent: offerContent,
      message: 'Der Angebotsgeber möchte einen Deal-Room mit dir starten! 🤝',
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    // 4. NIP-17 DM erstellen und senden
    await sendDirectMessage(
      anbieterPrivateKey,
      interessentPubkey,
      JSON.stringify(dealMessage),
      relay
    );
    
    console.log('  📤 Deal-Room Einladung gesendet');
    
    // 5. Deal-Room Status Event erstellen (Kind 30078)
    const dealStatusData = {
      type: 'deal-room-status',
      dealId: dealId,
      participants: [getPublicKey(anbieterPrivateKey as any), interessentPubkey],
      status: 'active',
      offerContent: offerContent,
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    const statusEvent = new NDKEvent(ndk);
    statusEvent.kind = 30078;
    statusEvent.content = JSON.stringify(dealStatusData);
    statusEvent.tags = [
      ['d', `deal-room-${dealId}`],  // Unique identifier
      ['app', 'bitcoin-swap-deal-rooms'],  // App identifier
      ['p', interessentPubkey]  // Teilnehmer markieren
    ];
    
    await statusEvent.publish();
    
    console.log('  📝 Deal-Room Status Event erstellt');
    console.log('  ✅ Deal-Room erfolgreich erstellt!');
    
    return dealId;
    
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Deal-Rooms:', error);
    throw error;
  }
}

/**
 * Lädt eingehende Deal-Anfragen (NIP-17 DMs) für einen Angebotsgeber
 * @param privateKey - Private Key des Angebotgebers
 * @param relay - Relay URL
 * @returns Array von Deal-Anfragen
 */
export async function loadDealRequests(
  privateKey: string,
  relay: string
): Promise<Array<{
  id: string;
  senderPubkey: string;
  requesterName: string;
  message: string;
  offerId: string;
  offerContent: string;
  timestamp: number;
}>> {
  try {
    console.log('📥 [LOAD-DEAL-REQUESTS] Lade eingehende Deal-Anfragen...');
    
    const userPublicKey = getPublicKey(privateKey as any);
    
    // 1. NDK Setup
    const ndk = initNDK(relay);
    await ndk.connect();
    
    const signer = new NDKPrivateKeySigner(privateKey);
    ndk.signer = signer;
    
    console.log('  ✅ NDK verbunden');
    
    // 2. Filter: Alle NIP-17 DMs an mich
    const filter: NDKFilter = {
      kinds: [14], // NIP-17 Direct Message
      '#p': [userPublicKey], // An mich gerichtet
      limit: 50
    };
    
    console.log('  🔎 Filter:', JSON.stringify(filter, null, 2));
    
    const events = await ndk.fetchEvents(filter);
    
    console.log(`  📊 ${events.size} DM Events gefunden`);
    
    // 3. Events entschlüsseln und Deal-Anfragen extrahieren
    const dealRequests: Array<{
      id: string;
      senderPubkey: string;
      requesterName: string;
      message: string;
      offerId: string;
      offerContent: string;
      timestamp: number;
    }> = [];
    
    for (const event of events) {
      try {
        // Event entschlüsseln
        const senderUser = new NDKUser({
          pubkey: event.pubkey
        });
        senderUser.ndk = ndk;
        
        await event.decrypt(senderUser);
        
        // Prüfe ob es eine Deal-Anfrage ist
        const data = JSON.parse(event.content);
        
        if (data.type === 'deal-request') {
          dealRequests.push({
            id: event.id,
            senderPubkey: event.pubkey,
            requesterName: data.requesterName || 'Anonym',
            message: data.message || '',
            offerId: data.offerId || '',
            offerContent: data.offerContent || '',
            timestamp: data.timestamp || event.created_at || 0
          });
          
          console.log(`  ✅ Deal-Anfrage von: ${data.requesterName} (${event.pubkey.substring(0, 16)}...)`);
        }
        
      } catch (err) {
        console.warn('  ⚠️ Fehler beim Entschlüsseln/Parsen eines Events:', err);
      }
    }
    
    // 4. Nach Timestamp sortieren (neueste zuerst)
    dealRequests.sort((a, b) => b.timestamp - a.timestamp);
    
    console.log(`  ✅ ${dealRequests.length} Deal-Anfragen geladen`);
    
    return dealRequests;
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der Deal-Anfragen:', error);
    throw error;
  }
}

/**
 * Zählt Deal-Anfragen für ein spezifisches Angebot
 * @param privateKey - Private Key des Angebotgebers
 * @param offerId - ID des Angebots
 * @param relay - Relay URL
 * @returns Anzahl der Deal-Anfragen
 */
export async function countDealRequests(
  privateKey: string,
  offerId: string,
  relay: string
): Promise<number> {
  try {
    console.log(`🔢 [COUNT-DEAL-REQUESTS] Zähle Anfragen für Angebot: ${offerId.substring(0, 16)}...`);
    
    // Lade alle Deal-Anfragen
    const dealRequests = await loadDealRequests(privateKey, relay);
    
    // Filtere für dieses spezifische Angebot
    const count = dealRequests.filter(request => request.offerId === offerId).length;
    
    console.log(`  📊 ${count} Deal-Anfragen für dieses Angebot`);
    
    return count;
    
  } catch (error) {
    console.error('❌ Fehler beim Zählen der Deal-Anfragen:', error);
    return 0;
  }
}
