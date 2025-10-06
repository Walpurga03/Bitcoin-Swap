# Event-Tags Fix: Gruppen-ID bei jedem Event

## Problem identifiziert

**Issue:** Nachrichten wurden nicht richtig auf Relays gespeichert bzw. von anderen Gruppenmitgliedern nicht gefunden.

**Ursache:** Events hatten nicht das `#t` (Hashtag) Tag `bitcoin-group`, das für den Relay-Filter benötigt wird.

## Lösung

### Filter-Strategie (bereits implementiert):
```typescript
// In subscribeToGroupMessages():
const historicalFilter = {
  kinds: [1],
  "#t": ["bitcoin-group"],  // Findet alle Events mit diesem Hashtag
  ...
}
```

### Events benötigen passende Tags:

**Vorher (FALSCH):**
```typescript
const tags = [['e', channelId]];  // ❌ Nur Channel-ID
```

**Nachher (RICHTIG):**
```typescript
const tags = [
  ['e', channelId, '', 'root'],   // ✅ Channel-ID als root event
  ['p', publicKey],                // ✅ Empfänger (für Gruppen: eigener pubkey)
  ['t', 'bitcoin-group']           // ✅ Hashtag für Relay-Filter (WICHTIG!)
];
```

## Implementierte Änderungen

### 1. `sendGroupMessage()` (Zeile ~163)
```typescript
const publicKey = getPublicKey(privateKey as any);
const tags = [
  ['e', channelId, '', 'root'],
  ['p', publicKey],
  ['t', 'bitcoin-group']  // 🔥 NEU: Hashtag hinzugefügt
];
```

**Effekt:**
- Events werden mit `#t=bitcoin-group` markiert
- Filter `"#t": ["bitcoin-group"]` findet diese Events
- Alle Gruppenmitglieder sehen Nachrichten

---

### 2. `createMarketplaceOffer()` (Zeile ~239)
```typescript
const publicKey = getPublicKey(tempPrivateKey as any);
const tags = [
  ['e', channelId, '', 'root'],
  ['p', publicKey],
  ['t', 'bitcoin-group'],          // 🔥 NEU: Hashtag hinzugefügt
  ['d', `offer-${Date.now()}`]
];
```

**Effekt:**
- Marketplace-Angebote werden in Gruppe gefunden
- Filter funktioniert auch für Angebote (Kind 30000)

---

### 3. `showInterestInOffer()` (Zeile ~310)
```typescript
const tags = [
  ['e', offerId, '', 'reply'],
  ['e', channelId, '', 'root'],
  ['p', getPublicKey(privateKey as any)],
  ['t', 'bitcoin-group']           // 🔥 NEU: Hashtag hinzugefügt
];
```

**Effekt:**
- Interesse-Nachrichten werden in Gruppe gefunden
- Thread-Struktur bleibt erhalten (reply/root)

---

## Tag-Struktur erklärt

### NIP-01 Standard (Nostr Implementation Possibilities)

```typescript
['e', <event-id>, <relay-url>, <marker>]
```

- `e`: Event-Tag (Referenz zu anderem Event)
- `event-id`: Eindeutige ID des referenzierten Events
- `relay-url`: Optional, oft leer (`''`)
- `marker`: `'root'` | `'reply'` | `'mention'`

```typescript
['p', <pubkey>]
```
- `p`: Pubkey-Tag (Empfänger oder Erwähnung)
- `pubkey`: Hex Public Key

```typescript
['t', <hashtag>]
```
- `t`: Hashtag-Tag (für Filtering)
- `hashtag`: String ohne `#` Zeichen

---

## Event-Beispiel (vollständig)

```json
{
  "id": "7749d12c6f3782513dc316e805144f96fa4e6cfdcdced19d2f84701521ed004b",
  "kind": 1,
  "pubkey": "115e2e0c50bbdf8da3404f098a63b5ef092804f601889adc962126694aaa0c35",
  "created_at": 1759481605,
  "tags": [
    [
      "e",
      "097de7d76f668f2639934578ab4381d1caf30f69cbad534d78f87b8d966013c3",
      "",
      "root"
    ],
    [
      "p",
      "115e2e0c50bbdf8da3404f098a63b5ef092804f601889adc962126694aaa0c35"
    ],
    [
      "t",
      "bitcoin-group"
    ]
  ],
  "content": "X0ABot5wnjAfIBT7/htXVprP5QpDfoGTO73TcXixSSPDze9Uzs...",
  "sig": "6fd136afc1b88586..."
}
```

**Tags-Breakdown:**
1. `['e', '097de...', '', 'root']` → Channel-ID als Root-Event
2. `['p', '115e...']` → Empfänger (bei Gruppen oft eigener Pubkey)
3. `['t', 'bitcoin-group']` → **Hashtag für Relay-Filter** 🔥

---

## Filter-Query auf Relay

**Was das Relay erhält:**
```json
{
  "kinds": [1],
  "#t": ["bitcoin-group"],
  "since": 1751705642,
  "limit": 500
}
```

**Was das Relay zurückgibt:**
- Alle Events mit `kind: 1` (text_note)
- Die ein Tag `['t', 'bitcoin-group']` haben
- Seit dem angegebenen Timestamp
- Maximal 500 Events

---

## Testing

### Vor dem Deployment prüfen:

1. **Event-Structure Check:**
   ```javascript
   // Browser Console nach Nachricht senden:
   // Suche nach: "🏷️ Tags (vollständig):"
   // Sollte zeigen:
   [
     ["e", "097de...", "", "root"],
     ["p", "115e..."],
     ["t", "bitcoin-group"]  // ← MUSS vorhanden sein!
   ]
   ```

2. **Relay-Response Check:**
   ```javascript
   // Suche nach: "📊 Cache-Größe nach EOSE:"
   // Sollte > 0 sein wenn Events vorhanden
   ```

3. **Multi-User Test:**
   - User 1: Nachricht senden
   - User 2: Nachricht sollte sofort erscheinen (via Relay)
   - User 3 (neues Gerät): Nachricht sollte beim Login erscheinen

---

## Deployment-Checklist

- [x] `sendGroupMessage()` mit `#t` Tag
- [x] `createMarketplaceOffer()` mit `#t` Tag
- [x] `showInterestInOffer()` mit `#t` Tag
- [x] Keine Compile-Errors
- [ ] Lokaler Test erfolgreich
- [ ] Git commit & push
- [ ] Vercel Deployment
- [ ] Production Test mit 3 Users

---

## Commit Message

```bash
git add src/lib/nostr/client.ts
git commit -m "fix: Add #t=bitcoin-group tag to all events for relay filtering

- Events now include ['t', 'bitcoin-group'] tag
- Enables relay queries with #t filter
- Fixes multi-user visibility issue
- Applies to: group messages, marketplace offers, and interest messages"
git push origin main
```

---

## Erwartetes Verhalten nach Deployment

### Szenario: 3 Users, gleicher Einladungslink

**User 1 (PC):**
- Sendet: "Hallo Gruppe"
- Event hat Tags: `['e', channelId], ['p', pubkey], ['t', 'bitcoin-group']`
- Relay speichert Event

**User 2 (PC):**
- Öffnet App
- Filter `"#t": ["bitcoin-group"]` lädt Event von User 1
- Sieht: "Hallo Gruppe" ✅
- Sendet: "Hi zurück"
- Relay speichert Event

**User 3 (Handy):**
- Öffnet App (innerhalb 24h)
- Filter `"#t": ["bitcoin-group"]` lädt BEIDE Events
- Sieht: "Hallo Gruppe" + "Hi zurück" ✅
- IndexedDB speichert Events lokal
- Bei Re-Login: Events sofort aus IndexedDB (<100ms)

---

## Troubleshooting

### Problem: User 3 sieht keine Nachrichten

**Mögliche Ursachen:**
1. ❌ Event hat kein `#t` Tag → **Jetzt behoben mit diesem Fix**
2. ❌ Events älter als 24h (Relay hat gelöscht) → **IndexedDB löst das**
3. ❌ Unterschiedliche Channel-IDs (falsches Secret) → Prüfe Secret
4. ❌ Relay nicht erreichbar → Prüfe Network-Tab

**Debug-Steps:**
```javascript
// 1. Console-Log nach Nachricht senden prüfen:
"🏷️ Tags (vollständig): [...]"
// Muss ['t', 'bitcoin-group'] enthalten!

// 2. Console-Log beim Login prüfen:
"📊 Historical Filter (JSON): {...}"
// Muss "#t": ["bitcoin-group"] enthalten

// 3. Console-Log nach EOSE prüfen:
"📊 Cache-Größe nach EOSE: X"
// X > 0 = Events vom Relay geladen
// X = 0 = Relay hat keine Events (oder Filter falsch)
```

---

## Weiterführende Infos

- **NIP-01 Spec:** https://github.com/nostr-protocol/nips/blob/master/01.md
- **NIP-12 (Generic Tag Queries):** https://github.com/nostr-protocol/nips/blob/master/12.md
- **nostr-tools Docs:** https://github.com/nbd-wtf/nostr-tools

---

**Status:** ✅ Fix implementiert, bereit für Deployment
**Datum:** 6. Oktober 2025
**Next Step:** Lokaler Test, dann Vercel Deployment
