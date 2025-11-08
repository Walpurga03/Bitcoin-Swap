# 🧪 Test-Checkliste: Deal-Room Simplification

## ⚠️ WICHTIG: Vorbereitung für Tests
- **Neues Secret verwenden** (z.B. `neues-secret-2024`) für sauberen Test
- **Channel-ID in test-relay-query.js anpassen** nach Gruppen-Erstellung
- **Verschiedene Browser** für Multi-User Tests (Chrome, Firefox, Incognito)
- Optional: LocalStorage löschen für Reset (F12 → Application → Clear Storage)

---

## Test 1: Gruppe erstellen (Admin) ✅ GETESTET

### Schritte:
1. Browser öffnen → `/admin`
2. **nsec eingeben** (z.B. `nsec1abc...`) → "Mit nsec anmelden"
3. Admin wird eingeloggt → **npub wird angezeigt**
4. **Gruppen-Secret eingeben** (z.B. `neues-secret-2024`)
5. Relay eingeben: `wss://nostr-relay.online`
6. Button: "Gruppe erstellen"
7. **Link kopieren** (z.B. `http://localhost:5173/?secret=neues-secret-2024&relay=wss://nostr-relay.online`)

### Erwartetes Verhalten:
- ✅ **Admin wird erkannt** (npub angezeigt)
- ✅ Meldung: "Gruppe erfolgreich erstellt!"
- ✅ Link wird generiert und angezeigt
- ✅ **Channel-ID in test-relay-query.js anpassen** (siehe unten)

### Relay-Query Ergebnis (nach Test 1):
```bash
# 1. Channel-ID aus Admin-Seite kopieren (wird nach Gruppen-Erstellung angezeigt)
# 2. In test-relay-query.js einfügen:
const CHANNEL_ID = '9d02973fde108f55fee80c31845f8a750f5eb899257ee10fe7e7d33eb7255d3a';

# 3. Query ausführen:
node test-relay-query.js

=== 🏗️ KIND 30000 EVENTS (GroupConfig & Whitelist) ===
📊 Gesamt gefunden: 1 Kind 30000 Events
✅ GroupConfigs (diese Gruppe): 1
✅ Whitelists: 0

🏗️ GroupConfig:
   ID: 07658d3d6054c1eb...
   d-Tag: bitcoin-group-config:9d02973f...
   Author: 115e2e0c50bbdf8d... (Admin-Pubkey)
   Alter: 2 Min

📊 ZUSAMMENFASSUNG:
✅ GroupConfigs: 1
✅ Whitelists: 0
📦 Marketplace-Angebote: 0
```

### Nach Test 1:
- ✅ **Mit verschiedenen Browsern getestet** (Chrome, Firefox, etc.)
- ✅ **Admin wird überall erkannt** (nach nsec-Login)
- ✅ **Gruppe persistiert auf Relay** (Kind 30000 Event vorhanden)
- **Weiter zu Test 2** (Gruppe beitreten)

---

## Test 2: Gruppe mit Link beitreten (User)

### Schritte:
1. **Neues Browser-Tab öffnen** (oder Incognito)
2. **Link einfügen** (aus Test 1 kopiert)
3. Seite lädt → sollte zu `/group` redirecten
4. Prüfen: Wird "Bitte melden Sie sich an" angezeigt?

### Erwartetes Verhalten:
- ✅ Redirect zu `/group`
- ✅ Gruppe wird automatisch initialisiert
- ⚠️ User ist NICHT eingeloggt → muss sich zuerst anmelden

---

## Test 3: Whitelist erstellen (Admin) ✅ GETESTET

### Schritte:
1. Admin-Tab: `/admin` öffnen
2. **User 1 hinzufügen:**
   - npub eingeben: `npub1...` (Alice)
   - Name: `Alice`
   - Button: "User hinzufügen"
3. **User 2 hinzufügen:**
   - npub eingeben: `npub1...` (Bob)
   - Name: `Bob`
   - Button: "User hinzufügen"
4. **Beide User auf anderen Browsern:**
   - Link einfügen (aus Test 1)
   - Mit jeweiligem nsec einloggen
   - ✅ **Login erfolgreich!**

### Relay-Query Ergebnis (nach Test 3):
```bash
node test-relay-query.js

=== 🏗️ KIND 30000 EVENTS (GroupConfig & Whitelist) ===
📊 Gesamt gefunden: 2 Kind 30000 Events
✅ GroupConfigs (diese Gruppe): 1
✅ Whitelists: 1  ← ⚠️ WICHTIG: 1 Event mit 2 Membern!

🔐 Whitelist:
   ID: 76dfdbce0431840d...
   d-Tag: whitelist-9d02973fde108f55...
   Author: 115e2e0c50bbdf8d... (Admin)
   Alter: 2 Min
   � Mitglieder: 2  ← 2 User in EINEM Event!
   👑 Admin: 115e2e0c50bbdf8d...
   
   📋 Whitelist-Mitglieder:
      1. 814f0240b8a1d2451a7a...e2d54f5a (Alice)
      2. 649e3ee629320d4b7b9f...09d00b34 (Bob)

📊 ZUSAMMENFASSUNG:
✅ GroupConfigs: 1
✅ Whitelists: 1 (mit 2 Membern)  ← Erfolg!
```

### ✅ Erfolge:
- ✅ **2 User zur Whitelist hinzugefügt**
- ✅ **Alice kann sich einloggen** (anderer Browser + nsec)
- ✅ **Bob kann sich einloggen** (anderer Browser + nsec)
- ✅ **Whitelist-System funktioniert!**
- ℹ️ Hinweis: Whitelist speichert alle Member in EINEM Kind 30000 Event (nicht pro User)

---

## Test 4: Whitelist-Eintrag löschen (Admin) - OPTIONAL ÜBERSPRINGEN

### Schritte (falls gewünscht):
1. Admin-Seite: Bei "Bob" → Button "Löschen" klicken
2. Bestätigung → Bob verschwindet aus Liste
3. Relay-Query erneut ausführen

### Erwartetes Verhalten:
- ✅ Bob nicht mehr in der Whitelist
- ✅ Whitelist-Event wird aktualisiert (nur noch Alice)
- ✅ Bob kann sich NICHT mehr einloggen (Whitelist-Check fehlschlägt)
- ⚠️ **Bob wieder hinzufügen** für weitere Tests!

### ℹ️ Hinweis:
Da die Whitelist funktioniert (Test 3 erfolgreich), kannst du diesen Test überspringen und direkt zu **Test 6** gehen (Marketplace-Angebote erstellen).

---

## Test 5: Admin ausloggen & wieder einloggen - OPTIONAL ÜBERSPRINGEN

### Schritte (falls gewünscht):
1. **LocalStorage löschen** (F12 → Application → Clear Storage)
2. Browser neu laden (F5)
3. **Wieder einloggen** mit Admin-nsec
4. `/admin` öffnen

### Erwartetes Verhalten:
- ✅ Whitelist zeigt immer noch Alice + Bob
- ✅ Gruppen-Konfiguration bleibt erhalten
- ✅ Admin-Pubkey wird korrekt erkannt

### ℹ️ Hinweis:
Da Test 1 + 3 bereits mit mehreren Browsern funktionieren, kannst du diesen Test überspringen.

---

## Test 6: User anmelden & Whitelist-Check ✅ GETESTET

### Schritte:
1. **Anderer Browser** (z.B. Firefox)
2. **Link einfügen** (aus Test 1)
3. **Als Alice anmelden:**
   - nsec von Alice eingeben
   - "Mit nsec anmelden"
4. Marketplace sollte laden

### ✅ Ergebnis:
- ✅ **Alice ist eingeloggt** (anderer Browser)
- ✅ **Bob ist eingeloggt** (noch ein Browser)
- ✅ **Marketplace wird angezeigt** (Whitelist-Check funktioniert!)
- ✅ **Angebots-Button ist sichtbar**

### Test 6b: User NICHT auf Whitelist - OPTIONAL
Falls du einen dritten User hast, der NICHT auf der Whitelist steht:
1. **Neues Tab öffnen**
2. **Als Charlie anmelden** (NICHT auf Whitelist)
3. Link einfügen

**Erwartung:**
- ❌ Marketplace wird NICHT angezeigt (oder Fehler)
- ❌ User wird abgelehnt

---

## Test 7: Relay-Persistenz prüfen - OPTIONAL ÜBERSPRINGEN

### Schritte (falls gewünscht):
1. **Alle Browser-Tabs schließen**
2. **LocalStorage komplett löschen** (F12 → Application → Clear Storage)
3. **Neuen Browser öffnen**
4. **Link wieder einfügen** (aus Test 1)
5. **Als Alice einloggen**

### Erwartetes Verhalten:
- ✅ Gruppe wird vom Relay geladen
- ✅ Whitelist wird vom Relay geladen
- ✅ Alice wird erkannt (Whitelist-Check funktioniert)
- ✅ Marketplace wird angezeigt

### ℹ️ Hinweis:
Da Multi-Browser-Tests bereits funktionieren, ist die Relay-Persistenz bestätigt. **Weiter zu Test 9!**

---

## Test 8: Relay-Grunddaten prüfen ✅ GETESTET

### Aktion:
```bash
node test-relay-query.js
```

### ✅ Aktuelle Ausgabe (nach Test 1-3+6):
```
📊 ZUSAMMENFASSUNG:
✅ GroupConfigs: 1
✅ Whitelists: 1 (mit 2 Membern: Alice + Bob)
📦 Marketplace-Angebote (Kind 42): 0 (noch keine)
💌 Interesse-Signale (Kind 30078): 0 (noch keine)
🤝 Deal-Status (Kind 30081): 0 (noch keine)
🗑️ Deletion Events (Kind 5): 20
💬 Alte DMs (Kind 4): 1 ⚠️

=== 🏗️ KIND 30000 EVENTS ===
🔐 Whitelist:
   👥 Mitglieder: 2
   📋 Whitelist-Mitglieder:
      1. 814f0240...e2d54f5a (Alice)
      2. 649e3ee6...09d00b34 (Bob)
```

**Status vor Marketplace-Tests:**
- ✅ Gruppe erstellt
- ✅ Admin funktioniert
- ✅ Whitelist mit 2 Usern
- ✅ Beide User können sich einloggen
- ⏳ **Bereit für Test 9: Angebot erstellen!**

---

## Test 9: Angebot erstellen (User A = Verkäufer) ✅ GETESTET

### Schritte:
1. Als User A einloggen (z.B. Alice: `npub1649e3ee...`)
2. Marketplace öffnen (`/group`)
3. Button "📝 Neues Angebot erstellen"
4. Inhalt: `"verkaufe 1 btc für 100000 euro"`
5. Absenden

### ✅ Tatsächliches Ergebnis:
```bash
node test-relay-query.js

📦 MARKETPLACE-ANGEBOTE (Kind 42):
   📦 Angebot 1:
      ID: 1a0d4c20baebe2ad...
      Temp-Pubkey: 1bf3d519712627bf... ✅ (Anonymer Marketplace-Key)
      👤 Echter Author: 649e3ee629320d4b... ✅ (Alice's pubkey im #author Tag)
      🔐 Group-Hash: 9d02973fde108f55... ✅ (Channel-ID)
      📅 Erstellt: 6.11.2025, 15:16:06
      ⏳ Läuft ab in: 71h 54min ✅ (3 Tage Gültigkeit)
      📝 Inhalt: verkaufe 1 btc für 100000 euro ✅

📊 ZUSAMMENFASSUNG:
✅ Marketplace-Angebote: 1 aktiv (vorher 0)
```

### ✅ Erfolge:
- ✅ **Angebot erfolgreich erstellt** (Kind 42 Event)
- ✅ **Temp-Keypair funktioniert** (Anonymität gewahrt)
- ✅ **Author-Tag vorhanden** (Kontrolle behalten)
- ✅ **Nach Aus/Einloggen sichtbar** (Relay-Persistenz OK)
- ✅ **Angebot-Secret in LocalStorage** (kann später verwaltet werden)

---

## Test 10: Interesse zeigen (User B = Käufer)

### Schritte:
1. Als User B einloggen (`npub1bob...`)
2. Marketplace öffnen
3. Angebot von User A sehen
4. Button "💬 Interesse zeigen"
5. Message eingeben: `"Ich kaufe! Kontakt: bob@example.com"`
6. Absenden

### Erwartetes Verhalten:
- ✅ Interesse-Signal wird gesendet
- ✅ User B sieht Bestätigung "Interesse gesendet!"
- ✅ `test-relay-query.js` zeigt neues Kind 30078 Event:
  ```
  === INTERESSE-SIGNALE ===
  - Pubkey: <user-B-pubkey>
  - Inhalt: { "pubkey": "npub1bob...", "name": "Bob", "message": "Ich kaufe! ..." }
  - Tags: 
    - d=interest:<offerId>:<userB-pubkey>
    - e=<offerId>
  ```

---

## Test 11: Interesse-Liste öffnen (User A)

### Schritte:
1. Als User A einloggen (Angebotsgeber)
2. Marketplace öffnen
3. Bei eigenem Angebot: Button "👀 2 Interessenten"
4. Interesse-Liste öffnet sich

### Erwartetes Verhalten:
- ✅ Liste zeigt alle Interessenten:
  ```
  💬 Interessenten für dein Angebot:
  
  📌 User: npub1bob...
  Nachricht: "Ich kaufe! Kontakt: bob@example.com"
  [✅ Auswählen]
  
  📌 User: npub1charlie...
  Nachricht: "Auch interessiert"
  [✅ Auswählen]
  ```

---

## Test 12: Partner auswählen & Deal erstellen (User A)

### Schritte:
1. User A wählt "Bob" aus der Interesse-Liste
2. Klickt "✅ Auswählen"

### Erwartetes Verhalten:
- ✅ Deal-Status Event wird erstellt (Kind 30081)
- ✅ Original-Angebot wird gelöscht (Deletion Event)
- ✅ Angebot verschwindet aus Marketplace
- ✅ `test-relay-query.js` zeigt:
  ```
  === DEAL-STATUS EVENTS (Kind 30081) ===
  Event 1:
    - Pubkey: <temp-pubkey-von-A>
    - Tags:
      - d=deal:<offerId>:<bobPubkey>
      - e=<offerId>
      - p=<bobPubkey>
    - Inhalt: { 
        "status": "active", 
        "role": "seller", 
        "partner": "npub1bob...",
        "offerContent": "Verkaufe 0.01 BTC für 500€"
      }
  
  === MARKETPLACE-ANGEBOTE ===
  (leer - Angebot wurde gelöscht)
  ```

---

## Test 13: Deal anzeigen (beide User)

### User A (Verkäufer):
1. Einloggen als Alice
2. Marketplace öffnen
3. Sektion "Meine Deals" scrollen

**Erwartete Anzeige:**
```
🤝 Meine aktiven Deals

┌─────────────────────────────────┐
│ 🤝 Deal mit: npub1bob...        │
│ Rolle: Verkäufer (Seller)       │
│ Angebot: Verkaufe 0.01 BTC...   │
│ Status: Aktiv                   │
│                                 │
│ [✅ Abschließen] [❌ Abbrechen] │
└─────────────────────────────────┘
```

### User B (Käufer):
1. Einloggen als Bob
2. Marketplace öffnen
3. Sektion "Meine Deals" scrollen

**Erwartete Anzeige:**
```
🤝 Meine aktiven Deals

┌─────────────────────────────────┐
│ 🤝 Deal mit: <temp-pubkey-A>    │
│ Rolle: Käufer (Buyer)            │
│ Angebot: Verkaufe 0.01 BTC...   │
│ Status: Aktiv                   │
│                                 │
│ [✅ Abschließen] [❌ Abbrechen] │
└─────────────────────────────────┘
```

---

## Test 14: Deal abschließen (User A)

### Schritte:
1. User A klickt "✅ Abschließen"

### Erwartetes Verhalten:
- ✅ Deal-Status wird aktualisiert
- ✅ `test-relay-query.js` zeigt:
  ```
  === DEAL-STATUS EVENTS (Kind 30081) ===
  - Inhalt: { 
      "status": "completed",  ← Geändert!
      "role": "seller",
      "partner": "npub1bob..."
    }
  ```
- ✅ UI zeigt: **Status: Abgeschlossen ✅**

---

## Test 15: Deal abbrechen (User B)

### Schritte:
1. User B klickt "❌ Abbrechen"

### Erwartetes Verhalten:
- ✅ Deal-Status wird aktualisiert
- ✅ `test-relay-query.js` zeigt:
  ```
  === DEAL-STATUS EVENTS (Kind 30081) ===
  - Inhalt: { 
      "status": "cancelled",  ← Geändert!
      "role": "buyer",
      "partner": "npub1bob..."
    }
  ```
- ✅ UI zeigt: **Status: Abgebrochen ❌**

---

## Test 16: Relay-Query nach vollständigem Flow

### Aktion:
```bash
node test-relay-query.js
```

### Erwartete vollständige Ausgabe:
```
=== GRUPPEN-KONFIGURATION ===
✅ 1 Event

=== WHITELIST-EINTRÄGE ===
✅ 2 Events (Alice, Bob)

=== MARKETPLACE-ANGEBOTE ===
✅ 0 Events (alle Deals abgeschlossen)

=== INTERESSE-SIGNALE ===
✅ 0-2 Events (können noch existieren, sind aber irrelevant)

=== DEAL-STATUS EVENTS (Kind 30081) ===
✅ 1-2 Events:
  Deal 1: Status=completed (Alice ↔ Bob)
  Deal 2: Status=cancelled (optional)
```

---

## ❌ Fehlerfall-Tests

### Test 17: User ohne Whitelist-Eintrag
**Erwartung:** Marketplace wird nicht angezeigt, Redirect zu Admin-Page

### Test 18: User versucht eigenes Angebot zu kaufen
**Erwartung:** Button "Interesse zeigen" nicht sichtbar bei eigenen Angeboten

### Test 19: Deal-Status ohne Netzwerk laden
**Erwartung:** Graceful Error-Handling, Retry-Mechanismus

---

## 📊 Zusammenfassung: Vollständiger Test-Flow

```
✅ Test 1:     Gruppe erstellt (Admin + nsec) - ERFOLGREICH
✅ Test 2:     Gruppe beitreten (Link-Test) - ERFOLGREICH
✅ Test 3:     Whitelist erstellen (Alice + Bob) - ERFOLGREICH
⏭️ Test 4:     Whitelist löschen (ÜBERSPRUNGEN - optional)
⏭️ Test 5:     Admin Logout/Login (ÜBERSPRUNGEN - optional)
✅ Test 6:     User-Login & Whitelist-Check - ERFOLGREICH
⏭️ Test 7:     Relay-Persistenz (ÜBERSPRUNGEN - bereits bestätigt)
✅ Test 8:     Relay-Query Baseline - ERFOLGREICH
✅ Test 9:     Angebot erstellen (Alice) - ERFOLGREICH 🎉
⏳ Test 10:    Interesse zeigen (Bob) - NÄCHSTER SCHRITT 🚀
⏳ Test 11:    Interesse-Liste öffnen (Alice)
⏳ Test 12:    Partner auswählen & Deal erstellen
⏳ Test 13-15: Deal-Management
⏳ Test 16:    Final Relay-Query
⏳ Test 17-19: Error-Handling
```

**Aktuelle Test-Umgebung:**
- Relay: `wss://nostr-relay.online`
- Channel-ID: `9d02973fde108f55fee80c31845f8a750f5eb899257ee10fe7e7d33eb7255d3a`
- Admin-Pubkey: `115e2e0c50bbdf8d...`
- Browser: Multi-Browser Test (Chrome, Firefox)

## 📊 Event-Counts nach vollständigem Test

| Event-Typ                | Kind  | Anzahl | Wann erstellt                         | Status      |
|--------------------------|-------|--------|---------------------------------------|-------------|
| Gruppen-Konfiguration    | 30000 | 1      | Test 1 (Admin erstellt Gruppe)        | ✅ OK       |
| Whitelist-Einträge       | 30000 | 1      | Test 3 (mit 2 Membern)                | ✅ OK       |
| Marketplace-Angebote     | 42    | 0      | Test 9 (jetzt erstellen!)             | ⏳ Pending  |
| Interesse-Signale        | 30078 | 0      | Test 10 (nach Angebot)                | ⏳ Pending  |
| Deal-Status              | 30081 | 0      | Test 12 (Deal erstellt)               | ⏳ Pending  |
| Deletion Events          | 5     | 20     | Verschiedene (andere Relays)          | ✅ OK       |
| Alte DMs (deprecated)    | 4     | 1      | ⚠️ Sollte nicht verwendet werden      | ⚠️ Warning  |

**Aktueller Stand (nach Test 1-3+6+8):**
- ✅ GroupConfig erstellt (Kind 30000)
- ✅ Whitelist mit 2 Membern (Alice + Bob)
- ✅ Admin erkannt in verschiedenen Browsern
- ✅ Alice + Bob können sich einloggen
- ✅ Channel-ID: `9d02973fde108f55...`
- 🚀 **Nächster Schritt: Test 9 (Angebot erstellen als Alice!)**

---

## 🚀 Nächste Schritte nach erfolgreichem Test

1. ✅ Sprint 1.5 abschließen
2. ➡️ Sprint 2: Code-Cleanup starten
   - Ungenutzte Dateien löschen
   - Funktions-Audit durchführen
   - Kommentare bereinigen
3. ➡️ Sprint 3: Dokumentation aktualisieren
   - README.md überarbeiten
   - RELAY-OPERATIONS.md anpassen
