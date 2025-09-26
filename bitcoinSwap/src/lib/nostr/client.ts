// Nostr Client für Relay-Verbindung und Event-Handling

import { 
  type Event as NostrEvent, 
  SimplePool, 
  getEventHash, 
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  nip04,
  type Filter
} from 'nostr-tools';
import type { GroupConfig, GroupMessage, UserProfile } from './types';
import { encryptMessage, decryptMessage, deriveKeyFromSecret } from './crypto';

export class NostrClient {
  public pool: SimplePool;
  private relays: string[] = [];
  private subscriptions: Map<string, any> = new Map();
  private userProfile: UserProfile | null = null;
  private groupConfig: GroupConfig | null = null;
  private encryptionKey: CryptoKey | null = null;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventCache = new Map<string, NostrEvent>();
  private maxCacheSize = 1000;

  constructor() {
    this.pool = new SimplePool();
    this.setupConnectionMonitoring();
  }

  /**
   * Verbindungsüberwachung einrichten
   */
  private setupConnectionMonitoring() {
    // Verbindungsstatus überwachen
    setInterval(() => {
      if (this.connectionStatus === 'disconnected' && this.relays.length > 0) {
        this.handleReconnection();
      }
    }, 30000); // Alle 30 Sekunden prüfen
  }

  /**
   * Automatische Wiederverbindung
   */
  private async handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Maximale Anzahl Wiederverbindungsversuche erreicht');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Wiederverbindungsversuch ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connectToRelays(this.relays);
    }, delay);
  }

  /**
   * Event-Cache verwalten
   */
  private cacheEvent(event: NostrEvent) {
    if (this.eventCache.size >= this.maxCacheSize) {
      // Älteste Events entfernen (FIFO)
      const firstKey = this.eventCache.keys().next().value;
      if (firstKey) {
        this.eventCache.delete(firstKey);
      }
    }
    this.eventCache.set(event.id, event);
  }

  /**
   * Prüfen ob Event bereits im Cache
   */
  private isEventCached(eventId: string): boolean {
    return this.eventCache.has(eventId);
  }

  /**
   * Verbindung zu Relays herstellen
   */
  async connectToRelays(relays: string[]) {
    this.relays = relays;
    this.connectionStatus = 'connecting';
    console.log('Verbinde zu Relays:', relays);
    
    // Verbindungstest mit Timeout
    try {
      const testPromises = relays.map(relay =>
        Promise.race([
          fetch(relay.replace('wss://', 'https://').replace('ws://', 'http://'), {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000) // 5 Sekunden Timeout
          })
          .then(() => console.log(`✅ Relay erreichbar: ${relay}`))
          .catch(() => console.warn(`⚠️ Relay möglicherweise nicht erreichbar: ${relay}`)),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 5000)
          )
        ])
      );
      
      await Promise.allSettled(testPromises);
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('Fehler beim Verbindungstest:', error);
      this.connectionStatus = 'disconnected';
    }
  }

  /**
   * Nutzer-Profil setzen
   */
  setUserProfile(profile: UserProfile) {
    this.userProfile = profile;
  }

  /**
   * Gruppe konfigurieren mit Secret
   */
  async configureGroup(config: GroupConfig) {
    this.groupConfig = config;
    this.encryptionKey = await deriveKeyFromSecret(config.secret);
    console.log('Gruppe konfiguriert:', config.channelId);
  }

  /**
   * Verschlüsselte Nachricht in die Gruppe senden
   */
  async sendGroupMessage(content: string): Promise<void> {
    if (!this.userProfile?.privkey || !this.groupConfig || !this.encryptionKey) {
      throw new Error('Client nicht vollständig konfiguriert');
    }

    // Nachricht verschlüsseln
    const encryptedContent = await encryptMessage(content, this.encryptionKey);

    // Nostr Event erstellen (NIP-28 Channel Message)
    const event: Partial<NostrEvent> = {
      kind: 42, // channel_message
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['e', this.groupConfig.channelId, '', 'root'], // Bezug zur Channel
        ['p', this.userProfile.pubkey] // Mention des eigenen pubkeys
      ],
      content: encryptedContent,
      pubkey: this.userProfile.pubkey
    };

    // Event signieren mit finalizeEvent
    const privkeyBytes = new Uint8Array(this.userProfile.privkey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const signedEvent = finalizeEvent(event as NostrEvent, privkeyBytes);

    // An Relays senden mit Fehlerbehandlung
    const publishPromises = this.relays.map(async (relay) => {
      try {
        await this.pool.publish([relay], signedEvent);
        console.log(`✅ Nachricht an ${relay} gesendet`);
      } catch (error) {
        console.error(`❌ Fehler beim Senden an ${relay}:`, error);
        throw error;
      }
    });

    // Mindestens ein Relay muss erfolgreich sein
    const results = await Promise.allSettled(publishPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    if (successful === 0) {
      throw new Error('Nachricht konnte an keinen Relay gesendet werden');
    }

    console.log(`Gruppennachricht gesendet: ${signedEvent.id} (${successful}/${this.relays.length} Relays)`);
  }

  /**
   * Auf Gruppennachrichten hören
   */
  subscribeToGroupMessages(callback: (message: GroupMessage) => void) {
    if (!this.groupConfig) {
      throw new Error('Gruppe nicht konfiguriert');
    }

    const filter: Filter = {
      kinds: [42], // channel_message
      since: Math.floor(Date.now() / 1000) - 3600 // Letzte Stunde
    } as any;

    const sub = this.pool.subscribeMany(
      this.relays,
      [filter] as any,
      {
        onevent: async (event: NostrEvent) => {
          try {
            // Duplikate vermeiden durch Cache-Prüfung
            if (this.isEventCached(event.id)) {
              return;
            }
            this.cacheEvent(event);

            // Nachricht entschlüsseln
            let decryptedContent = event.content;
            let decrypted = false;

            if (this.encryptionKey) {
              try {
                decryptedContent = await decryptMessage(event.content, this.encryptionKey);
                decrypted = true;
              } catch (error) {
                console.warn('Entschlüsselung fehlgeschlagen für Event:', event.id);
              }
            }

            const message: GroupMessage = {
              id: event.id,
              pubkey: event.pubkey,
              content: decryptedContent,
              timestamp: event.created_at,
              decrypted
            };

            callback(message);
          } catch (error) {
            console.error('Fehler beim Verarbeiten der Nachricht:', error);
          }
        },
        oneose: () => {
          console.log('Initiale Gruppennachrichten geladen');
          this.connectionStatus = 'connected';
          this.reconnectAttempts = 0;
        }
      }
    );

    this.subscriptions.set('groupMessages', sub);
  }

  /**
   * Alle Subscriptions beenden
   */
  unsubscribeAll() {
    this.subscriptions.forEach(sub => {
      sub.close();
    });
    this.subscriptions.clear();
  }

  /**
   * Client schließen
   */
  close() {
    this.unsubscribeAll();
    this.connectionStatus = 'disconnected';
    
    // Cache leeren
    this.eventCache.clear();
    
    try {
      this.pool.close(this.relays);
    } catch (error) {
      console.warn('Fehler beim Schließen der Pool-Verbindungen:', error);
    }
  }

  /**
   * Verbindungsstatus abrufen
   */
  getConnectionStatus(): 'disconnected' | 'connecting' | 'connected' {
    return this.connectionStatus;
  }

  /**
   * Cache-Statistiken abrufen
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.eventCache.size,
      maxSize: this.maxCacheSize
    };
  }

  /**
   * Neues Nostr-Schlüsselpaar generieren
   */
  static generateKeyPair(): { privkey: string; pubkey: string } {
    const privkey = generateSecretKey();
    const pubkey = getPublicKey(privkey);
    return { 
      privkey: Array.from(privkey, b => b.toString(16).padStart(2, '0')).join(''),
      pubkey 
    };
  }
}