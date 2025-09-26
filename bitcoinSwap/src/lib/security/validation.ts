// Sicherheitsvalidierung und Input-Sanitization

import type { ValidationResult, PaymentMethod, Currency } from '../nostr/types';

/**
 * Sanitisiert HTML-Input um XSS zu verhindern
 */
export function sanitizeHtml(input: string): string {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Validiert und sanitisiert Benutzereingaben
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Entferne gefährliche Zeichen
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Script-Tags entfernen
    .replace(/javascript:/gi, '') // JavaScript-URLs entfernen
    .replace(/on\w+\s*=/gi, '') // Event-Handler entfernen
    .trim();
  
  // Länge begrenzen
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Validiert einen Private Key (Hex oder nsec Format)
 */
export function validatePrivateKey(privkey: string): ValidationResult {
  const errors: string[] = [];
  
  if (!privkey) {
    errors.push('Private Key ist erforderlich');
    return { isValid: false, errors };
  }
  
  // Entferne Whitespace
  const cleanKey = privkey.trim();
  
  // Prüfe nsec Format
  if (cleanKey.startsWith('nsec1')) {
    if (cleanKey.length !== 63) {
      errors.push('Ungültiges nsec Format (muss 63 Zeichen lang sein)');
    }
  }
  // Prüfe Hex Format
  else if (/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
    // Gültiger 64-Zeichen Hex String
  }
  else {
    errors.push('Private Key muss im Hex (64 Zeichen) oder nsec Format sein');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validiert einen Public Key (Hex oder npub Format)
 */
export function validatePublicKey(pubkey: string): ValidationResult {
  const errors: string[] = [];
  
  if (!pubkey) {
    errors.push('Public Key ist erforderlich');
    return { isValid: false, errors };
  }
  
  const cleanKey = pubkey.trim();
  
  // Prüfe npub Format
  if (cleanKey.startsWith('npub1')) {
    if (cleanKey.length !== 63) {
      errors.push('Ungültiges npub Format (muss 63 Zeichen lang sein)');
    }
  }
  // Prüfe Hex Format
  else if (/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
    // Gültiger 64-Zeichen Hex String
  }
  else {
    errors.push('Public Key muss im Hex (64 Zeichen) oder npub Format sein');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validiert eine Relay-URL
 */
export function validateRelayUrl(url: string): ValidationResult {
  const errors: string[] = [];
  
  if (!url) {
    errors.push('Relay-URL ist erforderlich');
    return { isValid: false, errors };
  }
  
  try {
    const parsed = new URL(url.trim());
    
    if (!['ws:', 'wss:'].includes(parsed.protocol)) {
      errors.push('Relay-URL muss mit ws:// oder wss:// beginnen');
    }
    
    if (!parsed.hostname) {
      errors.push('Ungültige Hostname in Relay-URL');
    }
    
    // Prüfe auf verdächtige URLs
    const suspiciousPatterns = [
      /localhost/i,
      /127\.0\.0\.1/,
      /192\.168\./,
      /10\./,
      /172\.(1[6-9]|2[0-9]|3[0-1])\./
    ];
    
    const isSuspicious = suspiciousPatterns.some(pattern => 
      pattern.test(parsed.hostname)
    );
    
    if (isSuspicious && !import.meta.env.DEV) {
      errors.push('Lokale Relay-URLs sind in der Produktion nicht erlaubt');
    }
    
  } catch (error) {
    errors.push('Ungültige URL-Format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validiert ein Gruppen-Secret
 */
export function validateGroupSecret(secret: string): ValidationResult {
  const errors: string[] = [];
  
  if (!secret) {
    errors.push('Gruppen-Secret ist erforderlich');
    return { isValid: false, errors };
  }
  
  const cleanSecret = secret.trim();
  
  if (cleanSecret.length < 8) {
    errors.push('Gruppen-Secret muss mindestens 8 Zeichen lang sein');
  }
  
  if (cleanSecret.length > 128) {
    errors.push('Gruppen-Secret darf maximal 128 Zeichen lang sein');
  }
  
  // Prüfe auf schwache Secrets
  const weakPatterns = [
    /^123+$/,
    /^password$/i,
    /^test$/i,
    /^admin$/i,
    /^secret$/i
  ];
  
  const isWeak = weakPatterns.some(pattern => pattern.test(cleanSecret));
  
  if (isWeak) {
    errors.push('Das Secret ist zu schwach. Verwenden Sie ein sichereres Secret.');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validiert Angebotsdaten
 */
export function validateOfferData(data: {
  title: string;
  description: string;
  amount: number;
  currency: Currency;
  paymentMethods: PaymentMethod[];
}): ValidationResult {
  const errors: string[] = [];
  
  // Titel validieren
  const titleValidation = validateOfferTitle(data.title);
  if (!titleValidation.isValid) {
    errors.push(...titleValidation.errors);
  }
  
  // Beschreibung validieren
  if (data.description && data.description.length > 500) {
    errors.push('Beschreibung darf maximal 500 Zeichen lang sein');
  }
  
  // Betrag validieren
  if (data.currency === 'BTC') {
    const amountValidation = validateBitcoinAmount(data.amount);
    if (!amountValidation.isValid) {
      errors.push(...amountValidation.errors);
    }
  } else {
    const amountValidation = validateFiatAmount(data.amount, data.currency);
    if (!amountValidation.isValid) {
      errors.push(...amountValidation.errors);
    }
  }
  
  // Zahlungsmethoden validieren
  if (!data.paymentMethods || data.paymentMethods.length === 0) {
    errors.push('Mindestens eine Zahlungsmethode muss ausgewählt werden');
  }
  
  if (data.paymentMethods.length > 3) {
    errors.push('Maximal 3 Zahlungsmethoden können ausgewählt werden');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validiert einen Angebots-Titel
 */
function validateOfferTitle(title: string): ValidationResult {
  const errors: string[] = [];
  
  if (!title || !title.trim()) {
    errors.push('Titel ist erforderlich');
    return { isValid: false, errors };
  }
  
  const cleanTitle = sanitizeInput(title.trim(), 100);
  
  if (cleanTitle.length < 3) {
    errors.push('Titel muss mindestens 3 Zeichen lang sein');
  }
  
  if (cleanTitle.length > 100) {
    errors.push('Titel darf maximal 100 Zeichen lang sein');
  }
  
  // Prüfe auf Spam-Indikatoren
  const spamPatterns = [
    /(.)\1{10,}/, // Wiederholte Zeichen
    /[A-Z]{20,}/, // Zu viele Großbuchstaben
    /(FREE|CLICK|BUY NOW|URGENT)/gi // Spam-Wörter
  ];
  
  const isSpam = spamPatterns.some(pattern => pattern.test(cleanTitle));
  
  if (isSpam) {
    errors.push('Titel enthält verdächtige Inhalte');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validiert Bitcoin-Betrag
 */
function validateBitcoinAmount(amount: number): ValidationResult {
  const errors: string[] = [];
  
  if (typeof amount !== 'number' || isNaN(amount)) {
    errors.push('Ungültiger Betrag');
    return { isValid: false, errors };
  }
  
  if (amount <= 0) {
    errors.push('Betrag muss größer als 0 sein');
  }
  
  if (amount > 21000000) {
    errors.push('Betrag kann nicht größer als 21 Millionen BTC sein');
  }
  
  // Prüfe Satoshi-Genauigkeit (8 Dezimalstellen)
  const satoshis = Math.round(amount * 100000000);
  if (satoshis !== amount * 100000000) {
    errors.push('Bitcoin-Beträge können maximal 8 Dezimalstellen haben');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validiert Fiat-Betrag
 */
function validateFiatAmount(amount: number, currency: Currency): ValidationResult {
  const errors: string[] = [];
  
  if (typeof amount !== 'number' || isNaN(amount)) {
    errors.push('Ungültiger Betrag');
    return { isValid: false, errors };
  }
  
  if (amount <= 0) {
    errors.push('Betrag muss größer als 0 sein');
  }
  
  // Währungsspezifische Limits
  const limits = {
    EUR: 100000,
    USD: 100000,
    CHF: 100000,
    BTC: 21000000
  };
  
  const maxAmount = limits[currency] || 100000;
  
  if (amount > maxAmount) {
    errors.push(`Betrag darf nicht größer als ${maxAmount} ${currency} sein`);
  }
  
  // Prüfe Dezimalstellen
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
 * Rate Limiting für API-Aufrufe
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
   * Prüft ob eine Anfrage erlaubt ist
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Entferne alte Anfragen außerhalb des Zeitfensters
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.timeWindow
    );
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Füge neue Anfrage hinzu
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
  
  /**
   * Gibt die verbleibende Zeit bis zur nächsten erlaubten Anfrage zurück
   */
  getRetryAfter(identifier: string): number {
    const userRequests = this.requests.get(identifier) || [];
    if (userRequests.length === 0) return 0;
    
    const oldestRequest = Math.min(...userRequests);
    const retryAfter = this.timeWindow - (Date.now() - oldestRequest);
    
    return Math.max(0, retryAfter);
  }
}