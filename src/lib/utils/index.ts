import type { InviteLinkData } from '$lib/nostr/types';

/**
 * Parse einen Einladungslink und extrahiere Relay und Secret
 */
export function parseInviteLink(url: string): InviteLinkData | null {
  try {
    const urlObj = new URL(url);
    const relay = urlObj.searchParams.get('relay');
    const secret = urlObj.searchParams.get('secret');

    if (!relay || !secret) {
      return null;
    }

    // Dekodiere URL-encoded Werte
    const decodedRelay = decodeURIComponent(relay);
    const decodedSecret = decodeURIComponent(secret);

    return {
      relay: decodedRelay,
      secret: decodedSecret
    };
  } catch (error) {
    console.error('Fehler beim Parsen des Einladungslinks:', error);
    return null;
  }
}

/**
 * Erstelle einen Einladungslink
 * 
 * @param domain - Die Domain (z.B. https://example.com)
 * @param secret - Das Gruppen-Secret
 * @param relay - (Optional) Relay-URL oder Relay-Alias-Nummer
 * @returns Einladungslink im Format ?secret=... oder ?r=1&secret=...
 */
export function createInviteLink(domain: string, secret: string, relay?: string | number): string {
  const encodedSecret = encodeURIComponent(secret);
  
  // Kein Relay → Multi-Relay-Fallback (empfohlen)
  if (relay === undefined || relay === null) {
    return `${domain}/?secret=${encodedSecret}`;
  }
  
  // Relay-Alias (Nummer)
  if (typeof relay === 'number') {
    return `${domain}/?r=${relay}&secret=${encodedSecret}`;
  }
  
  // Legacy: vollständige Relay-URL (für Abwärtskompatibilität)
  const encodedRelay = encodeURIComponent(relay);
  return `${domain}/?relay=${encodedRelay}&secret=${encodedSecret}`;
}

/**
 * Formatiere Timestamp zu lesbarem Datum
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'gerade eben';
  } else if (minutes < 60) {
    return `vor ${minutes} Min.`;
  } else if (hours < 24) {
    return `vor ${hours} Std.`;
  } else if (days < 7) {
    return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  } else {
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

/**
 * Kürze einen Public Key für die Anzeige
 */
export function truncatePubkey(pubkey: string, length: number = 8): string {
  if (pubkey.length <= length * 2) {
    return pubkey;
  }
  return `${pubkey.slice(0, length)}...${pubkey.slice(-length)}`;
}

/**
 * Generiere eine zufällige ID
 */
export function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Debounce function - limit rate of function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Extract error message from unknown error type
 * Safely handles Error objects, strings, and unknown types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Unbekannter Fehler';
}

/**
 * Validiere ob ein String eine gültige URL ist
 */
export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Extrahiere Domain aus URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (_) {
    return url;
  }
}

/**
 * ============================================
 * Marketplace: Time Utils
 * ============================================
 */

/**
 * Berechne verbleibende Zeit bis zum Ablauf
 * 
 * @param expiresAt - Unix Timestamp (Sekunden) wann das Angebot abläuft
 * @returns Formatierter String (z.B. "Noch 2 Tage", "Noch 5h", "Abgelaufen")
 */
export function getTimeRemaining(expiresAt: number): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = expiresAt - now;
  
  if (remaining <= 0) {
    return 'Abgelaufen';
  }
  
  const minutes = Math.floor(remaining / 60);
  const hours = Math.floor(remaining / 3600);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `Noch ${days} Tag${days > 1 ? 'e' : ''}`;
  } else if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `Noch ${hours}h ${remainingMinutes}m`;
  } else {
    return `Noch ${minutes}m`;
  }
}

/**
 * Prüfe ob ein Angebot bald abläuft (< 24h)
 * 
 * @param expiresAt - Unix Timestamp (Sekunden)
 * @returns true wenn < 24h verbleibend
 */
export function isExpiringSoon(expiresAt: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const remaining = expiresAt - now;
  const hoursRemaining = remaining / 3600;
  
  return hoursRemaining > 0 && hoursRemaining < 24;
}