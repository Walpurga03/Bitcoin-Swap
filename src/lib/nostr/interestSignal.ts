/**
 * Interesse-Signal Management (VOLLSTÄNDIG ANONYM)
 * 
 * Dieses Modul verwaltet verschlüsselte UND ANONYME Interesse-Signale für Marketplace-Angebote.
 * 
 * ANONYMITÄT:
 * - Interessent erstellt temporäres Keypair (wie beim Angebot)
 * - Event wird mit temp-privateKey signiert → temp-pubkey im Event
 * - Im verschlüsselten Content steht der ECHTE pubkey
 * - Auf Relay: Niemand kann sehen WER Interesse gezeigt hat
 * - Nur Anbieter kann entschlüsseln und echten pubkey sehen
 * 
 * Vorteile:
 * - Vollständige Anonymität auf Relay-Ebene
 * - Privatsphäre: Andere Gruppenmitglieder sehen KEINE Interessenten
 * - Effizienz: Nur EINE DM wird erstellt (mit ausgewähltem Partner)
 * - Kontrolle: Anbieter sieht alle Interessenten und wählt aus
 */

import { getPublicKey } from 'nostr-tools';
import * as nip04 from 'nostr-tools/nip04';
import type { NostrEvent, NostrFilter } from './types';
import { createEvent, publishEvent, fetchEvents } from './client';
import { GROUP_TAG } from '$lib/config';
import { generateOfferSecret, deriveKeypairFromSecret } from './offerSecret';
import { logger, marketplaceLogger } from '$lib/utils/logger';

/**
 * Interface für Interesse-Signal (verschlüsselter Content)
 */
export interface InterestSignal {
  offerId: string;
  interestedPubkey: string; // ECHTER Pubkey (nur verschlüsselt sichtbar)
  timestamp: number;
  message?: string;
  userName?: string;
}

/**
 * Interface für entschlüsseltes Interesse-Signal mit Event-Metadaten
 */
export interface DecryptedInterestSignal extends InterestSignal {
  eventId: string;
  createdAt: number;
  tempPubkey: string; // Temporärer Public Key (Event-Author)
}

/**
 * Sende Interesse-Signal (VOLLSTÄNDIG ANONYM)
 * 
 * Erstellt ein verschlüsseltes Event (Kind 30078) mit temporärem Keypair.
 * Nur der Anbieter kann mit seinem Angebots-Private-Key entschlüsseln.
 * 
 * ANONYMITÄT:
 * - Event wird mit temp-privateKey signiert (temp-pubkey im Event)
 * - Echter pubkey NUR im verschlüsselten Content
 * - Auf Relay: Niemand sieht den echten Interessenten
 * 
 * @param offerId - ID des Angebots
 * @param offerPublicKey - Public Key des Angebots (aus Secret abgeleitet)
 * @param message - Optional: Nachricht an Anbieter
 * @param userName - Optional: Name des Interessenten
 * @param userPrivateKey - ECHTER Private Key des Interessenten (nur für verschlüsselten Content)
 * @param relay - Relay-URL
 * @returns Object mit Event und temp-secret für Löschung
 * 
 * @example
 * const result = await sendInterestSignal(
 *   offerId,
 *   offerPubkey,
 *   "Ich hätte Interesse!",
 *   "Alice",
 *   userPrivateKey,
 *   relay
 * );
 * // Speichere result.tempSecret um später löschen zu können!
 */
export async function sendInterestSignal(
  offerId: string,
  offerPublicKey: string,
  message: string,
  userName: string,
  userPrivateKey: string,
  relay: string
): Promise<{ event: NostrEvent; tempSecret: string }> {
  marketplaceLogger.interest(' [INTEREST-SIGNAL] Sende ANONYMES verschlüsseltes Interesse-Signal...');
  logger.debug('� VERSION: 2024-11-07-18:15 - NEUE VERSCHLÜSSELUNG');
  logger.debug('�📋 Offer-ID:', offerId.substring(0, 16) + '...');
  logger.debug('👤 User:', userName);

  const userPubkey = getPublicKey(userPrivateKey as any);

  // 🔐 ANONYMITÄT: Generiere temporäres Keypair
  const tempSecret = generateOfferSecret();
  const tempKeypair = deriveKeypairFromSecret(tempSecret);
  logger.debug('🎭 Temp-Pubkey:', tempKeypair.publicKey.substring(0, 16) + '...');
  logger.debug('👤 Echter Pubkey:', userPubkey.substring(0, 16) + '... (nur verschlüsselt)');

  // Erstelle Signal-Daten (mit ECHTEM Pubkey)
  const signal: InterestSignal = {
    offerId,
    interestedPubkey: userPubkey, // ECHTER Pubkey (nur verschlüsselt sichtbar!)
    timestamp: Date.now(),
    message,
    userName
  };

  // 🔐 WICHTIG: Verschlüssele mit TEMP-KEYPAIR (nicht mit echtem User-PrivateKey!)
  // NIP-04: encrypt(senderPrivKey, receiverPubKey, plaintext)
  // Anbieter entschlüsselt später mit: decrypt(receiverPrivKey, senderPubKey=tempPubkey, ciphertext)
  const encrypted = await nip04.encrypt(
    tempKeypair.privateKey as any, // TEMP-PrivateKey (passt zum Event-Signatur!)
    offerPublicKey,                 // Angebots-PublicKey (Empfänger)
    JSON.stringify(signal)
  );

  logger.debug('🔐 Signal verschlüsselt mit temp-keypair (nur Anbieter kann lesen)');

  // 🎭 ANONYMITÄT: Event wird mit TEMP-KEYPAIR signiert!
  const tags = [
    ['d', `interest-${offerId}-${tempKeypair.publicKey}`], // Unique mit temp-pubkey
    ['e', offerId, '', 'reply'],                           // Referenz zum Angebot
    ['t', 'bitcoin-interest'],                             // Tag für Filtering
    ['t', GROUP_TAG]                                       // Gruppen-Tag
    // ❌ KEIN 'p' Tag! (Privatsphäre)
  ];

  // Event signiert mit TEMP-PRIVATE-KEY → temp-pubkey im Event!
  const event = await createEvent(30078, encrypted, tags, tempKeypair.privateKey);
  const result = await publishEvent(event, [relay]);

  logger.debug('✅ ANONYMES Interesse-Signal gesendet:', result.relays.length + '/' + 1 + ' Relays');
  logger.debug('💾 Speichere temp-secret um später löschen zu können!');

  return { event, tempSecret };
}

/**
 * Lade Interesse-Signale für Angebot (nur Anbieter)
 * 
 * Lädt alle verschlüsselten Interesse-Signale für ein Angebot und
 * entschlüsselt sie mit dem Angebots-Private-Key.
 * 
 * ANONYMITÄT:
 * - event.pubkey ist TEMP-PUBKEY (anonym auf Relay)
 * - Echter pubkey im verschlüsselten Content
 * 
 * @param offerId - ID des Angebots
 * @param offerPrivateKey - Private Key des Angebots (aus Secret abgeleitet)
 * @param relay - Relay-URL
 * @returns Array von entschlüsselten Interesse-Signalen mit ECHTEN pubkeys
 * 
 * @example
 * const interests = await loadInterestSignals(offerId, offerPrivateKey, relay);
 * logger.debug(`${interests.length} Interessenten gefunden`);
 */
export async function loadInterestSignals(
  offerId: string,
  offerPrivateKey: string,
  relay: string
): Promise<DecryptedInterestSignal[]> {
  marketplaceLogger.interest(' [INTEREST-SIGNALS] Lade ANONYME Interesse-Signale...');
  logger.debug('� VERSION: 2024-11-07-18:15 - NEUE ENTSCHLÜSSELUNG');
  logger.debug('�📋 Offer-ID:', offerId.substring(0, 16) + '...');

  // Filter für Interesse-Signale
  const filter: NostrFilter = {
    kinds: [30078],
    '#e': [offerId],
    '#t': ['bitcoin-interest']
  };

  const events = await fetchEvents([relay], filter);
  logger.debug('📦 Gefundene Events:', events.length);

  // Entschlüssele mit Angebots-Private-Key
  const signals: DecryptedInterestSignal[] = [];
  const offerPublicKey = getPublicKey(offerPrivateKey as any);

  for (const event of events) {
    try {
      // 🎭 ANONYMITÄT: event.pubkey ist TEMP-PUBKEY (nicht der echte Interessent!)
      // Wir brauchen den temp-pubkey NUR für NIP-04 Entschlüsselung
      const tempPubkey = event.pubkey;
      
      // Entschlüssele Content mit Angebots-Private-Key
      // NIP-04: decrypt(receiverPrivKey, senderPubKey, encrypted)
      // Der Interessent hat mit seinem ECHTEN privKey verschlüsselt
      // Wir entschlüsseln mit unserem privKey und dem TEMP-pubkey
      const decrypted = await nip04.decrypt(
        offerPrivateKey as any,  // Unser Angebots-Private-Key
        tempPubkey,              // Temp-Public-Key (Event-Author, NICHT der echte!)
        event.content
      );

      const signal: InterestSignal = JSON.parse(decrypted);

      // Füge Event-Metadaten hinzu
      signals.push({
        ...signal,
        eventId: event.id,
        createdAt: event.created_at,
        tempPubkey: tempPubkey // Speichere temp-pubkey für Löschung
      });

      logger.debug('✅ Signal entschlüsselt:');
      logger.debug('  🎭 Temp-Pubkey (Event):', tempPubkey.substring(0, 16) + '...');
      logger.debug('  👤 ECHTER Pubkey:', signal.interestedPubkey.substring(0, 16) + '...');
      logger.debug('  📝 Name:', signal.userName || '(kein Name)');
    } catch (error) {
      logger.warn('  ⚠️ Entschlüsselung fehlgeschlagen für Event:', event.id.substring(0, 16) + '...');
      logger.error('  🔍 Debug-Info:', {
        offerPrivateKey: offerPrivateKey.substring(0, 16) + '...',
        tempPubkey: event.pubkey.substring(0, 16) + '...',
        contentLength: event.content.length,
        error: error
      });
      // Ignoriere Events die nicht entschlüsselt werden können
    }
  }

  logger.debug('📊 Entschlüsselte Signale:', signals.length);

  // Sortiere nach Timestamp (neueste zuerst)
  signals.sort((a, b) => b.timestamp - a.timestamp);

  return signals;
}

/**
 * Lösche Interesse-Signal (mit temp-secret)
 * 
 * Löscht ein Interesse-Signal vom Relay (NIP-09).
 * Benötigt das temp-secret das beim Senden zurückgegeben wurde.
 * 
 * ANONYMITÄT:
 * - Event wurde mit temp-privateKey signiert
 * - Löschung muss auch mit temp-privateKey erfolgen
 * - Daher: User muss temp-secret speichern!
 * 
 * @param eventId - ID des zu löschenden Events
 * @param tempSecret - Temp-Secret (vom Senden zurückgegeben)
 * @param relay - Relay-URL
 * @param reason - Optional: Grund für Löschung
 * 
 * @example
 * const { tempSecret } = await sendInterestSignal(...);
 * // Speichere tempSecret!
 * await deleteInterestSignal(eventId, tempSecret, relay, "Interesse zurückgezogen");
 */
export async function deleteInterestSignal(
  eventId: string,
  tempSecret: string,
  relay: string,
  reason?: string
): Promise<void> {
  logger.debug('🗑️ [INTEREST-SIGNAL] Lösche ANONYMES Interesse-Signal...');
  logger.debug('🆔 Event-ID:', eventId.substring(0, 16) + '...');

  // Leite temp-keypair aus secret ab
  const tempKeypair = deriveKeypairFromSecret(tempSecret);

  const tags = [['e', eventId]];
  const content = reason || 'Interesse zurückgezogen';

  // Löschung MUSS mit temp-privateKey erfolgen (gleicher wie Event!)
  const deleteEvent = await createEvent(5, content, tags, tempKeypair.privateKey);
  await publishEvent(deleteEvent, [relay]);

  logger.debug('✅ ANONYMES Interesse-Signal gelöscht');
}

/**
 * Prüfe ob User bereits Interesse gezeigt hat (lokal)
 * 
 * ANONYMITÄT:
 * - Events sind mit temp-pubkeys signiert
 * - Wir können NICHT auf Relay nach authors filtern
 * - Lösung: Speichere temp-secrets lokal (sessionStorage)
 * 
 * @param offerId - ID des Angebots
 * @returns true wenn temp-secret für dieses Angebot existiert
 * 
 * @example
 * const hasInterest = hasUserShownInterest(offerId);
 * if (hasInterest) {
 *   logger.debug("Du hast bereits Interesse gezeigt");
 * }
 */
export function hasUserShownInterest(offerId: string): boolean {
  const key = `interest-secret-${offerId}`;
  return sessionStorage.getItem(key) !== null;
}

/**
 * Speichere temp-secret für Interesse-Signal (lokal)
 * 
 * @param offerId - ID des Angebots
 * @param tempSecret - Temp-Secret vom Senden
 * 
 * @example
 * const { tempSecret } = await sendInterestSignal(...);
 * saveInterestSecret(offerId, tempSecret);
 */
export function saveInterestSecret(offerId: string, tempSecret: string): void {
  const key = `interest-secret-${offerId}`;
  sessionStorage.setItem(key, tempSecret);
  logger.debug('💾 [INTEREST] Temp-Secret gespeichert für Offer:', offerId.substring(0, 16) + '...');
}

/**
 * Lade temp-secret für Interesse-Signal (lokal)
 * 
 * @param offerId - ID des Angebots
 * @returns Temp-Secret oder null
 */
export function getInterestSecret(offerId: string): string | null {
  const key = `interest-secret-${offerId}`;
  return sessionStorage.getItem(key);
}

/**
 * Lösche temp-secret für Interesse-Signal (lokal)
 * 
 * @param offerId - ID des Angebots
 */
export function removeInterestSecret(offerId: string): void {
  const key = `interest-secret-${offerId}`;
  sessionStorage.removeItem(key);
  logger.debug('🗑️ [INTEREST] Temp-Secret gelöscht für Offer:', offerId.substring(0, 16) + '...');
}

/**
 * Zähle Anzahl der Interessenten für Angebot
 * 
 * Gibt nur die Anzahl zurück, ohne zu entschlüsseln.
 * Nützlich für UI-Anzeige "3 Interessenten".
 * 
 * @param offerId - ID des Angebots
 * @param relay - Relay-URL
 * @returns Anzahl der Interesse-Signale
 * 
 * @example
 * const count = await countInterestSignals(offerId, relay);
 * logger.debug(`${count} Interessenten`);
 */
export async function countInterestSignals(
  offerId: string,
  relay: string
): Promise<number> {
  const filter: NostrFilter = {
    kinds: [30078],
    '#e': [offerId],
    '#t': ['bitcoin-interest']
  };

  const events = await fetchEvents([relay], filter);
  return events.length;
}

/**
 * Lade eigene Interesse-Signale (lokal)
 * 
 * ANONYMITÄT:
 * - Events sind mit temp-pubkeys signiert
 * - Wir können NICHT auf Relay nach authors filtern
 * - Lösung: Lade aus sessionStorage
 * 
 * @returns Array von Offer-IDs mit temp-secrets
 * 
 * @example
 * const myInterests = loadMyInterestSignals();
 * logger.debug(`Du hast ${myInterests.length} Interessen gezeigt`);
 */
export function loadMyInterestSignals(): Array<{ offerId: string; tempSecret: string }> {
  const interests: Array<{ offerId: string; tempSecret: string }> = [];
  
  // Durchsuche sessionStorage nach interest-secret-* Keys
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith('interest-secret-')) {
      const offerId = key.replace('interest-secret-', '');
      const tempSecret = sessionStorage.getItem(key);
      if (tempSecret) {
        interests.push({ offerId, tempSecret });
      }
    }
  }
  
  return interests;
}

/**
 * Lösche ALLE Interesse-Signale eines Angebots
 * 
 * Wird vom Angebotsgeber aufgerufen wenn er sein Angebot löscht.
 * Lädt alle Interesse-Signale vom Relay und löscht sie mit Kind 5 Events.
 * 
 * @param offerId - ID des Angebots
 * @param offerSecret - Secret des Angebots (um Signale zu entschlüsseln und temp-keys zu finden)
 * @param relay - Relay-URL
 * 
 * @example
 * // Beim Löschen eines Angebots:
 * await deleteAllInterestSignals(offerId, offerSecret, relay);
 */
export async function deleteAllInterestSignals(
  offerId: string,
  offerSecret: string,
  relay: string
): Promise<void> {
  try {
    marketplaceLogger.interest(`🗑️ Lösche alle Interesse-Signale für Angebot ${offerId.substring(0, 16)}...`);
    
    // 1. Lade alle Interesse-Signale für dieses Angebot
    const filter: NostrFilter = {
      kinds: [30078],
      '#e': [offerId],
      '#t': ['bitcoin-interest']
    };
    
    const events = await fetchEvents([relay], filter, 5000);
    
    if (events.length === 0) {
      logger.debug('ℹ️ Keine Interesse-Signale zum Löschen gefunden');
      return;
    }
    
    marketplaceLogger.interest(`📦 ${events.length} Interesse-Signal(e) gefunden`);
    
    // 2. Für jedes Event: Erstelle Kind 5 (Deletion Event)
    // WICHTIG: Wir können die Events NICHT löschen (haben nicht den temp-privateKey)
    // Aber wir können ein Deletion Event mit unserem Angebots-Key erstellen
    // um zu signalisieren dass das Angebot nicht mehr verfügbar ist
    
    const offerKeypair = deriveKeypairFromSecret(offerSecret);
    
    for (const event of events) {
      try {
        // Erstelle Deletion Event für dieses Interesse-Signal
        const tags = [
          ['e', event.id],
          ['k', '30078']
        ];
        const content = 'Angebot wurde gelöscht';
        
        const deleteEvent = await createEvent(5, content, tags, offerKeypair.privateKey);
        await publishEvent(deleteEvent, [relay]);
        
        logger.debug(`✅ Deletion Event für ${event.id.substring(0, 16)}... erstellt`);
      } catch (error) {
        logger.error(`❌ Fehler beim Löschen von ${event.id.substring(0, 16)}...`, error);
      }
    }
    
    marketplaceLogger.interest(`✅ ${events.length} Deletion Events erstellt`);
    
  } catch (error) {
    logger.error('❌ Fehler beim Löschen aller Interesse-Signale:', error);
    // Nicht werfen - Angebot soll trotzdem gelöscht werden
  }
}
