# NostrGroupChat (Bitcoin-Swap)

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://bitcoin-swap-gmsbyi0um-walpurga03s-projects.vercel.app)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-5.4-FF3E00?logo=svelte)](https://kit.svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Nostr](https://img.shields.io/badge/Nostr-Protocol-purple)](https://github.com/nostr-protocol/nostr)

Ein sicherer, dezentraler Gruppen-Chat mit integriertem anonymen Marketplace, gebaut mit **SvelteKit**, **TypeScript** und dem **Nostr-Protokoll**.

---

## � Um was geht es?

Stell dir eine WhatsApp-Gruppe vor, aber **ohne WhatsApp**. Niemand kann mitlesen, niemand kontrolliert die Nachrichten, und es gibt keinen Firmen-Server der deine Daten speichert. Stattdessen:

- 📱 **Jeder hat seinen eigenen digitalen Schlüssel** (wie ein Passwort, nur sicherer)
- 🔐 **Nachrichten sind verschlüsselt** - nur Gruppenmitglieder können sie lesen
- 🌐 **Dezentral** - keine Firma kann die App abschalten oder Daten sammeln
- 🛒 **Integrierter Marktplatz** - Biete Dinge an (Bitcoin-Tausch) ohne deine Identität preiszugeben

**Beispiel:** Du möchtest Bitcoin gegen Euro tauschen, aber anonym bleiben. Du erstellst ein Angebot im Marketplace. Interessenten können dir ihr Interesse zeigen (mit ihrem Namen), und du siehst deren Kontakt-Schlüssel. Dann könnt ihr euch außerhalb der App einigen.

**Perfekt für:** Private Tauschgruppen, vertrauliche Kommunikation, anonyme Marktplätze.

---

## �📸 Screenshots

> *Screenshots folgen in Kürze*

---

## ⚡ Quick Start

```bash
# 1. Klone das Repository
git clone https://github.com/Walpurga03/Bitcoin-Swap.git
cd Bitcoin-Swap

# 2. Installiere Dependencies
npm install

# 3. Starte Development Server
npm run dev

# 4. Öffne Browser
# http://localhost:5173/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group123
```

**Live Demo**: [bitcoin-swap-gmsbyi0um-walpurga03s-projects.vercel.app](https://bitcoin-swap-gmsbyi0um-walpurga03s-projects.vercel.app/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group123)

---

## 🚀 Features

### 💬 Dezentraler Gruppen-Chat
- **Nostr-Relays**: Keine zentralen Server, vollständig dezentral
- **Echtzeit-Sync**: Alle Gruppenmitglieder sehen Nachrichten
- **Verschlüsselt**: AES-GCM Ende-zu-Ende-Verschlüsselung

### 🔐 Sicherheit & Authentifizierung
- **Zwei-Faktor**: Einladungslink + NSEC Private Key
- **Whitelist**: Nur autorisierte Public Keys haben Zugriff
- **Client-seitig**: Keys bleiben im Browser, keine Server-Übertragung
- **Auto-Refresh**: Alle 15 Sekunden neue Nachrichten

### 🛒 Anonymer Marketplace
- **Temporäre Keys**: Angebote mit einmaligen Keypairs (anonym)
- **Namen-Pflicht**: Interessenten zeigen ihren Namen beim Login
- **Kopierbare Keys**: Ein Klick zum Kopieren für externe Kontakte
- **Rückzug möglich**: Interesse via NIP-09 Delete Events zurückziehen

### 🎯 Technische Highlights
- **NIP-12**: Tag-Filter `#t=bitcoin-group` für schnelle Abfragen
- **Hybrid Storage**: IndexedDB (Cache) + Nostr Relay (Persistence)
- **Smart Filtering**: Interesse-Events getrennt vom Chat
- **pool.querySync()**: Robuste Event-Retrieval statt subscribeMany

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
- Öffne den Einladungslink (enthält Relay + Gruppen-Secret)
- **Gib deinen Namen ein** (Pflichtfeld, min. 2 Zeichen)
- Gib deinen NSEC Private Key ein (oder Hex-Format)
- Klicke auf "Gruppe beitreten"

### 2. Gruppen-Chat
- Sende Nachrichten an die Gruppe
- Alle Nachrichten sind **AES-GCM verschlüsselt**
- Nur Mitglieder mit dem richtigen Secret können mitlesen
- Automatischer Refresh alle 15 Sekunden

### 3. Marketplace
- **Angebot erstellen**: Temporärer Keypair wird generiert (anonym)
- **Interesse zeigen**: Dein Name + Public Key werden sichtbar
- **Public Key kopieren**: Klicke auf Name oder Key zum Kopieren
- **Interesse zurückziehen**: Möglich über orangenen Button
- Lösche Angebote nach erfolgreicher Transaktion (NIP-09)

### 4. Kontaktaufnahme
- Kopiere Public Keys der Interessenten
- Kontaktiere sie extern (z.B. über andere Nostr-Clients)
- Oder nutze die integrierte DM-Funktion (in Entwicklung)

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

### Vercel (empfohlen)

```bash
# Production Deployment
npx vercel --prod
```

**Wichtig**: Setze Environment Variable in Vercel Dashboard:
```
PUBLIC_ALLOWED_PUBKEYS=npub1...,npub2...,npub3...
```

**Live URL**: [https://bitcoin-swap-gmsbyi0um-walpurga03s-projects.vercel.app](https://bitcoin-swap-gmsbyi0um-walpurga03s-projects.vercel.app)

### Andere Plattformen

```bash
npm run build
# Deploy den 'build' Ordner
# Adapter kann in svelte.config.js angepasst werden
```

## 🔄 Nostr NIPs

Dieses Projekt implementiert folgende Nostr Implementation Possibilities (NIPs):

- **NIP-01**: Basic protocol flow (Event-Struktur, Signing, Validierung)
- **NIP-09**: Event Deletion (Angebote & Interesse zurückziehen)
- **NIP-12**: Generic Tag Queries (`#t=bitcoin-group` Filtering)
- **Custom Encryption**: AES-GCM für Gruppen (angelehnt an NIP-44 Konzept)
- **NIP-17**: Private Direct Messages (geplant für v2.0)

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