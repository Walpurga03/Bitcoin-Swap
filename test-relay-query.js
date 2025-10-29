#!/usr/bin/env node

/**
 * Relay Query Tool - Aktualisiert für neues Secret-System
 * Überwacht alle Event-Kinds die zum Relay gesendet werden
 * 
 * Neue Event-Kinds:
 * - Kind 30000: Marketplace-Angebote (Addressable Events)
 * - Kind 30078: Interesse-Signale (verschlüsselt, NIP-04)
 * - Kind 30079: Absage-Nachrichten (verschlüsselt, NIP-04)
 * - Kind 1059: NIP-17 Gift-Wrapped Messages (Deal-Rooms)
 * - Kind 5: Deletion Events (NIP-09)
 * - Kind 4: Verschlüsselte DMs (NIP-04, deprecated)
 */

import { SimplePool } from 'nostr-tools/pool';

// ============================================================
// KONFIGURATION - Hier kannst du die Einstellungen anpassen
// ============================================================

// Relay-URL
const RELAY = 'wss://nostr-relay.online';

// Channel-ID (SHA-256 Hash des Gruppen-Secrets)
const CHANNEL_ID = '3f36f54993fab8ac36099f0dcf2136aad34a20275b8990d1ee4538ab4adf0f7b';

// Zeitfilter: Wie viele Stunden zurück sollen Events angezeigt werden?
const HOURS_TO_SHOW = 2; // Ändere diese Zahl, um mehr/weniger Events zu sehen

// Berechnung des Zeitstempels (nicht ändern)
const HOURS_AGO = Math.floor(Date.now() / 1000) - (HOURS_TO_SHOW * 60 * 60);

// ============================================================

function formatAge(timestamp) {
  const minutes = Math.floor((Date.now() / 1000 - timestamp) / 60);
  if (minutes < 60) return `${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatDate(timestamp) {
  return new Date(timestamp * 1000).toLocaleString('de-DE');
}

async function queryRelay() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 RELAY QUERY TOOL - Bitcoin-Tausch-Netzwerk');
  console.log('='.repeat(60));
  console.log('📡 Relay:', RELAY);
  console.log('⏰ Zeitfilter: Letzte', HOURS_TO_SHOW, 'Stunde(n)');
  console.log('📅 Zeige Events seit:', formatDate(HOURS_AGO));
  console.log('📍 Channel-ID:', CHANNEL_ID.substring(0, 16) + '...');
  console.log('='.repeat(60) + '\n');
  
  const pool = new SimplePool();
  
  try {
    // 1. Marketplace-Angebote (Kind 30000) - NEU!
    console.log('\n📦 Suche nach Marketplace-Angeboten (Kind 30000)...');
    const offers = await pool.querySync([RELAY], {
      kinds: [30000],
      since: HOURS_AGO,
      limit: 20
    });

    console.log(`   ✅ Gefunden: ${offers.length} Angebote`);
    offers.forEach(event => {
      const dTag = event.tags.find(t => t[0] === 'd')?.[1] || 'kein d-tag';
      const expirationTag = event.tags.find(t => t[0] === 'expiration')?.[1];
      const isExpired = expirationTag && parseInt(expirationTag) < Math.floor(Date.now() / 1000);
      
      console.log(`\n   📦 Angebot:`);
      console.log(`      ID: ${event.id.substring(0, 16)}...`);
      console.log(`      d-Tag: ${dTag}`);
      console.log(`      Author: ${event.pubkey.substring(0, 16)}...`);
      console.log(`      Alter: ${formatAge(event.created_at)}`);
      console.log(`      Created: ${formatDate(event.created_at)}`);
      
      if (expirationTag) {
        const expiresIn = parseInt(expirationTag) - Math.floor(Date.now() / 1000);
        const hoursLeft = Math.floor(expiresIn / 3600);
        const minutesLeft = Math.floor((expiresIn % 3600) / 60);
        console.log(`      ⏰ Expiration: ${formatDate(parseInt(expirationTag))}`);
        console.log(`      ${isExpired ? '❌ ABGELAUFEN' : `✅ Läuft ab in: ${hoursLeft}h ${minutesLeft}m`}`);
      }
      
      try {
        const content = JSON.parse(event.content);
        console.log(`      📝 Titel: ${content.title || 'N/A'}`);
        console.log(`      💰 Betrag: ${content.amount || 'N/A'} ${content.currency || ''}`);
        console.log(`      📍 Ort: ${content.location || 'N/A'}`);
      } catch (e) {
        console.log(`      ⚠️ Content nicht parsebar`);
      }
    });

    // 2. Interesse-Signale (Kind 30078) - NEU!
    console.log('\n\n💌 Suche nach Interesse-Signalen (Kind 30078)...');
    const interests = await pool.querySync([RELAY], {
      kinds: [30078],
      since: HOURS_AGO,
      limit: 20
    });

    console.log(`   ✅ Gefunden: ${interests.length} Interesse-Signale (verschlüsselt)`);
    interests.forEach(event => {
      const dTag = event.tags.find(t => t[0] === 'd')?.[1] || 'kein d-tag';
      const pTag = event.tags.find(t => t[0] === 'p')?.[1];
      
      console.log(`\n   💌 Interesse-Signal:`);
      console.log(`      ID: ${event.id.substring(0, 16)}...`);
      console.log(`      d-Tag: ${dTag}`);
      console.log(`      Von: ${event.pubkey.substring(0, 16)}...`);
      console.log(`      An: ${pTag ? pTag.substring(0, 16) + '...' : 'N/A'}`);
      console.log(`      Alter: ${formatAge(event.created_at)}`);
      console.log(`      🔒 Content: [NIP-04 verschlüsselt]`);
    });

    // 3. Absage-Nachrichten (Kind 30079) - NEU!
    console.log('\n\n❌ Suche nach Absage-Nachrichten (Kind 30079)...');
    const rejections = await pool.querySync([RELAY], {
      kinds: [30079],
      since: HOURS_AGO,
      limit: 20
    });

    console.log(`   ✅ Gefunden: ${rejections.length} Absagen (verschlüsselt)`);
    rejections.forEach(event => {
      const dTag = event.tags.find(t => t[0] === 'd')?.[1] || 'kein d-tag';
      const pTag = event.tags.find(t => t[0] === 'p')?.[1];
      
      console.log(`\n   ❌ Absage:`);
      console.log(`      ID: ${event.id.substring(0, 16)}...`);
      console.log(`      d-Tag: ${dTag}`);
      console.log(`      Von: ${event.pubkey.substring(0, 16)}...`);
      console.log(`      An: ${pTag ? pTag.substring(0, 16) + '...' : 'N/A'}`);
      console.log(`      Alter: ${formatAge(event.created_at)}`);
      console.log(`      🔒 Content: [NIP-04 verschlüsselt]`);
    });

    // 4. NIP-17 Gift-Wrapped Messages (Kind 1059) - NEU!
    console.log('\n\n🎁 Suche nach NIP-17 Gift-Wrapped Messages (Kind 1059)...');
    const giftWrapped = await pool.querySync([RELAY], {
      kinds: [1059],
      since: HOURS_AGO,
      limit: 20
    });

    console.log(`   ✅ Gefunden: ${giftWrapped.length} Gift-Wrapped Messages`);
    giftWrapped.forEach(event => {
      const pTag = event.tags.find(t => t[0] === 'p')?.[1];
      
      console.log(`\n   🎁 Gift-Wrapped Message:`);
      console.log(`      ID: ${event.id.substring(0, 16)}...`);
      console.log(`      Von: ${event.pubkey.substring(0, 16)}...`);
      console.log(`      An: ${pTag ? pTag.substring(0, 16) + '...' : 'N/A'}`);
      console.log(`      Alter: ${formatAge(event.created_at)}`);
      console.log(`      🔒 Content: [NIP-17 verschlüsselt]`);
    });

    // 5. Deletion Events (Kind 5)
    console.log('\n\n🗑️ Suche nach Lösch-Events (Kind 5)...');
    const deletions = await pool.querySync([RELAY], {
      kinds: [5],
      since: HOURS_AGO,
      limit: 20
    });
    
    console.log(`   ✅ Gefunden: ${deletions.length} Deletion Events`);
    deletions.forEach(event => {
      const eTags = event.tags.filter(t => t[0] === 'e');
      const aTags = event.tags.filter(t => t[0] === 'a');
      
      console.log(`\n   🗑️ Deletion Event:`);
      console.log(`      ID: ${event.id.substring(0, 16)}...`);
      console.log(`      Author: ${event.pubkey.substring(0, 16)}...`);
      console.log(`      Alter: ${formatAge(event.created_at)}`);
      
      if (eTags.length > 0) {
        console.log(`      Löscht Events (e-tags):`);
        eTags.forEach(tag => {
          console.log(`        - ${tag[1].substring(0, 16)}...`);
        });
      }
      
      if (aTags.length > 0) {
        console.log(`      Löscht Addressable Events (a-tags):`);
        aTags.forEach(tag => {
          console.log(`        - ${tag[1]}`);
        });
      }
    });

    // 6. Alte NIP-04 DMs (Kind 4) - Deprecated, aber noch vorhanden
    console.log('\n\n💬 Suche nach alten NIP-04 DMs (Kind 4)...');
    const oldDMs = await pool.querySync([RELAY], {
      kinds: [4],
      since: HOURS_AGO,
      limit: 10
    });
    
    console.log(`   ✅ Gefunden: ${oldDMs.length} alte DMs (deprecated)`);
    if (oldDMs.length > 0) {
      console.log(`   ⚠️ Hinweis: Diese sollten durch NIP-17 (Kind 1059) ersetzt werden!`);
      oldDMs.forEach(event => {
        const pTag = event.tags.find(t => t[0] === 'p')?.[1];
        console.log(`\n   💬 Alte DM:`);
        console.log(`      ID: ${event.id.substring(0, 16)}...`);
        console.log(`      Von: ${event.pubkey.substring(0, 16)}...`);
        console.log(`      An: ${pTag ? pTag.substring(0, 16) + '...' : 'N/A'}`);
        console.log(`      Alter: ${formatAge(event.created_at)}`);
      });
    }

    // 7. GroupConfig & Whitelist (Kind 30000 mit spezifischen d-tags)
    console.log('\n\n🏗️ Suche nach GroupConfig & Whitelist...');
    const configs = await pool.querySync([RELAY], {
      kinds: [30000],
      since: HOURS_AGO,
      limit: 20
    });

    const groupConfigs = configs.filter(e => {
      const dTag = e.tags.find(t => t[0] === 'd')?.[1] || '';
      return dTag.startsWith('group-config-');
    });

    const whitelists = configs.filter(e => {
      const dTag = e.tags.find(t => t[0] === 'd')?.[1] || '';
      return dTag.startsWith('whitelist-');
    });

    console.log(`   ✅ Gefunden: ${groupConfigs.length} GroupConfigs, ${whitelists.length} Whitelists`);
    
    groupConfigs.forEach(event => {
      const dTag = event.tags.find(t => t[0] === 'd')?.[1];
      console.log(`\n   🏗️ GroupConfig:`);
      console.log(`      ID: ${event.id.substring(0, 16)}...`);
      console.log(`      d-Tag: ${dTag}`);
      console.log(`      Author: ${event.pubkey.substring(0, 16)}...`);
      console.log(`      Alter: ${formatAge(event.created_at)}`);
    });

    whitelists.forEach(event => {
      const dTag = event.tags.find(t => t[0] === 'd')?.[1];
      console.log(`\n   🔐 Whitelist:`);
      console.log(`      ID: ${event.id.substring(0, 16)}...`);
      console.log(`      d-Tag: ${dTag}`);
      console.log(`      Author: ${event.pubkey.substring(0, 16)}...`);
      console.log(`      Alter: ${formatAge(event.created_at)}`);
      
      try {
        const content = JSON.parse(event.content);
        const pubkeys = Array.isArray(content.pubkeys) ? content.pubkeys : [];
        console.log(`      👥 Mitglieder: ${pubkeys.length}`);
        if (content.admin_pubkey || content.admin) {
          console.log(`      👑 Admin: ${(content.admin_pubkey || content.admin).substring(0, 16)}...`);
        }
      } catch (e) {
        console.log(`      ⚠️ Content nicht parsebar`);
      }
    });

    // Zusammenfassung
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 ZUSAMMENFASSUNG');
    console.log('='.repeat(60));
    console.log(`📦 Marketplace-Angebote (Kind 30000): ${offers.length}`);
    console.log(`💌 Interesse-Signale (Kind 30078): ${interests.length}`);
    console.log(`❌ Absagen (Kind 30079): ${rejections.length}`);
    console.log(`🎁 Gift-Wrapped Messages (Kind 1059): ${giftWrapped.length}`);
    console.log(`🗑️ Deletion Events (Kind 5): ${deletions.length}`);
    console.log(`💬 Alte DMs (Kind 4): ${oldDMs.length} ${oldDMs.length > 0 ? '⚠️' : ''}`);
    console.log(`🏗️ GroupConfigs: ${groupConfigs.length}`);
    console.log(`🔐 Whitelists: ${whitelists.length}`);
    console.log('='.repeat(60));
    
    console.log('\n✅ Query abgeschlossen!\n');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    pool.close([RELAY]);
  }
}

queryRelay();
