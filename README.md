# Bitcoin-Tausch-Netzwerk

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://bitcoin-swap-gmsbyi0um-walpurga03s-projects.vercel.app)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-5.4-FF3E00?logo=svelte)](https://kit.svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Nostr](https://img.shields.io/badge/Nostr-Protocol-purple)](https://github.com/nostr-protocol/nostr)

Ein sicherer, dezentraler Gruppen-Chat mit integriertem anonymen Marketplace für Bitcoin-Tauschgeschäfte, gebaut mit **SvelteKit**, **TypeScript** und dem **Nostr-Protokoll**.

---

## 📖 Inhaltsverzeichnis

- [Überblick](#überblick)
- [Features](#features)
- [Voraussetzungen](#voraussetzungen)
- [Installation](#installation)
- [Konfiguration](#konfiguration)
- [Verwendung](#verwendung)
- [Projekt-Struktur](#projekt-struktur)
- [Sicherheit](#sicherheit)
- [Deployment](#deployment)
- [Technologie-Stack](#technologie-stack)
- [Lizenz](#lizenz)

---

## 🎯 Überblick

Das Bitcoin-Tausch-Netzwerk ist eine dezentrale Kommunikationsplattform, die es ermöglicht:

- 💬 **Verschlüsselte Gruppenchats** ohne zentrale Server
- 🛒 **Anonyme Marktplatz-Angebote** für Bitcoin-Tauschgeschäfte
- 🔐 **Ende-zu-Ende-Verschlüsselung** mit AES-GCM
- 🌐 **Dezentrale Architektur** über Nostr-Relays
- 🔑 **Whitelist-basierte Zugriffskontrolle**

**Beispiel-Anwendungsfall:**

Sie möchten Bitcoin gegen Euro tauschen, aber anonym bleiben:

1. **Sie erstellen ein Angebot** im Marketplace mit einem temporären Schlüssel (vollständig anonym)
2. **Interessenten zeigen Interesse** - dabei wird ihr Name und Public Key sichtbar
3. **Sie wählen einen Interessenten aus** - Sie sehen alle Interessenten und deren Public Keys
4. **Kontaktaufnahme außerhalb der App** - Sie kopieren den Public Key des gewählten Interessenten und kontaktieren ihn über andere Nostr-Clients (z.B. Damus, Amethyst, Snort) oder andere sichere Kanäle
5. **Transaktion abwickeln** - Die eigentliche Transaktion findet außerhalb der App statt

**Wichtig:** Die App dient nur zur **Anbahnung** des Kontakts. Die eigentliche Kommunikation und Transaktion erfolgt über externe, sichere Kanäle Ihrer Wahl.

---

## ⚡ Features

### 💬 Dezentraler Gruppen-Chat
- **Nostr-Relays**: Vollständig dezentral, keine zentralen Server
- **Echtzeit-Synchronisation**: Alle Gruppenmitglieder sehen Nachrichten sofort
- **AES-GCM Verschlüsselung**: Ende-zu-Ende verschlüsselte Kommunikation
- **Auto-Refresh**: Automatische Aktualisierung alle 15 Sekunden

### 🔐 Sicherheit & Authentifizierung
- **Zwei-Faktor-Authentifizierung**: Einladungslink + NSEC Private Key
- **Whitelist-System**: Nur autorisierte Public Keys haben Zugriff
- **Client-seitige Verschlüsselung**: Keys bleiben im Browser
- **Rate-Limiting**: Schutz vor Spam und Missbrauch

### 🛒 Anonymer Marketplace (Kontaktanbahnung)
- **Temporäre Schlüssel**: Angebote mit einmaligen Keypairs (vollständig anonym)
- **Interessenten-Liste**: Angebotsgeber sehen alle Interessenten mit Namen und Public Keys
- **Auswahl-Freiheit**: Angebotsgeber wählen aus, mit wem sie Kontakt aufnehmen möchten
- **Kopierbare Keys**: Ein Klick zum Kopieren der Public Keys für externe Kontaktaufnahme
- **Externe Kommunikation**: Kontaktaufnahme erfolgt außerhalb der App (z.B. über andere Nostr-Clients)
- **Rückzug möglich**: Interessenten können ihr Interesse via NIP-09 Delete Events zurückziehen

### 🎯 Technische Highlights
- **NIP-12 Tag-Filter**: `#t=bitcoin-group` für effiziente Abfragen
- **Hybrid Storage**: IndexedDB (Cache) + Nostr Relay (Persistenz)
- **Smart Filtering**: Interesse-Events getrennt vom Chat
- **pool.querySync()**: Robuste Event-Retrieval-Strategie

---

## 📋 Voraussetzungen

- **Node.js** 18 oder höher
- **npm** oder **yarn**
- Ein **Nostr-Relay** (empfohlen: eigener Relay für maximale Privatsphäre)

---

## 🛠️ Installation

### 1. Repository klonen

```bash
git clone https://github.com/Walpurga03/Bitcoin-Swap.git
cd Bitcoin-Swap
```

### 2. Dependencies installieren

```bash
npm install
```

### 3. Environment-Variablen konfigurieren

Erstellen Sie eine `.env` Datei basierend auf `.env.example`:

```bash
cp .env.example .env
```

Bearbeiten Sie `.env` und fügen Sie die erlaubten Public Keys hinzu:

```env
PUBLIC_ALLOWED_PUBKEYS=npub1abc...,npub1def...,npub1xyz...
```

**Hinweis:** Sie können sowohl NPUB- als auch Hex-Format verwenden, komma-separiert.

### 4. Development Server starten

```bash
npm run dev
```

Die App läuft nun auf `http://localhost:5173`

---

## 🔧 Konfiguration

### Whitelist einrichten

Bearbeiten Sie `.env` oder `.env.production`:

```env
PUBLIC_ALLOWED_PUBKEYS=npub1abc...,npub1def...,npub1xyz...
```

### Einladungslink erstellen

Format: `https://ihre-domain.com/?relay=wss%3A%2F%2Frelay-url&secret=gruppen-secret`

**Beispiel:**
```
https://ihre-domain.com/?relay=wss%3A%2F%2Frelay.example.com&secret=premium-group123
```

**Wichtig:** Die Relay-URL muss URL-encoded sein:
- `:` wird zu `%3A`
- `/` wird zu `%2F`

### Relay-Auswahl

**⚠️ Wichtig:** Das Relay MUSS NIP-12 (Generic Tag Queries) unterstützen, insbesondere `#t` Filter!

**📚 Detaillierte Relay-Anforderungen:** Siehe [`docs/RELAY-REQUIREMENTS.md`](docs/RELAY-REQUIREMENTS.md)

**Empfohlen:** Eigener Relay für maximale Privatsphäre und Kontrolle!

Öffentliche Relays mit voller NIP-Unterstützung:
- `wss://relay.damus.io` - Vollständige NIP-01, NIP-09, NIP-12 Unterstützung
- `wss://relay.nostr.band` - Gute Performance, alle NIPs
- `wss://nos.lol` - Zuverlässig, schnell

---

## 📖 Verwendung

### 1. Login

1. Öffnen Sie den Einladungslink (enthält Relay + Gruppen-Secret)
2. Geben Sie Ihren **Namen** ein (Pflichtfeld, min. 2 Zeichen)
3. Geben Sie Ihren **NSEC Private Key** ein (oder Hex-Format)
4. Klicken Sie auf "Gruppe beitreten"

### 2. Gruppen-Chat

- Senden Sie Nachrichten an die Gruppe
- Alle Nachrichten sind **AES-GCM verschlüsselt**
- Nur Mitglieder mit dem richtigen Secret können mitlesen
- Automatischer Refresh alle 15 Sekunden

### 3. Marketplace (Kontaktanbahnung)

**Als Angebotsgeber:**
1. **Angebot erstellen** - Ein temporärer Keypair wird automatisch generiert (Sie bleiben anonym)
2. **Interessenten sehen** - Alle Interessenten werden mit Namen und Public Key angezeigt
3. **Interessenten auswählen** - Sie entscheiden, mit wem Sie Kontakt aufnehmen möchten
4. **Public Key kopieren** - Klicken Sie auf den Namen oder Public Key eines Interessenten zum Kopieren
5. **Externe Kontaktaufnahme** - Kontaktieren Sie den gewählten Interessenten über:
   - Andere Nostr-Clients (Damus, Amethyst, Snort, etc.)
   - Andere sichere Kommunikationskanäle Ihrer Wahl
6. **Angebot löschen** - Nach erfolgreicher Kontaktaufnahme können Sie das Angebot löschen

**Als Interessent:**
1. **Interesse zeigen** - Ihr Name und Public Key werden dem Angebotsgeber angezeigt
2. **Warten auf Kontakt** - Der Angebotsgeber entscheidet, ob er Sie kontaktiert
3. **Interesse zurückziehen** - Sie können Ihr Interesse jederzeit zurückziehen (orangener Button)

**Wichtig:** Die App dient nur zur **Kontaktanbahnung**. Die eigentliche Kommunikation und Transaktion erfolgt **außerhalb der App** über sichere Kanäle Ihrer Wahl.

### 4. Externe Kommunikation

Nach der Kontaktanbahnung in der App:

1. **Public Key kopiert** - Sie haben den Public Key des Interessenten kopiert
2. **Nostr-Client verwenden** - Öffnen Sie einen Nostr-Client Ihrer Wahl:
   - [Damus](https://damus.io/) (iOS)
   - [Amethyst](https://github.com/vitorpamplona/amethyst) (Android)
   - [Snort](https://snort.social/) (Web)
   - [Iris](https://iris.to/) (Web)
3. **Direktnachricht senden** - Kontaktieren Sie den Interessenten direkt
4. **Transaktion abwickeln** - Vereinbaren Sie die Details der Transaktion sicher

---

## 🏗️ Projekt-Struktur

```
Bitcoin-Tausch-Netzwerk/
├── src/
│   ├── lib/
│   │   ├── nostr/
│   │   │   ├── types.ts          # TypeScript Interfaces
│   │   │   ├── client.ts         # Nostr Client & Event-Handling
│   │   │   └── crypto.ts         # Verschlüsselung & Key-Management
│   │   ├── security/
│   │   │   └── validation.ts     # Input-Validierung & Rate-Limiting
│   │   ├── stores/
│   │   │   ├── userStore.ts      # User State Management
│   │   │   └── groupStore.ts     # Group & Messages State
│   │   └── utils/
│   │       └── index.ts          # Utility-Funktionen
│   ├── routes/
│   │   ├── +page.svelte          # Login-Seite
│   │   ├── (app)/
│   │   │   ├── group/+page.svelte    # Gruppen-Chat & Marketplace
│   │   │   └── dm/[pubkey]/+page.svelte  # Private Chats
│   │   ├── debug-secret/+page.svelte     # Debug-Tools
│   │   └── test-login/+page.svelte       # Test-Seite
│   └── app.html                  # HTML Template
├── docs/                         # Dokumentation
│   ├── SETUP.md                  # Detaillierte Setup-Anleitung
│   └── PROJECT_STRUCTURE.md      # Projekt-Struktur Details
├── package.json                  # Dependencies & Scripts
├── vite.config.ts                # Vite Konfiguration
├── svelte.config.js              # SvelteKit Konfiguration
├── tsconfig.json                 # TypeScript Konfiguration
├── vercel.json                   # Vercel Deployment Config
├── .env.example                  # Beispiel Environment Variables
├── .gitignore                    # Git Ignore Rules
└── README.md                     # Diese Datei
```

---

## 🔐 Sicherheit

### Implementierte Sicherheitsmaßnahmen

- **Client-seitige Verschlüsselung**: Private Keys verlassen niemals den Browser
- **AES-GCM Verschlüsselung**: Für Gruppen-Nachrichten
- **NIP-44 Verschlüsselung**: Für private Direktnachrichten (geplant)
- **Whitelist-System**: Nur autorisierte Public Keys haben Zugriff
- **Rate-Limiting**: Schutz vor Spam (20 Requests/Minute)
- **Signatur-Validierung**: Alle Events werden validiert
- **Input-Validierung**: Schutz vor Injection-Angriffen

### Best Practices

1. **Private Keys**: Niemals in Git committen, nur lokal im Browser speichern
2. **Whitelist**: Regelmäßig überprüfen und inaktive Keys entfernen
3. **Relays**: Verwenden Sie vertrauenswürdige Relays oder betreiben Sie eigene
4. **Secrets**: Lange, zufällige Strings verwenden und nicht wiederverwenden

---

## 📦 Deployment

### Vercel (empfohlen)

1. **Vercel CLI installieren** (falls noch nicht vorhanden):
```bash
npm install -g vercel
```

2. **Login bei Vercel**:
```bash
vercel login
```

3. **Deployment**:
```bash
vercel --prod
```

4. **Environment Variables setzen** im Vercel Dashboard:
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

---

## 🔄 Nostr NIPs

Dieses Projekt implementiert folgende Nostr Implementation Possibilities (NIPs):

- **NIP-01**: Basic protocol flow (Event-Struktur, Signing, Validierung)
- **NIP-09**: Event Deletion (Angebote & Interesse zurückziehen)
- **NIP-12**: Generic Tag Queries (`#t=bitcoin-group` Filtering)
- **Custom Encryption**: AES-GCM für Gruppen (angelehnt an NIP-44 Konzept)
- **NIP-17**: Private Direct Messages (geplant für v2.0)

---

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

---

## 🛠️ Technologie-Stack

- **Frontend**: SvelteKit 2.15, Svelte 4.2
- **Sprache**: TypeScript 5.7
- **Protokoll**: Nostr (nostr-tools 2.10)
- **Verschlüsselung**: AES-GCM (Web Crypto API)
- **Build-Tool**: Vite 5.4
- **Deployment**: Vercel (Adapter: @sveltejs/adapter-vercel)
- **Styling**: Custom CSS mit CSS Variables

---

## 🤝 Beitragen

Contributions sind willkommen! Bitte:

1. Forken Sie das Repository
2. Erstellen Sie einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Committen Sie Ihre Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Pushen Sie zum Branch (`git push origin feature/AmazingFeature`)
5. Öffnen Sie einen Pull Request

---

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) Datei für Details

---

## ⚠️ Hinweise

- Dies ist eine Proof-of-Concept-Implementation
- Für Production-Einsatz sollten zusätzliche Sicherheitsaudits durchgeführt werden
- Private Keys sollten sicher gespeichert werden (z.B. mit Browser-Extension)
- Testen Sie die Whitelist-Funktionalität gründlich vor dem Deployment

---

## 🔗 Links

- [Nostr Protocol](https://github.com/nostr-protocol/nostr)
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools)
- [SvelteKit](https://kit.svelte.dev/)
- [Vercel](https://vercel.com/)

---

## 📞 Support

Bei Fragen oder Problemen:

1. Prüfen Sie die [SETUP.md](docs/SETUP.md) für detaillierte Anweisungen
2. Öffnen Sie ein Issue auf GitHub
3. Prüfen Sie die Browser-Console (F12) für Debug-Informationen

---

**Entwickelt mit ❤️ für die dezentrale Zukunft**