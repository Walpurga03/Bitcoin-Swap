/**
 * Offer Expiration Module
 * 
 * Verwaltet die automatische Löschung von Angeboten nach 24 Stunden.
 * 
 * Features:
 * - Expiration-Tag beim Erstellen setzen (NIP-40)
 * - Automatische Cleanup-Funktion
 * - Deletion Events senden (NIP-09)
 * - Interesse-Signale mitlöschen
 * - Absagen an alle Interessenten senden
 * 
 * Flow:
 * 1. Angebot wird mit expiration-Tag erstellt (24h)
 * 2. Nach Ablauf: Cleanup-Funktion findet abgelaufene Angebote
 * 3. Für jedes abgelaufene Angebot:
 *    - Lade alle Interesse-Signale
 *    - Sende Absagen an alle Interessenten
 *    - Lösche alle Interesse-Signale
 *    - Lösche das Angebot selbst (NIP-09)
 */

import type { NostrEvent } from 'nostr-tools';
import { finalizeEvent, type EventTemplate } from 'nostr-tools';
import { publishEvent, fetchEvents, initPool } from './client';
import { loadInterestSignals, type DecryptedInterestSignal } from './interestSignal';
import { rejectAllInterests } from './offerSelection';

/**
 * Abgelaufenes Angebot
 */
export interface ExpiredOffer {
  eventId: string;
  offerId: string;
  offerTitle?: string;
  expirationTime: number;
  interests: DecryptedInterestSignal[];
}

/**
 * Cleanup-Ergebnis
 */
export interface CleanupResult {
  totalExpired: number;
  cleaned: number;
  failed: number;
  errors: Array<{ offerId: string; error: string }>;
}

/**
 * Berechnet den Expiration-Timestamp (24h ab jetzt)
 * 
 * @returns Unix-Timestamp in Sekunden
 */
export function calculateExpirationTime(): number {
  return Math.floor(Date.now() / 1000) + 86400; // 24 Stunden = 86400 Sekunden
}

/**
 * Erstellt einen Expiration-Tag für ein Event
 * 
 * @param hours - Anzahl Stunden bis zum Ablauf (default: 24)
 * @returns Tag-Array ['expiration', timestamp]
 */
export function createExpirationTag(hours: number = 24): [string, string] {
  const expirationTime = Math.floor(Date.now() / 1000) + (hours * 3600);
  return ['expiration', String(expirationTime)];
}

/**
 * Prüft ob ein Event abgelaufen ist
 * 
 * @param event - Das zu prüfende Event
 * @returns true wenn abgelaufen
 */
export function isEventExpired(event: NostrEvent): boolean {
  const expirationTag = event.tags.find(t => t[0] === 'expiration');
  
  if (!expirationTag || !expirationTag[1]) {
    return false; // Kein Expiration-Tag = nie abgelaufen
  }

  const expirationTime = parseInt(expirationTag[1], 10);
  const now = Math.floor(Date.now() / 1000);

  return now >= expirationTime;
}

/**
 * Extrahiert die Expiration-Zeit aus einem Event
 * 
 * @param event - Das Event
 * @returns Unix-Timestamp oder null
 */
export function getExpirationTime(event: NostrEvent): number | null {
  const expirationTag = event.tags.find(t => t[0] === 'expiration');
  
  if (!expirationTag || !expirationTag[1]) {
    return null;
  }

  return parseInt(expirationTag[1], 10);
}

/**
 * Berechnet verbleibende Zeit bis zum Ablauf
 * 
 * @param event - Das Event
 * @returns Verbleibende Sekunden oder null
 */
export function getRemainingTime(event: NostrEvent): number | null {
  const expirationTime = getExpirationTime(event);
  
  if (!expirationTime) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const remaining = expirationTime - now;

  return remaining > 0 ? remaining : 0;
}

/**
 * Formatiert verbleibende Zeit als lesbaren String
 * 
 * @param seconds - Verbleibende Sekunden
 * @returns Formatierter String (z.B. "23h 45m")
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) {
    return 'Abgelaufen';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Lädt alle abgelaufenen Angebote eines Users
 * 
 * @param offerKeypair - Keypair des Angebots
 * @param relayUrl - Relay URL
 * @returns Promise mit Array von abgelaufenen Angeboten
 */
export async function loadExpiredOffers(
  offerKeypair: { publicKey: string; privateKey: string },
  relayUrl: string
): Promise<ExpiredOffer[]> {
  try {
    console.log('🕐 [EXPIRATION] Suche abgelaufene Angebote...');

    // Lade alle Angebote des Users (Kind 30000)
    const filter = {
      kinds: [30000],
      authors: [offerKeypair.publicKey],
      limit: 100
    };

    const events = await fetchEvents([relayUrl], filter);
    console.log(`  📦 Gefundene Angebote: ${events.length}`);

    // Filtere abgelaufene
    const expiredOffers: ExpiredOffer[] = [];

    for (const event of events) {
      if (isEventExpired(event)) {
        const expirationTime = getExpirationTime(event) || 0;
        
        // Extrahiere Offer-ID aus d-Tag
        const dTag = event.tags.find(t => t[0] === 'd');
        const offerId = dTag ? dTag[1] : event.id;

        // Lade Interesse-Signale für dieses Angebot
        const interests = await loadInterestSignals(
          event.id,
          offerKeypair.privateKey,
          relayUrl
        );

        expiredOffers.push({
          eventId: event.id,
          offerId,
          expirationTime,
          interests
        });
      }
    }

    console.log(`  ⏰ Abgelaufene Angebote: ${expiredOffers.length}`);
    return expiredOffers;

  } catch (error) {
    console.error('❌ [EXPIRATION] Fehler beim Laden:', error);
    return [];
  }
}

/**
 * Löscht ein abgelaufenes Angebot komplett
 * 
 * @param offerKeypair - Keypair des Angebots
 * @param expiredOffer - Das abgelaufene Angebot
 * @param relayUrl - Relay URL
 * @returns Promise mit true bei Erfolg
 */
export async function deleteExpiredOffer(
  offerKeypair: { publicKey: string; privateKey: string },
  expiredOffer: ExpiredOffer,
  relayUrl: string
): Promise<boolean> {
  try {
    console.log(`🗑️ [EXPIRATION] Lösche abgelaufenes Angebot: ${expiredOffer.offerId}`);

    // 1. Sende Absagen an alle Interessenten
    if (expiredOffer.interests.length > 0) {
      console.log(`  📧 Sende Absagen an ${expiredOffer.interests.length} Interessenten...`);
      
      await rejectAllInterests(
        offerKeypair,
        expiredOffer.interests,
        expiredOffer.eventId,
        expiredOffer.offerTitle || 'Angebot',
        relayUrl
      );
    }

    // 2. Lösche das Angebot selbst (NIP-09 Deletion Event)
    console.log('  🗑️ Erstelle Deletion Event...');
    
    const deletionTemplate: EventTemplate = {
      kind: 5, // NIP-09 Deletion
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['e', expiredOffer.eventId],
        ['k', '30000'] // Kind des gelöschten Events
      ],
      content: 'Angebot nach 24h automatisch gelöscht'
    };

    const deletionEvent = finalizeEvent(deletionTemplate, offerKeypair.privateKey as any);
    await publishEvent(deletionEvent, [relayUrl]);

    console.log('  ✅ Angebot gelöscht');
    return true;

  } catch (error) {
    console.error('❌ [EXPIRATION] Fehler beim Löschen:', error);
    return false;
  }
}

/**
 * Führt Cleanup für alle abgelaufenen Angebote durch
 * 
 * @param offerKeypair - Keypair des Angebots
 * @param relayUrl - Relay URL
 * @returns Promise mit Cleanup-Ergebnis
 */
export async function cleanupExpiredOffers(
  offerKeypair: { publicKey: string; privateKey: string },
  relayUrl: string
): Promise<CleanupResult> {
  const result: CleanupResult = {
    totalExpired: 0,
    cleaned: 0,
    failed: 0,
    errors: []
  };

  try {
    console.log('🧹 [CLEANUP] Starte Cleanup für abgelaufene Angebote...');

    // Lade alle abgelaufenen Angebote
    const expiredOffers = await loadExpiredOffers(offerKeypair, relayUrl);
    result.totalExpired = expiredOffers.length;

    if (expiredOffers.length === 0) {
      console.log('  ✅ Keine abgelaufenen Angebote gefunden');
      return result;
    }

    console.log(`  📋 Cleanup für ${expiredOffers.length} Angebote...`);

    // Lösche jedes abgelaufene Angebot
    for (const offer of expiredOffers) {
      try {
        const success = await deleteExpiredOffer(offerKeypair, offer, relayUrl);
        
        if (success) {
          result.cleaned++;
        } else {
          result.failed++;
          result.errors.push({
            offerId: offer.offerId,
            error: 'Löschen fehlgeschlagen'
          });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          offerId: offer.offerId,
          error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
      }
    }

    console.log('📊 [CLEANUP] Ergebnis:');
    console.log(`  ✅ Gelöscht: ${result.cleaned}`);
    console.log(`  ❌ Fehlgeschlagen: ${result.failed}`);
    
    if (result.errors.length > 0) {
      console.warn('  ⚠️ Fehler:', result.errors);
    }

    return result;

  } catch (error) {
    console.error('❌ [CLEANUP] Fehler beim Cleanup:', error);
    throw error;
  }
}

/**
 * Startet automatischen Cleanup-Timer
 * Führt alle 5 Minuten einen Cleanup durch
 * 
 * @param offerKeypair - Keypair des Angebots
 * @param relayUrl - Relay URL
 * @returns Cleanup-Timer (kann mit clearInterval gestoppt werden)
 */
export function startAutoCleanup(
  offerKeypair: { publicKey: string; privateKey: string },
  relayUrl: string
): NodeJS.Timeout {
  console.log('⏰ [AUTO-CLEANUP] Starte automatischen Cleanup (alle 5 Minuten)...');

  // Sofort einmal ausführen
  cleanupExpiredOffers(offerKeypair, relayUrl).catch(error => {
    console.error('❌ [AUTO-CLEANUP] Fehler beim initialen Cleanup:', error);
  });

  // Dann alle 5 Minuten wiederholen
  const timer = setInterval(() => {
    console.log('⏰ [AUTO-CLEANUP] Führe geplanten Cleanup durch...');
    
    cleanupExpiredOffers(offerKeypair, relayUrl).catch(error => {
      console.error('❌ [AUTO-CLEANUP] Fehler beim geplanten Cleanup:', error);
    });
  }, 5 * 60 * 1000); // 5 Minuten

  return timer;
}

/**
 * Stoppt den automatischen Cleanup-Timer
 * 
 * @param timer - Der Timer von startAutoCleanup()
 */
export function stopAutoCleanup(timer: NodeJS.Timeout): void {
  console.log('⏹️ [AUTO-CLEANUP] Stoppe automatischen Cleanup');
  clearInterval(timer);
}

/**
 * Prüft ob ein Angebot bald abläuft (< 1 Stunde)
 * 
 * @param event - Das Event
 * @returns true wenn < 1 Stunde verbleibend
 */
export function isExpiringSoon(event: NostrEvent): boolean {
  const remaining = getRemainingTime(event);
  
  if (remaining === null) {
    return false;
  }

  return remaining > 0 && remaining < 3600; // < 1 Stunde
}

/**
 * Verlängert die Expiration-Zeit eines Angebots
 * Erstellt ein neues replaceable Event mit neuer Expiration
 * 
 * @param offerKeypair - Keypair des Angebots
 * @param originalEvent - Das Original-Event
 * @param additionalHours - Zusätzliche Stunden (default: 24)
 * @param relayUrl - Relay URL
 * @returns Promise mit neuem Event
 */
export async function extendOfferExpiration(
  offerKeypair: { publicKey: string; privateKey: string },
  originalEvent: NostrEvent,
  additionalHours: number = 24,
  relayUrl: string
): Promise<NostrEvent> {
  try {
    console.log(`⏰ [EXTEND] Verlängere Angebot um ${additionalHours}h...`);

    // Erstelle neues Event mit gleicher d-Tag (replaceable)
    const dTag = originalEvent.tags.find(t => t[0] === 'd');
    
    if (!dTag) {
      throw new Error('Kein d-Tag gefunden (nicht replaceable)');
    }

    // Neue Expiration-Zeit
    const newExpirationTime = Math.floor(Date.now() / 1000) + (additionalHours * 3600);

    // Kopiere alle Tags außer expiration
    const newTags = originalEvent.tags
      .filter(t => t[0] !== 'expiration')
      .concat([['expiration', String(newExpirationTime)]]);

    const eventTemplate: EventTemplate = {
      kind: originalEvent.kind,
      created_at: Math.floor(Date.now() / 1000),
      tags: newTags,
      content: originalEvent.content
    };

    const newEvent = finalizeEvent(eventTemplate, offerKeypair.privateKey as any);
    await publishEvent(newEvent, [relayUrl]);

    console.log(`  ✅ Angebot verlängert bis: ${new Date(newExpirationTime * 1000).toLocaleString()}`);
    return newEvent;

  } catch (error) {
    console.error('❌ [EXTEND] Fehler beim Verlängern:', error);
    throw error;
  }
}