// Utility-Funktionen für das Bitcoin-Tausch-Netzwerk

import type { Currency, PaymentMethod, ValidationResult } from '../nostr/types';

/**
 * Formatiert einen Betrag basierend auf der Währung
 */
export function formatAmount(amount: number, currency: Currency): string {
  const formatter = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: currency === 'BTC' ? 8 : 2,
    maximumFractionDigits: currency === 'BTC' ? 8 : 2
  });
  
  return formatter.format(amount);
}

/**
 * Formatiert einen Zeitstempel in ein lesbares Datum
 */
export function formatTime(timestamp: number, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Date(timestamp * 1000).toLocaleString('de-DE', {
    ...defaultOptions,
    ...options
  });
}

/**
 * Formatiert einen Zeitstempel relativ (z.B. "vor 5 Minuten")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - (timestamp * 1000);
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Minute${minutes !== 1 ? 'n' : ''}`;
  if (hours < 24) return `vor ${hours} Stunde${hours !== 1 ? 'n' : ''}`;
  if (days < 7) return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
  
  return formatTime(timestamp, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Kürzt einen Public Key für die Anzeige
 */
export function truncatePubkey(pubkey: string, length: number = 8): string {
  if (pubkey.length <= length * 2) return pubkey;
  return `${pubkey.substring(0, length)}...${pubkey.substring(pubkey.length - length)}`;
}

/**
 * Validiert einen Bitcoin-Betrag
 */
export function validateBitcoinAmount(amount: number): ValidationResult {
  const errors: string[] = [];
  
  if (amount <= 0) {
    errors.push('Betrag muss größer als 0 sein');
  }
  
  if (amount > 21000000) {
    errors.push('Betrag kann nicht größer als 21 Millionen BTC sein');
  }
  
  // Prüfe auf zu viele Dezimalstellen
  const decimals = amount.toString().split('.')[1];
  if (decimals && decimals.length > 8) {
    errors.push('Bitcoin-Beträge können maximal 8 Dezimalstellen haben');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validiert einen Fiat-Betrag
 */
export function validateFiatAmount(amount: number, currency: Currency): ValidationResult {
  const errors: string[] = [];
  
  if (amount <= 0) {
    errors.push('Betrag muss größer als 0 sein');
  }
  
  if (amount > 1000000) {
    errors.push('Betrag ist zu hoch');
  }
  
  // Prüfe auf zu viele Dezimalstellen
  const decimals = amount.toString().split('.')[1];
  if (decimals && decimals.length > 2) {
    errors.push('Fiat-Beträge können maximal 2 Dezimalstellen haben');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validiert einen Angebots-Titel
 */
export function validateOfferTitle(title: string): ValidationResult {
  const errors: string[] = [];
  
  if (!title.trim()) {
    errors.push('Titel ist erforderlich');
  }
  
  if (title.length < 3) {
    errors.push('Titel muss mindestens 3 Zeichen lang sein');
  }
  
  if (title.length > 100) {
    errors.push('Titel darf maximal 100 Zeichen lang sein');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Gibt das Icon für eine Zahlungsmethode zurück
 */
export function getPaymentMethodIcon(method: PaymentMethod): string {
  switch (method) {
    case 'rechnung': return '🧾';
    case 'bargeld': return '💵';
    case 'ueberweisung': return '🏦';
    default: return '💳';
  }
}

/**
 * Gibt das Label für eine Zahlungsmethode zurück
 */
export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'rechnung': return 'Rechnung';
    case 'bargeld': return 'Bargeld';
    case 'ueberweisung': return 'Überweisung';
    default: return method;
  }
}

/**
 * Gibt das Symbol für eine Währung zurück
 */
export function getCurrencySymbol(currency: Currency): string {
  switch (currency) {
    case 'BTC': return '₿';
    case 'EUR': return '€';
    case 'USD': return '$';
    case 'CHF': return 'CHF';
    default: return currency;
  }
}

/**
 * Debounce-Funktion für Performance-Optimierung
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle-Funktion für Performance-Optimierung
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Generiert eine zufällige ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}${randomPart}`;
}

/**
 * Prüft ob eine URL ein gültiger Relay ist
 */
export function isValidRelayUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'wss:' || parsed.protocol === 'ws:';
  } catch {
    return false;
  }
}

/**
 * Kopiert Text in die Zwischenablage
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback für ältere Browser
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    }
  } catch (error) {
    console.error('Fehler beim Kopieren:', error);
    return false;
  }
}

/**
 * Erstellt einen sicheren Einladungslink
 */
export function createInviteLink(relay: string, secret: string, baseUrl?: string): string {
  const base = baseUrl || window.location.origin;
  const params = new URLSearchParams({
    relay,
    secret
  });
  
  return `${base}?${params.toString()}`;
}

/**
 * Parst einen Einladungslink
 */
export function parseInviteLink(url: string): { relay?: string; secret?: string } | null {
  try {
    const parsed = new URL(url);
    const relay = parsed.searchParams.get('relay');
    const secret = parsed.searchParams.get('secret');
    
    if (relay && secret) {
      return { relay, secret };
    }
    
    return null;
  } catch {
    return null;
  }
}