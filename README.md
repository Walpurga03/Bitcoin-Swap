# 🛒 Bitcoin Tausch Netzwerk# 🪙 Bitcoin-Tausch-Netzwerk



[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://bitcoin-swap-gmsbyi0um-walpurga03s-projects.vercel.app)[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://bitcoin-swap-gmsbyi0um-walpurga03s-projects.vercel.app)

[![SvelteKit](https://img.shields.io/badge/SvelteKit-5.4-FF3E00?logo=svelte)](https://kit.svelte.dev/)[![SvelteKit](https://img.shields.io/badge/SvelteKit-5.4-FF3E00?logo=svelte)](https://kit.svelte.dev/)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)

[![Nostr](https://img.shields.io/badge/Nostr-Protocol-8B5CF6)](https://github.com/nostr-protocol/nostr)[![Nostr](https://img.shields.io/badge/Nostr-Protocol-8B5CF6)](https://github.com/nostr-protocol/nostr)



> **Privacy-First Bitcoin Trading Platform mit NIP-17 verschlüsselten Nachrichten**> **Eine dezentrale, verschlüsselte Plattform für sichere Bitcoin-Tauschgeschäfte über das Nostr-Protokoll**



Ein dezentrales, anonymes Bitcoin-Tauschsystem basierend auf Nostr, das vollständig verschlüsselte private Kommunikation zwischen Handelspartnern ermöglicht.Anonyme Marktplatz-Angebote treffen auf Ende-zu-Ende-verschlüsselte Deal-Rooms – alles ohne zentrale Server, vollständig dezentral über Nostr-Relays.



## ✨ Features---



### 🔐 **Privacy-First Design**## ✨ Features

- **Keine öffentlichen Interest-Tracker** - Alle Interessensbekundungen sind privat

- **NIP-17 verschlüsselte Nachrichten** - Ende-zu-Ende Verschlüsselung zwischen Usern### 🔐 **Deal-Room System**

- **Anonyme Angebote** - Temporäre Keypairs schützen die Identität- **Private verschlüsselte Chats** zwischen Käufer und Verkäufer

- **Private Deal-Rooms** - Geschützte Kommunikation für Handelsprozesse- **AES-256-CBC Verschlüsselung** mit gruppenspezifischen Keys

- **Automatische Deal-Room-Erstellung** beim Interesse zeigen

### 💬 **Erweiterte Kommunikation**- **Sichere Schlüsselverwaltung** im Browser (IndexedDB)

- **Persönliche Nachrichten** - Nutzer können persönliche Nachrichten in Deal-Anfragen senden

- **Verschlüsselte DMs** - Alle Nachrichten sind NIP-17 verschlüsselt### 🛒 **Anonymer Marketplace**

- **Multi-User Support** - Skalierbare Architektur für beliebig viele Nutzer- **Temporäre Keypairs** für vollständige Anonymität

- **Real-time Updates** - Live-Aktualisierung von Anfragen und Angeboten- **Öffentliche Angebote** sichtbar für alle Nutzer

- **Interesse-System** mit automatischer Deal-Room-Einladung

### 🤝 **Nahtloser Handel**- **NIP-09 Delete Events** zum Zurückziehen von Interesse

- **Ein-Klick Angebotserstellung** - Einfache Erstellung von Bitcoin-Tauschangeboten

- **Smart Deal-Management** - Automatische Weiterleitung zu privaten Deal-Rooms### 🎨 **Nostr Dark Theme**

- **Automatisches Cleanup** - Angebote werden nach Deal-Erstellung automatisch gelöscht- **Modernes Design** in Pink (#FF006E), Violett (#8B5CF6) und Schwarz

- **Robuste Fehlerbehandlung** - Zuverlässige Funktionalität auch bei Netzwerkproblemen- **Responsive Layout** für Desktop, Tablet und Mobile

- **Smooth Animations** und Transitions

### 🔧 **Technische Highlights**- **Accessibility-optimiert** mit Keyboard-Support

- **NIP-17 Implementation** - Vollständige Unterstützung für verschlüsselte Direktnachrichten

- **Author-Tag System** - Verknüpfung temporärer Keypairs mit echten Nutzerprofilen### 🌐 **Dezentrale Architektur**

- **NIP-09 Delete Events** - Korrekte Löschung von Angeboten aus Nostr-Relays- **Nostr-Protokoll** (NIP-01, NIP-09, NIP-12)

- **Modern UI/UX** - Responsive Design mit SvelteKit- **Keine zentralen Server** – vollständig P2P

- **Relay-basierte Persistenz** mit lokalem Cache

## 🚀 Schnellstart- **Echtzeit-Synchronisation** über WebSockets



### Voraussetzungen### ⚡ **Lightning-Spenden**

- Node.js 18+ - **Bitcoin-Orange Spenden-Button** auf allen Seiten

- npm oder yarn- **Lightning-Adresse** mit Ein-Klick-Kopieren

- **Floating Design** – nicht aufdringlich

### Installation

```bash---

# Repository klonen

git clone https://github.com/Walpurga03/Bitcoin-Tausch-Netzwerk.git## 🚀 Quick Start

cd Bitcoin-Tausch-Netzwerk

### Voraussetzungen

# Dependencies installieren

npm install- **Node.js** 18+ und **npm**

- Ein **Nostr-Relay** mit NIP-12 Support (empfohlen: eigener Relay)

# Development Server starten

npm run dev### Installation

```

```bash

### Erste Schritte# Repository klonen

1. **Account erstellen** - Generiere automatisch ein Nostr-Keypairgit clone https://github.com/Walpurga03/Bitcoin-Swap.git

2. **Gruppe beitreten** - Verwende einen Einladungslink oder erstelle eine neue Gruppecd Bitcoin-Swap

3. **Angebot erstellen** - Stelle dein Bitcoin-Tauschangebot ein

4. **Private Anfragen erhalten** - Andere Nutzer können verschlüsselte Interessensbekundungen senden# Dependencies installieren

5. **Deal-Room starten** - Wähle einen Partner und beginne den privaten Handelnpm install



## 🏗️ Architektur# Development Server starten

npm run dev

### Nostr Integration```

- **Relays**: Dezentrale Nachrichtenübertragung

- **NIP-17**: Ende-zu-Ende verschlüsselte DirektnachrichtenDie App läuft auf `http://localhost:5173`

- **NIP-09**: Saubere Löschung von Events

- **Temporary Keypairs**: Anonymer Handel ohne Preisgabe der Hauptidentität---



### Komponenten-Struktur## 📖 Verwendung

```

src/### 1️⃣ **Neue Gruppe erstellen (Admin)**

├── lib/

│   ├── components/          # UI Komponenten1. Öffne die App und wähle **"🆕 Neue Gruppe erstellen"**

│   │   ├── InterestModal.svelte    # Deal-Anfrage Interface2. Gib deinen **NSEC Private Key** ein (du wirst automatisch Admin)

│   │   ├── InterestList.svelte     # Anzeige eingehender Anfragen3. Wähle ein **Relay** (Standard oder eigenes)

│   │   └── WhitelistModal.svelte   # Admin-Funktionen4. Lasse das **Secret automatisch generieren** oder gib ein eigenes ein (min. 8 Zeichen)

│   ├── nostr/              # Nostr-Implementierung5. Dein **Nostr-Profil** wird automatisch geladen

│   │   ├── nip17.ts        # Verschlüsselte Messaging6. Klicke auf **"🚀 Gruppe erstellen"**

│   │   ├── marketplace.ts  # Angebots-Management

│   │   ├── crypto.ts       # Kryptographische Funktionen> **Als Admin kannst du:**

│   │   └── client.ts       # Nostr-Client> - Die Whitelist verwalten (Public Keys hinzufügen/entfernen)

│   └── stores/             # Svelte Stores> - Einladungslinks für neue User generieren

├── routes/                 # SvelteKit Routes> - Die Gruppe vollständig kontrollieren

│   ├── (app)/group/        # Haupt-Trading Interface

│   ├── admin/              # Admin-Panel### 2️⃣ **Gruppe beitreten (User)**

│   └── +page.svelte        # Landing Page

```1. Erhalte einen **Einladungslink** vom Gruppen-Admin

2. Öffne die App und wähle **"🔗 Gruppe beitreten"**

## 🔐 Sicherheit & Privacy3. Füge den **Einladungslink** ein

4. Gib deinen **NSEC Private Key** ein

### Verschlüsselung5. Dein **Nostr-Profil** wird geladen und gegen die **Whitelist** geprüft

- **NIP-17 Encryption**: Alle Nachrichten sind mit ECDH + ChaCha20-Poly1305 verschlüsselt6. Klicke auf **"🔗 Gruppe beitreten"**

- **Forward Secrecy**: Einmalige Schlüssel für jede Nachricht

- **Metadata Protection**: Minimale Metadaten, maximale Privacy> **Wichtig:** Dein Public Key muss vom Admin zur Whitelist hinzugefügt worden sein!



### Anonymität> **Tipp:** Dein Private Key bleibt im Browser und wird niemals übertragen!

- **Temporary Keypairs**: Angebote werden mit temporären Schlüsseln erstellt

- **Author Tags**: Sichere Verknüpfung ohne Identitätspreisgabe### 3️⃣ **Marketplace: Angebot erstellen**

- **No Public Tracking**: Keine öffentlich sichtbaren Interest-Tracker

1. Klicke auf **"+ Neues Angebot"**

### Authentizität2. Beschreibe dein Angebot (z.B. "Verkaufe 0.01 BTC für 500€")

- **Kryptographische Signaturen**: Alle Events sind digital signiert3. Ein **temporärer Keypair** wird automatisch generiert

- **Relay Verification**: Mehrere Relays für Redundanz4. Dein Angebot ist jetzt **anonym** für alle sichtbar

- **Delete Authentication**: Nur Ersteller können eigene Angebote löschen

### 4️⃣ **Interesse zeigen**

## 🛠️ Development

1. Finde ein interessantes Angebot

### Projekt-Setup2. Klicke auf **"💬 Interesse zeigen"**

```bash3. Ein **privater Deal-Room** wird automatisch erstellt

# Development mit Hot-Reload4. Du erhältst eine **verschlüsselte Einladung**

npm run dev

### 5️⃣ **Deal-Room: Sicherer Chat**

# Production Build

npm run build1. Öffne den **Deal-Room** über die Benachrichtigung

2. Chatte **Ende-zu-Ende-verschlüsselt** mit dem Anbieter

# Preview Build3. Vereinbare die **Transaktionsdetails** sicher

npm run preview4. Wickle den **Tausch außerhalb der App** ab



# Type Checking### 6️⃣ **Admin: Whitelist verwalten**

npm run check

```1. Als Admin klicke auf **"🔐 Whitelist verwalten"**

2. **Public Keys hinzufügen**: Gib npub oder hex ein und klicke auf "➕ Hinzufügen"

### Wichtige NPM Scripts3. **Public Keys entfernen**: Klicke auf "🗑️ Entfernen" neben einem Eintrag

- `dev` - Development Server (Port 5173)4. **Einladungslink generieren**: Klicke auf "✨ Link generieren" und teile ihn mit neuen Usern

- `build` - Production Build für Deployment

- `preview` - Preview der Production Build> **Wichtig:** Die App dient nur zur Kontaktanbahnung. Die eigentliche Transaktion erfolgt extern!

- `check` - TypeScript Type Checking

- `check:watch` - Type Checking im Watch-Modus---



### Code-Struktur## 🏗️ Projekt-Struktur

- **SvelteKit** - Full-Stack Web Framework

- **TypeScript** - Type-Safe Development```

- **Nostr-Tools** - Nostr Protocol ImplementationBitcoin-Tausch-Netzwerk/

- **NDK** - Nostr Development Kit für erweiterte Features├── src/

│   ├── lib/

## 📚 API Referenz│   │   ├── components/

│   │   │   └── DonationButton.svelte    # Lightning-Spenden-Button

### Marketplace API│   │   ├── nostr/

```typescript│   │   │   ├── types.ts                 # TypeScript Interfaces

// Angebot erstellen│   │   │   ├── client.ts                # Nostr Client & Events

await createOffer(content, tempKeypair, relay, channelId, authorPubkey);│   │   │   └── crypto.ts                # AES-256 Verschlüsselung

│   │   ├── security/

// Angebote laden│   │   │   └── validation.ts            # Input-Validierung

const offers = await loadOffers(relay, channelId, ownTempPubkey);│   │   ├── stores/

│   │   │   ├── userStore.ts             # User State

// Angebot löschen│   │   │   ├── groupStore.ts            # Group State

await deleteOffer(offerId, tempPrivateKey, tempPublicKey, relay);│   │   │   └── dealStore.ts             # Deal-Room State

```│   │   └── utils/

│   │       └── index.ts                 # Utility-Funktionen

### NIP-17 Messaging API│   ├── routes/

```typescript│   │   ├── +page.svelte                 # Login-Seite

// Verschlüsselte Nachricht senden│   │   ├── +layout.svelte               # Layout mit Donation-Button

await sendDirectMessage(senderPrivateKey, recipientPubkey, content, relay);│   │   └── (app)/

│   │       ├── group/+page.svelte       # Marketplace

// Deal-Anfragen laden│   │       └── deal/[dealId]/+page.svelte  # Deal-Room Chat

const requests = await loadDealRequests(recipientPrivateKey, relay);│   └── app.css                          # Nostr Dark Theme

├── package.json                         # Dependencies

// Deal-Room erstellen├── vite.config.ts                       # Vite Config

const dealId = await createDealRoom(privateKey, partnerPubkey, content, relay);├── svelte.config.js                     # SvelteKit Config

```├── tsconfig.json                        # TypeScript Config

├── vercel.json                          # Vercel Deployment

## 🤝 Contributing├── .env.example                         # Environment Variables

├── .gitignore                           # Git Ignore

Beiträge sind willkommen! Bitte beachte:└── README.md                            # Diese Datei

```

1. **Fork** das Repository

2. **Feature Branch** erstellen (`git checkout -b feature/amazing-feature`)---

3. **Commit** deine Änderungen (`git commit -m 'Add amazing feature'`)

4. **Push** zu Branch (`git push origin feature/amazing-feature`)## 🔐 Sicherheit

5. **Pull Request** öffnen

### Implementierte Maßnahmen

### Development Guidelines

- TypeScript für alle neuen Features✅ **Client-seitige Verschlüsselung** – Private Keys bleiben im Browser  

- Comprehensive Error Handling✅ **AES-256-CBC** – Militärische Verschlüsselung für Deal-Rooms  

- Privacy-First Design Principles✅ **Temporäre Keypairs** – Vollständige Anonymität im Marketplace  

- Responsive UI Components✅ **Signatur-Validierung** – Alle Nostr-Events werden validiert  

- Ausführliche Code-Dokumentation✅ **Input-Validierung** – Schutz vor Injection-Angriffen  

✅ **Rate-Limiting** – Schutz vor Spam (20 Requests/Minute)  

## 📄 Lizenz✅ **IndexedDB** – Sichere lokale Speicherung von Keys  



Dieses Projekt ist unter der MIT Lizenz veröffentlicht. Siehe [LICENSE](LICENSE) für Details.### Best Practices



## 🔗 Links1. **Private Keys**: Niemals in Git committen oder teilen

2. **Relays**: Verwende vertrauenswürdige Relays oder betreibe eigene

- **Nostr Protocol**: [nostr.com](https://nostr.com)3. **Transaktionen**: Wickle Bitcoin-Transfers nur über sichere Kanäle ab

- **NIP-17 Specification**: [github.com/nostr-protocol/nips](https://github.com/nostr-protocol/nips/blob/master/17.md)4. **Backups**: Sichere deinen NSEC Private Key offline

- **SvelteKit Docs**: [kit.svelte.dev](https://kit.svelte.dev)

- **NDK Documentation**: [ndk.fyi](https://ndk.fyi)---



---## 🌐 Nostr NIPs



**⚡ Dezentral. Privat. Sicher. ⚡**Dieses Projekt implementiert folgende Nostr Implementation Possibilities:



*Gebaut für die Bitcoin-Community von der Bitcoin-Community.*- **NIP-01**: Basic Protocol Flow (Events, Signing, Validation)
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
3. Kontaktiere uns über **Nostr** (npub1hht9umpeet75w55uzs9lq6ksayfpcvl9lk64hye75j0yj4husq5ss8xsry)

---

**Entwickelt mit ❤️ für die dezentrale Zukunft**

*Powered by Nostr Protocol & Bitcoin Lightning Network*