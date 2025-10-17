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
- **Auto-Refresh**: Automatische Aktualisierung alle 5 Sekunden

### 🔐 Sicherheit & Authentifizierung
- **Zwei-Faktor-Authentifizierung**: Einladungslink + NSEC Private Key
- **Gruppenbasierte Whitelist**: Jede Gruppe hat ihre eigene Whitelist auf dem Relay
- **Admin-Verwaltung**: Whitelist-Verwaltung direkt im Gruppen-Chat
- **Client-seitige Verschlüsselung**: Keys bleiben im Browser
- **Rate-Limiting**: Schutz vor Spam und Missbrauch

### 🛒 Anonymer Marketplace mit Whitelist-basiertem privaten Chat
- **Temporäre Schlüssel**: Angebote mit einmaligen Keypairs (vollständig anonym)
- **Interessenten-Liste**: Angebotsgeber sehen alle Interessenten mit Namen und Public Keys
- **Whitelist-basierter Chat**: Privater Chat durch Entfernen aller anderen User von der Whitelist
- **Auto-Delete**: Angebot wird automatisch gelöscht beim Chat-Start
- **Gruppen-Chat-Infrastruktur**: Nutzt bestehenden verschlüsselten Gruppen-Chat
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

### 3. Development Server starten

```bash
npm run dev
```

Die App läuft nun auf `http://localhost:5173`

---

## 🔧 Konfiguration

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

### 3. Marketplace mit Whitelist-basiertem privaten Chat

**Als Angebotsgeber:**
1. **Angebot erstellen** - Ein temporärer Keypair wird automatisch generiert (Sie bleiben anonym)
2. **Interessenten sehen** - Alle Interessenten werden mit Namen und Public Key angezeigt
3. **Chat starten** - Klicken Sie auf "💬 Chat starten" bei einem Interessenten
4. **Whitelist-Update** - Alle anderen User werden automatisch von der Whitelist entfernt
5. **Angebotstext automatisch** - Ihr Angebotstext wird als erste Nachricht im Gruppen-Chat gesendet
6. **Auto-Delete** - Ihr Angebot wird automatisch gelöscht (Sie werden gefragt)
7. **Private Kommunikation** - Nur Sie und der Interessent haben noch Zugriff auf den Gruppen-Chat
8. **Transaktion abwickeln** - Vereinbaren Sie die Details sicher im privaten Chat

**Als Interessent:**
1. **Interesse zeigen** - Ihr Name und Public Key werden dem Angebotsgeber angezeigt
2. **Warten auf Chat** - Der Angebotsgeber kann einen Chat mit Ihnen starten
3. **Automatischer Zugriff** - Sie bleiben in der Gruppe, alle anderen werden entfernt
4. **Erste Nachricht** - Sie sehen den Angebotstext als erste Nachricht im Gruppen-Chat
5. **Private Kommunikation** - Nur Sie und der Anbieter können kommunizieren
6. **Interesse zurückziehen** - Sie können Ihr Interesse jederzeit zurückziehen (orangener Button)

**Whitelist-Chat Vorteile:**
- **Einfache Implementierung**: Nutzt bestehende Gruppen-Chat-Infrastruktur
- **Weniger Code**: Keine separate Chat-UI nötig
- **AES-GCM Verschlüsselung**: Wie alle Gruppen-Nachrichten
- **Sofortiger Start**: Kein Einladungs-System, direkter Chat-Start
- **Automatische Isolation**: Alle anderen User verlieren Zugriff
- **Wartbar**: Einfacher zu verstehen und zu pflegen

📚 **Detaillierte Anleitung**: Siehe [`docs/WHITELIST-CHAT-ANLEITUNG.md`](docs/WHITELIST-CHAT-ANLEITUNG.md)

### 4. Whitelist-Verwaltung (Admin)

**Als Admin:**
1. **Admin-Button** - Im Gruppen-Chat Header: "🔐 Whitelist verwalten"
2. **Gruppenspezifisch** - Jede Gruppe hat ihre eigene Whitelist
3. **Pubkeys hinzufügen** - Neue Nutzer zur aktuellen Gruppe hinzufügen
4. **Pubkeys entfernen** - Nutzer aus der Gruppe entfernen
5. **Relay-basiert** - Whitelist wird auf dem Relay gespeichert (NIP-01 Replaceable Events)

📚 **Detaillierte Anleitung**: Siehe [`docs/WHITELIST-ANLEITUNG.md`](docs/WHITELIST-ANLEITUNG.md)

---

## 🏗️ Projekt-Struktur

```
Bitcoin-Tausch-Netzwerk/
├── src/
│   ├── lib/
│   │   ├── nostr/
│   │   │   ├── types.ts          # TypeScript Interfaces
│   │   │   ├── client.ts         # Nostr Client & Event-Handling
│   │   │   ├── crypto.ts         # Verschlüsselung & Key-Management
│   │   │   └── whitelist.ts      # Gruppenbasierte Whitelist & Private Chat
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
│   │   │   └── group/+page.svelte    # Gruppen-Chat & Marketplace
│   │   ├── admin/+page.svelte    # Whitelist-Verwaltung
│   │   ├── debug-secret/+page.svelte     # Debug-Tools
│   │   └── test-login/+page.svelte       # Test-Seite
│   └── app.html                  # HTML Template
├── docs/                         # Dokumentation
│   ├── SETUP.md                  # Detaillierte Setup-Anleitung
│   ├── PROJECT_STRUCTURE.md      # Projekt-Struktur Details
│   ├── WHITELIST-ANLEITUNG.md    # Gruppenbasierte Whitelist
│   ├── WHITELIST-CHAT-ANLEITUNG.md  # Whitelist-basierter privater Chat
│   └── CHAT-FLOW-ANALYSE.md      # Chat-Flow Analyse & Verbesserungen
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
- **AES-GCM Verschlüsselung**: Für alle Gruppen-Nachrichten (inkl. private Chats)
- **Gruppenbasierte Whitelist**: Jede Gruppe hat separate Zugriffskontrolle
- **Whitelist-basierter privater Chat**: Automatische Isolation durch Whitelist-Update
- **Relay-basierte Whitelist**: Dezentrale Speicherung auf Nostr-Relays
- **Rate-Limiting**: Schutz vor Spam (20 Requests/Minute)
- **Signatur-Validierung**: Alle Events werden validiert
- **Input-Validierung**: Schutz vor Injection-Angriffen
- **Zugriffskontrolle**: Nur whitelistete User können Nachrichten sehen

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

4. **Whitelist-Verwaltung nach Deployment:**
   - Die Whitelist wird **nicht mehr über Environment Variables** konfiguriert
   - Stattdessen verwaltet der **Admin die Whitelist direkt in der App**
   - Jede Gruppe hat ihre **eigene Whitelist** (gespeichert als Nostr Event)
   - Der Admin kann über den Button "🔐 Whitelist verwalten" im Gruppen-Chat Nutzer hinzufügen/entfernen
   - Die Whitelist ist **gruppenspezifisch** (basierend auf dem Secret)

📚 **Detaillierte Anleitung**: Siehe [`docs/WHITELIST-ANLEITUNG.md`](docs/WHITELIST-ANLEITUNG.md)

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

- **NIP-01**: Basic protocol flow (Event-Struktur, Signing, Validierung, Replaceable Events)
- **NIP-09**: Event Deletion (Angebote & Interesse zurückziehen)
- **NIP-12**: Generic Tag Queries (`#t=bitcoin-group` Filtering)
- **Custom Encryption**: AES-GCM für Gruppen-Nachrichten
- **Custom Whitelist**: Gruppenbasierte Zugriffskontrolle mit Replaceable Events

### 🏗️ Warum nicht NIP-29 oder NIP-17?

Wir haben uns bewusst **gegen NIP-29** (Relay-basierte Gruppen) und **NIP-17** (Gift-Wrapped Messages) entschieden und stattdessen eine eigene Lösung mit **client-seitiger AES-GCM-Verschlüsselung** und **Whitelist-basiertem privaten Chat** entwickelt.

**Hauptgründe gegen NIP-29:**
- 🔐 **Maximale Privatsphäre**: Relay sieht nur verschlüsselte Events, keine Gruppenmitglieder
- 🌐 **Relay-Unabhängigkeit**: Funktioniert mit jedem Standard-Relay (kein spezieller NIP-29 Relay nötig)
- 🛡️ **Zensur-Resistenz**: Keine zentrale Kontrolle durch Relay-Admin
- 🎭 **Anonyme Angebote**: Temporäre Keypairs für Marketplace
- 🎯 **Einfachheit**: Client-seitige Logik statt komplexer Server-Verwaltung

**Hauptgründe gegen NIP-17:**
- 🔧 **Komplexität**: Separate Chat-UI und Infrastruktur nötig
- 📦 **Mehr Code**: Zusätzliche Implementierung für Gift-Wrapping
- 🐛 **Fehleranfällig**: Mehr Komponenten = mehr potenzielle Fehlerquellen
- 🔄 **Wartung**: Zwei separate Chat-Systeme zu pflegen
- ✅ **Whitelist-Lösung**: Nutzt bestehende, getestete Infrastruktur

📚 **Detaillierte Architektur-Analyse**: Siehe [`docs/ARCHITECTURE-DECISIONS.md`](docs/ARCHITECTURE-DECISIONS.md) und [`docs/CHAT-FLOW-ANALYSE.md`](docs/CHAT-FLOW-ANALYSE.md)

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