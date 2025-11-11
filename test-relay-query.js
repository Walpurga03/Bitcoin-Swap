#!/usr/bin/env node

/**
 * Relay Query Tool - AKTUELLER STAND (10. Nov 2025) 🎭
 * Zeigt NUR die Event-Kinds die WIRKLICH implementiert & aktiv sind!
 * 
 * 🎭 VOLLSTÄNDIGE ANONYMITÄT:
 * - Alle Angebote & Interesse-Signale sind KOMPLETT ANONYM!
 * - Events signiert mit temp-pubkeys (deterministisch aus Secret)
 * - Echte Identitäten NUR verschlüsselt im Content
 * - Auf Relay: Niemand sieht WER Angebot erstellt oder Interesse zeigt!
 * 
 * 📋 AKTIV IMPLEMENTIERTE EVENT-KINDS:
 * 
 * MARKETPLACE (Anonym):
 * - Kind 42: Marketplace-Angebote - 🎭 TEMP-PUBKEY (72h Expiration)
 * - Kind 30078: Interesse-Signale - 🎭 TEMP-PUBKEY (NIP-04 verschlüsselt)
 * 
 * GRUPPEN-VERWALTUNG:
 * - Kind 30000: GroupConfig (Relay, Admin-Pubkey, Secret-Hash)
 * - Kind 30000: Whitelist (Erlaubte User-Pubkeys)
 * - Kind 0: User-Profile (Name, Display-Name, NIP-05)
 * 
 * ⏳ NOCH NICHT IMPLEMENTIERT (werden nicht angezeigt):
 * - Kind 30081: Deal-Status Updates (geplant)
 * - Kind 5: Deletion Events (geplant)
 * 
 * ❌ NICHT MEHR GENUTZT (gelöscht im Code-Cleanup):
 * - Kind 30079: Absage-Nachrichten (war Teil von offerSelection.ts - gelöscht!)
 * - Kind 1059: NIP-17 Gift-Wrapped Messages (war Teil des Chat-Systems - gelöscht!)
 * - Kind 4: Alte NIP-04 DMs (deprecated, nie verwendet)
 */

import { SimplePool } from 'nostr-tools/pool';

// ============================================================
// KONFIGURATION - Hier kannst du die Einstellungen anpassen
// ============================================================

// Relay-URL
const RELAY = 'wss://nostr-relay.online';

// Channel-ID (SHA-256 Hash des Gruppen-Secrets)
const CHANNEL_ID = '1ff9850352a21c9b1d1d72d9fb5a059d5efb18460ce08873c0b9fe5348205c0a';

// Optional: Secret-Hash deiner Gruppe (wird als #g Tag verwendet)
// Wenn du den Hash nicht kennst, setze auf null und das Script zeigt alle Angebote
const SECRET_HASH = null; // z.B. 'abc123...' oder null für alle

// Zeitfilter: Wie viele Stunden zurück sollen Events angezeigt werden?
const HOURS_TO_SHOW = 100; // Ändere diese Zahl, um mehr/weniger Events zu sehen

// Nur gefüllte Sektionen anzeigen?
const HIDE_EMPTY_SECTIONS = true; // true = nur Sektionen mit Inhalt anzeigen

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
  console.log('🎭 RELAY QUERY TOOL - Bitcoin-Tausch-Netzwerk (ANONYM)');
  console.log('='.repeat(60));
  console.log('📡 Relay:', RELAY);
  console.log('⏰ Zeitfilter: Letzte', HOURS_TO_SHOW, 'Stunde(n)');
  console.log('📅 Zeige Events seit:', formatDate(HOURS_AGO));
  console.log('📍 Channel-ID:', CHANNEL_ID.substring(0, 16) + '...');
  if (SECRET_HASH) {
    console.log('🔐 Secret-Hash:', SECRET_HASH.substring(0, 16) + '...');
  }
  console.log('🎭 ANONYMITÄT: Temp-Pubkeys für Angebote & Interessen!');
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

    // Zeige Marketplace-Angebote (nur wenn vorhanden oder nicht im Hide-Modus)
    if (!HIDE_EMPTY_SECTIONS || activeOffers.length > 0) {
      console.log('\n\n📦 MARKETPLACE-ANGEBOTE (Kind 42) - 🎭 ANONYM');
      console.log('   ' + '='.repeat(55));
      console.log(`   🎭 ANONYMITÄT: Angebote mit temp-pubkeys signiert!`);
      console.log(`   🔒 Echter Author in 'author' Tag (nur für NIP-17)`);
    }
    
    if (activeOffers.length === 0) {
      if (!HIDE_EMPTY_SECTIONS) {
        console.log(`   ℹ️ Keine aktiven Marketplace-Angebote gefunden`);
        if (allOffers.length > 0) {
          console.log(`   ⏰ ${expiredOffers} abgelaufene Angebote wurden gefiltert`);
        } else {
          console.log(`   💡 Hinweis: Erstelle ein Angebot in der App, um es hier zu sehen`);
        }
      }
    } else {
      activeOffers.forEach((event, idx) => {
        const expirationTag = event.tags.find(t => t[0] === 'expiration');
        const authorTag = event.tags.find(t => t[0] === 'author');
        const gTag = event.tags.find(t => t[0] === 'g');
        
        console.log(`\n   📦 Angebot ${idx + 1}:`);
        console.log(`      Event-ID: ${event.id.substring(0, 16)}...`);
        console.log(`      🎭 TEMP-Pubkey: ${event.pubkey.substring(0, 16)}... (NICHT der echte Ersteller!)`);
        if (authorTag) {
          console.log(`      👤 Echter Author: ${authorTag[1].substring(0, 16)}... (für NIP-17 DMs)`);
        }
        if (gTag) {
          console.log(`      🔐 Group-Hash: ${gTag[1].substring(0, 16)}...`);
        }
        console.log(`      📅 Erstellt: ${formatDate(event.created_at)} (${formatAge(event.created_at)} alt)`);
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
    // 2. INTERESSE-SIGNALE (Kind 30078) - VOLLSTÄNDIG ANONYM! 🎭
    // ============================================================
    const interests = await pool.querySync([RELAY], {
      kinds: [30078],
      since: HOURS_AGO,
      limit: 50
    });
    
    if (!HIDE_EMPTY_SECTIONS || interests.length > 0) {
      console.log('\n\n💌 INTERESSE-SIGNALE (Kind 30078) - 🎭 ANONYM');
      console.log('   ' + '='.repeat(55));
      console.log(`   ✅ Gefunden: ${interests.length} Interesse-Signale`);
      console.log(`   🎭 ANONYMITÄT: Events mit temp-pubkeys signiert!`);
      console.log(`   🔒 Echte Pubkeys nur verschlüsselt im Content`);
      console.log(`   👁️ Nur Anbieter kann entschlüsseln`);
    }
    
    if (interests.length === 0) {
      if (!HIDE_EMPTY_SECTIONS) {
        console.log(`   ℹ️ Keine Interesse-Signale gefunden`);
        console.log(`   💡 Zeige Interesse an einem Angebot, um es hier zu sehen`);
      }
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
          console.log(`      🔑 Angebots-Pubkey (temp): ${offer.pubkey.substring(0, 16)}...`);
        } else {
          console.log(`      ⚠️ Angebot nicht mehr aktiv oder nicht gefunden`);
        }
        console.log(`      💌 ${signals.length} Interessent(en) (ANONYM!):\n`);
        
        signals.forEach((event, idx) => {
          const dTag = event.tags.find(t => t[0] === 'd')?.[1] || 'kein d-tag';
          const pTag = event.tags.find(t => t[0] === 'p')?.[1];
          const tTag = event.tags.find(t => t[0] === 't')?.[1];
          
          console.log(`         ${idx + 1}. 🎭 ANONYMER Interessent:`);
          console.log(`            Event-ID: ${event.id.substring(0, 16)}...`);
          console.log(`            🎭 TEMP-Pubkey: ${event.pubkey.substring(0, 16)}... (NICHT der echte!)`);
          console.log(`            📌 p-Tag: ${pTag ? pTag.substring(0, 16) + '...' : '❌ KEIN p-Tag (Privatsphäre!)'}`);
          console.log(`            🏷️ Tag: ${tTag || 'N/A'}`);
          console.log(`            📅 Erstellt: ${formatDate(event.created_at)} (${formatAge(event.created_at)} alt)`);
          console.log(`            🔒 Content: [NIP-04 verschlüsselt - echter pubkey darin versteckt]`);
          console.log(`            � Nur Anbieter mit Angebots-Secret kann entschlüsseln!`);
          if (idx < signals.length - 1) console.log('');
        });
        console.log('');
      }
    }

    // ============================================================
    // 3. USER-PROFILE (Kind 0) - Öffentliche Profile
    // ============================================================
    // 3. USER-PROFILE (Kind 0) - Öffentliche Profile
    // ============================================================
    const profiles = await pool.querySync([RELAY], {
      kinds: [0],
      since: HOURS_AGO,
      limit: 20
    });
    
    if (!HIDE_EMPTY_SECTIONS || profiles.length > 0) {
      console.log('\n\n👤 USER-PROFILE (Kind 0) - ÖFFENTLICH');
      console.log('   ' + '='.repeat(55));
      console.log(`   ✅ Gefunden: ${profiles.length} User-Profile`);
      console.log(`   📝 Enthält: Name, Display-Name, NIP-05, etc.`);
    }
    
    if (profiles.length > 0) {
      profiles.forEach((event, idx) => {
        try {
          const content = JSON.parse(event.content);
          console.log(`\n   👤 Profil ${idx + 1}:`);
          console.log(`      Event-ID: ${event.id.substring(0, 16)}...`);
          console.log(`      Pubkey: ${event.pubkey.substring(0, 16)}...`);
          console.log(`      📅 Erstellt: ${formatDate(event.created_at)} (${formatAge(event.created_at)} alt)`);
          
          if (content.name) console.log(`      👤 Name: ${content.name}`);
          if (content.display_name) console.log(`      📛 Display-Name: ${content.display_name}`);
          if (content.nip05) console.log(`      ✅ NIP-05: ${content.nip05}`);
          if (content.about) console.log(`      📝 About: ${content.about.substring(0, 60)}${content.about.length > 60 ? '...' : ''}`);
          if (content.picture) console.log(`      🖼️ Picture: ${content.picture.substring(0, 50)}...`);
        } catch (e) {
          console.log(`\n   👤 Profil ${idx + 1}:`);
          console.log(`      ⚠️ Content nicht parsebar`);
        }
      });
    }

    // ============================================================
    // 4. KIND 30000 EVENTS (GroupConfig & Whitelist)
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
    // ZUSAMMENFASSUNG - NUR AKTIVE FEATURES
    // ============================================================
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 ZUSAMMENFASSUNG - AKTIV IMPLEMENTIERTE EVENTS');
    console.log('='.repeat(60));
    console.log('\n🎭 MARKETPLACE (Anonym):');
    console.log(`   📦 Marketplace-Angebote (Kind 42): ${activeOffers.length} aktiv${expiredOffers > 0 ? `, ${expiredOffers} abgelaufen` : ''}`);
    console.log(`   💌 Interesse-Signale (Kind 30078): ${interests.length}`);
    
    console.log('\n🏗️ GRUPPEN-VERWALTUNG:');
    console.log(`   🏗️ GroupConfigs (Kind 30000): ${currentGroupConfigs.length}`);
    console.log(`   🔐 Whitelists (Kind 30000): ${whitelists.length}`);
    console.log(`   👤 User-Profile (Kind 0): ${profiles.length}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 TOTAL EVENTS: ' + (activeOffers.length + interests.length + currentGroupConfigs.length + whitelists.length + profiles.length));
    console.log('='.repeat(60));
    
    console.log('\n✅ Query abgeschlossen!\n');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    pool.close([RELAY]);
  }
}

queryRelay();
