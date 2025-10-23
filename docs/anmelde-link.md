## 🎯 Konzept-Übersicht##

**Ziel:** Ein klarer, dreistufiger Workflow für Gruppenerstellung und Zugriffskontrolle.

### Die drei Phasen:### Die drei Phasen:

1. **Gruppenerstellung (nur Admin)** → Admin erstellt Gruppe mit Secret und Relay

2. **Whitelist-Verwaltung (nur Admin)** → Admin erstellt Whitelist, erhält Einladungslink

3. **Login & Zugang (alle User)** → User nutzen Link, melden sich an, Zugang wird geprüft

------

## 📋 Phase 1: Gruppenerstellung (Admin-Seite)##

**Wer:** Nur der Admin | 
**Wo:** Startseite / Create-Gruppe-Seite


**Eingaben:**

- NSEC (Private Key des Admins)

- Secret (Gruppen-Passwort, min. 16 Zeichen)

- Relay-Auswahl (welcher Nostr-Server genutzt wird)


**Was die App macht:**
1. Admin meldet sich mit NSEC an

2. Secret wird validiert (Länge, Sicherheit)

3. Relay wird ausgewählt

4. GroupConfig-Event (Kind 30000) wird auf das gewählte Relay publiziert

5. **Wichtig:** Noch KEINE Whitelist!


**Dann:** Admin → direkt in den Angebotsraum → sieht Button **"Whitelist erstellen"**

------


## 📋 Phase 2: Whitelist-Verwaltung (Admin im Angebotsraum)


**Wer:** Nur der Admin
**Wo:** Angebotsraum



**Admin sieht Button:**

- Falls keine Whitelist: **"Whitelist erstellen"**

- Falls vorhanden: **"Whitelist verwalten"**



**Im Whitelist-Modal:**

1. NPUBs hinzufügen (Eingabefeld + "Hinzufügen"-Button)

2. Liste aller erlaubten NPUBs (mit "Löschen"-Button)

3. Einladungslink: `https://domain/?secret=xyz`

4. QR-Code anzeigen

5. Buttons: "Link kopieren", "Fertig"

------



## 📋 Phase 3: Login & Zugang (User-Seite)



**Wer:** Alle User
**Wo:** Login-Seite (vom Einladungslink/QR)


**Ablauf:**


**1. User öffnet Link/QR-Code**

- Link enthält nur das Secret

- App lädt Login-Seite


**2. Login-Formular mit Sicherheitshinweis:***


🔒 **Empfehlung:** "Erstelle ein neues Schlüsselpaar nur für diese App"🔒 


**Option A: Neues Schlüsselpaar generieren**

- Button: "🔑 Neues Schlüsselpaar erstellen"

- App generiert NSEC + NPUB

- Anzeige mit Kopieren-Button

- Hinweis: "Speichere deinen NSEC sicher!"


**Option B: Bestehendes NSEC**

- Eingabefeld + Warnung: "⚠️ Nur separates NSEC verwenden"

- Button: "Anmelden"


**3. App prüft Zugang:**

- Secret aus Link → SHA-256-Hash → Event suchen

- GroupConfig laden → Admin-NPUB + Relay auslesen

- Whitelist laden

- **Prüfung 1:** Ist User = Admin? → JA: Zugang mit Admin-Rechten

- **Prüfung 2:** Steht User auf Whitelist? → JA: Zugang als Teilnehmer

- **Sonst:** Zugang verweigert



**4. Nach erfolgreicher Anmeldung:**

- → Angebotsraum

- Admin sieht: "Whitelist verwalten"-Button

- User sieht: Nur Angebote (kein Button)


------



## 🔧 Technische Unterschiede zur aktuellen Implementierung



| Aktuell | Neu |### Was sich ändert:

|---------|-----|

| Gruppenerstellung → direkt zur Gruppe | Gruppenerstellung → Angebotsraum → "Whitelist erstellen"-Button |

| Whitelist ist optional | Whitelist ist expliziter Schritt im Admin-Workflow |
|---------|-----|

| Einladungslink bei Gruppenerstellung | Einladungslink erst wenn Whitelist erstellt |
| Gruppenerstellung → direkt zur Gruppe | Gruppenerstellung → in Angebotsraum → "Whitelist erstellen"-Button |

| Admin-Seite = separate Route `/admin` | Whitelist-Verwaltung = Modal im Angebotsraum |
| Whitelist ist optional | Whitelist ist expliziter Schritt im Admin-Workflow |

| Join-Seite: "Create" und "Join"-Tabs | Login-Seite: NUR Login-Formular |
| Einladungslink wird bei Gruppenerstellung generiert | Einladungslink wird erst generiert, wenn Whitelist erstellt wird |

| Admin-Seite ist separate Route `/admin` | Whitelist-Verwaltung ist Modal/Overlay im Angebotsraum |

**Was bleibt gleich:**| Join-Seite hat "Create" und "Join"-Tabs | Login-Seite hat NUR Login-Formular (keine "Create"-Option) |

- ✅ Secret-Hash für Gruppenerkennung

- ✅ Admin-Verifizierung über Signatur### Was bleibt gleich:

- ✅ Whitelist als Nostr-Event

- ✅ Nostr-Event-Struktur (Kind 30000)

- ✅ Secret-Hash für Gruppenerkennung

- ✅ Admin-Verifizierung über Signatur

---

- ✅ Whitelist als Nostr-Event

- ✅ Nostr-Event-Struktur (Kind 30000)

## 🎨 UI/UX-Flow

---

### Admin-Flow:

## 🎨 UI/UX-Flow (Schritt für Schritt)

```

1. Startseite → [Gruppe erstellen]### Admin-Flow:

   - NSEC eingeben

   - Secret festlegen```

   - Relay auswählen1. Startseite

   ↓   ↓

2. Angebotsraum (leer) → [Whitelist erstellen - Button]   [Gruppe erstellen]

   ↓   - NSEC eingeben

3. Whitelist-Modal   - Secret festlegen

   - NPUB hinzufügen   - Relay auswählen

   - Einladungslink + QR-Code   - Button: "Gruppe erstellen"

   ↓   ↓

4. Angebotsraum (mit Whitelist)2. Angebotsraum (leer, noch keine Whitelist)

   - Button: "Whitelist verwalten" (jederzeit)   ↓

```   [Whitelist erstellen - Button sichtbar]

   - Klick öffnet Whitelist-Modal

### User-Flow:   ↓

3. Whitelist-Modal

```   - NPUB hinzufügen

1. Einladungslink / QR-Code erhalten   - Einladungslink anzeigen

   ↓   - QR-Code anzeigen

2. Login-Seite   - Button: "Fertig"

   🔒 Sicherheitshinweis   ↓

   → Option A: Schlüsselpaar generieren4. Angebotsraum (mit Whitelist)

   → Option B: NSEC eingeben   - Button: "Whitelist verwalten" (weiterhin sichtbar)

   ↓   - Admin kann jederzeit Whitelist bearbeiten

3. Zugang wird geprüft```

   - Admin? → Ja/Nein

   - Whitelist? → Ja/Nein### User-Flow:

   ↓

4a. Zugang erlaubt → Angebotsraum```

    Admin: + Whitelist-Button1. User erhält Einladungslink / QR-Code

    User: nur Angebote   ↓

    ↓2. Login-Seite öffnet sich automatisch

4b. Zugang verweigert → Fehlermeldung   ↓

```   [Sicherheitshinweis]

   "🔒 Empfehlung: Erstelle ein neues Schlüsselpaar nur für diese App"

---   ↓

   [Login-Formular - Zwei Optionen]

## 🔐 Sicherheits-Konzept   Option A: Button "Neues Schlüsselpaar generieren"

   Option B: Eingabefeld "NSEC eingeben" + Warnung

**Admin-Rechte:**   ↓

- Nur Admin kann Whitelist bearbeiten3. Zugang wird geprüft

- Prüfung: `user.npub === groupConfig.admin_pubkey`   - Admin? → Ja/Nein

- Admin-NPUB ist öffentlich in GroupConfig   - Auf Whitelist? → Ja/Nein

   ↓

**Whitelist-Prüfung:**4a. Zugang erlaubt → Angebotsraum

- Jeder Login prüft: Steht NPUB auf Whitelist?    - Admin: sieht "Whitelist verwalten"-Button

- Änderungen werden live synchronisiert    - User: sieht nur Angebote

    ↓

**Secret-Sicherheit:**4b. Zugang verweigert → Fehlermeldung

- Secret wird **nie im Klartext** gespeichert → nur SHA-256-Hash    - "Du bist nicht auf der Whitelist"

- SHA-256 = Einweg-Funktion (Hash → Secret unmöglich)    - "Kontaktiere den Admin"

- Ohne originales Secret: Kein Gruppenzugang```

- Secret steht nur: Im Einladungslink + bei Admin/Usern

- Best Practice: Min. 8 Zeichen, zufällig---



---## 🔐 Sicherheits-Konzept



## 🔍 Technische Details: Nostr-Events**Admin-Rechte:**

- Nur Admin kann Whitelist bearbeiten

### GroupConfig-Event (Kind 30000):- Prüfung: `user.npub === groupConfig.admin_pubkey`

```json- Admin-NPUB ist öffentlich in GroupConfig

{

  "kind": 30000,**Whitelist-Prüfung:**

  "pubkey": "<admin_npub_hex>",- Jeder Login prüft: Steht NPUB auf Whitelist?

  "created_at": 1729612800,- Änderungen werden live synchronisiert

  "tags": [["d", "<sha256_hash_des_secrets>"]],

  "content": "{\"admin_pubkey\": \"npub1...\", \"relay\": \"wss://...\"}",**Secret-Sicherheit:**

  "sig": "<signatur>"- Secret wird **nie im Klartext** gespeichert → nur SHA-256-Hash

}- SHA-256 = Einweg-Funktion (Hash → Secret unmöglich)

```- Ohne originales Secret: Keine Gruppenzugang

- Secret steht nur: Im Einladungslink + bei Admin/Usern

**Felder:**- Best Practice: Min. 8 Zeichen, zufällig

- `kind: 30000` = Replaceable Event (überschreibbar)

- `pubkey` = Admin (wer hat Event erstellt?)---

- `tags: ["d", "hash"]` = Identifier (Secret-Hash, so findet App das Event)

- `content` = JSON mit admin_pubkey, relay, timestamp (öffentlich!)## � Technische Details: Nostr-Events im Detail

- `sig` = Signatur (beweist: vom Admin erstellt)

### GroupConfig-Event (Kind 30000):

**Wichtig:**```

- Event ist **öffentlich lesbar**{

- Secret wird als **SHA-256-Hash** gespeichert (nie Klartext!)  "kind": 30000,

- Beispiel: `"mein-passwort"` → `"a3f5b8c2..."`  "pubkey": "<admin_npub_hex>",

  "created_at": 1729612800,

### Whitelist-Event (Kind 30000):  "tags": [

```json    ["d", "<sha256_hash_des_secrets>"]

{  ],

  "kind": 30000,  "content": "{

  "pubkey": "<admin_npub_hex>",    \"admin_pubkey\": \"npub1...\",

  "tags": [["d", "<sha256_hash>_whitelist"]],    \"relay\": \"wss://relay.example.com\",

  "content": "{\"allowed_pubkeys\": [\"npub1...\", \"npub2...\"]}",    \"created_at\": 1729612800

  "sig": "<signatur>"  }",

}  "sig": "<signatur_des_admins>"

```}

```

**Unterschiede:**

- `tags: ["d", "hash_whitelist"]` = Suffix "_whitelist" (gehört zur Gruppe)**Erklärung:**

- `content` = Liste erlaubter NPUBs- `kind: 30000` = Replaceable Event (kann überschrieben werden)

- Auch öffentlich, aber nur Admin kann signieren- `pubkey` = Öffentlicher Schlüssel des Admins (wer hat das Event erstellt?)

- `tags: ["d", "hash"]` = Identifier-Tag mit Secret-Hash (so findet App das Event)

### Wie findet die App die Events?- `content` = JSON mit Gruppen-Infos (öffentlich lesbar!)

- `sig` = Signatur (beweist: wurde wirklich vom Admin erstellt)

**Login-Ablauf:**

1. User öffnet: `?secret=mein-passwort`### Whitelist-Event (Kind 30000):

2. App berechnet: `hash = SHA256("mein-passwort")````

3. App fragt Relays: Event mit `d`-Tag = `hash`?{

4. Relay antwortet: GroupConfig-Event  "kind": 30000,

5. App liest: `relay`, `admin_pubkey`  "pubkey": "<admin_npub_hex>",

6. App fragt Relay: Event mit `d`-Tag = `hash_whitelist`?  "created_at": 1729612900,

7. Relay antwortet: Whitelist-Event  "tags": [

8. App prüft: Admin oder auf Whitelist?    ["d", "<sha256_hash_des_secrets>_whitelist"]

  ],

**Warum öffentlich?**  "content": "{

- Nostr = öffentliche Events    \"allowed_pubkeys\": [

- Jeder kann lesen, **nur Admin kann signieren**      \"npub1abc...\",

- Ohne Secret (nur Hash sichtbar) → kein Zugang      \"npub1def...\",

- Sicherheit = Secret, nicht Event-Geheimhaltung      \"npub1ghi...\"

    ]

---  }",

  "sig": "<signatur_des_admins>"

## 📊 Offene Fragen}

```

1. **Schlüsselpaar-Generierung:** `nostr-tools` oder `@noble/secp256k1`? → Empfehlung: `nostr-tools`

2. **Whitelist-UI:** Modal im Angebotsraum oder separate `/admin`-Route? → Empfehlung: Modal**Erklärung:**

3. **Whitelist leer:** Niemand außer Admin oder jeder mit Link? → Empfehlung: Nur Admin (sicherer)- Gleicher `kind: 30000`

4. **QR-Code Library:** `qrcode` oder `qr-code-styling`? → Empfehlung: `qrcode`- `tags: ["d", "hash_whitelist"]` = Identifier mit "_whitelist"-Suffix (gehört zur gleichen Gruppe)

5. **QR-Code Style:** Schwarz-weiß, farbig, mit Logo? → Empfehlung: Schwarz-weiß- `content` = Liste aller erlaubten NPUBs (auch öffentlich!)

6. **NSEC-Speicherung:** LocalStorage oder jedes Mal eingeben?- Nur Admin kann dieses Event erstellen/ändern (durch Signatur verifiziert)



---### Wie findet die App die Events?



## ✅ Implementierungs-Schritte**Beim Login:**

1. User öffnet Link: `?secret=mein-geheimes-passwort`

1. **UI:**2. App berechnet: `hash = SHA256("mein-geheimes-passwort")`

   - Gruppenerstellung: "Join"-Tab entfernen3. App fragt Relays: "Gib mir Event mit `d`-Tag = `hash`"

   - Angebotsraum: "Whitelist verwalten"-Button4. Relay antwortet mit GroupConfig-Event

   - Login: Sicherheitshinweis + Keypair-Generator + NSEC-Eingabe5. App liest aus Event: `relay`, `admin_pubkey`

6. App fragt gleichen Relay: "Gib mir Event mit `d`-Tag = `hash_whitelist`"

2. **Whitelist-Modal:**7. Relay antwortet mit Whitelist-Event

   - NPUB hinzufügen/löschen8. App prüft: Ist User Admin oder auf Whitelist?

   - Einladungslink mit Copy-Button

   - QR-Code anzeigen**Warum öffentlich?**

- Nostr-Relays speichern alle Events öffentlich

3. **Routing:**- Jeder kann Events lesen, aber **nur der Admin kann GroupConfig/Whitelist signieren**

   - Nach Gruppenerstellung → `/group` (Angebotsraum)- Ohne Secret (nur Hash sichtbar) kann niemand anderes die Gruppe nutzen

   - Nach Login (erfolgreich) → `/group`- Sicherheit liegt im Secret, nicht in der Geheimhaltung der Event-Struktur

   - Nach Login (verweigert) → Fehlermeldung

---

4. **Zugriffskontrolle:**

   - Angebotsraum: Admin- oder Whitelist-Prüfung## �📊 Offene Fragen / Entscheidungen

   - Whitelist-Button: Nur für Admin sichtbar

### 1. Schlüsselpaar-Generierung: Welche Library?

---- **Option A:** `nostr-tools` (Standard Nostr-Library)

- **Option B:** Eigene Implementierung mit `@noble/secp256k1`

## 📝 Fragen an dich- **Empfehlung:** `nostr-tools` (bereits im Projekt vorhanden)



1. **Schlüsselpaar-Generierung:** Welche Library? (nostr-tools empfohlen)### 2. Whitelist-Modal oder separate Seite?

2. **Whitelist-UI:** Modal oder separate Seite?- **Option A:** Modal/Overlay im Angebotsraum (User bleibt auf gleicher Seite)

3. **Whitelist leer:** Was passiert?- **Option B:** Separate `/admin`-Route (wie bisher)

4. **QR-Code:** Welche Library + Style?- **Empfehlung:** Modal für bessere UX

5. **NSEC-Speicherung:** LocalStorage oder nicht?

### 3. Was wenn Whitelist leer ist?

**Bereit für Implementation?** Sag Bescheid! 🚀- **Option A:** Gruppe ohne Whitelist = niemand außer Admin darf rein

- **Option B:** Gruppe ohne Whitelist = jeder mit Link darf rein
- **Empfehlung:** Option A (sicherer)

### 4. QR-Code-Generator?
- Welche Library? (z.B. `qrcode`, `qr-code-styling`)
- Wo anzeigen? (Modal, Download-Button?)
- **Empfehlung:** `qrcode` Library, Anzeige im Whitelist-Modal

### 5. QR-Code: Welcher Style?
- Schwarz-weiß, farbig, mit Logo?
- **Empfehlung:** Schwarz-weiß (beste Kompatibilität)

---

## ✅ Implementierungs-Schritte

1. **UI:**
   - Gruppenerstellung: "Join"-Tab entfernen
   - Angebotsraum: "Whitelist verwalten"-Button
   - Login: Sicherheitshinweis + Keypair-Generator + NSEC-Eingabe

2. **Whitelist-Modal:**
   - NPUB hinzufügen/löschen
   - Einladungslink mit Copy-Button
   - QR-Code anzeigen

3. **Routing:**
   - Nach Gruppenerstellung → `/group` (Angebotsraum)
   - Nach Login (erfolgreich) → `/group`
   - Nach Login (verweigert) → Fehlermeldung

4. **Zugriffskontrolle:**
   - Angebotsraum: Admin- oder Whitelist-Prüfung
   - Whitelist-Button: Nur für Admin sichtbar

---

## 📝 Fragen an dich

1. **Schlüsselpaar-Generierung:** Welche Library? (nostr-tools empfohlen)
2. **Whitelist-UI:** Modal oder separate Seite?
3. **Whitelist leer:** Was passiert?
4. **QR-Code:** Welche Library + Style?
5. **NSEC-Speicherung:** LocalStorage oder nicht?

**Bereit für Implementation?** Sag Bescheid! 🚀
