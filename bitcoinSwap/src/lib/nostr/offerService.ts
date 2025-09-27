// Nostr Service für Bitcoin-Angebote (Phase 2)

import { SimplePool } from 'nostr-tools';
import type { 
  BitcoinOffer, 
  OfferInterest, 
  GroupConfig, 
  UserProfile 
} from '$lib/nostr/types';
import { 
  createOfferEvent, 
  createInterestEvent, 
  parseOfferEvent, 
  parseInterestEvent,
  isOfferEvent,
  isInterestEvent,
  validateOfferEvent,
  validateInterestEvent,
  createOfferFilters,
  extractChannelId,
  extractOfferIdFromInterest
} from './offerEvents';
import { generateAnonymousKeyPair } from '$lib/utils/offers';
import { offerActions } from '$lib/stores/phase2OfferStore';

export class OfferService {
  private pool: SimplePool;
  private relays: string[];
  private channelId: string;
  private userProfile: UserProfile | null = null;
  private subscriptions: Map<string, any> = new Map();
  private isConnected = false;

  constructor(pool: SimplePool, relays: string[], channelId: string) {
    this.pool = pool;
    this.relays = relays;
    this.channelId = channelId;
  }

  /**
   * Initialisiert den Service mit Benutzer-Profil
   */
  initialize(userProfile: UserProfile) {
    this.userProfile = userProfile;
    this.isConnected = true;
    console.log('OfferService initialisiert für Benutzer:', userProfile.pubkey);
  }

  /**
   * Startet das Abonnement für Angebots-Events
   */
  subscribeToOffers(): void {
    if (!this.isConnected) {
      console.warn('OfferService nicht initialisiert');
      return;
    }

    // Bestehende Subscription beenden
    this.unsubscribeFromOffers();

    // Filter für Angebots-Events erstellen
    const filters = createOfferFilters(this.channelId);
    
    console.log('Starte Angebots-Subscription mit Filtern:', filters);

    // Subscription starten
    const sub = this.pool.subscribeMany(
      this.relays,
      filters as any,
      {
        onevent: (event) => {
          this.handleEvent(event);
        },
        oneose: () => {
          console.log('Initiale Angebots-Events geladen');
        },
        onclose: (reason) => {
          console.log('Angebots-Subscription geschlossen:', reason);
        }
      }
    );

    this.subscriptions.set('offers', sub);
  }

  /**
   * Beendet das Abonnement für Angebots-Events
   */
  unsubscribeFromOffers(): void {
    const sub = this.subscriptions.get('offers');
    if (sub) {
      sub.close();
      this.subscriptions.delete('offers');
      console.log('Angebots-Subscription beendet');
    }
  }

  /**
   * Verarbeitet eingehende Nostr-Events
   */
  private handleEvent(event: any): void {
    try {
      // Channel-ID prüfen
      const eventChannelId = extractChannelId(event);
      if (eventChannelId !== this.channelId) {
        return; // Event gehört nicht zu diesem Channel
      }

      if (isOfferEvent(event)) {
        this.handleOfferEvent(event);
      } else if (isInterestEvent(event)) {
        this.handleInterestEvent(event);
      }
    } catch (error) {
      console.error('Fehler beim Verarbeiten des Events:', error);
    }
  }

  /**
   * Verarbeitet Angebots-Events
   */
  private handleOfferEvent(event: any): void {
    if (!validateOfferEvent(event)) {
      console.warn('Ungültiges Angebots-Event:', event.id);
      return;
    }

    const offer = parseOfferEvent(event);
    if (offer) {
      console.log('Neues Angebot empfangen:', offer.id, offer.type, offer.amount);
      offerActions.addOffer(offer);
    }
  }

  /**
   * Verarbeitet Interest-Events
   */
  private handleInterestEvent(event: any): void {
    if (!validateInterestEvent(event)) {
      console.warn('Ungültiges Interest-Event:', event.id);
      return;
    }

    const interest = parseInterestEvent(event);
    if (interest) {
      console.log('Neues Interesse empfangen:', interest.id, interest.offerId);
      offerActions.addInterest(interest);
      
      // Benachrichtigung hinzufügen
      offerActions.addNotification({
        id: `interest_${Date.now()}`,
        type: 'new_interest',
        offerId: interest.offerId,
        message: `Neues Interesse an Ihrem Angebot`,
        createdAt: Math.floor(Date.now() / 1000),
        read: false
      });
    }
  }

  /**
   * Veröffentlicht ein neues Bitcoin-Angebot
   */
  async publishOffer(offer: BitcoinOffer): Promise<boolean> {
    if (!this.isConnected || !this.userProfile) {
      throw new Error('Service nicht initialisiert');
    }

    try {
      // Anonymes Schlüsselpaar für das Angebot generieren
      const anonymousKey = generateAnonymousKeyPair('offer');
      const privKeyBytes = new Uint8Array(
        anonymousKey.privateKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
      );

      // Angebot mit anonymem Key aktualisieren
      const updatedOffer = {
        ...offer,
        anonymousKey: anonymousKey.publicKey,
        authorPubkey: anonymousKey.publicKey
      };

      // Nostr-Event erstellen
      const event = createOfferEvent(updatedOffer, this.channelId, privKeyBytes);
      
      console.log('Veröffentliche Angebot:', event.id);

      // Event an Relays senden
      const results = await Promise.allSettled(
        this.relays.map(relay => this.pool.publish([relay], event))
      );

      // Erfolg prüfen
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - successful;

      if (successful > 0) {
        console.log(`Angebot erfolgreich an ${successful}/${results.length} Relays gesendet`);
        
        // Angebot lokal hinzufügen
        offerActions.addOffer(updatedOffer);
        
        return true;
      } else {
        throw new Error(`Fehler beim Senden an alle ${failed} Relays`);
      }

    } catch (error) {
      console.error('Fehler beim Veröffentlichen des Angebots:', error);
      throw error;
    }
  }

  /**
   * Zeigt Interesse an einem Angebot
   */
  async showInterest(
    offerId: string, 
    message: string, 
    contactMethod: 'nostr' | 'signal' | 'telegram' | 'email',
    contactData: string
  ): Promise<boolean> {
    if (!this.isConnected || !this.userProfile) {
      throw new Error('Service nicht initialisiert');
    }

    try {
      // Angebot finden
      const offer = offerActions.getOfferById(offerId);
      if (!offer || !offer.eventId) {
        throw new Error('Angebot nicht gefunden oder keine Event-ID');
      }

      // Anonymes Schlüsselpaar für das Interesse generieren
      const anonymousKey = generateAnonymousKeyPair('interest');
      const privKeyBytes = new Uint8Array(
        anonymousKey.privateKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
      );

      // Interest-Objekt erstellen
      const interest: OfferInterest = {
        id: `interest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        offerId: offerId,
        interestedParty: anonymousKey.publicKey,
        message: message,
        contactMethod: contactMethod,
        createdAt: Math.floor(Date.now() / 1000)
      };

      // Nostr-Event erstellen
      const event = createInterestEvent(
        interest, 
        offer.eventId, 
        offer.authorPubkey, 
        privKeyBytes
      );

      console.log('Zeige Interesse:', event.id);

      // Event an Relays senden
      const results = await Promise.allSettled(
        this.relays.map(relay => this.pool.publish([relay], event))
      );

      // Erfolg prüfen
      const successful = results.filter(result => result.status === 'fulfilled').length;

      if (successful > 0) {
        console.log(`Interesse erfolgreich an ${successful}/${results.length} Relays gesendet`);
        
        // Interest lokal hinzufügen
        offerActions.addInterest(interest);
        
        return true;
      } else {
        throw new Error('Fehler beim Senden an alle Relays');
      }

    } catch (error) {
      console.error('Fehler beim Zeigen von Interesse:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert ein bestehendes Angebot
   */
  async updateOffer(offerId: string, updates: Partial<BitcoinOffer>): Promise<boolean> {
    if (!this.isConnected || !this.userProfile) {
      throw new Error('Service nicht initialisiert');
    }

    try {
      // Angebot finden
      const existingOffer = offerActions.getOfferById(offerId);
      if (!existingOffer) {
        throw new Error('Angebot nicht gefunden');
      }

      // Prüfen ob es das eigene Angebot ist
      if (existingOffer.authorPubkey !== this.userProfile.pubkey) {
        throw new Error('Nur eigene Angebote können bearbeitet werden');
      }

      // Aktualisiertes Angebot erstellen
      const updatedOffer = { ...existingOffer, ...updates };

      // Neues Event veröffentlichen (ersetzt das alte durch gleiche d-tag)
      return await this.publishOffer(updatedOffer);

    } catch (error) {
      console.error('Fehler beim Aktualisieren des Angebots:', error);
      throw error;
    }
  }

  /**
   * Löscht ein Angebot (setzt Status auf cancelled)
   */
  async deleteOffer(offerId: string): Promise<boolean> {
    return await this.updateOffer(offerId, { status: 'cancelled' });
  }

  /**
   * Markiert ein Angebot als abgeschlossen
   */
  async completeOffer(offerId: string): Promise<boolean> {
    return await this.updateOffer(offerId, { status: 'completed' });
  }

  /**
   * Lädt historische Angebote
   */
  async loadHistoricalOffers(since?: number): Promise<void> {
    if (!this.isConnected) {
      console.warn('Service nicht initialisiert');
      return;
    }

    const filters = createOfferFilters(this.channelId, since);
    
    console.log('Lade historische Angebote...');

    return new Promise((resolve) => {
      const events: any[] = [];
      
      const sub = this.pool.subscribeMany(
        this.relays,
        filters as any,
        {
          onevent: (event) => {
            events.push(event);
          },
          oneose: () => {
            console.log(`${events.length} historische Events geladen`);
            
            // Events verarbeiten
            events.forEach(event => this.handleEvent(event));
            
            sub.close();
            resolve();
          }
        }
      );
    });
  }

  /**
   * Bereinigt abgelaufene Angebote
   */
  cleanupExpiredOffers(): void {
    offerActions.cleanupExpiredOffers();
  }

  /**
   * Beendet den Service
   */
  disconnect(): void {
    // Alle Subscriptions beenden
    this.subscriptions.forEach((sub, key) => {
      sub.close();
      console.log(`Subscription ${key} beendet`);
    });
    this.subscriptions.clear();

    this.isConnected = false;
    this.userProfile = null;
    
    console.log('OfferService getrennt');
  }

  /**
   * Gibt den Verbindungsstatus zurück
   */
  isServiceConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Gibt die Anzahl aktiver Subscriptions zurück
   */
  getActiveSubscriptions(): number {
    return this.subscriptions.size;
  }
}