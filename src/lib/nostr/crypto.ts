import { getPublicKey, nip44, nip19 } from 'nostr-tools';
import { logger } from '$lib/utils/logger';

/**
 * Leite einen Channel-ID Hash vom Secret ab
 */
export async function deriveChannelId(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Leite einen Encryption Key vom Secret ab
 */
export async function deriveKeyFromSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verschlüssele Content mit NIP-44
 */
export function nip44Encrypt(content: string, privateKey: string, recipientPubkey: string): string {
  try {
    const conversationKey = nip44.v2.utils.getConversationKey(privateKey as any, recipientPubkey as any);
    const encrypted = nip44.v2.encrypt(content, conversationKey);
    return encrypted;
  } catch (error) {
    logger.error('NIP-44 Verschlüsselung fehlgeschlagen:', error);
    throw new Error('Verschlüsselung fehlgeschlagen');
  }
}

/**
 * Entschlüssele Content mit NIP-44
 */
export function nip44Decrypt(encrypted: string, privateKey: string, senderPubkey: string): string {
  try {
    const conversationKey = nip44.v2.utils.getConversationKey(privateKey as any, senderPubkey as any);
    const decrypted = nip44.v2.decrypt(encrypted, conversationKey);
    return decrypted;
  } catch (error) {
    logger.error('NIP-44 Entschlüsselung fehlgeschlagen:', error);
    throw new Error('Entschlüsselung fehlgeschlagen');
  }
}

/**
 * Verschlüssele Content für Gruppe (symmetrisch)
 */
export async function encryptForGroup(content: string, groupKey: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    
    // Importiere Key
    const keyData = hexToBytes(groupKey);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData as any,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    // Generiere IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Verschlüssele
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    );
    
    // Kombiniere IV + Encrypted
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return bytesToHex(combined);
  } catch (error) {
    logger.error('Gruppen-Verschlüsselung fehlgeschlagen:', error);
    throw new Error('Verschlüsselung fehlgeschlagen');
  }
}

/**
 * Entschlüssele Content für Gruppe (symmetrisch)
 */
export async function decryptForGroup(encrypted: string, groupKey: string): Promise<string> {
  try {
    const combined = hexToBytes(encrypted);
    
    // Validierung: Mindestens IV (12 bytes) + 1 byte Daten
    if (combined.length < 13) {
      throw new Error('Encrypted data too small');
    }
    
    // Extrahiere IV und Encrypted
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    // Importiere Key
    const keyData = hexToBytes(groupKey);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData as any,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Entschlüssele
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    // ⚠️ Silent fail - Event wurde mit anderem Secret verschlüsselt
    // Dies ist normal wenn alte Events im Relay existieren
    throw error; // Werfe Error weiter, aber ohne Console-Spam
  }
}

/**
 * Generiere ein temporäres Keypair
 */
export function generateTempKeypair(): { privateKey: string; publicKey: string } {
  const privateKey = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const publicKey = getPublicKey(privateKey as any);
  return { privateKey, publicKey };
}

/**
 * ============================================
 * Marketplace: Temp-Keypair Verwaltung
 * ============================================
 */

/**
 * Speichere temp_keypair nur im Speicher (kein localStorage mehr)
 */
// Kein localStorage mehr: temp_keypair wird nicht persistent gespeichert.

/**
 * Lade temp_keypair aus localStorage
 * Versucht Recovery aus encrypted backup falls plain fehlt
 */
// Kein localStorage mehr: temp_keypair kann nicht geladen werden. Muss neu generiert werden.

/**
 * Lösche temp_keypair aus localStorage
 */
// Kein localStorage mehr: temp_keypair wird nicht persistent gespeichert.

/**
 * Konvertiere Hex zu Bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Konvertiere Bytes zu Hex
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Konvertiere Private Key zu Public Key
 */
export function getPublicKeyFromPrivate(privateKey: string): string {
  return getPublicKey(privateKey as any);
}

/**
 * Konvertiere Public Key zu npub
 */
export function pubkeyToNpub(pubkey: string): string {
  return nip19.npubEncode(pubkey);
}

/**
 * Konvertiere Private Key zu nsec
 */
export function privkeyToNsec(privkey: string): string {
  return nip19.nsecEncode(privkey as any);
}

/**
 * ============================================
 * NIP-17: Gift-Wrapped Messages für D2D Chat
 * ============================================
 */

/**
 * Entschlüssele mit NIP-44 (für NIP-17 Wrapper)
 */
export function nip44DecryptWithConversationKey(
  encrypted: string,
  conversationKey: Uint8Array
): string {
  try {
    const decrypted = nip44.v2.decrypt(encrypted, conversationKey);
    return decrypted;
  } catch (error) {
    logger.error(' NIP-44 Entschlüsselung fehlgeschlagen:', error);
    throw new Error('NIP-44 Entschlüsselung fehlgeschlagen');
  }
}

/**
 * Generiere Conversation Key für NIP-17 (asymmetrisch)
 * Wird verwendet für: Sender → Recipient
 */
export function getConversationKey(
  senderPrivateKey: string,
  recipientPublicKey: string
): Uint8Array {
  try {
    const conversationKey = nip44.v2.utils.getConversationKey(
      senderPrivateKey as any,
      recipientPublicKey as any
    );
    return conversationKey;
  } catch (error) {
    logger.error(' Conversation Key Generierung fehlgeschlagen:', error);
    throw new Error('Conversation Key konnte nicht generiert werden');
  }
}

/**
 * ============================================
 * Metadaten-Verschlüsselung (für Pubkeys)
 * ============================================
 */

export interface EncryptedMetadata {
  content: string; // encrypted JSON
  iv: string;     // IV in hex
}

/**
 * Verschlüssele strukturierte Metadaten mit groupKey
 * Wird verwendet für: Pubkeys, Offer-Inhalte etc.
 */
export async function encryptMetadata(
  metadata: Record<string, any>,
  groupKey: string
): Promise<EncryptedMetadata> {
  try {
    const jsonString = JSON.stringify(metadata);
    const encrypted = await encryptForGroup(jsonString, groupKey);
    
    // Extrahiere IV (erste 12 bytes = 24 hex chars)
    const iv = encrypted.substring(0, 24);
    const content = encrypted;
    
    return { content, iv };
  } catch (error) {
    logger.error(' Metadaten-Verschlüsselung fehlgeschlagen:', error);
    throw error;
  }
}

/**
 * Entschlüssele strukturierte Metadaten mit groupKey
 */
export async function decryptMetadata(
  encryptedData: EncryptedMetadata | string,
  groupKey: string
): Promise<Record<string, any>> {
  try {
    // Fallback: wenn nur String übergeben
    const encrypted = typeof encryptedData === 'string' ? encryptedData : encryptedData.content;
    
    const decrypted = await decryptForGroup(encrypted, groupKey);
    return JSON.parse(decrypted);
  } catch (error) {
    logger.error(' Metadaten-Entschlüsselung fehlgeschlagen:', error);
    throw error;
  }
}

/**
 * ============================================
 * NIP-17 Gift-Wrapped Messages
 * ============================================
 * 
 * NIP-17 ist der Standard für D2D (1:1) verschlüsselte Nachrichten
 * 
 * Format:
 * 1. Innere Nachricht: Kind 14 (verschlüsselt mit NIP-44)
 * 2. Äußere Nachricht: Kind 1059 (Gift-Wrapped)
 * 3. Nur Recipient kann äußeres Event entschlüsseln
 */

export async function createNIP17Message(
  messageContent: string,
  recipientPublicKey: string,
  senderPrivateKey: string
): Promise<{
  innerEvent: any;
  wrappedEvent: any;
}> {
  try {
    const { finalizeEvent, getPublicKey } = await import('nostr-tools');
    
    logger.debug('🎁 [NIP-17] Erstelle Gift-Wrapped Message...');
    
    // 1. Generiere temporären Key für den Wrapper
    const tempKey = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
    const tempPubkey = getPublicKey(tempKey as any);
    
    // 2. Erstelle inneres Event (Kind 14 - Sealed Direct Message)
    const senderPubkey = getPublicKey(senderPrivateKey as any);
    const now = Math.floor(Date.now() / 1000);
    
    const innerEvent = {
      kind: 14,
      created_at: now,
      tags: [['p', recipientPublicKey]],

      content: messageContent,
      pubkey: senderPubkey
    };
    
    const signedInnerEvent = finalizeEvent(innerEvent, senderPrivateKey as any);
    
    logger.debug('✅ Inneres Event erstellt (Kind 14)');
    
    // 3. Verschlüssele inneres Event mit NIP-44
    const conversationKey = getConversationKey(tempKey, recipientPublicKey);
    const innerEventString = JSON.stringify(signedInnerEvent);
    const encryptedInner = nip44.v2.encrypt(innerEventString, conversationKey);
    
    logger.debug('🔐 Inneres Event verschlüsselt');
    
    // 4. Erstelle äußeres Event (Kind 1059 - Gift Wrap)
    const outerEvent = {
      kind: 1059,
      created_at: now + 1,
      tags: [['p', recipientPublicKey]],
      content: encryptedInner,
      pubkey: tempPubkey
    };
    
    const signedOuterEvent = finalizeEvent(outerEvent, tempKey as any);
    
    logger.debug('✅ Äußeres Event erstellt (Kind 1059 - Gift Wrap)');
    logger.debug('📦 NIP-17 Message bereit zum Versenden');
    
    return {
      innerEvent: signedInnerEvent,
      wrappedEvent: signedOuterEvent
    };
  } catch (error) {
    logger.error(' [NIP-17] Fehler beim Erstellen:', error);
    throw error;
  }
}

/**
 * Entschlüssele NIP-17 Gift-Wrapped Message
 * Nur der Recipient kann diese entschlüsseln
 */
export async function decryptNIP17Message(
  wrappedEvent: any,
  recipientPrivateKey: string
): Promise<{
  content: string;
  senderPubkey: string;
  createdAt: number;
}> {
  try {
    logger.debug('🎁 [NIP-17] Entschlüssele Gift-Wrapped Message...');
    
    // 1. Entschlüssele mit NIP-44 (wrapped event content)
    const conversationKey = getConversationKey(recipientPrivateKey, wrappedEvent.pubkey);
    const decryptedInnerString = nip44DecryptWithConversationKey(
      wrappedEvent.content,
      conversationKey
    );
    
    logger.debug('✅ Äußeres Event entschlüsselt');
    
    // 2. Parse inneres Event
    const innerEvent = JSON.parse(decryptedInnerString);
    
    logger.debug('✅ Inneres Event geparst');
    logger.debug('📨 Nachricht von:', innerEvent.pubkey.substring(0, 16) + '...');
    
    return {
      content: innerEvent.content,
      senderPubkey: innerEvent.pubkey,
      createdAt: innerEvent.created_at
    };
  } catch (error) {
    logger.error(' [NIP-17] Fehler beim Entschlüsseln:', error);
    throw error;
  }
}

/**
 * ============================================
 * Signatur-Validierung
 * ============================================
 */

export function verifyEventSignature(event: any): boolean {
  try {
    const { verifySignature } = require('nostr-tools');
    return verifySignature(event);
  } catch (error) {
    logger.error(' Signatur-Validierung fehlgeschlagen:', error);
    return false;
  }
}