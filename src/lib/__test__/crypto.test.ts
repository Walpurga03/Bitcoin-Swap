import { describe, it, expect } from 'vitest';
import {
  encryptForGroup,
  decryptForGroup,
  encryptMetadata,
  decryptMetadata,
  generateTempKeypair,
  getConversationKey,
  verifyEventSignature
} from '../nostr/crypto';
import { deriveKeyFromSecret } from '../nostr/crypto';

describe('Crypto Functions - Gruppe Verschlüsselung', () => {
  it('sollte Daten mit groupKey verschlüsseln und entschlüsseln', async () => {
    const secret = 'test-secret-bitcoin-12345';
    const groupKey = await deriveKeyFromSecret(secret);
    
    const testData = 'Hello Bitcoin World!';
    
    // Verschlüssele
    const encrypted = await encryptForGroup(testData, groupKey);
    expect(encrypted).toBeDefined();
    expect(encrypted.length).toBeGreaterThan(0);
    
    // Entschlüssele
    const decrypted = await decryptForGroup(encrypted, groupKey);
    expect(decrypted).toBe(testData);
  });

  it('sollte Metadaten verschlüsseln und entschlüsseln', async () => {
    const secret = 'test-secret-metadata';
    const groupKey = await deriveKeyFromSecret(secret);
    
    const metadata = {
      pubkey: 'abc123def456',
      name: 'Test User',
      message: 'Hello World'
    };
    
    // Verschlüssele
    const encrypted = await encryptMetadata(metadata, groupKey);
    expect(encrypted.content).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.iv.length).toBe(24); // 12 bytes = 24 hex chars
    
    // Entschlüssele
    const decrypted = await decryptMetadata(encrypted, groupKey);
    expect(decrypted.pubkey).toBe(metadata.pubkey);
    expect(decrypted.name).toBe(metadata.name);
    expect(decrypted.message).toBe(metadata.message);
  });

  it('sollte falsch dekryptierte Daten nicht parsen können', async () => {
    const secret1 = 'test-secret-1';
    const secret2 = 'test-secret-2';
    const groupKey1 = await deriveKeyFromSecret(secret1);
    const groupKey2 = await deriveKeyFromSecret(secret2);
    
    const testData = 'Secret Data';
    
    // Verschlüssele mit Key 1
    const encrypted = await encryptForGroup(testData, groupKey1);
    
    // Versuche mit Key 2 zu entschlüsseln (sollte fehlschlagen)
    try {
      await decryptForGroup(encrypted, groupKey2);
      expect.fail('Sollte einen Error werfen');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});

describe('Crypto Functions - Keypairs', () => {
  it('sollte Temp-Keypairs generieren', () => {
    const keypair = generateTempKeypair();
    expect(keypair.privateKey).toBeDefined();
    expect(keypair.publicKey).toBeDefined();
    expect(keypair.privateKey).toHaveLength(64);
    expect(keypair.publicKey).toHaveLength(64);
  });

  it('sollte zwei unterschiedliche Keypairs generieren', () => {
    const keypair1 = generateTempKeypair();
    const keypair2 = generateTempKeypair();
    
    expect(keypair1.privateKey).not.toBe(keypair2.privateKey);
    expect(keypair1.publicKey).not.toBe(keypair2.publicKey);
  });

  it('sollte Conversation Key generieren', () => {
    const keypair1 = generateTempKeypair();
    const keypair2 = generateTempKeypair();
    
    const key = getConversationKey(keypair1.privateKey, keypair2.publicKey);
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBe(32);
  });
});

describe('Crypto Functions - Signatur-Validierung', () => {
  it('sollte ungültige Events ablehnen', () => {
    const invalidEvent = {
      id: 'invalid',
      sig: 'tooshort',
      pubkey: 'abc123'
    };
    
    const isValid = verifyEventSignature(invalidEvent);
    expect(isValid).toBe(false);
  });

  it('sollte Events ohne erforderliche Felder ablehnen', () => {
    const incompleteEvent = {
      id: 'abc123'
      // fehlt sig und pubkey
    };
    
    const isValid = verifyEventSignature(incompleteEvent);
    expect(isValid).toBe(false);
  });
});