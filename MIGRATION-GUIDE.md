# Migration Guide: Alter vs. Neuer Workflow

## Übersicht

Dieses Dokument beschreibt die Migration vom alten localStorage-basierten System zum neuen Secret-basierten Interesse-Signal-System.

## 🔄 Funktions-Mapping

### Marketplace-Funktionen

#### ❌ ALT (Deprecated in client.ts):
```typescript
// Diese Funktionen werden NICHT mehr verwendet:
createMarketplaceOffer()     // → Ersetzt durch marketplace.ts
fetchMarketplaceOffers()     // → Ersetzt durch marketplace.ts
sendOfferInterest()          // → Ersetzt durch interestSignal.ts
fetchOfferInterests()        // → Ersetzt durch interestSignal.ts
```

#### ✅ NEU:
```typescript
// marketplace.ts
createOffer()                // Erstellt Angebot mit Expiration
loadOffers()                 // Lädt Angebote mit Expiration-Check
deleteOffer()                // Löscht Angebot (NIP-09)

// interestSignal.ts
sendInterestSignal()         // Verschlüsseltes Signal (NIP-04)
loadInterestSignals()        // Nur Anbieter kann entschlüsseln
countInterestSignals()       // Zählt Signale
deleteInterestSignal()       // Löscht Signal

// offerSelection.ts
selectPartner()              // Wählt Partner + sendet Absagen
sendRejectionMessage()       // Sendet Absage (NIP-04)
rejectAllInterests()         // Absagen an alle

// offerSecret.ts
generateOfferSecret()        // Generiert 64 Hex Secret
deriveKeypairFromSecret()    // Deterministisches Keypair
validateOfferSecret()        // Validiert Secret-Format
```

### Deal-Room-Funktionen

#### ⚠️ TEILWEISE ERSETZT (client.ts):
```typescript
// Diese Funktionen bleiben, aber mit neuer Signatur:
createDealRoom()             // Alte Version in client.ts (deprecated)
fetchDealRooms()             // Alte Version in client.ts (deprecated)
sendDealMessage()            // Bleibt (NIP-17)
fetchDealMessages()          // Bleibt (NIP-17)
```

#### ✅ NEU (nip17.ts):
```typescript
createDealRoom()             // Neue Version mit vereinfachter Signatur
loadDealRequests()           // Lädt NIP-17 DMs
sendDirectMessage()          // Sendet NIP-17 DM
```

## 📊 Store-Änderungen

### groupStore.ts

#### ❌ Zu entfernen:
```typescript
// Diese Funktionen verwenden alte client.ts Funktionen:
loadMarketplace()            // Verwendet fetchMarketplaceOffers
createOffer()                // Verwendet createMarketplaceOffer
sendInterest()               // Verwendet sendOfferInterest
```

#### ✅ Ersetzt durch:
- Direkte Verwendung der neuen Module in Komponenten
- `groupStore` behält nur: `relay`, `channelId`, `secret`, `secretHash`

### dealStore.ts

#### ⚠️ Zu prüfen:
```typescript
// Diese Funktionen verwenden alte client.ts Funktionen:
loadDealRooms()              // Verwendet fetchDealRooms (alt)
createDealRoom()             // Verwendet createDealRoom (alt)
```

#### ✅ Sollte verwenden:
- Neue `createDealRoom()` aus nip17.ts
- Deal-Rooms werden jetzt direkt in Komponenten verwaltet

## 🗑️ Zu entfernende Funktionen

### In client.ts (Zeilen 166-353):
```typescript
// DEPRECATED - Nicht mehr verwenden:
export async function createMarketplaceOffer()    // Zeile 166
export async function fetchMarketplaceOffers()    // Zeile 201
export async function sendOfferInterest()         // Zeile 245
export async function fetchOfferInterests()       // Zeile 298
export async function createDealRoom()            // Zeile 382 (alte Version)
export async function fetchDealRooms()            // Zeile 441 (alte Version)
```

### In groupStore.ts:
```typescript
// DEPRECATED - Nicht mehr verwenden:
loadMarketplace()
createOffer()
sendInterest()
```

## 🔐 Sicherheits-Verbesserungen

### Alt (Unsicher):
- ❌ Keypairs in localStorage
- ❌ Öffentliche Interessenten-Liste
- ❌ Mehrere parallele DM-Threads
- ❌ Keine automatische Löschung

### Neu (Sicher):
- ✅ Secret-basiertes System (kein localStorage)
- ✅ Verschlüsselte Interesse-Signale (NIP-04)
- ✅ Nur Anbieter sieht Interessenten
- ✅ Anbieter wählt EINEN Partner aus
- ✅ Automatische Absagen an andere
- ✅ 24h Auto-Delete (NIP-40)

## 📝 Migrations-Schritte

### Für Entwickler:

1. **Phase 1: Neue Module verwenden**
   - ✅ Importiere aus `marketplace.ts`, `interestSignal.ts`, `offerSelection.ts`
   - ✅ Verwende neue Funktions-Signaturen

2. **Phase 2: Alte Funktionen entfernen**
   - ⏳ Markiere alte Funktionen als `@deprecated`
   - ⏳ Entferne Aufrufe aus `groupStore.ts`
   - ⏳ Entferne Aufrufe aus `dealStore.ts`

3. **Phase 3: Cleanup**
   - ⏳ Lösche deprecated Funktionen aus `client.ts`
   - ⏳ Aktualisiere Dokumentation
   - ⏳ Teste alle Flows

### Für User:

1. **Bestehende Angebote:**
   - ⚠️ Alte Angebote (mit localStorage) funktionieren nicht mehr
   - ✅ Neue Angebote verwenden Secret-System

2. **Migration:**
   - ❌ Keine automatische Migration möglich
   - ✅ User muss neue Angebote mit Secret erstellen

## 🎯 Vorteile des neuen Systems

1. **Privatsphäre:** Nur Anbieter sieht Interessenten
2. **Effizienz:** Nur EINE DM wird erstellt
3. **Kontrolle:** Anbieter wählt Partner aus
4. **Sicherheit:** Alles verschlüsselt (NIP-04)
5. **Portabilität:** Secret kann extern gespeichert werden
6. **Auto-Cleanup:** Angebote löschen sich nach 24h

## 📚 Weitere Dokumentation

- [`NEUER-WORKFLOW-ANALYSE.md`](NEUER-WORKFLOW-ANALYSE.md) - Detaillierte Workflow-Beschreibung
- [`PROJEKT-ANALYSE.md`](PROJEKT-ANALYSE.md) - Projekt-Struktur
- [`PHASE-2-UI-PLAN.md`](PHASE-2-UI-PLAN.md) - UI-Implementierung