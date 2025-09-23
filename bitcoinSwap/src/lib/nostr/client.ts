// Nostr Client für Relay-Verbindung und Event-Handling

import { 
  type Event as NostrEvent, 
  SimplePool, 
  getEventHash, 
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  nip04,
  type Filter
} from 'nostr-tools';
import type { GroupConfig, GroupMessage, UserProfile } from './types';
import { encryptMessage, decryptMessage, deriveKeyFromSecret } from './crypto';

export class NostrClient {
  public pool: SimplePool;
  private relays: string[] = [];
  private subscriptions: Map<string, any> = new Map();
  private userProfile: UserProfile | null = null;
  private groupConfig: GroupConfig | null = null;
  private encryptionKey: CryptoKey | null = null;

  constructor() {
    this.pool = new SimplePool();
  }

  /**
   * Verbindung zu Relays herstellen
   */
  async connectToRelays(relays: string[]) {
    this.relays = relays;
    console.log('Verbinde zu Relays:', relays);
  }

  /**
   * Nutzer-Profil setzen
   */
  setUserProfile(profile: UserProfile) {
    this.userProfile = profile;
  }

  /**
   * Gruppe konfigurieren mit Secret
   */
  async configureGroup(config: GroupConfig) {
    this.groupConfig = config;
    this.encryptionKey = await deriveKeyFromSecret(config.secret);
    console.log('Gruppe konfiguriert:', config.channelId);
  }

  /**
   * Verschlüsselte Nachricht in die Gruppe senden
   */
  async sendGroupMessage(content: string): Promise<void> {
    if (!this.userProfile?.privkey || !this.groupConfig || !this.encryptionKey) {
      throw new Error('Client nicht vollständig konfiguriert');
    }

    // Nachricht verschlüsseln
    const encryptedContent = await encryptMessage(content, this.encryptionKey);

    // Nostr Event erstellen (NIP-28 Channel Message)
    const event: Partial<NostrEvent> = {
      kind: 42, // channel_message
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['e', this.groupConfig.channelId, '', 'root'], // Bezug zur Channel
        ['p', this.userProfile.pubkey] // Mention des eigenen pubkeys
      ],
      content: encryptedContent,
      pubkey: this.userProfile.pubkey
    };

    // Event signieren mit finalizeEvent
    const privkeyBytes = new Uint8Array(this.userProfile.privkey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const signedEvent = finalizeEvent(event as NostrEvent, privkeyBytes);

    // An Relays senden
    await Promise.all(
      this.relays.map(relay => this.pool.publish([relay], signedEvent))
    );

    console.log('Gruppennachricht gesendet:', signedEvent.id);
  }

  /**
   * Auf Gruppennachrichten hören
   */
  subscribeToGroupMessages(callback: (message: GroupMessage) => void) {
    if (!this.groupConfig) {
      throw new Error('Gruppe nicht konfiguriert');
    }

    const filter: Filter = {
      kinds: [42], // channel_message
      since: Math.floor(Date.now() / 1000) - 3600 // Letzte Stunde
    } as any;

    const sub = this.pool.subscribeMany(
      this.relays,
      [filter] as any,
      {
        onevent: async (event: NostrEvent) => {
          try {
            // Nachricht entschlüsseln
            let decryptedContent = event.content;
            let decrypted = false;

            if (this.encryptionKey) {
              try {
                decryptedContent = await decryptMessage(event.content, this.encryptionKey);
                decrypted = true;
              } catch (error) {
                console.warn('Entschlüsselung fehlgeschlagen für Event:', event.id);
              }
            }

            const message: GroupMessage = {
              id: event.id,
              pubkey: event.pubkey,
              content: decryptedContent,
              timestamp: event.created_at,
              decrypted
            };

            callback(message);
          } catch (error) {
            console.error('Fehler beim Verarbeiten der Nachricht:', error);
          }
        },
        oneose: () => {
          console.log('Initiale Gruppennachrichten geladen');
        }
      }
    );

    this.subscriptions.set('groupMessages', sub);
  }

  /**
   * Alle Subscriptions beenden
   */
  unsubscribeAll() {
    this.subscriptions.forEach(sub => {
      sub.close();
    });
    this.subscriptions.clear();
  }

  /**
   * Client schließen
   */
  close() {
    this.unsubscribeAll();
    this.pool.close(this.relays);
  }

  /**
   * Neues Nostr-Schlüsselpaar generieren
   */
  static generateKeyPair(): { privkey: string; pubkey: string } {
    const privkey = generateSecretKey();
    const pubkey = getPublicKey(privkey);
    return { 
      privkey: Array.from(privkey, b => b.toString(16).padStart(2, '0')).join(''),
      pubkey 
    };
  }
}