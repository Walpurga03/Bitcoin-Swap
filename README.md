# 🪙 Bitcoin-Tausch-Netzwerk

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://bitcoin-swap-gmsbyi0um-walpurga03s-projects.vercel.app)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-5.4-FF3E00?logo=svelte)](https://kit.svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Nostr](https://img.shields.io/badge/Nostr-Protocol-8B5CF6)](https://github.com/nostr-protocol/nostr)

> **Eine dezentrale, verschlüsselte Plattform für sichere Bitcoin-Tauschgeschäfte über das Nostr-Protokoll**

Anonyme Marktplatz-Angebote treffen auf Ende-zu-Ende-verschlüsselte Deal-Rooms – alles ohne zentrale Server, vollständig dezentral über Nostr-Relays.

---

## ✨ Features

### 🔐 **Deal-Room System**
- **Private verschlüsselte Chats** zwischen Käufer und Verkäufer
- **AES-256-CBC Verschlüsselung** mit gruppenspezifischen Keys
- **Automatische Deal-Room-Erstellung** beim Interesse zeigen
- **Sichere Schlüsselverwaltung** im Browser (IndexedDB)

### 🛒 **Anonymer Marketplace**
- **Temporäre Keypairs** für vollständige Anonymität
- **Öffentliche Angebote** sichtbar für alle Nutzer
- **Interesse-System** mit automatischer Deal-Room-Einladung
- **NIP-09 Delete Events** zum Zurückziehen von Interesse

### 🎨 **Nostr Dark Theme**
- **Modernes Design** in Pink (#FF006E), Violett (#8B5CF6) und Schwarz
- **Responsive Layout** für Desktop, Tablet und Mobile
- **Smooth Animations** und Transitions
- **Accessibility-optimiert** mit Keyboard-Support

### 🌐 **Dezentrale Architektur**
- **Nostr-Protokoll** (NIP-01, NIP-09, NIP-12)
- **Keine zentralen Server** – vollständig P2P
- **Relay-basierte Persistenz** mit lokalem Cache
- **Echtzeit-Synchronisation** über WebSockets

### ⚡ **Lightning-Spenden**
- **Bitcoin-Orange Spenden-Button** auf allen Seiten
- **Lightning-Adresse** mit Ein-Klick-Kopieren
- **Floating Design** – nicht aufdringlich

---

## 🚀 Quick Start

### Voraussetzungen

- **Node.js** 18+ und **npm**
- Ein **Nostr-Relay** mit NIP-12 Support (empfohlen: eigener Relay)

### Installation

```bash
# Repository klonen
git clone https://github.com/Walpurga03/Bitcoin-Swap.git
cd Bitcoin-Swap

# Dependencies installieren
npm install

# Development Server starten
npm run dev
```

Die App läuft auf `http://localhost:5173`

---

## 📖 Verwendung

### 1️⃣ **Login mit Nostr-Profil**

1. Öffne die App
2. Gib deinen **NSEC Private Key** ein (oder Hex-Format)
3. Dein **Nostr-Profil** wird automatisch geladen (Name, Bild)
4. Klicke auf "Anmelden"

> **Tipp:** Dein Private Key bleibt im Browser und wird niemals übertragen!

### 2️⃣ **Marketplace: Angebot erstellen**

1. Klicke auf **"+ Neues Angebot"**
2. Beschreibe dein Angebot (z.B. "Verkaufe 0.01 BTC für 500€")
3. Ein **temporärer Keypair** wird automatisch generiert
4. Dein Angebot ist jetzt **anonym** für alle sichtbar

### 3️⃣ **Interesse zeigen**

1. Finde ein interessantes Angebot
2. Klicke auf **"💬 Interesse zeigen"**
3. Ein **privater Deal-Room** wird automatisch erstellt
4. Du erhältst eine **verschlüsselte Einladung**

### 4️⃣ **Deal-Room: Sicherer Chat**

1. Öffne den **Deal-Room** über die Benachrichtigung
2. Chatte **Ende-zu-Ende-verschlüsselt** mit dem Anbieter
3. Vereinbare die **Transaktionsdetails** sicher
4. Wickle den **Tausch außerhalb der App** ab

> **Wichtig:** Die App dient nur zur Kontaktanbahnung. Die eigentliche Transaktion erfolgt extern!

---

## 🏗️ Projekt-Struktur

```
Bitcoin-Tausch-Netzwerk/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── DonationButton.svelte    # Lightning-Spenden-Button
│   │   ├── nostr/
│   │   │   ├── types.ts                 # TypeScript Interfaces
│   │   │   ├── client.ts                # Nostr Client & Events
│   │   │   └── crypto.ts                # AES-256 Verschlüsselung
│   │   ├── security/
│   │   │   └── validation.ts            # Input-Validierung
│   │   ├── stores/
│   │   │   ├── userStore.ts             # User State
│   │   │   ├── groupStore.ts            # Group State
│   │   │   └── dealStore.ts             # Deal-Room State
│   │   └── utils/
│   │       └── index.ts                 # Utility-Funktionen
│   ├── routes/
│   │   ├── +page.svelte                 # Login-Seite
│   │   ├── +layout.svelte               # Layout mit Donation-Button
│   │   └── (app)/
│   │       ├── group/+page.svelte       # Marketplace
│   │       └── deal/[dealId]/+page.svelte  # Deal-Room Chat
│   └── app.css                          # Nostr Dark Theme
├── package.json                         # Dependencies
├── vite.config.ts                       # Vite Config
├── svelte.config.js                     # SvelteKit Config
├── tsconfig.json                        # TypeScript Config
├── vercel.json                          # Vercel Deployment
├── .env.example                         # Environment Variables
├── .gitignore                           # Git Ignore
└── README.md                            # Diese Datei
```

---

## 🔐 Sicherheit

### Implementierte Maßnahmen

✅ **Client-seitige Verschlüsselung** – Private Keys bleiben im Browser  
✅ **AES-256-CBC** – Militärische Verschlüsselung für Deal-Rooms  
✅ **Temporäre Keypairs** – Vollständige Anonymität im Marketplace  
✅ **Signatur-Validierung** – Alle Nostr-Events werden validiert  
✅ **Input-Validierung** – Schutz vor Injection-Angriffen  
✅ **Rate-Limiting** – Schutz vor Spam (20 Requests/Minute)  
✅ **IndexedDB** – Sichere lokale Speicherung von Keys  

### Best Practices

1. **Private Keys**: Niemals in Git committen oder teilen
2. **Relays**: Verwende vertrauenswürdige Relays oder betreibe eigene
3. **Transaktionen**: Wickle Bitcoin-Transfers nur über sichere Kanäle ab
4. **Backups**: Sichere deinen NSEC Private Key offline

---

## 🌐 Nostr NIPs

Dieses Projekt implementiert folgende Nostr Implementation Possibilities:

- **NIP-01**: Basic Protocol Flow (Events, Signing, Validation)
- **NIP-09**: Event Deletion (Angebote & Interesse zurückziehen)
- **NIP-12**: Generic Tag Queries (`#t=bitcoin-group` Filtering)
- **Custom Encryption**: AES-256-CBC für Deal-Rooms

### Warum eigene Verschlüsselung?

Wir verwenden **AES-256-CBC** statt NIP-04 oder NIP-17, weil:

- 🔐 **Gruppenverschlüsselung**: Ein Key für alle Deal-Room-Teilnehmer
- 🎯 **Einfachheit**: Weniger Komplexität als Gift-Wrapped Messages
- 🛡️ **Bewährt**: AES-256 ist militärischer Standard
- 🚀 **Performance**: Schneller als mehrfache Verschlüsselung

---

## 📦 Deployment

### Vercel (empfohlen)

```bash
# Vercel CLI installieren
npm install -g vercel

# Login
vercel login

# Deployment
vercel --prod
```

**Live URL**: [https://bitcoin-swap-gmsbyi0um-walpurga03s-projects.vercel.app](https://bitcoin-swap-gmsbyi0um-walpurga03s-projects.vercel.app)

### Andere Plattformen

```bash
# Build erstellen
npm run build

# 'build' Ordner deployen
# Adapter kann in svelte.config.js angepasst werden
```

---

## 🛠️ Technologie-Stack

| Kategorie | Technologie |
|-----------|-------------|
| **Frontend** | SvelteKit 2.15, Svelte 4.2 |
| **Sprache** | TypeScript 5.7 |
| **Protokoll** | Nostr (nostr-tools 2.10) |
| **Verschlüsselung** | AES-256-CBC (Web Crypto API) |
| **Build-Tool** | Vite 5.4 |
| **Deployment** | Vercel (@sveltejs/adapter-vercel) |
| **Styling** | Custom CSS mit Nostr Dark Theme |

---

## 🤝 Beitragen

Contributions sind willkommen! So kannst du helfen:

1. **Fork** das Repository
2. **Branch** erstellen: `git checkout -b feature/AmazingFeature`
3. **Commit** deine Änderungen: `git commit -m 'Add AmazingFeature'`
4. **Push** zum Branch: `git push origin feature/AmazingFeature`
5. **Pull Request** öffnen

---

## 💰 Spenden

Unterstütze die Entwicklung mit Bitcoin Lightning:

**Lightning-Adresse**: `aldo.barazutti@walletofsatoshi.com`

Oder nutze den **Spenden-Button** in der App (unten rechts) ⚡

---

## 📄 Lizenz

MIT License – siehe [LICENSE](LICENSE) für Details

---

## ⚠️ Disclaimer

- Dies ist eine **Proof-of-Concept-Implementation**
- Für Production sollten **zusätzliche Sicherheitsaudits** durchgeführt werden
- Private Keys sollten **sicher gespeichert** werden (z.B. mit Browser-Extension)
- Die App dient nur zur **Kontaktanbahnung** – Transaktionen erfolgen extern

---

## 🔗 Links

- [Nostr Protocol](https://github.com/nostr-protocol/nostr)
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools)
- [SvelteKit](https://kit.svelte.dev/)
- [Vercel](https://vercel.com/)

---

## 📞 Support

Bei Fragen oder Problemen:

1. Öffne ein **Issue** auf GitHub
2. Prüfe die **Browser-Console** (F12) für Debug-Informationen
3. Kontaktiere uns über **Nostr** (npub...)

---

**Entwickelt mit ❤️ für die dezentrale Zukunft**

*Powered by Nostr Protocol & Bitcoin Lightning Network*