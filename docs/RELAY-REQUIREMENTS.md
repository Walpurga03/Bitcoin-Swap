# 🔌 Relay-Anforderungen für Bitcoin-Tausch-Netzwerk

## Übersicht

Dieses Projekt nutzt das Nostr-Protokoll für dezentrale Kommunikation. Um ein eigenes Relay zu verwenden, muss es bestimmte Nostr Implementation Possibilities (NIPs) unterstützen.

## ✅ Erforderliche NIPs

### 1. **NIP-01: Basic Protocol Flow** (PFLICHT)
- **Beschreibung**: Grundlegende Nostr-Funktionalität
- **Verwendung**: Alle Event-Operationen (Erstellen, Signieren, Publizieren, Abfragen)
- **Event-Kinds**:
  - `Kind 1`: Chat-Nachrichten und Interesse-Antworten
  - `Kind 5`: Event-Löschungen (NIP-09)
  - `Kind 30000`: Marketplace-Angebote (Replaceable Events)

### 2. **NIP-12: Generic Tag Queries** (PFLICHT)
- **Beschreibung**: Filtern von Events nach Tags
- **Verwendung**: Alle Abfragen nutzen `#t` (Hashtag) Filter
- **Beispiel-Filter**:
  ```json
  {
    "kinds": [1],
    "#t": ["bitcoin-group"],
    "limit": 100
  }
  ```
- **Wichtig**: Das Relay MUSS `#t` Filter unterstützen, sonst werden keine Events gefunden!

### 3. **NIP-09: Event Deletion** (EMPFOHLEN)
- **Beschreibung**: Löschen von Events
- **Verwendung**: Benutzer können eigene Angebote und Interesse-Antworten löschen
- **Event-Kind**: `Kind 5` mit `e`-Tag zum zu löschenden Event

### 4. **NIP-33: Parameterized Replaceable Events** (EMPFOHLEN)
- **Beschreibung**: Ersetzbare Events mit Identifier
- **Verwendung**: Marketplace-Angebote (`Kind 30000`)
- **Vorteil**: Alte Versionen werden automatisch ersetzt

## 📋 Event-Struktur

### Chat-Nachricht (Kind 1)
```json
{
  "kind": 1,
  "content": "<verschlüsselter Inhalt>",
  "tags": [
    ["e", "<channel-id>", "", "root"],
    ["p", "<sender-pubkey>"],
    ["t", "bitcoin-group"]
  ]
}
```

### Marketplace-Angebot (Kind 30000)
```json
{
  "kind": 30000,
  "content": "<verschlüsselter Inhalt>",
  "tags": [
    ["e", "<channel-id>", "", "root"],
    ["p", "<temp-pubkey>"],
    ["t", "bitcoin-group"],
    ["d", "offer-<timestamp>"]
  ]
}
```

### Interesse-Antwort (Kind 1)
```json
{
  "kind": 1,
  "content": "<verschlüsselter Inhalt>",
  "tags": [
    ["e", "<offer-id>", "", "reply"],
    ["e", "<channel-id>", "", "root"],
    ["p", "<user-pubkey>"],
    ["name", "<username>"],
    ["t", "bitcoin-group"]
  ]
}
```

### Event-Löschung (Kind 5)
```json
{
  "kind": 5,
  "content": "Angebot gelöscht",
  "tags": [
    ["e", "<event-id-to-delete>"]
  ]
}
```

## 🔍 Verwendete Filter

### 1. Chat-Nachrichten laden
```json
{
  "kinds": [1],
  "#t": ["bitcoin-group"],
  "limit": 100,
  "since": <timestamp>
}
```
**Wichtig**: Events mit `["e", "<id>", "", "reply"]` werden herausgefiltert (sind Interesse-Events)

### 2. Marketplace-Angebote laden
```json
{
  "kinds": [30000],
  "#t": ["bitcoin-group"],
  "limit": 100
}
```

### 3. Interesse-Antworten laden
```json
{
  "kinds": [1],
  "#t": ["bitcoin-group"],
  "#e": ["<offer-id-1>", "<offer-id-2>", ...],
  "limit": 500
}
```

## 🧪 Relay-Kompatibilität testen

### Mit websocat (WebSocket-Client)
```bash
# Installation
cargo install websocat

# Verbindung zum Relay
websocat wss://your-relay.com

# Test: Abfrage mit #t Filter
["REQ","test",{"kinds":[1],"#t":["bitcoin-group"],"limit":10}]

# Erwartete Antwort: EVENT-Messages mit passenden Events
# Wenn keine Events kommen: Relay unterstützt #t Filter NICHT!
```

### Mit Browser DevTools
```javascript
// WebSocket-Verbindung öffnen
const ws = new WebSocket('wss://your-relay.com');

ws.onopen = () => {
  // Test-Abfrage senden
  ws.send(JSON.stringify([
    "REQ",
    "test",
    {
      "kinds": [1],
      "#t": ["bitcoin-group"],
      "limit": 10
    }
  ]));
};

ws.onmessage = (event) => {
  console.log('Relay Response:', event.data);
};
```

## ⚠️ Häufige Probleme

### Problem 1: Keine Events werden geladen
**Ursache**: Relay unterstützt `#t` Filter nicht (NIP-12)
**Lösung**: Verwende ein anderes Relay oder implementiere Fallback-Logik

### Problem 2: Events werden nicht gespeichert
**Ursache**: Relay akzeptiert bestimmte Event-Kinds nicht
**Lösung**: Prüfe Relay-Dokumentation für unterstützte Event-Kinds

### Problem 3: Löschungen funktionieren nicht
**Ursache**: Relay unterstützt NIP-09 nicht
**Lösung**: Verwende ein Relay mit NIP-09 Support

## 📊 Empfohlene Relays

### Öffentliche Relays mit voller NIP-Unterstützung:
- `wss://relay.damus.io` - Vollständige NIP-01, NIP-09, NIP-12 Unterstützung
- `wss://relay.nostr.band` - Gute Performance, alle NIPs
- `wss://nos.lol` - Zuverlässig, schnell

### Eigenes Relay betreiben:
- **nostr-rs-relay**: Rust-Implementation, sehr performant
  - GitHub: https://github.com/scsibug/nostr-rs-relay
  - Unterstützt: NIP-01, NIP-09, NIP-12, NIP-33
  
- **strfry**: C++-Implementation, extrem schnell
  - GitHub: https://github.com/hoytech/strfry
  - Unterstützt: Alle wichtigen NIPs

## 🔧 Relay im Projekt ändern

### 1. Über Einladungslink
Der Einladungslink enthält das Relay:
```
https://your-app.com/?relay=wss://your-relay.com&secret=xxx
```

### 2. Fallback-Relays im Code
Datei: `src/routes/(app)/dm/[pubkey]/+page.svelte`
```typescript
const FALLBACK_RELAYS = [
  'wss://your-primary-relay.com',
  'wss://your-backup-relay.com'
];
```

### 3. Umgebungsvariable (Vercel)
```bash
PUBLIC_DEFAULT_RELAY=wss://your-relay.com
```

## 📝 Checkliste für neues Relay

- [ ] WebSocket-Verbindung funktioniert (`wss://`)
- [ ] NIP-01: Grundlegende Events (Kind 1, 5, 30000)
- [ ] NIP-12: `#t` Tag-Filter funktioniert
- [ ] NIP-09: Event-Löschungen werden verarbeitet
- [ ] NIP-33: Replaceable Events (Kind 30000)
- [ ] Performance: < 1s Antwortzeit für Abfragen
- [ ] Stabilität: Keine häufigen Verbindungsabbrüche
- [ ] Speicherung: Events bleiben dauerhaft gespeichert

## 🔐 Sicherheitshinweise

1. **Verschlüsselung**: Alle Inhalte werden client-seitig verschlüsselt
2. **Relay-Trust**: Das Relay sieht nur verschlüsselte Daten und Metadaten
3. **Public Keys**: Sind öffentlich sichtbar (Teil des Nostr-Protokolls)
4. **Private Keys**: Werden NIEMALS an das Relay gesendet

## 📚 Weitere Ressourcen

- **Nostr NIPs**: https://github.com/nostr-protocol/nips
- **NIP-01 Spec**: https://github.com/nostr-protocol/nips/blob/master/01.md
- **NIP-12 Spec**: https://github.com/nostr-protocol/nips/blob/master/12.md
- **Relay-Liste**: https://nostr.watch/
- **Relay-Implementierungen**: https://github.com/aljazceru/awesome-nostr#relays

---

**Zusammenfassung**: Ein Relay MUSS mindestens NIP-01 und NIP-12 unterstützen. Ohne NIP-12 (`#t` Filter) funktioniert das Projekt NICHT, da alle Abfragen auf dem `bitcoin-group` Hashtag basieren.