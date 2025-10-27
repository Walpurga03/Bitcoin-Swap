#!/usr/bin/env node

/**
 * Relay Query Tool
 * Fragt Events direkt vom Relay ab
 */

import { SimplePool } from 'nostr-tools/pool';

const RELAY = 'wss://nostr-relay.online';
const CHANNEL_ID = '3f36f54993fab8ac36099f0dcf2136aad34a20275b8990d1ee4538ab4adf0f7b'; // Deine aktuelle Channel-ID

// Zeitfilter: Nur Events der letzten zwei Stunden
const HOURS_AGO = Math.floor(Date.now() / 1000) - (1 * 60 * 60);

async function queryRelay() {
  console.log('🔍 Verbinde zu Relay:', RELAY);
  console.log('⏰ Zeige nur Events seit:', new Date(HOURS_AGO * 1000).toLocaleString('de-DE'));
  console.log('');
  
  const pool = new SimplePool();
  
  try {
    // 1. Query für GroupConfig & Whitelist (Kind 30000)
    console.log('\n🎯 Suche nach GroupConfig & Whitelist (Kind 30000)...');
    const configs = await pool.querySync([RELAY], {
      kinds: [30000],
      since: HOURS_AGO,
      limit: 20
    });

    console.log(`   Gefunden: ${configs.length} Config Events (letzte Stunden)`);
    configs.forEach(event => {
      const age = Math.floor((Date.now() / 1000 - event.created_at) / 60);
      const dTag = event.tags.find(t => t[0] === 'd')?.[1] || 'kein d-tag';
      const tTag = event.tags.find(t => t[0] === 't')?.[1] || 'kein t-tag';
      const isGroupConfig = dTag.startsWith('group-config-');
      const isWhitelist = dTag.startsWith('whitelist-');

      console.log(`   - ${isGroupConfig ? '🏗️ GroupConfig' : isWhitelist ? '🔐 Whitelist' : '❓ Unbekannt'}`);
      console.log(`     ID: ${event.id.substring(0, 16)}...`);
      console.log(`     d-Tag: ${dTag.substring(0, 30)}${dTag.length > 30 ? '...' : ''}`);
      if (tTag !== 'kein t-tag') console.log(`     t-Tag: ${tTag}`);
      console.log(`     Author: ${event.pubkey.substring(0, 16)}...`);
      console.log(`     Alter: ${age} Minuten`);
      console.log(`     Created: ${new Date(event.created_at * 1000).toLocaleString('de-DE')}`);

      // Whitelist-Details anzeigen
      if (isWhitelist) {
        try {
          const content = JSON.parse(event.content);
          const pubkeys = Array.isArray(content.pubkeys) ? content.pubkeys : [];
          const admin = content.admin_pubkey || content.admin || null;
          if (admin) {
            console.log(`     👑 Admin: ${admin.substring(0, 16)}...`);
          }
          console.log(`     👥 Whitelist-Mitglieder: ${pubkeys.length}`);
          pubkeys.forEach((npub, idx) => {
            console.log(`       ${idx + 1}. ${npub.substring(0, 16)}...`);
          });
        } catch (e) {
          console.log('     ⚠️ Fehler beim Parsen der Whitelist:', e.message);
        }
      }
    });
    
    // 2. Query für Marketplace-Angebote (Kind 42)
    console.log('\n📦 Suche nach Angeboten (Kind 42)...');
    const offers = await pool.querySync([RELAY], {
      kinds: [42],
      '#e': [CHANNEL_ID],
      since: HOURS_AGO,
      limit: 10
    });

    console.log(`   Gefunden: ${offers.length} Angebote (letzte Stunden)`);
    offers.forEach(event => {
      const age = Math.floor((Date.now() / 1000 - event.created_at) / 60);
      console.log(`   - ID: ${event.id.substring(0, 16)}...`);
      console.log(`     Content: ${event.content.substring(0, 50)}...`);
      console.log(`     Alter: ${age} Minuten`);
      console.log(`     Created: ${new Date(event.created_at * 1000).toLocaleString('de-DE')}`);
    });
    
    // 3. Query für Deletion Events (Kind 5)
    console.log('\n🗑️ Suche nach Lösch-Events (Kind 5)...');
    const deletions = await pool.querySync([RELAY], {
      kinds: [5],
      '#e': offers.map(o => o.id),
      since: HOURS_AGO,
      limit: 10
    });
    
    console.log(`   Gefunden: ${deletions.length} Deletion Events (letzte Stunde)`);
    deletions.forEach(event => {
      const age = Math.floor((Date.now() / 1000 - event.created_at) / 60);
      console.log(`   - Löscht: ${event.tags.find(t => t[0] === 'e')?.[1]?.substring(0, 16)}...`);
      console.log(`     Author: ${event.pubkey.substring(0, 16)}...`);
      console.log(`     Alter: ${age} Minuten`);
    });
    
    // 4. Query für NIP-17 DMs (Kind 14)
    console.log('\n💬 Suche nach DMs (Kind 14)...');
    const dms = await pool.querySync([RELAY], {
      kinds: [14],
      since: HOURS_AGO,
      limit: 10
    });
    
    console.log(`   Gefunden: ${dms.length} DMs (verschlüsselt, letzte Stunde)`);
    dms.forEach(event => {
      const age = Math.floor((Date.now() / 1000 - event.created_at) / 60);
      console.log(`   - ID: ${event.id.substring(0, 16)}... | Alter: ${age} Min`);
    });
    
    // 5. Query für Interest Events (Kind 30078)
    console.log('\n💌 Suche nach Interest Events (Kind 30078)...');
    const interests = await pool.querySync([RELAY], {
      kinds: [30078],
      since: HOURS_AGO,
      limit: 10
    });
    
    console.log(`   Gefunden: ${interests.length} Interest Events (letzte Stunde)`);
    interests.forEach(event => {
      const age = Math.floor((Date.now() / 1000 - event.created_at) / 60);
      console.log(`   - ID: ${event.id.substring(0, 16)}... | Alter: ${age} Min`);
    });
    
    // 6. Query für Deal-Rooms (Kind 30080)
    console.log('\n🤝 Suche nach Deal-Rooms (Kind 30080)...');
    const dealRooms = await pool.querySync([RELAY], {
      kinds: [30080],
      '#t': ['bitcoin-deal'],
      since: HOURS_AGO,
      limit: 10
    });
    
    console.log(`   Gefunden: ${dealRooms.length} Deal-Rooms (letzte Stunde)`);
    dealRooms.forEach(event => {
      const age = Math.floor((Date.now() / 1000 - event.created_at) / 60);
      console.log(`   - ID: ${event.id.substring(0, 16)}... | Alter: ${age} Min`);
    });
    
    console.log('\n✅ Query abgeschlossen!\n');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    pool.close([RELAY]);
  }
}

queryRelay();
