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

2) Ablauf

1. Admin erstellt Gruppe: Secret wählen, Relay wählen.
2. App berechnet secretHash = SHA256(secret) und erstellt ein signiertes GroupConfig-Event (Kind 30000) auf dem Relay:
   - tags: `['d', secretHash]`
   - content: { admin_pubkey, relay, created_at }
3. Admin teilt Einladungslink: `https://domain/?relay=<wss://...>&secret=<secret>`
4. Nutzer öffnet Link, verbindet Wallet / gibt NSEC frei.
5. App: deriveSecretHash(secret) → loadGroupConfig(secretHash) → hole admin_pubkey.
6. App vergleicht admin_pubkey mit user.pubkey (case-insensitive).
   - Treffer → isAdmin = true
   - Kein Treffer → isAdmin = false → ggf. Whitelist prüfen

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

7) Umsetzung: Relay aus dem Link entfernen und Multi‑Relay‑Fallback

Ziel: Der Einladungslink enthält kein `relay=` mehr. Der Client löst die GroupConfig ausschließlich über eine konfigurierbare Relay‑Liste auf. Das erhöht Privacy, hält das System dezentral und vermeidet zentrale Resolver.

Architekturübersicht:
- Client hat eine konfigurierbare, ggf. update‑fähige Relay‑Liste (z. B. in `src/lib/config.ts`).
- Beim Öffnen eines Links mit `?secret=...` berechnet der Client `secretHash = sha256(secret)` und sucht die GroupConfig parallel auf mehreren Relays.
- Gefundene Events werden signaturgeprüft; das erste valide Ergebnis (oder das vertrauenswürdigste aus mehreren) wird verwendet.
- Falls nichts gefunden wird, zeigt der Client einen Hinweis und erlaubt manuelle Relay‑Angabe oder das Verwenden eines Alias (`?r=1` → Client‑Mapping).

Pseudocode (TypeScript‑Stil, Beispiel für `loadGroupConfig`):

```ts
async function loadGroupConfigFromRelays(secret: string, relays: string[]) {
   const secretHash = sha256Hex(secret);
   // query multiple relays in parallel
   const queries = relays.map(r => queryRelayForReplaceable(r, 30000, secretHash));
   const results = await Promise.allSettled(queries);

   // collect valid events, verify signatures
   const valid = [] as Event[];
   for (const res of results) {
      if (res.status === 'fulfilled' && res.value) {
         const ev = res.value;
         if (verifySignature(ev)) valid.push(ev);
      }
   }

   // choose best event (e.g. newest valid)
   if (valid.length === 0) return null;
   valid.sort((a,b) => b.created_at - a.created_at);
   return valid[0];
}
```

Alias/Index (`?r=1`)‑Option:
- Der Link kann optional `?r=1&secret=...` enthalten. Der Client hält ein Mapping `{ 1: 'wss://relay.primary' }` in der Konfiguration.
- Vorteil: kurze Links, Relay nicht direkt sichtbar. Nachteil: Mapping muss verteilt/aktualisiert werden.

UI‑Flows / Fehlerfälle:
- Wenn GroupConfig gefunden: normale Anmeldung prüfen (admin_pubkey vs user.pubkey).
- Wenn nicht gefunden und kein Alias: UI zeigt "Gruppe nicht gefunden — Relay angeben oder den Ersteller kontaktieren".
- Wenn Relay‑Requests fehlschlagen: retry/backoff + Fallback‑Relays anzeigen.

Caching & Offline:
- Cache zuletzt erfolgreiche `secretHash -> GroupConfig` Antworten lokal (TTL z. B. 5 Minuten). Das reduziert Relay‑Load und ermöglicht begrenzte Offline‑Nutzung.
- Achtung: Cached GroupConfig ist öffentlich; cache‑Inhalte sollten bei sicherheitsrelevanten Aktionen verifiziert werden (z. B. Re‑check bevor kritische Admin‑Änderung).

Testing & Migration:
- Schreibe Unit‑Tests für `loadGroupConfigFromRelays` (happy path, no‑result, invalid signatures, relay timeouts).
- UX: Führe eine Migrationshilfe ein, die vorhandene Links mit `relay=` erkennt und beim ersten Öffnen in die neue Flow (Multi‑Relay) überführt.

Nächste Schritte im Projekt (Vorschlag):
1. Entferne Relay‑Parsing aus Link‑Handler (`src/routes/+page.svelte`), akzeptiere optional `r=` Alias.
2. Implementiere `loadGroupConfigFromRelays` in `src/lib/nostr/groupConfig.ts` und exportiere es.
3. Ergänze `src/lib/config.ts` mit einer konfigurierbaren Relay‑Liste und optionalem Alias‑Mapping.
4. Füge Tests und UI‑Fehlermeldungen hinzu.

Mit diesen Änderungen ist der Link sauber (nur `?secret=...` oder `?r=1&secret=...`) und die Client‑Logik übernimmt die Relay‑Auflösung dezentral, robust und datenschutzfreundlich.

