/**
 * Whitelist Management auf Nostr Relay (Pro Gruppe)
 *
 * Jede Gruppe hat ihre eigene Whitelist basierend auf der channelId.
 * Die Whitelist wird als Replaceable Event (Kind 30000) auf dem Relay gespeichert.
 * Format: JSON-Array mit Public Keys (hex oder npub)
 */

import { createEvent, publishEvent, fetchEvents } from './client';
import { nip19 } from 'nostr-tools';

// Event Kind für Whitelist (Replaceable Event)
const WHITELIST_KIND = 30000;

/**
 * Generiere d-Tag für Whitelist basierend auf channelId
 */
function getWhitelistDTag(channelId: string): string {
  return `whitelist-${channelId}`;
}

export interface WhitelistData {
  pubkeys: string[]; // Array von hex pubkeys
  updated_at: number;
  admin_pubkey: string;
  channel_id: string; // Gruppen-ID für diese Whitelist
}

/**
 * Lade Whitelist vom Relay für eine spezifische Gruppe
 */
export async function loadWhitelist(
  relays: string[],
  adminPubkey: string,
  channelId: string
): Promise<WhitelistData | null> {
  try {
    const dTag = getWhitelistDTag(channelId);
    console.log('📋 [WHITELIST] Lade Whitelist vom Relay...');
    console.log('  Admin Pubkey:', adminPubkey.substring(0, 16) + '...');
    console.log('  Channel ID:', channelId.substring(0, 16) + '...');
    console.log('  d-Tag:', dTag);
    
    const events = await fetchEvents(relays, {
      kinds: [WHITELIST_KIND],
      authors: [adminPubkey],
      '#d': [dTag],
      limit: 1
    });

    if (events.length === 0) {
      console.log('⚠️ [WHITELIST] Keine Whitelist für diese Gruppe gefunden');
      return null;
    }

    const event = events[0];
    const data = JSON.parse(event.content) as WhitelistData;
    
    console.log('✅ [WHITELIST] Whitelist geladen:', data.pubkeys.length, 'Einträge');
    
    return data;
  } catch (error) {
    console.error('❌ [WHITELIST] Fehler beim Laden:', error);
    return null;
  }
}

/**
 * Speichere Whitelist auf Relay für eine spezifische Gruppe (nur für Admin)
 */
export async function saveWhitelist(
  pubkeys: string[],
  adminPrivateKey: string,
  relays: string[],
  channelId: string
): Promise<boolean> {
  try {
    const dTag = getWhitelistDTag(channelId);
    console.log('💾 [WHITELIST] Speichere Whitelist auf Relay...');
    console.log('  Channel ID:', channelId.substring(0, 16) + '...');
    console.log('  d-Tag:', dTag);
    
    const { getPublicKey } = await import('nostr-tools');
    const adminPubkey = getPublicKey(adminPrivateKey as any);
    
    const data: WhitelistData = {
      pubkeys: pubkeys.map(normalizePublicKey),
      updated_at: Math.floor(Date.now() / 1000),
      admin_pubkey: adminPubkey,
      channel_id: channelId
    };

    const event = await createEvent(
      WHITELIST_KIND,
      JSON.stringify(data),
      [
        ['d', dTag],
        ['t', 'bitcoin-group'],
        ['channel', channelId] // Zusätzlicher Tag für einfacheres Filtern
      ],
      adminPrivateKey
    );

    const result = await publishEvent(event, relays);
    
    if (result.success) {
      console.log('✅ [WHITELIST] Whitelist für Gruppe gespeichert');
      return true;
    } else {
      console.error('❌ [WHITELIST] Fehler beim Speichern');
      return false;
    }
  } catch (error) {
    console.error('❌ [WHITELIST] Fehler:', error);
    return false;
  }
}

/**
 * Prüfe ob Public Key in Whitelist ist
 */
export function isInWhitelist(pubkey: string, whitelist: WhitelistData | null): boolean {
  if (!whitelist) {
    console.warn('⚠️ [WHITELIST] Keine Whitelist vorhanden - Zugriff verweigert');
    return false;
  }

  const normalizedPubkey = normalizePublicKey(pubkey);
  const isAllowed = whitelist.pubkeys.some(
    allowed => normalizePublicKey(allowed) === normalizedPubkey
  );

  console.log('🔍 [WHITELIST] Prüfe Pubkey:', normalizedPubkey.substring(0, 16) + '...', '→', isAllowed ? '✅ Erlaubt' : '❌ Verweigert');
  
  return isAllowed;
}

/**
 * Normalisiere Public Key zu Hex (konvertiert npub zu hex)
 */
function normalizePublicKey(pubkey: string): string {
  try {
    pubkey = pubkey.trim();
    
    // Wenn npub, konvertiere zu hex
    if (pubkey.startsWith('npub1')) {
      const decoded = nip19.decode(pubkey as any);
      if ((decoded as any).type === 'npub') {
        return ((decoded as any).data as string).toLowerCase();
      }
    }
    
    // Ansonsten als hex behandeln
    return pubkey.toLowerCase();
  } catch (error) {
    console.error('Fehler beim Normalisieren des Public Keys:', error);
    return pubkey.toLowerCase();
  }
}

/**
 * Füge Public Key zur Whitelist hinzu (nur für Admin)
 */
export async function addToWhitelist(
  pubkey: string,
  adminPrivateKey: string,
  relays: string[],
  channelId: string
): Promise<boolean> {
  try {
    const { getPublicKey } = await import('nostr-tools');
    const adminPubkey = getPublicKey(adminPrivateKey as any);
    
    // Lade aktuelle Whitelist für diese Gruppe
    const currentWhitelist = await loadWhitelist(relays, adminPubkey, channelId);
    const pubkeys = currentWhitelist ? [...currentWhitelist.pubkeys] : [];
    
    // Füge neuen Key hinzu (wenn nicht schon vorhanden)
    const normalizedPubkey = normalizePublicKey(pubkey);
    if (!pubkeys.includes(normalizedPubkey)) {
      pubkeys.push(normalizedPubkey);
      return await saveWhitelist(pubkeys, adminPrivateKey, relays, channelId);
    }
    
    return true; // Bereits vorhanden
  } catch (error) {
    console.error('Fehler beim Hinzufügen zur Whitelist:', error);
    return false;
  }
}

/**
 * Entferne Public Key aus Whitelist (nur für Admin)
 */
export async function removeFromWhitelist(
  pubkey: string,
  adminPrivateKey: string,
  relays: string[],
  channelId: string
): Promise<boolean> {
  try {
    const { getPublicKey } = await import('nostr-tools');
    const adminPubkey = getPublicKey(adminPrivateKey as any);
    
    // Lade aktuelle Whitelist für diese Gruppe
    const currentWhitelist = await loadWhitelist(relays, adminPubkey, channelId);
    if (!currentWhitelist) return false;
    
    // Entferne Key
    const normalizedPubkey = normalizePublicKey(pubkey);
    const pubkeys = currentWhitelist.pubkeys.filter(
      pk => normalizePublicKey(pk) !== normalizedPubkey
    );
    
    return await saveWhitelist(pubkeys, adminPrivateKey, relays, channelId);
  } catch (error) {
    console.error('Fehler beim Entfernen aus Whitelist:', error);
    return false;
  }
}

/**
 * Setze Whitelist für privaten Chat (Anbieter + Interessent)
 * Alle anderen User werden von der Whitelist entfernt
 *
 * @param offerCreatorRealPubkey - Echter User-Key des Anbieters (zum Schreiben)
 * @param offerCreatorTempPubkey - Temporärer Key des Anbieters (für Angebot)
 * @param interestedUserPubkey - Key des Interessenten
 * @param adminPrivateKey - Admin Private Key für Whitelist-Update
 * @param relays - Relay URLs
 * @param channelId - Channel ID
 */
export async function setPrivateChatWhitelist(
  offerCreatorRealPubkey: string,
  offerCreatorTempPubkey: string,
  interestedUserPubkey: string,
  adminPrivateKey: string,
  relays: string[],
  channelId: string
): Promise<boolean> {
  try {
    console.log('🔒 [WHITELIST] Setze Private-Chat-Whitelist...');
    console.log('  Anbieter (echter Key):', offerCreatorRealPubkey.substring(0, 16) + '...');
    console.log('  Anbieter (temp Key):', offerCreatorTempPubkey.substring(0, 16) + '...');
    console.log('  Interessent:', interestedUserPubkey.substring(0, 16) + '...');
    
    // Normalisiere alle Public Keys
    const normalizedRealKey = normalizePublicKey(offerCreatorRealPubkey);
    const normalizedTempKey = normalizePublicKey(offerCreatorTempPubkey);
    const normalizedInterestedKey = normalizePublicKey(interestedUserPubkey);
    
    // Erstelle neue Whitelist mit diesen 3 Keys
    // (echter Key + temp Key des Anbieters + Interessent)
    const pubkeys = [normalizedRealKey, normalizedTempKey, normalizedInterestedKey];
    
    // Entferne Duplikate (falls temp key = real key)
    const uniquePubkeys = [...new Set(pubkeys)];
    
    console.log('  Whitelist wird gesetzt auf', uniquePubkeys.length, 'User');
    
    const success = await saveWhitelist(uniquePubkeys, adminPrivateKey, relays, channelId);
    
    if (success) {
      console.log('✅ [WHITELIST] Private-Chat-Whitelist gesetzt');
      console.log('  Nur noch diese User haben Zugriff auf die Gruppe');
    } else {
      console.error('❌ [WHITELIST] Fehler beim Setzen der Private-Chat-Whitelist');
    }
    
    return success;
  } catch (error) {
    console.error('❌ [WHITELIST] Fehler:', error);
    return false;
  }
}