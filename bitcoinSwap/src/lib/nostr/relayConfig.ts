// Strategische Relay-Konfiguration für Bitcoin-Tausch-Netzwerk

export interface RelayConfig {
  url: string;
  purpose: 'private' | 'public' | 'backup';
  priority: number;
  description: string;
}

export const RELAY_CONFIGS = {
  // Option A: Nur öffentliche Relays (aktuell)
  PUBLIC_ONLY: [
    {
      url: 'wss://relay.damus.io',
      purpose: 'public' as const,
      priority: 1,
      description: 'Haupt-Relay - sehr stabil und schnell'
    },
    {
      url: 'wss://nos.lol',
      purpose: 'public' as const,
      priority: 2,
      description: 'Backup-Relay - gute Performance'
    },
    {
      url: 'wss://relay.nostr.band',
      purpose: 'public' as const,
      priority: 3,
      description: 'Zusätzliche Redundanz'
    },
    {
      url: 'wss://nostr-pub.wellorder.net',
      purpose: 'backup' as const,
      priority: 4,
      description: 'Fallback bei Ausfällen'
    }
  ],

  // Option B: Hybrid mit eigenem Relay (OPTIMIERT FÜR nostr-relay.online)
  HYBRID: [
    {
      url: 'wss://nostr-relay.online',
      purpose: 'private' as const,
      priority: 1,
      description: 'Dein eigenes Relay - maximale Kontrolle und Performance'
    },
    {
      url: 'wss://relay.damus.io',
      purpose: 'public' as const,
      priority: 2,
      description: 'Öffentlich für globale Reichweite'
    },
    {
      url: 'wss://nos.lol',
      purpose: 'public' as const,
      priority: 3,
      description: 'Öffentlich für Redundanz'
    },
    {
      url: 'wss://relay.nostr.band',
      purpose: 'backup' as const,
      priority: 4,
      description: 'Backup für Ausfallsicherheit'
    }
  ],

  // Option C: Nur eigenes Relay (maximale Privatsphäre)
  PRIVATE_ONLY: [
    {
      url: 'wss://nostr-relay.online',
      purpose: 'private' as const,
      priority: 1,
      description: 'Dein Haupt-Relay unter vollständiger Kontrolle'
    }
  ]
};

// Verwendungskontext-spezifische Konfigurationen
export const CONTEXT_CONFIGS = {
  // Private Gruppen (Phase 1) - maximale Privatsphäre
  PRIVATE_GROUPS: {
    usePrivateOnly: true,
    fallbackToPublic: false,
    preferPublic: false,
    description: 'Nur eigene Relays für verschlüsselte Gruppenchats'
  },

  // Bitcoin-Angebote (Phase 2-4) - Balance zwischen Privatsphäre und Reichweite
  BITCOIN_OFFERS: {
    usePrivateOnly: false,
    fallbackToPublic: true,
    preferPublic: false,
    description: 'Mix aus eigenen und öffentlichen Relays für maximale Reichweite'
  },

  // Anonyme Angebote (Phase 3) - öffentliche Relays für Anonymität
  ANONYMOUS_OFFERS: {
    usePrivateOnly: false,
    fallbackToPublic: true,
    preferPublic: true,
    description: 'Bevorzugt öffentliche Relays für bessere Anonymität'
  }
};

/**
 * Wählt die optimalen Relays basierend auf dem Kontext
 */
export function getOptimalRelays(
  context: keyof typeof CONTEXT_CONFIGS,
  hasOwnRelay: boolean = false
): RelayConfig[] {
  const config = CONTEXT_CONFIGS[context];
  
  if (hasOwnRelay) {
    // Du hast eigene Relays
    if (config.usePrivateOnly) {
      return RELAY_CONFIGS.PRIVATE_ONLY;
    } else {
      return RELAY_CONFIGS.HYBRID;
    }
  } else {
    // Nur öffentliche Relays verfügbar
    return RELAY_CONFIGS.PUBLIC_ONLY;
  }
}

/**
 * Relay-Empfehlungen basierend auf deinen Anforderungen
 */
export const RECOMMENDATIONS = {
  // Wenn du gerade startest
  BEGINNER: {
    strategy: 'PUBLIC_ONLY',
    reason: 'Kostenlos, einfach, sofort einsatzbereit',
    relays: RELAY_CONFIGS.PUBLIC_ONLY,
    pros: [
      '✅ Keine Kosten',
      '✅ Sofort verfügbar', 
      '✅ Hohe Verfügbarkeit',
      '✅ Globale Reichweite'
    ],
    cons: [
      '❌ Weniger Kontrolle',
      '❌ Potentielle Zensur',
      '❌ Abhängigkeit von Dritten'
    ]
  },

  // Wenn du Wert auf Privatsphäre legst
  PRIVACY_FOCUSED: {
    strategy: 'PRIVATE_ONLY',
    reason: 'Maximale Kontrolle und Privatsphäre',
    relays: RELAY_CONFIGS.PRIVATE_ONLY,
    pros: [
      '✅ Vollständige Kontrolle',
      '✅ Maximale Privatsphäre',
      '✅ Keine Zensur',
      '✅ Anpassbare Performance'
    ],
    cons: [
      '❌ Hosting-Kosten (~10-50€/Monat)',
      '❌ Wartungsaufwand',
      '❌ Single Point of Failure',
      '❌ Weniger Reichweite'
    ]
  },

  // Beste Balance für Bitcoin-Handel
  BITCOIN_TRADING: {
    strategy: 'HYBRID',
    reason: 'Optimale Balance zwischen Privatsphäre und Reichweite',
    relays: RELAY_CONFIGS.HYBRID,
    pros: [
      '✅ Kontrolle über kritische Daten',
      '✅ Fallback bei Ausfällen',
      '✅ Globale Reichweite',
      '✅ Flexible Konfiguration'
    ],
    cons: [
      '❌ Moderate Kosten',
      '❌ Komplexere Konfiguration'
    ]
  }
};