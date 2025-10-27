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

      // Kein localStorage mehr: Session wird nicht persistent gespeichert. tempPrivkey bleibt nur im State.
    },

    /**
     * Setze temporären Private Key für Marketplace
     */
    setTempPrivkey: (tempPrivkey: string) => {
      update(state => ({
        ...state,
        tempPrivkey
      }));
      
      // Kein localStorage mehr: tempPrivkey bleibt nur im State.
    },

    /**
     * Update User Name
     */
    updateName: (name: string) => {
      update(state => ({
        ...state,
        name
      }));

      // Kein localStorage mehr: Name bleibt nur im State.
    },

    /**
     * Logout
     */
    logout: () => {
      // Kein localStorage mehr: tempPrivkey bleibt nur im State. State wird zurückgesetzt.
      set(initialState);
    },

    /**
     * Restore Session von localStorage
     */
    restoreSession: () => {
      // Kein localStorage mehr: Session kann nicht wiederhergestellt werden. User muss sich neu authentifizieren.
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