/**
 * Funktionen zum Löschen einzelner Angebote
 */

import NDK, { NDKPrivateKeySigner, NDKEvent } from '@nostr-dev-kit/ndk';

// NDK Setup Funktion
function initNDK(relay: string): NDK {
  const ndk = new NDK({
    explicitRelayUrls: [relay],
    enableOutboxModel: false
  });
  return ndk;
}

/**
 * Löscht ein spezifisches Angebot
 * Nur der Ersteller kann sein eigenes Angebot löschen!
 */
export async function deleteMyOffer(
  userPrivateKey: string,
  offerEventId: string,
  relay: string
): Promise<void> {
  try {
    console.log('🗑️ [DELETE-OFFER] Lösche Angebot:', offerEventId.substring(0, 8) + '...');
    
    // 1. NDK Setup
    const ndk = initNDK(relay);
    const signer = new NDKPrivateKeySigner(userPrivateKey);
    ndk.signer = signer;
    
    await ndk.connect();
    
    const user = await ndk.signer.user();
    console.log('  ✅ NDK verbunden mit User:', user.pubkey.substring(0, 16) + '...');
    
    // 2. Erstelle Deletion Event (Kind 5)
    const deleteEvent = new NDKEvent(ndk);
    deleteEvent.kind = 5; // Deletion event
    deleteEvent.content = 'Angebot vom Ersteller gelöscht';
    deleteEvent.tags = [
      ['e', offerEventId], // Referenz zum zu löschenden Event
      ['k', '42'] // Kind des gelöschten Events (optional aber hilfreich)
    ];
    
    console.log('  📝 Deletion Event erstellt');
    
    // 3. Publiziere Deletion Event
    const publishResult = await deleteEvent.publish();
    
    console.log('  📤 Deletion Event publiziert');
    console.log('  📊 Publish Result Size:', publishResult.size);
    
    if (publishResult.size === 0) {
      throw new Error('❌ Deletion Publishing fehlgeschlagen - keine Relays haben das Event akzeptiert');
    }
    
    // 4. Warte auf Relay-Sync
    console.log('  ⏳ Warte 3 Sekunden auf Deletion-Sync...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('  ✅ Angebot erfolgreich gelöscht!');
    
  } catch (error) {
    console.error('❌ Fehler beim Löschen des Angebots:', error);
    throw error;
  }
}

/**
 * Löscht alle eigenen Angebote
 * (für den Fall, dass ein User mehrere Angebote hat)
 */
export async function deleteAllMyOffers(
  userPrivateKey: string,
  channelId: string,
  relay: string
): Promise<void> {
  try {
    console.log('🗑️ [DELETE-ALL-OFFERS] Lösche alle eigenen Angebote...');
    
    const ndk = initNDK(relay);
    const signer = new NDKPrivateKeySigner(userPrivateKey);
    ndk.signer = signer;
    
    await ndk.connect();
    
    const user = await ndk.signer.user();
    
    // Lade alle eigenen Angebote
    const offerEvents = await ndk.fetchEvents({
      kinds: [42],
      '#e': [channelId],
      authors: [user.pubkey]
    });
    
    console.log(`  📋 Gefunden: ${offerEvents.size} eigene Angebote`);
    
    // Lösche jedes Angebot
    for (const event of offerEvents) {
      await deleteMyOffer(userPrivateKey, event.id, relay);
    }
    
    console.log('  ✅ Alle eigenen Angebote gelöscht!');
    
  } catch (error) {
    console.error('❌ Fehler beim Löschen aller Angebote:', error);
    throw error;
  }
}