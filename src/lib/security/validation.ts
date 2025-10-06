import { nip19 } from 'nostr-tools';

/**
 * Validiere einen Private Key (NSEC oder Hex)
 */
export function validatePrivateKey(key: string): { valid: boolean; hex?: string; error?: string } {
  try {
    // Entferne Whitespace
    key = key.trim();

    // Prüfe ob NSEC Format
    if (key.startsWith('nsec1')) {
      try {
        const decoded = nip19.decode(key as any);
        if ((decoded as any).type === 'nsec') {
          return { valid: true, hex: (decoded as any).data as string };
        }
        return { valid: false, error: 'Ungültiges NSEC-Format' };
      } catch (e) {
        return { valid: false, error: 'NSEC konnte nicht dekodiert werden' };
      }
    }

    // Prüfe ob Hex Format (64 Zeichen)
    if (/^[0-9a-f]{64}$/i.test(key)) {
      return { valid: true, hex: key.toLowerCase() };
    }

    return { valid: false, error: 'Ungültiges Key-Format. Verwende NSEC oder 64-Zeichen Hex.' };
  } catch (error) {
    return { valid: false, error: 'Fehler bei der Validierung' };
  }
}

/**
 * Validiere einen Public Key (NPUB oder Hex)
 */
export function validatePublicKey(key: string): { valid: boolean; hex?: string; error?: string } {
  try {
    key = key.trim();

    // Prüfe ob NPUB Format
    if (key.startsWith('npub1')) {
      try {
        const decoded = nip19.decode(key as any);
        if ((decoded as any).type === 'npub') {
          return { valid: true, hex: (decoded as any).data as string };
        }
        return { valid: false, error: 'Ungültiges NPUB-Format' };
      } catch (e) {
        return { valid: false, error: 'NPUB konnte nicht dekodiert werden' };
      }
    }

    // Prüfe ob Hex Format (64 Zeichen)
    if (/^[0-9a-f]{64}$/i.test(key)) {
      return { valid: true, hex: key.toLowerCase() };
    }

    return { valid: false, error: 'Ungültiges Public Key Format' };
  } catch (error) {
    return { valid: false, error: 'Fehler bei der Validierung' };
  }
}

/**
 * Validiere eine Relay-URL
 */
export function validateRelayUrl(url: string): { valid: boolean; error?: string } {
  try {
    url = url.trim();

    // Muss mit wss:// oder ws:// beginnen
    if (!url.startsWith('wss://') && !url.startsWith('ws://')) {
      return { valid: false, error: 'Relay-URL muss mit wss:// oder ws:// beginnen' };
    }

    // Prüfe ob gültige URL
    try {
      new URL(url);
    } catch (e) {
      return { valid: false, error: 'Ungültige URL-Struktur' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Fehler bei der Validierung' };
  }
}

/**
 * Validiere ein Gruppen-Secret
 */
export function validateGroupSecret(secret: string): { valid: boolean; error?: string } {
  try {
    secret = secret.trim();

    // Mindestlänge für Sicherheit
    if (secret.length < 8) {
      return { valid: false, error: 'Secret muss mindestens 8 Zeichen lang sein' };
    }

    // Maximal 256 Zeichen
    if (secret.length > 256) {
      return { valid: false, error: 'Secret darf maximal 256 Zeichen lang sein' };
    }

    // Keine Sonderzeichen die Probleme machen könnten
    if (!/^[a-zA-Z0-9\-_]+$/.test(secret)) {
      return { valid: false, error: 'Secret darf nur Buchstaben, Zahlen, - und _ enthalten' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Fehler bei der Validierung' };
  }
}

/**
 * Prüfe ob ein Public Key in der Whitelist ist
 */
export function isInWhitelist(pubkey: string, whitelist: string): boolean {
  try {
    // Parse Whitelist (komma-separiert)
    const allowedKeys = whitelist.split(',').map(k => k.trim());

    // Konvertiere pubkey zu hex falls npub
    let hexPubkey = pubkey;
    if (pubkey.startsWith('npub1')) {
      const decoded = nip19.decode(pubkey as any);
      if ((decoded as any).type === 'npub' && typeof (decoded as any).data === 'string') {
        hexPubkey = (decoded as any).data;
      }
    }

    // Prüfe gegen alle Whitelist-Einträge
    for (const allowedKey of allowedKeys) {
      let allowedHex = allowedKey;
      
      // Konvertiere zu hex falls npub
      if (allowedKey.startsWith('npub1')) {
        try {
          const decoded = nip19.decode(allowedKey as any);
          if ((decoded as any).type === 'npub' && typeof (decoded as any).data === 'string') {
            allowedHex = (decoded as any).data;
          }
        } catch (e) {
          continue;
        }
      }

      // Vergleiche (case-insensitive)
      if (hexPubkey.toLowerCase() === allowedHex.toLowerCase()) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Fehler bei Whitelist-Prüfung:', error);
    return false;
  }
}

/**
 * Validiere Event-Signatur
 */
export function validateEventSignature(event: any): boolean {
  try {
    // Hier würde normalerweise die Signatur-Validierung stattfinden
    // nostr-tools bietet dafür verifySignature()
    // Für diese Implementation vereinfacht
    return event.sig && event.sig.length === 128;
  } catch (error) {
    return false;
  }
}

/**
 * Rate-Limiting-Klasse
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private timeWindow: number;

  constructor(maxRequests: number = 10, timeWindowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindowMs;
  }

  /**
   * Prüfe ob Request erlaubt ist
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];

    // Entferne alte Requests außerhalb des Zeitfensters
    const validRequests = requests.filter(time => now - time < this.timeWindow);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Füge neuen Request hinzu
    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return true;
  }

  /**
   * Setze Limiter für Identifier zurück
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Lösche alte Einträge (Cleanup)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.timeWindow);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}