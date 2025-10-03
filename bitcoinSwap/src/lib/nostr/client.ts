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
import { localEventStore } from '../storage/localEventStore';

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
   * Event-Cache verwalten (mit Channel-ID Validierung)
   */
  private cacheEvent(event: NostrEvent) {
    // 🔒 SICHERHEIT: Nur Events für die aktuelle Channel cachen
    if (this.groupConfig) {
      const channelTag = event.tags.find(tag => tag[0] === 'e' && tag[1] === this.groupConfig!.channelId);
      if (!channelTag) {
        console.warn('🚫 Event gehört nicht zur aktuellen Channel, wird nicht gecacht:', event.id);
        return;
      }
    }

    if (this.eventCache.size >= this.maxCacheSize) {
      // Älteste Events entfernen (FIFO)
      const firstKey = this.eventCache.keys().next().value;
      if (firstKey) {
        this.eventCache.delete(firstKey);
      }
    }
    this.eventCache.set(event.id, event);
    console.log('💾 Event gecacht für Channel:', this.groupConfig?.channelId?.substring(0, 16) + '...', 'Event:', event.id);
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
    // 🔄 WICHTIG: Zusätzliche zuverlässige Relays hinzufügen für Event-Persistenz
    const additionalRelays = [
      'wss://relay.damus.io',
      'wss://nos.lol',
      'wss://relay.nostr.band'
    ];
    
    // Deduplizieren und kombinieren
    const allRelays = [...new Set([...relays, ...additionalRelays])];
    
    this.relays = allRelays;
    this.connectionStatus = 'connecting';
    console.log('🔗 Verbinde zu Relays:', allRelays);
    console.log('  📡 Primär:', relays);
    console.log('  🔄 Backup:', additionalRelays);
    
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
    // 🔥 WICHTIG: Cache und Nachrichten leeren bei Gruppenwechsel
    const previousChannelId = this.groupConfig?.channelId;
    if (previousChannelId && previousChannelId !== config.channelId) {
      console.log('🧹 Gruppenwechsel erkannt - leere Cache und Nachrichten');
      console.log('  📋 Alte Channel-ID:', previousChannelId);
      console.log('  📋 Neue Channel-ID:', config.channelId);
      
      // Event-Cache leeren
      this.eventCache.clear();
      
      // Alte Subscriptions beenden
      this.unsubscribeAll();
      
      console.log('✅ Cache geleert und Subscriptions beendet');
    }

    this.groupConfig = config;
    this.encryptionKey = await deriveKeyFromSecret(config.secret);
    console.log('🔧 Gruppe konfiguriert:');
    console.log('  📋 Channel ID:', config.channelId);
    console.log('  🔐 Secret (vollständig):', `"${config.secret}"`);
    console.log('  📡 Relay:', config.relay);
    console.log('  📛 Name:', config.name);
    console.log('  🗂️ Cache-Größe nach Konfiguration:', this.eventCache.size);
  }

  /**
   * Verschlüsselte Nachricht in die Gruppe senden
   */
  async sendGroupMessage(content: string, onLocalMessage?: (message: GroupMessage) => void): Promise<void> {
    if (!this.userProfile?.privkey || !this.groupConfig || !this.encryptionKey) {
      throw new Error('Client nicht vollständig konfiguriert');
    }

    // Nachricht verschlüsseln
    const encryptedContent = await encryptMessage(content, this.encryptionKey);

    // Nostr Event erstellen (Kind 1 für bessere Relay-Kompatibilität)
    const event: Partial<NostrEvent> = {
      kind: 1, // text_note (bessere Relay-Unterstützung)
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['e', this.groupConfig.channelId, '', 'root'], // Bezug zur Channel
        ['p', this.userProfile.pubkey], // Mention des eigenen pubkeys
        ['t', 'bitcoin-group'] // Hashtag für Filterung
      ],
      content: encryptedContent,
      pubkey: this.userProfile.pubkey
    };

    console.log('📤 Sende Event mit:');
    console.log('  📋 Channel ID:', this.groupConfig.channelId);
    console.log('  👤 Pubkey:', this.userProfile.pubkey.substring(0, 16) + '...');
    console.log('  🏷️ Tags:', event.tags);

    // Event signieren mit finalizeEvent
    const privkeyBytes = new Uint8Array(this.userProfile.privkey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const signedEvent = finalizeEvent(event as NostrEvent, privkeyBytes);
    
    // 🔍 DETAILLIERTE EVENT-LOGS
    console.log('🔍 VOLLSTÄNDIGES EVENT ZUM SPEICHERN:');
    console.log('  🆔 Event ID:', signedEvent.id);
    console.log('  🔢 Kind:', signedEvent.kind);
    console.log('  👤 Pubkey:', signedEvent.pubkey);
    console.log('  🏷️ Tags (vollständig):', JSON.stringify(signedEvent.tags, null, 2));
    console.log('  📝 Content (verschlüsselt):', signedEvent.content.substring(0, 50) + '...');
    console.log('  🕐 Created_at:', signedEvent.created_at, '(', new Date(signedEvent.created_at * 1000).toLocaleString(), ')');
    console.log('  ✍️ Sig:', signedEvent.sig.substring(0, 16) + '...');

    // 🚀 SOFORTIGE LOKALE ANZEIGE - Nachricht sofort anzeigen
    if (onLocalMessage) {
      const localMessage: GroupMessage = {
        id: signedEvent.id,
        pubkey: this.userProfile.pubkey,
        content: content, // Unverschlüsselte Version für lokale Anzeige
        timestamp: signedEvent.created_at,
        decrypted: true
      };
      console.log('⚡ Zeige Nachricht sofort lokal an:', localMessage.id);
      onLocalMessage(localMessage);
    }

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
    
    // � WICHTIG: Event LOKAL speichern (garantierte Persistenz!)
    try {
      await localEventStore.saveEvent(this.groupConfig.channelId, signedEvent);
      console.log('✅ Event lokal gespeichert für späteres Laden');
    } catch (error) {
      console.error('❌ Fehler beim lokalen Speichern:', error);
      // Nicht kritisch - Event wurde bereits an Relays gesendet
    }
    
    // �🐛 DEBUG: Prüfe ob Event wirklich gespeichert wurde (nach 2 Sekunden)
    setTimeout(async () => {
      console.log('🐛 DEBUG: Prüfe ob Event im Relay gespeichert wurde...');
      const checkEvents = await this.pool.querySync(this.relays, { 
        ids: [signedEvent.id],
        kinds: [1]
      } as any);
      
      if (checkEvents.length > 0) {
        console.log('✅ DEBUG: Event WURDE im Relay gespeichert! Event-ID:', signedEvent.id);
        console.log('✅ DEBUG: Tags im gespeicherten Event:', checkEvents[0].tags);
      } else {
        console.warn('⚠️ DEBUG: Event wurde NICHT im Relay gespeichert! Event-ID:', signedEvent.id);
        console.warn('⚠️ DEBUG: Aber Event ist lokal gespeichert und wird beim Re-Login geladen!');
      }
    }, 2000);
  }

  /**
   * Debug: Alle Events vom Relay abrufen (ohne Filter)
   */
  async debugFetchAllEvents(): Promise<void> {
    console.log('🐛 DEBUG: Lade ALLE Events (ohne Channel-Filter)...');
    
    const debugFilter: Filter = {
      kinds: [1],
      limit: 50
    } as any;

    const events = await this.pool.querySync(this.relays, debugFilter as any);
    
    console.log(`🐛 DEBUG: ${events.length} Events vom Relay gefunden (ohne Filter)`);
    events.forEach(event => {
      console.log('🐛 Event:', event.id);
      console.log('   Kind:', event.kind);
      console.log('   Pubkey:', event.pubkey.substring(0, 16));
      console.log('   Tags:', event.tags);
      console.log('   Content:', event.content.substring(0, 30) + '...');
    });
  }

  /**
   * Manuelle Aktualisierung der Gruppennachrichten
   */
  async refreshGroupMessages(callback: (message: GroupMessage) => void): Promise<number> {
    if (!this.groupConfig) {
      throw new Error('Gruppe nicht konfiguriert');
    }

    console.log('🔄 Lade neueste Nachrichten vom Relay...');
    
    const now = Math.floor(Date.now() / 1000);
    const refreshFilter: Filter = {
      kinds: [1], // text_note
      authors: [this.userProfile!.pubkey], // NUR eigene Events
      since: now - (90 * 24 * 60 * 60), // Letzte 90 Tage
      limit: 500 // Maximal 500 Events
    } as any;

    console.log('🔍 Refresh Filter:', refreshFilter);

    let messageCount = 0;
    
    return new Promise((resolve) => {
      const refreshSub = this.pool.subscribeMany(
        this.relays,
        [refreshFilter] as any,
        {
          onevent: async (event: NostrEvent) => {
            try {
              console.log('🔄 Refresh Event:', event.id, 'from', event.pubkey.substring(0, 8));
              
              // Duplikate vermeiden
              if (this.isEventCached(event.id)) {
                console.log('⚠️ Event bereits im Cache, überspringe:', event.id);
                return;
              }
              this.cacheEvent(event);

              // Channel-Prüfung
              const channelTag = event.tags.find(tag => tag[0] === 'e' && tag[1] === this.groupConfig!.channelId);
              if (!channelTag) {
                console.log('⚠️ Event nicht für diese Channel:', event.id);
                return;
              }

              // Nachricht entschlüsseln
              let decryptedContent = event.content;
              let decrypted = false;

              if (this.encryptionKey) {
                try {
                  decryptedContent = await decryptMessage(event.content, this.encryptionKey);
                  decrypted = true;
                } catch (error) {
                  console.warn('🔒 Entschlüsselung fehlgeschlagen:', event.id);
                  decryptedContent = '[Verschlüsselte Nachricht]';
                }
              }

              const message: GroupMessage = {
                id: event.id,
                pubkey: event.pubkey,
                content: decryptedContent,
                timestamp: event.created_at,
                decrypted
              };

              console.log('✅ Refresh Message verarbeitet:', message.id);
              callback(message);
              messageCount++;
            } catch (error) {
              console.error('❌ Fehler beim Verarbeiten der Refresh-Nachricht:', error);
            }
          },
          oneose: () => {
            console.log(`✅ Refresh abgeschlossen: ${messageCount} neue Nachrichten geladen`);
            refreshSub.close();
            resolve(messageCount);
          },
          onclose: () => {
            console.log('🔌 Refresh-Subscription geschlossen');
          }
        }
      );

      // Timeout nach 10 Sekunden
      setTimeout(() => {
        refreshSub.close();
        resolve(messageCount);
      }, 10000);
    });
  }

  /**
   * Auf Gruppennachrichten hören
   */
  async subscribeToGroupMessages(callback: (message: GroupMessage) => void) {
    if (!this.groupConfig) {
      throw new Error('Gruppe nicht konfiguriert');
    }

    // 🎯 SCHRITT 1: Lokale Events ZUERST laden (sofort verfügbar!)
    console.log('💾 Lade lokale Events aus IndexedDB...');
    try {
      const localEvents = await localEventStore.loadEvents(this.groupConfig.channelId);
      console.log(`✅ ${localEvents.length} lokale Events gefunden`);
      
      // Lokale Events sofort anzeigen
      for (const event of localEvents) {
        if (this.isEventCached(event.id)) {
          continue; // Duplikat überspringen
        }
        this.cacheEvent(event);
        
        // Entschlüsseln und anzeigen
        try {
          const decryptedContent = await decryptMessage(event.content, this.encryptionKey!);
          const message: GroupMessage = {
            id: event.id,
            pubkey: event.pubkey,
            content: decryptedContent,
            timestamp: event.created_at,
            decrypted: true
          };
          callback(message);
        } catch (error) {
          console.warn('⚠️ Konnte lokales Event nicht entschlüsseln:', event.id);
        }
      }
    } catch (error) {
      console.warn('⚠️ Fehler beim Laden lokaler Events:', error);
    }

    // Zwei Filter: Einer für historische Events, einer für Live-Events
    const now = Math.floor(Date.now() / 1000); // Aktuelle Zeit in Sekunden
    
    // 🔧 ULTIMATIVE STRATEGIE: Lade NUR Events vom eigenen Pubkey
    // Grund: Relays geben keine Events zurück ohne authors-Filter
    // Die clientseitige Filterung nach Channel-ID sorgt für Gruppentrennung
    const historicalFilter: Filter = {
      kinds: [1], // text_note
      authors: [this.userProfile!.pubkey], // NUR eigene Events
      since: now - (90 * 24 * 60 * 60), // Letzte 90 Tage
      limit: 500 // Maximal 500 Events
    } as any;

    const liveFilter: Filter = {
      kinds: [1], // text_note
      authors: [this.userProfile!.pubkey], // NUR eigene Events
      since: now // Ab jetzt (Live-Events)
    } as any;

    console.log('🔍 Subscribing to group messages with filters:');
    console.log('  📋 Channel ID:', this.groupConfig.channelId);
    console.log('  🔐 Secret (first 8 chars):', this.groupConfig.secret.substring(0, 8) + '...');
    console.log('  📊 Historical Filter (JSON):', JSON.stringify(historicalFilter, null, 2));
    console.log('  📊 Live Filter (JSON):', JSON.stringify(liveFilter, null, 2));
    console.log('  ⏰ Historical: ALLE Events (kein since-Filter)');
    console.log('  ⏰ Live: seit', new Date(liveFilter.since! * 1000).toLocaleString());
    console.log('  �️ Filter-Strategie: Hashtag #t=bitcoin-group (clientseitige Channel-Filterung)');
    console.log('  🎯 Clientseitige Filterung nach Channel-ID:', this.groupConfig.channelId);

    console.log('🚀 Starte Subscription mit Relays:', this.relays);
    console.log('📊 Filter werden gesendet an Relay...');
    
    // 🐛 DEBUG: Test ob Relays überhaupt Events mit #e Tags unterstützen
    console.log('🐛 DEBUG: Teste ob Relays #e Tag Queries unterstützen...');
    this.pool.querySync(this.relays, { kinds: [1], limit: 10 } as any).then(testEvents => {
      console.log(`🐛 DEBUG: ${testEvents.length} Events gefunden (ohne #e Filter)`);
      const eventsWithETags = testEvents.filter(e => e.tags.some(t => t[0] === 'e'));
      console.log(`🐛 DEBUG: ${eventsWithETags.length} davon haben e-Tags`);
      if (eventsWithETags.length > 0) {
        console.log('🐛 DEBUG: Beispiel e-Tags:', eventsWithETags[0].tags.filter(t => t[0] === 'e'));
      }
    });
    
    const sub = this.pool.subscribeMany(
      this.relays,
      [historicalFilter, liveFilter] as any,
      {
        onevent: async (event: NostrEvent) => {
          console.log('🎯 RELAY ANTWORT: Event empfangen!', event.id);
          console.log('🔍 VOLLSTÄNDIGES EVENT VOM RELAY:');
          console.log('  🆔 Event ID:', event.id);
          console.log('  🔢 Kind:', event.kind);
          console.log('  👤 Pubkey:', event.pubkey);
          console.log('  🏷️ Tags (vollständig):', JSON.stringify(event.tags, null, 2));
          console.log('  📝 Content (Anfang):', event.content.substring(0, 50) + '...');
          console.log('  🕐 Created_at:', event.created_at, '(', new Date(event.created_at * 1000).toLocaleString(), ')');
          
          try {
            console.log('📨 Received event:', event.id, 'from', event.pubkey.substring(0, 8));
            
            // Duplikate vermeiden durch Cache-Prüfung
            if (this.isEventCached(event.id)) {
              console.log('⚠️ Event already cached, skipping:', event.id);
              return;
            }
            this.cacheEvent(event);

            // 🔒 STRENGE Channel-Prüfung
            const channelTag = event.tags.find(tag => tag[0] === 'e' && tag[1] === this.groupConfig!.channelId);
            if (!channelTag) {
              console.log('⚠️ Event nicht für diese Channel, ignoriert:', event.id);
              console.log('  📋 Erwartet Channel-ID:', this.groupConfig!.channelId);
              console.log('  📋 Event hat Channel-Tags:', event.tags.filter(t => t[0] === 'e'));
              console.log('  📋 ALLE Tags:', event.tags);
              return;
            }

            // 🔒 ZUSÄTZLICHE VALIDIERUNG: Channel-ID muss exakt übereinstimmen
            if (channelTag[1] !== this.groupConfig!.channelId) {
              console.log('🚫 Channel-ID stimmt nicht exakt überein, ignoriert:', event.id);
              console.log('  📋 Erwartet:', this.groupConfig!.channelId);
              console.log('  📋 Gefunden:', channelTag[1]);
              return;
            }

            // 🔍 DEBUGGING: Alle Events loggen (auch eigene)
            console.log('📨 Event Details:');
            console.log('  🆔 ID:', event.id);
            console.log('  👤 From:', event.pubkey.substring(0, 16) + '...');
            console.log('  👤 Own pubkey:', this.userProfile?.pubkey.substring(0, 16) + '...');
            console.log('  📋 Channel tags:', event.tags.filter(t => t[0] === 'e'));
            console.log('  🕐 Timestamp:', new Date(event.created_at * 1000).toLocaleString());

            // 🔍 TEMPORÄR: Alle Nachrichten verarbeiten (auch eigene) für Debugging
            const isOwnMessage = event.pubkey === this.userProfile?.pubkey;
            console.log(`📨 ${isOwnMessage ? 'EIGENE' : 'FREMDE'} Nachricht empfangen:`, event.id);
            
            // TODO: Später wieder aktivieren wenn Live-Updates funktionieren
            // if (isOwnMessage) {
            //   console.log('⚠️ Eigene Nachricht vom Relay empfangen, bereits lokal angezeigt:', event.id);
            //   return;
            // }

            // Nachricht entschlüsseln
            let decryptedContent = event.content;
            let decrypted = false;

            if (this.encryptionKey) {
              try {
                decryptedContent = await decryptMessage(event.content, this.encryptionKey);
                decrypted = true;
                console.log('🔓 Message decrypted successfully');
              } catch (error) {
                console.warn('🔒 Entschlüsselung fehlgeschlagen für Event:', event.id, error);
                // Fallback: Zeige verschlüsselte Nachricht an
                decryptedContent = '[Verschlüsselte Nachricht]';
              }
            }

            const message: GroupMessage = {
              id: event.id,
              pubkey: event.pubkey,
              content: decryptedContent,
              timestamp: event.created_at,
              decrypted
            };

            console.log('✅ Processing message from relay:', message.id, 'content length:', message.content.length);
            
            // 💾 Event vom Relay auch lokal speichern (für nächsten Login)
            try {
              await localEventStore.saveEvent(this.groupConfig!.channelId, event);
              console.log('💾 Relay-Event lokal gespeichert:', event.id);
            } catch (error) {
              console.warn('⚠️ Konnte Relay-Event nicht lokal speichern:', error);
            }
            
            callback(message);
          } catch (error) {
            console.error('❌ Fehler beim Verarbeiten der Nachricht:', error);
          }
        },
        oneose: () => {
          console.log('✅ Initiale Gruppennachrichten geladen');
          console.log('📊 RELAY-STATUS: End of stored events (EOSE) empfangen');
          console.log('📊 Cache-Größe nach EOSE:', this.eventCache.size);
          console.log('⚠️ WICHTIG: Wenn Cache-Größe 0 ist, hat das Relay KEINE Events für diese Filter zurückgegeben!');
          console.log('🔍 Das bedeutet entweder:');
          console.log('   1. Es wurden noch keine Events mit dieser Channel-ID gespeichert');
          console.log('   2. Das Relay hat die Events verloren/gelöscht');
          console.log('   3. Der Filter ist falsch (Channel-ID stimmt nicht)');
          this.connectionStatus = 'connected';
          this.reconnectAttempts = 0;
        },
        onclose: () => {
          console.log('🔌 Subscription geschlossen');
          this.connectionStatus = 'disconnected';
        }
      }
    );

    this.subscriptions.set('groupMessages', sub);
    console.log('📡 Subscription für Gruppennachrichten gestartet');
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