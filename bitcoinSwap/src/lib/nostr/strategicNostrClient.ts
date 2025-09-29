// Strategischer Nostr-Client mit flexibler Relay-Konfiguration
import type { NostrEvent } from './types';
import { RELAY_CONFIGS, CONTEXT_CONFIGS, getOptimalRelays, type RelayConfig } from './relayConfig';

export interface NostrRelay {
  url: string;
  socket?: WebSocket;
  connected: boolean;
  subscriptions: Map<string, any>;
  config: RelayConfig;
  lastPing?: number;
  reconnectAttempts: number;
}

export type RelayStrategy = 'PUBLIC_ONLY' | 'HYBRID' | 'PRIVATE_ONLY';
export type UsageContext = 'PRIVATE_GROUPS' | 'BITCOIN_OFFERS' | 'ANONYMOUS_OFFERS';

export class StrategicNostrClient {
  private relays: Map<string, NostrRelay> = new Map();
  private subscriptions: Map<string, any> = new Map();
  private eventCallbacks: Map<string, (event: NostrEvent) => void> = new Map();
  private currentStrategy: RelayStrategy = 'PUBLIC_ONLY';
  private hasOwnRelay: boolean = false;

  constructor(strategy: RelayStrategy = 'PUBLIC_ONLY', hasOwnRelay: boolean = false) {
    this.currentStrategy = strategy;
    this.hasOwnRelay = hasOwnRelay;
    this.initializeRelays();
  }

  /**
   * Initialisiert Relays basierend auf der gewählten Strategie
   */
  private initializeRelays(): void {
    const relayConfigs = this.getRelayConfigsForStrategy();
    
    relayConfigs.forEach(config => {
      this.relays.set(config.url, {
        url: config.url,
        connected: false,
        subscriptions: new Map(),
        config,
        reconnectAttempts: 0
      });
    });

    console.log(`🎯 Nostr-Client initialisiert mit Strategie: ${this.currentStrategy}`);
    console.log(`📡 Konfigurierte Relays:`, relayConfigs.map(r => `${r.url} (${r.purpose})`));
  }

  /**
   * Gibt Relay-Konfigurationen für die aktuelle Strategie zurück
   */
  private getRelayConfigsForStrategy(): RelayConfig[] {
    switch (this.currentStrategy) {
      case 'PRIVATE_ONLY':
        return RELAY_CONFIGS.PRIVATE_ONLY;
      case 'HYBRID':
        return RELAY_CONFIGS.HYBRID;
      case 'PUBLIC_ONLY':
      default:
        return RELAY_CONFIGS.PUBLIC_ONLY;
    }
  }

  /**
   * Wechselt die Relay-Strategie zur Laufzeit
   */
  async switchStrategy(newStrategy: RelayStrategy, hasOwnRelay?: boolean): Promise<void> {
    console.log(`🔄 Wechsle Relay-Strategie von ${this.currentStrategy} zu ${newStrategy}`);
    
    // Alte Verbindungen trennen
    this.disconnect();
    
    // Neue Strategie setzen
    this.currentStrategy = newStrategy;
    if (hasOwnRelay !== undefined) {
      this.hasOwnRelay = hasOwnRelay;
    }
    
    // Relays neu initialisieren
    this.relays.clear();
    this.initializeRelays();
    
    // Neu verbinden
    await this.connect();
  }

  /**
   * Wählt optimale Relays für einen spezifischen Kontext
   */
  getRelaysForContext(context: UsageContext): NostrRelay[] {
    const contextConfig = CONTEXT_CONFIGS[context];
    const allRelays = Array.from(this.relays.values());
    
    if (contextConfig.usePrivateOnly) {
      // Nur private Relays verwenden
      return allRelays.filter(relay => relay.config.purpose === 'private');
    }
    
    if (contextConfig.preferPublic) {
      // Öffentliche Relays bevorzugen
      return allRelays.filter(relay => 
        relay.config.purpose === 'public' || relay.config.purpose === 'backup'
      );
    }
    
    // Alle verfügbaren Relays verwenden
    return allRelays.filter(relay => relay.connected);
  }

  /**
   * Verbindet zu allen konfigurierten Relays
   */
  async connect(): Promise<void> {
    const connectionPromises = Array.from(this.relays.keys()).map(url => 
      this.connectToRelay(url)
    );

    const results = await Promise.allSettled(connectionPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`🌐 Nostr-Client Verbindungsstatus: ${successful} erfolgreich, ${failed} fehlgeschlagen`);
    
    if (successful === 0) {
      throw new Error('Keine Relay-Verbindungen möglich');
    }
  }

  /**
   * Verbindet zu einem spezifischen Relay mit Retry-Logic
   */
  private async connectToRelay(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const relay = this.relays.get(url);
      if (!relay) {
        reject(new Error(`Relay ${url} nicht konfiguriert`));
        return;
      }

      try {
        const socket = new WebSocket(url);
        
        socket.onopen = () => {
          relay.connected = true;
          relay.socket = socket;
          relay.reconnectAttempts = 0;
          relay.lastPing = Date.now();
          
          console.log(`✅ Verbunden zu ${relay.config.purpose}-Relay: ${url}`);
          resolve();
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleRelayMessage(url, message);
          } catch (error) {
            console.warn(`⚠️ Parsing-Fehler von ${url}:`, error);
          }
        };

        socket.onerror = (error) => {
          console.warn(`❌ Fehler bei ${relay.config.purpose}-Relay ${url}:`, error);
          relay.connected = false;
          this.scheduleReconnect(url);
          reject(error);
        };

        socket.onclose = () => {
          console.log(`🔌 Verbindung zu ${relay.config.purpose}-Relay ${url} geschlossen`);
          relay.connected = false;
          relay.socket = undefined;
          this.scheduleReconnect(url);
        };

        // Timeout basierend auf Relay-Priorität
        const timeout = relay.config.priority === 1 ? 5000 : 3000;
        setTimeout(() => {
          if (!relay.connected) {
            socket.close();
            reject(new Error(`Timeout bei ${url} nach ${timeout}ms`));
          }
        }, timeout);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Plant automatische Wiederverbindung
   */
  private scheduleReconnect(url: string): void {
    const relay = this.relays.get(url);
    if (!relay || relay.reconnectAttempts >= 5) return;

    const delay = Math.min(1000 * Math.pow(2, relay.reconnectAttempts), 30000);
    relay.reconnectAttempts++;

    setTimeout(async () => {
      if (!relay.connected) {
        console.log(`🔄 Wiederverbindungsversuch ${relay.reconnectAttempts} für ${url}`);
        try {
          await this.connectToRelay(url);
        } catch (error) {
          console.warn(`❌ Wiederverbindung zu ${url} fehlgeschlagen:`, error);
        }
      }
    }, delay);
  }

  /**
   * Behandelt eingehende Relay-Nachrichten
   */
  private handleRelayMessage(relayUrl: string, message: any[]): void {
    const [type, ...data] = message;
    const relay = this.relays.get(relayUrl);

    switch (type) {
      case 'EVENT':
        const [subscriptionId, event] = data;
        this.handleEvent(subscriptionId, event);
        break;
      
      case 'OK':
        const [eventId, success, reason] = data;
        const status = success ? '✅' : '❌';
        console.log(`${status} Event ${eventId} auf ${relay?.config.purpose}-Relay: ${reason || 'OK'}`);
        break;
      
      case 'EOSE':
        const [subId] = data;
        console.log(`📋 EOSE für Subscription ${subId} von ${relay?.config.purpose}-Relay`);
        break;
      
      default:
        console.log(`❓ Unbekannter Message-Type von ${relayUrl}:`, type);
    }
  }

  /**
   * Behandelt eingehende Events
   */
  private handleEvent(subscriptionId: string, event: NostrEvent): void {
    const callback = this.eventCallbacks.get(subscriptionId);
    if (callback) {
      callback(event);
    }
  }

  /**
   * Veröffentlicht Event kontextspezifisch
   */
  async publishEvent(event: NostrEvent, context: UsageContext = 'BITCOIN_OFFERS'): Promise<void> {
    const targetRelays = this.getRelaysForContext(context).filter(r => r.connected);
    
    if (targetRelays.length === 0) {
      throw new Error(`Keine verbundenen Relays für Kontext ${context} verfügbar`);
    }

    const publishPromises = targetRelays.map(relay => {
      return new Promise<void>((resolve, reject) => {
        if (!relay.socket) {
          reject(new Error(`Socket für ${relay.url} nicht verfügbar`));
          return;
        }

        try {
          const message = ['EVENT', event];
          relay.socket.send(JSON.stringify(message));
          console.log(`📤 Event Kind ${event.kind} gesendet an ${relay.config.purpose}-Relay ${relay.url}`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });

    const results = await Promise.allSettled(publishPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`📊 Event an ${successful}/${targetRelays.length} ${context}-Relays gesendet`);
  }

  /**
   * Abonniert Events kontextspezifisch
   */
  subscribe(
    filter: any, 
    onEvent: (event: NostrEvent) => void,
    context: UsageContext = 'BITCOIN_OFFERS',
    subscriptionId?: string
  ): string {
    const subId = subscriptionId || `sub_${context}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.eventCallbacks.set(subId, onEvent);
    this.subscriptions.set(subId, { filter, context });

    const targetRelays = this.getRelaysForContext(context).filter(r => r.connected);
    
    targetRelays.forEach(relay => {
      if (relay.socket) {
        const message = ['REQ', subId, filter];
        relay.socket.send(JSON.stringify(message));
        console.log(`🔔 Subscription ${subId} für ${context} auf ${relay.config.purpose}-Relay ${relay.url}`);
      }
    });

    return subId;
  }

  /**
   * Fragt Events mit einem Filter ab
   */
  async queryEvents(filter: any): Promise<NostrEvent[]> {
    return new Promise((resolve, reject) => {
      const events: NostrEvent[] = [];
      const timeout = 10000; // 10 Sekunden Timeout
      
      const subscriptionId = this.subscribe(filter, (event) => {
        events.push(event);
      }, 'BITCOIN_OFFERS');

      // Timeout für die Abfrage
      const timeoutId = setTimeout(() => {
        this.unsubscribe(subscriptionId);
        resolve(events);
      }, timeout);

      // Bei EOSE (End of Stored Events) beenden
      const originalCallback = this.eventCallbacks.get(subscriptionId);
      this.eventCallbacks.set(subscriptionId, (event) => {
        if (originalCallback) originalCallback(event);
        events.push(event);
      });
    });
  }

  /**
   * Beendet Subscription
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    this.eventCallbacks.delete(subscriptionId);
    this.subscriptions.delete(subscriptionId);

    const targetRelays = this.getRelaysForContext(subscription.context).filter(r => r.connected);
    
    targetRelays.forEach(relay => {
      if (relay.socket) {
        const message = ['CLOSE', subscriptionId];
        relay.socket.send(JSON.stringify(message));
      }
    });

    console.log(`❌ Subscription ${subscriptionId} beendet`);
  }

  /**
   * Trennt alle Verbindungen
   */
  disconnect(): void {
    this.relays.forEach(relay => {
      if (relay.socket) {
        relay.socket.close();
      }
    });
    
    this.subscriptions.clear();
    this.eventCallbacks.clear();
    console.log('🔌 Alle Nostr-Verbindungen getrennt');
  }

  /**
   * Detaillierte Status-Informationen
   */
  getStatus() {
    const relaysByType = {
      private: Array.from(this.relays.values()).filter(r => r.config.purpose === 'private'),
      public: Array.from(this.relays.values()).filter(r => r.config.purpose === 'public'),
      backup: Array.from(this.relays.values()).filter(r => r.config.purpose === 'backup')
    };

    const connectedByType = {
      private: relaysByType.private.filter(r => r.connected).length,
      public: relaysByType.public.filter(r => r.connected).length,
      backup: relaysByType.backup.filter(r => r.connected).length
    };

    return {
      strategy: this.currentStrategy,
      hasOwnRelay: this.hasOwnRelay,
      totalRelays: this.relays.size,
      connectedRelays: Array.from(this.relays.values()).filter(r => r.connected).length,
      relaysByType: connectedByType,
      subscriptions: this.subscriptions.size,
      relayDetails: Array.from(this.relays.values()).map(relay => ({
        url: relay.url,
        purpose: relay.config.purpose,
        priority: relay.config.priority,
        connected: relay.connected,
        reconnectAttempts: relay.reconnectAttempts,
        description: relay.config.description
      }))
    };
  }
}

// Singleton-Instanz mit konfigurierbarer Strategie
export const strategicNostrClient = new StrategicNostrClient('PUBLIC_ONLY', false);