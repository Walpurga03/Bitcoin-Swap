// Svelte Store für Gruppendaten

import { writable } from 'svelte/store';
import type { GroupConfig, GroupMessage } from '../nostr/types';

export const groupConfig = writable<GroupConfig | null>(null);

export const groupMessages = writable<GroupMessage[]>([]);

export const isGroupConnected = writable<boolean>(false);

// Hilfsfunktionen für den Group Store
export function setGroupConfig(config: GroupConfig) {
  groupConfig.set(config);
  isGroupConnected.set(true);
}

export function addGroupMessage(message: GroupMessage) {
  groupMessages.update(messages => {
    // Duplikate vermeiden
    const exists = messages.some(m => m.id === message.id);
    if (!exists) {
      return [...messages, message].sort((a, b) => a.timestamp - b.timestamp);
    }
    return messages;
  });
}

export function clearGroupData() {
  groupConfig.set(null);
  groupMessages.set([]);
  isGroupConnected.set(false);
}

// Persistierung im localStorage
if (typeof window !== 'undefined') {
  // Laden beim Start
  const savedConfig = localStorage.getItem('nostr-group-config');
  if (savedConfig) {
    try {
      const config = JSON.parse(savedConfig);
      setGroupConfig(config);
    } catch (error) {
      console.warn('Fehler beim Laden der Gruppenkonfiguration:', error);
    }
  }

  // Speichern bei Änderungen
  groupConfig.subscribe((config) => {
    if (config) {
      localStorage.setItem('nostr-group-config', JSON.stringify(config));
    } else {
      localStorage.removeItem('nostr-group-config');
    }
  });
}