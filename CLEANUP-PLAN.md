# 🧹 Projekt-Aufräum-Plan

**Datum:** 5. November 2025  
**Ziel:** Projekt bereinigen, Dokumentation aktualisieren, ungenutzten Code entfernen

---

## 📊 Übersicht der Aufgaben

### **Teil 1: Deal-Room vereinfachen** (Priorität: HOCH)
- [ ] 1.1 NIP-17 Chat-System entfernen
- [ ] 1.2 Deal-Room auf Anzeige reduzieren ("Deal mit User X")
- [ ] 1.3 Deal-Status auf Relay speichern (öffentlich)
- [ ] 1.4 UI anpassen (nur Anzeige, kein Chat)
- [ ] 1.5 Tests erstellen

### **Teil 2: Code-Audit & Cleanup** (Priorität: HOCH)
- [ ] 2.1 Ungenutzte Dateien identifizieren
- [ ] 2.2 Ungenutzte Funktionen identifizieren
- [ ] 2.3 Alte Kommentare entfernen
- [ ] 2.4 Code bereinigen

### **Teil 3: Dokumentation aktualisieren** (Priorität: MITTEL)
- [ ] 3.1 README.md aktualisieren
- [ ] 3.2 RELAY-OPERATIONS.md überarbeiten
- [ ] 3.3 Alte Docs archivieren/löschen
- [ ] 3.4 Neue Test-Docs erstellen

---

## 🎯 Teil 1: Deal-Room vereinfachen

### **1.1 NIP-17 Chat-System entfernen**

**Zu entfernende Dateien:**
- `src/lib/nostr/nip17.ts` (komplett)
- `src/lib/components/InterestModal.svelte` (komplett)
- `src/lib/components/InterestList.svelte` (komplett)

**Zu entfernende Funktionen aus anderen Dateien:**
- `src/routes/(app)/group/+page.svelte`:
  - `loadMyInterests()`
  - `openInterestList()`
  - `handleShowInterestList`
  - Alle NIP-17 Imports
  - Interest-Modal und Interest-List Komponenten

**Zu entfernende State-Variablen:**
- `interests: Interest[]`
- `interestCounts: Record<string, number>`
- `myInterestOfferIds: Set<string>`
- `showInterestModal`
- `showInterestList`

---

### **1.2 Deal-Status auf Relay speichern**

**Neues Event-Format (Kind 30081):**
```typescript
{
  kind: 30081,  // Deal-Status Event
  content: "",
  tags: [
    ['d', `deal-${offerId}`],           // Eindeutige Deal-ID
    ['e', offerId, '', 'reply'],        // Referenz zum Angebot
    ['p', buyerPubkey],                  // Käufer
    ['p', sellerPubkey],                 // Verkäufer (Angebotsgeber)
    ['t', 'bitcoin-deal'],
    ['status', 'active'],                // Status: active, completed, cancelled
    ['created_at', timestamp]
  ]
}
```

**Neue Funktionen (src/lib/nostr/dealStatus.ts):**
```typescript
// Deal erstellen
export async function createDeal(
  offerId: string,
  buyerPubkey: string,
  sellerPubkey: string,
  sellerPrivateKey: string,
  relay: string
): Promise<string>

// Deal laden
export async function loadDeal(
  offerId: string,
  relay: string
): Promise<Deal | null>

// Meine Deals laden
export async function loadMyDeals(
  userPubkey: string,
  relay: string
): Promise<Deal[]>
```

---

### **1.3 UI anpassen**

**Angebotsgeber-Sicht:**
```
┌─────────────────────────────────────┐
│ Dein Angebot: "100€ gegen BTC"      │
│                                     │
│ Interessenten (3):                  │
│ • User A (npub1abc...)              │
│ • User B (npub1def...)              │
│ • User C (npub1ghi...)              │
│                                     │
│ [User auswählen]                    │
└─────────────────────────────────────┘
```

**Nach Auswahl:**
```
┌─────────────────────────────────────┐
│ ✅ Deal gestartet mit:              │
│ User B (npub1def...)                │
│                                     │
│ Status: Aktiv                       │
│ Gestartet: 5. Nov, 14:30            │
│                                     │
│ [Deal abschließen] [Abbrechen]      │
└─────────────────────────────────────┘
```

**Interessent-Sicht (vor Auswahl):**
```
┌─────────────────────────────────────┐
│ Interesse gezeigt für:              │
│ "100€ gegen BTC"                    │
│                                     │
│ ⏳ Warte auf Anbieter...            │
└─────────────────────────────────────┘
```

**Interessent-Sicht (ausgewählt):**
```
┌─────────────────────────────────────┐
│ ✅ Du wurdest ausgewählt!           │
│ Deal mit: User X (npub1xyz...)      │
│                                     │
│ Status: Aktiv                       │
│                                     │
│ [Deal abschließen] [Abbrechen]      │
└─────────────────────────────────────┘
```

**Interessent-Sicht (nicht ausgewählt):**
```
┌─────────────────────────────────────┐
│ ❌ Leider nicht ausgewählt          │
│ Angebot wurde vergeben.             │
└─────────────────────────────────────┘
```

---

### **1.4 Implementierungs-Schritte**

**Schritt 1.1:** Neue Datei erstellen
- [ ] `src/lib/nostr/dealStatus.ts` erstellen

**Schritt 1.2:** Alte Dateien entfernen
- [ ] `src/lib/nostr/nip17.ts` löschen
- [ ] `src/lib/components/InterestModal.svelte` löschen
- [ ] `src/lib/components/InterestList.svelte` löschen

**Schritt 1.3:** UI-Komponenten neu erstellen
- [ ] `src/lib/components/DealStatusCard.svelte` erstellen
- [ ] `src/lib/components/InterestListSimple.svelte` erstellen

**Schritt 1.4:** Hauptseite anpassen
- [ ] `src/routes/(app)/group/+page.svelte` überarbeiten
- [ ] Alte Funktionen entfernen
- [ ] Neue Deal-Status-Logik einbauen

---

## 🎯 Teil 2: Code-Audit & Cleanup

### **2.1 Datei-Audit**

**Zu prüfende Verzeichnisse:**
- `src/lib/nostr/` - Alle Nostr-Funktionen
- `src/lib/components/` - Alle Komponenten
- `src/lib/stores/` - Alle Stores
- `src/routes/` - Alle Routen
- `archive/` - Alte Dokumentation

**Potenziell ungenutzte Dateien:**
- [ ] `src/lib/nostr/nip17.ts` (wird entfernt in Teil 1)
- [ ] `src/lib/components/InterestModal.svelte` (wird entfernt in Teil 1)
- [ ] `src/lib/components/InterestList.svelte` (wird entfernt in Teil 1)
- [ ] `src/routes/(app)/deal/[dealId]/+page.svelte` (Deal-Room Route - prüfen!)
- [ ] `src/routes/debug-secret/+page.svelte` (Debug-Seite - behalten oder löschen?)

**Dateien im archive/ Verzeichnis:**
- [ ] Prüfen ob noch relevant
- [ ] Ggf. löschen oder in Haupt-Docs integrieren

---

### **2.2 Funktions-Audit**

**Zu prüfende Dateien:**

1. **src/lib/nostr/client.ts**
   - [ ] Alle Funktionen dokumentiert?
   - [ ] Ungenutzte Funktionen?
   - [ ] Alte Kommentare entfernen

2. **src/lib/nostr/crypto.ts**
   - [ ] Temp-Keypair-Funktionen (werden genutzt)
   - [ ] NIP-44 Funktionen (werden genutzt?)
   - [ ] Alte verschlüsselungs-Funktionen?

3. **src/lib/nostr/marketplace.ts**
   - [ ] createOffer - OK
   - [ ] deleteOffer - OK
   - [ ] loadOffers - OK
   - [ ] Alte Funktionen?

4. **src/lib/nostr/groupConfig.ts**
   - [ ] Whitelist-Funktionen - OK
   - [ ] Admin-Funktionen - OK
   - [ ] Alte Funktionen?

---

### **2.3 Kommentar-Cleanup**

**Zu entfernende Kommentare:**
- [ ] Alle "Kein localStorage mehr" Kommentare aktualisieren
- [ ] Alte TODO-Kommentare entfernen
- [ ] Debug-Console-Logs reduzieren
- [ ] Auskommentierter Code entfernen

**Beispiele:**
```typescript
// ❌ ZU ENTFERNEN:
// Kein localStorage mehr: temp_keypair wird nicht persistent gespeichert.

// ✅ BEHALTEN (falls relevant):
// Generiere temporäres Keypair für Marketplace-Anonymität
```

---

## 🎯 Teil 3: Dokumentation aktualisieren

### **3.1 README.md überarbeiten**

**Zu aktualisieren:**
- [ ] Feature-Liste (kein NIP-17 Chat mehr)
- [ ] Workflow-Beschreibung (neues Deal-System)
- [ ] Screenshots/Beispiele
- [ ] Installation & Setup

---

### **3.2 RELAY-OPERATIONS.md überarbeiten**

**Zu aktualisieren:**
- [ ] Event-Übersicht (Kind 30081 hinzufügen, NIP-17 entfernen)
- [ ] Workflow-Diagramme
- [ ] Beispiel-Events

---

### **3.3 Alte Docs bereinigen**

**Zu prüfende Dateien:**
- [ ] `LOCALSTORAGE-AUDIT.md` - Noch relevant? Aktualisieren!
- [ ] `TEST-GRUPPE-ERSTELLEN.md` - Aktualisieren
- [ ] `NEUER-WORKFLOW-ANALYSE.md` - Archivieren oder löschen
- [ ] `archive/old-docs/*` - Löschen oder behalten?

---

### **3.4 Neue Test-Docs erstellen**

**Neue Dateien:**
- [ ] `TEST-ANGEBOT-ERSTELLEN.md` - Angebot erstellen & löschen
- [ ] `TEST-DEAL-ABLAUF.md` - Interesse zeigen → Deal starten
- [ ] `TEST-WHITELIST.md` - Whitelist verwalten

---

## 📋 Implementierungs-Reihenfolge

### **Sprint 1: Deal-Room vereinfachen** (2-3 Stunden)
1. ✅ Plan erstellen (dieser Dokument)
2. ⏳ `dealStatus.ts` implementieren
3. ⏳ Alte NIP-17 Dateien entfernen
4. ⏳ UI-Komponenten neu erstellen
5. ⏳ Hauptseite anpassen
6. ⏳ Testen

### **Sprint 2: Code bereinigen** (1-2 Stunden)
1. ⏳ Datei-Audit durchführen
2. ⏳ Ungenutzte Dateien löschen
3. ⏳ Funktions-Audit durchführen
4. ⏳ Ungenutzte Funktionen entfernen
5. ⏳ Kommentare bereinigen

### **Sprint 3: Dokumentation** (1-2 Stunden)
1. ⏳ README.md aktualisieren
2. ⏳ RELAY-OPERATIONS.md überarbeiten
3. ⏳ Alte Docs bereinigen
4. ⏳ Neue Test-Docs erstellen

---

## ✅ Erfolgskriterien

Nach Abschluss soll das Projekt:
- ✅ **Einfacher Deal-Flow** haben (ohne Chat)
- ✅ **Keine ungenutzten Dateien** enthalten
- ✅ **Keine ungenutzten Funktionen** enthalten
- ✅ **Saubere, aktuelle Dokumentation** haben
- ✅ **Alle Tests funktionieren**

---

## 🚀 Nächster Schritt

**Frage an dich:**
Soll ich mit **Sprint 1 (Deal-Room vereinfachen)** beginnen?

Wenn ja, starte ich mit:
1. `src/lib/nostr/dealStatus.ts` erstellen
2. Funktionen implementieren
3. Tests schreiben

**Dein Feedback bitte!** 👍
