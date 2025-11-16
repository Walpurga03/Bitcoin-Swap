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
    // Prüfe ob es ein "invalid MAC" Fehler ist (Nachricht nicht für uns)
    if (error instanceof Error && error.message === 'invalid MAC') {
      // Durchreichen ohne zusätzliches Logging (wird in decryptNIP17Message behandelt)
      throw error;
    }
    
    // Andere Fehler loggen
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
 * NIP-17 Gift-Wrapped Messages (KORREKTE IMPLEMENTATION)
 * ============================================
 * 
 * NIP-17 3-Schichten-Modell für maximale Anonymität:
 * 
 * Schicht 1: Kind 14 (Chat Message) - Klartext mit Sender/Empfänger
 * Schicht 2: Kind 13 (Seal) - Kind 14 verschlüsselt + signiert
 * Schicht 3: Kind 1059 (Gift Wrap) - Kind 13 verschlüsselt mit Random-Key
 * 
 * Relay sieht nur: Random-Pubkey → Empfänger (keine Sender-Info!)
 */

/**
 * Generiere zufälligen Zeitstempel (bis zu 2 Tage in der Vergangenheit)
 * Verhindert Timing-Analyse
 */
function randomPastTimestamp(): number {
  const now = Math.floor(Date.now() / 1000);
  const twoDays = 2 * 24 * 60 * 60;
  const randomOffset = Math.floor(Math.random() * twoDays);
  return now - randomOffset;
}

/**
 * Erstelle NIP-17 Gift-Wrapped Message (3-Schichten)
 * 
 * @param messageContent - Nachrichtentext
 * @param recipientPublicKey - Empfänger Pubkey
 * @param senderPrivateKey - Sender Private Key
 * @param roomId - Optional: Room-ID für Gruppierung
 */
export async function createNIP17Message(
  messageContent: string,
  recipientPublicKey: string,
  senderPrivateKey: string,
  roomId?: string
): Promise<{
  sealEvent: any;
  giftWrapEvent: any;
}> {
  try {
    const { finalizeEvent, getPublicKey } = await import('nostr-tools');
    
    logger.debug('🎁 [NIP-17] Erstelle Gift-Wrapped Message (3-Schichten)...');
    
    const senderPubkey = getPublicKey(senderPrivateKey as any);
    
    // ==========================================
    // SCHICHT 1: Kind 14 (Chat Message - UNSIGNED!)
    // ==========================================
    const chatMessage = {
      kind: 14,
      created_at: randomPastTimestamp(),
      tags: [
        ['p', recipientPublicKey],
        ...(roomId ? [['subject', roomId]] : [])
      ],
      content: messageContent,
      pubkey: senderPubkey
    };
    
    logger.debug('📝 Schicht 1: Chat Message (Kind 14) erstellt');
    
    // ==========================================
    // SCHICHT 2: Kind 13 (Seal)
    // ==========================================
    // Verschlüssele Chat Message mit NIP-44 (Sender → Empfänger)
    const chatMessageString = JSON.stringify(chatMessage);
    const encryptedChatMessage = nip44Encrypt(
      chatMessageString,
      senderPrivateKey,
      recipientPublicKey
    );
    
    const sealEvent = {
      kind: 13,
      created_at: randomPastTimestamp(),
      tags: [], // KEINE Tags! (verhindert Metadata-Leak)
      content: encryptedChatMessage,
      pubkey: senderPubkey
    };
    
    const signedSeal = finalizeEvent(sealEvent, senderPrivateKey as any);
    
    logger.debug('🔒 Schicht 2: Seal (Kind 13) erstellt + signiert');
    
    // ==========================================
    // SCHICHT 3: Kind 1059 (Gift Wrap)
    // ==========================================
    // Generiere RANDOM Key (Einweg-Schlüssel!)
    const randomPrivateKey = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
    const randomPublicKey = getPublicKey(randomPrivateKey as any);
    
    // Verschlüssele Seal mit NIP-44 (Random → Empfänger)
    const sealString = JSON.stringify(signedSeal);
    const encryptedSeal = nip44Encrypt(
      sealString,
      randomPrivateKey,
      recipientPublicKey
    );
    
    const giftWrapEvent = {
      kind: 1059,
      created_at: randomPastTimestamp(),
      tags: [['p', recipientPublicKey]], // NUR Empfänger-Tag!
      content: encryptedSeal,
      pubkey: randomPublicKey // ⚠️ RANDOM Pubkey (nicht Sender!)
    };
    
    const signedGiftWrap = finalizeEvent(giftWrapEvent, randomPrivateKey as any);
    
    logger.debug('🎁 Schicht 3: Gift Wrap (Kind 1059) erstellt');
    logger.debug('   → Random Pubkey:', randomPublicKey.substring(0, 16) + '...');
    logger.debug('   → Empfänger:', recipientPublicKey.substring(0, 16) + '...');
    logger.debug('✅ NIP-17 Message bereit (3-Schichten verschlüsselt)');
    
    return {
      sealEvent: signedSeal,
      giftWrapEvent: signedGiftWrap
    };
  } catch (error) {
    logger.error('❌ [NIP-17] Fehler beim Erstellen:', error);
    throw error;
  }
}

/**
 * Entschlüssele NIP-17 Gift-Wrapped Message (3-Schichten)
 * 
 * @param giftWrapEvent - Kind 1059 Event vom Relay
 * @param recipientPrivateKey - Empfänger Private Key
 */
export async function decryptNIP17Message(
  giftWrapEvent: any,
  recipientPrivateKey: string
): Promise<{
  content: string;
  senderPubkey: string;
  createdAt: number;
  roomId?: string;
}> {
  try {
    logger.debug('🎁 [NIP-17] Entschlüssele Gift-Wrapped Message (3-Schichten)...');
    
    // ==========================================
    // SCHICHT 3: Kind 1059 (Gift Wrap) entschlüsseln
    // ==========================================
    logger.debug('🔓 Schritt 1: Entschlüssele Gift Wrap (Kind 1059)...');
    
    // Gift Wrap verwendet Random-Key → Empfänger-Key
    const sealString = nip44Decrypt(
      giftWrapEvent.content,
      recipientPrivateKey,
      giftWrapEvent.pubkey // Random Pubkey vom Wrapper
    );
    
    const sealEvent = JSON.parse(sealString);
    
    logger.debug('✅ Gift Wrap entschlüsselt → Seal Event (Kind 13)');
    
    // ==========================================
    // SCHICHT 2: Kind 13 (Seal) entschlüsseln
    // ==========================================
    logger.debug('🔓 Schritt 2: Entschlüssele Seal (Kind 13)...');
    
    // Seal verwendet Sender-Key → Empfänger-Key
    const chatMessageString = nip44Decrypt(
      sealEvent.content,
      recipientPrivateKey,
      sealEvent.pubkey // Echter Sender Pubkey
    );
    
    const chatMessage = JSON.parse(chatMessageString);
    
    logger.debug('✅ Seal entschlüsselt → Chat Message (Kind 14)');
    
    // ==========================================
    // SCHICHT 1: Kind 14 (Chat Message) auslesen
    // ==========================================
    logger.debug('📨 Nachricht von:', chatMessage.pubkey.substring(0, 16) + '...');
    
    // Extrahiere Room-ID falls vorhanden
    const subjectTag = chatMessage.tags?.find((tag: string[]) => tag[0] === 'subject');
    const roomId = subjectTag ? subjectTag[1] : undefined;
    
    logger.debug('✅ NIP-17 Message komplett entschlüsselt');
    
    return {
      content: chatMessage.content,
      senderPubkey: chatMessage.pubkey,
      createdAt: chatMessage.created_at,
      roomId
    };
  } catch (error) {
    // Wenn "invalid MAC", dann ist die Nachricht nicht für uns → stiller Fehler
    if (error instanceof Error && error.message === 'invalid MAC') {
      logger.debug('🔇 [NIP-17] Gift Wrap nicht für diesen User (invalid MAC - überspringe)');
      throw new Error('NOT_FOR_THIS_USER');
    }
    
    logger.error('❌ [NIP-17] Fehler beim Entschlüsseln:', error);
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