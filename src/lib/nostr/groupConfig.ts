/**
 * Gruppen-Konfiguration - ÖFFENTLICH speichert
 * 
 * Diese Datei speichert Gruppendaten öffentlich auf Nostr, damit alle User
 * diese Daten laden können (z.B. zum Admin-Status zu prüfen).
 * 
 * Verwendetes Event-Kind: 30000 mit speziellen Tags
 */

import { finalizeEvent, getPublicKey, verifyEvent, type Event } from 'nostr-tools';
import { initPool } from './client';
import { z } from 'zod';

export interface GroupConfig {
  relay: string;
  admin_pubkey: string; // Hex-Format
  secret_hash: string;  // SHA-256 Hash des Secrets (für Gruppen-Identifikation)
  created_at: number;
  updated_at: number;
}

// Validierung
const GroupConfigSchema = z.object({
  relay: z.string().url(),
  admin_pubkey: z.string().regex(/^[a-f0-9]{64}$/),
  secret_hash: z.string().regex(/^[a-f0-9]{64}$/),
  created_at: z.number().positive(),
  updated_at: z.number().positive()
});

/**
 * Berechne SHA-256 Hash eines Secrets
 * Dies wird verwendet, um die Gruppe zu identifizieren, ohne das Secret preiszugeben
 */
export async function deriveSecretHash(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Speichere Gruppen-Konfiguration öffentlich auf Nostr
 * Nur der Admin kann diese updaten (via Signatur)
 */
export async function saveGroupConfig(
  config: GroupConfig,
  adminPrivateKey: string,
  relays: string[]
): Promise<string> {
  try {
    // Validiere Config
    GroupConfigSchema.parse(config);
    
    const adminPubkey = getPublicKey(adminPrivateKey as any);
    
    if (adminPubkey.toLowerCase() !== config.admin_pubkey.toLowerCase()) {
      throw new Error('❌ Admin-Pubkey stimmt nicht mit Private Key überein');
    }

    // Erstelle Event
    let event: any = {
      kind: 30000,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', `bitcoin-group-config:${config.secret_hash}`],
        ['relay', config.relay],
        ['admin', config.admin_pubkey],
        ['secret_hash', config.secret_hash],
        ['app', 'bitcoin-swap-network']
      ],
      content: JSON.stringify(config),
      pubkey: adminPubkey
    };

    // Signiere Event
    const signedEvent = finalizeEvent(event, adminPrivateKey as any);
    
    // Verifiziere Signatur
    if (!verifyEvent(signedEvent)) {
      throw new Error('❌ Event-Signatur ungültig');
    }

    // Publiziere auf Relays
    console.log('📡 Publiziere Gruppen-Config auf Relays:', relays);
    const pool = initPool();
    
    for (const relay of relays) {
      try {
        await pool.publish(relays, signedEvent);
      } catch (e) {
        console.warn(`⚠️ Fehler beim Publizieren auf ${relay}:`, e);
      }
    }
    
    console.log('✅ Gruppen-Config gespeichert:', {
      relay: config.relay,
      admin: adminPubkey.substring(0, 16) + '...',
      secret_hash: config.secret_hash.substring(0, 16) + '...'
    });

    return signedEvent.id;
  } catch (error) {
    console.error('❌ Fehler beim Speichern der Gruppen-Config:', error);
    throw error;
  }
}

/**
 * Lade Gruppen-Konfiguration von Nostr
 * Jeder kann diese Daten laden (öffentlich)
 */
export async function loadGroupConfig(
  secretHash: string,
  relays: string[]
): Promise<GroupConfig | null> {
  try {
    console.log('📥 Lade Gruppen-Config von Nostr für Secret-Hash:', secretHash.substring(0, 16) + '...');
    
    const pool = initPool();
    
    // Query nach der Config
    const events = await pool.querySync(
      relays,
      {
        kinds: [30000],
        '#d': [`bitcoin-group-config:${secretHash}`],
        limit: 1
      }
    );

    if (events.length === 0) {
      console.warn('⚠️ Keine Gruppen-Config gefunden für Secret-Hash:', secretHash);
      return null;
    }

    const event = events[0];
    console.log('✅ Gruppen-Config geladen');

    // Parse Content
    const config = JSON.parse(event.content) as GroupConfig;
    
    // Validiere
    GroupConfigSchema.parse(config);
    
    return config;
  } catch (error) {
    console.error('❌ Fehler beim Laden der Gruppen-Config:', error);
    return null;
  }
}

/**
 * Lade Admin-Pubkey für eine Gruppe
 * Dies ist der einzige öffentliche Weg, den Admin zu erkennen
 */
export async function loadGroupAdmin(
  secretHash: string,
  relays: string[]
): Promise<string | null> {
  try {
    const config = await loadGroupConfig(secretHash, relays);
    if (config) {
      return config.admin_pubkey;
    }
    return null;
  } catch (error) {
    console.error('❌ Fehler beim Laden des Admin-Pubkey:', error);
    return null;
  }
}

/**
 * Lade Gruppen-Konfiguration von mehreren Relays (Multi-Relay-Fallback)
 * Sucht parallel auf allen angegebenen Relays und gibt das erste valide Ergebnis zurück
 * 
 * @param secret - Das Gruppen-Secret (wird gehasht)
 * @param relays - Liste von Relay-URLs zum Durchsuchen
 * @returns GroupConfig oder null wenn nichts gefunden
 */
export async function loadGroupConfigFromRelays(
  secret: string,
  relays: string[]
): Promise<GroupConfig | null> {
  try {
    const secretHash = await deriveSecretHash(secret);
    console.log('📥 Multi-Relay-Lookup für Secret-Hash:', secretHash.substring(0, 16) + '...');
    console.log('📡 Durchsuche', relays.length, 'Relays...');
    
    const pool = initPool();
    
    // Query parallel auf allen Relays
    const queries = relays.map(async (relay) => {
      try {
        const events = await pool.querySync(
          [relay],
          {
            kinds: [30000],
            '#d': [`bitcoin-group-config:${secretHash}`],
            limit: 1
          }
        );
        
        if (events.length > 0) {
          const event = events[0];
          // Verify signature
          if (verifyEvent(event)) {
            console.log('✅ Valides Event gefunden auf:', relay);
            return { relay, event };
          }
        }
        return null;
      } catch (err) {
        console.warn('⚠️ Fehler bei Relay', relay, ':', err);
        return null;
      }
    });
    
    // Warte auf alle Queries (parallel)
    const results = await Promise.allSettled(queries);
    
    // Sammle valide Events
    const validResults: Array<{ relay: string; event: Event }> = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        validResults.push(result.value);
      }
    }
    
    if (validResults.length === 0) {
      console.warn('⚠️ Keine GroupConfig auf', relays.length, 'Relays gefunden');
      return null;
    }
    
    // Wähle neuestes Event (höchste created_at)
    validResults.sort((a, b) => b.event.created_at - a.event.created_at);
    const best = validResults[0];
    
    console.log('✅ Beste GroupConfig von Relay:', best.relay);
    console.log('📊 Gefunden auf', validResults.length, 'von', relays.length, 'Relays');
    
    // Parse und validiere Content
    const config = JSON.parse(best.event.content) as GroupConfig;
    GroupConfigSchema.parse(config);
    
    return config;
  } catch (error) {
    console.error('❌ Fehler beim Multi-Relay-Lookup:', error);
    return null;
  }
}
