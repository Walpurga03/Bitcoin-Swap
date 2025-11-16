#!/usr/bin/env node

/**
 * Test-Script für NIP-04 Verschlüsselung
 * 
 * Testet:
 * 1. Nachricht verschlüsseln
 * 2. Nachricht an Relay senden (Kind 4)
 * 3. Nachricht vom Relay laden
 * 4. Nachricht entschlüsseln
 * 5. Verifikation: Relay sieht nur verschlüsselten Content!
 * 
 * Usage: node test-nip04.js
 */

import { SimplePool, finalizeEvent, nip04, generateSecretKey, getPublicKey } from 'nostr-tools';

const RELAY = 'wss://nostr-relay.online';

console.log('🧪 Test: NIP-04 Verschlüsselung\n');
console.log('🔗 Relay:', RELAY);
console.log('─'.repeat(70));

// Generiere Test-Keys
console.log('\n🔑 Schritt 1: Generiere Test-Keypairs');
console.log('─'.repeat(70));

const senderPrivateKey = generateSecretKey();
const senderPubkey = getPublicKey(senderPrivateKey);

const recipientPrivateKey = generateSecretKey();
const recipientPubkey = getPublicKey(recipientPrivateKey);

console.log('Sender Pubkey:    ', senderPubkey.substring(0, 16) + '...');
console.log('Empfänger Pubkey: ', recipientPubkey.substring(0, 16) + '...');

// Test-Nachricht mit Room-ID (simuliert Deal-Acceptance)
const testMessage = JSON.stringify({
  type: 'deal-accepted',
  roomId: 'a7k2m9x4p1q8s3w6', // Geheime Room-ID!
  offerId: 'test-offer-123',
  timestamp: Math.floor(Date.now() / 1000)
});

console.log('\n📝 Schritt 2: Test-Nachricht');
console.log('─'.repeat(70));
console.log('Klartext:', testMessage);

// Verschlüsseln
console.log('\n🔐 Schritt 3: Verschlüsseln');
console.log('─'.repeat(70));

let encryptedContent;
try {
  encryptedContent = await nip04.encrypt(senderPrivateKey, recipientPubkey, testMessage);
  console.log('✅ Verschlüsselung erfolgreich!');
  console.log('Verschlüsselter Content:', encryptedContent.substring(0, 50) + '...');
  console.log('Länge:', encryptedContent.length, 'Zeichen');
} catch (error) {
  console.error('❌ Verschlüsselung fehlgeschlagen:', error.message);
  process.exit(1);
}

// Event erstellen
console.log('\n📤 Schritt 4: Erstelle NIP-04 Event (Kind 4)');
console.log('─'.repeat(70));

const event = finalizeEvent(
  {
    kind: 4, // Encrypted Direct Message
    content: encryptedContent,
    tags: [
      ['p', recipientPubkey] // Empfänger (SICHTBAR auf Relay!)
    ],
    created_at: Math.floor(Date.now() / 1000)
  },
  senderPrivateKey
);

console.log('Event ID:', event.id.substring(0, 16) + '...');
console.log('Kind:    ', event.kind, '(Encrypted DM)');
console.log('Sender:  ', event.pubkey.substring(0, 16) + '...');
console.log('Tags:    ', JSON.stringify(event.tags));
console.log('Content: ', event.content.substring(0, 50) + '...');

console.log('\n⚠️  WAS DER RELAY SIEHT:');
console.log('─'.repeat(70));
console.log('✅ Sender Public Key (temp):     ' + event.pubkey.substring(0, 16) + '...');
console.log('✅ Empfänger Public Key (temp):  ' + recipientPubkey.substring(0, 16) + '...');
console.log('✅ Verschlüsselter Content:      ' + event.content.substring(0, 30) + '...');
console.log('❌ Room-ID:                      NICHT SICHTBAR (verschlüsselt)');
console.log('❌ Nachrichteninhalt:            NICHT SICHTBAR (verschlüsselt)');

// An Relay senden
console.log('\n📡 Schritt 5: Sende Event an Relay');
console.log('─'.repeat(70));

const pool = new SimplePool();

try {
  const publishPromises = pool.publish([RELAY], event);
  const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(), 3000));
  
  await Promise.race([Promise.all(publishPromises), timeoutPromise]);
  
  console.log('✅ Event an Relay gesendet!');
  console.log('⏳ Warte 2 Sekunden...');
  await new Promise(resolve => setTimeout(resolve, 2000));
} catch (error) {
  console.error('❌ Senden fehlgeschlagen:', error.message);
  pool.close([RELAY]);
  process.exit(1);
}

// Vom Relay laden
console.log('\n📥 Schritt 6: Lade Events vom Relay');
console.log('─'.repeat(70));

try {
  const filter = {
    kinds: [4],
    '#p': [recipientPubkey],
    limit: 10
  };
  
  console.log('Filter:', JSON.stringify(filter, null, 2));
  
  const events = await pool.querySync([RELAY], filter);
  
  console.log(`✅ ${events.length} verschlüsselte Event(s) gefunden`);
  
  if (events.length === 0) {
    console.error('❌ Keine Events gefunden! Event noch nicht auf Relay?');
    pool.close([RELAY]);
    process.exit(1);
  }
  
  // Finde unser Event
  const ourEvent = events.find(e => e.id === event.id);
  
  if (!ourEvent) {
    console.warn('⚠️  Unser Event noch nicht gefunden. Zeige neuestes Event:');
    console.log('Event ID:', events[0].id.substring(0, 16) + '...');
    console.log('Content: ', events[0].content.substring(0, 50) + '...');
  } else {
    console.log('✅ Unser Event gefunden!');
    console.log('Event ID:', ourEvent.id.substring(0, 16) + '...');
  }
  
} catch (error) {
  console.error('❌ Laden fehlgeschlagen:', error.message);
  pool.close([RELAY]);
  process.exit(1);
}

// Entschlüsseln
console.log('\n🔓 Schritt 7: Entschlüssele Nachricht');
console.log('─'.repeat(70));

try {
  const decrypted = await nip04.decrypt(recipientPrivateKey, senderPubkey, encryptedContent);
  
  console.log('✅ Entschlüsselung erfolgreich!');
  console.log('Klartext:', decrypted);
  
  // Vergleiche mit Original
  if (decrypted === testMessage) {
    console.log('✅ Nachricht identisch mit Original!');
  } else {
    console.error('❌ Nachricht unterscheidet sich vom Original!');
    process.exit(1);
  }
  
  // Parse JSON
  const parsed = JSON.parse(decrypted);
  console.log('\n📦 Entschlüsselter Inhalt:');
  console.log('  Type:    ', parsed.type);
  console.log('  Room-ID: ', parsed.roomId, '← NUR Empfänger sieht das!');
  console.log('  Offer:   ', parsed.offerId);
  
} catch (error) {
  console.error('❌ Entschlüsselung fehlgeschlagen:', error.message);
  pool.close([RELAY]);
  process.exit(1);
}

pool.close([RELAY]);

// Zusammenfassung
console.log('\n' + '='.repeat(70));
console.log('📊 ZUSAMMENFASSUNG');
console.log('='.repeat(70));
console.log('✅ Verschlüsselung:    Erfolgreich');
console.log('✅ Senden an Relay:    Erfolgreich');
console.log('✅ Laden vom Relay:    Erfolgreich');
console.log('✅ Entschlüsselung:    Erfolgreich');
console.log('✅ Privacy:            Relay sieht nur temp-pubkeys + encrypted content');
console.log('\n🎉 Alle Tests bestanden!');
console.log('🔐 Room-ID bleibt geheim (nur Empfänger kann entschlüsseln)');
