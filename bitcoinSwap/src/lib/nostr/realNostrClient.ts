// Echter Nostr-Client für Bitcoin-Angebote
import type { NostrEvent } from './types';

export interface NostrRelay {
  url: string;
  socket?: WebSocket;
  connected: boolean;
  subscriptions: Map<string, any>;
}

export class RealNostrClient {
  private relays: Map<string, NostrRelay> = new Map();
  private subscriptions: Map<string, any> = new Map();
  private eventCallbacks: Map<string, (event: NostrEvent) => void> = new Map();

  constructor() {
    // Standard Nostr-Relays
    const defaultRelays = [
      'wss://relay.damus.io',
      'wss://nos.lol',
      'wss://relay.nostr.band',
      'wss://nostr-pub.wellorder.net'
    ];

    defaultRelays.forEach(url => {
      this.relays.set(url, {
        url,
        connected: false,
        subscriptions: new Map()
      });
    });
  }

  /**
   * Verbindet zu allen Relays
   */
  async connect(): Promise<void> {
    const connectionPromises = Array.from(this.relays.keys()).map(url => 
      this.connectToRelay(url)
    );

    await Promise.allSettled(connectionPromises);
    console.log('Nostr-Client verbunden zu', this.getConnectedRelays().length, 'Relays');
  }

  /**
   * Verbindet zu einem spezifischen Relay
   */
  private async connectToRelay(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const relay = this.relays.get(url);
        if (!relay) {
          reject(new Error(`Relay ${url} nicht gefunden`));
          return;
        }

        const socket = new WebSocket(url);
        
        socket.onopen = () => {
          relay.connected = true;
          relay.socket = socket;
          console.log(`✅ Verbunden zu Relay: ${url}`);
          resolve();
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleRelayMessage(url, message);
          } catch (error) {
            console.warn(`Fehler beim Parsen der Relay-Nachricht von ${url}:`, error);
          }
        };

        socket.onerror = (error) => {
          console.warn(`❌ Fehler bei Relay ${url}:`, error);
          relay.connected = false;
          reject(error);
        };

        socket.onclose = () => {
          console.log(`🔌 Verbindung zu Relay ${url} geschlossen`);
          relay.connected = false;
          relay.socket = undefined;
        };

        // Timeout nach 5 Sekunden
        setTimeout(() => {
          if (!relay.connected) {
            socket.close();
            reject(new Error(`Timeout bei Verbindung zu ${url}`));
          }
        }, 5000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Behandelt eingehende Nachrichten von Relays
   */
  private handleRelayMessage(relayUrl: string, message: any[]) {
    const [type, ...data] = message;

    switch (type) {
      case 'EVENT':
        const [subscriptionId, event] = data;
        this.handleEvent(subscriptionId, event);
        break;
      
      case 'OK':
        const [eventId, success, reason] = data;
        console.log(`Event ${eventId} ${success ? 'erfolgreich' : 'fehlgeschlagen'}: ${reason || ''}`);
        break;
      
      case 'EOSE':
        const [subId] = data;
        console.log(`End of stored events für Subscription ${subId}`);
        break;
      
      default:
        console.log(`Unbekannter Message-Type von ${relayUrl}:`, type, data);
    }
  }

  /**
   * Behandelt eingehende Events
   */
  private handleEvent(subscriptionId: string, event: NostrEvent) {
    const callback = this.eventCallbacks.get(subscriptionId);
    if (callback) {
      callback(event);
    }
  }

  /**
   * Veröffentlicht ein Event an alle verbundenen Relays
   */
  async publishEvent(event: NostrEvent): Promise<void> {
    const connectedRelays = this.getConnectedRelays();
    
    if (connectedRelays.length === 0) {
      throw new Error('Keine verbundenen Relays verfügbar');
    }

    const publishPromises = connectedRelays.map(relay => {
      return new Promise<void>((resolve, reject) => {
        if (!relay.socket) {
          reject(new Error(`Socket für ${relay.url} nicht verfügbar`));
          return;
        }

        try {
          const message = ['EVENT', event];
          relay.socket.send(JSON.stringify(message));
          console.log(`📤 Event gesendet an ${relay.url}:`, event.kind);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });

    await Promise.allSettled(publishPromises);
  }

  /**
   * Abonniert Events mit einem Filter
   */
  subscribe(
    filter: any, 
    onEvent: (event: NostrEvent) => void,
    subscriptionId?: string
  ): string {
    const subId = subscriptionId || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.eventCallbacks.set(subId, onEvent);
    this.subscriptions.set(subId, filter);

    const connectedRelays = this.getConnectedRelays();
    
    connectedRelays.forEach(relay => {
      if (relay.socket) {
        const message = ['REQ', subId, filter];
        relay.socket.send(JSON.stringify(message));
        console.log(`🔔 Subscription ${subId} gestartet auf ${relay.url}`);
      }
    });

    return subId;
  }

  /**
   * Beendet eine Subscription
   */
  unsubscribe(subscriptionId: string): void {
    this.eventCallbacks.delete(subscriptionId);
    this.subscriptions.delete(subscriptionId);

    const connectedRelays = this.getConnectedRelays();
    
    connectedRelays.forEach(relay => {
      if (relay.socket) {
        const message = ['CLOSE', subscriptionId];
        relay.socket.send(JSON.stringify(message));
      }
    });

    console.log(`❌ Subscription ${subscriptionId} beendet`);
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
      });

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
   * Gibt alle verbundenen Relays zurück
   */
  private getConnectedRelays(): NostrRelay[] {
    return Array.from(this.relays.values()).filter(relay => relay.connected);
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
   * Status-Informationen
   */
  getStatus() {
    const connectedCount = this.getConnectedRelays().length;
    const totalCount = this.relays.size;
    
    return {
      connected: connectedCount > 0,
      connectedRelays: connectedCount,
      totalRelays: totalCount,
      subscriptions: this.subscriptions.size,
      relays: Array.from(this.relays.values()).map(relay => ({
        url: relay.url,
        connected: relay.connected
      }))
    };
  }
}

// Singleton-Instanz
export const nostrClient = new RealNostrClient();