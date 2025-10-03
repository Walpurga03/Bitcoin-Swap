// Lokaler Event-Store für Gruppen-Nachrichten
// Nutzt IndexedDB für persistente Browser-Speicherung

import type { NostrEvent } from 'nostr-tools';

const DB_NAME = 'nostr-groups-db';
const DB_VERSION = 1;
const STORE_NAME = 'group-events';

interface StoredEvent extends NostrEvent {
  channelId: string;
  savedAt: number;
}

export class LocalEventStore {
  private db: IDBDatabase | null = null;

  /**
   * Datenbank initialisieren
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ LocalEventStore: IndexedDB initialisiert');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store erstellen falls nicht existiert
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          
          // Indizes für schnelle Suche
          store.createIndex('channelId', 'channelId', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
          store.createIndex('pubkey', 'pubkey', { unique: false });
          
          console.log('✅ LocalEventStore: ObjectStore erstellt');
        }
      };
    });
  }

  /**
   * Event lokal speichern
   */
  async saveEvent(channelId: string, event: NostrEvent): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const storedEvent: StoredEvent = {
        ...event,
        channelId,
        savedAt: Date.now()
      };

      const request = store.put(storedEvent);

      request.onsuccess = () => {
        console.log('💾 Event lokal gespeichert:', event.id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Events für eine Channel laden
   */
  async loadEvents(channelId: string): Promise<NostrEvent[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('channelId');
      
      const request = index.getAll(IDBKeyRange.only(channelId));

      request.onsuccess = () => {
        const events = request.result as StoredEvent[];
        
        // Sortiere nach created_at (neueste zuerst)
        events.sort((a, b) => b.created_at - a.created_at);
        
        console.log(`📦 ${events.length} Events aus lokalem Store geladen (Channel: ${channelId})`);
        resolve(events);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Alle Events für eine Channel löschen
   */
  async clearChannel(channelId: string): Promise<void> {
    if (!this.db) await this.init();

    const events = await this.loadEvents(channelId);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      let deleted = 0;
      events.forEach(event => {
        store.delete(event.id);
        deleted++;
      });

      transaction.oncomplete = () => {
        console.log(`🗑️ ${deleted} Events aus lokalem Store gelöscht (Channel: ${channelId})`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Alte Events löschen (älter als X Tage)
   */
  async cleanupOldEvents(daysToKeep: number = 30): Promise<void> {
    if (!this.db) await this.init();

    const cutoffTime = Math.floor(Date.now() / 1000) - (daysToKeep * 24 * 60 * 60);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('created_at');
      
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));
      let deleted = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          deleted++;
          cursor.continue();
        } else {
          console.log(`🧹 ${deleted} alte Events gelöscht (älter als ${daysToKeep} Tage)`);
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Event existiert bereits?
   */
  async hasEvent(eventId: string): Promise<boolean> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(eventId);

      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Alle Events zählen
   */
  async countEvents(channelId?: string): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      let request: IDBRequest<number>;
      if (channelId) {
        const index = store.index('channelId');
        request = index.count(IDBKeyRange.only(channelId));
      } else {
        request = store.count();
      }

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton-Instanz
export const localEventStore = new LocalEventStore();
