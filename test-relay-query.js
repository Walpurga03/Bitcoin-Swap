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
 * DEAL-ROOMS & BENACHRICHTIGUNGEN (NIP-17):
 * - Kind 1059: Gift Wrap - 🔐 NIP-17 verschlüsselte Nachrichten (Einladungen, Broadcasts, Chat)
 * - Kind 30081: Deal-Status Updates (pending/active/completed/cancelled)
 * 
 * GRUPPEN-VERWALTUNG:
 * - Kind 30000: GroupConfig (Relay, Admin-Pubkey, Secret-Hash)
 * - Kind 30000: Whitelist (Erlaubte User-Pubkeys)
 * - Kind 0: User-Profile (Name, Display-Name, NIP-05)
 * 
 * ⏳ GEPLANT:
 * - Kind 5: Deletion Events (Aufräumen alter Events)
 */

import { SimplePool } from 'nostr-tools/pool';

// ============================================================
// KONFIGURATION - Hier kannst du die Einstellungen anpassen
// ============================================================

// Relay-URL
const RELAY = 'wss://nostr-relay.online';

// Channel-ID (SHA-256 Hash des Gruppen-Secrets)
// ⚠️ WICHTIG: Trage hier deine aktuelle Channel-ID ein!
// Du findest sie in der Browser-Konsole oder im groupStore
const CHANNEL_ID = 'f47194428f379b988b9bc2e4739f0804ac30ccebebc88b77a103186f20f013f4';

// Optional: Secret-Hash deiner Gruppe (wird als #g Tag verwendet)
// Wenn du den Hash nicht kennst, setze auf null und das Script zeigt alle Angebote
const SECRET_HASH = null; // z.B. 'abc123...' oder null für alle

// Zeitfilter: Wie viele Minuten zurück sollen Events angezeigt werden?
const MINUTES_TO_SHOW = 10; // Standard: 30 Minuten (erweitert für Debugging)

// Nur gefüllte Sektionen anzeigen?
const HIDE_EMPTY_SECTIONS = true; // true = nur Sektionen mit Inhalt anzeigen

// Berechnung des Zeitstempels (nicht ändern)
const MINUTES_AGO = Math.floor(Date.now() / 1000) - (MINUTES_TO_SHOW * 60);

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
  console.log('⏰ Zeitfilter: Letzte', MINUTES_TO_SHOW, 'Minute(n)');
  console.log('📅 Zeige Events seit:', formatDate(MINUTES_AGO));
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
      since: MINUTES_AGO,
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
      since: MINUTES_AGO,
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
      
      // Zeige auch verwaiste Interesse-Signale (ohne e-Tag)
      const orphanedInterests = interests.filter(event => !event.tags.find(t => t[0] === 'e'));
      if (orphanedInterests.length > 0) {
        console.log(`   ⚠️ ${orphanedInterests.length} Interesse-Signal(e) OHNE Angebots-Verknüpfung (fehlt e-Tag)!\n`);
      }
      
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
      
      // Zeige verwaiste Interesse-Signale im Detail
      if (orphanedInterests.length > 0) {
        console.log(`\n   🗑️ VERWAISTE INTERESSE-SIGNALE (Details):\n`);
        orphanedInterests.forEach((event, idx) => {
          const dTag = event.tags.find(t => t[0] === 'd')?.[1] || 'kein d-tag';
          const pTag = event.tags.find(t => t[0] === 'p')?.[1];
          const tTag = event.tags.find(t => t[0] === 't')?.[1];
          
          console.log(`      ${idx + 1}. ⚠️ Verwaist:`);
          console.log(`         Event-ID: ${event.id.substring(0, 16)}...`);
          console.log(`         🎭 TEMP-Pubkey: ${event.pubkey.substring(0, 16)}...`);
          console.log(`         📅 Erstellt: ${formatDate(event.created_at)} (${formatAge(event.created_at)} alt)`);
          console.log(`         ❌ KEIN e-Tag (Angebots-ID fehlt!)`);
          if (pTag) console.log(`         📌 p-Tag: ${pTag.substring(0, 16)}...`);
          console.log('');
        });
      }
    }

    // ============================================================
    // 2b. DELETION EVENTS (Kind 5) - Gelöschte Events
    // ============================================================
    console.log('\n\n🗑️ DELETION EVENTS (Kind 5) - GELÖSCHTE EVENTS');
    console.log('   ' + '='.repeat(55));
    
    const deletionEvents = await pool.querySync([RELAY], {
      kinds: [5],
      since: MINUTES_AGO,
      limit: 100
    });
    
    console.log(`   📊 Gesamt gefunden: ${deletionEvents.length} Deletion Events`);
    
    if (deletionEvents.length > 0) {
      // Gruppiere nach gelöschtem Event-Typ
      const deletedOffers = deletionEvents.filter(e => e.tags.some(t => t[0] === 'k' && t[1] === '42'));
      const deletedInterests = deletionEvents.filter(e => e.tags.some(t => t[0] === 'k' && t[1] === '30078'));
      const deletedOthers = deletionEvents.filter(e => 
        !e.tags.some(t => t[0] === 'k' && (t[1] === '42' || t[1] === '30078'))
      );
      
      console.log(`\n   📊 NACH TYP:`);
      console.log(`      🗑️ Gelöschte Angebote (Kind 42): ${deletedOffers.length}`);
      console.log(`      🗑️ Gelöschte Interesse-Signale (Kind 30078): ${deletedInterests.length}`);
      if (deletedOthers.length > 0) {
        console.log(`      🗑️ Andere: ${deletedOthers.length}`);
      }
      
      if (deletedOffers.length > 0) {
        console.log(`\n   📋 GELÖSCHTE ANGEBOTE:\n`);
        deletedOffers.forEach((event, idx) => {
          const eTag = event.tags.find(t => t[0] === 'e')?.[1];
          console.log(`      ${idx + 1}. 🗑️ Deletion Event:`);
          console.log(`         Event-ID: ${event.id.substring(0, 16)}...`);
          console.log(`         Author: ${event.pubkey.substring(0, 16)}...`);
          console.log(`         Gelöschtes Event: ${eTag ? eTag.substring(0, 16) + '...' : 'N/A'}`);
          console.log(`         📅 Gelöscht: ${formatDate(event.created_at)} (${formatAge(event.created_at)} alt)`);
          console.log(`         📝 Grund: ${event.content || 'Kein Grund angegeben'}`);
          console.log('');
        });
      }
      
      if (deletedInterests.length > 0) {
        console.log(`\n   📋 GELÖSCHTE INTERESSE-SIGNALE:\n`);
        deletedInterests.forEach((event, idx) => {
          const eTag = event.tags.find(t => t[0] === 'e')?.[1];
          console.log(`      ${idx + 1}. 🗑️ Deletion Event:`);
          console.log(`         Event-ID: ${event.id.substring(0, 16)}...`);
          console.log(`         Author: ${event.pubkey.substring(0, 16)}...`);
          console.log(`         Gelöschtes Signal: ${eTag ? eTag.substring(0, 16) + '...' : 'N/A'}`);
          console.log(`         📅 Gelöscht: ${formatDate(event.created_at)} (${formatAge(event.created_at)} alt)`);
          console.log(`         📝 Grund: ${event.content || 'Kein Grund angegeben'}`);
          console.log('');
        });
      }
    }

    // ============================================================
    // 3. USER-PROFILE (Kind 0) - Öffentliche Profile
    // ============================================================
    // 3. USER-PROFILE (Kind 0) - Öffentliche Profile
    // ============================================================
    const profiles = await pool.querySync([RELAY], {
      kinds: [0],
      since: MINUTES_AGO,
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
    // 4. NIP-17 GIFT WRAP EVENTS (Kind 1059) - Verschlüsselte Nachrichten
    // ============================================================
    console.log('\n\n🎁 NIP-17 GIFT WRAP EVENTS (Kind 1059) - ANONYME BENACHRICHTIGUNGEN');
    console.log('   ' + '='.repeat(55));
    
    const giftWraps = await pool.querySync([RELAY], {
      kinds: [1059],
      since: MINUTES_AGO,
      limit: 200
    });
    
    console.log(`   📊 Gesamt gefunden: ${giftWraps.length} Gift Wrap Events`);
    console.log(`   🔐 VOLLSTÄNDIG VERSCHLÜSSELT: Niemand kann Inhalt lesen!`);
    console.log(`   🎭 Random-Pubkeys: Relay sieht NICHT wer sendet!`);
    console.log(`   📬 Nur p-Tag sichtbar: Zeigt Empfänger-Pubkey`);
    console.log(`   ⚖️ ANONYMITÄT: Alle Events haben identische Größe (Padding)!`);
    
    if (giftWraps.length === 0) {
      if (!HIDE_EMPTY_SECTIONS) {
        console.log(`   ℹ️ Keine Gift Wrap Events gefunden`);
        console.log(`   💡 Erstelle Deal-Einladungen oder sende Benachrichtigungen`);
      }
    } else {
      // Gruppiere nach Empfänger (p-Tag)
      const giftWrapsByRecipient = new Map();
      
      giftWraps.forEach(event => {
        const pTag = event.tags.find(t => t[0] === 'p')?.[1];
        if (pTag) {
          if (!giftWrapsByRecipient.has(pTag)) {
            giftWrapsByRecipient.set(pTag, []);
          }
          giftWrapsByRecipient.get(pTag).push(event);
        }
      });
      
      console.log(`\n   📊 Nachrichten verteilt an ${giftWrapsByRecipient.size} Empfänger:\n`);
      
      // Zeige Gift Wraps gruppiert nach Empfänger
      let recipientIdx = 1;
      for (const [recipientPubkey, wraps] of giftWrapsByRecipient.entries()) {
        console.log(`   📬 Empfänger ${recipientIdx}: ${recipientPubkey.substring(0, 16)}...`);
        console.log(`      📨 ${wraps.length} verschlüsselte Nachricht(en)\n`);
        
        wraps.forEach((event, idx) => {
          console.log(`         ${idx + 1}. 🎁 Gift Wrap:`);
          console.log(`            Event-ID: ${event.id.substring(0, 16)}...`);
          console.log(`            🎭 Random-Pubkey: ${event.pubkey.substring(0, 16)}... (NICHT der echte Sender!)`);
          console.log(`            📬 Empfänger: ${recipientPubkey.substring(0, 16)}...`);
          console.log(`            📅 Timestamp: ${formatDate(event.created_at)} (${formatAge(event.created_at)} alt)`);
          console.log(`            ⚠️ HINWEIS: Timestamp ist randomisiert (±2 Tage)!`);
          console.log(`            🔒 Content: [NIP-44 verschlüsselt - ${event.content.length} Zeichen]`);
          console.log(`            � Content-Größe: ${event.content.length} bytes`);
          console.log(`            �🔐 Mögliche Typen:`);
          console.log(`               • deal_finalized (role: partner/observer)`);
          console.log(`               • invitation (Chat-Einladung)`);
          console.log(`               • broadcast (Benachrichtigung)`);
          console.log(`            🔍 Nur Empfänger kann entschlüsseln!`);
          if (idx < wraps.length - 1) console.log('');
        });
        console.log('');
        recipientIdx++;
      }
      
      // ANONYMITÄTS-ANALYSE: Gruppiere nach Content-Größe
      const sizeGroups = new Map();
      giftWraps.forEach(event => {
        const size = event.content.length;
        if (!sizeGroups.has(size)) {
          sizeGroups.set(size, []);
        }
        sizeGroups.get(size).push(event);
      });
      
      console.log(`   ⚖️ ANONYMITÄTS-ANALYSE (Content-Größen):`);
      console.log(`      📊 ${sizeGroups.size} unterschiedliche Größe(n) gefunden:\n`);
      
      for (const [size, events] of Array.from(sizeGroups.entries()).sort((a, b) => b[1].length - a[1].length)) {
        const percentage = ((events.length / giftWraps.length) * 100).toFixed(1);
        console.log(`      📦 ${size} bytes: ${events.length} Events (${percentage}%)`);
        
        if (events.length >= 3) {
          console.log(`         ✅ ANONYM: ${events.length} identische Events - Partner nicht erkennbar!`);
        } else if (events.length === 2) {
          console.log(`         ⚠️ WARNUNG: Nur 2 Events - könnte auf Partner hindeuten`);
        } else {
          console.log(`         ❌ LEAK: Einzelnes Event - Empfänger ist auffällig!`);
        }
      }
      
      console.log(`\n   🕒 TIMING-ANALYSE (Zeitliche Verteilung):`);
      
      // Gruppiere nach 5-Sekunden-Intervallen
      const timeGroups = new Map();
      giftWraps.forEach(event => {
        const interval = Math.floor(event.created_at / 5) * 5; // 5-Sekunden-Intervalle
        if (!timeGroups.has(interval)) {
          timeGroups.set(interval, []);
        }
        timeGroups.get(interval).push(event);
      });
      
      const clusteredIntervals = Array.from(timeGroups.entries()).filter(([_, events]) => events.length >= 3);
      
      if (clusteredIntervals.length > 0) {
        console.log(`      📊 ${clusteredIntervals.length} Zeitfenster mit 3+ Events (verdächtig!):\n`);
        
        clusteredIntervals.slice(0, 3).forEach(([interval, events]) => {
          const delays = events.map((e, i) => i > 0 ? e.created_at - events[i-1].created_at : 0).slice(1);
          const avgDelay = delays.length > 0 ? (delays.reduce((a, b) => a + b, 0) / delays.length).toFixed(1) : 0;
          
          console.log(`         ⏰ ${formatDate(interval)}: ${events.length} Events`);
          console.log(`            📏 Durchschn. Delay: ${avgDelay}s`);
          if (parseFloat(avgDelay) > 10) {
            console.log(`            ✅ Gut verteilt (>${avgDelay}s Abstand)`);
          } else {
            console.log(`            ⚠️ Zu schnell (<${avgDelay}s Abstand) - könnte auffallen`);
          }
        });
      } else {
        console.log(`      ✅ Events gut über Zeit verteilt - keine auffälligen Cluster`);
      }
      
      // Statistik nach Zeitraum
      const last10min = giftWraps.filter(e => (Date.now() / 1000 - e.created_at) < 600).length;
      const last1hour = giftWraps.filter(e => (Date.now() / 1000 - e.created_at) < 3600).length;
      
      console.log(`   📊 AKTIVITÄT:`);
      console.log(`      🕐 Letzte 10 Minuten: ${last10min} Nachrichten`);
      console.log(`      🕐 Letzte Stunde: ${last1hour} Nachrichten`);
      console.log(`      📈 Gesamt (${MINUTES_TO_SHOW} Min): ${giftWraps.length} Nachrichten`);
    }

    // ============================================================
    // 5. DEAL-STATUS EVENTS (Kind 30081) - Deal Tracking
    // ============================================================
    console.log('\n\n🤝 DEAL-STATUS EVENTS (Kind 30081) - DEAL TRACKING');
    console.log('   ' + '='.repeat(55));
    
    const dealStatuses = await pool.querySync([RELAY], {
      kinds: [30081],
      since: MINUTES_AGO,
      limit: 100
    });
    
    console.log(`   📊 Gesamt gefunden: ${dealStatuses.length} Deal-Status Events`);
    console.log(`   📝 Status-Typen: pending, active, completed, cancelled`);
    
    if (dealStatuses.length === 0) {
      if (!HIDE_EMPTY_SECTIONS) {
        console.log(`   ℹ️ Keine Deal-Status Events gefunden`);
        console.log(`   💡 Starte einen Deal um Status-Updates zu sehen`);
      }
    } else {
      // Gruppiere nach Status
      const statusCounts = {
        pending: 0,
        active: 0,
        completed: 0,
        cancelled: 0,
        unknown: 0
      };
      
      dealStatuses.forEach(event => {
        try {
          const content = JSON.parse(event.content);
          const status = content.status || 'unknown';
          if (statusCounts.hasOwnProperty(status)) {
            statusCounts[status]++;
          } else {
            statusCounts.unknown++;
          }
        } catch {
          statusCounts.unknown++;
        }
      });
      
      console.log(`\n   📊 STATUS-VERTEILUNG:`);
      console.log(`      ⏳ Pending: ${statusCounts.pending}`);
      console.log(`      ✅ Active: ${statusCounts.active}`);
      console.log(`      🎉 Completed: ${statusCounts.completed}`);
      console.log(`      ❌ Cancelled: ${statusCounts.cancelled}`);
      if (statusCounts.unknown > 0) {
        console.log(`      ❓ Unknown: ${statusCounts.unknown}`);
      }
      
      console.log(`\n   📋 DEAL-DETAILS:\n`);
      
      dealStatuses.forEach((event, idx) => {
        const dTag = event.tags.find(t => t[0] === 'd')?.[1] || 'kein d-Tag';
        
        try {
          const content = JSON.parse(event.content);
          
          console.log(`   🤝 Deal ${idx + 1}:`);
          console.log(`      Event-ID: ${event.id.substring(0, 16)}...`);
          console.log(`      d-Tag: ${dTag.substring(0, 32)}...`);
          console.log(`      Author: ${event.pubkey.substring(0, 16)}...`);
          console.log(`      📅 Erstellt: ${formatDate(event.created_at)} (${formatAge(event.created_at)} alt)`);
          console.log(`      📊 Status: ${content.status || 'N/A'}`);
          
          if (content.offerId) {
            console.log(`      📦 Angebots-ID: ${content.offerId.substring(0, 16)}...`);
          }
          if (content.buyer) {
            console.log(`      👤 Buyer: ${content.buyer.substring(0, 16)}...`);
          }
          if (content.seller) {
            console.log(`      👤 Seller: ${content.seller.substring(0, 16)}...`);
          }
          if (content.timestamp) {
            console.log(`      ⏰ Deal-Timestamp: ${formatDate(content.timestamp)}`);
          }
          
          console.log('');
        } catch (e) {
          console.log(`   🤝 Deal ${idx + 1}:`);
          console.log(`      ⚠️ Content nicht parsebar`);
          console.log('');
        }
      });
    }

    // ============================================================
    // 6. KIND 30000 EVENTS (GroupConfig & Whitelist)
    // ============================================================
    console.log('\n\n🏗️ KIND 30000 EVENTS (GroupConfig & Whitelist)');
    console.log('   ' + '='.repeat(55));
    
    const kind30000Events = await pool.querySync([RELAY], {
      kinds: [30000],
      since: MINUTES_AGO,
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
    // ZUSAMMENFASSUNG - ALLE AKTIVEN FEATURES
    // ============================================================
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 ZUSAMMENFASSUNG - AKTIV IMPLEMENTIERTE EVENTS');
    console.log('='.repeat(60));
    console.log('\n🎭 MARKETPLACE (Anonym):');
    console.log(`   📦 Marketplace-Angebote (Kind 42): ${activeOffers.length} aktiv${expiredOffers > 0 ? `, ${expiredOffers} abgelaufen` : ''}`);
    console.log(`   💌 Interesse-Signale (Kind 30078): ${interests.length}`);
    console.log(`   🗑️ Gelöschte Events (Kind 5): ${deletionEvents.length}`);
    
    console.log('\n🔐 DEAL-ROOMS & BENACHRICHTIGUNGEN (NIP-17):');
    console.log(`   🎁 Gift Wrap Events (Kind 1059): ${giftWraps.length}`);
    console.log(`   🤝 Deal-Status Events (Kind 30081): ${dealStatuses.length}`);
    
    console.log('\n🏗️ GRUPPEN-VERWALTUNG:');
    console.log(`   🏗️ GroupConfigs (Kind 30000): ${currentGroupConfigs.length}`);
    console.log(`   🔐 Whitelists (Kind 30000): ${whitelists.length}`);
    console.log(`   👤 User-Profile (Kind 0): ${profiles.length}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 TOTAL EVENTS: ' + (activeOffers.length + interests.length + deletionEvents.length + giftWraps.length + dealStatuses.length + currentGroupConfigs.length + whitelists.length + profiles.length));
    console.log('='.repeat(60));
    
    console.log('\n✅ Query abgeschlossen!\n');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    pool.close([RELAY]);
  }
}

queryRelay();
