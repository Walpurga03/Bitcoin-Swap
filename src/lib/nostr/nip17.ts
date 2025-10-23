/**
 * ============================================
 * NIP-17: Gift-Wrapped Interest Messages
 * ============================================
 * 
 * Verwendung von NDK für automatisches Gift-Wrapping:
 * - sendInterest() - Sende verschlüsseltes Interesse
 * - loadInterests() - Lade & entschlüssele Interessen (nur Ersteller)
 * - withdrawInterest() - Interesse zurückziehen
 * - getInterestCount() - Anzahl ohne Entschlüsselung
 */

import NDK, { NDKPrivateKeySigner, NDKEvent, type NDKFilter } from '@nostr-dev-kit/ndk';
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
    explicitRelayUrls: [relay]
  });
  return ndk;
}

/**
 * Sende Interesse an Angebot (NIP-17 verschlüsselt)
 * 
 * @param userPrivateKey - Private Key des Users
 * @param userPublicKey - Public Key des Users
 * @param userName - Name des Users (optional)
 * @param message - Nachricht (optional)
 * @param tempOfferPubkey - Public Key vom Angebot (temp_pubkey)
 * @param relay - Relay URL
 */
export async function sendInterest(
  userPrivateKey: string,
  userPublicKey: string,
  userName: string,
  message: string,
  tempOfferPubkey: string,
  relay: string
): Promise<void> {
  try {
    console.log('💌 Sende Interesse...');
    
    // 1. NDK Setup
    const ndk = initNDK(relay);
    await ndk.connect();
    
    const signer = new NDKPrivateKeySigner(userPrivateKey);
    ndk.signer = signer;
    
    console.log('  ✅ NDK verbunden');
    
    // 2. Erstelle Interesse-Nachricht
    const interestData = {
      type: 'interest',
      user_pubkey: userPublicKey,
      user_name: userName,
      message: message,
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    // 3. Erstelle NDK Event (Kind 14 - Sealed Sender)
    const event = new NDKEvent(ndk);
    event.kind = 14;
    event.content = JSON.stringify(interestData);
    event.tags = [['p', tempOfferPubkey]];
    
    console.log('  ✅ Event erstellt (Kind 14)');
    
    // 4. Publiziere (NDK macht Gift-Wrapping automatisch!)
    await event.publish();
    
    console.log('  📤 Interesse gesendet (Gift-Wrapped)');
    console.log('  🎁 NDK hat automatisch in Kind 1059 verpackt');
    
  } catch (error) {
    console.error('❌ Fehler beim Senden des Interesses:', error);
    throw error;
  }
}

/**
 * Lade alle Interessen für ein Angebot (nur Ersteller kann entschlüsseln!)
 * 
 * @param tempPrivateKey - Private Key vom temp_keypair (nur Ersteller hat diesen!)
 * @param relay - Relay URL
 * @returns Array von Interest-Objekten
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
 * Zähle Interessen OHNE zu entschlüsseln
 * Zeigt nur Anzahl an (Privacy-freundlich)
 * 
 * @param tempPublicKey - Public Key vom Angebot (temp_pubkey)
 * @param relay - Relay URL
 * @returns Anzahl der Interesse-Events
 */
export async function getInterestCount(
  tempPublicKey: string,
  relay: string
): Promise<number> {
  try {
    const ndk = initNDK(relay);
    await ndk.connect();
    
    // Filter: Alle Kind 1059 Events an temp_pubkey
    const filter: NDKFilter = {
      kinds: [1059],
      '#p': [tempPublicKey],
      limit: 100
    };
    
    const events = await ndk.fetchEvents(filter);
    
    // Zähle nur, entschlüssele NICHT
    return events.size;
  } catch (error) {
    console.error('❌ Fehler beim Zählen der Interessen:', error);
    return 0;
  }
}
