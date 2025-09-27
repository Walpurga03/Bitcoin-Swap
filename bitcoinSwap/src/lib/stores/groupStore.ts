// Svelte Store für Gruppendaten

import { writable, derived } from 'svelte/store';
import type { GroupConfig, GroupMessage, Nullable, ConnectionStatus } from '../nostr/types';
import { validateRelayUrl, validateGroupSecret } from '../security/validation';

export const groupConfig = writable<Nullable<GroupConfig>>(null);
export const groupMessages = writable<GroupMessage[]>([]);
export const isGroupConnected = writable<boolean>(false);
export const connectionStatus = writable<ConnectionStatus>('disconnected');

// Derived Stores für bessere Reaktivität
export const currentRelay = derived(groupConfig, ($config) => $config?.relay || null);
export const groupName = derived(groupConfig, ($config) => $config?.name || 'Unbenannte Gruppe');
export const messageCount = derived(groupMessages, ($messages) => $messages.length);
export const lastMessage = derived(groupMessages, ($messages) =>
  $messages.length > 0 ? $messages[$messages.length - 1] : null
);

// Nachrichten-Statistiken
export const encryptedMessageCount = derived(groupMessages, ($messages) =>
  $messages.filter(m => m.decrypted).length
);

export const recentMessages = derived(groupMessages, ($messages) => {
  const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
  return $messages.filter(m => m.timestamp > oneHourAgo);
});

// Hilfsfunktionen für den Group Store
export function setGroupConfig(config: GroupConfig): void {
  // Validiere die Gruppenkonfiguration
  if (!config.relay || !config.secret || !config.channelId) {
    throw new Error('Gruppenkonfiguration ist unvollständig');
  }

  const relayValidation = validateRelayUrl(config.relay);
  if (!relayValidation.isValid) {
    throw new Error(`Ungültige Relay-URL: ${relayValidation.errors.join(', ')}`);
  }

  const secretValidation = validateGroupSecret(config.secret);
  if (!secretValidation.isValid) {
    throw new Error(`Ungültiges Gruppen-Secret: ${secretValidation.errors.join(', ')}`);
  }

  // Sichere Konfiguration setzen
  const safeConfig: GroupConfig = {
    channelId: config.channelId,
    relay: config.relay,
    secret: config.secret,
    name: config.name || 'Private Bitcoin-Gruppe',
    description: config.description
  };

  groupConfig.set(safeConfig);
  isGroupConnected.set(true);
  connectionStatus.set('connected');
}

export function addGroupMessage(message: GroupMessage): void {
  if (!message.id || !message.pubkey || !message.content) {
    console.warn('Ungültige Nachricht ignoriert:', message);
    return;
  }

  groupMessages.update(messages => {
    // Duplikate vermeiden
    const exists = messages.some(m => m.id === message.id);
    if (!exists) {
      const newMessages = [...messages, message];
      
      // Sortieren nach Zeitstempel
      newMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      // Begrenzen auf maximal 1000 Nachrichten für Performance
      if (newMessages.length > 1000) {
        return newMessages.slice(-1000);
      }
      
      return newMessages;
    }
    return messages;
  });
}

export function removeMessage(messageId: string): void {
  groupMessages.update(messages =>
    messages.filter(m => m.id !== messageId)
  );
}

export function clearGroupData(): void {
  groupConfig.set(null);
  groupMessages.set([]);
  isGroupConnected.set(false);
  connectionStatus.set('disconnected');
}

export function updateConnectionStatus(status: ConnectionStatus): void {
  connectionStatus.set(status);
  isGroupConnected.set(status === 'connected');
}

export function getMessagesByUser(pubkey: string): GroupMessage[] {
  let messages: GroupMessage[] = [];
  groupMessages.subscribe(value => messages = value)();
  return messages.filter(m => m.pubkey === pubkey);
}

export function getMessagesInTimeRange(startTime: number, endTime: number): GroupMessage[] {
  let messages: GroupMessage[] = [];
  groupMessages.subscribe(value => messages = value)();
  return messages.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
}

// Sichere Persistierung im localStorage (ohne Secret)
if (typeof window !== 'undefined') {
  const STORAGE_KEY = 'nostr-group-config';
  const MESSAGES_KEY = 'nostr-group-messages';
  
  // Laden beim Start - NUR Nachrichten, Config wird über Login-Prozess gesetzt
  try {
    // Nachrichten laden (begrenzt auf letzte 100)
    const savedMessages = localStorage.getItem(MESSAGES_KEY);
    if (savedMessages) {
      const messages = JSON.parse(savedMessages);
      if (Array.isArray(messages)) {
        // Nur die letzten 100 Nachrichten laden
        const recentMessages = messages.slice(-100);
        groupMessages.set(recentMessages);
      }
    }
  } catch (error) {
    console.warn('Fehler beim Laden der Nachrichten:', error);
    localStorage.removeItem(MESSAGES_KEY);
  }

  // Speichern bei Änderungen (ohne Secret)
  groupConfig.subscribe((config) => {
    if (config) {
      // Sichere Kopie ohne Secret für localStorage
      const safeConfig = {
        channelId: config.channelId,
        relay: config.relay,
        name: config.name,
        description: config.description
        // secret wird NICHT gespeichert
      };
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(safeConfig));
      } catch (error) {
        console.warn('Fehler beim Speichern der Gruppenkonfiguration:', error);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  });

  // Nachrichten speichern (begrenzt)
  groupMessages.subscribe((messages) => {
    try {
      // Nur die letzten 100 Nachrichten speichern
      const messagesToSave = messages.slice(-100);
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(messagesToSave));
    } catch (error) {
      console.warn('Fehler beim Speichern der Nachrichten:', error);
    }
  });
}

// Utility-Funktionen
export function getCurrentGroupConfig(): Nullable<GroupConfig> {
  let config: Nullable<GroupConfig> = null;
  groupConfig.subscribe(value => config = value)();
  return config;
}

export function isConnectedToGroup(): boolean {
  let connected = false;
  isGroupConnected.subscribe(value => connected = value)();
  return connected;
}

export function getConnectionStatus(): ConnectionStatus {
  let status: ConnectionStatus = 'disconnected';
  connectionStatus.subscribe(value => status = value)();
  return status;
}