/**
 * Angebots-Secret Management
 * 
 * Dieses Modul verwaltet die Generierung und Ableitung von Angebots-Secrets.
 * Anstatt Keypairs in localStorage zu speichern, generiert der User ein Secret,
 * aus dem deterministisch ein Keypair abgeleitet wird.
 * 
 * Vorteile:
 * - Kein localStorage nötig
 * - User kann Secret extern speichern (Passwort-Manager)
 * - Re-Login mit Secret möglich
 * - Deterministisch → gleicher Key bei Re-Login
 */

import { sha256 } from '@noble/hashes/sha256';
  import { logger } from '$lib/utils/logger';
import { getPublicKey } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils';

/**
 * Interface für Keypair
 */
export interface OfferKeypair {
  privateKey: string;
  publicKey: string;
}

/**
 * Generiere zufälliges Angebots-Secret (64 Hex-Zeichen = 32 Bytes)
 * 
 * @returns Hex-String mit 64 Zeichen
 * 
 * @example
 * const secret = generateOfferSecret();
 * // "a1b2c3d4e5f6..."
 */
export function generateOfferSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(bytes);
}

/**
 * Leite Keypair deterministisch aus Secret ab
 * 
 * Verwendet SHA-256 Hash des Secrets als Private Key.
 * Dadurch wird immer der gleiche Key aus dem gleichen Secret generiert.
 * 
 * @param secret - Hex-String (64 Zeichen)
 * @returns Keypair mit privateKey und publicKey
 * 
 * @example
 * const secret = "a1b2c3d4...";
 * const keypair = deriveKeypairFromSecret(secret);
 * logger.debug(keypair.publicKey); // "npub1..."
 */
export function deriveKeypairFromSecret(secret: string): OfferKeypair {
  // Validiere Secret-Format
  if (!validateOfferSecret(secret)) {
    throw new Error('Ungültiges Secret-Format. Erwartet: 64 Hex-Zeichen');
  }

  // Hash Secret zu Private Key
  const secretBytes = new TextEncoder().encode(secret);
  const hash = sha256(secretBytes);
  const privateKey = bytesToHex(hash);
  
  // Leite Public Key ab
  const publicKey = getPublicKey(privateKey as any);
  
  return { privateKey, publicKey };
}

/**
 * Validiere Angebots-Secret Format
 * 
 * Secret muss genau 64 Hex-Zeichen (0-9, a-f) sein.
 * 
 * @param secret - Zu validierendes Secret
 * @returns true wenn gültig, false sonst
 * 
 * @example
 * validateOfferSecret("a1b2c3d4..."); // true (64 Zeichen)
 * validateOfferSecret("invalid");      // false
 */
export function validateOfferSecret(secret: string): boolean {
  return /^[0-9a-f]{64}$/i.test(secret);
}

/**
 * Formatiere Secret für bessere Lesbarkeit
 * 
 * Teilt Secret in 8 Blöcke à 8 Zeichen auf.
 * 
 * @param secret - Hex-String (64 Zeichen)
 * @returns Formatierter String mit Leerzeichen
 * 
 * @example
 * formatSecretForDisplay("a1b2c3d4e5f6...");
 * // "a1b2c3d4 e5f6g7h8 ..."
 */
export function formatSecretForDisplay(secret: string): string {
  if (!validateOfferSecret(secret)) {
    return secret;
  }
  
  // Teile in 8 Blöcke à 8 Zeichen
  const blocks: string[] = [];
  for (let i = 0; i < secret.length; i += 8) {
    blocks.push(secret.substring(i, i + 8));
  }
  
  return blocks.join(' ');
}

/**
 * Parse formatiertes Secret zurück zu normalem Format
 * 
 * Entfernt alle Leerzeichen und Bindestriche.
 * 
 * @param formattedSecret - Formatiertes Secret mit Leerzeichen
 * @returns Normalisiertes Secret (64 Hex-Zeichen)
 * 
 * @example
 * parseFormattedSecret("a1b2c3d4 e5f6g7h8");
 * // "a1b2c3d4e5f6g7h8"
 */
export function parseFormattedSecret(formattedSecret: string): string {
  return formattedSecret.replace(/[\s-]/g, '').toLowerCase();
}

/**
 * Generiere Angebots-ID aus Secret
 * 
 * Verwendet für deterministische Offer-IDs.
 * 
 * @param secret - Angebots-Secret
 * @returns Hex-String (64 Zeichen)
 */
export function deriveOfferIdFromSecret(secret: string): string {
  const secretBytes = new TextEncoder().encode(secret + '-offer-id');
  const hash = sha256(secretBytes);
  return bytesToHex(hash);
}

/**
 * Prüfe ob zwei Secrets zum gleichen Keypair führen
 * 
 * @param secret1 - Erstes Secret
 * @param secret2 - Zweites Secret
 * @returns true wenn beide zum gleichen Keypair führen
 */
export function areSecretsEqual(secret1: string, secret2: string): boolean {
  try {
    const kp1 = deriveKeypairFromSecret(secret1);
    const kp2 = deriveKeypairFromSecret(secret2);
    return kp1.publicKey === kp2.publicKey;
  } catch {
    return false;
  }
}

/**
 * Erstelle Backup-Text für Secret
 * 
 * Generiert formatierten Text den User kopieren/speichern kann.
 * 
 * @param secret - Angebots-Secret
 * @param offerTitle - Titel des Angebots (optional)
 * @returns Formatierter Backup-Text
 * 
 * @example
 * const backup = createSecretBackup(secret, "Verkaufe 0.01 BTC");
 * logger.debug(backup);
 * // "=== ANGEBOTS-SECRET BACKUP ===
 * //  Angebot: Verkaufe 0.01 BTC
 * //  Secret: a1b2c3d4 e5f6g7h8 ...
 * //  ..."
 */
export function createSecretBackup(secret: string, offerTitle?: string): string {
  const formatted = formatSecretForDisplay(secret);
  const timestamp = new Date().toLocaleString('de-DE');
  
  return `=== ANGEBOTS-SECRET BACKUP ===

${offerTitle ? `Angebot: ${offerTitle}\n` : ''}Erstellt: ${timestamp}

Secret (64 Zeichen):
${formatted}

WICHTIG:
- Speichere dieses Secret sicher (z.B. Passwort-Manager)
- Mit diesem Secret kannst du dein Angebot löschen
- Ohne Secret kannst du das Angebot NICHT mehr verwalten
- Teile dieses Secret mit NIEMANDEM

=== ENDE BACKUP ===`;
}