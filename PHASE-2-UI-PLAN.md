# Phase 2: UI-Anpassungen Plan

## Übersicht
Die aktuelle `group/+page.svelte` (1381 Zeilen) muss für den neuen Workflow angepasst werden.

## Aktuelle Probleme
1. **localStorage-Abhängigkeit**: `marketplace_temp_keypair` wird in localStorage gespeichert
2. **Sofortige DMs**: Bei Interesse wird sofort eine NIP-17 DM gesendet
3. **Keine Secret-Anzeige**: User sieht sein Angebots-Secret nicht
4. **Keine Interessenten-Liste**: Anbieter sieht keine verschlüsselten Signale
5. **Keine Auswahl-Funktion**: Anbieter kann nicht aus Interessenten wählen

## Benötigte Änderungen

### 1. Secret-Management statt localStorage (Zeilen 35-60)
**Aktuell:**
```typescript
let tempKeypair: { privateKey: string; publicKey: string } | null = null;
loadTempKeypairFromStorage();
saveTempKeypairToStorage();
```

**Neu:**
```typescript
let offerSecret: string | null = null;
let offerKeypair: { privateKey: string; publicKey: string } | null = null;
let showSecretBackup = false;

// Beim Angebot erstellen:
import { generateOfferSecret, deriveKeypairFromSecret } from '$lib/nostr/offerSecret';
offerSecret = generateOfferSecret();
offerKeypair = deriveKeypairFromSecret(offerSecret);

// Secret-Anzeige Modal mit Backup-Funktion
```

### 2. Interesse-Signal statt sofortige DM (Zeilen 356-409)
**Aktuell:**
```typescript
async function handleSendInterest() {
  // Sendet sofort NIP-17 DM
  await sendDirectMessage(...);
}
```

**Neu:**
```typescript
async function handleSendInterest() {
  // Sendet verschlüsseltes Interesse-Signal
  import { sendInterestSignal } from '$lib/nostr/interestSignal';
  await sendInterestSignal(
    offerId,
    offerPublicKey,
    message,
    userName,
    userPrivateKey,
    relay
  );
}
```

### 3. Interessenten-Liste laden (Zeilen 411-443)
**Aktuell:**
```typescript
async function openInterestList(offer: Offer) {
  // Lädt NIP-17 DMs
  const dealRequests = await loadDealRequests(...);
}
```

**Neu:**
```typescript
async function openInterestList(offer: Offer) {
  // Lädt verschlüsselte Interesse-Signale
  import { loadInterestSignals } from '$lib/nostr/interestSignal';
  const signals = await loadInterestSignals(
    offer.id,
    offerKeypair.privateKey,
    relay
  );
  
  // Zeige Interessenten-Liste mit Auswahl-Buttons
  interests = signals;
  showInterestList = true;
}
```

### 4. Partner-Auswahl mit Absagen (Zeilen 498-571)
**Aktuell:**
```typescript
async function handleSelectPartner(event) {
  // Erstellt sofort Deal-Room
  await createDealRoom(...);
}
```

**Neu:**
```typescript
async function handleSelectPartner(event) {
  const selectedInterest = event.detail;
  
  // 1. Wähle Partner aus und sende Absagen an alle anderen
  import { selectPartner } from '$lib/nostr/offerSelection';
  const result = await selectPartner(
    offerKeypair,
    selectedInterest.interestedPubkey,
    interests,
    offer.id,
    offer.content,
    relay
  );
  
  // 2. Starte DM mit ausgewähltem Partner
  import { sendDirectMessage } from '$lib/nostr/nip17';
  await sendDirectMessage(
    userPrivateKey,
    selectedInterest.interestedPubkey,
    "Deal-Anfrage akzeptiert!",
    relay
  );
  
  // 3. Lösche Angebot
  await deleteOffer(offer.id);
}
```

### 5. Re-Login mit Secret
**Neu hinzufügen:**
```typescript
let showSecretLogin = false;
let secretInput = '';

async function loginWithSecret() {
  import { validateOfferSecret, deriveKeypairFromSecret } from '$lib/nostr/offerSecret';
  
  if (!validateOfferSecret(secretInput)) {
    alert('Ungültiges Secret!');
    return;
  }
  
  offerSecret = secretInput;
  offerKeypair = deriveKeypairFromSecret(secretInput);
  
  // Lade Angebote neu
  await loadAllOffers();
  
  showSecretLogin = false;
}
```

### 6. 24h Expiration anzeigen
**Neu hinzufügen:**
```typescript
import { getRemainingTime, formatRemainingTime } from '$lib/nostr/offerExpiration';

// In Offer-Card:
{#if offer.isOwnOffer}
  <span class="expiration-time">
    ⏰ {formatRemainingTime(getRemainingTime(offer.event))}
  </span>
{/if}
```

## UI-Komponenten die angepasst werden müssen

### 1. Offer-Form (Zeilen 623-648)
- Secret-Anzeige nach Erstellung
- Backup-Button
- Warnung: "Speichere dein Secret!"

### 2. Offer-Card (Zeilen 674-737)
- Expiration-Zeit anzeigen
- Interessenten-Count (verschlüsselt)
- "Interessenten anzeigen" Button

### 3. Interest-Modal (InterestModal.svelte)
- Keine Änderung nötig (sendet nur Signal statt DM)

### 4. Interest-List (InterestList.svelte)
- Auswahl-Buttons für jeden Interessenten
- "Auswählen" Button → sendet Absagen an andere
- Bestätigungs-Dialog

### 5. Secret-Backup Modal (NEU)
```svelte
<SecretBackupModal
  bind:show={showSecretBackup}
  secret={offerSecret}
  offerTitle={offerInput}
/>
```

### 6. Secret-Login Modal (NEU)
```svelte
<SecretLoginModal
  bind:show={showSecretLogin}
  on:login={loginWithSecret}
/>
```

## Reihenfolge der Implementierung

1. ✅ Phase 1 abgeschlossen (alle 4 Module erstellt)
2. 🔄 Secret-Management in createOffer() integrieren
3. 🔄 Secret-Anzeige Modal erstellen
4. 🔄 Interesse-Signal statt DM senden
5. 🔄 Interessenten-Liste mit verschlüsselten Signalen
6. 🔄 Partner-Auswahl mit Absage-Funktion
7. 🔄 Re-Login mit Secret
8. 🔄 Expiration-Anzeige

## Geschätzte Zeilen-Änderungen
- Entfernen: ~100 Zeilen (localStorage-Code)
- Ändern: ~200 Zeilen (Funktionen anpassen)
- Hinzufügen: ~150 Zeilen (neue Modals, Secret-Management)
- **Gesamt: ~450 Zeilen Änderungen**

## Nächster Schritt
Beginne mit Secret-Management in `createOffer()` Funktion (Zeile 269).