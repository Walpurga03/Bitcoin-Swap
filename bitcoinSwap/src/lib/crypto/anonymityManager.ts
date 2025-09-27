// Anonymitäts-Manager für Bitcoin-Angebote (Phase 2)

import { 
  generateAnonymousKeyPair, 
  KeyRotationManager,
  encryptContactData,
  decryptContactData,
  generateSecureRandom,
  hashData
} from './encryption';
import type { AnonymousKeyPair } from './encryption';
import type { BitcoinOffer, OfferInterest } from '$lib/nostr/types';

/**
 * Anonymitäts-Einstellungen
 */
export interface AnonymitySettings {
  useAnonymousKeys: boolean;
  rotateKeysAutomatically: boolean;
  keyRotationIntervalHours: number;
  encryptContactData: boolean;
  hideLocationDetails: boolean;
  useProxyIdentity: boolean;
}

/**
 * Temporäre Identität für Angebote
 */
export interface TemporaryIdentity {
  id: string;
  keyPair: AnonymousKeyPair;
  displayName: string;
  createdAt: number;
  expiresAt: number;
  usageCount: number;
  maxUsage: number;
  associatedOffers: string[];
}

/**
 * Kontakt-Verschlüsselung für Interest-Events
 */
export interface EncryptedContact {
  encryptedData: string;
  publicKey: string;
  method: 'nostr' | 'signal' | 'telegram' | 'email';
  hint: string; // Verschleierter Hinweis auf Kontaktmethode
}

/**
 * Anonymitäts-Manager Klasse
 */
export class AnonymityManager {
  private settings: AnonymitySettings;
  private keyRotationManager: KeyRotationManager;
  private temporaryIdentities: Map<string, TemporaryIdentity> = new Map();
  private contactMappings: Map<string, EncryptedContact> = new Map();

  constructor(settings: Partial<AnonymitySettings> = {}) {
    this.settings = {
      useAnonymousKeys: true,
      rotateKeysAutomatically: true,
      keyRotationIntervalHours: 24,
      encryptContactData: true,
      hideLocationDetails: false,
      useProxyIdentity: true,
      ...settings
    };

    this.keyRotationManager = new KeyRotationManager(this.settings.keyRotationIntervalHours);
    
    // Automatische Bereinigung alle Stunde
    setInterval(() => this.cleanupExpiredIdentities(), 60 * 60 * 1000);
  }

  /**
   * Erstellt eine temporäre Identität für ein Angebot
   */
  async createTemporaryIdentity(
    purpose: 'offer' | 'interest' | 'contact',
    maxUsage: number = 1
  ): Promise<TemporaryIdentity> {
    const keyPair = this.settings.useAnonymousKeys 
      ? generateAnonymousKeyPair(purpose)
      : this.keyRotationManager.getOrCreateKey(purpose);

    const identity: TemporaryIdentity = {
      id: generateSecureRandom(16),
      keyPair,
      displayName: this.generateProxyDisplayName(),
      createdAt: Math.floor(Date.now() / 1000),
      expiresAt: keyPair.expiresAt,
      usageCount: 0,
      maxUsage,
      associatedOffers: []
    };

    this.temporaryIdentities.set(identity.id, identity);
    
    console.log(`Temporäre Identität erstellt: ${identity.id} (${purpose})`);
    return identity;
  }

  /**
   * Anonymisiert ein Bitcoin-Angebot
   */
  async anonymizeOffer(offer: BitcoinOffer): Promise<BitcoinOffer> {
    if (!this.settings.useAnonymousKeys) {
      return offer;
    }

    // Temporäre Identität für das Angebot erstellen
    const identity = await this.createTemporaryIdentity('offer', 10); // Max 10 Interessenten
    
    // Angebot mit anonymer Identität verknüpfen
    identity.associatedOffers.push(offer.id);
    
    const anonymizedOffer: BitcoinOffer = {
      ...offer,
      anonymousKey: identity.keyPair.publicKey,
      authorPubkey: identity.keyPair.publicKey,
      encrypted: true
    };

    // Standort-Details verstecken falls gewünscht
    if (this.settings.hideLocationDetails && offer.location) {
      anonymizedOffer.location = this.obfuscateLocation(offer.location);
    }

    return anonymizedOffer;
  }

  /**
   * Erstellt verschlüsselte Kontaktdaten für Interest-Events
   */
  async createEncryptedContact(
    contactMethod: 'nostr' | 'signal' | 'telegram' | 'email',
    contactData: string,
    message: string,
    recipientPublicKey: string
  ): Promise<EncryptedContact> {
    if (!this.settings.encryptContactData) {
      return {
        encryptedData: JSON.stringify({ method: contactMethod, data: contactData, message }),
        publicKey: recipientPublicKey,
        method: contactMethod,
        hint: this.createContactHint(contactMethod)
      };
    }

    // Temporäre Identität für Kontakt erstellen
    const identity = await this.createTemporaryIdentity('contact');
    
    // Kontaktdaten verschlüsseln
    const contactPayload = {
      method: contactMethod,
      data: contactData,
      message: message,
      senderIdentity: identity.id
    };

    const encryptedData = await encryptContactData(
      contactPayload,
      recipientPublicKey + identity.keyPair.privateKey // Kombinierter Schlüssel
    );

    const encryptedContact: EncryptedContact = {
      encryptedData,
      publicKey: identity.keyPair.publicKey,
      method: contactMethod,
      hint: this.createContactHint(contactMethod)
    };

    // Mapping speichern
    this.contactMappings.set(identity.id, encryptedContact);

    return encryptedContact;
  }

  /**
   * Entschlüsselt Kontaktdaten aus Interest-Events
   */
  async decryptContact(
    encryptedContact: EncryptedContact,
    senderPublicKey: string,
    recipientPrivateKey: string
  ): Promise<{
    method: string;
    data: string;
    message: string;
    senderIdentity?: string;
  } | null> {
    if (!this.settings.encryptContactData) {
      try {
        return JSON.parse(encryptedContact.encryptedData);
      } catch (error) {
        console.error('Fehler beim Parsen unverschlüsselter Kontaktdaten:', error);
        return null;
      }
    }

    try {
      const decryptedData = await decryptContactData(
        encryptedContact.encryptedData,
        senderPublicKey + recipientPrivateKey // Kombinierter Schlüssel
      );

      return {
        method: decryptedData.method,
        data: decryptedData.data,
        message: decryptedData.message || '',
        senderIdentity: (decryptedData as any).senderIdentity
      };
    } catch (error) {
      console.error('Fehler beim Entschlüsseln der Kontaktdaten:', error);
      return null;
    }
  }

  /**
   * Verfolgt die Nutzung einer temporären Identität
   */
  trackIdentityUsage(identityId: string, offerId?: string): boolean {
    const identity = this.temporaryIdentities.get(identityId);
    if (!identity) {
      return false;
    }

    identity.usageCount++;
    
    if (offerId && !identity.associatedOffers.includes(offerId)) {
      identity.associatedOffers.push(offerId);
    }

    // Identität löschen wenn maximale Nutzung erreicht
    if (identity.usageCount >= identity.maxUsage) {
      this.temporaryIdentities.delete(identityId);
      console.log(`Temporäre Identität ${identityId} nach ${identity.usageCount} Nutzungen entfernt`);
      return false;
    }

    return true;
  }

  /**
   * Bereinigt abgelaufene Identitäten
   */
  cleanupExpiredIdentities(): void {
    const now = Math.floor(Date.now() / 1000);
    let cleanedCount = 0;

    for (const [id, identity] of this.temporaryIdentities.entries()) {
      if (identity.expiresAt <= now) {
        this.temporaryIdentities.delete(id);
        cleanedCount++;
      }
    }

    // Auch Kontakt-Mappings bereinigen
    for (const [id, contact] of this.contactMappings.entries()) {
      if (!this.temporaryIdentities.has(id)) {
        this.contactMappings.delete(id);
      }
    }

    if (cleanedCount > 0) {
      console.log(`${cleanedCount} abgelaufene temporäre Identitäten bereinigt`);
    }

    // Key Rotation Manager bereinigen
    this.keyRotationManager.cleanupExpiredKeys();
  }

  /**
   * Generiert einen Proxy-Anzeigenamen
   */
  private generateProxyDisplayName(): string {
    const adjectives = [
      'Anonymous', 'Private', 'Secure', 'Hidden', 'Masked', 'Stealth',
      'Shadow', 'Ghost', 'Phantom', 'Invisible', 'Covert', 'Discrete'
    ];
    
    const nouns = [
      'Trader', 'User', 'Buyer', 'Seller', 'Participant', 'Member',
      'Agent', 'Entity', 'Individual', 'Person', 'Contact', 'Party'
    ];

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 9999).toString().padStart(4, '0');

    return `${adjective}${noun}${number}`;
  }

  /**
   * Verschleiert Standort-Details
   */
  private obfuscateLocation(location: string): string {
    // Entfernt spezifische Adressen und behält nur Stadt/Region
    const parts = location.split(',').map(part => part.trim());
    
    if (parts.length > 1) {
      // Nur die letzten 1-2 Teile behalten (Stadt, Land)
      return parts.slice(-2).join(', ');
    }
    
    return location;
  }

  /**
   * Erstellt einen Hinweis auf die Kontaktmethode
   */
  private createContactHint(method: 'nostr' | 'signal' | 'telegram' | 'email'): string {
    const hints = {
      nostr: 'Dezentraler Messenger',
      signal: 'Sicherer Messenger',
      telegram: 'Instant Messenger',
      email: 'E-Mail Kontakt'
    };

    return hints[method] || 'Kontakt verfügbar';
  }

  /**
   * Gibt Anonymitäts-Statistiken zurück
   */
  getAnonymityStats(): {
    activeIdentities: number;
    totalUsage: number;
    encryptedContacts: number;
    keyRotationEnabled: boolean;
  } {
    let totalUsage = 0;
    
    for (const identity of this.temporaryIdentities.values()) {
      totalUsage += identity.usageCount;
    }

    return {
      activeIdentities: this.temporaryIdentities.size,
      totalUsage,
      encryptedContacts: this.contactMappings.size,
      keyRotationEnabled: this.settings.rotateKeysAutomatically
    };
  }

  /**
   * Aktualisiert Anonymitäts-Einstellungen
   */
  updateSettings(newSettings: Partial<AnonymitySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    // Key Rotation Manager aktualisieren falls nötig
    if (newSettings.keyRotationIntervalHours) {
      this.keyRotationManager = new KeyRotationManager(newSettings.keyRotationIntervalHours);
    }
    
    console.log('Anonymitäts-Einstellungen aktualisiert:', this.settings);
  }

  /**
   * Exportiert temporäre Identitäten für Backup
   */
  exportIdentities(): string {
    const data = {
      identities: Array.from(this.temporaryIdentities.entries()),
      contacts: Array.from(this.contactMappings.entries()),
      settings: this.settings,
      exportedAt: Date.now()
    };

    return JSON.stringify(data);
  }

  /**
   * Importiert temporäre Identitäten aus Backup
   */
  importIdentities(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      
      // Nur nicht-abgelaufene Identitäten importieren
      const now = Math.floor(Date.now() / 1000);
      
      for (const [id, identity] of parsed.identities) {
        if (identity.expiresAt > now) {
          this.temporaryIdentities.set(id, identity);
        }
      }
      
      for (const [id, contact] of parsed.contacts) {
        if (this.temporaryIdentities.has(id)) {
          this.contactMappings.set(id, contact);
        }
      }
      
      console.log(`${this.temporaryIdentities.size} temporäre Identitäten importiert`);
      return true;
      
    } catch (error) {
      console.error('Fehler beim Importieren der Identitäten:', error);
      return false;
    }
  }
}

// Singleton-Instanz für globale Nutzung
export const anonymityManager = new AnonymityManager();