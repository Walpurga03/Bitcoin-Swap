import { writable, derived } from 'svelte/store';
import type { UserProfile } from '$lib/nostr/types';
import { getPublicKeyFromPrivate, pubkeyToNpub } from '$lib/nostr/crypto';
import { validatePrivateKey } from '$lib/security/validation';

// User Store
interface UserState {
  pubkey: string | null;
  privateKey: string | null;
  name: string | null;
  tempPrivkey: string | null;
  isAuthenticated: boolean;
}

const initialState: UserState = {
  pubkey: null,
  privateKey: null,
  name: null,
  tempPrivkey: null,
  isAuthenticated: false
};

function createUserStore() {
  const { subscribe, set, update } = writable<UserState>(initialState);

  return {
    subscribe,
    
    /**
     * Setze User von NSEC/Hex Private Key
     */
    setUserFromNsec: (nsec: string, name?: string) => {
      const validation = validatePrivateKey(nsec);
      
      if (!validation.valid || !validation.hex) {
        throw new Error(validation.error || 'Ungültiger Private Key');
      }

      const privateKey = validation.hex;
      const pubkey = getPublicKeyFromPrivate(privateKey);

      update(state => ({
        ...state,
        pubkey,
        privateKey,
        name: name || null,
        isAuthenticated: true
      }));

      // Speichere in localStorage (optional, für Session-Persistenz)
      if (typeof window !== 'undefined') {
        const existingSession = localStorage.getItem('nostr_session');
        let tempPrivkey = null;
        
        // Behalte existierenden tempPrivkey beim erneuten Login
        if (existingSession) {
          try {
            const data = JSON.parse(existingSession);
            tempPrivkey = data.tempPrivkey || null;
          } catch (e) {
            console.error('Fehler beim Parsen der Session:', e);
          }
        }
        
        localStorage.setItem('nostr_session', JSON.stringify({
          pubkey,
          name: name || null,
          tempPrivkey
        }));
        
        // Setze tempPrivkey im State wenn vorhanden
        if (tempPrivkey) {
          update(state => ({
            ...state,
            tempPrivkey
          }));
        }
      }
    },

    /**
     * Setze temporären Private Key für Marketplace
     */
    setTempPrivkey: (tempPrivkey: string) => {
      update(state => ({
        ...state,
        tempPrivkey
      }));
      
      // Speichere tempPrivkey in localStorage für Persistenz
      if (typeof window !== 'undefined') {
        const session = localStorage.getItem('nostr_session');
        if (session) {
          try {
            const data = JSON.parse(session);
            localStorage.setItem('nostr_session', JSON.stringify({
              ...data,
              tempPrivkey
            }));
          } catch (e) {
            console.error('Fehler beim Speichern des tempPrivkey:', e);
          }
        }
      }
    },

    /**
     * Update User Name
     */
    updateName: (name: string) => {
      update(state => ({
        ...state,
        name
      }));

      // Update localStorage
      if (typeof window !== 'undefined') {
        const session = localStorage.getItem('nostr_session');
        if (session) {
          const data = JSON.parse(session);
          localStorage.setItem('nostr_session', JSON.stringify({
            ...data,
            name
          }));
        }
      }
    },

    /**
     * Logout
     */
    logout: () => {
      set(initialState);
      
      // Lösche localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('nostr_session');
      }
    },

    /**
     * Restore Session von localStorage
     */
    restoreSession: () => {
      if (typeof window !== 'undefined') {
        const session = localStorage.getItem('nostr_session');
        if (session) {
          try {
            const data = JSON.parse(session);
            update(state => ({
              ...state,
              pubkey: data.pubkey,
              name: data.name,
              tempPrivkey: data.tempPrivkey || null, // ✅ Restore tempPrivkey
              isAuthenticated: false // Benötigt erneute NSEC-Eingabe
            }));
          } catch (error) {
            console.error('Fehler beim Wiederherstellen der Session:', error);
          }
        }
      }
    },

    /**
     * Reset Store
     */
    reset: () => set(initialState)
  };
}

export const userStore = createUserStore();

// Derived Stores
export const userPubkey = derived(
  userStore,
  $user => $user.pubkey
);

export const userNpub = derived(
  userStore,
  $user => $user.pubkey ? pubkeyToNpub($user.pubkey) : null
);

export const isAuthenticated = derived(
  userStore,
  $user => $user.isAuthenticated
);

export const userName = derived(
  userStore,
  $user => $user.name || 'Anonym'
);