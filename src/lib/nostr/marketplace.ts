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

import type { NostrFilter } from './types';
import { logger, marketplaceLogger } from '$lib/utils/logger';

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
  authorPubkey?: string, // Echter Public Key des Angebotgebers
  secretHash?: string // Gruppen-spezifischer Hash zur Filterung
): Promise<string> {
  try {
    logger.debug('📝 Erstelle Angebot...');
    
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
    
    // WICHTIG: Füge gruppen-spezifischen Tag hinzu zur Filterung
    if (secretHash) {
      tags.push(['g', secretHash]); // 'g' für Group-Hash
    }
    
    const event = {
      kind: 42,
      pubkey: tempKeypair.publicKey,
      created_at: now,
      tags,
      content: offerText,
    };
    
    const signedEvent = finalizeEvent(event, tempKeypair.privateKey as any);
    
    logger.debug('✅ Event signiert:', signedEvent.id.substring(0, 16) + '...');
    logger.debug('🔗 Verbinde zu Relay:', relay);
    
    // Publiziere auf Relay mit Error-Handling
    const pool = new SimplePool();
    
    try {
      // publish() gibt ein Array von Promises zurück
      const publishPromises = pool.publish([relay], signedEvent);
      
      // Timeout nach 3 Sekunden
      const timeoutPromise = new Promise<void>((resolve) => 
        setTimeout(() => {
          logger.debug('⏱️ Timeout - Event wurde an Relay gesendet');
          resolve();
        }, 3000)
      );
      
      // Warte auf alle Relay-Promises oder Timeout
      await Promise.race([
        Promise.all(publishPromises).then(() => {
          logger.debug('📤 Event vom Relay bestätigt');
        }),
        timeoutPromise
      ]);
      
      logger.debug('⏰ Läuft ab in 72h');
    } catch (publishError) {
      logger.warn(' Relay-Fehler (Event wurde trotzdem signiert):', publishError);
    } finally {
      // Schließe Pool sofort
      pool.close([relay]);
    }
    
    return signedEvent.id;
  } catch (error) {
    logger.error(' Fehler beim Erstellen des Angebots:', error);
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
    logger.debug('🗑️ Lösche Angebot:', offerId.substring(0, 16) + '...');
    
    const deletionEvent = {
      kind: 5,
      pubkey: tempPublicKey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['e', offerId]],
      content: 'Angebot vom Ersteller gelöscht',
    };
    
    const signedDeletion = finalizeEvent(deletionEvent, tempPrivateKey as any);
    
    logger.debug('✅ Deletion Event signiert');
    
    // Publiziere Deletion Event mit Error-Handling
    const pool = new SimplePool();
    
    try {
      const publishPromises = pool.publish([relay], signedDeletion);
      const timeoutPromise = new Promise<void>((resolve) => 
        setTimeout(() => {
          logger.debug('⏱️ Timeout - Deletion Event gesendet');
          resolve();
        }, 3000)
      );
      
      await Promise.race([
        Promise.all(publishPromises).then(() => {
          logger.debug('📤 Deletion Event bestätigt');
        }),
        timeoutPromise
      ]);
      
      logger.debug('✅ Angebot gelöscht');
    } catch (publishError) {
      logger.warn(' Relay-Fehler beim Löschen:', publishError);
    } finally {
      pool.close([relay]);
    }
  } catch (error) {
    logger.error(' Fehler beim Löschen des Angebots:', error);
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
  ownTempPubkey?: string,
  secretHash?: string // Gruppen-spezifischer Hash zur Filterung
): Promise<Offer[]> {
  try {
    logger.info(' Lade Angebote...');
    
    const pool = new SimplePool();
    
    // Filter für Kind 42 Events (Channel Messages)
    const filter: NostrFilter = {
      kinds: [42],
      '#e': [channelId],
      limit: 100
    };
    
    // WICHTIG: Filtere nur Angebote dieser Gruppe
    if (secretHash) {
      filter['#g'] = [secretHash];  // Custom group hash tag
    }
    
    try {
      logger.debug('🔍 Query-Filter:', JSON.stringify(filter, null, 2));
      
      const queryPromise = pool.querySync([relay], filter);
      const timeoutPromise = new Promise<any[]>((_, reject) => 
        setTimeout(() => reject(new Error('Relay Timeout nach 30s')), 30000)
      );
      
      const events = await Promise.race([queryPromise, timeoutPromise]);
      
      logger.debug(`  ✅ ${events.length} Events gefunden`);
      
      if (events.length > 0) {
        logger.debug('📋 Events:', events.map(e => ({
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
      
      logger.debug(`  ✅ ${activeOffers.length} aktive Angebote (${offers.length - activeOffers.length} abgelaufen)`);
      
      return activeOffers;
    } catch (queryError) {
      logger.warn(' Relay-Fehler beim Laden:', queryError);
      return []; // Leeres Array bei Fehler
    } finally {
      // Schließe Pool im finally-Block
      pool.close([relay]);
    }
  } catch (error) {
    logger.error(' Fehler beim Laden der Angebote:', error);
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
    logger.error(' Fehler beim Prüfen auf aktive Angebote:', error);
    return false;
  }
}
