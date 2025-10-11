import { getPublicKey, nip44, nip19 } from 'nostr-tools';

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
    console.error('NIP-44 Verschlüsselung fehlgeschlagen:', error);
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
    console.error('NIP-44 Entschlüsselung fehlgeschlagen:', error);
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
    console.error('Gruppen-Verschlüsselung fehlgeschlagen:', error);
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