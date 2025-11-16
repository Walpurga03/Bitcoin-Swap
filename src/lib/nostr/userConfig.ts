
import { finalizeEvent, getPublicKey } from 'nostr-tools';
import { logger } from '$lib/utils/logger';
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
    logger.debug(' [USER-CONFIG] Speichere Config auf Nostr...');
    logger.debug('📡 Relays:', relays);
    
    const pubkey = getPublicKey(privateKey as any);
    
    // Erstelle Config-Objekt mit Timestamp
    const configData: UserConfig = {
      ...config,
      updated_at: Math.floor(Date.now() / 1000)
    };
    
    logger.debug('📋 Config-Daten:', {
      is_admin: configData.is_group_admin,
      has_secret: !!configData.group_secret,
      has_link: !!configData.invite_link
    });
    
    // Verschlüssele Config mit NIP-17 (zu sich selbst)
    const configJson = JSON.stringify(configData);
    const { giftWrapEvent } = await createNIP17Message(
      configJson,
      pubkey,  // Recipient = Self (zu sich selbst verschlüsselt!)
      privateKey
    );
    
    logger.debug('🔐 Config verschlüsselt mit NIP-17 (3-Schichten)');
    
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
      content: giftWrapEvent.content,  // NIP-17 verschlüsselter Content
      pubkey: pubkey
    };
    
    const signedEvent = finalizeEvent(event, privateKey as any);
    
    logger.debug('✅ Event erstellt (Kind 30078)');
    logger.debug('🆔 Event-ID:', signedEvent.id.substring(0, 16) + '...');
    
    // Publiziere zu Relays
    const result = await publishEvent(signedEvent as NostrEvent, relays);
    
    if (!result.success) {
      throw new Error('❌ Relay nicht erreichbar. Bitte prüfe deine Internetverbindung und versuche es erneut.');
    }
    
    logger.debug('✅ Config gespeichert auf', result.relays.length, 'Relays');
    
    return signedEvent.id;
  } catch (error) {
    logger.error(' [USER-CONFIG] Fehler beim Speichern:', error);
    
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
    logger.info(' [USER-CONFIG] Lade Config von Nostr...');
    logger.debug('📡 Relays:', relays);
    
    const pubkey = getPublicKey(privateKey as any);
    
    // Suche nach User's Config Event (Kind 30078)
    const filter: NostrFilter = {
      kinds: [30078],
      authors: [pubkey],
      '#d': ['bitcoin-swap-user-config'],
      limit: 1
    };
    
    logger.debug('🔍 Suche Config-Event...');
    
    const events = await fetchEvents(relays, filter, 5000);
    
    if (events.length === 0) {
      logger.debug('⚠️ Keine Config auf Relay gefunden');
      return null;
    }
    
    // Nehme neuestes Event
    const latestEvent = events.sort((a, b) => b.created_at - a.created_at)[0];
    
    logger.debug('✅ Config-Event gefunden:', latestEvent.id.substring(0, 16) + '...');
    logger.debug('📅 Erstellt:', new Date(latestEvent.created_at * 1000).toLocaleString());
    
    // Entschlüssele mit NIP-17
    try {
      // Das gespeicherte Event IST bereits ein Gift Wrap (Kind 30078 mit NIP-17 Content)
      // Wir müssen nur den Content als Gift Wrap behandeln
      const giftWrapEvent = {
        kind: 1059,  // Gift-Wrapped Event
        pubkey: pubkey, // Zu sich selbst verschlüsselt
        content: latestEvent.content,
        created_at: latestEvent.created_at,
        id: latestEvent.id,
        sig: latestEvent.sig,
        tags: []
      };
      
      const decrypted = await decryptNIP17Message(giftWrapEvent, privateKey);
      const config: UserConfig = JSON.parse(decrypted.content);
      
      logger.debug('🔓 Config entschlüsselt (3-Schichten)');
      logger.debug('✅ Config geladen:', {
        is_admin: config.is_group_admin,
        has_secret: !!config.group_secret,
        has_link: !!config.invite_link
      });
      
      return config;
    } catch (decryptError) {
      logger.error('  ❌ Entschlüsselung fehlgeschlagen:', decryptError);
      throw new Error('❌ Config konnte nicht entschlüsselt werden. Bitte prüfe deinen Private Key.');
    }
  } catch (error) {
    logger.error(' [USER-CONFIG] Fehler beim Laden:', error);
    
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
    logger.debug('🗑️ [USER-CONFIG] Lösche Config...');
    
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
      
      logger.debug('✅ Config-Event gelöscht von Relay');
    }
    
    logger.debug('✅ Config gelöscht');
  } catch (error) {
    logger.error(' [USER-CONFIG] Fehler beim Löschen:', error);
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

