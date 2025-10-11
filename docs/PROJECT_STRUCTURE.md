# NostrGroupChat - Projekt-Struktur

## 📁 Vollständige Dateistruktur

```
NostrGroupChat/
├── src/
│   ├── lib/
│   │   ├── nostr/
│   │   │   ├── types.ts              # TypeScript Interfaces & Types
│   │   │   ├── client.ts             # Nostr Client, Event-Handling, Relay-Verbindungen
│   │   │   └── crypto.ts             # Verschlüsselung, Key-Derivation, NIP-44
│   │   ├── security/
│   │   │   └── validation.ts         # Input-Validierung, Whitelist, Rate-Limiting
│   │   ├── stores/
│   │   │   ├── userStore.ts          # User State (Pubkey, Name, Auth)
│   │   │   └── groupStore.ts         # Group State (Messages, Offers, Channel)
│   │   └── utils/
│   │       └── index.ts              # Utility-Funktionen (Links, Formatierung)
│   ├── routes/
│   │   ├── +layout.svelte            # Root Layout (CSS Import)
│   │   ├── +page.svelte              # Login-Seite (Einladungslink-Parsing)
│   │   ├── (app)/
│   │   │   ├── group/
│   │   │   │   └── +page.svelte      # Gruppen-Chat & Marketplace
│   │   │   └── dm/
│   │   │       └── [pubkey]/
│   │   │           └── +page.svelte  # Private DM-Chats
│   │   ├── debug-secret/
│   │   │   └── +page.svelte          # Debug: Channel-ID & Links testen
│   │   └── test-login/
│   │       └── +page.svelte          # Test: Validierungen & Keys
│   ├── app.html                      # HTML Template
│   └── app.css                       # Globale Styles
├── package.json                      # Dependencies & Scripts
├── vite.config.ts                    # Vite Konfiguration
├── svelte.config.js                  # SvelteKit Konfiguration
├── tsconfig.json                     # TypeScript Konfiguration
├── vercel.json                       # Vercel Deployment Config
├── .env                              # Environment Variables (lokal)
├── .env.production                   # Environment Variables (production)
├── .env.example                      # Beispiel-Konfiguration
├── .gitignore                        # Git Ignore Rules
├── README.md                         # Projekt-Dokumentation
├── SETUP.md                          # Setup-Anleitung
└── PROJECT_STRUCTURE.md              # Diese Datei
```

## 📄 Datei-Beschreibungen

### Konfigurationsdateien

| Datei | Zweck |
|-------|-------|
| `package.json` | NPM Dependencies, Scripts, Projekt-Metadaten |
| `vite.config.ts` | Vite Build-Tool Konfiguration |
| `svelte.config.js` | SvelteKit Framework Konfiguration |
| `tsconfig.json` | TypeScript Compiler Optionen |
| `vercel.json` | Vercel Deployment Einstellungen |
| `.env` | Lokale Environment Variables (Whitelist) |
| `.env.production` | Production Environment Variables |
| `.env.example` | Beispiel für Environment Variables |
| `.gitignore` | Git Ignore Regeln |

### Core Libraries

#### `src/lib/nostr/types.ts` (97 Zeilen)
- **NostrEvent**: Basis Nostr Event Interface
- **UserProfile**: User-Daten (Pubkey, Name)
- **GroupConfig**: Gruppen-Konfiguration (Channel-ID, Relay)
- **GroupMessage**: Chat-Nachricht
- **MarketplaceOffer**: Marketplace-Angebot
- **DMMessage**: Private Nachricht
- **NostrFilter**: Event-Filter für Queries

#### `src/lib/nostr/client.ts` (335 Zeilen)
- **initPool()**: Initialisiere Nostr SimplePool
- **connectToRelay()**: Verbinde zu Relay
- **createEvent()**: Erstelle signiertes Event
- **publishEvent()**: Publiziere Event zu Relays
- **fetchEvents()**: Hole Events mit Filter
- **sendGroupMessage()**: Sende verschlüsselte Gruppen-Nachricht
- **fetchGroupMessages()**: Hole Gruppen-Nachrichten
- **createMarketplaceOffer()**: Erstelle Angebot
- **fetchMarketplaceOffers()**: Hole Angebote
- **sendOfferInterest()**: Sende Interesse an Angebot
- **deleteEvent()**: Lösche Event (NIP-09)

#### `src/lib/nostr/crypto.ts` (180 Zeilen)
- **deriveChannelId()**: SHA-256 Hash vom Secret
- **deriveKeyFromSecret()**: Encryption Key ableiten
- **nip44Encrypt()**: NIP-44 Verschlüsselung
- **nip44Decrypt()**: NIP-44 Entschlüsselung
- **encryptForGroup()**: Symmetrische Gruppen-Verschlüsselung
- **decryptForGroup()**: Symmetrische Gruppen-Entschlüsselung
- **generateTempKeypair()**: Temporäres Keypair für Marketplace
- **getPublicKeyFromPrivate()**: Public Key ableiten
- **pubkeyToNpub()**: Hex zu NPUB konvertieren
- **privkeyToNsec()**: Hex zu NSEC konvertieren

#### `src/lib/security/validation.ts` (237 Zeilen)
- **validatePrivateKey()**: NSEC/Hex Validierung
- **validatePublicKey()**: NPUB/Hex Validierung
- **validateRelayUrl()**: Relay-URL Validierung (`wss://` Protokoll)
- **validateGroupSecret()**: Secret Validierung
- **isInWhitelist()**: Whitelist-Prüfung
- **validateEventSignature()**: Event-Signatur prüfen
- **RateLimiter**: Rate-Limiting Klasse

#### `src/lib/utils/index.ts` (127 Zeilen)
- **parseInviteLink()**: Parse Einladungslink
- **createInviteLink()**: Erstelle Einladungslink
- **formatTimestamp()**: Formatiere Zeitstempel
- **truncatePubkey()**: Kürze Public Key für Anzeige
- **generateRandomId()**: Zufällige ID
- **debounce()**: Debounce-Funktion
- **isValidUrl()**: URL-Validierung
- **extractDomain()**: Domain aus URL

### Stores (State Management)

#### `src/lib/stores/userStore.ts` (153 Zeilen)
- **UserState**: Pubkey, PrivateKey, Name, Auth-Status
- **setUserFromNsec()**: Login mit NSEC
- **setTempPrivkey()**: Temporärer Key für Marketplace
- **updateName()**: Name aktualisieren
- **logout()**: Abmelden
- **restoreSession()**: Session wiederherstellen
- **Derived Stores**: userPubkey, userNpub, isAuthenticated, userName

#### `src/lib/stores/groupStore.ts` (330 Zeilen)
- **GroupState**: Channel-ID, Relay, Messages, Offers
- **initialize()**: Gruppe initialisieren
- **loadMessages()**: Nachrichten laden
- **sendMessage()**: Nachricht senden
- **loadOffers()**: Angebote laden
- **createOffer()**: Angebot erstellen
- **sendInterest()**: Interesse senden
- **deleteOffer()**: Angebot löschen
- **Derived Stores**: channelId, isGroupConnected, groupMessages, marketplaceOffers

### Routes (UI Components)

#### `src/routes/+page.svelte` (217 Zeilen)
**Login-Seite**
- Parse Einladungslink aus URL
- NSEC/Name Eingabe
- Whitelist-Validierung
- Weiterleitung zu /group

#### `src/routes/(app)/group/+page.svelte` (437 Zeilen)
**Gruppen-Chat & Marketplace**
- Nachrichten-Feed mit Auto-Refresh
- Nachricht senden
- Marketplace-Angebote anzeigen
- Neues Angebot erstellen
- Interesse an Angebot zeigen
- Angebot löschen

#### `src/routes/(app)/dm/[pubkey]/+page.svelte` (313 Zeilen)
**Private DM-Chats**
- 1-zu-1 verschlüsselte Nachrichten
- NIP-44 Encryption
- Auto-Refresh
- Nachrichtenverlauf

#### `src/routes/debug-secret/+page.svelte` (301 Zeilen)
**Debug-Tools**
- Channel-ID generieren
- Einladungslink erstellen
- Link parsen
- Duplikat-Tests
- Unterschiedliche Secrets testen

#### `src/routes/test-login/+page.svelte` (377 Zeilen)
**Login-Tests**
- NSEC Validierung
- NPUB Validierung
- Relay Validierung
- Whitelist-Tests
- Ungültige Eingaben testen
- Test-Keys generieren

### Styles

#### `src/app.css` (92 Zeilen)
- CSS Custom Properties (Farben, Variablen)
- Globale Styles
- Utility-Klassen (btn, input, card, error, success)
- Responsive Design

## 🔄 Datenfluss

### Login-Flow
```
URL mit Einladungslink
  ↓
+page.svelte (Login)
  ↓
parseInviteLink() → {relay, secret}
  ↓
validatePrivateKey(nsec)
  ↓
isInWhitelist(pubkey)
  ↓
userStore.setUserFromNsec()
  ↓
groupStore.initialize(secret, relay)
  ↓
deriveChannelId(secret) → SHA-256 Hash
  ↓
Weiterleitung zu /group
```

### Nachrichten-Flow
```
User tippt Nachricht
  ↓
groupStore.sendMessage(content, privateKey)
  ↓
encryptForGroup(content, groupKey)
  ↓
createEvent(kind: 1, encrypted, tags: [channelId])
  ↓
publishEvent(event, [relay])
  ↓
Auto-Refresh lädt neue Messages
  ↓
fetchGroupMessages(channelId, groupKey)
  ↓
decryptForGroup(encrypted, groupKey)
  ↓
Anzeige im Chat-Feed
```

### Marketplace-Flow
```
User erstellt Angebot
  ↓
generateTempKeypair() → {privateKey, publicKey}
  ↓
groupStore.createOffer(content, tempPrivateKey)
  ↓
encryptForGroup(content, groupKey)
  ↓
createEvent(kind: 30000, encrypted, tags: [channelId])
  ↓
publishEvent(event, [relay])
  ↓
Anderer User zeigt Interesse
  ↓
sendOfferInterest(offerId, message, privateKey)
  ↓
createEvent(kind: 1, encrypted, tags: [offerId, channelId, pubkey])
  ↓
Anbieter wählt Interessent
  ↓
Weiterleitung zu /dm/[pubkey]
  ↓
deleteEvent(offerId) → NIP-09 Delete
```

## 🔐 Sicherheits-Layer

### Layer 1: Input-Validierung
- `validatePrivateKey()` - NSEC/Hex Format
- `validatePublicKey()` - NPUB/Hex Format
- `validateRelayUrl()` - `wss://` Protokoll
- `validateGroupSecret()` - Länge & Zeichen

### Layer 2: Authentifizierung
- Whitelist-Prüfung via `isInWhitelist()`
- Zwei-Faktor: Link + NSEC
- Session-Management via localStorage

### Layer 3: Verschlüsselung
- Gruppen: AES-GCM symmetrisch
- DMs: NIP-44 asymmetrisch
- Channel-Isolation via SHA-256

### Layer 4: Rate-Limiting
- `RateLimiter` Klasse
- Max 20 Requests/Minute pro Pubkey
- Cleanup alter Einträge

### Layer 5: Event-Validierung
- Signatur-Prüfung
- Channel-ID Matching
- Client-seitiges Filtering

## 📊 Statistiken

- **Gesamt Zeilen Code**: ~3.500+
- **TypeScript Dateien**: 10
- **Svelte Components**: 7
- **Konfigurationsdateien**: 9
- **Dokumentation**: 3

## 🎯 Nächste Schritte

1. `npm install` - Dependencies installieren
2. `.env` konfigurieren - Whitelist setzen
3. `npm run dev` - Development Server starten
4. `/test-login` öffnen - Keys generieren
5. `/debug-secret` öffnen - Einladungslink erstellen
6. Testen & Deployen!

Siehe `SETUP.md` für detaillierte Anweisungen.