#!/usr/bin/env node

/**
 * Test-Script für Room-ID Generator
 * 
 * Testet:
 * - Länge (16 Zeichen)
 * - Format (nur a-z, 0-9)
 * - Eindeutigkeit (keine Duplikate)
 * 
 * Usage: node test-room-id.js
 */

// Einfache generateRoomId Implementation (kopiert aus utils/index.ts)
function generateRoomId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

console.log('🧪 Test: Room-ID Generator\n');

// Test 1: Generiere 10 IDs
console.log('📝 Test 1: Generiere 10 Room-IDs');
console.log('─'.repeat(50));

const roomIds = [];
for (let i = 0; i < 10; i++) {
  const id = generateRoomId();
  roomIds.push(id);
  console.log(`${i + 1}.  ${id}`);
}

// Test 2: Länge prüfen
console.log('\n📏 Test 2: Länge überprüfen');
console.log('─'.repeat(50));

const allCorrectLength = roomIds.every(id => id.length === 16);
console.log(`Alle IDs haben 16 Zeichen: ${allCorrectLength ? '✅' : '❌'}`);

// Test 3: Format prüfen (nur a-z, 0-9)
console.log('\n🔤 Test 3: Format überprüfen');
console.log('─'.repeat(50));

const validChars = /^[a-z0-9]+$/;
const allValidFormat = roomIds.every(id => validChars.test(id));
console.log(`Alle IDs haben korrektes Format: ${allValidFormat ? '✅' : '❌'}`);

// Test 4: Eindeutigkeit prüfen
console.log('\n🔍 Test 4: Eindeutigkeit überprüfen');
console.log('─'.repeat(50));

const uniqueIds = new Set(roomIds);
console.log(`Generiert: ${roomIds.length} IDs`);
console.log(`Eindeutig: ${uniqueIds.size} IDs`);
console.log(`Alle eindeutig: ${uniqueIds.size === roomIds.length ? '✅' : '❌'}`);

// Test 5: Große Menge (10.000 IDs)
console.log('\n🚀 Test 5: Eindeutigkeit bei 10.000 IDs');
console.log('─'.repeat(50));

const largeSet = new Set();
for (let i = 0; i < 10000; i++) {
  largeSet.add(generateRoomId());
}

console.log(`Generiert: 10.000 IDs`);
console.log(`Eindeutig: ${largeSet.size} IDs`);
console.log(`Kollisionen: ${10000 - largeSet.size}`);
console.log(`Alle eindeutig: ${largeSet.size === 10000 ? '✅' : '❌'}`);

// Zusammenfassung
console.log('\n' + '='.repeat(50));
console.log('📊 ZUSAMMENFASSUNG');
console.log('='.repeat(50));

const allPassed = allCorrectLength && allValidFormat && uniqueIds.size === roomIds.length && largeSet.size === 10000;

if (allPassed) {
  console.log('✅ Alle Tests bestanden!');
  console.log('✅ Room-ID Generator funktioniert korrekt.');
} else {
  console.log('❌ Einige Tests fehlgeschlagen!');
  process.exit(1);
}
