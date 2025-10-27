
import { finalizeEvent, getPublicKey } from 'nostr-tools';
import { createNIP17Message, decryptNIP17Message } from './crypto';
import { fetchEvents, publishEvent } from './client';
import type { NostrEvent, NostrFilter } from './types';
export interface UserConfig {
  is_group_admin: boolean;
  admin_pubkey: string;
  group_secret: string;
  invite_link?: string;
  relay: string;
  created_at: number;
  updated_at: number;
}
export async function saveUserConfig(
  config: UserConfig,
  privateKey: string,
  relays: string[]
): Promise<string> {
  try {
    console.log('💾 [USER-CONFIG] Speichere Config auf Nostr...');
    console.log('  📡 Relays:', relays);
    
    const pubkey = getPublicKey(privateKey as any);
    
    // Erstelle Config-Objekt mit Timestamp
    const configData: UserConfig = {
      ...config,
      updated_at: Math.floor(Date.now() / 1000)
    };
    
    console.log('  📋 Config-Daten:', {
      is_admin: configData.is_group_admin,
      has_secret: !!configData.group_secret,
      has_link: !!configData.invite_link
    });
    
    // Verschlüssele Config mit NIP-17 (zu sich selbst)
    const configJson = JSON.stringify(configData);
    const { wrappedEvent } = await createNIP17Message(
      configJson,
      pubkey,  // Recipient = Self (zu sich selbst verschlüsselt!)
      privateKey
    );
    
    console.log('  🔐 Config verschlüsselt mit NIP-17');
    
    // Erstelle Replaceable Event (Kind 30078 - Application Data)
    // Damit wird alte Config automatisch ersetzt
    const event = {
      kind: 30078,  // Parameterized Replaceable Event
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', 'bitcoin-swap-user-config'],  // Identifier für Replaceable Event
        ['encrypted', 'nip17'],              // Markierung für Verschlüsselung
        ['app', 'bitcoin-swap-network']      // App-Identifier
      ],
      content: wrappedEvent.content,  // NIP-17 verschlüsselter Content
      pubkey: pubkey
    };
    
    const signedEvent = finalizeEvent(event, privateKey as any);
    
    console.log('  ✅ Event erstellt (Kind 30078)');
    console.log('  🆔 Event-ID:', signedEvent.id.substring(0, 16) + '...');
    
    // Publiziere zu Relays
    const result = await publishEvent(signedEvent as NostrEvent, relays);
    
    if (!result.success) {
      throw new Error('❌ Relay nicht erreichbar. Bitte prüfe deine Internetverbindung und versuche es erneut.');
    }
    
    console.log('  ✅ Config gespeichert auf', result.relays.length, 'Relays');
    
    return signedEvent.id;
  } catch (error) {
    console.error('❌ [USER-CONFIG] Fehler beim Speichern:', error);
    
  // Werfe Fehler weiter - KEIN localStorage-Fallback! Kein localStorage mehr.
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('❌ Relay nicht erreichbar. Bitte prüfe deine Internetverbindung und versuche es erneut.');
  }
}
export async function loadUserConfig(
  privateKey: string,
  relays: string[]
): Promise<UserConfig | null> {
  try {
    console.log('📥 [USER-CONFIG] Lade Config von Nostr...');
    console.log('  📡 Relays:', relays);
    
    const pubkey = getPublicKey(privateKey as any);
    
    // Suche nach User's Config Event (Kind 30078)
    const filter: NostrFilter = {
      kinds: [30078],
      authors: [pubkey],
      '#d': ['bitcoin-swap-user-config'],
      limit: 1
    };
    
    console.log('  🔍 Suche Config-Event...');
    
    const events = await fetchEvents(relays, filter, 5000);
    
    if (events.length === 0) {
      console.log('  ⚠️ Keine Config auf Relay gefunden');
      return null;
    }
    
    // Nehme neuestes Event
    const latestEvent = events.sort((a, b) => b.created_at - a.created_at)[0];
    
    console.log('  ✅ Config-Event gefunden:', latestEvent.id.substring(0, 16) + '...');
    console.log('  📅 Erstellt:', new Date(latestEvent.created_at * 1000).toLocaleString());
    
    // Entschlüssele mit NIP-17
    try {
      // Erstelle temporäres wrapped Event für Entschlüsselung
      const wrappedEvent = {
        ...latestEvent,
        kind: 1059  // Gift-Wrapped Event
      };
      
      const decrypted = await decryptNIP17Message(wrappedEvent, privateKey);
      const config: UserConfig = JSON.parse(decrypted.content);
      
      console.log('  🔓 Config entschlüsselt');
      console.log('  ✅ Config geladen:', {
        is_admin: config.is_group_admin,
        has_secret: !!config.group_secret,
        has_link: !!config.invite_link
      });
      
      return config;
    } catch (decryptError) {
      console.error('  ❌ Entschlüsselung fehlgeschlagen:', decryptError);
      throw new Error('❌ Config konnte nicht entschlüsselt werden. Bitte prüfe deinen Private Key.');
    }
  } catch (error) {
    console.error('❌ [USER-CONFIG] Fehler beim Laden:', error);
    
  // Werfe Fehler weiter - KEIN localStorage-Fallback! Kein localStorage mehr.
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('❌ Relay nicht erreichbar. Bitte prüfe deine Internetverbindung und versuche es erneut.');
  }
}
export async function deleteUserConfig(
  privateKey: string,
  relays: string[]
): Promise<void> {
  try {
    console.log('🗑️ [USER-CONFIG] Lösche Config...');
    
    const pubkey = getPublicKey(privateKey as any);
    
    // Suche Config-Event
    const filter: NostrFilter = {
      kinds: [30078],
      authors: [pubkey],
      '#d': ['bitcoin-swap-user-config'],
      limit: 1
    };
    
    const events = await fetchEvents(relays, filter, 5000);
    
    if (events.length > 0) {
      const configEvent = events[0];
      
      // Erstelle Delete-Event (Kind 5)
      const deleteEvent = {
        kind: 5,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', configEvent.id],
          ['k', '30078']
        ],
        content: 'User-Config gelöscht',
        pubkey: pubkey
      };
      
      const signedDelete = finalizeEvent(deleteEvent, privateKey as any);
      await publishEvent(signedDelete as NostrEvent, relays);
      
      console.log('  ✅ Config-Event gelöscht von Relay');
    }
    
    console.log('  ✅ Config gelöscht');
  } catch (error) {
    console.error('❌ [USER-CONFIG] Fehler beim Löschen:', error);
    throw new Error('❌ Relay nicht erreichbar. Config konnte nicht gelöscht werden.');
  }
}
export async function hasUserConfig(
  privateKey: string,
  relays: string[]
): Promise<boolean> {
  try {
    const config = await loadUserConfig(privateKey, relays);
    return config !== null;
  } catch (error) {
    return false;
  }
}

