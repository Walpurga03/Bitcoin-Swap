# 🔄 Neuer Workflow - Analyse & Implementierungsplan

**Datum:** 29. Oktober 2025  
**Status:** 📋 Planung

---

## 🎯 Übersicht: Aktuell vs. Neu

### ❌ **AKTUELLES System:**

1. **Temp-Keypair im localStorage** für Angebote
2. **Anbieter-Pubkey in Tags** (öffentlich sichtbar)
3. **Sofortige NIP-17 DMs** bei Interesse
4. **Mehrere parallele DM-Threads** (einer pro Interessent)
5. **Anbieter wählt DM aus** → wird zum Deal-Room

### ✅ **NEUES System:**

1. **Angebots-Secret** (deterministisch, kein localStorage)
2. **Interesse-Signale** (verborgen für andere)
3. **Anbieter sieht Liste** aller Interessenten
4. **Anbieter wählt EINEN aus** → erst dann NIP-17 DM
5. **Absage-Nachrichten** für nicht ausgewählte
6. **24h Auto-Delete** für Angebote

---

## 📊 Detaillierte Änderungen

### 1️⃣ **Angebots-Erstellung mit Secret**

#### **AKTUELL:**
```typescript
// Temp-Keypair wird generiert und in localStorage gespeichert
const tempKeypair = generateKeypair();
localStorage.setItem('marketplace_temp_keypair', JSON.stringify(tempKeypair));

// Angebot wird mit Temp-Pubkey erstellt
const offer = await createMarketplaceOffer(content, tempKeypair, ...);
```

#### **NEU:**
```typescript
// 1. Anbieter generiert Secret beim Erstellen
const offerSecret = generateRandomSecret(32); // 32 Bytes

// 2. Deterministisch Keypair aus Secret ableiten
const offerKeypair = deriveKeypairFromSecret(offerSecret);

// 3. Secret wird NUR dem Anbieter angezeigt (zum Speichern)
showSecretToUser(offerSecret); // "Speichere dieses Secret: abc123..."

// 4. Angebot wird mit abgeleitetem Keypair erstellt
const offer = await createMarketplaceOffer(content, offerKeypair, ...);

// 5. KEIN localStorage! Secret muss User selbst speichern
```

**Vorteile:**
- ✅ Kein localStorage nötig
- ✅ User kann Secret extern speichern (Passwort-Manager)
- ✅ Re-Login mit Secret möglich
- ✅ Deterministisch → gleicher Key bei Re-Login

**Implementierung:**
```typescript
// src/lib/nostr/offerSecret.ts

import { sha256 } from '@noble/hashes/sha256';
import { getPublicKey } from 'nostr-tools';

/**
 * Generiere zufälliges Angebots-Secret
 */
export function generateOfferSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Leite Keypair deterministisch aus Secret ab
 */
export function deriveKeypairFromSecret(secret: string): {
  privateKey: string;
  publicKey: string;
} {
  // Hash Secret zu Private Key
  const hash = sha256(new TextEncoder().encode(secret));
  const privateKey = Array.from(hash, b => b.toString(16).padStart(2, '0')).join('');
  const publicKey = getPublicKey(privateKey as any);
  
  return { privateKey, publicKey };
}

/**
 * Validiere Angebots-Secret Format
 */
export function validateOfferSecret(secret: string): boolean {
  return /^[0-9a-f]{64}$/.test(secret);
}
```

---

### 2️⃣ **Interesse-Signale (verborgen)**

#### **AKTUELL:**
```typescript
// Sofort NIP-17 DM an Anbieter
await sendDirectMessage(
  senderPrivateKey,
  offerCreatorPubkey,
  "Ich habe Interesse!",
  relay
);
```

#### **NEU:**
```typescript
// 1. Interesse-Signal als verschlüsseltes Event
const interestSignal = {
  offerId: offer.id,
  interestedPubkey: userPubkey,
  timestamp: Date.now(),
  message: "Ich habe Interesse!" // Optional
};

// 2. Verschlüssele mit Angebots-Public-Key
const encrypted = await encryptForOfferCreator(
  JSON.stringify(interestSignal),
  offerPublicKey
);

// 3. Publiziere als Kind 30078 (nur für Anbieter lesbar)
const event = await createEvent(30078, encrypted, [
  ['d', `interest-${offerId}-${userPubkey}`],
  ['e', offerId, '', 'reply'],
  ['t', 'bitcoin-interest']
  // ❌ KEIN 'p' Tag mit Anbieter-Pubkey!
], userPrivateKey);
```

**Vorteile:**
- ✅ Andere Gruppenmitglieder sehen KEINE Interessenten
- ✅ Nur Anbieter kann mit seinem Secret entschlüsseln
- ✅ Interesse-Liste bleibt privat

**Implementierung:**
```typescript
// src/lib/nostr/interestSignal.ts

import { encrypt, decrypt } from 'nostr-tools/nip04';

/**
 * Sende Interesse-Signal (verschlüsselt)
 */
export async function sendInterestSignal(
  offerId: string,
  offerPublicKey: string,
  message: string,
  userPrivateKey: string,
  relay: string
): Promise<NostrEvent> {
  const signal = {
    offerId,
    interestedPubkey: getPublicKey(userPrivateKey as any),
    timestamp: Date.now(),
    message
  };

  // Verschlüssele mit Anbieter-Pubkey
  const encrypted = await encrypt(
    userPrivateKey as any,
    offerPublicKey,
    JSON.stringify(signal)
  );

  const tags = [
    ['d', `interest-${offerId}-${signal.interestedPubkey}`],
    ['e', offerId, '', 'reply'],
    ['t', 'bitcoin-interest']
  ];

  const event = await createEvent(30078, encrypted, tags, userPrivateKey);
  await publishEvent(event, [relay]);

  return event;
}

/**
 * Lade Interesse-Signale für Angebot (nur Anbieter)
 */
export async function loadInterestSignals(
  offerId: string,
  offerPrivateKey: string,
  relay: string
): Promise<Array<{
  pubkey: string;
  message: string;
  timestamp: number;
}>> {
  const filter = {
    kinds: [30078],
    '#e': [offerId],
    '#t': ['bitcoin-interest']
  };

  const events = await fetchEvents([relay], filter);
  
  // Entschlüssele mit Angebots-Private-Key
  const signals = await Promise.all(
    events.map(async (event) => {
      try {
        const decrypted = await decrypt(
          offerPrivateKey as any,
          event.pubkey,
          event.content
        );
        return JSON.parse(decrypted);
      } catch {
        return null;
      }
    })
  );

  return signals.filter(s => s !== null);
}
```

---

### 3️⃣ **Anbieter wählt Interessenten aus**

#### **AKTUELL:**
```typescript
// Anbieter hat bereits mehrere DM-Threads
// Wählt eine DM aus → wird zum Deal-Room
```

#### **NEU:**
```typescript
// 1. Anbieter sieht Liste aller Interessenten
const interests = await loadInterestSignals(offerId, offerSecret, relay);

// UI zeigt Liste:
// - User A: "Ich hätte gerne 100€"
// - User B: "Kann morgen treffen"
// - User C: "Habe 0.002 BTC"

// 2. Anbieter wählt EINEN aus (z.B. User B)
const selectedPubkey = "user-b-pubkey";

// 3. ERST JETZT wird NIP-17 DM erstellt
await createNIP17Message(
  "🤝 Hallo! Ich habe dich für den Deal ausgewählt. Lass uns Details besprechen...",
  selectedPubkey,
  offerPrivateKey
);

// 4. Sende Absagen an nicht ausgewählte
for (const interest of interests) {
  if (interest.pubkey !== selectedPubkey) {
    await sendRejectionMessage(interest.pubkey, offerId, offerPrivateKey);
  }
}

// 5. Lösche Angebot vom Relay
await deleteEvent(offerId, offerPrivateKey, [relay]);
```

**Vorteile:**
- ✅ Nur EINE DM wird erstellt (mit ausgewähltem Partner)
- ✅ Keine parallelen DM-Threads
- ✅ Klare Absagen für nicht ausgewählte
- ✅ Angebot wird automatisch gelöscht

**Implementierung:**
```typescript
// src/lib/nostr/offerSelection.ts

/**
 * Wähle Interessenten aus und starte Deal
 */
export async function selectInterestAndStartDeal(
  offerId: string,
  selectedPubkey: string,
  allInterests: Array<{ pubkey: string }>,
  offerPrivateKey: string,
  relay: string
): Promise<void> {
  // 1. Erstelle NIP-17 DM mit ausgewähltem Partner
  const { wrappedEvent } = await createNIP17Message(
    "🤝 Hallo! Ich habe dich für den Deal ausgewählt. Lass uns die Details besprechen...",
    selectedPubkey,
    offerPrivateKey
  );
  await publishEvent(wrappedEvent as NostrEvent, [relay]);

  // 2. Sende Absagen an alle anderen
  const rejectedPubkeys = allInterests
    .map(i => i.pubkey)
    .filter(p => p !== selectedPubkey);

  for (const pubkey of rejectedPubkeys) {
    const { wrappedEvent: rejection } = await createNIP17Message(
      "❌ Danke für dein Interesse, aber ich habe mich für einen anderen Partner entschieden.",
      pubkey,
      offerPrivateKey
    );
    await publishEvent(rejection as NostrEvent, [relay]);
  }

  // 3. Lösche Angebot vom Relay
  await deleteEvent(offerId, offerPrivateKey, [relay], "Deal gestartet");

  console.log('✅ Deal gestartet mit:', selectedPubkey.substring(0, 16) + '...');
}
```

---

### 4️⃣ **24h Auto-Delete für Angebote**

#### **AKTUELL:**
```typescript
// Kein Auto-Delete
// Angebote bleiben bis manuell gelöscht
```

#### **NEU:**
```typescript
// 1. Beim Erstellen: Expiration-Tag setzen
const expirationTime = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // +24h

const tags = [
  ['e', channelId, '', 'root'],
  ['t', GROUP_TAG],
  ['d', `offer-${Date.now()}`],
  ['expiration', expirationTime.toString()] // ← NEU!
];

// 2. Client prüft regelmäßig abgelaufene Angebote
setInterval(async () => {
  const myOffers = await loadMyOffers(offerSecret, relay);
  const now = Math.floor(Date.now() / 1000);

  for (const offer of myOffers) {
    const expiration = offer.tags.find(t => t[0] === 'expiration')?.[1];
    if (expiration && parseInt(expiration) < now) {
      // Angebot ist abgelaufen → löschen
      await deleteEvent(offer.id, offerPrivateKey, [relay], "Abgelaufen");
    }
  }
}, 60000); // Alle 60 Sekunden prüfen
```

**Implementierung:**
```typescript
// src/lib/nostr/offerExpiration.ts

/**
 * Prüfe und lösche abgelaufene Angebote
 */
export async function cleanupExpiredOffers(
  offerSecret: string,
  relay: string
): Promise<number> {
  const { privateKey, publicKey } = deriveKeypairFromSecret(offerSecret);
  
  // Lade alle eigenen Angebote
  const filter = {
    kinds: [30000],
    authors: [publicKey],
    '#t': [GROUP_TAG]
  };

  const offers = await fetchEvents([relay], filter);
  const now = Math.floor(Date.now() / 1000);
  let deletedCount = 0;

  for (const offer of offers) {
    const expirationTag = offer.tags.find(t => t[0] === 'expiration');
    if (!expirationTag) continue;

    const expiration = parseInt(expirationTag[1]);
    if (expiration < now) {
      // Abgelaufen → löschen
      await deleteEvent(offer.id, privateKey, [relay], "Automatisch abgelaufen");
      deletedCount++;
      console.log('🗑️ Abgelaufenes Angebot gelöscht:', offer.id.substring(0, 16) + '...');
    }
  }

  return deletedCount;
}

/**
 * Starte Auto-Cleanup Timer
 */
export function startOfferCleanupTimer(
  offerSecret: string,
  relay: string,
  intervalMs: number = 60000
): () => void {
  const timer = setInterval(async () => {
    await cleanupExpiredOffers(offerSecret, relay);
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(timer);
}
```

---

## 🔄 Migrations-Plan

### **Phase 1: Neue Funktionen hinzufügen**

1. ✅ `offerSecret.ts` erstellen
2. ✅ `interestSignal.ts` erstellen
3. ✅ `offerSelection.ts` erstellen
4. ✅ `offerExpiration.ts` erstellen

### **Phase 2: UI anpassen**

1. ✅ Angebots-Erstellung: Secret-Anzeige hinzufügen
2. ✅ Interesse-Button: Signal statt DM senden
3. ✅ Anbieter-View: Interessenten-Liste anzeigen
4. ✅ Auswahl-Dialog: Partner auswählen + Absagen senden

### **Phase 3: localStorage entfernen**

1. ✅ `marketplace_temp_keypair` aus localStorage entfernen
2. ✅ Secret-basiertes System verwenden
3. ✅ Re-Login mit Secret implementieren

### **Phase 4: Testing & Cleanup**

1. ✅ Alle Flows testen
2. ✅ Alte Code-Pfade entfernen
3. ✅ Dokumentation aktualisieren

---

## 📋 Implementierungs-Checkliste

### **Neue Dateien erstellen:**
- [ ] `src/lib/nostr/offerSecret.ts`
- [ ] `src/lib/nostr/interestSignal.ts`
- [ ] `src/lib/nostr/offerSelection.ts`
- [ ] `src/lib/nostr/offerExpiration.ts`

### **Bestehende Dateien anpassen:**
- [ ] `src/routes/(app)/group/+page.svelte` - Angebots-Erstellung
- [ ] `src/routes/(app)/group/+page.svelte` - Interesse-Button
- [ ] `src/routes/(app)/group/+page.svelte` - Interessenten-Liste
- [ ] `src/lib/nostr/client.ts` - Alte Funktionen entfernen

### **localStorage bereinigen:**
- [ ] `marketplace_temp_keypair` Nutzung entfernen
- [ ] Secret-Input für Re-Login hinzufügen

### **UI-Komponenten:**
- [ ] Secret-Anzeige-Modal erstellen
- [ ] Interessenten-Liste-Komponente erstellen
- [ ] Auswahl-Dialog-Komponente erstellen

---

## 🎯 Vorteile des neuen Systems

1. ✅ **Kein localStorage** - Alles auf Relays
2. ✅ **Privatsphäre** - Interesse-Signale verborgen
3. ✅ **Effizienz** - Nur EINE DM statt mehrere
4. ✅ **Klarheit** - Absagen für nicht ausgewählte
5. ✅ **Auto-Cleanup** - 24h Expiration
6. ✅ **Re-Login** - Mit Secret möglich
7. ✅ **Deterministisch** - Gleicher Key bei Re-Login

---

## ⚠️ Herausforderungen

1. **User muss Secret speichern** - Passwort-Manager empfehlen
2. **Secret-Verlust** - Angebot kann nicht mehr gelöscht werden
3. **Komplexität** - Mehr Schritte für Anbieter
4. **UI/UX** - Muss intuitiv sein

---

## 📝 Nächste Schritte

1. **Bestätigung** - Soll ich mit der Implementierung beginnen?
2. **Priorität** - Welche Phase zuerst?
3. **Testing** - Wie soll getestet werden?

---

**Letzte Aktualisierung:** 29. Oktober 2025  
**Status:** 📋 Bereit für Implementierung