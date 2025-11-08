/**
 * ============================================
 * Deal-Status System
 * ============================================
 * 
 * Einfaches System zur Verwaltung von Deals:
 * - Deal erstellen (nach Auswahl eines Interessenten)
 * - Deal-Status laden
 * - Meine Deals anzeigen
 * 
 * KEIN Chat-System! Nur Anzeige: "Deal mit User X"
 */

import { SimplePool, finalizeEvent, type Event as NostrEvent } from 'nostr-tools';

export interface Deal {
  id: string;
  offerId: string;
  buyerPubkey: string;
  sellerPubkey: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: number;
  updatedAt?: number;
}

const GROUP_TAG = 'bitcoin-group';

/**
 * Erstelle einen Deal (nachdem Anbieter einen Interessenten ausgewählt hat)
 * 
 * @param offerId - ID des ursprünglichen Angebots
 * @param buyerPubkey - Public Key des Käufers (ausgewählter Interessent)
 * @param sellerPubkey - Public Key des Verkäufers (Angebotsgeber)
 * @param sellerPrivateKey - Private Key des Verkäufers (zum Signieren)
 * @param relay - Relay URL
 * @returns Event-ID des Deal-Status
 */
export async function createDeal(
  offerId: string,
  buyerPubkey: string,
  sellerPubkey: string,
  sellerPrivateKey: string,
  relay: string
): Promise<string> {
  const pool = new SimplePool();

  try {
    console.log('🤝 [DEAL] Erstelle Deal-Status...');
    console.log('  Angebot:', offerId.substring(0, 16) + '...');
    console.log('  Käufer:', buyerPubkey.substring(0, 16) + '...');
    console.log('  Verkäufer:', sellerPubkey.substring(0, 16) + '...');

    const now = Math.floor(Date.now() / 1000);

    // Erstelle Deal-Status Event (Kind 30081)
    const event = finalizeEvent({
      kind: 30081,
      content: '', // Kein Content - alle Infos in Tags
      tags: [
        ['d', `deal-${offerId}`],           // Eindeutige Deal-ID
        ['e', offerId, '', 'reply'],        // Referenz zum Angebot
        ['p', buyerPubkey],                 // Käufer
        ['p', sellerPubkey],                // Verkäufer
        ['t', GROUP_TAG],
        ['status', 'active'],               // Status: active
        ['created_at', now.toString()]
      ],
      created_at: now
    }, sellerPrivateKey as any);

    console.log('📡 [DEAL] Publiziere Deal-Status auf Relay...');
    await pool.publish([relay], event as NostrEvent);

    console.log('✅ [DEAL] Deal erstellt:', event.id.substring(0, 16) + '...');
    
    pool.close([relay]);
    return event.id;
  } catch (error) {
    pool.close([relay]);
    console.error('❌ [DEAL] Fehler beim Erstellen:', error);
    throw new Error('Fehler beim Erstellen des Deals');
  }
}

/**
 * Lade Deal-Status für ein bestimmtes Angebot
 * 
 * @param offerId - ID des Angebots
 * @param relay - Relay URL
 * @returns Deal oder null
 */
export async function loadDeal(
  offerId: string,
  relay: string
): Promise<Deal | null> {
  const pool = new SimplePool();

  try {
    console.log('📥 [DEAL] Lade Deal-Status für Angebot:', offerId.substring(0, 16) + '...');

    const events = await pool.querySync([relay], {
      kinds: [30081],
      '#e': [offerId],
      '#t': [GROUP_TAG],
      limit: 1
    });

    if (events.length === 0) {
      console.log('⚠️ [DEAL] Kein Deal gefunden');
      pool.close([relay]);
      return null;
    }

    const event = events[0];
    const deal = parseDealEvent(event);
    
    console.log('✅ [DEAL] Deal gefunden:', {
      id: deal.id.substring(0, 16) + '...',
      status: deal.status,
      buyer: deal.buyerPubkey.substring(0, 16) + '...',
      seller: deal.sellerPubkey.substring(0, 16) + '...'
    });

    pool.close([relay]);
    return deal;
  } catch (error) {
    pool.close([relay]);
    console.error('❌ [DEAL] Fehler beim Laden:', error);
    return null;
  }
}

/**
 * Lade alle Deals, an denen ein User beteiligt ist
 * 
 * @param userPubkey - Public Key des Users
 * @param relay - Relay URL
 * @returns Array von Deals
 */
export async function loadMyDeals(
  userPubkey: string,
  relay: string
): Promise<Deal[]> {
  const pool = new SimplePool();

  try {
    console.log('📥 [DEAL] Lade meine Deals...');

    // Suche nach Deals wo User als Käufer oder Verkäufer beteiligt ist
    const events = await pool.querySync([relay], {
      kinds: [30081],
      '#p': [userPubkey],
      '#t': [GROUP_TAG],
      limit: 50
    });

    console.log(`📊 [DEAL] ${events.length} Deal-Events gefunden`);

    const deals = events
      .map(parseDealEvent)
      .filter(deal => 
        deal.buyerPubkey === userPubkey || 
        deal.sellerPubkey === userPubkey
      )
      .sort((a, b) => b.createdAt - a.createdAt); // Neueste zuerst

    console.log(`✅ [DEAL] ${deals.length} Deals geladen`);

    pool.close([relay]);
    return deals;
  } catch (error) {
    pool.close([relay]);
    console.error('❌ [DEAL] Fehler beim Laden:', error);
    return [];
  }
}

/**
 * Aktualisiere Deal-Status
 * 
 * @param offerId - ID des Angebots
 * @param newStatus - Neuer Status
 * @param privateKey - Private Key des Users (zum Signieren)
 * @param relay - Relay URL
 */
export async function updateDealStatus(
  offerId: string,
  newStatus: 'completed' | 'cancelled',
  privateKey: string,
  relay: string
): Promise<void> {
  const pool = new SimplePool();

  try {
    console.log('🔄 [DEAL] Aktualisiere Deal-Status...');
    console.log('  Angebot:', offerId.substring(0, 16) + '...');
    console.log('  Neuer Status:', newStatus);

    // Lade aktuellen Deal
    const currentDeal = await loadDeal(offerId, relay);
    if (!currentDeal) {
      throw new Error('Deal nicht gefunden');
    }

    const now = Math.floor(Date.now() / 1000);

    // Erstelle Update-Event (überschreibt altes Event mit gleicher d-Tag)
    const event = finalizeEvent({
      kind: 30081,
      content: '',
      tags: [
        ['d', `deal-${offerId}`],
        ['e', offerId, '', 'reply'],
        ['p', currentDeal.buyerPubkey],
        ['p', currentDeal.sellerPubkey],
        ['t', GROUP_TAG],
        ['status', newStatus],
        ['created_at', currentDeal.createdAt.toString()],
        ['updated_at', now.toString()]
      ],
      created_at: now
    }, privateKey as any);

    await pool.publish([relay], event as NostrEvent);

    console.log('✅ [DEAL] Status aktualisiert:', newStatus);
    
    pool.close([relay]);
  } catch (error) {
    pool.close([relay]);
    console.error('❌ [DEAL] Fehler beim Aktualisieren:', error);
    throw new Error('Fehler beim Aktualisieren des Deal-Status');
  }
}

/**
 * Parse NostrEvent zu Deal-Objekt
 */
function parseDealEvent(event: NostrEvent): Deal {
  const dTag = event.tags.find(t => t[0] === 'd')?.[1] || '';
  const offerId = event.tags.find(t => t[0] === 'e')?.[1] || '';
  const pTags = event.tags.filter(t => t[0] === 'p').map(t => t[1]);
  const status = event.tags.find(t => t[0] === 'status')?.[1] as Deal['status'] || 'active';
  const createdAtTag = event.tags.find(t => t[0] === 'created_at')?.[1];
  const updatedAtTag = event.tags.find(t => t[0] === 'updated_at')?.[1];

  // Erste p-Tag = Käufer, Zweite p-Tag = Verkäufer
  const [buyerPubkey, sellerPubkey] = pTags;

  return {
    id: event.id,
    offerId,
    buyerPubkey: buyerPubkey || '',
    sellerPubkey: sellerPubkey || '',
    status,
    createdAt: createdAtTag ? parseInt(createdAtTag) : event.created_at,
    updatedAt: updatedAtTag ? parseInt(updatedAtTag) : undefined
  };
}

/**
 * Prüfe ob User an einem Deal beteiligt ist
 */
export function isUserInDeal(deal: Deal, userPubkey: string): boolean {
  return deal.buyerPubkey === userPubkey || deal.sellerPubkey === userPubkey;
}

/**
 * Hole Partner-Pubkey (der andere User im Deal)
 */
export function getPartnerPubkey(deal: Deal, userPubkey: string): string {
  return deal.buyerPubkey === userPubkey ? deal.sellerPubkey : deal.buyerPubkey;
}

/**
 * Prüfe ob User der Verkäufer ist
 */
export function isUserSeller(deal: Deal, userPubkey: string): boolean {
  return deal.sellerPubkey === userPubkey;
}
