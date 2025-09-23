// Svelte Store für User-Informationen

import { writable } from 'svelte/store';
import type { UserProfile } from '../nostr/types';

export const userStore = writable<UserProfile | null>(null);

export const isAuthenticated = writable<boolean>(false);

// Hilfsfunktionen für den User Store
export function setUser(profile: UserProfile) {
  userStore.set(profile);
  isAuthenticated.set(true);
}

export function clearUser() {
  userStore.set(null);
  isAuthenticated.set(false);
}

// Persistierung im localStorage
if (typeof window !== 'undefined') {
  // Laden beim Start
  const savedUser = localStorage.getItem('nostr-user');
  if (savedUser) {
    try {
      const profile = JSON.parse(savedUser);
      setUser(profile);
    } catch (error) {
      console.warn('Fehler beim Laden des gespeicherten Users:', error);
    }
  }

  // Speichern bei Änderungen
  userStore.subscribe((user) => {
    if (user) {
      localStorage.setItem('nostr-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('nostr-user');
    }
  });
}