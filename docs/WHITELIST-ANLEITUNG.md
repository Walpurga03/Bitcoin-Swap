# 📋 Whitelist-Verwaltung Anleitung

## Übersicht

Die Whitelist wird als **Nostr Event (Kind 30000)** auf dem Relay gespeichert. Dies ermöglicht eine dezentrale Verwaltung ohne Deployment-Änderungen.

### 🎯 Gruppenbasiertes Whitelist-System

**Wichtig:** Jede Gruppe hat ihre **eigene separate Whitelist**!

- Gruppe A (Secret: "bitcoin-traders") → Whitelist A
- Gruppe B (Secret: "crypto-fans") → Whitelist B
- Die Whitelists sind **komplett unabhängig** voneinander

**Technisch:** Die Whitelist wird über die `channelId` identifiziert, die aus dem Group-Secret abgeleitet wird. Jede Gruppe hat eine eindeutige `channelId` und damit eine eigene Whitelist.

## 🔑 Voraussetzungen

1. **Admin-Zugang**: Du musst der Admin sein (dein Public Key muss in `PUBLIC_ADMIN_PUBKEY` konfiguriert sein)
2. **Eingeloggt**: Du musst mit deinem Private Key (NSEC) eingeloggt sein
3. **Relay-Verbindung**: Das Relay muss erreichbar sein

### ⚠️ Wichtig: Erster Login als Admin

**Der Admin kann sich IMMER einloggen, auch wenn die Whitelist leer ist!**

Dies ist notwendig, damit du beim ersten Deployment:
1. Dich als Admin einloggen kannst
2. Zur Admin-Seite (`/admin`) navigieren kannst
3. Die erste Whitelist erstellen und andere Benutzer hinzufügen kannst

**Technisch:** Die Login-Seite prüft, ob dein Public Key dem `PUBLIC_ADMIN_PUBKEY` entspricht. Wenn ja, wird die Whitelist-Prüfung übersprungen.

---

## 📝 Public Key (npub) zur Whitelist hinzufügen

### Schritt 1: Als Admin einloggen
1. Öffne die Anwendung mit einem gültigen Einladungslink
2. Gib deinen Namen ein
3. Gib deinen Admin-NSEC (Private Key) ein
4. Klicke auf "Gruppe beitreten"
   - ✅ Als Admin wirst du IMMER eingelassen (auch bei leerer Whitelist)
   - Du siehst in der Konsole: "✅ Admin-Login erkannt - Whitelist-Prüfung übersprungen"

### Schritt 2: Admin-Seite öffnen
1. Nach erfolgreichem Login bist du im Gruppen-Chat
2. Navigiere zu `/admin` (z.B. `https://deine-app.vercel.app/admin`)
   - Oder füge `/admin` zur URL hinzu

### Schritt 3: Public Key hinzufügen
1. Im Abschnitt **"Public Key hinzufügen"** findest du ein Eingabefeld
2. Gib den Public Key ein, den du hinzufügen möchtest:
   - **Format 1 (npub)**: `npub1abc123...` (empfohlen)
   - **Format 2 (hex)**: `3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d`
3. Klicke auf **"➕ Hinzufügen"**

### Was passiert im Hintergrund:
```
1. Validierung des Public Keys
   ├─ Prüfung ob npub oder hex Format
   └─ Konvertierung zu hex (falls npub)

2. Prüfung ob bereits vorhanden
   └─ Verhindert Duplikate

3. Whitelist-Update
   ├─ Aktuelles Whitelist-Event vom Relay laden
   ├─ Neuen Public Key hinzufügen
   └─ Als neues Event (Kind 30000) auf Relay speichern

4. Relay-Speicherung
   ├─ Event wird signiert mit deinem Admin-Private-Key
   ├─ Event wird zu allen konfigurierten Relays gesendet
   └─ Replaceable Event ersetzt alte Version automatisch
```

### Erfolg:
- ✅ Grüne Meldung: "Public Key hinzugefügt: npub1abc..."
- Der neue Key erscheint sofort in der Liste

---

## 🗑️ Public Key (npub) von Whitelist entfernen

### Schritt 1: Public Key entfernen
1. Öffne die Admin-Seite (`/admin`)
2. Scrolle zum Abschnitt **"Whitelist (X Einträge)"**
1. Finde den Public Key in der Liste
2. Klicke auf den **"🗑️ Entfernen"** Button rechts neben dem Key

### Was passiert im Hintergrund:
```
1. Whitelist-Update
   ├─ Aktuelles Whitelist-Event vom Relay laden
   ├─ Public Key aus Array entfernen
   └─ Als neues Event (Kind 30000) auf Relay speichern

2. Relay-Speicherung
   ├─ Event wird signiert mit deinem Admin-Private-Key
   ├─ Event wird zu allen konfigurierten Relays gesendet
   └─ Replaceable Event ersetzt alte Version automatisch
```

### Erfolg:
- ✅ Grüne Meldung: "Public Key entfernt: 3bf0c63f..."
- Der Key verschwindet sofort aus der Liste

---

## 🔄 Whitelist aktualisieren

### Manuell aktualisieren:
1. Klicke auf **"🔄 Aktualisieren"** Button
2. Die Whitelist wird neu vom Relay geladen

### Automatisch:
- Beim Öffnen der Admin-Seite wird die Whitelist automatisch geladen
- Nach jedem Hinzufügen/Entfernen wird die Liste neu geladen

---

## 📡 Relay-Technische Details

### Event-Struktur (Kind 30000 - Replaceable Event)

```json
{
  "kind": 30000,
  "pubkey": "admin_pubkey_hex",
  "created_at": 1234567890,
  "tags": [
    ["d", "whitelist-{channelId}"],
    ["t", "bitcoin-group"],
    ["channel", "{channelId}"]
  ],
  "content": "{\"pubkeys\":[\"hex1\",\"hex2\"],\"updated_at\":1234567890,\"admin_pubkey\":\"admin_hex\",\"channel_id\":\"{channelId}\"}"
}
```

### Wichtige Eigenschaften:

1. **Replaceable Event (Kind 30000)**
   - Nur das neueste Event mit gleichem `d`-Tag wird behalten
   - Alte Versionen werden automatisch vom Relay verworfen
   - Kein manuelles Löschen alter Events nötig

2. **d-Tag: "whitelist-{channelId}"** (Gruppenspezifisch!)
   - Eindeutiger Identifier für die Whitelist **dieser Gruppe**
   - `channelId` wird aus dem Group-Secret abgeleitet
   - Jede Gruppe hat einen anderen d-Tag → separate Whitelists
   - Beispiel: `"whitelist-a1b2c3d4e5f6..."`

3. **channel-Tag**
   - Zusätzlicher Tag für einfacheres Filtern
   - Enthält die vollständige `channelId`

4. **Admin-Signatur**
   - Nur Events signiert vom Admin-Private-Key sind gültig
   - Verhindert unbefugte Änderungen

5. **Content-Format**
   - JSON-String mit Array von Public Keys (hex)
   - Timestamp der letzten Aktualisierung
   - Admin Public Key zur Verifikation
   - **Channel ID** zur Identifikation der Gruppe

### Relay-Abfrage beim Login:

```javascript
// Filter für Whitelist-Event (gruppenspezifisch)
{
  kinds: [30000],
  authors: [admin_pubkey_hex],
  '#d': ['whitelist-{channelId}'],  // Dynamisch basierend auf Gruppe
  limit: 1
}
```

### Beispiel: Mehrere Gruppen

```javascript
// Gruppe A (Secret: "bitcoin-traders")
channelId_A = deriveChannelId("bitcoin-traders")
// → d-Tag: "whitelist-a1b2c3d4..."
// → Whitelist A mit Benutzern: [Alice, Bob, Charlie]

// Gruppe B (Secret: "crypto-fans")
channelId_B = deriveChannelId("crypto-fans")
// → d-Tag: "whitelist-x9y8z7w6..."
// → Whitelist B mit Benutzern: [David, Eve, Frank]

// Alice kann sich in Gruppe A einloggen, aber NICHT in Gruppe B
// David kann sich in Gruppe B einloggen, aber NICHT in Gruppe A
```

---

## 🔒 Sicherheit

### Zugriffskontrolle:
1. **Admin-Seite**: Nur Admin-Pubkey hat Zugriff
2. **Event-Signatur**: Nur Admin kann Whitelist ändern
3. **Relay-Validierung**: Relay prüft Event-Signatur

### Best Practices:
- ✅ Verwende npub-Format (leichter zu lesen)
- ✅ Prüfe Public Keys vor dem Hinzufügen
- ✅ Entferne inaktive Benutzer regelmäßig
- ✅ Sichere deinen Admin-Private-Key gut

---

## 🐛 Fehlerbehebung

### Problem: "Whitelist nicht geladen"
**Ursache**: Relay nicht erreichbar oder kein Event vorhanden
**Lösung**: 
1. Prüfe Relay-Verbindung
2. Erstelle neue Whitelist durch Hinzufügen eines Keys

### Problem: "Zugriff verweigert" beim Login
**Ursache**: Dein Public Key ist nicht in der Whitelist und du bist nicht der Admin
**Lösung**:
1. Prüfe ob du der Admin bist: Dein Public Key muss `PUBLIC_ADMIN_PUBKEY` entsprechen
2. Als Admin kannst du dich IMMER einloggen (auch bei leerer Whitelist)
3. Wenn du nicht der Admin bist, muss der Admin dich zur Whitelist hinzufügen

### Problem: "Zugriff verweigert" auf Admin-Seite
**Ursache**: Du bist nicht der Admin
**Lösung**:
1. Prüfe `PUBLIC_ADMIN_PUBKEY` in `.env.production`
2. Nur der Admin-Public-Key hat Zugriff auf `/admin`

### Problem: "Fehler beim Speichern"
**Ursache**: Relay lehnt Event ab oder Netzwerkfehler
**Lösung**: 
1. Prüfe Browser-Konsole für Details
2. Versuche es erneut
3. Prüfe Relay-Status

### Problem: "Public Key bereits vorhanden"
**Ursache**: Key ist schon in der Whitelist
**Lösung**: 
1. Prüfe die Liste
2. Wenn nicht sichtbar, klicke "🔄 Aktualisieren"

---

## 📊 Monitoring

### Whitelist-Status prüfen:
1. **Login-Seite**: Zeigt Whitelist-Status beim Login
   - ⏳ "Lade Whitelist..."
   - ✅ "Whitelist für Gruppe geladen (X Einträge)"
   - ⚠️ "Keine Whitelist für diese Gruppe gefunden"

2. **Admin-Seite**: Zeigt vollständige Liste
   - **Aktuelle Gruppe** (Channel ID und Relay)
   - Anzahl der Einträge
   - Letzte Aktualisierung
   - Alle Public Keys
   - Hinweis: "Diese Whitelist gilt nur für diese Gruppe"

### Browser-Konsole:
```javascript
// Whitelist-Logs (gruppenspezifisch)
📋 [WHITELIST] Lade Whitelist vom Relay...
  Admin Pubkey: 3bf0c63fcb93...
  Channel ID: a1b2c3d4e5f6...
  d-Tag: whitelist-a1b2c3d4e5f6...
✅ [WHITELIST] Whitelist geladen: 3 Einträge
💾 [WHITELIST] Speichere Whitelist auf Relay...
  Channel ID: a1b2c3d4e5f6...
  d-Tag: whitelist-a1b2c3d4e5f6...
✅ [WHITELIST] Whitelist für Gruppe gespeichert
```

---

## 🚀 Deployment-Hinweise

### Vercel Environment Variables:
```bash
# In Vercel Dashboard → Settings → Environment Variables
PUBLIC_ADMIN_PUBKEY=npub1s98sys9c58fy2xn62wp8cy5ke2rak3hjdd3z7ahc4jm5tck4fadqrfd9f5
```

### Nach Deployment:

#### Erster Start (leere Whitelist):
1. **Als Admin einloggen**
   - Verwende deinen Admin-NSEC
   - Du wirst automatisch eingelassen (Whitelist-Prüfung wird übersprungen)
   
2. **Zur Admin-Seite navigieren**
   - Gehe zu `/admin`
   - Erstelle die erste Whitelist
   
3. **Andere Benutzer hinzufügen**
   - Füge Public Keys von Benutzern hinzu
   - Diese können sich nun einloggen

#### Laufender Betrieb:
1. Testen mit verschiedenen Public Keys
2. Alte `PUBLIC_ALLOWED_PUBKEYS` Variable kann aus Vercel gelöscht werden
3. Whitelist regelmäßig aktualisieren

#### Mehrere Gruppen verwalten:
1. **Jede Gruppe hat ihre eigene Whitelist**
   - Logge dich mit verschiedenen Einladungslinks ein
   - Jeder Link führt zu einer anderen Gruppe
   - Verwalte die Whitelist für jede Gruppe separat

2. **Beispiel-Workflow:**
   ```
   1. Einladungslink A → Gruppe "Bitcoin Traders"
      - Login als Admin
      - /admin öffnen
      - Whitelist A verwalten (Alice, Bob, Charlie)
   
   2. Einladungslink B → Gruppe "Crypto Fans"
      - Login als Admin (mit gleichem NSEC)
      - /admin öffnen
      - Whitelist B verwalten (David, Eve, Frank)
   
   3. Alice kann nur Gruppe A beitreten
   4. David kann nur Gruppe B beitreten
   ```

3. **Admin-Zugriff:**
   - Der Admin (du) kannst dich in **alle Gruppen** einloggen
   - Du kannst die Whitelist für **jede Gruppe** separat verwalten
   - Dein Admin-Status gilt gruppenübergreifend

---

## 📞 Support

Bei Problemen:
1. Prüfe Browser-Konsole (F12)
2. Prüfe Relay-Logs
3. Prüfe Event-Signatur
4. Kontaktiere Admin

---

## 🔗 Weiterführende Links

- [NIP-01: Basic Protocol](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [NIP-16: Replaceable Events](https://github.com/nostr-protocol/nips/blob/master/16.md)
- [NIP-33: Parameterized Replaceable Events](https://github.com/nostr-protocol/nips/blob/master/33.md)