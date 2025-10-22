# Whitelist-System — Zugriffskontrolle per Public Key

Kurzüberblick

Das Whitelist-System erlaubt einem Gruppen-Admin, eine Liste von Public Keys zu verwalten, die Zugriff auf die Gruppe erhalten. Die Whitelist wird als signiertes Nostr-Event (Kind 30000) auf einem Relay gespeichert. Nur signierte Events des Admins werden akzeptiert.

---

1) Zweck

- Zugangsbeschränkung für private Gruppen
- Admin kontrolliert, welche Public Keys Zutritt erhalten
- Admin hat immer Zugriff (Bypass) — unabhängig von der Whitelist

---

2) Datenmodell (Event)

Whitelist-Event (Kind 30000):
```json
{
  "kind": 30000,
  "d": "whitelist-<channelId>",
  "content": {
    "pubkeys": ["hex1", "hex2", "..."],
    "admin_pubkey": "hex_admin",
    "updated_at": 1697123456
  },
  "tags": [["d","whitelist-<channelId>"],["t","bitcoin-whitelist"]]
}
```

- `d` (Tag): eindeutige ID pro Gruppe (z. B. abgeleitet aus dem Group Secret)
- `content.pubkeys`: erlaubte Public Keys (hex)
- `admin_pubkey`: wer die Änderungen signieren darf

---

3) Zugriffslogik (konkret)

Beim Versuch eines Beitritts gilt:

```ts
if (isAdmin(userPubkey, groupConfig)) {
  grantAccess(); // Admin-Bypass
} else if (whitelist.includes(userPubkey)) {
  grantAccess();
} else {
  denyAccess();
}
```

- `isAdmin` prüft: `userPubkey.toLowerCase() === groupConfig.admin_pubkey.toLowerCase()`
- Whitelist-Events sind replaceable: das aktuellste Event (per Tag `d`) gilt.

---

4) Admin-Operationen

- `addToWhitelist(pubkey)` → neues Event mit erweitertem `pubkeys` Array, signiert mit Admin-Private-Key
- `removeFromWhitelist(pubkey)` → neues Event ohne den Key, signiert
- `loadWhitelist(channelId)` → lädt das aktuelle Event vom Relay

Implementiere Signatur-Prüfung serverseitig/Clientseitig vor Annahme der Änderung.

---

5) Sicherheit

- Änderungen nur mit gültiger Signatur des Admins möglich.
- Whitelist ist öffentlich einsehbar — Transparenz ist beabsichtigt.
- Relay-Abhängigkeit: Änderungen erfordern ein funktionierendes Relay. Lokaler Cache kann temporär greifen.

Risiken & Gegenmaßnahmen:
- Risiko: Admin-Private-Key kompromittiert → sofort neuen Admin/Gruppe erstellen.
- Risiko: Relay-Ausfall → implementiere Multi-Relay-Fallback und Retry-Logik.

---

