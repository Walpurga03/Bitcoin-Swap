// Echter Nostr-Service für schlichte Text-Angebote (Optimiert für nostr-relay.online)

import { get } from 'svelte/store';
import { userStore } from '$lib/stores/userStore';
import { groupConfig } from '$lib/stores/groupStore';
import { optimizedNostrClient, bitcoinNostr } from './optimizedNostrClient';
import { signEvent, nostrIdentity } from './realCrypto';
import type {
  SimpleOffer,
  OfferReaction,
  SimpleOfferEvent,
  OfferReactionEvent
} from '$lib/types/simpleOffers';
import type { NostrEvent } from '$lib/nostr/types';

// Vereinfachter Filter-Type für diese Implementierung
interface SimpleFilter {
  kinds?: number[];
  authors?: string[];
  since?: number;
  until?: number;
  limit?: number;
  '#t'?: string[];
  '#k'?: string[];
  '#e'?: string[];
  '#p'?: string[];
}

/**
 * Vereinfachter Service für Text-Angebote über Nostr
 */
export class SimpleOfferService {
  private subscriptions: Map<string, any> = new Map();
  private isConnected = false;
  private identity: { privateKey: string; publicKey: string; name?: string } | null = null;

  constructor() {
    this.initializeService();
  }

  /**
   * Initialisiert den Service und verbindet zu Nostr
   */
  private async initializeService() {
    try {
      // Lade oder erstelle Nostr-Identität
      this.identity = await nostrIdentity.getOrCreateIdentity();
      
      // Verbinde zu optimierten Nostr-Relays (inkl. nostr-relay.online)
      const status = await bitcoinNostr.connect();
      this.isConnected = true;
      
      console.log('✅ Nostr-Service initialisiert mit optimierter Relay-Strategie:', {
        publicKey: this.identity.publicKey.slice(0, 16) + '...',
        ownRelay: status.ownRelay.connected ? '✅ nostr-relay.online' : '❌ offline',
        totalRelays: status.performance.connectedRelays
      });
      
    } catch (error) {
      console.warn('⚠️ Fehler bei Nostr-Initialisierung:', error);
      this.isConnected = false;
    }
  }

  /**
   * Stellt sicher, dass der Service verbunden ist
   */
  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.initializeService();
    }
    
    if (!this.identity) {
      throw new Error('Keine Nostr-Identität verfügbar');
    }
  }

  /**
   * Erstellt ein neues Text-Angebot
   */
  async createOffer(text: string, isAnonymous: boolean = false): Promise<SimpleOffer> {
    await this.ensureConnected();

    const now = Math.floor(Date.now() / 1000);
    const offerId = `offer_${now}_${Math.random().toString(36).substr(2, 9)}`;

    // Nostr-Event erstellen
    const event: Partial<NostrEvent> = {
      kind: 30403, // Replaceable event für Bitcoin-Angebote
      content: text,
      created_at: now,
      tags: [
        ['d', offerId], // Identifier für replaceable event
        ['t', 'bitcoin-offer'], // Topic tag
        ['expiration', String(now + (7 * 24 * 60 * 60))], // 1 Woche Ablaufzeit
      ]
    };

    // Anonymitäts-Tag hinzufügen
    if (isAnonymous) {
      event.tags?.push(['anonymous', 'true']);
    }

    try {
      // Event signieren und an Nostr senden
      const signedEvent = await signEvent(event, this.identity!.privateKey);
      await bitcoinNostr.publishOffer(signedEvent, isAnonymous);

      // SimpleOffer-Objekt erstellen
      const offer: SimpleOffer = {
        id: offerId,
        text: text,
        authorPubkey: signedEvent.pubkey,
        createdAt: now * 1000, // Milliseconds für UI
        reactions: [],
        isAnonymous
      };

      console.log('📤 Angebot erstellt und an Nostr gesendet:', offerId);
      return offer;

    } catch (error) {
      throw new Error(`Fehler beim Erstellen des Angebots: ${(error as Error).message}`);
    }
  }

  /**
   * Reagiert auf ein Angebot
   */
  async reactToOffer(
    offer: SimpleOffer,
    type: OfferReaction['type'],
    message?: string
  ): Promise<OfferReaction> {
    await this.ensureConnected();

    const now = Math.floor(Date.now() / 1000);
    const reactionId = `reaction_${now}_${Math.random().toString(36).substr(2, 9)}`;

    // Reaktions-Content erstellen
    let content = '';
    switch (type) {
      case 'interested':
        content = '👀';
        break;
      case 'like':
        content = '👍';
        break;
      case 'question':
        content = '❓';
        break;
    }

    if (message) {
      content += ` ${message}`;
    }

    // Nostr-Reaction-Event erstellen
    const event: Partial<NostrEvent> = {
      kind: 7, // Standard Reaction Event
      content: content,
      created_at: now,
      tags: [
        ['e', offer.id], // Event-ID des Angebots
        ['p', offer.authorPubkey], // Pubkey des Angebots-Autors
        ['k', '30403'], // Kind des ursprünglichen Events
        ['reaction-type', type]
      ]
    };

    try {
      // Event signieren und an Nostr senden
      const signedEvent = await signEvent(event, this.identity!.privateKey);
      await optimizedNostrClient.publishEvent(signedEvent, 'BITCOIN_OFFERS');

      // OfferReaction-Objekt erstellen
      const reaction: OfferReaction = {
        id: reactionId,
        offerId: offer.id,
        reactorPubkey: signedEvent.pubkey,
        type,
        message,
        createdAt: now * 1000 // Milliseconds für UI
      };

      console.log('📤 Reaktion gesendet an Nostr:', type, offer.id);
      return reaction;

    } catch (error) {
      throw new Error(`Fehler beim Senden der Reaktion: ${(error as Error).message}`);
    }
  }

  /**
   * Lädt alle Angebote von Nostr
   */
  async loadOffers(): Promise<SimpleOffer[]> {
    await this.ensureConnected();

    try {
      // Filter für Angebots-Events
      const offerFilter = {
        kinds: [30403],
        '#t': ['bitcoin-offer'],
        limit: 100
      };

      // Filter für Reaktions-Events
      const reactionFilter = {
        kinds: [7],
        '#k': ['30403'],
        limit: 500
      };

      // Events von optimierten Nostr-Relays laden
      const [offerEvents, reactionEvents] = await Promise.all([
        optimizedNostrClient.queryEvents(offerFilter),
        optimizedNostrClient.queryEvents(reactionFilter)
      ]);

      // Angebote aus Events erstellen
      const offers = this.parseOfferEvents(offerEvents);
      
      // Reaktionen zu Angeboten hinzufügen
      this.addReactionsToOffers(offers, reactionEvents);

      console.log(`📥 ${offers.length} Angebote von Nostr geladen`);
      return offers;

    } catch (error) {
      console.warn('Fehler beim Laden von Nostr, verwende Fallback:', error);
      
      // Fallback: Lade Demo-Angebote
      return this.getFallbackOffers();
    }
  }

  /**
   * Fallback-Angebote wenn Nostr nicht verfügbar ist
   */
  private getFallbackOffers(): SimpleOffer[] {
    return [
      {
        id: 'demo1',
        text: 'Verkaufe 1 Million Satoshis für 650€. Zahlung per Überweisung oder bar in Wien möglich. Schnelle Abwicklung garantiert!',
        authorPubkey: 'demo_user_1',
        createdAt: Date.now() - 3600000,
        reactions: [
          {
            id: 'r1',
            offerId: 'demo1',
            reactorPubkey: 'demo_user_2',
            type: 'interested' as const,
            message: 'Bin interessiert! Können wir uns in Wien treffen?',
            createdAt: Date.now() - 1800000
          }
        ]
      },
      {
        id: 'demo2',
        text: 'Suche jemanden der mir beim Bitcoin-Kauf hilft. Bin Anfänger und brauche Unterstützung.',
        authorPubkey: 'demo_user_3',
        createdAt: Date.now() - 7200000,
        reactions: [
          {
            id: 'r2',
            offerId: 'demo2',
            reactorPubkey: 'demo_user_1',
            type: 'like' as const,
            createdAt: Date.now() - 3600000
          }
        ]
      }
    ];
  }

  /**
   * Abonniert neue Angebote und Reaktionen in Echtzeit
   */
  subscribeToOffers(callback: (offers: SimpleOffer[]) => void): () => void {
    if (!this.isConnected) {
      console.warn('Nostr nicht verbunden, Subscription übersprungen');
      return () => {};
    }

    const subscriptionId = `offers_${Date.now()}`;

    // Filter für neue Angebots-Events
    const offerFilter = {
      kinds: [30403],
      '#t': ['bitcoin-offer'],
      since: Math.floor(Date.now() / 1000)
    };

    // Filter für neue Reaktions-Events
    const reactionFilter = {
      kinds: [7],
      '#k': ['30403'],
      since: Math.floor(Date.now() / 1000)
    };

    // Event-Handler für neue Events
    const handleNewEvent = async (event: NostrEvent) => {
      try {
        // Lade alle Angebote neu wenn neues Event empfangen
        const updatedOffers = await this.loadOffers();
        callback(updatedOffers);
      } catch (error) {
        console.warn('Fehler beim Aktualisieren der Angebote:', error);
      }
    };

    // Abonniere beide Filter über optimierte Relays
    const offerSubId = bitcoinNostr.subscribe(offerFilter, handleNewEvent, 'BITCOIN_OFFERS');
    const reactionSubId = bitcoinNostr.subscribe(reactionFilter, handleNewEvent, 'BITCOIN_OFFERS');

    this.subscriptions.set(subscriptionId, { offerSubId, reactionSubId });

    console.log('🔔 Echtzeit-Subscription für Angebote gestartet:', subscriptionId);

    // Cleanup-Funktion zurückgeben
    return () => {
      optimizedNostrClient.unsubscribe(offerSubId);
      optimizedNostrClient.unsubscribe(reactionSubId);
      this.subscriptions.delete(subscriptionId);
      console.log('❌ Subscription beendet:', subscriptionId);
    };
  }

  /**
   * Löscht ein Angebot (nur eigene)
   */
  async deleteOffer(offerId: string): Promise<void> {
    await this.ensureConnected();

    try {
      // Deletion-Event erstellen (NIP-09)
      const event: Partial<NostrEvent> = {
        kind: 5, // Deletion event
        content: 'Angebot gelöscht',
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['e', offerId], // Event-ID des zu löschenden Angebots
          ['k', '30403'] // Kind des ursprünglichen Events
        ]
      };

      // Event signieren und an Nostr senden
      const signedEvent = await signEvent(event, this.identity!.privateKey);
      await optimizedNostrClient.publishEvent(signedEvent, 'BITCOIN_OFFERS');

      console.log('🗑️ Lösch-Event an Nostr gesendet:', offerId);

    } catch (error) {
      throw new Error(`Fehler beim Löschen des Angebots: ${(error as Error).message}`);
    }
  }

  /**
   * Sendet eine Benachrichtigung an den Angebotssteller
   */
  async sendNotificationToAuthor(
    authorPubkey: string,
    offer: SimpleOffer,
    reaction: OfferReaction,
    senderName?: string
  ): Promise<void> {
    try {
      const reactionTypeText = {
        'interested': 'ist interessiert an',
        'like': 'gefällt',
        'question': 'hat eine Frage zu'
      }[reaction.type];

      const notificationContent = `🔔 Neue Reaktion auf Ihr Angebot!

${senderName || 'Jemand'} ${reactionTypeText} Ihrem Angebot:
"${offer.text.substring(0, 100)}${offer.text.length > 100 ? '...' : ''}"

${reaction.message ? `Nachricht: "${reaction.message}"` : ''}

Angebot-ID: ${offer.id}
Zeit: ${new Date().toLocaleString('de-DE')}`;

      // Nostr Direct Message Event erstellen (Kind 4)
      const dmEvent: Partial<NostrEvent> = {
        kind: 4, // Direct Message
        content: notificationContent,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['p', authorPubkey], // Empfänger
          ['offer-notification', offer.id], // Custom tag für Angebots-Benachrichtigungen
          ['reaction-type', reaction.type]
        ]
      };

      // Event signieren und an Nostr senden
      const signedEvent = await signEvent(dmEvent, this.identity!.privateKey);
      await optimizedNostrClient.publishEvent(signedEvent, 'BITCOIN_OFFERS');

      console.log('Benachrichtigung gesendet an:', authorPubkey);

    } catch (error) {
      console.warn('Fehler beim Senden der Benachrichtigung:', error);
      throw error;
    }
  }

  /**
   * Hilfsmethoden
   */

  private parseOfferEvents(events: NostrEvent[]): SimpleOffer[] {
    return events.map(event => {
      const dTag = event.tags.find(tag => tag[0] === 'd')?.[1] || event.id;
      const isAnonymous = event.tags.some(tag => tag[0] === 'anonymous' && tag[1] === 'true');

      return {
        id: dTag,
        text: event.content,
        authorPubkey: event.pubkey,
        createdAt: event.created_at * 1000,
        reactions: [],
        isAnonymous
      };
    });
  }

  private addReactionsToOffers(offers: SimpleOffer[], reactionEvents: NostrEvent[]): void {
    for (const event of reactionEvents) {
      const offerId = event.tags.find(tag => tag[0] === 'e')?.[1];
      const reactionType = event.tags.find(tag => tag[0] === 'reaction-type')?.[1] as OfferReaction['type'];
      
      if (!offerId || !reactionType) continue;

      const offer = offers.find(o => o.id === offerId);
      if (!offer) continue;

      const reaction: OfferReaction = {
        id: event.id,
        offerId: offerId,
        reactorPubkey: event.pubkey,
        type: reactionType,
        message: event.content.replace(/^[👀👍❓]\s*/, ''), // Emoji entfernen
        createdAt: event.created_at * 1000
      };

      offer.reactions.push(reaction);
    }
  }

  /**
   * Bereinigung
   */
  cleanup(): void {
    // Alle Subscriptions beenden
    for (const [id, subscription] of this.subscriptions) {
      if (subscription && typeof subscription.close === 'function') {
        subscription.close();
      }
    }
    this.subscriptions.clear();
  }
}

// Singleton-Instanz
export const simpleOfferService = new SimpleOfferService();

// Convenience-Funktionen
export const simpleOffers = {
  create: (text: string, isAnonymous?: boolean) =>
    simpleOfferService.createOffer(text, isAnonymous),
    
  react: (offer: SimpleOffer, type: OfferReaction['type'], message?: string) =>
    simpleOfferService.reactToOffer(offer, type, message),
    
  load: () =>
    simpleOfferService.loadOffers(),
    
  subscribe: (callback: (offers: SimpleOffer[]) => void) =>
    simpleOfferService.subscribeToOffers(callback),
    
  delete: (offerId: string) =>
    simpleOfferService.deleteOffer(offerId),
    
  notify: (authorPubkey: string, offer: SimpleOffer, reaction: OfferReaction, senderName?: string) =>
    simpleOfferService.sendNotificationToAuthor(authorPubkey, offer, reaction, senderName)
};