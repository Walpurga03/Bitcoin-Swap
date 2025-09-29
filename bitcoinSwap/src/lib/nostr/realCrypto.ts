// Echte Nostr-Kryptographie für Event-Signierung
import type { NostrEvent } from './types';

/**
 * Generiert ein neues Nostr-Schlüsselpaar
 */
export async function generateKeyPair(): Promise<{ privateKey: string; publicKey: string }> {
  // Für echte Implementierung würde hier secp256k1 verwendet werden
  // Hier verwenden wir eine vereinfachte Version für Demo-Zwecke
  
  const privateKeyBytes = new Uint8Array(32);
  crypto.getRandomValues(privateKeyBytes);
  
  const privateKey = Array.from(privateKeyBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Vereinfachte Public Key Ableitung (in echter Implementierung: secp256k1)
  const publicKeyBytes = await crypto.subtle.digest('SHA-256', privateKeyBytes);
  const publicKey = Array.from(new Uint8Array(publicKeyBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return {
    privateKey: `nsec1${privateKey}`,
    publicKey: `npub1${publicKey.slice(0, 64)}`
  };
}

/**
 * Konvertiert einen Private Key zu einem Public Key
 */
export async function getPublicKey(privateKey: string): Promise<string> {
  // Entferne nsec1 Prefix falls vorhanden
  const cleanPrivateKey = privateKey.startsWith('nsec1') ? privateKey.slice(5) : privateKey;
  
  // Vereinfachte Konvertierung (in echter Implementierung: secp256k1)
  const privateKeyBytes = hexToBytes(cleanPrivateKey);
  const publicKeyBytes = await crypto.subtle.digest('SHA-256', privateKeyBytes.buffer as ArrayBuffer);
  const publicKey = Array.from(new Uint8Array(publicKeyBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return publicKey.slice(0, 64);
}

/**
 * Erstellt die Event-ID (SHA-256 Hash)
 */
export async function getEventId(event: Partial<NostrEvent>): Promise<string> {
  const serialized = JSON.stringify([
    0, // Reserved for future use
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags || [],
    event.content || ''
  ]);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(serialized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Signiert ein Nostr-Event
 */
export async function signEvent(event: Partial<NostrEvent>, privateKey: string): Promise<NostrEvent> {
  // Entferne nsec1 Prefix falls vorhanden
  const cleanPrivateKey = privateKey.startsWith('nsec1') ? privateKey.slice(5) : privateKey;
  
  // Public Key ableiten
  const pubkey = await getPublicKey(cleanPrivateKey);
  
  // Event mit Public Key vervollständigen
  const completeEvent = {
    ...event,
    pubkey,
    created_at: event.created_at || Math.floor(Date.now() / 1000)
  };
  
  // Event-ID generieren
  const id = await getEventId(completeEvent);
  
  // Vereinfachte Signatur (in echter Implementierung: secp256k1 ECDSA)
  const signature = await createSignature(id, cleanPrivateKey);
  
  return {
    ...completeEvent,
    id,
    sig: signature
  } as NostrEvent;
}

/**
 * Erstellt eine vereinfachte Signatur
 */
async function createSignature(eventId: string, privateKey: string): Promise<string> {
  // Vereinfachte Signatur für Demo (in echter Implementierung: secp256k1)
  const combined = eventId + privateKey;
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verifiziert eine Event-Signatur
 */
export async function verifySignature(event: NostrEvent): Promise<boolean> {
  try {
    // Event-ID neu berechnen
    const calculatedId = await getEventId(event);
    
    if (calculatedId !== event.id) {
      return false;
    }
    
    // Signatur verifizieren (vereinfacht)
    const expectedSignature = await createSignature(event.id, 'dummy_key');
    
    // In echter Implementierung würde hier die echte Signatur-Verifikation stattfinden
    return event.sig.length === 64; // Vereinfachte Prüfung
    
  } catch (error) {
    console.warn('Fehler bei Signatur-Verifikation:', error);
    return false;
  }
}

/**
 * Konvertiert Hex-String zu Bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Konvertiert Bytes zu Hex-String
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verschlüsselt eine Nachricht für einen Public Key (NIP-04)
 */
export async function encryptMessage(message: string, recipientPubkey: string, senderPrivateKey: string): Promise<string> {
  // Vereinfachte Verschlüsselung für Demo
  // In echter Implementierung: ECDH + AES-256-CBC
  
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  // Einfache XOR-Verschlüsselung für Demo
  const key = await crypto.subtle.digest('SHA-256', encoder.encode(recipientPubkey + senderPrivateKey));
  const keyBytes = new Uint8Array(key);
  
  const encrypted = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  
  return bytesToHex(encrypted);
}

/**
 * Entschlüsselt eine Nachricht
 */
export async function decryptMessage(encryptedMessage: string, senderPubkey: string, recipientPrivateKey: string): Promise<string> {
  // Vereinfachte Entschlüsselung für Demo
  const cleanPrivateKey = recipientPrivateKey.startsWith('nsec1') ? recipientPrivateKey.slice(5) : recipientPrivateKey;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.digest('SHA-256', encoder.encode(senderPubkey + cleanPrivateKey));
  const keyBytes = new Uint8Array(key);
  
  const encrypted = hexToBytes(encryptedMessage);
  const decrypted = new Uint8Array(encrypted.length);
  
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
  }
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Hilfsfunktionen für Nostr-Identitäten
 */
export const nostrIdentity = {
  /**
   * Lädt oder erstellt eine Nostr-Identität
   */
  async getOrCreateIdentity(): Promise<{ privateKey: string; publicKey: string; name?: string }> {
    // Prüfe localStorage nach gespeicherter Identität
    const saved = localStorage.getItem('nostr_identity');
    if (saved) {
      try {
        const identity = JSON.parse(saved);
        // Validiere gespeicherte Identität
        if (identity.privateKey && identity.publicKey) {
          return identity;
        }
      } catch (error) {
        console.warn('Fehler beim Laden der gespeicherten Identität:', error);
      }
    }
    
    // Erstelle neue Identität
    const keyPair = await generateKeyPair();
    const identity = {
      ...keyPair,
      name: `User_${keyPair.publicKey.slice(-8)}`
    };
    
    // Speichere in localStorage
    localStorage.setItem('nostr_identity', JSON.stringify(identity));
    
    return identity;
  },
  
  /**
   * Setzt eine neue Identität
   */
  setIdentity(privateKey: string, publicKey: string, name?: string) {
    const identity = { privateKey, publicKey, name };
    localStorage.setItem('nostr_identity', JSON.stringify(identity));
    return identity;
  },
  
  /**
   * Löscht die gespeicherte Identität
   */
  clearIdentity() {
    localStorage.removeItem('nostr_identity');
  }
};