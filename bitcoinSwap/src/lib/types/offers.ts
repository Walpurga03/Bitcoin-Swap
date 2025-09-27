// Bitcoin-Angebots-Typen für Phase 2

export type OfferType = 'buy' | 'sell';
export type PaymentMethodType = 'cash' | 'bank' | 'rechnung';
export type OfferStatus = 'active' | 'expired' | 'completed' | 'cancelled';

/**
 * Zahlungsmethode für Bitcoin-Angebote
 */
export interface PaymentMethod {
  type: PaymentMethodType;
  details?: string; // Verschlüsselte Details (IBAN, Rechnungsadresse, etc.)
  label: string; // Anzeigename (z.B. "Sparkasse", "Rechnung")
}

/**
 * Bitcoin-Angebot Struktur
 */
export interface BitcoinOffer {
  id: string; // Eindeutige Angebots-ID
  type: OfferType; // 'buy' oder 'sell'
  amount: number; // Betrag in Satoshis
  price: number; // Preis in EUR
  paymentMethods: PaymentMethod[]; // Verfügbare Zahlungsmethoden
  location?: string; // Ort für persönliche Übergabe
  description?: string; // Zusätzliche Beschreibung
  createdAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
  status: OfferStatus;
  
  // Anonymität & Sicherheit
  anonymousKey: string; // Temporärer Public Key für dieses Angebot
  encrypted: boolean; // Ob sensible Daten verschlüsselt sind
  
  // Nostr-spezifisch
  eventId?: string; // Nostr Event ID
  authorPubkey: string; // Anonymer Pubkey des Erstellers
}

/**
 * Interesse an einem Angebot
 */
export interface OfferInterest {
  id: string;
  offerId: string; // Referenz zum Angebot
  interestedParty: string; // Anonymer Public Key des Interessenten
  message?: string; // Optional verschlüsselte Nachricht
  contactMethod: ContactMethod;
  createdAt: number;
  
  // Nostr-spezifisch
  eventId?: string;
}

/**
 * Kontaktmethoden für Interessenten
 */
export type ContactMethod = 'nostr' | 'signal' | 'telegram' | 'email';

/**
 * Angebots-Filter für UI
 */
export interface OfferFilter {
  type?: OfferType;
  minAmount?: number; // in Satoshis
  maxAmount?: number; // in Satoshis
  minPrice?: number; // in EUR
  maxPrice?: number; // in EUR
  paymentMethods?: PaymentMethodType[];
  location?: string;
  status?: OfferStatus[];
}

/**
 * Angebots-Statistiken
 */
export interface OfferStats {
  totalOffers: number;
  activeOffers: number;
  buyOffers: number;
  sellOffers: number;
  totalVolume: number; // in Satoshis
  averagePrice: number; // in EUR
}

/**
 * Temporäres Schlüsselpaar für Anonymität
 */
export interface AnonymousKeyPair {
  privateKey: string; // Hex
  publicKey: string; // Hex
  npub: string; // Bech32 encoded
  createdAt: number;
  expiresAt: number;
  purpose: 'offer' | 'interest' | 'contact';
}

/**
 * Verschlüsselte Kontaktdaten
 */
export interface EncryptedContactData {
  method: ContactMethod;
  data: string; // Verschlüsselte Kontaktinformationen
  publicKey: string; // Public Key für Entschlüsselung
}

/**
 * Angebots-Benachrichtigung
 */
export interface OfferNotification {
  id: string;
  type: 'new_offer' | 'new_interest' | 'offer_expired' | 'offer_completed';
  offerId: string;
  message: string;
  createdAt: number;
  read: boolean;
}

/**
 * Angebots-Erstellungs-Formular
 */
export interface CreateOfferForm {
  type: OfferType;
  amount: string; // String für Eingabe-Validierung
  price: string; // String für Eingabe-Validierung
  paymentMethods: PaymentMethodType[];
  location: string;
  description: string;
  expiresInHours: number; // Ablaufzeit in Stunden
}

/**
 * Interesse-Formular
 */
export interface ShowInterestForm {
  offerId: string;
  message: string;
  contactMethod: ContactMethod;
  contactData: string; // Signal-Nummer, Telegram-Handle, etc.
}

/**
 * Utility-Funktionen für Angebote
 */
export interface OfferUtils {
  formatAmount: (satoshis: number) => string;
  formatPrice: (eur: number) => string;
  calculateTotal: (amount: number, price: number) => number;
  isOfferExpired: (offer: BitcoinOffer) => boolean;
  getOfferAge: (offer: BitcoinOffer) => string;
  validateOffer: (offer: CreateOfferForm) => string[];
}

/**
 * Angebots-Store State
 */
export interface OfferStoreState {
  offers: BitcoinOffer[];
  interests: OfferInterest[];
  notifications: OfferNotification[];
  filter: OfferFilter;
  stats: OfferStats;
  loading: boolean;
  error: string | null;
}