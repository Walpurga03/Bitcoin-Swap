# Angebots-System — Dokumentation

## 🎯 Konzept-Übersicht

**Ziel:** Ein anonymes, privatsphäre-orientiertes System zum Erstellen und Verwalten von Tauschangeboten innerhalb der Gruppe.

### Grundprinzipien:

1. **Gleichstellung** - Admin/Whitelist spielen KEINE Rolle, alle User haben gleiche Rechte
2. **Anonymität** - Angebote sind anonym (nur Text, kein Name/NPUB sichtbar)
3. **Privatsphäre** - Interesse-Bekundungen sind nur für Angebots-Ersteller sichtbar
4. **Kontrolle** - Nur Angebots-Ersteller kann sein Angebot löschen
5. **Limit** - Erstmal nur 1 Angebot pro Gruppe (später skalierbar)

---

## 📋 Die 3 Phasen

### Phase 1: Angebot erstellen

**Wer:** Jeder User in der Gruppe

**Was:**
- User gibt Text ein (z.B. "Suche 0.01 BTC gegen EUR")
- App generiert **temporäres Keypair** (nsec_temp + npub_temp)
- Angebot wird als **Nostr-Event Kind 42** veröffentlicht
- Event enthält **nur den Text** (keine persönlichen Daten)

**Wichtig:** 
- Angebot ist auf Relay öffentlich sichtbar
- Aber: npub_temp ist NICHT mit echtem User-Pubkey verknüpft
- Temp-Keypair wird lokal gespeichert (nur im Browser)

---

### Phase 2: Interesse zeigen

**Wer:** Alle User AUSSER dem Angebots-Ersteller

**Was:**
- User klickt "Interesse zeigen"
- App sendet **NIP-17 verschlüsselte Nachricht** an npub_temp
- Nachricht enthält: User-NPUB, Name (falls vorhanden), optional Nachricht

**Privatsphäre:**
- Interesse wird als **Gift-Wrapped Event (Kind 1059)** verschickt
- Niemand (auch nicht Relay) sieht wer Interesse zeigt
- Nur Angebots-Ersteller kann mit nsec_temp entschlüsseln

**UI für andere User:**
- Sehen nur: "X Personen haben Interesse gezeigt" (Zahl)
- KEINE Namen oder NPUBs sichtbar

---

### Phase 3: Interesse zurückziehen

**Wer:** User, die Interesse gezeigt haben

**Was:**
- User klickt "Interesse zurückziehen"
- App sendet **NIP-17 Lösch-Nachricht** an npub_temp
- Angebots-Ersteller entfernt User aus Liste

**Alternative:**
- Wenn Angebot gelöscht wird, werden alle Interessen automatisch ungültig

---

## 🔐 Technische Details: Nostr-Events

### 1. Angebot-Event (Kind 42 - Channel Message)

```json
{
  "kind": 42,
  "pubkey": "<temp_pubkey_hex>",
  "created_at": 1729700000,
  "tags": [
    ["e", "<channel_id>", "<relay>", "root"]
  ],
  "content": "Suche 0.01 BTC gegen EUR, Treffen in Berlin möglich",
  "sig": "<signatur_mit_temp_privkey>"
}
```

**Felder:**
- `kind: 42` = Channel Message (öffentlich im Channel)
- `pubkey` = **Temporärer Public Key** (nicht der echte User!)
- `tags: ["e", channel_id]` = Verknüpfung zum Gruppen-Channel
- `content` = Angebots-Text (frei formuliert)
- `sig` = Signatur mit temp_privkey (beweist: vom temp_pubkey)

**Wichtig:**
- Event ist öffentlich auf Relay
- Aber: Keine Verknüpfung zum echten User-Pubkey
- Angebot ist anonym für alle außer Ersteller

---

### 2. Interesse-Event (NIP-17: Gift-Wrapped Message)

**NIP-17 verwendet 2-stufige Verschlüsselung:**

#### Stufe 1: Sealed Sender (Kind 14)

```json
{
  "kind": 14,
  "pubkey": "<user_real_pubkey>",
  "created_at": 1729700100,
  "tags": [],
  "content": "<encrypted_mit_NIP44>",
  "sig": "<signatur_vom_user>"
}
```

**Verschlüsselter Content (nach Entschlüsselung):**
```json
{
  "type": "interest",
  "user_pubkey": "npub1abc...",
  "user_name": "Alice",
  "message": "Habe Interesse, melde dich!"
}
```

#### Stufe 2: Gift Wrap (Kind 1059)

```json
{
  "kind": 1059,
  "pubkey": "<random_ephemeral_pubkey>",
  "created_at": 1729700100,
  "tags": [
    ["p", "<temp_pubkey_hex>"]
  ],
  "content": "<encrypted_sealed_sender_mit_NIP44>",
  "sig": "<signatur_vom_ephemeral_key>"
}
```

**Wie funktioniert Gift-Wrapping?**

1. User erstellt **Sealed Sender (Kind 14)** mit echtem Pubkey
2. Sealed Sender wird mit **NIP-44** verschlüsselt für temp_pubkey
3. App generiert **ephemeral (einmaligen) Keypair**
4. Sealed Sender wird in **Gift Wrap (Kind 1059)** verpackt
5. Gift Wrap wird mit ephemeral_pubkey signiert
6. Nur `["p", temp_pubkey]` Tag zeigt Empfänger an

**Ergebnis:**
- 🎭 Relay sieht: Random-Pubkey → Temp-Pubkey (keine Verbindung zum User)
- 🔒 Nur Angebots-Ersteller (mit nsec_temp) kann entschlüsseln
- 🛡️ Niemand sieht wer Interesse zeigt (auch nicht Relay-Betreiber)

---

### 3. Interesse zurückziehen (NIP-17)

**Gleiche Struktur wie Interesse-Event**, aber:

```json
{
  "type": "withdraw_interest",
  "user_pubkey": "npub1abc...",
  "offer_id": "<angebot_event_id>"
}
```

**Ablauf:**
1. User sendet NIP-17 Nachricht: "Interesse zurückziehen"
2. Angebots-Ersteller empfängt Nachricht
3. App entfernt User aus lokaler Interesse-Liste
4. UI aktualisiert sich automatisch

---

### 4. Angebot löschen (Kind 5 - Deletion Event)

```json
{
  "kind": 5,
  "pubkey": "<temp_pubkey_hex>",
  "created_at": 1729700200,
  "tags": [
    ["e", "<angebot_event_id>"]
  ],
  "content": "Angebot wurde vom Ersteller gelöscht",
  "sig": "<signatur_mit_temp_privkey>"
}
```

**Wichtig:**
- Nur wer temp_privkey hat, kann löschen (= Angebots-Ersteller)
- Nach Löschung: temp_keypair aus localStorage entfernen
- Alle Interesse-Events werden ungültig

---

## 🎨 UI/UX-Flow (Schritt für Schritt)

### Admin/User erstellt Angebot

```
1. Angebotsraum (keine Angebote)
   ↓
   [Button: "Angebot erstellen"]
   ↓
2. Formular öffnet sich
   ↓
   [Textarea: "Was möchtest du tauschen?"]
   [Hinweis: "Dein Angebot ist anonym"]
   ↓
   User gibt Text ein
   ↓
   [Button: "Angebot veröffentlichen"]
   ↓
3. App im Hintergrund:
   - Generiert temp_keypair (nsec_temp + npub_temp)
   - Speichert temp_keypair in localStorage
   - Erstellt Kind 42 Event mit temp_pubkey
   - Publiziert auf Relay
   ↓
4. Erfolgs-Meldung
   ✅ "Angebot veröffentlicht! Andere User können jetzt Interesse zeigen."
   ↓
5. Angebot erscheint in Liste
   - User sieht: [Badge: "Mein Angebot"]
   - Button: "Angebot löschen"
   - Bereich: "Interessenten (0)"
```

---

### Anderer User zeigt Interesse

```
1. Angebotsraum (Angebot sichtbar)
   ↓
   Angebot-Karte:
   - Text: "Suche 0.01 BTC..."
   - [Button: "Interesse zeigen"]
   - Status: "3 Personen haben Interesse gezeigt"
   ↓
   User klickt "Interesse zeigen"
   ↓
2. Optional: Modal öffnet sich
   [Textarea: "Nachricht an Anbieter (optional)"]
   [Button: "Interesse senden"]
   ↓
3. App im Hintergrund:
   - Erstellt NIP-17 Gift-Wrapped Message
   - Verschlüsselt mit temp_pubkey (Empfänger)
   - Content: { user_pubkey, user_name, message }
   - Publiziert auf Relay
   ↓
4. Erfolgs-Meldung
   ✅ "Interesse gesendet!"
   ↓
5. UI aktualisiert sich
   - Button wird zu: "Interesse zurückziehen"
   - User sieht: [Badge: "Du hast Interesse gezeigt"]
```

---

### Angebots-Ersteller sieht Interessen

```
1. Angebotsraum (eigenes Angebot)
   ↓
   Angebot-Karte:
   - [Badge: "Mein Angebot"]
   - Button: "Angebot löschen"
   - Bereich: "Interessenten (3)" [Klickbar]
   ↓
   User klickt auf "Interessenten"
   ↓
2. Liste öffnet sich (nur für Ersteller sichtbar!)
   ┌─────────────────────────────────────┐
   │ 👤 Alice (npub1abc...)              │
   │ "Habe Interesse, melde dich!"       │
   │ [Button: "Deal-Room starten"] ←später│
   ├─────────────────────────────────────┤
   │ 👤 Bob (npub1def...)                │
   │ Keine Nachricht                     │
   │ [Button: "Deal-Room starten"]       │
   ├─────────────────────────────────────┤
   │ 👤 Charlie (npub1ghi...)            │
   │ "Kann auch XMR anbieten"            │
   │ [Button: "Deal-Room starten"]       │
   └─────────────────────────────────────┘
   ↓
3. App im Hintergrund:
   - Lädt alle NIP-17 Events mit p-Tag = temp_pubkey
   - Entschlüsselt mit temp_privkey
   - Zeigt Liste der Interessenten
```

---

### User zieht Interesse zurück

```
1. Angebot mit eigenem Interesse
   ↓
   [Button: "Interesse zurückziehen"]
   ↓
   User klickt
   ↓
2. Bestätigung
   "Möchtest du dein Interesse wirklich zurückziehen?"
   [Ja] [Nein]
   ↓
3. App im Hintergrund:
   - Erstellt NIP-17 Message: "withdraw_interest"
   - Sendet an temp_pubkey
   ↓
4. Erfolgs-Meldung
   ✅ "Interesse zurückgezogen"
   ↓
5. UI aktualisiert sich
   - Button wird wieder zu: "Interesse zeigen"
   - Badge "Du hast Interesse gezeigt" verschwindet
```

---

### Angebots-Ersteller löscht Angebot

```
1. Eigenes Angebot
   ↓
   [Button: "Angebot löschen"]
   ↓
   User klickt
   ↓
2. Bestätigung
   "Möchtest du dein Angebot wirklich löschen?"
   "Alle Interesse-Bekundungen werden ungültig."
   [Ja] [Nein]
   ↓
3. App im Hintergrund:
   - Erstellt Kind 5 Deletion Event
   - Signiert mit temp_privkey
   - Publiziert auf Relay
   - Löscht temp_keypair aus localStorage
   ↓
4. Erfolgs-Meldung
   ✅ "Angebot gelöscht"
   ↓
5. UI aktualisiert sich
   - Angebot verschwindet aus Liste
   - Button "Angebot erstellen" wird wieder sichtbar
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

### Temporäres Keypair: Speicherung & Verwaltung

**Wo wird temp_keypair gespeichert?**
- ✅ `localStorage` im Browser (nur lokal, nicht auf Server)
- ✅ Key: `marketplace_temp_keypair`
- ✅ Format: `{ privateKey: "hex", publicKey: "hex" }`

**Wann wird temp_keypair gelöscht?**
1. User löscht Angebot manuell → temp_keypair sofort löschen
2. User loggt sich aus → temp_keypair optional behalten (für Re-Login)
3. Browser-Cache gelöscht → temp_keypair verloren (Angebot kann nicht mehr gelöscht werden!)

**Wichtig:**
- ⚠️ Wenn temp_keypair verloren geht, kann User Angebot nicht mehr löschen
- 💡 Alternative: temp_keypair mit echtem nsec verschlüsselt speichern (Recovery möglich)

---

## 🛠️ Implementierungs-Details

### 1. Temporäres Keypair generieren

```typescript
// src/lib/nostr/crypto.ts
export function generateTempKeypair(): { privateKey: string; publicKey: string } {
  const privateKeyBytes = new Uint8Array(32);
  crypto.getRandomValues(privateKeyBytes);
  
  const privateKeyHex = Array.from(privateKeyBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const publicKeyHex = getPublicKey(privateKeyHex as any);
  
  return {
    privateKey: privateKeyHex,
    publicKey: publicKeyHex
  };
}
```

---

### 2. Angebot erstellen (Kind 42 Event)

```typescript
// src/lib/nostr/marketplace.ts
export async function createOffer(
  offerText: string,
  tempKeypair: { privateKey: string; publicKey: string },
  relay: string,
  channelId: string
): Promise<string> {
  const event = {
    kind: 42,
    pubkey: tempKeypair.publicKey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['e', channelId, relay, 'root']
    ],
    content: offerText,
  };
  
  const signedEvent = finalizeEvent(event, tempKeypair.privateKey as any);
  
  // Publiziere auf Relay
  const pool = new SimplePool();
  await pool.publish([relay], signedEvent);
  
  return signedEvent.id;
}
```

---

### 3. Interesse senden (NIP-17 Gift-Wrapped)

```typescript
// src/lib/nostr/nip17.ts
import { nip44 } from 'nostr-tools';

export async function sendInterest(
  userPrivateKey: string,
  userPublicKey: string,
  tempOfferPubkey: string,
  userName: string,
  message: string,
  relay: string
): Promise<void> {
  // 1. Erstelle Sealed Sender (Kind 14)
  const sealedContent = JSON.stringify({
    type: 'interest',
    user_pubkey: userPublicKey,
    user_name: userName,
    message: message
  });
  
  const sealedEvent = {
    kind: 14,
    pubkey: userPublicKey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: sealedContent,
  };
  
  const signedSealed = finalizeEvent(sealedEvent, userPrivateKey as any);
  
  // 2. Verschlüssele Sealed Sender für temp_pubkey (NIP-44)
  const sharedSecret = nip44.getSharedSecret(userPrivateKey, tempOfferPubkey);
  const encryptedSealed = nip44.encrypt(JSON.stringify(signedSealed), sharedSecret);
  
  // 3. Generiere ephemeral Keypair (nur für diese Nachricht)
  const ephemeralKeypair = generateTempKeypair();
  
  // 4. Erstelle Gift Wrap (Kind 1059)
  const giftWrap = {
    kind: 1059,
    pubkey: ephemeralKeypair.publicKey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['p', tempOfferPubkey]
    ],
    content: encryptedSealed,
  };
  
  const signedGiftWrap = finalizeEvent(giftWrap, ephemeralKeypair.privateKey as any);
  
  // 5. Publiziere Gift Wrap
  const pool = new SimplePool();
  await pool.publish([relay], signedGiftWrap);
  
  // 6. Verwerfe ephemeral Keypair (nur einmalig verwendet!)
  // (automatisch durch Scope-Ende)
}
```

---

### 4. Interessen laden (nur für Angebots-Ersteller)

```typescript
// src/lib/nostr/nip17.ts
export async function loadInterests(
  tempPrivateKey: string,
  tempPublicKey: string,
  relay: string
): Promise<Array<{ user_pubkey: string; user_name: string; message: string }>> {
  const pool = new SimplePool();
  
  // Filter: Alle Kind 1059 Events an temp_pubkey
  const filter = {
    kinds: [1059],
    '#p': [tempPublicKey],
    limit: 100
  };
  
  const events = await pool.querySync([relay], filter);
  const interests: any[] = [];
  
  for (const giftWrap of events) {
    try {
      // 1. Entschlüssele Gift Wrap mit temp_privkey
      const ephemeralPubkey = giftWrap.pubkey;
      const sharedSecret = nip44.getSharedSecret(tempPrivateKey, ephemeralPubkey);
      const decryptedSealed = nip44.decrypt(giftWrap.content, sharedSecret);
      
      // 2. Parse Sealed Sender (Kind 14)
      const sealedEvent = JSON.parse(decryptedSealed);
      
      // 3. Verifiziere Signatur
      if (!verifySignature(sealedEvent)) {
        console.warn('Ungültige Signatur, ignoriere Event');
        continue;
      }
      
      // 4. Parse Content
      const interestData = JSON.parse(sealedEvent.content);
      
      if (interestData.type === 'interest') {
        interests.push({
          user_pubkey: interestData.user_pubkey,
          user_name: interestData.user_name,
          message: interestData.message || ''
        });
      }
    } catch (e) {
      console.warn('Fehler beim Entschlüsseln:', e);
    }
  }
  
  return interests;
}
```

---

### 5. Angebot löschen (Kind 5)

```typescript
// src/lib/nostr/marketplace.ts
export async function deleteOffer(
  offerId: string,
  tempPrivateKey: string,
  tempPublicKey: string,
  relay: string
): Promise<void> {
  const deletionEvent = {
    kind: 5,
    pubkey: tempPublicKey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['e', offerId]
    ],
    content: 'Angebot vom Ersteller gelöscht',
  };
  
  const signedDeletion = finalizeEvent(deletionEvent, tempPrivateKey as any);
  
  // Publiziere Deletion Event
  const pool = new SimplePool();
  await pool.publish([relay], signedDeletion);
  
  // Lösche temp_keypair aus localStorage
  localStorage.removeItem('marketplace_temp_keypair');
}
```

---

## 📊 Entscheidungen & Konfiguration

### 1. Nur 1 Angebot pro Gruppe

**✅ ENTSCHIEDEN:** Nur 1 aktives Angebot global pro Gruppe

**Begründung:**
- Einfacher Einstieg
- Fokussiert auf ein Angebot zur Zeit
- Später erweiterbar auf mehrere Angebote

---

### 2. Temp-Keypair Recovery

**✅ ENTSCHIEDEN:** Verschlüsselte Backup-Speicherung mit echtem NSEC

**Implementierung:**
```typescript
// Beim Erstellen des Angebots:
// 1. Generiere temp_keypair
const tempKeypair = generateTempKeypair();

// 2. Verschlüssele temp_keypair mit User's eigenem NSEC (NIP-44)
const sharedSecret = nip44.getSharedSecret(userPrivateKey, userPublicKey);
const encryptedTempKey = nip44.encrypt(
  JSON.stringify(tempKeypair),
  sharedSecret
);

// 3. Speichere verschlüsselt UND unverschlüsselt
localStorage.setItem('marketplace_temp_keypair', JSON.stringify(tempKeypair)); // Schneller Zugriff
localStorage.setItem('marketplace_temp_keypair_encrypted', encryptedTempKey); // Backup für Recovery

// Bei Browser-Cache-Verlust oder neuem Gerät:
// 1. User meldet sich mit NSEC an
// 2. App versucht Recovery aus encrypted backup
const encrypted = localStorage.getItem('marketplace_temp_keypair_encrypted');
if (encrypted && !localStorage.getItem('marketplace_temp_keypair')) {
  const sharedSecret = nip44.getSharedSecret(userPrivateKey, userPublicKey);
  const decrypted = nip44.decrypt(encrypted, sharedSecret);
  const recoveredKeypair = JSON.parse(decrypted);
  localStorage.setItem('marketplace_temp_keypair', JSON.stringify(recoveredKeypair));
  console.log('✅ Temp-Keypair wiederhergestellt!');
}
```

**Vorteile:**
- ✅ User kann Angebot auch nach Cache-Löschung verwalten
- ✅ Beim Gerätewechsel: Mit gleichem NSEC anmelden → Keypair wird wiederhergestellt
- ✅ Sicher: Nur User mit seinem NSEC kann entschlüsseln

---

### 3. NIP-17 Library

**✅ ENTSCHIEDEN:** `@nostr-dev-kit/ndk` verwenden

**Begründung:**
- ✅ Bewährte Library mit vollständigem NIP-17 Support
- ✅ Aktiv gewartet und getestet
- ✅ Einfachere API als manuelle Implementierung
- ✅ Sicherheitsgeprüft von der Community

**Installation:**
```bash
npm install @nostr-dev-kit/ndk
```

**Beispiel-Nutzung:**
```typescript
import NDK, { NDKPrivateKeySigner, NDKEvent } from '@nostr-dev-kit/ndk';

// NIP-17 Nachricht senden (Gift-Wrapped)
const ndk = new NDK({ explicitRelayUrls: [relay] });
await ndk.connect();

const signer = new NDKPrivateKeySigner(userPrivateKey);
ndk.signer = signer;

// NDK macht Gift-Wrapping automatisch
const dm = new NDKEvent(ndk);
dm.kind = 14; // Sealed sender
dm.content = JSON.stringify({
  type: 'interest',
  user_pubkey: userPublicKey,
  user_name: userName,
  message: message
});
dm.tags = [['p', tempOfferPubkey]];

await dm.publish(); // NDK wrapped automatisch in Kind 1059
```

---

### 4. Auto-Expire für Angebote

**✅ ENTSCHIEDEN:** Automatisches Löschen nach 72 Stunden (3 Tage)

**Implementierung:**
```typescript
// Beim Erstellen des Angebots:
const expiresAt = Math.floor(Date.now() / 1000) + (72 * 60 * 60); // +72h

const event = {
  kind: 42,
  pubkey: tempKeypair.publicKey,
  created_at: Math.floor(Date.now() / 1000),
  tags: [
    ['e', channelId, relay, 'root'],
    ['expiration', expiresAt.toString()] // NIP-40 Expiration
  ],
  content: offerText,
};

// Beim Laden von Angeboten filtern:
function isOfferExpired(event: NostrEvent): boolean {
  const expirationTag = event.tags.find(t => t[0] === 'expiration');
  if (!expirationTag) return false;
  
  const expiresAt = parseInt(expirationTag[1]);
  const now = Math.floor(Date.now() / 1000);
  
  return now > expiresAt;
}

// In der UI nur nicht-abgelaufene Angebote anzeigen
const activeOffers = allOffers.filter(offer => !isOfferExpired(offer));
```

**Zusätzlich: Countdown in UI**
```svelte
<script>
  function getTimeRemaining(expiresAt: number): string {
    const now = Math.floor(Date.now() / 1000);
    const remaining = expiresAt - now;
    
    if (remaining <= 0) return 'Abgelaufen';
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Noch ${days} Tag${days > 1 ? 'e' : ''}`;
    }
    
    return `Noch ${hours}h ${minutes}m`;
  }
</script>

<div class="offer-expiry">
  ⏰ {getTimeRemaining(offerExpiresAt)}
</div>
```

**Vorteile:**
- ✅ Alte Angebote werden automatisch aufgeräumt
- ✅ User sieht Countdown (Dringlichkeit)
- ✅ Nach 72h wird Angebot ausgeblendet (auch ohne manuelle Löschung)
- ✅ Relays können Events mit `expiration` Tag selbst löschen (NIP-40)

---

### 5. Interesse-Counter ohne Entschlüsselung

**Lösung:** Zähle Kind 1059 Events mit `#p = temp_pubkey`

```typescript
const filter = {
  kinds: [1059],
  '#p': [tempPublicKey],
  limit: 100
};
const events = await pool.querySync([relay], filter);
const count = events.length; // ← Interesse-Counter
```

**Vorteil:** Kein Entschlüsseln nötig, nur Zählen

---

## ✅ Implementierungs-Schritte

### Phase 1: Grundfunktionen
1. **Temporäres Keypair:** Generator + localStorage-Speicherung
2. **Angebot erstellen:** Kind 42 Event + UI-Formular
3. **Angebot anzeigen:** Liste mit allen Angeboten
4. **Angebot löschen:** Kind 5 Event + Bestätigung

### Phase 2: NIP-17 Interesse
5. **NIP-17 Library:** Gift-Wrapping Funktionen implementieren
6. **Interesse senden:** Button + NIP-17 verschlüsselte Nachricht
7. **Interesse laden:** Nur für Angebots-Ersteller entschlüsseln
8. **Interesse-Liste UI:** Modal mit allen Interessenten

### Phase 3: Interesse-Verwaltung
9. **Interesse zurückziehen:** NIP-17 Withdraw-Message
10. **Interesse-Counter:** Anzahl anzeigen (ohne Entschlüsselung)
11. **Auto-Reload:** Polling für neue Interessen

### Phase 4: Deal-Room (später)
12. **Deal-Room erstellen:** Admin wählt User aus Liste
13. **Privater Chat:** NIP-17 verschlüsselte 1-zu-1 Kommunikation
14. **Deal-Abschluss:** Optional: Deal als abgeschlossen markieren

---

## 📝 Zusammenfassung

**Was haben wir?**
- ✅ Anonyme Angebote mit temporärem Keypair
- ✅ NIP-17 verschlüsselte Interesse-Bekundungen
- ✅ Privatsphäre auf höchstem Niveau (Gift-Wrapping)
- ✅ Nur Angebots-Ersteller sieht Interessenten
- ✅ Vollständige Kontrolle über eigenes Angebot

**Nächste Schritte:**
1. Review dieser Dokumentation
2. Offene Fragen klären
3. Implementierung starten (Phase 1)
4. Testen & Iterieren

**Bereit für Implementation?** 🚀
