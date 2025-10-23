# 📝 Angebots-System - Dokumentation

## 🎯 Konzept

Ein **anonymes Angebot-System** mit maximaler Privatsphäre:

- **Anonym:** Angebote zeigen nur Text, keine User-Identität
- **Verschlüsselt:** Interesse-Bekundungen sind NIP-17 verschlüsselt
- **Privat:** Nur Angebot-Ersteller sieht, WER Interesse hat
- **Gleichberechtigt:** Admin/Whitelist-Status ist irrelevant
- **Einfach:** Nur 1 aktives Angebot pro Gruppe
- **Zeitlich begrenzt:** Angebote laufen nach 72 Stunden ab

---

## 🔄 Die 3 Phasen

### 1️⃣ Angebot erstellen

User klickt "Angebot erstellen" → App generiert temporären Keypair → User schreibt Text → Angebot wird als **Kind 42 Event** veröffentlicht

**Besonderheit:** Angebot nutzt `temp_pubkey` statt echtem User-Pubkey → **Anonym**

---

### 2️⃣ Interesse zeigen

User klickt "Interesse zeigen" → Schreibt optionale Nachricht → App sendet **NIP-17 verschlüsselte Nachricht** an `temp_pubkey`

**Besonderheit:** Doppelt verschlüsselt (Sealed Sender + Gift Wrap) → Nur Angebot-Ersteller kann lesen

---

### 3️⃣ Interesse zurückziehen

User klickt "Interesse zurückziehen" → App sendet NIP-17 Nachricht mit `type: "withdraw"`

---

## 🔐 Technische Details

### Nostr Event-Typen

| Event Kind | Zweck | Wer erstellt | Verschlüsselt |
|------------|-------|--------------|---------------|
| **Kind 42** | Angebot (Channel Message) | temp_pubkey | ❌ Nein (öffentlich) |
| **Kind 1059** | Gift Wrap (Interesse) | ephemeral_pubkey | ✅ Ja (NIP-44) |
| **Kind 14** | Sealed Sender (innere Schicht) | user_pubkey | ✅ Ja (NIP-44) |
| **Kind 5** | Deletion (Angebot löschen) | temp_pubkey | ❌ Nein |

---

### NIP-17 Gift-Wrapping Erklärt

**Einfach:** Doppelte Verschlüsselung für maximale Privatsphäre

```
📦 Gift Wrap (Kind 1059) - Äußere Schicht
  └─ Verschlüsselt mit Einweg-Keypair
  └─ Relay sieht NICHT wer Absender ist
      │
      └─ 📩 Sealed Sender (Kind 14) - Innere Schicht
          └─ Verschlüsselt mit User-Keypair
          └─ Enthält echte Nachricht + User-Identität
```

**Warum 2 Schichten?**
- Relay kann keine Metadaten sammeln (wer mit wem kommuniziert)
- Nur Empfänger (temp_pubkey) kann beide Schichten entschlüsseln
- Maximale Anonymität für Interesse-Bekundungen

---

### Code-Beispiele

#### Angebot erstellen (Kind 42)

```typescript
const offerEvent = {
  kind: 42,
  pubkey: tempKeypair.publicKey, // Temporärer Keypair (anonym!)
  created_at: Math.floor(Date.now() / 1000),
  tags: [
    ['e', channelId, relay, 'root'],
    ['expiration', (Date.now()/1000 + 72*3600).toString()] // 72h Auto-Expire
  ],
  content: "Biete 100€ gegen 0.002 BTC",
};

const signed = finishEvent(offerEvent, tempKeypair.privateKey);
await pool.publish([relay], signed);

// Speichere temp_keypair (verschlüsselt + unverschlüsselt)
localStorage.setItem('marketplace_temp_keypair', JSON.stringify(tempKeypair));
const encrypted = nip44.encrypt(JSON.stringify(tempKeypair), userSharedSecret);
localStorage.setItem('marketplace_temp_keypair_encrypted', encrypted);
```

---

#### Interesse senden (NIP-17 mit NDK)

```typescript
import NDK, { NDKPrivateKeySigner, NDKEvent } from '@nostr-dev-kit/ndk';

// NDK Setup
const ndk = new NDK({ explicitRelayUrls: [relay] });
await ndk.connect();

const signer = new NDKPrivateKeySigner(userPrivateKey);
ndk.signer = signer;

// Interesse-Nachricht (NDK macht Gift-Wrapping automatisch!)
const interestMsg = new NDKEvent(ndk);
interestMsg.kind = 14; // Sealed Sender
interestMsg.content = JSON.stringify({
  type: 'interest',
  user_pubkey: userPubkey,
  user_name: userName,
  message: message,
  timestamp: Math.floor(Date.now() / 1000)
});
interestMsg.tags = [['p', tempOfferPubkey]];

await interestMsg.publish(); // NDK wrapped in Kind 1059 automatisch ✨
```

---

#### Interessen laden (nur Ersteller)

```typescript
import { NDKFilter } from '@nostr-dev-kit/ndk';

async function loadInterests(ndk: NDK, tempPrivateKey: string) {
  const signer = new NDKPrivateKeySigner(tempPrivateKey);
  ndk.signer = signer;

  const filter: NDKFilter = {
    kinds: [1059], // Gift-Wrapped Messages
    '#p': [getPublicKey(tempPrivateKey)],
    limit: 100
  };

  const events = await ndk.fetchEvents(filter);
  const interests = [];

  for (const event of events) {
    // NDK entschlüsselt automatisch beide Schichten
    const decrypted = await event.decrypt();
    const data = JSON.parse(decrypted);
    
    if (data.type === 'interest') {
      interests.push(data);
    } else if (data.type === 'withdraw') {
      // Interesse zurückgezogen
      interests = interests.filter(i => i.user_pubkey !== data.user_pubkey);
    }
  }

  return interests;
}
```

---

#### Angebot löschen (Kind 5)

```typescript
const deleteEvent = {
  kind: 5,
  pubkey: getPublicKey(tempPrivateKey),
  created_at: Math.floor(Date.now() / 1000),
  tags: [['e', offerEventId]],
  content: 'Angebot zurückgezogen',
};

const signed = finishEvent(deleteEvent, tempPrivateKey);
await pool.publish([relay], signed);

// Cleanup localStorage
localStorage.removeItem('marketplace_temp_keypair');
localStorage.removeItem('marketplace_temp_keypair_encrypted');
```

---

## 🎨 UI-Flows

### Angebot erstellen

```
[Angebot erstellen Button]
  ↓
[Formular: Textfeld + Hinweis "Anonym & 72h gültig"]
  ↓
[Erstellen] → Event veröffentlicht
  ↓
[Angebot-Card mit "Löschen" + "Interessenten (0)"]
```

---

### Interesse zeigen

```
[Angebot-Card sichtbar]
  ↓
[Button: "Interesse zeigen"]
  ↓
[Modal: Optionale Nachricht schreiben]
  ↓
[Senden] → NIP-17 Nachricht verschickt
  ↓
[Card zeigt: "✅ Interesse gesendet" + "Zurückziehen Button"]
```

---

### Interessenten ansehen (nur Ersteller)

```
[Angebot-Card zeigt: "Interessenten (3)"]
  ↓
[Klick auf "Interessenten ansehen"]
  ↓
[Modal mit Liste:]
  - Alice (@npub...) - "Nachricht..."
  - Bob (@npub...) - "Nachricht..."
  - Charlie (@npub...)
```

---

## 🔒 Sicherheits-Konzept

### Anonymität durch temp_keypair

**Ohne:** User erstellt Angebot mit echtem Pubkey → Jeder sieht wer es erstellt hat ❌

**Mit:** User erstellt Angebot mit temp_pubkey → Niemand weiß wer dahinter steckt ✅

Nur der Ersteller hat den temp_private_key → Nur er kann löschen.

---

### Privatsphäre durch NIP-17

**Verschlüsselung:**
- Doppelte Schicht (Sealed Sender + Gift Wrap)
- NIP-44 Encryption (modern & sicher)
- Ephemeral Keys (einmalig verwendet)

**Metadaten-Schutz:**
- Relay sieht NICHT wer mit wem kommuniziert
- Keine Timing-Analyse möglich
- Maximaler Privacy-Schutz

---

### Interesse-Counter ohne Privacy-Leak

Zeige "3 Personen haben Interesse" OHNE zu entschlüsseln:

```typescript
// Zähle nur Events, entschlüssele nicht
const events = await pool.querySync([relay], {
  kinds: [1059],
  '#p': [tempPubkey]
});
const count = events.length; // ← Counter
```

Nur Ersteller kann mit temp_private_key entschlüsseln und Identitäten sehen.

---

## 📊 Entscheidungen

### 1. Temp-Keypair Recovery

**✅ ENTSCHIEDEN:** Verschlüsselte Backup-Speicherung

```typescript
// Speichern (verschlüsselt + unverschlüsselt)
const encrypted = nip44.encrypt(JSON.stringify(tempKeypair), userSharedSecret);
localStorage.setItem('marketplace_temp_keypair', JSON.stringify(tempKeypair));
localStorage.setItem('marketplace_temp_keypair_encrypted', encrypted);

// Recovery bei Cache-Verlust
const encrypted = localStorage.getItem('marketplace_temp_keypair_encrypted');
if (encrypted && !localStorage.getItem('marketplace_temp_keypair')) {
  const sharedSecret = nip44.getSharedSecret(userPrivateKey, userPublicKey);
  const decrypted = nip44.decrypt(encrypted, sharedSecret);
  localStorage.setItem('marketplace_temp_keypair', decrypted);
}
```

**Vorteil:** User kann Angebot nach Cache-Löschung weiter verwalten.

---

### 2. NIP-17 Library

**✅ ENTSCHIEDEN:** `@nostr-dev-kit/ndk`

```bash
npm install @nostr-dev-kit/ndk
```

**Vorteil:** Bewährt, vollständiger NIP-17 Support, aktiv gewartet.

---

### 3. Auto-Expire

**✅ ENTSCHIEDEN:** 72 Stunden (3 Tage)

```typescript
// NIP-40 expiration Tag
tags: [
  ['e', channelId, relay, 'root'],
  ['expiration', (Date.now()/1000 + 72*3600).toString()]
]

// Countdown UI
function getTimeRemaining(expiresAt: number): string {
  const remaining = expiresAt - Math.floor(Date.now() / 1000);
  if (remaining <= 0) return 'Abgelaufen';
  
  const hours = Math.floor(remaining / 3600);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `Noch ${days} Tag${days > 1 ? 'e' : ''}`;
  }
  return `Noch ${hours}h`;
}
```

**Vorteil:** Automatische Aufräumung, User sieht Dringlichkeit.

---

## 🛠️ Implementierung

### Phase 1: Temp-Keypair + Angebot erstellen

**Dateien:**
- `src/lib/nostr/crypto.ts` - generateTempKeypair()
- `src/lib/nostr/marketplace.ts` - createOffer(), deleteOffer(), loadOffers()
- `src/routes/(app)/group/+page.svelte` - UI für Angebot erstellen/löschen

**Features:**
- Temp-Keypair generieren & speichern (plain + encrypted)
- Kind 42 Event erstellen mit expiration Tag (72h)
- Angebot-Card mit Countdown
- Recovery-Mechanismus (NIP-44 verschlüsselt mit User-NSEC)

---

### Phase 2: NIP-17 Interesse senden/empfangen

**Dateien:**
- `src/lib/nostr/nip17.ts` - sendInterest(), loadInterests(), withdrawInterest() mit NDK
- `src/lib/components/InterestModal.svelte` - Modal für Nachricht schreiben
- `src/lib/components/InterestList.svelte` - Liste der Interessenten (nur Ersteller)

**Features:**
- NDK installieren & konfigurieren
- Gift-Wrapped Messages (Kind 1059 + 14)
- Interesse-Counter (ohne Entschlüsselung)
- Interesse zurückziehen

---

### Phase 3: Auto-Expire & Countdown

**Dateien:**
- `src/lib/utils/time.ts` - getTimeRemaining()
- `src/lib/nostr/marketplace.ts` - Auto-Delete bei Ablauf

**Features:**
- Countdown in UI ("Noch 2 Tage 15h")
- Filter: Nur nicht-abgelaufene Angebote anzeigen
- Automatisches Cleanup von abgelaufenen Angeboten

---

### Phase 4: Testing & Polish

**Tasks:**
- Error Handling (Relay-Fehler, Entschlüsselung fehlgeschlagen)
- Loading States (Spinner, Feedback)
- Edge Cases testen (mehrere Angebote, Cache-Löschung)
- Mobile-Optimierung

---

## ✅ Zusammenfassung

**Das System bietet:**
- ✅ Anonyme Angebote (temp_keypair)
- ✅ NIP-17 verschlüsselte Interessen (Gift-Wrapping)
- ✅ Maximale Privatsphäre (Relay sieht keine Metadaten)
- ✅ Nur Ersteller sieht Interessenten
- ✅ Auto-Expire nach 72h
- ✅ Recovery-Mechanismus bei Cache-Verlust

**Bereit für Implementierung!** 🚀
