#!/usr/bin/env node

/**
 * Relay Query Tool - Aktualisiert für neues Secret-System
 * Überwacht alle Event-Kinds die zum Relay gesendet werden
 * 
 * Event-Kinds:
 * - Kind 42: Marketplace-Angebote (Channel Messages)
 * - Kind 30000: GroupConfig & Whitelist (Addressable Events)
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
const CHANNEL_ID = 'aec6fa9bd7d9ed3354cc5f1917d92ec8a5cd72cacca0540eeb6bea8813cfb991';

// Optional: Secret-Hash deiner Gruppe (wird als #g Tag verwendet)
// Wenn du den Hash nicht kennst, setze auf null und das Script zeigt alle Angebote
const SECRET_HASH = null; // z.B. 'abc123...' oder null für alle

// Zeitfilter: Wie viele Stunden zurück sollen Events angezeigt werden?
const HOURS_TO_SHOW = 0.1; // Ändere diese Zahl, um mehr/weniger Events zu sehen

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
  if (SECRET_HASH) {
    console.log('🔐 Secret-Hash:', SECRET_HASH.substring(0, 16) + '...');
  }
  console.log('='.repeat(60) + '\n');
  
  const pool = new SimplePool();
  
  try {
    // ============================================================
    // 1. MARKETPLACE-ANGEBOTE (Kind 42 - Channel Messages)
    // ============================================================
    console.log('\n📦 Lade Marketplace-Angebote (Kind 42)...');
    
    const filter = {
      kinds: [42],
      '#e': [CHANNEL_ID],
      since: HOURS_AGO,
      limit: 100
    };
    
    // Optional: Filtere nach Secret-Hash
    if (SECRET_HASH) {
      filter['#g'] = [SECRET_HASH];
    }
    
    const allOffers = await pool.querySync([RELAY], filter);
    
    console.log(`   📊 Gesamt gefunden: ${allOffers.length} Marketplace-Angebote`);
    
    // Filtere abgelaufene Angebote
    const now = Math.floor(Date.now() / 1000);
    const activeOffers = allOffers.filter(event => {
      const expirationTag = event.tags.find(t => t[0] === 'expiration');
      if (!expirationTag) return true; // Kein Expiration-Tag = aktiv
      const expiresAt = parseInt(expirationTag[1]);
      return now <= expiresAt;
    });
    
    const expiredOffers = allOffers.length - activeOffers.length;
    
    console.log(`   ✅ Aktive Angebote: ${activeOffers.length}`);
    if (expiredOffers > 0) {
      console.log(`   ⏰ Abgelaufene Angebote: ${expiredOffers}`);
    }

    // Zeige Marketplace-Angebote
    console.log('\n\n📦 MARKETPLACE-ANGEBOTE (Kind 42 - Channel Messages)');
    console.log('   ' + '='.repeat(55));
    
    if (activeOffers.length === 0) {
      console.log(`   ℹ️ Keine aktiven Marketplace-Angebote gefunden`);
      if (allOffers.length > 0) {
        console.log(`   ⏰ ${expiredOffers} abgelaufene Angebote wurden gefiltert`);
      } else {
        console.log(`   💡 Hinweis: Erstelle ein Angebot in der App, um es hier zu sehen`);
      }
    } else {
      activeOffers.forEach((event, idx) => {
        const expirationTag = event.tags.find(t => t[0] === 'expiration');
        const authorTag = event.tags.find(t => t[0] === 'author');
        const gTag = event.tags.find(t => t[0] === 'g');
        
        console.log(`\n   📦 Angebot ${idx + 1}:`);
        console.log(`      ID: ${event.id.substring(0, 16)}...`);
        console.log(`      Temp-Pubkey: ${event.pubkey.substring(0, 16)}...`);
        if (authorTag) {
          console.log(`      👤 Echter Author: ${authorTag[1].substring(0, 16)}...`);
        }
        if (gTag) {
          console.log(`      🔐 Group-Hash: ${gTag[1].substring(0, 16)}...`);
        }
        console.log(`      📅 Erstellt: ${formatDate(event.created_at)}`);
        console.log(`      ⏰ Alter: ${formatAge(event.created_at)}`);
        if (expirationTag) {
          const expiresAt = parseInt(expirationTag[1]);
          const remaining = expiresAt - now;
          const hours = Math.floor(remaining / 3600);
          const minutes = Math.floor((remaining % 3600) / 60);
          console.log(`      ⏳ Läuft ab in: ${hours}h ${minutes}min`);
          console.log(`      📆 Expiration: ${formatDate(expiresAt)}`);
        }
        console.log(`      📝 Inhalt: ${event.content.substring(0, 100)}${event.content.length > 100 ? '...' : ''}`);
      });
    }

    // ============================================================
    // 2. INTERESSE-SIGNALE (Kind 30078)
    // ============================================================
    console.log('\n\n💌 INTERESSE-SIGNALE (Kind 30078)');
    console.log('   ' + '='.repeat(55));
    const interests = await pool.querySync([RELAY], {
      kinds: [30078],
      since: HOURS_AGO,
      limit: 50
    });

    console.log(`   ✅ Gefunden: ${interests.length} Interesse-Signale (verschlüsselt)`);
    
    if (interests.length === 0) {
      console.log(`   ℹ️ Keine Interesse-Signale gefunden`);
      console.log(`   💡 Zeige Interesse an einem Angebot, um es hier zu sehen`);
    } else {
      // Gruppiere Interesse-Signale nach Angebot (e-Tag)
      const interestsByOffer = new Map();
      
      interests.forEach(event => {
        const eTag = event.tags.find(t => t[0] === 'e')?.[1];
        if (eTag) {
          if (!interestsByOffer.has(eTag)) {
            interestsByOffer.set(eTag, []);
          }
          interestsByOffer.get(eTag).push(event);
        }
      });
      
      console.log(`\n   📊 Interesse-Signale gruppiert nach ${interestsByOffer.size} Angebot(en):\n`);
      
      // Zeige Interesse-Signale gruppiert nach Angebot
      for (const [offerId, signals] of interestsByOffer.entries()) {
        // Finde das zugehörige Angebot
        const offer = activeOffers.find(o => o.id === offerId);
        
        console.log(`   📦 Angebot: ${offerId.substring(0, 16)}...`);
        if (offer) {
          console.log(`      📝 "${offer.content.substring(0, 50)}${offer.content.length > 50 ? '...' : ''}"`);
        } else {
          console.log(`      ⚠️ Angebot nicht mehr aktiv oder nicht gefunden`);
        }
        console.log(`      💌 ${signals.length} Interessent(en):\n`);
        
        signals.forEach((event, idx) => {
          const dTag = event.tags.find(t => t[0] === 'd')?.[1] || 'kein d-tag';
          const pTag = event.tags.find(t => t[0] === 'p')?.[1];
          const tTag = event.tags.find(t => t[0] === 't')?.[1];
          
          console.log(`         ${idx + 1}. Interessent:`);
          console.log(`            ID: ${event.id.substring(0, 16)}...`);
          console.log(`            Von: ${event.pubkey.substring(0, 16)}...`);
          console.log(`            An: ${pTag ? pTag.substring(0, 16) + '...' : 'N/A'}`);
          console.log(`            Tag: ${tTag || 'N/A'}`);
          console.log(`            Erstellt: ${formatDate(event.created_at)}`);
          console.log(`            Alter: ${formatAge(event.created_at)}`);
          console.log(`            🔒 Content: [NIP-04 verschlüsselt]`);
          if (idx < signals.length - 1) console.log('');
        });
        console.log('');
      }
    }

    // ============================================================
    // 3. ABSAGE-NACHRICHTEN (Kind 30079)
    // ============================================================
    console.log('\n\n❌ ABSAGE-NACHRICHTEN (Kind 30079)');
    console.log('   ' + '='.repeat(55));
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

    // ============================================================
    // 4. NIP-17 GIFT-WRAPPED MESSAGES (Kind 1059)
    // ============================================================
    console.log('\n\n🎁 NIP-17 GIFT-WRAPPED MESSAGES (Kind 1059)');
    console.log('   ' + '='.repeat(55));
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

    // ============================================================
    // 5. DELETION EVENTS (Kind 5)
    // ============================================================
    console.log('\n\n🗑️ DELETION EVENTS (Kind 5)');
    console.log('   ' + '='.repeat(55));
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

    // ============================================================
    // 6. ALTE NIP-04 DMs (Kind 4)
    // ============================================================
    console.log('\n\n💬 ALTE NIP-04 DMs (Kind 4 - DEPRECATED)');
    console.log('   ' + '='.repeat(55));
    const oldDMs = await pool.querySync([RELAY], {
      kinds: [4],
      since: HOURS_AGO,
      limit: 10
    });
    
    console.log(`   ✅ Gefunden: ${oldDMs.length} alte DMs`);
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

    // ============================================================
    // 7. KIND 30000 EVENTS (GroupConfig & Whitelist)
    // ============================================================
    console.log('\n\n🏗️ KIND 30000 EVENTS (GroupConfig & Whitelist)');
    console.log('   ' + '='.repeat(55));
    
    const kind30000Events = await pool.querySync([RELAY], {
      kinds: [30000],
      since: HOURS_AGO,
      limit: 100
    });
    
    console.log(`   📊 Gesamt gefunden: ${kind30000Events.length} Kind 30000 Events`);
    
    // Kategorisiere Events
    const groupConfigs = kind30000Events.filter(e => {
      const dTag = e.tags.find(t => t[0] === 'd')?.[1] || '';
      return dTag.startsWith('bitcoin-group-config:');
    });
    
    const whitelists = kind30000Events.filter(e => {
      const dTag = e.tags.find(t => t[0] === 'd')?.[1] || '';
      return dTag.startsWith('whitelist-');
    });
    
    // Filtere nach aktueller Channel-ID
    const currentGroupConfigs = groupConfigs.filter(e => {
      const dTag = e.tags.find(t => t[0] === 'd')?.[1] || '';
      return dTag.includes(CHANNEL_ID);
    });
    
    console.log(`   ✅ GroupConfigs (diese Gruppe): ${currentGroupConfigs.length}`);
    console.log(`   ✅ Whitelists: ${whitelists.length}`);
    
    // Zeige GroupConfigs
    if (currentGroupConfigs.length > 0) {
      currentGroupConfigs.forEach((event, idx) => {
        const dTag = event.tags.find(t => t[0] === 'd')?.[1] || 'kein d-Tag';
        
        console.log(`\n   🏗️ GroupConfig:`);
        console.log(`      ID: ${event.id.substring(0, 16)}...`);
        console.log(`      d-Tag: ${dTag}`);
        console.log(`      Author: ${event.pubkey.substring(0, 16)}...`);
        console.log(`      Alter: ${formatAge(event.created_at)}`);
      });
    }
    
    // Zeige Whitelists
    if (whitelists.length > 0) {
      whitelists.forEach((event, idx) => {
        const dTag = event.tags.find(t => t[0] === 'd')?.[1] || 'kein d-Tag';
        
        console.log(`\n   🔐 Whitelist:`);
        console.log(`      ID: ${event.id.substring(0, 16)}...`);
        console.log(`      d-Tag: ${dTag}`);
        console.log(`      Author: ${event.pubkey.substring(0, 16)}...`);
        console.log(`      Alter: ${formatAge(event.created_at)}`);
        
        // Parse Whitelist-Content
        try {
          const content = JSON.parse(event.content);
          const pubkeys = Array.isArray(content.pubkeys) ? content.pubkeys : [];
          const admin = content.admin_pubkey || content.admin || null;
          
          console.log(`      👥 Mitglieder: ${pubkeys.length}`);
          
          if (admin) {
            console.log(`      👑 Admin: ${admin.substring(0, 16)}...`);
          }
          
          // Zeige alle Whitelist-Mitglieder
          if (pubkeys.length > 0) {
            console.log(`\n      📋 Whitelist-Mitglieder:`);
            pubkeys.forEach((npub, idx) => {
              const isAdmin = admin && npub === admin;
              console.log(`         ${idx + 1}. ${npub.substring(0, 20)}...${npub.substring(npub.length - 8)} ${isAdmin ? '👑' : ''}`);
            });
          } else {
            console.log(`      ⚠️ Keine Mitglieder in der Whitelist`);
          }
        } catch (e) {
          console.log(`      ⚠️ Content nicht parsebar: ${e.message}`);
        }
      });
    }

    // ============================================================
    // ZUSAMMENFASSUNG
    // ============================================================
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 ZUSAMMENFASSUNG');
    console.log('='.repeat(60));
    console.log(`📦 Marketplace-Angebote (Kind 42): ${activeOffers.length} aktiv${expiredOffers > 0 ? `, ${expiredOffers} abgelaufen` : ''}`);
    console.log(`💌 Interesse-Signale (Kind 30078): ${interests.length}`);
    console.log(`❌ Absagen (Kind 30079): ${rejections.length}`);
    console.log(`🎁 Gift-Wrapped Messages (Kind 1059): ${giftWrapped.length}`);
    console.log(`🗑️ Deletion Events (Kind 5): ${deletions.length}`);
    console.log(`💬 Alte DMs (Kind 4): ${oldDMs.length}${oldDMs.length > 0 ? ' ⚠️' : ''}`);
    console.log(`🏗️ GroupConfigs: ${currentGroupConfigs.length}`);
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
