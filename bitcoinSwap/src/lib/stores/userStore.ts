// Svelte Store für User-Informationen

import { writable, derived } from 'svelte/store';
import type { UserProfile, Nullable } from '../nostr/types';
import { validatePublicKey } from '../security/validation';

export const userStore = writable<Nullable<UserProfile>>(null);
export const isAuthenticated = writable<boolean>(false);

// Derived Stores für bessere Reaktivität
export const userPublicKey = derived(userStore, ($user) => $user?.pubkey || null);
export const userName = derived(userStore, ($user) => $user?.name || null);
export const userProfile = derived(userStore, ($user) => $user ? {
  pubkey: $user.pubkey,
  name: $user.name,
  picture: $user.picture,
  about: $user.about,
  nip05: $user.nip05
} : null);

// Hilfsfunktionen für den User Store
export function setUser(profile: UserProfile): void {
  // Validiere das Profil vor dem Setzen
  if (!profile.pubkey) {
    throw new Error('User-Profil muss einen Public Key enthalten');
  }

  const validation = validatePublicKey(profile.pubkey);
  if (!validation.isValid) {
    throw new Error(`Ungültiger Public Key: ${validation.errors.join(', ')}`);
  }

  // Sichere Kopie erstellen (ohne Private Key für localStorage)
  const safeProfile: UserProfile = {
    pubkey: profile.pubkey,
    name: profile.name || `User_${profile.pubkey.substring(0, 8)}`,
    picture: profile.picture,
    about: profile.about,
    nip05: profile.nip05
  };

  // Private Key nur temporär im Memory Store
  if (profile.privkey) {
    safeProfile.privkey = profile.privkey;
  }

  userStore.set(safeProfile);
  isAuthenticated.set(true);
}

export function clearUser(): void {
  userStore.set(null);
  isAuthenticated.set(false);
}

export function updateUserProfile(updates: Partial<UserProfile>): void {
  userStore.update(currentUser => {
    if (!currentUser) return null;
    
    return {
      ...currentUser,
      ...updates,
      // Pubkey darf nicht geändert werden
      pubkey: currentUser.pubkey
    };
  });
}

// Sichere Persistierung im localStorage (ohne Private Key)
if (typeof window !== 'undefined') {
  const STORAGE_KEY = 'nostr-user-profile';
  
  // Laden beim Start
  try {
    const savedUser = localStorage.getItem(STORAGE_KEY);
    if (savedUser) {
      const profile = JSON.parse(savedUser);
      
      // Nur öffentliche Daten laden (ohne Private Key)
      if (profile.pubkey) {
        const safeProfile: UserProfile = {
          pubkey: profile.pubkey,
          name: profile.name,
          picture: profile.picture,
          about: profile.about,
          nip05: profile.nip05
          // privkey wird NICHT aus localStorage geladen
        };
        
        userStore.set(safeProfile);
        isAuthenticated.set(true);
      }
    }
  } catch (error) {
    console.warn('Fehler beim Laden des gespeicherten Users:', error);
    localStorage.removeItem(STORAGE_KEY);
  }

  // Speichern bei Änderungen (nur öffentliche Daten)
  userStore.subscribe((user) => {
    if (user) {
      // Sichere Kopie ohne Private Key für localStorage
      const safeUser = {
        pubkey: user.pubkey,
        name: user.name,
        picture: user.picture,
        about: user.about,
        nip05: user.nip05
        // privkey wird NICHT gespeichert
      };
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser));
      } catch (error) {
        console.warn('Fehler beim Speichern des User-Profils:', error);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  });
}

// Session-Management
export function isUserLoggedIn(): boolean {
  let authenticated = false;
  isAuthenticated.subscribe(value => authenticated = value)();
  return authenticated;
}

export function getCurrentUser(): Nullable<UserProfile> {
  let currentUser: Nullable<UserProfile> = null;
  userStore.subscribe(value => currentUser = value)();
  return currentUser;
}

// Sicherheitsfunktionen
export function hasPrivateKey(): boolean {
  const user = getCurrentUser();
  return !!(user?.privkey);
}

export function canSignEvents(): boolean {
  return hasPrivateKey();
}