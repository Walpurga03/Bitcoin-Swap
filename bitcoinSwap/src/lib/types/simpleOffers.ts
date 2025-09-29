// Vereinfachtes Angebots-Datenmodell für schlichte Textarena

/**
 * Vereinfachtes Angebot - nur Text ohne komplexe Struktur
 */
export interface SimpleOffer {
  id: string;
  text: string; // Der Angebotstext
  authorPubkey: string; // Öffentlicher Schlüssel des Autors
  createdAt: number; // Unix timestamp
  updatedAt?: number; // Unix timestamp bei Bearbeitung
  reactions: OfferReaction[]; // Reaktionen von anderen Usern
  isAnonymous?: boolean; // Optional: Anonymes Angebot
  expiresAt?: number; // Optional: Ablaufzeit
}

/**
 * Reaktion auf ein Angebot
 */
export interface OfferReaction {
  id: string;
  offerId: string;
  reactorPubkey: string; // Wer reagiert hat
  type: 'interested' | 'like' | 'question'; // Art der Reaktion
  message?: string; // Optionale Nachricht bei Reaktion
  createdAt: number;
  isAnonymous?: boolean;
}

/**
 * Angebots-Statistiken (vereinfacht)
 */
export interface SimpleOfferStats {
  totalOffers: number;
  todayOffers: number;
  myOffers: number;
  totalReactions: number;
}

/**
 * Angebots-Filter (minimal)
 */
export interface SimpleOfferFilter {
  showMyOffers?: boolean;
  showExpired?: boolean;
  searchText?: string;
}

/**
 * Nostr-Event für vereinfachte Angebote
 */
export interface SimpleOfferEvent {
  kind: 30403; // Neuer Kind für vereinfachte Angebote
  content: string; // Der Angebotstext
  tags: string[][]; // Minimal tags
  created_at: number;
  pubkey: string;
  id: string;
  sig: string;
}

/**
 * Nostr-Event für Reaktionen auf Angebote
 */
export interface OfferReactionEvent {
  kind: 7; // Standard Reaction Event
  content: string; // Reaktions-Nachricht (optional)
  tags: string[][]; // e-tag für Angebots-ID, p-tag für Autor
  created_at: number;
  pubkey: string;
  id: string;
  sig: string;
}

/**
 * UI-Zustand für Angebots-Interface
 */
export interface OfferUIState {
  isCreating: boolean;
  isLoading: boolean;
  selectedOffer?: SimpleOffer;
  filter: SimpleOfferFilter;
  error?: string;
}

/**
 * Angebots-Aktionen
 */
export interface OfferActions {
  createOffer: (text: string, isAnonymous?: boolean) => Promise<void>;
  reactToOffer: (offerId: string, type: OfferReaction['type'], message?: string) => Promise<void>;
  deleteOffer: (offerId: string) => Promise<void>;
  loadOffers: () => Promise<void>;
  searchOffers: (query: string) => SimpleOffer[];
}

/**
 * Validierung für Angebots-Text
 */
export interface OfferValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Angebots-Konfiguration
 */
export interface OfferConfig {
  maxTextLength: number; // Max. Zeichen für Angebotstext
  maxOffersPerDay: number; // Max. Angebote pro Tag pro User
  defaultExpiryHours: number; // Standard-Ablaufzeit in Stunden
  allowAnonymous: boolean; // Anonyme Angebote erlaubt
  allowReactions: boolean; // Reaktionen erlaubt
}

// Standard-Konfiguration
export const DEFAULT_OFFER_CONFIG: OfferConfig = {
  maxTextLength: 500,
  maxOffersPerDay: 10,
  defaultExpiryHours: 24 * 7, // 1 Woche
  allowAnonymous: true,
  allowReactions: true
};

/**
 * Utility-Funktionen für Validierung
 */
export function validateOfferText(text: string, config: OfferConfig = DEFAULT_OFFER_CONFIG): OfferValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Text-Länge prüfen
  if (!text || text.trim().length === 0) {
    errors.push('Angebotstext darf nicht leer sein');
  }

  if (text.length > config.maxTextLength) {
    errors.push(`Angebotstext darf maximal ${config.maxTextLength} Zeichen haben`);
  }

  // Warnungen
  if (text.length < 10) {
    warnings.push('Sehr kurzer Angebotstext - mehr Details könnten hilfreich sein');
  }

  if (text.length > config.maxTextLength * 0.8) {
    warnings.push('Angebotstext ist sehr lang - kürzer könnte besser lesbar sein');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Hilfsfunktion zum Erstellen einer Angebots-ID
 */
export function generateOfferId(): string {
  return `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hilfsfunktion zum Formatieren von Zeitstempeln
 */
export function formatOfferTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min`;
  if (hours < 24) return `vor ${hours} Std`;
  if (days < 7) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  
  return new Date(timestamp).toLocaleDateString('de-DE');
}

/**
 * Hilfsfunktion zum Kürzen von Text
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Hilfsfunktion zum Zählen von Reaktionen
 */
export function countReactions(reactions: OfferReaction[]): Record<string, number> {
  return reactions.reduce((acc, reaction) => {
    acc[reaction.type] = (acc[reaction.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}