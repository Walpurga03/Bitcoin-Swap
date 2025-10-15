/**
 * NIP-17: Private Direct Messages (Gift-Wrapped)
 * 
 * NIP-17 bietet bessere Privatsphäre als NIP-04 durch:
 * - Gift-Wrapping: Versteckt Sender und Empfänger Metadaten
 * - Seal (Kind 13): Verschlüsselte Nachricht mit Rumor
 * - Rumor (Kind 14): Unsignierte Nachricht (keine Pubkey-Verknüpfung)
 * - Gift Wrap (Kind 1059): Äußere Verschlüsselung
 */

import { getPublicKey, generateSecretKey, finalizeEvent } from 'nostr-tools';
import { nip44Encrypt, nip44Decrypt } from './crypto';
import { createEvent, publishEvent, fetchEvents } from './client';
import type { NostrEvent } from './types';

/**
 * Rumor: Unsignierte Nachricht (Kind 14)
 * Wird in einem Seal verschlüsselt
 */
interface Rumor {
  kind: 14;
  content: string;
  created_at: number;
  tags: string[][];
}

/**
 * Seal: Verschlüsselter Rumor (Kind 13)
 * Wird vom Sender mit dem Empfänger-Pubkey verschlüsselt
 */
interface Seal {
  kind: 13;
  content: string; // Verschlüsselter Rumor
  created_at: number;
  pubkey: string; // Zufälliger Pubkey
  tags: string[][];
}

/**
 * Gift Wrap: Äußere Verschlüsselung (Kind 1059)
 * Versteckt alle Metadaten
 */
interface GiftWrap {
  kind: 1059;
  content: string; // Verschlüsselter Seal
  created_at: number;
  pubkey: string; // Zufälliger Pubkey
  tags: [['p', string]]; // Nur Empfänger-Tag
}

/**
 * Erstelle einen Rumor (unsignierte Nachricht)
 */
function createRumor(
  content: string,
  recipientPubkey: string,
  senderPubkey: string
): Rumor {
  return {
    kind: 14,
    content,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['p', recipientPubkey],
      ['from', senderPubkey] // Optionaler Tag für Sender-Identifikation
    ]
  };
}

/**
 * Erstelle einen Seal (verschlüsselter Rumor)
 *
 * WICHTIG: Der Seal wird mit dem SENDER Private Key verschlüsselt,
 * damit der Empfänger ihn mit dem Sender Public Key entschlüsseln kann.
 * Der Seal selbst wird mit einem zufälligen Key signiert für Anonymität.
 */
async function createSeal(
  rumor: Rumor,
  senderPrivateKey: string,
  recipientPubkey: string
): Promise<NostrEvent> {
  // Erstelle zufälligen Privkey für Seal-Signatur
  const randomSecretKey = generateSecretKey();
  const randomPrivkey = Array.from(randomSecretKey)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const randomPubkey = getPublicKey(randomPrivkey as any);

  // Verschlüssele Rumor: Sender verschlüsselt für Empfänger
  // Der Empfänger kann mit seinem Private Key + Sender Public Key entschlüsseln
  const rumorJson = JSON.stringify(rumor);
  const encrypted = nip44Encrypt(rumorJson, senderPrivateKey, recipientPubkey);

  // Erstelle Seal Event mit zufälligem Pubkey (für Anonymität)
  const seal = {
    kind: 13,
    pubkey: randomPubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: encrypted
  };

  // Signiere mit zufälligem Key
  const signedSeal = finalizeEvent(seal, randomPrivkey as any);
  return signedSeal as NostrEvent;
}

/**
 * Erstelle Gift Wrap (äußere Verschlüsselung)
 */
async function createGiftWrap(
  seal: NostrEvent,
  recipientPubkey: string
): Promise<NostrEvent> {
  // Erstelle zufälligen Privkey für Gift Wrap
  const randomSecretKey = generateSecretKey();
  const randomPrivkey = Array.from(randomSecretKey)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const randomPubkey = getPublicKey(randomPrivkey as any);

  // Verschlüssele Seal mit Empfänger-Pubkey
  const sealJson = JSON.stringify(seal);
  const encrypted = nip44Encrypt(sealJson, randomPrivkey, recipientPubkey);

  // Erstelle Gift Wrap Event
  // Zeitstempel wird randomisiert (±2 Tage) für bessere Privatsphäre
  const randomOffset = Math.floor(Math.random() * 172800) - 86400; // ±1 Tag
  const giftWrap = {
    kind: 1059,
    pubkey: randomPubkey,
    created_at: Math.floor(Date.now() / 1000) + randomOffset,
    tags: [['p', recipientPubkey]],
    content: encrypted
  };

  // Signiere mit zufälligem Key
  const signedGiftWrap = finalizeEvent(giftWrap, randomPrivkey as any);
  return signedGiftWrap as NostrEvent;
}

/**
 * Sende eine NIP-17 Private Message
 */
export async function sendNIP17Message(
  content: string,
  recipientPubkey: string,
  senderPrivateKey: string,
  relays: string[]
): Promise<NostrEvent> {
  try {
    console.log('📨 [NIP-17] Sende Private Message...');
    console.log('  👤 Empfänger:', recipientPubkey.substring(0, 16) + '...');
    
    const senderPubkey = getPublicKey(senderPrivateKey as any);

    // 1. Erstelle Rumor
    const rumor = createRumor(content, recipientPubkey, senderPubkey);
    console.log('  📝 Rumor erstellt');

    // 2. Erstelle Seal für Empfänger
    const sealForRecipient = await createSeal(rumor, senderPrivateKey, recipientPubkey);
    console.log('  🔒 Seal für Empfänger erstellt');

    // 3. Erstelle Gift Wrap für Empfänger
    const giftWrapForRecipient = await createGiftWrap(sealForRecipient, recipientPubkey);
    console.log('  🎁 Gift Wrap für Empfänger erstellt');

    // 4. Publiziere Gift Wrap für Empfänger
    const resultRecipient = await publishEvent(giftWrapForRecipient, relays);
    console.log('  ✅ An Empfänger gesendet:', resultRecipient.relays.length + '/' + relays.length + ' Relays');

    // 5. Erstelle Seal für Sender (sich selbst)
    const sealForSender = await createSeal(rumor, senderPrivateKey, senderPubkey);
    console.log('  🔒 Seal für Sender erstellt');

    // 6. Erstelle Gift Wrap für Sender
    const giftWrapForSender = await createGiftWrap(sealForSender, senderPubkey);
    console.log('  🎁 Gift Wrap für Sender erstellt');

    // 7. Publiziere Gift Wrap für Sender
    const resultSender = await publishEvent(giftWrapForSender, relays);
    console.log('  ✅ An Sender (Kopie) gesendet:', resultSender.relays.length + '/' + relays.length + ' Relays');

    return giftWrapForRecipient;
  } catch (error) {
    console.error('❌ [NIP-17] Fehler beim Senden:', error);
    throw error;
  }
}

/**
 * Entpacke eine NIP-17 Gift-Wrapped Message
 *
 * WICHTIG: Der Seal wurde vom Sender mit seinem Private Key verschlüsselt.
 * Zum Entschlüsseln brauchen wir den Sender Public Key.
 *
 * Problem: Wir kennen den Sender erst nach Entschlüsselung des Rumors.
 * Lösung: Wir probieren verschiedene mögliche Sender durch:
 * 1. Empfänger selbst (für Kopien an sich selbst)
 * 2. Bekannte Sender aus dem Kontext (otherPubkey Parameter)
 */
export async function unwrapGiftWrap(
  giftWrap: NostrEvent,
  recipientPrivateKey: string,
  otherPubkey?: string
): Promise<{ content: string; senderPubkey: string; recipientPubkey: string; timestamp: number } | null> {
  try {
    // 1. Entschlüssele Gift Wrap → Seal
    const sealJson = nip44Decrypt(giftWrap.content, recipientPrivateKey, giftWrap.pubkey);
    const seal = JSON.parse(sealJson) as NostrEvent;

    // 2. Versuche Seal zu entschlüsseln mit verschiedenen möglichen Sendern
    const recipientPubkey = getPublicKey(recipientPrivateKey as any);
    const possibleSenders = [recipientPubkey]; // Zuerst: Kopie an sich selbst
    
    if (otherPubkey && otherPubkey !== recipientPubkey) {
      possibleSenders.push(otherPubkey); // Dann: Bekannter Gesprächspartner
    }

    for (const senderPubkey of possibleSenders) {
      try {
        // Versuche mit diesem Sender zu entschlüsseln
        const rumorJson = nip44Decrypt(seal.content, recipientPrivateKey, senderPubkey);
        const rumor = JSON.parse(rumorJson) as Rumor;

        // Validiere: Extrahiere echten Sender aus Rumor
        const fromTag = rumor.tags.find(t => t[0] === 'from');
        const actualSender = fromTag ? fromTag[1] : senderPubkey;
        
        const pTag = rumor.tags.find(t => t[0] === 'p');
        const actualRecipient = pTag ? pTag[1] : 'unknown';

        return {
          content: rumor.content,
          senderPubkey: actualSender,
          recipientPubkey: actualRecipient,
          timestamp: rumor.created_at
        };
      } catch (e) {
        // Dieser Sender war falsch, probiere nächsten
        continue;
      }
    }

    // Keiner der möglichen Sender hat funktioniert
    throw new Error('Konnte Seal mit keinem bekannten Sender entschlüsseln');
  } catch (error) {
    console.error('❌ [NIP-17] Fehler beim Entpacken:', error);
    return null;
  }
}

/**
 * Lade NIP-17 Messages für einen Benutzer
 */
export async function fetchNIP17Messages(
  userPubkey: string,
  userPrivateKey: string,
  relays: string[],
  limit: number = 50,
  otherPubkey?: string
): Promise<Array<{
  id: string;
  content: string;
  senderPubkey: string;
  recipientPubkey: string;
  timestamp: number;
}>> {
  try {
    console.log('📥 [NIP-17] Lade Messages...');
    console.log('  👤 User:', userPubkey.substring(0, 16) + '...');

    // Hole alle Gift Wraps für diesen User
    const giftWraps = await fetchEvents(relays, {
      kinds: [1059],
      '#p': [userPubkey],
      limit
    });

    console.log('  📦 Gift Wraps gefunden:', giftWraps.length);

    // Entpacke alle Messages
    const messages = [];
    for (const giftWrap of giftWraps) {
      const unwrapped = await unwrapGiftWrap(giftWrap, userPrivateKey, otherPubkey);
      if (unwrapped) {
        messages.push({
          id: giftWrap.id,
          content: unwrapped.content,
          senderPubkey: unwrapped.senderPubkey,
          recipientPubkey: unwrapped.recipientPubkey,
          timestamp: unwrapped.timestamp
        });
      }
    }

    console.log('  ✅ Messages entpackt:', messages.length);
    return messages;
  } catch (error) {
    console.error('❌ [NIP-17] Fehler beim Laden:', error);
    return [];
  }
}

/**
 * Lade NIP-17 Konversation zwischen zwei Benutzern
 */
export async function fetchNIP17Conversation(
  userPubkey: string,
  userPrivateKey: string,
  otherPubkey: string,
  relays: string[],
  limit: number = 50
): Promise<Array<{
  id: string;
  content: string;
  senderPubkey: string;
  recipientPubkey: string;
  timestamp: number;
  isSent: boolean;
}>> {
  try {
    console.log('💬 [NIP-17] Lade Konversation...');
    console.log('  👤 User:', userPubkey.substring(0, 16) + '...');
    console.log('  👤 Other:', otherPubkey.substring(0, 16) + '...');

    // Hole alle Messages für diesen User, mit otherPubkey für Entschlüsselung
    const allMessages = await fetchNIP17Messages(userPubkey, userPrivateKey, relays, limit, otherPubkey);

    // Filtere nur Messages von/zu otherPubkey
    const conversation = allMessages
      .filter(msg =>
        msg.senderPubkey === otherPubkey ||
        (msg.senderPubkey === userPubkey && msg.recipientPubkey === otherPubkey)
      )
      .map(msg => ({
        ...msg,
        isSent: msg.senderPubkey === userPubkey
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    console.log('  ✅ Konversation geladen:', conversation.length, 'Messages');
    return conversation;
  } catch (error) {
    console.error('❌ [NIP-17] Fehler beim Laden der Konversation:', error);
    return [];
  }
}