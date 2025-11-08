/**
 * Offer Expiration Utilities
 * 
 * Einfache Helper-Funktionen für Angebots-Ablauf-Zeiten.
 * Keine Auto-Cleanup-Funktionen (werden aktuell nicht genutzt).
 */

import type { NostrEvent } from 'nostr-tools';

/**
 * Prüft ob ein Event ein Expiration-Tag hat (NIP-40)
 */
export function hasExpirationTag(event: NostrEvent): boolean {
  return event.tags.some(tag => tag[0] === 'expiration');
}

/**
 * Extrahiert die Expiration-Zeit aus einem Event (Unix-Timestamp)
 */
export function getExpirationTime(event: NostrEvent): number | null {
  const expirationTag = event.tags.find(tag => tag[0] === 'expiration');
  if (!expirationTag || !expirationTag[1]) return null;
  
  return parseInt(expirationTag[1]);
}

/**
 * Prüft ob ein Event abgelaufen ist
 */
export function isEventExpired(event: NostrEvent): boolean {
  const expirationTime = getExpirationTime(event);
  if (!expirationTime) return false;
  
  const now = Math.floor(Date.now() / 1000);
  return now > expirationTime;
}

/**
 * Berechnet verbleibende Zeit bis zum Ablauf (in Sekunden)
 */
export function getRemainingTime(expiresAt: number): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, expiresAt - now);
}

/**
 * Formatiert verbleibende Zeit für UI-Anzeige
 * 
 * @param expiresAt - Unix-Timestamp (Sekunden)
 * @returns Formatierter String (z.B. "23h 45min")
 */
export function formatRemainingTime(expiresAt: number): string {
  const remaining = getRemainingTime(expiresAt);
  
  if (remaining === 0) {
    return 'Abgelaufen';
  }
  
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  } else {
    return `${minutes}min`;
  }
}

/**
 * Prüft ob ein Angebot bald abläuft (< 1 Stunde)
 */
export function isExpiringSoon(expiresAt: number): boolean {
  const remaining = getRemainingTime(expiresAt);
  return remaining > 0 && remaining < 3600; // < 1 Stunde
}
