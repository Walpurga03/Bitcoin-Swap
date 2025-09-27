// Vereinfachte Verschlüsselungs-Utilities für Bitcoin-Angebote (Phase 2)

import { generateSecretKey, getPublicKey } from 'nostr-tools';

/**
 * Einfache Verschlüsselung mit AES-256-GCM
 */
export async function encryptData(
  plaintext: string,
  password: string
): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Passwort zu Schlüssel hashen
    const passwordBytes = encoder.encode(password);
    const keyHash = await crypto.subtle.digest('SHA-256', passwordBytes);
    
    // AES-Schlüssel importieren
    const key = await crypto.subtle.importKey(
      'raw',
      keyHash,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    // Zufällige IV generieren
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Verschlüsseln
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    // IV + verschlüsselte Daten kombinieren
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Base64 kodieren
    return btoa(String.fromCharCode(...combined));
    
  } catch (error) {
    console.error('Verschlüsselungsfehler:', error);
    throw new Error('Verschlüsselung fehlgeschlagen');
  }
}

/**
 * Einfache Entschlüsselung mit AES-256-GCM
 */
export async function decryptData(
  encryptedData: string,
  password: string
): Promise<string> {
  try {
    // Base64 dekodieren
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    // IV und verschlüsselte Daten trennen
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const encoder = new TextEncoder();
    
    // Passwort zu Schlüssel hashen
    const passwordBytes = encoder.encode(password);
    const keyHash = await crypto.subtle.digest('SHA-256', passwordBytes);
    
    // AES-Schlüssel importieren
    const key = await crypto.subtle.importKey(
      'raw',
      keyHash,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Entschlüsseln
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    // Text dekodieren
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
    
  } catch (error) {
    console.error('Entschlüsselungsfehler:', error);
    throw new Error('Entschlüsselung fehlgeschlagen');
  }
}

/**
 * Verschlüsselt Angebots-Daten für Nostr-Event
 */
export async function encryptOfferData(
  offerData: any,
  channelSecret: string
): Promise<string> {
  const plaintext = JSON.stringify(offerData);
  return await encryptData(plaintext, channelSecret);
}

/**
 * Entschlüsselt Angebots-Daten aus Nostr-Event
 */
export async function decryptOfferData(
  encryptedData: string,
  channelSecret: string
): Promise<any> {
  const plaintext = await decryptData(encryptedData, channelSecret);
  return JSON.parse(plaintext);
}

/**
 * Verschlüsselt Kontaktdaten für Interest-Events
 */
export async function encryptContactData(
  contactData: {
    method: string;
    data: string;
    message?: string;
  },
  password: string
): Promise<string> {
  const plaintext = JSON.stringify(contactData);
  return await encryptData(plaintext, password);
}

/**
 * Entschlüsselt Kontaktdaten aus Interest-Events
 */
export async function decryptContactData(
  encryptedData: string,
  password: string
): Promise<{
  method: string;
  data: string;
  message?: string;
}> {
  const plaintext = await decryptData(encryptedData, password);
  return JSON.parse(plaintext);
}

/**
 * Generiert einen sicheren Zufallsstring
 */
export function generateSecureRandom(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hasht Daten mit SHA-256
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Erstellt einen HMAC für Datenintegrität
 */
export async function createHMAC(
  data: string,
  secret: string
): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const secretBytes = encoder.encode(secret);
    const dataBytes = encoder.encode(data);
    
    // HMAC-Schlüssel importieren
    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // HMAC erstellen
    const signature = await crypto.subtle.sign('HMAC', key, dataBytes);
    const signatureArray = new Uint8Array(signature);
    
    return Array.from(signatureArray, byte => byte.toString(16).padStart(2, '0')).join('');
    
  } catch (error) {
    console.error('HMAC-Erstellung fehlgeschlagen:', error);
    throw new Error('HMAC-Erstellung fehlgeschlagen');
  }
}

/**
 * Verifiziert einen HMAC
 */
export async function verifyHMAC(
  data: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const expectedSignature = await createHMAC(data, secret);
    return expectedSignature === signature;
  } catch (error) {
    console.error('HMAC-Verifikation fehlgeschlagen:', error);
    return false;
  }
}

/**
 * Anonyme Schlüsselpaar-Verwaltung
 */
export interface AnonymousKeyPair {
  privateKey: string;
  publicKey: string;
  npub: string;
  createdAt: number;
  expiresAt: number;
  purpose: 'offer' | 'interest' | 'contact';
}

/**
 * Generiert ein anonymes Schlüsselpaar
 */
export function generateAnonymousKeyPair(purpose: 'offer' | 'interest' | 'contact'): AnonymousKeyPair {
  const privateKey = generateSecretKey();
  const publicKey = getPublicKey(privateKey);
  
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + (7 * 24 * 60 * 60); // 7 Tage
  
  return {
    privateKey: Array.from(privateKey, b => b.toString(16).padStart(2, '0')).join(''),
    publicKey,
    npub: `npub${publicKey.slice(0, 8)}...`, // Vereinfachte npub-Darstellung
    createdAt: now,
    expiresAt,
    purpose
  };
}

/**
 * Konvertiert Hex-String zu Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Konvertiert Uint8Array zu Hex-String
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Sichere Passwort-Validierung
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Passwort muss mindestens 8 Zeichen lang sein');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Passwort muss mindestens einen Großbuchstaben enthalten');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Passwort muss mindestens einen Kleinbuchstaben enthalten');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Passwort muss mindestens eine Zahl enthalten');
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Passwort muss mindestens ein Sonderzeichen enthalten');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generiert ein sicheres Passwort
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // Mindestens ein Zeichen aus jeder Kategorie
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Rest zufällig füllen
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Passwort mischen
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Zeitbasierte Schlüssel-Rotation
 */
export class KeyRotationManager {
  private keys: Map<string, AnonymousKeyPair> = new Map();
  private rotationInterval: number;
  
  constructor(rotationIntervalHours: number = 24) {
    this.rotationInterval = rotationIntervalHours * 60 * 60 * 1000;
  }
  
  /**
   * Erstellt oder rotiert einen Schlüssel
   */
  getOrCreateKey(purpose: 'offer' | 'interest' | 'contact'): AnonymousKeyPair {
    const existing = this.keys.get(purpose);
    const now = Date.now();
    
    if (existing && (existing.expiresAt * 1000) > now) {
      return existing;
    }
    
    // Neuen Schlüssel generieren
    const newKey = generateAnonymousKeyPair(purpose);
    this.keys.set(purpose, newKey);
    
    return newKey;
  }
  
  /**
   * Bereinigt abgelaufene Schlüssel
   */
  cleanupExpiredKeys(): void {
    const now = Date.now();
    
    for (const [purpose, key] of this.keys.entries()) {
      if ((key.expiresAt * 1000) <= now) {
        this.keys.delete(purpose);
        console.log(`Abgelaufener Schlüssel für ${purpose} entfernt`);
      }
    }
  }
  
  /**
   * Gibt alle aktiven Schlüssel zurück
   */
  getActiveKeys(): AnonymousKeyPair[] {
    this.cleanupExpiredKeys();
    return Array.from(this.keys.values());
  }
}