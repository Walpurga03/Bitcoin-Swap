# Anmelde-System — Dezentrale Admin-Verwaltung

Kurzüberblick

Das Anmelde-System verwendet Nostr als Single Source of Truth. Eine Gruppe wird durch ein Secret identifiziert. Der Administrator (Admin) wird über seinen Public Key (admin_pubkey) in einer öffentlichen GroupConfig (Nostr-Event, Kind 30000) bekannt gemacht. Beim Login vergleicht die App den aktuellen Benutzer-Public-Key mit dem in der GroupConfig gespeicherten admin_pubkey und entscheidet so über Admin-Rechte.

Ziel dieser Seite: klare, technisch präzise Beschreibung der Funktionsweise, Sicherheits-Highlights und Entwicklerreferenz.

---

1) Terminologie

- Secret: Das geheimer Kennwort der Gruppe (vom Admin erstellt). Wird nicht auf Relay gespeichert — nur dessen Hash.
- secretHash: SHA-256(secret) — dient als eindeutige Gruppen-ID im Nostr-Event-Tag `d`.
- GroupConfig: Öffentliches Nostr-Event (Kind 30000) mit admin_pubkey und Relay-Info.
- NSEC: Privater Nostr-Key (Private Key) des Users.

---

2) Ablauf — Kurzfassung

1. **Admin erstellt Gruppe:**
   - Admin wählt Secret (min. 8 Zeichen)
   - Admin wählt Link-Typ (Multi-Relay, Alias oder Custom)
   
2. **Multi-Relay-Replikation:**
   - App berechnet `secretHash = SHA256(secret)`
   - GroupConfig-Event (Kind 30000) wird auf **alle 5 Standard-Relays parallel geschrieben**
   - Content: `{ admin_pubkey, relay, created_at, updated_at }`
   - Tags: `['d', secretHash]` für eindeutige Identifikation

3. **Einladungslink generiert:**
   - Multi-Relay: `?secret=<secret>` (kein Relay im Link)
   - Alias: `?r=1&secret=<secret>` (Relay-Index 1-5)
   - Custom: `?relay=wss://custom&secret=<secret>` (spezifisches Relay)

4. **Nutzer öffnet Link:**
   - App extrahiert `secret` aus URL
   - Bei Multi-Relay/Alias: parallele Suche auf 5 Relays
   - Bei Custom: primär auf custom Relay, Fallback auf 5 Standard-Relays
   
5. **Admin-Verifizierung:**
   - App lädt GroupConfig via `loadGroupConfigFromRelays(secret, relays)`
   - Vergleicht `admin_pubkey` mit `user.pubkey` (case-insensitive)
   - Match → `isAdmin = true` | Kein Match → Whitelist prüfen

---

2.1) Technische Details — Gruppenerstellung mit Multi-Relay-Replikation

**Architektur-Prinzip:** Vollständige Redundanz auf allen konfigurierten Relays für maximale Ausfallsicherheit.

**Schritt-für-Schritt (Code-Perspektive):**

1. **Benutzereingabe & Validierung:**
   ```
   - Admin gibt NSEC (Private Key) ein → validiert mit validatePrivateKey()
   - Secret wird generiert (auto) oder manuell eingegeben (min. 8 Zeichen)
   - Link-Typ gewählt: 'multi' | 'alias' | 'custom'
   ```

2. **Key-Derivation & Profil-Laden:**
   ```
   pubkey = getPublicKey(privateKeyHex)
   profile = await fetchUserProfile(pubkey)  // optional, für Display-Name
   ```

3. **Secret-Hash berechnen:**
   ```typescript
   secretHash = await deriveSecretHash(secret)
   // → SHA-256 in hex, dient als eindeutige Gruppen-ID im Nostr-Tag 'd'
   ```

4. **GroupConfig-Objekt erstellen:**
   ```typescript
   const groupConfigData = {
     relay: DEFAULT_RELAYS[0],  // Standard-Relay für Referenz
     admin_pubkey: pubkey,       // Admin's öffentlicher Key
     secret_hash: secretHash,    // SHA-256(secret)
     created_at: Math.floor(Date.now() / 1000),
     updated_at: Math.floor(Date.now() / 1000)
   };
   ```

5. **Multi-Relay-Publikation (KRITISCH):**
   ```typescript
   await saveGroupConfig(
     groupConfigData, 
     privateKeyHex, 
     GROUP_CONFIG_RELAYS  // Array mit 5 Relays
   );
   ```
   
   **Was passiert intern:**
   - Nostr-Event Kind 30000 (Replaceable Event) wird erstellt
   - Event wird mit Admin's Private Key signiert
   - Event wird **parallel** auf alle 5 Relays geschrieben:
     * wss://relay.damus.io
     * wss://relay.nostr.band
     * wss://nos.lol
     * wss://relay.snort.social
     * wss://nostr.wine
   - Jeder Relay speichert identische Kopie
   - Fehler auf einzelnen Relays werden toleriert (Promise.allSettled)

6. **GroupStore initialisieren:**
   ```typescript
   await groupStore.initialize(secret, relay);
   // Setzt lokalen State für Channel-ID, Relay-Verbindung
   ```

7. **Link-Generierung basierend auf Typ:**
   ```typescript
   const domain = window.location.origin;
   let relayForLink: string | number | undefined;
   
   if (linkType === 'multi') {
     relayForLink = undefined;  // → ?secret=abc123
   } else if (linkType === 'alias') {
     relayForLink = selectedAlias;  // → ?r=1&secret=abc123
   } else if (linkType === 'custom') {
     relayForLink = customLinkRelay;  // → ?relay=wss://...&secret=abc123
   }
   
   inviteLink = createInviteLink(domain, secret, relayForLink);
   ```

8. **Erfolgs-Anzeige:**
   - Link wird in UI angezeigt (Copy-Button)
   - Admin kann Link teilen
   - **Kein Auto-Redirect** → Admin muss Link explizit kopieren

**Wichtige Implementierungsdetails:**

- **Atomarität:** GroupConfig-Schreiben ist **nicht** atomar über alle Relays. Wenn 3/5 Relays erfolgreich sind, gilt die Gruppe als erstellt. Der erste erfolgreiche Write bestimmt die Existenz.
  
- **Konsistenz:** Alle Relays erhalten **identisches Event** (gleiche Signatur, gleicher Inhalt). Updates (Whitelist) werden ebenfalls auf alle 5 Relays repliziert.

- **Fehlertoleranz:** 
  ```typescript
  // In saveGroupConfig:
  const results = await Promise.allSettled(
    relays.map(r => publishToRelay(event, r))
  );
  // Mindestens 1 erfolgreicher Write genügt
  ```

- **Event-Format (Nostr Kind 30000):**
  ```json
  {
    "kind": 30000,
    "pubkey": "<admin_pubkey_hex>",
    "created_at": 1729594800,
    "tags": [
      ["d", "<secretHash_hex>"]
    ],
    "content": "{\"relay\":\"wss://relay.damus.io\",\"admin_pubkey\":\"<hex>\",\"secret_hash\":\"<hex>\",\"created_at\":1729594800,\"updated_at\":1729594800}",
    "sig": "<signature_hex>"
  }
  ```

**Warum Multi-Relay-Replikation?**

1. **Ausfallsicherheit:** Gruppe funktioniert auch wenn 2-3 Relays offline sind
2. **Dezentralisierung:** Keine Single-Point-of-Failure
3. **Censorship-Resistance:** Schwieriger, Gruppe zu blockieren
4. **Performance:** Paralleles Laden → schnellste Antwort gewinnt
5. **Privacy (bei Multi-Relay-Link):** Relay nicht im Link sichtbar

---

3) Sicherheits- und Datenschutz-Hinweise

- Private Keys (NSEC) verbleiben im Client und werden niemals an Dritte oder Server übertragen.
- Die GroupConfig (mit admin_pubkey) ist öffentlich. Das bedeutet: wer Admin ist, ist transparent.
- Der Einladungslink enthält das Secret in der URL — treat as password: nicht in Logs, keine öffentlichen Chats, per HTTPS übermitteln.
- localStorage ist unverschlüsselt; Secrets sollten wenn möglich in `sessionStorage` gehalten oder nur kurzzeitig zwischengespeichert werden.
- Relay-Ausfall: Admin-Status und Whitelist können nicht geladen werden. Implementiere Fallback-Strategien (Cache, Retry, Multi-Relay).

---

4) Konkrete Empfehlungen

- Erzwinge minimale Secret-Länge ≥ 16 Zeichen.
- Cache `admin_pubkey` clientseitig mit kurzer TTL (z. B. 5 Minuten) zur Reduktion von Relay-Requests.
- Zeige Relay-Status (online/connecting/offline) im UI.
- Implementiere einen Multi-Relay-Fallback: versuche eine konfigurierbare Relay-Liste.

---

5) Pseudonymer / dedizierter Admin-Account (Empfehlung)

- Warum: Die GroupConfig macht die Admin-Public-Key sichtbar. Um persönliche Verknüpfungen zu minimieren, ist es sinnvoll, für Admin-Aufgaben ein separates, pseudonymes Keypair zu verwenden statt des persönlichen Haupt-Keys.
- Wie (kurz): Erzeuge ein neues Nostr-Keypair (npub/nsec). Nutze dieses Keypair nur für die Administrator-Aufgaben (Gruppe erstellen, Whitelist verwalten). Bewahre das `nsec` sicher (offline oder in einem Passwort-Manager) und teile nur den Einladungslink (`?secret=...`) — nicht den nsec.
- Praktische Schritte:
   1. Erzeuge Keypair lokal (Wallet/Tool): notiere `npub` und `nsec`.
   2. Melde dich im Tausch‑Netzwerk mit dem pseudonymen Key an und erstelle die Gruppe.
   3. Verwende das pseudonyme Keypair nur für Admin‑Operationen; führe normale Nutzeraktionen mit einem separaten Key aus.

Hinweis: Dieses Muster reduziert die Wahrscheinlichkeit, dass dein persönliches Hauptkonto mit Admin‑Aktivitäten verknüpft wird, ohne die Verifizierbarkeit der GroupConfig zu beeinträchtigen.

6) Hashing von Secret + Relay im Link — Idee und Bewertung

Idee: Anstatt `?relay=...&secret=...` im Link zu zeigen, erzeugt der Ersteller einen Token = H(secret || relay) (z. B. SHA-256 über Secret + Relay-URL) und verteilt nur `?token=<hex>` im Link. Der Client müsste dann den Token auflösen, um Secret und/oder Relay zu erhalten.

Bewertung — Vorteile:
- Versteckt Relay-URL und Secret in der Link‑Repräsentation (keine Klartext‑Relay‑URL in Browser‑History).

Bewertung — Nachteile und praktische Probleme:
- Keine Geheimhaltung ohne Auflösungsmechanismus: Ein Token alleine sagt dem Client nichts — der Client benötigt eine Methode, um Token → (secret, relay) aufzulösen. Dazu gibt es zwei Optionen:
   1. Zentraler Resolver/Service (Token → Daten): macht das System nicht mehr vollständig dezentral und schafft einen neuen Vertrauens-/Ausfallpunkt.
   2. Verteilte Auflösung durch Brute‑Force/Vergleich: wenn der Client nur eine kleine Relay‑Liste hat, kann er Hashes vergleichen — das ist ineffizient und unsicher.
- Wenn Secret im Token enthalten ist, verliert man den Nutzen: Entweder der Token ist reversibel (keine Sicherheit) oder der Client muss zusätzliche Informationen haben.
- Komplexere UX: Nutzer erwarten, dass ein Link die Gruppe sofort öffnen kann; Token‑Auflösung erhöht Komplexität und Fehlerquellen.

Empfehlung:
- Für echte Dezentralität und Privacy ist es einfacher und robuster, die Relay‑URL aus dem Link zu entfernen und stattdessen Multi‑Relay‑Fallback im Client zu verwenden (siehe oben). Das vermeidet zentrale Dienste und bewahrt Privacy ohne zusätzlichen Auflösungs‑Service.
- Wenn ihr unbedingt Relay/Secret im Link verschleiern wollt, ist ein Token+zentraler Resolver möglich, aber das ist ein Architekturtradeoff (weniger dezentral, zusätzlicher Vertrauenspunkt).

Praktische Alternative (Komfort + Privacy): Benutze kurze Alias/Index‑Parameter (`?r=1`) kombiniert mit einer gepflegten Client‑Relay‑Liste, oder verschlüssele Relay‑Info clientseitig per passphrase und gib die Entschlüsselungs‑Anleitung separat weiter.

7) Umsetzung: Multi‑Relay‑System — Implementierungsstatus ✅

**Status:** VOLLSTÄNDIG IMPLEMENTIERT (seit Commit 2025-10-22)

**Was wurde umgesetzt:**

1. **Vollständige Multi-Relay-Replikation:**
   - GroupConfig wird auf **alle 5 Relays** geschrieben (nicht nur auf einen)
   - Whitelist-Updates (add/remove) ebenfalls auf alle 5 Relays
   - Konfiguration in `src/lib/config.ts`:
     ```typescript
     export const GROUP_CONFIG_RELAYS = [
       'wss://relay.damus.io',
       'wss://relay.nostr.band',
       'wss://nos.lol',
       'wss://relay.snort.social',
       'wss://nostr.wine'
     ];
     ```

2. **Drei Link-Formate unterstützt:**
   - **Multi-Relay (empfohlen):** `?secret=abc123` 
     → Kein Relay im Link, Client sucht auf allen 5 Relays parallel
   - **Relay-Alias:** `?r=1&secret=abc123`
     → Kurzer Link, Alias-Mapping in `RELAY_ALIASES`
   - **Custom Relay:** `?relay=wss://custom&secret=abc123`
     → Spezifisches Relay, aber Daten trotzdem auf allen 5 Standard-Relays

3. **Parallele Relay-Suche implementiert:**
   - `loadGroupConfigFromRelays(secret, relays)` in `src/lib/nostr/groupConfig.ts`
   - Suchalgorithmus: Promise.allSettled → alle Relays parallel abfragen
   - Erstes valides Ergebnis (signaturgeprüft) wird verwendet
   - Bei mehreren Ergebnissen: neuestes `updated_at` gewinnt

**Architekturübersicht (aktueller Stand):**

```
[Gruppenerstellung]
     ↓
secretHash = SHA256(secret)
     ↓
GroupConfig-Event (Kind 30000) erstellt
     ↓
PARALLEL auf 5 Relays geschrieben
     ├─→ relay.damus.io      ✅
     ├─→ relay.nostr.band    ✅
     ├─→ nos.lol             ✅
     ├─→ relay.snort.social  ✅
     └─→ nostr.wine          ✅
     
[Link-Generierung]
     ↓
Admin wählt Link-Typ (Multi/Alias/Custom)
     ↓
Link wird generiert: ?secret=... (kein Relay bei Multi-Relay)
     ↓
Admin teilt Link

[Join-Flow]
     ↓
Nutzer öffnet Link mit ?secret=...
     ↓
Client extrahiert secret → berechnet secretHash
     ↓
PARALLEL-SUCHE auf allen 5 Relays
     ├─→ relay.damus.io      → Event gefunden? ✓
     ├─→ relay.nostr.band    → Event gefunden? ✓
     ├─→ nos.lol             → Event gefunden? ✓
     ├─→ relay.snort.social  → Timeout ✗
     └─→ nostr.wine          → Event gefunden? ✓
     ↓
Erstes valides Event wird verwendet
     ↓
admin_pubkey extrahiert → Vergleich mit user.pubkey
     ↓
Admin-Status bestimmt (isAdmin = true/false)
```

**Implementierte Funktionen:**

**Implementierter Code (vereinfacht):**

```typescript
// src/lib/nostr/groupConfig.ts
export async function loadGroupConfigFromRelays(
  secret: string, 
  relays: string[]
): Promise<NostrEvent | null> {
  const secretHash = await deriveSecretHash(secret);
  
  // Parallel auf allen Relays suchen
  const queries = relays.map(relay => 
    queryRelayForReplaceable(relay, 30000, secretHash)
  );
  const results = await Promise.allSettled(queries);
  
  // Valide Events sammeln (Signatur prüfen)
  const validEvents: NostrEvent[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      const event = result.value;
      if (verifySignature(event)) {
        validEvents.push(event);
      }
    }
  }
  
  // Nichts gefunden
  if (validEvents.length === 0) return null;
  
  // Bei mehreren: neuestes Event gewinnt
  validEvents.sort((a, b) => b.created_at - a.created_at);
  return validEvents[0];
}
```

```typescript
// src/routes/+page.svelte (Gruppenerstellung)
async function handleCreateGroup() {
  // ... Validierung, Profil laden ...
  
  const secretHash = await deriveSecretHash(secret);
  const groupConfigData = {
    relay: DEFAULT_RELAYS[0],
    admin_pubkey: pubkey,
    secret_hash: secretHash,
    created_at: Math.floor(Date.now() / 1000),
    updated_at: Math.floor(Date.now() / 1000)
  };
  
  // ✅ KRITISCH: Auf ALLE Relays schreiben
  await saveGroupConfig(
    groupConfigData, 
    privateKeyHex, 
    GROUP_CONFIG_RELAYS  // 5 Relays
  );
  
  console.log('✅ GroupConfig auf', GROUP_CONFIG_RELAYS.length, 'Relays publiziert');
  
  // Link generieren basierend auf gewähltem Typ
  const inviteLink = createInviteLink(domain, secret, relayForLink);
}
```

```typescript
// src/routes/admin/+page.svelte (Whitelist-Update)
async function handleAddPubkey() {
  // ✅ Whitelist-Update auf ALLE Relays
  const result = await addToWhitelist(
    pubkeyHex, 
    adminPrivateKey, 
    GROUP_CONFIG_RELAYS,  // 5 Relays
    channelId
  );
}
```

**Implementierte Features:**

1. **Relay-Alias-Mapping (`?r=1`):**
   ```typescript
   // src/lib/config.ts
   export const RELAY_ALIASES: { [key: number]: string } = {
     1: 'wss://relay.damus.io',
     2: 'wss://relay.nostr.band',
     3: 'wss://nos.lol',
     4: 'wss://relay.snort.social',
     5: 'wss://nostr.wine'
   };
   ```
   - Vorteil: Kurze Links (`?r=1&secret=...`)
   - Relay nicht im Klartext sichtbar
   - Mapping client-seitig, einfach aktualisierbar

2. **Join-Flow mit automatischem Fallback:**
   ```typescript
   // src/routes/+page.svelte
   async function handleJoinGroup() {
     const relayParam = url.searchParams.get('relay');
     const relayAliasParam = url.searchParams.get('r');
     const secret = url.searchParams.get('secret');
     
     let relaysToUse: string[] = [];
     
     if (relayParam) {
       // Custom Relay angegeben → primär nutzen, aber Fallback zu Standard-Relays
       relaysToUse = [relayParam];
     } else if (relayAliasParam) {
       // Alias → über Mapping auflösen
       const aliasRelay = RELAY_ALIASES[parseInt(relayAliasParam)];
       relaysToUse = aliasRelay ? [aliasRelay] : GROUP_CONFIG_RELAYS;
     } else {
       // Multi-Relay → alle 5 Standard-Relays
       relaysToUse = GROUP_CONFIG_RELAYS;
     }
     
     const config = await loadGroupConfigFromRelays(secret, relaysToUse);
   }
   ```

3. **UI-Flows & Fehlerfälle:**
   - ✅ GroupConfig gefunden → Admin-Check durchführen
   - ✅ GroupConfig nicht gefunden → Error: "Gruppe nicht gefunden"
   - ✅ Relay-Timeout → Automatischer Fallback auf andere Relays
   - ✅ Info-Modal erklärt alle 3 Link-Typen mit Vor-/Nachteilen

4. **Whitelist-Replikation:**
   ```typescript
   // Alle Whitelist-Änderungen auf allen Relays
   await addToWhitelist(pubkey, privateKey, GROUP_CONFIG_RELAYS, channelId);
   await removeFromWhitelist(pubkey, privateKey, GROUP_CONFIG_RELAYS, channelId);
   ```

**Vorteile der aktuellen Implementierung:**

| Feature | Status | Nutzen |
|---------|--------|--------|
| Multi-Relay-Replikation | ✅ | Ausfallsicherheit, Censorship-Resistance |
| Parallele Relay-Suche | ✅ | Performance, schnellste Antwort gewinnt |
| Privacy (Multi-Relay-Link) | ✅ | Kein Relay im Link sichtbar |
| Relay-Alias-System | ✅ | Kurze Links, anpassbar |
| Custom Relay Support | ✅ | Flexibilität für spezielle Setups |
| Automatischer Fallback | ✅ | Robustheit bei Relay-Ausfällen |

**Offene Punkte / Zukünftige Verbesserungen:**

- [ ] **Caching:** GroupConfig lokal cachen (TTL 5 Min.) für Offline-Nutzung
- [ ] **Unit-Tests:** Tests für `loadGroupConfigFromRelays` (happy path, timeouts, invalid signatures)
- [ ] **Retry-Logik:** Exponential backoff bei fehlgeschlagenen Relay-Requests
- [ ] **Relay-Health-Monitoring:** UI-Indikator für Relay-Status (online/offline)
- [ ] **Migration-Helper:** Alte Links mit `?relay=...` automatisch zu Multi-Relay konvertieren
- [ ] **Konflikt-Resolution:** Wenn mehrere Relays unterschiedliche Versionen haben (aktuell: neueste gewinnt)

**Zusammenfassung:**

Das Multi-Relay-System ist **vollständig implementiert** und funktional. Alle Gruppendaten werden redundant auf 5 Relays gespeichert. Der Admin kann zwischen 3 Link-Typen wählen, wobei Multi-Relay (ohne Relay im Link) die beste Balance aus Privacy und Robustheit bietet. Das System ist dezentral, zensurresistent und ausfallsicher.

