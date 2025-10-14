/**
 * Chat-Einladungs-System
 * 
 * Ermöglicht Angebotsgeber, Interessenten zu einem privaten Chat einzuladen.
 * Der Interessent kann die Einladung annehmen, woraufhin das Angebot gelöscht wird.
 */

import { getPublicKey, finalizeEvent } from 'nostr-tools';
import { publishEvent, fetchEvents } from './client';
import type { NostrEvent } from './types';

/**
 * Chat-Einladung Interface
 */
export interface ChatInvitation {
  id: string;
  offerId: string;
  offerCreatorPubkey: string;
  invitedPubkey: string;
  created_at: number;
  status: 'pending' | 'accepted' | 'declined';
}

/**
 * Erstelle eine Chat-Einladung
 * 
 * @param offerId - ID des Angebots
 * @param invitedPubkey - Public Key des eingeladenen Interessenten
 * @param offerCreatorPrivkey - Private Key des Angebotgebers
 * @param relays - Nostr Relays
 * @returns Chat-Einladungs-Event
 */
export async function createChatInvitation(
  offerId: string,
  invitedPubkey: string,
  offerCreatorPrivkey: string,
  relays: string[]
): Promise<NostrEvent> {
  try {
    console.log('💬 [CHAT-INVITE] Erstelle Einladung...');
    console.log('  📝 Angebot:', offerId.substring(0, 16) + '...');
    console.log('  👤 Eingeladen:', invitedPubkey.substring(0, 16) + '...');

    const offerCreatorPubkey = getPublicKey(offerCreatorPrivkey as any);

    // Erstelle Chat-Einladungs-Event (Kind 30078 - Application-specific data)
    const event = {
      kind: 30078,
      pubkey: offerCreatorPubkey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', `chat-invite-${offerId}`], // Unique identifier
        ['e', offerId], // Reference to offer
        ['p', invitedPubkey], // Invited user
        ['status', 'pending'],
        ['type', 'chat-invitation']
      ],
      content: JSON.stringify({
        offerId,
        invitedPubkey,
        message: 'Der Anbieter möchte mit dir chatten!'
      })
    };

    // Signiere Event
    const signedEvent = finalizeEvent(event, offerCreatorPrivkey as any);

    // Publiziere auf Relays
    const result = await publishEvent(signedEvent as NostrEvent, relays);
    console.log('  ✅ Einladung erstellt:', result.relays.length + '/' + relays.length + ' Relays');

    return signedEvent as NostrEvent;
  } catch (error) {
    console.error('❌ [CHAT-INVITE] Fehler beim Erstellen:', error);
    throw error;
  }
}

/**
 * Lade Chat-Einladungen für einen Benutzer
 * 
 * @param userPubkey - Public Key des Benutzers
 * @param relays - Nostr Relays
 * @returns Liste der Chat-Einladungen
 */
export async function fetchChatInvitations(
  userPubkey: string,
  relays: string[]
): Promise<ChatInvitation[]> {
  try {
    console.log('📥 [CHAT-INVITE] Lade Einladungen...');
    console.log('  👤 User:', userPubkey.substring(0, 16) + '...');

    // Hole alle Chat-Einladungen für diesen User
    const events = await fetchEvents(relays, {
      kinds: [30078],
      '#p': [userPubkey]
    });

    // Filtere nach type=chat-invitation
    const invitationEvents = events.filter(event => {
      const typeTag = event.tags.find(t => t[0] === 'type');
      return typeTag && typeTag[1] === 'chat-invitation';
    });

    console.log('  📦 Events gefunden:', events.length);

    // Konvertiere zu ChatInvitation Format
    const invitations: ChatInvitation[] = invitationEvents
      .map(event => {
        try {
          const content = JSON.parse(event.content);
          const statusTag = event.tags.find(t => t[0] === 'status');
          const offerTag = event.tags.find(t => t[0] === 'e');

          return {
            id: event.id,
            offerId: offerTag ? offerTag[1] : content.offerId,
            offerCreatorPubkey: event.pubkey,
            invitedPubkey: content.invitedPubkey,
            created_at: event.created_at,
            status: (statusTag ? statusTag[1] : 'pending') as 'pending' | 'accepted' | 'declined'
          };
        } catch (e) {
          console.error('❌ [CHAT-INVITE] Fehler beim Parsen:', e);
          return null;
        }
      })
      .filter((inv): inv is ChatInvitation => inv !== null)
      .filter(inv => inv.status === 'pending'); // Nur pending Einladungen

    console.log('  ✅ Einladungen geladen:', invitations.length);
    return invitations;
  } catch (error) {
    console.error('❌ [CHAT-INVITE] Fehler beim Laden:', error);
    return [];
  }
}

/**
 * Akzeptiere eine Chat-Einladung
 * 
 * @param invitationId - ID der Einladung
 * @param userPrivkey - Private Key des Benutzers
 * @param relays - Nostr Relays
 * @returns Akzeptierungs-Event
 */
export async function acceptChatInvitation(
  invitationId: string,
  offerId: string,
  userPrivkey: string,
  relays: string[]
): Promise<NostrEvent> {
  try {
    console.log('✅ [CHAT-INVITE] Akzeptiere Einladung...');
    console.log('  📝 Einladung:', invitationId.substring(0, 16) + '...');

    const userPubkey = getPublicKey(userPrivkey as any);

    // Erstelle Akzeptierungs-Event
    const event = {
      kind: 30078,
      pubkey: userPubkey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', `chat-accept-${invitationId}`],
        ['e', invitationId], // Reference to invitation
        ['e', offerId], // Reference to offer
        ['status', 'accepted'],
        ['type', 'chat-acceptance']
      ],
      content: JSON.stringify({
        invitationId,
        offerId,
        message: 'Einladung akzeptiert!'
      })
    };

    // Signiere Event
    const signedEvent = finalizeEvent(event, userPrivkey as any);

    // Publiziere auf Relays
    const result = await publishEvent(signedEvent as NostrEvent, relays);
    console.log('  ✅ Akzeptierung publiziert:', result.relays.length + '/' + relays.length + ' Relays');

    return signedEvent as NostrEvent;
  } catch (error) {
    console.error('❌ [CHAT-INVITE] Fehler beim Akzeptieren:', error);
    throw error;
  }
}

/**
 * Prüfe ob eine Einladung akzeptiert wurde
 * 
 * @param invitationId - ID der Einladung
 * @param relays - Nostr Relays
 * @returns true wenn akzeptiert
 */
export async function isInvitationAccepted(
  invitationId: string,
  relays: string[]
): Promise<boolean> {
  try {
    console.log('🔍 [CHAT-INVITE] Prüfe Akzeptierung...');

    // Hole Akzeptierungs-Events
    const events = await fetchEvents(relays, {
      kinds: [30078],
      '#e': [invitationId]
    });

    // Filtere nach type=chat-acceptance
    const acceptanceEvents = events.filter(event => {
      const typeTag = event.tags.find(t => t[0] === 'type');
      return typeTag && typeTag[1] === 'chat-acceptance';
    });

    const accepted = acceptanceEvents.length > 0;
    console.log('  ✅ Akzeptiert:', accepted);

    return accepted;
  } catch (error) {
    console.error('❌ [CHAT-INVITE] Fehler beim Prüfen:', error);
    return false;
  }
}