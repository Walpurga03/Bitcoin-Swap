// Optimierter Nostr-Client für nostr-relay.online
import { StrategicNostrClient } from './strategicNostrClient';
import type { NostrEvent } from './types';

/**
 * Vorkonfigurierter Client für dein Bitcoin-Tausch-Netzwerk
 * Optimiert für nostr-relay.online + öffentliche Relays
 */
class OptimizedBitcoinNostrClient extends StrategicNostrClient {
  constructor() {
    // Starte mit HYBRID-Strategie da du eigenes Relay hast
    super('HYBRID', true);
    console.log('🎯 Bitcoin-Nostr-Client initialisiert mit nostr-relay.online');
  }

  /**
   * Spezielle Methode für private Gruppenchats
   * Nutzt nur dein eigenes Relay für maximale Privatsphäre
   */
  async publishPrivateGroupMessage(event: NostrEvent): Promise<void> {
    console.log('🔒 Sende private Gruppennachricht nur über nostr-relay.online');
    return this.publishEvent(event, 'PRIVATE_GROUPS');
  }

  /**
   * Spezielle Methode für Bitcoin-Angebote
   * Nutzt dein Relay + öffentliche für maximale Reichweite
   */
  async publishBitcoinOffer(event: NostrEvent): Promise<void> {
    console.log('💰 Sende Bitcoin-Angebot über alle verfügbaren Relays');
    return this.publishEvent(event, 'BITCOIN_OFFERS');
  }

  /**
   * Spezielle Methode für anonyme Angebote
   * Bevorzugt öffentliche Relays für bessere Anonymität
   */
  async publishAnonymousOffer(event: NostrEvent): Promise<void> {
    console.log('🎭 Sende anonymes Angebot bevorzugt über öffentliche Relays');
    return this.publishEvent(event, 'ANONYMOUS_OFFERS');
  }

  /**
   * Überwacht die Gesundheit deines eigenen Relays
   */
  getOwnRelayHealth() {
    const status = this.getStatus();
    const ownRelay = status.relayDetails.find(r => r.url === 'wss://nostr-relay.online');
    
    return {
      url: 'wss://nostr-relay.online',
      connected: ownRelay?.connected || false,
      reconnectAttempts: ownRelay?.reconnectAttempts || 0,
      isHealthy: ownRelay?.connected && (ownRelay.reconnectAttempts < 3),
      recommendation: this.getRelayRecommendation(ownRelay)
    };
  }

  /**
   * Gibt Empfehlungen für Relay-Optimierung
   */
  private getRelayRecommendation(ownRelay: any) {
    if (!ownRelay?.connected) {
      return '❌ Dein Relay ist offline - prüfe Server-Status';
    }
    
    if (ownRelay.reconnectAttempts > 2) {
      return '⚠️ Häufige Verbindungsabbrüche - prüfe Netzwerk-Stabilität';
    }
    
    return '✅ Dein Relay läuft optimal';
  }

  /**
   * Intelligente Relay-Auswahl basierend auf Kontext
   */
  async smartPublish(event: NostrEvent, context: {
    isPrivate?: boolean;
    isAnonymous?: boolean;
    needsGlobalReach?: boolean;
  }): Promise<void> {
    
    if (context.isPrivate) {
      // Private Nachrichten nur über dein Relay
      return this.publishPrivateGroupMessage(event);
    }
    
    if (context.isAnonymous) {
      // Anonyme Angebote bevorzugt über öffentliche Relays
      return this.publishAnonymousOffer(event);
    }
    
    if (context.needsGlobalReach) {
      // Bitcoin-Angebote über alle Relays für maximale Reichweite
      return this.publishBitcoinOffer(event);
    }
    
    // Standard: Bitcoin-Angebote
    return this.publishBitcoinOffer(event);
  }

  /**
   * Fragt Events ab (delegiert an Basis-Client)
   */
  async queryEvents(filter: any): Promise<NostrEvent[]> {
    return super.queryEvents(filter);
  }

  /**
   * Detailliertes Monitoring für dein Setup
   */
  getDetailedStatus() {
    const baseStatus = this.getStatus();
    const ownRelayHealth = this.getOwnRelayHealth();
    
    return {
      ...baseStatus,
      ownRelay: ownRelayHealth,
      performance: {
        totalRelays: baseStatus.totalRelays,
        connectedRelays: baseStatus.connectedRelays,
        ownRelayConnected: ownRelayHealth.connected,
        publicRelaysConnected: baseStatus.relaysByType.public,
        redundancyLevel: this.calculateRedundancy(baseStatus)
      },
      recommendations: this.getOptimizationRecommendations(baseStatus, ownRelayHealth)
    };
  }

  /**
   * Berechnet Redundanz-Level
   */
  private calculateRedundancy(status: any): string {
    const connected = status.connectedRelays;
    
    if (connected >= 4) return '🟢 Hoch (Optimal)';
    if (connected >= 2) return '🟡 Mittel (Gut)';
    if (connected >= 1) return '🟠 Niedrig (Funktional)';
    return '🔴 Keine (Kritisch)';
  }

  /**
   * Gibt Optimierungsempfehlungen
   */
  private getOptimizationRecommendations(status: any, ownRelay: any): string[] {
    const recommendations = [];
    
    if (!ownRelay.connected) {
      recommendations.push('🔧 Prüfe deinen Relay-Server nostr-relay.online');
    }
    
    if (status.connectedRelays < 2) {
      recommendations.push('📡 Füge weitere Backup-Relays hinzu');
    }
    
    if (status.relaysByType.public === 0) {
      recommendations.push('🌐 Verbinde zu öffentlichen Relays für Reichweite');
    }
    
    if (ownRelay.reconnectAttempts > 2) {
      recommendations.push('⚡ Optimiere Netzwerk-Verbindung zu deinem Relay');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Setup ist optimal konfiguriert');
    }
    
    return recommendations;
  }
}

// Singleton-Instanz optimiert für dein Setup
export const optimizedNostrClient = new OptimizedBitcoinNostrClient();

// Convenience-Funktionen für einfache Nutzung
export const bitcoinNostr = {
  // Verbindung aufbauen
  async connect() {
    await optimizedNostrClient.connect();
    const status = optimizedNostrClient.getDetailedStatus();
    console.log('🚀 Bitcoin-Nostr-Client verbunden:', status.performance);
    return status;
  },

  // Private Gruppennachricht senden
  async sendGroupMessage(event: NostrEvent) {
    return optimizedNostrClient.publishPrivateGroupMessage(event);
  },

  // Bitcoin-Angebot veröffentlichen
  async publishOffer(event: NostrEvent, isAnonymous = false) {
    if (isAnonymous) {
      return optimizedNostrClient.publishAnonymousOffer(event);
    }
    return optimizedNostrClient.publishBitcoinOffer(event);
  },

  // Events abonnieren
  subscribe(filter: any, onEvent: (event: NostrEvent) => void, context = 'BITCOIN_OFFERS') {
    return optimizedNostrClient.subscribe(filter, onEvent, context as any);
  },

  // Events abfragen
  async queryEvents(filter: any, context = 'BITCOIN_OFFERS') {
    return optimizedNostrClient.queryEvents(filter);
  },

  // Status abrufen
  getStatus() {
    return optimizedNostrClient.getDetailedStatus();
  },

  // Relay-Gesundheit prüfen
  checkHealth() {
    return optimizedNostrClient.getOwnRelayHealth();
  }
};