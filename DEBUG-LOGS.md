# Debug Console Logs Dokumentation

## Übersicht

Diese Datei dokumentiert alle Console-Logs die zum Debugging der Nostr-Event-Kommunikation hinzugefügt wurden.

## Log-Kategorien

### 🔗 Relay-Verbindung
```
🔗 [RELAY] Verbinde zu: wss://nostr-relay.online
  ✅ Relay-Verbindung hergestellt: wss://nostr-relay.online
```

**Zweck:** Verifizieren dass Relay-Verbindungen erfolgreich hergestellt werden

---

### 📤 Event Senden (sendGroupMessage)

```
📤 [SEND] Sende Gruppennachricht...
  📋 Channel-ID: 097de7d76f668f2639934578ab4381d1caf30f69cbad534d78f87b8d966013c3
  📡 Relays: ['wss://nostr-relay.online', ...]
  📝 Content (Vorschau): Hallo Gruppe...
  🔐 Content verschlüsselt ✅
  🏷️ Event-Tags erstellt:
    ├─ e-Tag (root): 097de7d76f668f26...
    ├─ p-Tag: 115e2e0c50bbdf8d...
    └─ t-Tag: bitcoin-group ✅
  ✅ Event erstellt: 7749d12c6f3782513dc316e805144f96fa4e6cfdcdced19d2f84701521ed004b
  📡 Publiziere zu Relays...
  ✅ Event published: 4/4 Relays
```

**Zweck:** 
- ✅ Channel-ID verifizieren
- ✅ Prüfen dass `#t=bitcoin-group` Tag gesetzt wird
- ✅ Erfolgreiche Relay-Publizierung bestätigen

**Wichtige Checks:**
1. `t-Tag: bitcoin-group ✅` muss erscheinen
2. `Event published: X/Y` sollte X ≈ Y sein (alle Relays erfolgreich)

---

### 📡 Event Publizieren (publishEvent)

```
📡 [PUBLISH] Starte Event-Publishing...
  🆔 Event-ID: 7749d12c6f3782513dc316e805144f96fa4e6cfdcdced19d2f84701521ed004b
  📡 Ziel-Relays: ['wss://nostr-relay.online', 'wss://relay.damus.io', ...]
  ⏳ Sende zu: wss://nostr-relay.online
  ✅ Erfolgreich: wss://nostr-relay.online
  ⏳ Sende zu: wss://relay.damus.io
  ✅ Erfolgreich: wss://relay.damus.io
  ...
📊 [PUBLISH] Ergebnis:
  ✅ Erfolgreich: 4/4
  📡 Erfolgreiche Relays: ['wss://nostr-relay.online', 'wss://relay.damus.io', ...]
```

**Zweck:**
- ✅ Zeigt jeden einzelnen Relay-Publish-Versuch
- ✅ Identifiziert welche Relays fehlschlagen
- ✅ Finale Erfolgsrate

**Wichtige Checks:**
1. Jeder Relay sollte `✅ Erfolgreich:` zeigen
2. Finale Rate sollte 100% sein (X/X)
3. Bei ❌ Fehler: Zeigt welcher Relay das Problem hat

---

### 📥 Events Laden (fetchGroupMessages)

```
📥 [FETCH] Lade Gruppen-Nachrichten...
  📋 Channel-ID: 097de7d76f668f2639934578ab4381d1caf30f69cbad534d78f87b8d966013c3
  📡 Relays: ['wss://nostr-relay.online', ...]
  🏷️ Filter: #t=bitcoin-group
  ⏰ Since: 6.10.2025, 10:00:00
  📊 Limit: 100
```

**Zweck:**
- ✅ Zeigt verwendeten Filter
- ✅ Verifiziert dass `#t=bitcoin-group` Filter aktiv ist
- ✅ Zeigt Zeitbereich (since)

**Wichtige Checks:**
1. `🏷️ Filter: #t=bitcoin-group` muss vorhanden sein
2. `Since:` zeigt ab wann Events geladen werden

---

### 🔍 Event-Abfrage (fetchEvents)

```
🔍 [FETCH] Starte Event-Abfrage...
  📡 Relays: ['wss://nostr-relay.online', ...]
  🔎 Filter: {
    "kinds": [1],
    "#t": ["bitcoin-group"],
    "since": 1728200400,
    "limit": 100
  }
  ⏱️ Timeout: 5000ms
  📨 Event empfangen: 7749d12c6f378251...
  📨 Event empfangen: abc123def456789...
  ✅ EOSE (End of Stored Events) empfangen
📊 [FETCH] Ergebnis: 2 Events geladen
```

**Zweck:**
- ✅ Zeigt exakten Filter als JSON
- ✅ Live-Tracking jedes empfangenen Events
- ✅ EOSE-Signal von Relays
- ✅ Finale Anzahl geladener Events

**Wichtige Checks:**
1. Filter muss `"#t": ["bitcoin-group"]` enthalten
2. `EOSE empfangen` bestätigt dass Relay fertig ist
3. Anzahl Events > 0 wenn Nachrichten vorhanden sein sollten

---

## Typische Log-Sequenzen

### Szenario 1: Nachricht senden (erfolgreich)

```
📤 [SEND] Sende Gruppennachricht...
  📋 Channel-ID: 097de...
  📡 Relays: ['wss://nostr-relay.online', ...]
  📝 Content (Vorschau): Test Nachricht...
  🔐 Content verschlüsselt ✅
  🏷️ Event-Tags erstellt:
    ├─ e-Tag (root): 097de...
    ├─ p-Tag: 115e2...
    └─ t-Tag: bitcoin-group ✅          ← WICHTIG!
  ✅ Event erstellt: 7749d...
  📡 Publiziere zu Relays...

📡 [PUBLISH] Starte Event-Publishing...
  🆔 Event-ID: 7749d...
  📡 Ziel-Relays: ['wss://nostr-relay.online', ...]
  ⏳ Sende zu: wss://nostr-relay.online
  ✅ Erfolgreich: wss://nostr-relay.online    ← Gut!
  ⏳ Sende zu: wss://relay.damus.io
  ✅ Erfolgreich: wss://relay.damus.io
  ⏳ Sende zu: wss://nos.lol
  ✅ Erfolgreich: wss://nos.lol
  ⏳ Sende zu: wss://relay.nostr.band
  ✅ Erfolgreich: wss://relay.nostr.band
📊 [PUBLISH] Ergebnis:
  ✅ Erfolgreich: 4/4                         ← Perfekt!
  📡 Erfolgreiche Relays: ['wss://nostr-relay.online', ...]
```

**Erwartung:** ✅ Alle Relays erfolgreich, `t-Tag: bitcoin-group` vorhanden

---

### Szenario 2: Nachrichten laden (erfolgreich)

```
📥 [FETCH] Lade Gruppen-Nachrichten...
  📋 Channel-ID: 097de...
  📡 Relays: ['wss://nostr-relay.online', ...]
  🏷️ Filter: #t=bitcoin-group              ← WICHTIG!
  📊 Limit: 100

🔍 [FETCH] Starte Event-Abfrage...
  📡 Relays: ['wss://nostr-relay.online', ...]
  🔎 Filter: {
    "kinds": [1],
    "#t": ["bitcoin-group"],                ← Filter richtig!
    "limit": 100
  }
  ⏱️ Timeout: 5000ms
  📨 Event empfangen: 7749d...              ← Event 1 gefunden
  📨 Event empfangen: abc12...              ← Event 2 gefunden
  ✅ EOSE (End of Stored Events) empfangen
📊 [FETCH] Ergebnis: 2 Events geladen       ← 2 Events erfolgreich
```

**Erwartung:** ✅ Filter mit `#t=bitcoin-group`, Events werden gefunden

---

### Szenario 3: Problem - Events nicht gefunden

```
📥 [FETCH] Lade Gruppen-Nachrichten...
  📋 Channel-ID: 097de...
  📡 Relays: ['wss://nostr-relay.online', ...]
  🏷️ Filter: #t=bitcoin-group
  📊 Limit: 100

🔍 [FETCH] Starte Event-Abfrage...
  📡 Relays: ['wss://nostr-relay.online', ...]
  🔎 Filter: {
    "kinds": [1],
    "#t": ["bitcoin-group"],
    "limit": 100
  }
  ⏱️ Timeout: 5000ms
  ✅ EOSE (End of Stored Events) empfangen
📊 [FETCH] Ergebnis: 0 Events geladen       ← ⚠️ Problem!
```

**Mögliche Ursachen:**
1. ❌ Events haben kein `#t=bitcoin-group` Tag (alter Code vor Fix)
2. ❌ Relay hat Events gelöscht (>24h alt)
3. ❌ Falsche Channel-ID (unterschiedliches Secret)
4. ❌ Relay nicht erreichbar

**Debug-Steps:**
- Prüfe beim Senden: `t-Tag: bitcoin-group ✅` vorhanden?
- Prüfe beim Laden: Filter enthält `"#t": ["bitcoin-group"]`?
- Teste mit frisch gesendeter Nachricht

---

### Szenario 4: Problem - Relay nicht erreichbar

```
📡 [PUBLISH] Starte Event-Publishing...
  🆔 Event-ID: 7749d...
  📡 Ziel-Relays: ['wss://nostr-relay.online', ...]
  ⏳ Sende zu: wss://nostr-relay.online
  ❌ Fehler bei wss://nostr-relay.online: Connection timeout  ← ⚠️ Problem!
  ⏳ Sende zu: wss://relay.damus.io
  ✅ Erfolgreich: wss://relay.damus.io
📊 [PUBLISH] Ergebnis:
  ✅ Erfolgreich: 1/2                                         ← Teilweise erfolgreich
  📡 Erfolgreiche Relays: ['wss://relay.damus.io']
```

**Mögliche Ursachen:**
1. ❌ Relay offline/down
2. ❌ Netzwerk-Problem (Firewall, DNS)
3. ❌ Rate-Limit vom Relay

**Lösungen:**
- Versuche andere Relays aus der Backup-Liste
- Prüfe Relay-Status: https://nostr.watch
- Warte und versuche erneut (Rate-Limit)

---

## Debugging-Cheatsheet

### ✅ Alles funktioniert wenn:
1. Beim Senden:
   - `t-Tag: bitcoin-group ✅` erscheint
   - `Erfolgreich: X/X` (alle Relays)
   
2. Beim Laden:
   - Filter zeigt `"#t": ["bitcoin-group"]`
   - `Events geladen: X` (X > 0)

### ❌ Problem wenn:
1. Beim Senden:
   - `t-Tag: bitcoin-group` fehlt → Code-Problem
   - `Erfolgreich: 0/X` → Relay-Problem
   
2. Beim Laden:
   - Filter fehlt `"#t"` → Filter-Bug
   - `Events geladen: 0` → Keine Events oder falscher Filter

---

## Browser Console Filter

Um nur relevante Logs zu sehen:

```javascript
// Nur SEND-Logs:
console.log.filter = /\[SEND\]/

// Nur FETCH-Logs:
console.log.filter = /\[FETCH\]/

// Nur Erfolgs-Meldungen:
console.log.filter = /✅/

// Nur Fehler:
console.log.filter = /❌|⚠️/
```

**Oder einfach:** Browser DevTools → Console → Filter-Textbox

---

## Production Monitoring

### Wichtige Metriken:

1. **Event Publish Success Rate**
   - Ziel: 100% (4/4 Relays)
   - Acceptable: ≥75% (3/4 Relays)
   - Kritisch: <50% (Relay-Probleme)

2. **Event Fetch Success**
   - Ziel: Events > 0 wenn vorhanden
   - Check: EOSE empfangen
   - Kritisch: Timeout ohne EOSE

3. **Tag-Präsenz**
   - Ziel: `t-Tag: bitcoin-group ✅` bei jedem Event
   - Kritisch: Tag fehlt (Events nicht findbar)

---

## Log-Farben in Console

Die Emojis helfen beim schnellen Scannen:

- 🔗 Blau = Verbindung
- 📤 Grün = Senden
- 📥 Blau = Empfangen
- ✅ Grün = Erfolg
- ❌ Rot = Fehler
- ⚠️ Gelb = Warnung
- 🏷️ Lila = Tags
- 📊 Grau = Statistik

---

**Status:** ✅ Debug-Logs implementiert
**Version:** 2.0 (mit #t Tag Fix)
**Datum:** 6. Oktober 2025
