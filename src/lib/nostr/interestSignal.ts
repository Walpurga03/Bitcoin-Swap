/**
 * Interesse-Signal Management
 * 
 * Dieses Modul verwaltet verschlüsselte Interesse-Signale für Marketplace-Angebote.
 * Statt sofort NIP-17 DMs zu senden, werden verschlüsselte Signale erstellt,
 * die nur der Anbieter (mit seinem Angebots-Secret) entschlüsseln kann.
 * 
 * Vorteile:
 * - Privatsphäre: Andere Gruppenmitglieder sehen KEINE Interessenten
 * - Effizienz: Nur EINE DM wird erstellt (mit ausgewähltem Partner)
 * - Kontrolle: Anbieter sieht alle Interessenten und wählt aus
 */

import { getPublicKey } from 'nostr-tools';
import * as nip04 from 'nostr-tools/nip04';
import type { NostrEvent, NostrFilter } from './types';
import { createEvent, publishEvent, fetchEvents } from './client';
import { GROUP_TAG } from '$lib/config';

/**
 * Interface für Interesse-Signal
 */
export interface InterestSignal {
  offerId: string;
  interestedPubkey: string;
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
}

/**
 * Sende Interesse-Signal (verschlüsselt)
 * 
 * Erstellt ein verschlüsseltes Event (Kind 30078), das nur der Anbieter
 * mit seinem Angebots-Private-Key entschlüsseln kann.
 * 
 * @param offerId - ID des Angebots
 * @param offerPublicKey - Public Key des Angebots (aus Secret abgeleitet)
 * @param message - Optional: Nachricht an Anbieter
 * @param userName - Optional: Name des Interessenten
 * @param userPrivateKey - Private Key des Interessenten
 * @param relay - Relay-URL
 * @returns Erstelltes Event
 * 
 * @example
 * await sendInterestSignal(
 *   offerId,
 *   offerPubkey,
 *   "Ich hätte Interesse!",
 *   "Alice",
 *   userPrivateKey,
 *   relay
 * );
 */
export async function sendInterestSignal(
  offerId: string,
  offerPublicKey: string,
  message: string,
  userName: string,
  userPrivateKey: string,
  relay: string
): Promise<NostrEvent> {
  console.log('💌 [INTEREST-SIGNAL] Sende verschlüsseltes Interesse-Signal...');
  console.log('  📋 Offer-ID:', offerId.substring(0, 16) + '...');
  console.log('  👤 User:', userName);

  const userPubkey = getPublicKey(userPrivateKey as any);

  // Erstelle Signal-Daten
  const signal: InterestSignal = {
    offerId,
    interestedPubkey: userPubkey,
    timestamp: Date.now(),
    message,
    userName
  };

  // Verschlüssele mit Anbieter-Pubkey (NIP-04)
  // Nur Anbieter mit seinem Private Key kann entschlüsseln
  const encrypted = await nip04.encrypt(
    userPrivateKey as any,
    offerPublicKey,
    JSON.stringify(signal)
  );

  console.log('  🔐 Signal verschlüsselt (nur Anbieter kann lesen)');

  // Erstelle Event (Kind 30078 = Addressable Event)
  const tags = [
    ['d', `interest-${offerId}-${userPubkey}`], // Unique identifier
    ['e', offerId, '', 'reply'],                 // Referenz zum Angebot
    ['t', 'bitcoin-interest'],                   // Tag für Filtering
    ['t', GROUP_TAG]                             // Gruppen-Tag
    // ❌ KEIN 'p' Tag mit Anbieter-Pubkey! (Privatsphäre)
  ];

  const event = await createEvent(30078, encrypted, tags, userPrivateKey);
  const result = await publishEvent(event, [relay]);

  console.log('  ✅ Interesse-Signal gesendet:', result.relays.length + '/' + 1 + ' Relays');

  return event;
}

/**
 * Lade Interesse-Signale für Angebot (nur Anbieter)
 * 
 * Lädt alle verschlüsselten Interesse-Signale für ein Angebot und
 * entschlüsselt sie mit dem Angebots-Private-Key.
 * 
 * @param offerId - ID des Angebots
 * @param offerPrivateKey - Private Key des Angebots (aus Secret abgeleitet)
 * @param relay - Relay-URL
 * @returns Array von entschlüsselten Interesse-Signalen
 * 
 * @example
 * const interests = await loadInterestSignals(offerId, offerPrivateKey, relay);
 * console.log(`${interests.length} Interessenten gefunden`);
 */
export async function loadInterestSignals(
  offerId: string,
  offerPrivateKey: string,
  relay: string
): Promise<DecryptedInterestSignal[]> {
  console.log('💌 [INTEREST-SIGNALS] Lade Interesse-Signale...');
  console.log('  📋 Offer-ID:', offerId.substring(0, 16) + '...');

  // Filter für Interesse-Signale
  const filter: NostrFilter = {
    kinds: [30078],
    '#e': [offerId],
    '#t': ['bitcoin-interest']
  };

  const events = await fetchEvents([relay], filter);
  console.log('  📦 Gefundene Events:', events.length);

  // Entschlüssele mit Angebots-Private-Key
  const signals: DecryptedInterestSignal[] = [];

  for (const event of events) {
    try {
      // Entschlüssele Content
      const decrypted = await nip04.decrypt(
        offerPrivateKey as any,
        event.pubkey,
        event.content
      );

      const signal: InterestSignal = JSON.parse(decrypted);

      // Füge Event-Metadaten hinzu
      signals.push({
        ...signal,
        eventId: event.id,
        createdAt: event.created_at
      });

      console.log('  ✅ Signal entschlüsselt:', signal.userName || signal.interestedPubkey.substring(0, 16) + '...');
    } catch (error) {
      console.warn('  ⚠️ Entschlüsselung fehlgeschlagen für Event:', event.id.substring(0, 16) + '...');
      // Ignoriere Events die nicht entschlüsselt werden können
    }
  }

  console.log('  📊 Entschlüsselte Signale:', signals.length);

  // Sortiere nach Timestamp (neueste zuerst)
  signals.sort((a, b) => b.timestamp - a.timestamp);

  return signals;
}

/**
 * Lösche Interesse-Signal
 * 
 * Löscht ein Interesse-Signal vom Relay (NIP-09).
 * Nur der Ersteller kann sein eigenes Signal löschen.
 * 
 * @param eventId - ID des zu löschenden Events
 * @param userPrivateKey - Private Key des Interessenten
 * @param relay - Relay-URL
 * @param reason - Optional: Grund für Löschung
 * 
 * @example
 * await deleteInterestSignal(eventId, userPrivateKey, relay, "Interesse zurückgezogen");
 */
export async function deleteInterestSignal(
  eventId: string,
  userPrivateKey: string,
  relay: string,
  reason?: string
): Promise<void> {
  console.log('🗑️ [INTEREST-SIGNAL] Lösche Interesse-Signal...');
  console.log('  🆔 Event-ID:', eventId.substring(0, 16) + '...');

  const tags = [['e', eventId]];
  const content = reason || 'Interesse zurückgezogen';

  const deleteEvent = await createEvent(5, content, tags, userPrivateKey);
  await publishEvent(deleteEvent, [relay]);

  console.log('  ✅ Interesse-Signal gelöscht');
}

/**
 * Prüfe ob User bereits Interesse gezeigt hat
 * 
 * @param offerId - ID des Angebots
 * @param userPubkey - Public Key des Users
 * @param relay - Relay-URL
 * @returns true wenn User bereits Interesse gezeigt hat
 * 
 * @example
 * const hasInterest = await hasUserShownInterest(offerId, userPubkey, relay);
 * if (hasInterest) {
 *   console.log("Du hast bereits Interesse gezeigt");
 * }
 */
export async function hasUserShownInterest(
  offerId: string,
  userPubkey: string,
  relay: string
): Promise<boolean> {
  const filter: NostrFilter = {
    kinds: [30078],
    authors: [userPubkey],
    '#e': [offerId],
    '#t': ['bitcoin-interest'],
    limit: 1
  };

  const events = await fetchEvents([relay], filter);
  return events.length > 0;
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
 * console.log(`${count} Interessenten`);
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
 * Lade eigene Interesse-Signale
 * 
 * Lädt alle Interesse-Signale die der User selbst gesendet hat.
 * Nützlich für "Meine Interessen" Übersicht.
 * 
 * @param userPubkey - Public Key des Users
 * @param relay - Relay-URL
 * @returns Array von Event-IDs und Offer-IDs
 * 
 * @example
 * const myInterests = await loadMyInterestSignals(userPubkey, relay);
 * console.log(`Du hast ${myInterests.length} Interessen gezeigt`);
 */
export async function loadMyInterestSignals(
  userPubkey: string,
  relay: string
): Promise<Array<{ eventId: string; offerId: string; timestamp: number }>> {
  const filter: NostrFilter = {
    kinds: [30078],
    authors: [userPubkey],
    '#t': ['bitcoin-interest'],
    limit: 100
  };

  const events = await fetchEvents([relay], filter);

  return events.map(event => {
    const offerTag = event.tags.find(t => t[0] === 'e' && t[3] === 'reply');
    return {
      eventId: event.id,
      offerId: offerTag ? offerTag[1] : '',
      timestamp: event.created_at
    };
  }).filter(i => i.offerId !== '');
}