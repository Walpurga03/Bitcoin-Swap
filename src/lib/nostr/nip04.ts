/**
 * NIP-04: Encrypted Direct Messages
 * 
 * Einfachere Alternative zu NIP-17 für verschlüsselte Nachrichten.
 * - Content ist verschlüsselt
 * - Metadaten (p-Tags) sind sichtbar
 * - Verwendet für Deal-Benachrichtigungen (nur einmal pro Deal)
 */

import { SimplePool, finalizeEvent, nip04, type NostrEvent } from 'nostr-tools';
import { logger } from '$lib/utils/logger';

/**
 * Verschlüssele eine Nachricht mit NIP-04
 * 
 * @param senderPrivateKey - Sender Private Key (hex)
 * @param recipientPubkey - Empfänger Public Key (hex)
 * @param plaintext - Nachricht (String oder JSON)
 * @returns Verschlüsselter Text
 */
export async function encryptMessage(
  senderPrivateKey: string,
  recipientPubkey: string,
  plaintext: string
): Promise<string> {
  try {
    const encrypted = await nip04.encrypt(senderPrivateKey, recipientPubkey, plaintext);
    return encrypted;
  } catch (error) {
    logger.error('[NIP-04] Verschlüsselung fehlgeschlagen', error);
    throw new Error('Verschlüsselung fehlgeschlagen');
  }
}

/**
 * Entschlüssele eine NIP-04 Nachricht
 * 
 * @param recipientPrivateKey - Empfänger Private Key (hex)
 * @param senderPubkey - Sender Public Key (hex)
 * @param ciphertext - Verschlüsselter Text
 * @returns Entschlüsselter Klartext
 */
export async function decryptMessage(
  recipientPrivateKey: string,
  senderPubkey: string,
  ciphertext: string
): Promise<string> {
  try {
    const decrypted = await nip04.decrypt(recipientPrivateKey, senderPubkey, ciphertext);
    return decrypted;
  } catch (error) {
    logger.error('[NIP-04] Entschlüsselung fehlgeschlagen', error);
    throw new Error('Entschlüsselung fehlgeschlagen');
  }
}

/**
 * Sende eine verschlüsselte NIP-04 Direct Message
 * 
 * @param senderPrivateKey - Sender Private Key (hex)
 * @param recipientPubkey - Empfänger Public Key (hex)
 * @param message - Nachricht (String oder JSON)
 * @param relay - Relay URL
 * @returns Event ID
 */
export async function sendEncryptedMessage(
  senderPrivateKey: string,
  recipientPubkey: string,
  message: string,
  relay: string
): Promise<string> {
  const pool = new SimplePool();

  try {
    logger.debug('[NIP-04] Verschlüssele Nachricht...');
    
    // Verschlüssele Content
    const encryptedContent = await encryptMessage(senderPrivateKey, recipientPubkey, message);
    
    logger.debug('[NIP-04] Erstelle Event...');
    
    // Erstelle NIP-04 Event (Kind 4)
    const event = finalizeEvent(
      {
        kind: 4, // Encrypted Direct Message
        content: encryptedContent,
        tags: [
          ['p', recipientPubkey] // Empfänger (sichtbar!)
        ],
        created_at: Math.floor(Date.now() / 1000)
      },
      senderPrivateKey as any
    );

    logger.debug('[NIP-04] Sende Event an Relay...', { eventId: event.id.substring(0, 16) });

    // Sende Event mit Timeout
    const publishPromises = pool.publish([relay], event as NostrEvent);
    const timeoutPromise = new Promise<void>((resolve) =>
      setTimeout(() => resolve(), 3000)
    );
    
    await Promise.race([Promise.all(publishPromises), timeoutPromise]);
    
    pool.close([relay]);
    
    logger.success('[NIP-04] Nachricht gesendet', { eventId: event.id.substring(0, 16) });
    
    return event.id;
  } catch (error) {
    pool.close([relay]);
    logger.error('[NIP-04] Senden fehlgeschlagen', error);
    throw error;
  }
}

/**
 * Lade und entschlüssele NIP-04 Nachrichten für einen User
 * 
 * @param userPubkey - User Public Key (hex)
 * @param userPrivateKey - User Private Key (hex)
 * @param relay - Relay URL
 * @param since - Optional: Nur Nachrichten nach diesem Timestamp (Unix seconds)
 * @returns Array von entschlüsselten Nachrichten
 */
export async function loadEncryptedMessages(
  userPubkey: string,
  userPrivateKey: string,
  relay: string,
  since?: number
): Promise<Array<{ id: string; from: string; content: string; timestamp: number }>> {
  const pool = new SimplePool();

  try {
    logger.debug('[NIP-04] Lade verschlüsselte Nachrichten...');

    // Suche nach Kind 4 Events wo User Empfänger ist
    const filter: any = {
      kinds: [4],
      '#p': [userPubkey],
      limit: 100
    };
    
    if (since) {
      filter.since = since;
    }

    const events = await pool.querySync([relay], filter);
    
    logger.debug(`[NIP-04] ${events.length} verschlüsselte Events gefunden`);

    const messages = [];

    for (const event of events) {
      try {
        // Entschlüssele Content
        const decrypted = await decryptMessage(userPrivateKey, event.pubkey, event.content);
        
        messages.push({
          id: event.id,
          from: event.pubkey,
          content: decrypted,
          timestamp: event.created_at
        });
      } catch (error) {
        // Überspringe Nachrichten die nicht entschlüsselt werden können
        logger.warn('[NIP-04] Nachricht konnte nicht entschlüsselt werden', {
          eventId: event.id.substring(0, 16)
        });
      }
    }

    pool.close([relay]);
    
    logger.success(`[NIP-04] ${messages.length} Nachrichten entschlüsselt`);
    
    return messages;
  } catch (error) {
    pool.close([relay]);
    logger.error('[NIP-04] Laden fehlgeschlagen', error);
    throw error;
  }
}
