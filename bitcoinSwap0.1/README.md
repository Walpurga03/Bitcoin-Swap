# NostrGroupChat

Ein sicherer, dezentraler Gruppen-Chat mit integriertem anonymen Marketplace, gebaut mit Svelte, TypeScript und dem Nostr-Protokoll.

## 🚀 Features

- **Dezentraler Gruppen-Chat**: Kommunikation über Nostr-Relays ohne zentrale Server
- **Zwei-Faktor-Authentifizierung**: Einladungslink + NSEC Private Key mit Whitelist
- **Ende-zu-Ende-Verschlüsselung**: NIP-44 für sichere Gruppenkommunikation
- **Anonymer Marketplace**: Erstelle Angebote mit temporären Keys
- **Private DMs**: Sichere 1-zu-1-Kommunikation (NIP-17)
- **Client-seitig**: Keine Server-Datenbank, alles läuft im Browser

## 📋 Voraussetzungen

- Node.js 18+ 
- npm oder yarn

## 🛠️ Installation

```bash
# Dependencies installieren
npm install

# Development Server starten
npm run dev

# Production Build
npm run build

# Preview Production Build
npm run preview
```

## 🔧 Konfiguration

### Whitelist einrichten

Bearbeite `.env` oder `.env.production`:

```env
PUBLIC_ALLOWED_PUBKEYS=npub1abc...,npub1def...,npub1xyz...
```

Du kannst sowohl NPUB- als auch Hex-Format verwenden, komma-separiert.

### Einladungslink erstellen

Format: `https://deine-domain.com/?relay=wss%3A%2F%2Frelay-url&secret=gruppen-secret`

Beispiel:
```
https://example.com/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group123
```

## 📖 Verwendung

### 1. Login

- Öffne den Einladungslink
- Gib deinen NSEC Private Key ein (oder Hex-Format)
- Optional: Gib einen Anzeigenamen ein
- Klicke auf "Gruppe beitreten"

### 2. Gruppen-Chat

- Sende Nachrichten an die Gruppe
- Alle Nachrichten sind verschlüsselt
- Nur Mitglieder mit dem richtigen Secret können mitlesen

### 3. Marketplace

- Erstelle anonyme Angebote mit einem temporären Key
- Andere können Interesse zeigen
- Starte private DM-Chats mit Interessenten
- Lösche Angebote nach erfolgreicher Transaktion

### 4. Private Chats

- Klicke auf "Interesse zeigen" bei einem Angebot
- Starte einen verschlüsselten 1-zu-1-Chat
- Nur Sender und Empfänger können die Nachrichten lesen

## 🏗️ Projekt-Struktur

```
src/
├── lib/
│   ├── nostr/
│   │   ├── types.ts          # TypeScript Interfaces
│   │   ├── client.ts         # Nostr Client & Event-Handling
│   │   └── crypto.ts         # Verschlüsselung & Key-Management
│   ├── security/
│   │   └── validation.ts     # Input-Validierung & Rate-Limiting
│   ├── stores/
│   │   ├── userStore.ts      # User State Management
│   │   └── groupStore.ts     # Group & Messages State
│   └── utils/
│       └── index.ts          # Utility-Funktionen
├── routes/
│   ├── +page.svelte          # Login-Seite
│   ├── (app)/
│   │   ├── group/+page.svelte    # Gruppen-Chat
│   │   └── dm/[pubkey]/+page.svelte  # Private Chats
│   ├── debug-secret/+page.svelte     # Debug-Tools
│   └── test-login/+page.svelte       # Test-Seite
└── app.html                  # HTML Template
```

## 🔐 Sicherheit

- **Client-seitig**: Private Keys verlassen niemals den Browser
- **Verschlüsselung**: NIP-44 für Gruppen, NIP-17 für DMs
- **Whitelist**: Nur autorisierte Public Keys haben Zugriff
- **Rate-Limiting**: Schutz vor Spam und Missbrauch
- **Signatur-Validierung**: Alle Events werden validiert

## 🧪 Testing

### Debug-Seiten

- `/debug-secret` - Teste Channel-ID-Generierung und Links
- `/test-login` - Teste Validierungen und Key-Formate

### Manuelle Tests

```bash
# Starte Dev-Server
npm run dev

# Öffne Browser
# http://localhost:5173/debug-secret
# http://localhost:5173/test-login
```

## 📦 Deployment

### Vercel

```bash
npm run deploy
```

### Andere Plattformen

```bash
npm run build
# Deploy den 'build' Ordner
```

## 🔄 Nostr NIPs

Dieses Projekt implementiert folgende Nostr Implementation Possibilities (NIPs):

- **NIP-01**: Basic protocol flow
- **NIP-04**: Encrypted Direct Messages (vereinfacht)
- **NIP-09**: Event Deletion
- **NIP-17**: Private Direct Messages (geplant)
- **NIP-44**: Encrypted Payloads (Versioned)

## 🤝 Beitragen

Contributions sind willkommen! Bitte erstelle einen Pull Request oder öffne ein Issue.

## 📄 Lizenz

MIT License - siehe LICENSE Datei

## ⚠️ Hinweise

- Dies ist eine Proof-of-Concept-Implementation
- Für Production-Einsatz sollten zusätzliche Sicherheitsaudits durchgeführt werden
- Private Keys sollten sicher gespeichert werden (z.B. mit Browser-Extension)
- Teste die Whitelist-Funktionalität gründlich vor dem Deployment

## 🔗 Links

- [Nostr Protocol](https://github.com/nostr-protocol/nostr)
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools)
- [SvelteKit](https://kit.svelte.dev/)
- [Vercel](https://vercel.com/)