/**
 * Whitelist Management auf Nostr Relay
 * 
 * Die Whitelist wird als Replaceable Event (Kind 30000) auf dem Relay gespeichert.
 * Format: JSON-Array mit Public Keys (hex oder npub)
 */

import { createEvent, publishEvent, fetchEvents } from './client';
import { nip19 } from 'nostr-tools';

// Event Kind für Whitelist (Replaceable Event)
const WHITELIST_KIND = 30000;
const WHITELIST_D_TAG = 'bitcoin-group-whitelist';

export interface WhitelistData {
  pubkeys: string[]; // Array von hex pubkeys
  updated_at: number;
  admin_pubkey: string;
}

/**
 * Lade Whitelist vom Relay
 */
export async function loadWhitelist(
  relays: string[],
  adminPubkey: string
): Promise<WhitelistData | null> {
  try {
    console.log('📋 [WHITELIST] Lade Whitelist vom Relay...');
    console.log('  Admin Pubkey:', adminPubkey.substring(0, 16) + '...');
    
    const events = await fetchEvents(relays, {
      kinds: [WHITELIST_KIND],
      authors: [adminPubkey],
      '#d': [WHITELIST_D_TAG],
      limit: 1
    });

    if (events.length === 0) {
      console.log('⚠️ [WHITELIST] Keine Whitelist gefunden');
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
 * Speichere Whitelist auf Relay (nur für Admin)
 */
export async function saveWhitelist(
  pubkeys: string[],
  adminPrivateKey: string,
  relays: string[]
): Promise<boolean> {
  try {
    console.log('💾 [WHITELIST] Speichere Whitelist auf Relay...');
    
    const { getPublicKey } = await import('nostr-tools');
    const adminPubkey = getPublicKey(adminPrivateKey as any);
    
    const data: WhitelistData = {
      pubkeys: pubkeys.map(normalizePublicKey),
      updated_at: Math.floor(Date.now() / 1000),
      admin_pubkey: adminPubkey
    };

    const event = await createEvent(
      WHITELIST_KIND,
      JSON.stringify(data),
      [
        ['d', WHITELIST_D_TAG],
        ['t', 'bitcoin-group']
      ],
      adminPrivateKey
    );

    const result = await publishEvent(event, relays);
    
    if (result.success) {
      console.log('✅ [WHITELIST] Whitelist gespeichert');
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
  relays: string[]
): Promise<boolean> {
  try {
    const { getPublicKey } = await import('nostr-tools');
    const adminPubkey = getPublicKey(adminPrivateKey as any);
    
    // Lade aktuelle Whitelist
    const currentWhitelist = await loadWhitelist(relays, adminPubkey);
    const pubkeys = currentWhitelist ? [...currentWhitelist.pubkeys] : [];
    
    // Füge neuen Key hinzu (wenn nicht schon vorhanden)
    const normalizedPubkey = normalizePublicKey(pubkey);
    if (!pubkeys.includes(normalizedPubkey)) {
      pubkeys.push(normalizedPubkey);
      return await saveWhitelist(pubkeys, adminPrivateKey, relays);
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
  relays: string[]
): Promise<boolean> {
  try {
    const { getPublicKey } = await import('nostr-tools');
    const adminPubkey = getPublicKey(adminPrivateKey as any);
    
    // Lade aktuelle Whitelist
    const currentWhitelist = await loadWhitelist(relays, adminPubkey);
    if (!currentWhitelist) return false;
    
    // Entferne Key
    const normalizedPubkey = normalizePublicKey(pubkey);
    const pubkeys = currentWhitelist.pubkeys.filter(
      pk => normalizePublicKey(pk) !== normalizedPubkey
    );
    
    return await saveWhitelist(pubkeys, adminPrivateKey, relays);
  } catch (error) {
    console.error('Fehler beim Entfernen aus Whitelist:', error);
    return false;
  }
}