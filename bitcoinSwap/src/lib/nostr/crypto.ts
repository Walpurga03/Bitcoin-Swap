// Verschlüsselungs- und Kryptografie-Funktionen

/**
 * Leitet einen Verschlüsselungsschlüssel aus einem Secret/Passwort ab
 * Verwendet PBKDF2 mit SHA-256
 */
export async function deriveKeyFromSecret(secret: string, salt: string = 'nostr-group-salt'): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const secretBuffer = encoder.encode(secret);
  const saltBuffer = encoder.encode(salt);

  // Secret als Schlüssel importieren
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    secretBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Schlüssel ableiten
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

/**
 * Verschlüsselt einen Text mit AES-GCM
 */
export async function encryptMessage(message: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  // Zufällige IV generieren
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // IV + verschlüsselte Daten als Base64 zurückgeben
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

/**
 * Entschlüsselt einen mit AES-GCM verschlüsselten Text
 */
export async function decryptMessage(encryptedMessage: string, key: CryptoKey): Promise<string> {
  try {
    // Base64 dekodieren
    const combined = new Uint8Array(atob(encryptedMessage).split('').map(c => c.charCodeAt(0)));
    
    // IV und verschlüsselte Daten trennen
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Entschlüsselung fehlgeschlagen:', error);
    throw new Error('Entschlüsselung fehlgeschlagen');
  }
}

/**
 * Generiert ein zufälliges Hex-String (für Schlüssel, IDs, etc.)
 */
export function generateRandomHex(length: number = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}