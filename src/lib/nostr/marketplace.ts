/**
 * ============================================
 * Marketplace: Angebots-System
 * ============================================
 * 
 * Funktionen für anonyme Angebote mit temp_keypair:
 * - createOffer() - Kind 42 Event mit 72h expiration
 * - deleteOffer() - Kind 5 Deletion Event
 * - loadOffers() - Alle aktiven Angebote laden
 * - isOfferExpired() - Prüfe ob Angebot abgelaufen
 */

import { SimplePool, finalizeEvent, type Event } from 'nostr-tools';

export interface Offer {
  id: string;
  content: string;
  tempPubkey: string;
  authorPubkey?: string; // Echter Public Key des Angebotgebers für NIP-17 DMs (optional für Rückwärtskompatibilität)
  createdAt: number;
  expiresAt: number;
  isExpired: boolean;
  isOwnOffer: boolean; // Wurde mit eigenem temp_keypair erstellt
}

/**
 * Erstelle ein Angebot (Kind 42 - Channel Message)
 * 
 * @param offerText - Angebots-Text (z.B. "Biete 100€ gegen 0.002 BTC")
 * @param tempKeypair - Temporärer Keypair für Anonymität
 * @param relay - Relay URL
 * @param channelId - Gruppen Channel-ID
 * @returns Event-ID des erstellten Angebots
 */
export async function createOffer(
  offerText: string,
  tempKeypair: { privateKey: string; publicKey: string },
  relay: string,
  channelId: string,
  authorPubkey?: string // Echter Public Key des Angebotgebers
): Promise<string> {
  try {
    console.log('📝 Erstelle Angebot...');
    
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + (72 * 60 * 60); // +72 Stunden
    
    const tags = [
      ['e', channelId, relay, 'root'],
      ['expiration', expiresAt.toString()] // NIP-40 Expiration
    ];
    
    // Füge Author-Tag hinzu, falls angegeben (für NIP-17 DMs)
    if (authorPubkey) {
      tags.push(['author', authorPubkey]);
    }
    
    const event = {
      kind: 42,
      pubkey: tempKeypair.publicKey,
      created_at: now,
      tags,
      content: offerText,
    };
    
    const signedEvent = finalizeEvent(event, tempKeypair.privateKey as any);
    
    console.log('  ✅ Event signiert:', signedEvent.id.substring(0, 16) + '...');
    console.log('  🔗 Verbinde zu Relay:', relay);
    
    // Publiziere auf Relay mit Error-Handling
    const pool = new SimplePool();
    
    try {
      // publish() gibt ein Array von Promises zurück
      const publishPromises = pool.publish([relay], signedEvent);
      
      // Timeout nach 3 Sekunden
      const timeoutPromise = new Promise<void>((resolve) => 
        setTimeout(() => {
          console.log('  ⏱️ Timeout - Event wurde an Relay gesendet');
          resolve();
        }, 3000)
      );
      
      // Warte auf alle Relay-Promises oder Timeout
      await Promise.race([
        Promise.all(publishPromises).then(() => {
          console.log('  📤 Event vom Relay bestätigt');
        }),
        timeoutPromise
      ]);
      
      console.log('  ⏰ Läuft ab in 72h');
    } catch (publishError) {
      console.warn('⚠️ Relay-Fehler (Event wurde trotzdem signiert):', publishError);
    } finally {
      // Schließe Pool sofort
      pool.close([relay]);
    }
    
    return signedEvent.id;
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Angebots:', error);
    throw error;
  }
}

/**
 * Lösche ein Angebot (Kind 5 - Deletion Event)
 * 
 * @param offerId - Event-ID des zu löschenden Angebots
 * @param tempPrivateKey - Private Key vom temp_keypair (nur Ersteller hat diesen!)
 * @param relay - Relay URL
 */
export async function deleteOffer(
  offerId: string,
  tempPrivateKey: string,
  tempPublicKey: string,
  relay: string
): Promise<void> {
  try {
    console.log('🗑️ Lösche Angebot:', offerId.substring(0, 16) + '...');
    
    const deletionEvent = {
      kind: 5,
      pubkey: tempPublicKey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['e', offerId]],
      content: 'Angebot vom Ersteller gelöscht',
    };
    
    const signedDeletion = finalizeEvent(deletionEvent, tempPrivateKey as any);
    
    console.log('  ✅ Deletion Event signiert');
    
    // Publiziere Deletion Event mit Error-Handling
    const pool = new SimplePool();
    
    try {
      const publishPromises = pool.publish([relay], signedDeletion);
      const timeoutPromise = new Promise<void>((resolve) => 
        setTimeout(() => {
          console.log('  ⏱️ Timeout - Deletion Event gesendet');
          resolve();
        }, 3000)
      );
      
      await Promise.race([
        Promise.all(publishPromises).then(() => {
          console.log('  📤 Deletion Event bestätigt');
        }),
        timeoutPromise
      ]);
      
      console.log('  ✅ Angebot gelöscht');
    } catch (publishError) {
      console.warn('⚠️ Relay-Fehler beim Löschen:', publishError);
    } finally {
      pool.close([relay]);
    }
  } catch (error) {
    console.error('❌ Fehler beim Löschen des Angebots:', error);
    throw error;
  }
}

/**
 * Lade alle Angebote aus dem Relay
 * Filtert automatisch abgelaufene Angebote raus
 * 
 * @param relay - Relay URL
 * @param channelId - Gruppen Channel-ID
 * @param ownTempPubkey - Optional: Eigener temp_pubkey (markiert eigene Angebote)
 * @returns Array von Offer-Objekten
 */
export async function loadOffers(
  relay: string,
  channelId: string,
  ownTempPubkey?: string
): Promise<Offer[]> {
  try {
    console.log('📥 Lade Angebote...');
    
    const pool = new SimplePool();
    
    // Filter für Kind 42 Events (Channel Messages)
    const filter = {
      kinds: [42],
      '#e': [channelId],
      limit: 100
    };
    
    try {
      console.log('  🔍 Query-Filter:', JSON.stringify(filter, null, 2));
      
      const queryPromise = pool.querySync([relay], filter);
      const timeoutPromise = new Promise<any[]>((_, reject) => 
        setTimeout(() => reject(new Error('Relay Timeout nach 30s')), 30000)
      );
      
      const events = await Promise.race([queryPromise, timeoutPromise]);
      
      console.log(`  ✅ ${events.length} Events gefunden`);
      
      if (events.length > 0) {
        console.log('  📋 Events:', events.map(e => ({
          id: e.id.substring(0, 16) + '...',
          pubkey: e.pubkey.substring(0, 16) + '...',
          tags: e.tags
        })));
      }
      
      // Konvertiere zu Offer-Objekten
      const offers: Offer[] = events.map(event => {
        const expirationTag = event.tags.find(t => t[0] === 'expiration');
        const authorTag = event.tags.find(t => t[0] === 'author');
        
        const expiresAt = expirationTag ? parseInt(expirationTag[1]) : 0;
        const isExpired = isOfferExpired(event);
        const isOwnOffer = ownTempPubkey ? event.pubkey === ownTempPubkey : false;
        
        return {
          id: event.id,
          content: event.content,
          tempPubkey: event.pubkey,
          authorPubkey: authorTag ? authorTag[1] : undefined,
          createdAt: event.created_at,
          expiresAt,
          isExpired,
          isOwnOffer
        };
      });
      
      // Filtere abgelaufene Angebote raus
      const activeOffers = offers.filter(offer => !offer.isExpired);
      
      console.log(`  ✅ ${activeOffers.length} aktive Angebote (${offers.length - activeOffers.length} abgelaufen)`);
      
      return activeOffers;
    } catch (queryError) {
      console.warn('⚠️ Relay-Fehler beim Laden:', queryError);
      return []; // Leeres Array bei Fehler
    } finally {
      // Schließe Pool im finally-Block
      pool.close([relay]);
    }
  } catch (error) {
    console.error('❌ Fehler beim Laden der Angebote:', error);
    throw error;
  }
}

/**
 * Prüfe ob ein Angebot abgelaufen ist
 * 
 * @param event - Nostr Event (Kind 42)
 * @returns true wenn abgelaufen, false wenn noch gültig
 */
export function isOfferExpired(event: Event): boolean {
  const expirationTag = event.tags.find(t => t[0] === 'expiration');
  if (!expirationTag) return false;
  
  const expiresAt = parseInt(expirationTag[1]);
  const now = Math.floor(Date.now() / 1000);
  
  return now > expiresAt;
}

/**
 * Prüfe ob ein Angebot existiert
 * Wird verwendet um zu entscheiden ob "Angebot erstellen" Button angezeigt wird
 * 
 * @param relay - Relay URL
 * @param channelId - Gruppen Channel-ID
 * @returns true wenn mindestens 1 aktives Angebot existiert
 */
export async function hasActiveOffer(
  relay: string,
  channelId: string
): Promise<boolean> {
  try {
    const offers = await loadOffers(relay, channelId);
    return offers.length > 0;
  } catch (error) {
    console.error('❌ Fehler beim Prüfen auf aktive Angebote:', error);
    return false;
  }
}
