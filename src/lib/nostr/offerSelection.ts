/**
 * Offer Selection Module
 * 
 * Verwaltet die Auswahl eines Partners aus den Interessenten-Signalen.
 * Der Anbieter kann:
 * - Liste aller Interessenten sehen
 * - EINEN Partner auswählen
 * - Alle anderen automatisch absagen
 * - Dann erst eine DM mit dem gewählten Partner starten
 * 
 * Flow:
 * 1. Anbieter sieht verschlüsselte Interesse-Signale
 * 2. Anbieter wählt einen aus
 * 3. System sendet Absagen an alle anderen (NIP-04 verschlüsselt)
 * 4. System startet DM mit gewähltem Partner (NIP-17)
 * 5. Alle Interesse-Signale werden gelöscht
 */

import type { NostrEvent } from 'nostr-tools';
import * as nip04 from 'nostr-tools/nip04';
import { finalizeEvent, type EventTemplate } from 'nostr-tools';
import { publishEvent, initPool } from './client';
import type { DecryptedInterestSignal } from './interestSignal';
import { deleteInterestSignal } from './interestSignal';

/**
 * Absage-Nachricht Struktur
 */
export interface RejectionMessage {
  offerId: string;
  offerTitle: string;
  reason: 'selected_other' | 'offer_closed';
  timestamp: number;
}

/**
 * Auswahl-Ergebnis
 */
export interface SelectionResult {
  selectedPubkey: string;
  rejectedPubkeys: string[];
  dmThreadId?: string;
  errors: Array<{ pubkey: string; error: string }>;
}

/**
 * Sendet eine verschlüsselte Absage-Nachricht an einen Interessenten
 * 
 * @param offerKeypair - Keypair des Angebots (aus Secret abgeleitet)
 * @param interestedPubkey - Public Key des abgelehnten Interessenten
 * @param offerId - ID des Angebots
 * @param offerTitle - Titel des Angebots
 * @param reason - Grund der Absage
 * @param relayUrl - Relay URL
 * @returns Promise mit dem Event oder null bei Fehler
 */
export async function sendRejectionMessage(
  offerKeypair: { publicKey: string; privateKey: string },
  interestedPubkey: string,
  offerId: string,
  offerTitle: string,
  reason: 'selected_other' | 'offer_closed',
  relayUrl: string
): Promise<NostrEvent | null> {
  try {
    // Absage-Nachricht erstellen
    const rejection: RejectionMessage = {
      offerId,
      offerTitle,
      reason,
      timestamp: Math.floor(Date.now() / 1000)
    };

    // Mit NIP-04 verschlüsseln (nur Empfänger kann lesen)
    const encrypted = await nip04.encrypt(
      offerKeypair.privateKey,
      interestedPubkey,
      JSON.stringify(rejection)
    );

    // Event erstellen (Kind 30079 = Custom Rejection Message)
    const eventTemplate: EventTemplate = {
      kind: 30079,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', `rejection-${offerId}-${interestedPubkey}`], // Addressable
        ['p', interestedPubkey], // Empfänger
        ['e', offerId], // Bezug zum Angebot
        ['type', 'offer_rejection'],
        ['reason', reason],
        ['expiration', String(Math.floor(Date.now() / 1000) + 86400)] // 24h gültig
      ],
      content: encrypted
    };

    // Event signieren
    const signedEvent = finalizeEvent(eventTemplate, offerKeypair.privateKey as any);

    // Event publishen
    await publishEvent(signedEvent, [relayUrl]);

    console.log(`✅ Absage gesendet an ${interestedPubkey.slice(0, 8)}...`);
    return signedEvent;

  } catch (error) {
    console.error('❌ Fehler beim Senden der Absage:', error);
    return null;
  }
}

/**
 * Wählt einen Partner aus und sendet Absagen an alle anderen
 * 
 * @param offerKeypair - Keypair des Angebots
 * @param selectedPubkey - Public Key des ausgewählten Partners
 * @param allInterests - Alle Interesse-Signale
 * @param offerId - ID des Angebots
 * @param offerTitle - Titel des Angebots
 * @param relayUrl - Relay URL
 * @returns Promise mit Auswahl-Ergebnis
 */
export async function selectPartner(
  offerKeypair: { publicKey: string; privateKey: string },
  selectedPubkey: string,
  allInterests: DecryptedInterestSignal[],
  offerId: string,
  offerTitle: string,
  relayUrl: string
): Promise<SelectionResult> {
  const result: SelectionResult = {
    selectedPubkey,
    rejectedPubkeys: [],
    errors: []
  };

  try {
    // Alle anderen Interessenten finden
    const rejectedInterests = allInterests.filter(
      interest => interest.interestedPubkey !== selectedPubkey
    );

    console.log(`📋 Sende Absagen an ${rejectedInterests.length} Interessenten...`);

    // Absagen parallel senden
    const rejectionPromises = rejectedInterests.map(async (interest) => {
      try {
        const rejection = await sendRejectionMessage(
          offerKeypair,
          interest.interestedPubkey,
          offerId,
          offerTitle,
          'selected_other',
          relayUrl
        );

        if (rejection) {
          result.rejectedPubkeys.push(interest.interestedPubkey);
          
          // Interesse-Signal löschen
          await deleteInterestSignal(
            offerKeypair.privateKey,
            interest.eventId,
            relayUrl
          );
        } else {
          result.errors.push({
            pubkey: interest.interestedPubkey,
            error: 'Absage konnte nicht gesendet werden'
          });
        }
      } catch (error) {
        result.errors.push({
          pubkey: interest.interestedPubkey,
          error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
      }
    });

    await Promise.all(rejectionPromises);

    // Interesse-Signal des ausgewählten Partners auch löschen
    const selectedInterest = allInterests.find(
      interest => interest.interestedPubkey === selectedPubkey
    );
    
    if (selectedInterest) {
      await deleteInterestSignal(
        offerKeypair.privateKey,
        selectedInterest.eventId,
        relayUrl
      );
    }

    console.log(`✅ Auswahl abgeschlossen: ${result.rejectedPubkeys.length} Absagen gesendet`);
    
    if (result.errors.length > 0) {
      console.warn(`⚠️ ${result.errors.length} Fehler beim Absagen:`, result.errors);
    }

    return result;

  } catch (error) {
    console.error('❌ Fehler bei Partner-Auswahl:', error);
    throw error;
  }
}

/**
 * Lädt alle Absage-Nachrichten für einen User
 * 
 * @param userPubkey - Public Key des Users
 * @param userPrivkey - Private Key des Users (zum Entschlüsseln)
 * @param relayUrl - Relay URL
 * @returns Promise mit Array von Absage-Nachrichten
 */
export async function loadRejectionMessages(
  userPubkey: string,
  userPrivkey: string,
  relayUrl: string
): Promise<RejectionMessage[]> {
  return new Promise((resolve) => {
    const rejections: RejectionMessage[] = [];
    const seenIds = new Set<string>();
    const pool = initPool();

    const filter = {
      kinds: [30079],
      '#p': [userPubkey],
      '#type': ['offer_rejection']
    };

    const sub = pool.subscribeMany(
      [relayUrl],
      [filter] as any,
      {
        onevent: async (event: NostrEvent) => {
          // Duplikate vermeiden
          if (seenIds.has(event.id)) return;
          seenIds.add(event.id);

          try {
            // Entschlüsseln
            const decrypted = await nip04.decrypt(
              userPrivkey,
              event.pubkey,
              event.content
            );

            const rejection: RejectionMessage = JSON.parse(decrypted);
            rejections.push(rejection);

          } catch (error) {
            console.error('❌ Fehler beim Entschlüsseln der Absage:', error);
          }
        },
        oneose: () => {
          sub.close();
          resolve(rejections);
        }
      }
    );

    // Timeout nach 5 Sekunden
    setTimeout(() => {
      sub.close();
      resolve(rejections);
    }, 5000);
  });
}

/**
 * Sendet Absagen an ALLE Interessenten (z.B. wenn Angebot geschlossen wird)
 * 
 * @param offerKeypair - Keypair des Angebots
 * @param allInterests - Alle Interesse-Signale
 * @param offerId - ID des Angebots
 * @param offerTitle - Titel des Angebots
 * @param relayUrl - Relay URL
 * @returns Promise mit Array von gesendeten Absagen
 */
export async function rejectAllInterests(
  offerKeypair: { publicKey: string; privateKey: string },
  allInterests: DecryptedInterestSignal[],
  offerId: string,
  offerTitle: string,
  relayUrl: string
): Promise<{ sent: number; failed: number; errors: Array<{ pubkey: string; error: string }> }> {
  const result = {
    sent: 0,
    failed: 0,
    errors: [] as Array<{ pubkey: string; error: string }>
  };

  console.log(`📋 Sende Absagen an alle ${allInterests.length} Interessenten...`);

  const rejectionPromises = allInterests.map(async (interest) => {
    try {
      const rejection = await sendRejectionMessage(
        offerKeypair,
        interest.interestedPubkey,
        offerId,
        offerTitle,
        'offer_closed',
        relayUrl
      );

      if (rejection) {
        result.sent++;
        
        // Interesse-Signal löschen
        await deleteInterestSignal(
          offerKeypair.privateKey,
          interest.eventId,
          relayUrl
        );
      } else {
        result.failed++;
        result.errors.push({
          pubkey: interest.interestedPubkey,
          error: 'Absage konnte nicht gesendet werden'
        });
      }
    } catch (error) {
      result.failed++;
      result.errors.push({
        pubkey: interest.interestedPubkey,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
    }
  });

  await Promise.all(rejectionPromises);

  console.log(`✅ Absagen abgeschlossen: ${result.sent} gesendet, ${result.failed} fehlgeschlagen`);
  
  if (result.errors.length > 0) {
    console.warn(`⚠️ Fehler beim Absagen:`, result.errors);
  }

  return result;
}

/**
 * Prüft ob ein User eine Absage für ein bestimmtes Angebot erhalten hat
 * 
 * @param userPubkey - Public Key des Users
 * @param userPrivkey - Private Key des Users
 * @param offerId - ID des Angebots
 * @param relayUrl - Relay URL
 * @returns Promise mit true wenn Absage vorhanden
 */
export async function hasReceivedRejection(
  userPubkey: string,
  userPrivkey: string,
  offerId: string,
  relayUrl: string
): Promise<boolean> {
  const rejections = await loadRejectionMessages(userPubkey, userPrivkey, relayUrl);
  return rejections.some(r => r.offerId === offerId);
}