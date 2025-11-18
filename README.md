# 🪙 Bitcoin-Tausch-Netzwerk

> **Ein dezentrales, anonymes Bitcoin-Tausch-Netzwerk auf Basis von Nostr + P2P WebRTC**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Svelte](https://img.shields.io/badge/Svelte-FF3E00?style=flat&logo=svelte&logoColor=white)](https://svelte.dev/)
[![Nostr](https://img.shields.io/badge/Nostr-Protocol-purple?style=flat)](https://nostr.com/)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P-blue?style=flat)](https://webrtc.org/)

---

## 📋 Inhaltsverzeichnis

- [Überblick](#-überblick)
- [Features](#-features)
- [Architektur](#-architektur)
- [Installation](#-installation)
- [Verwendung](#-verwendung)
- [Technische Details](#-technische-details)
- [Dokumentation](#-dokumentation)
- [Deployment](#-deployment)
- [Sicherheit](#-sicherheit)
- [Lizenz](#-lizenz)

---

## 🎯 Überblick

Bitcoin-Tausch-Netzwerk ist eine **dezentrale Plattform** für anonyme Bitcoin-Tauschgeschäfte. Die Anwendung kombiniert **Nostr-Relays** für den öffentlichen Marketplace mit **P2P WebRTC** für private, verschlüsselte Deal-Räume.

### Hauptmerkmale

- 🎭 **Vollständige Anonymität** - Temporäre Keypairs für Angebote
- 🔐 **Ende-zu-Ende Verschlüsselung** - P2P WebRTC ohne Server-Beteiligung
- 🌐 **Dezentral** - Keine zentrale Datenbank oder Server
- ⚡ **Schnell** - Direkte Peer-to-Peer Verbindungen
- 🛡️ **Sicher** - Whitelist-System und NIP-04 Verschlüsselung

---

## ✨ Features

### 🛒 Marketplace

- **Angebote erstellen**: Anonyme Bitcoin-Tauschgeschäfte veröffentlichen
- **Interesse zeigen**: Signal an Angebotsgeber senden
- **Automatisches Expiry**: Angebote verfallen nach 72 Stunden
- **Whitelist-System**: Admin-kontrollierter Zugang

### 💬 P2P Deal-Räume

- **WebRTC Chat**: Direkte, verschlüsselte Kommunikation
- **Kein Relay**: Nachrichten gehen niemals über Nostr-Relays
- **BitTorrent Discovery**: Peer-Finding über öffentliche Tracker
- **Desktop-Optimiert**: Läuft stabil auf Desktop-Browsern

### 🔐 Sicherheit

- **Temporäre Keypairs**: Jedes Angebot hat eigenes Keypair
- **Secret-basierte Auth**: Wiederherstellung via Secret Phrase
- **NIP-04 Verschlüsselung**: Interesse-Signale verschlüsselt
- **Admin-Controls**: Whitelist für vertrauenswürdige Nutzer

---

## 🏗️ Architektur

```
┌───────────────────────────────────────────────────┐
│                  Browser (Client)                 │
├───────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────────┐         ┌──────────────┐        │
│  │  Marketplace │◄────────┤ Nostr Relay  │        │
│  │   (Public)   │         │   (Public)   │        │
│  └──────────────┘         └──────────────┘        │
│         │                                         │
│         │ Interest Signal (NIP-04)                │
│         ▼                                         │
│  ┌──────────────┐                                 │
│  │  Deal Room   │◄────────┐                       │
│  │  (P2P Chat)  │         │ WebRTC (Direct)       │
│  └──────────────┘         │                       │
│                           │                       │
└───────────────────────────┼───────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Peer Browser  │
                    │   (P2P Chat)   │
                    └────────────────┘
```

### Technologie-Stack

- **Frontend**: SvelteKit + TypeScript
- **Nostr**: nostr-tools (NIP-01, NIP-04, NIP-13)
- **P2P**: Trystero (WebRTC via BitTorrent)
- **Crypto**: secp256k1, AES-CBC
- **Deployment**: Vercel

---

## � Installation

### Voraussetzungen

- Node.js 18+ 
- npm oder pnpm

### Setup

```bash
# Repository klonen
git clone https://github.com/Walpurga03/Bitcoin-Swap.git
cd Bitcoin-Tausch-Netzwerk

# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev

# Production Build
npm run build
```

### Umgebungsvariablen

Keine erforderlich - alles läuft client-side!

---

## 📖 Verwendung

### 1. Admin erstellt Gruppe

**Nur für Admins:**

1. Öffne die Anwendung
2. Erstelle eine neue Gruppe mit eigenem Secret
3. Konfiguriere Whitelist (füge Pubkeys hinzu)
4. Teile Einladung an Mitglieder:
   - **QR-Code** scannen lassen (mobil)
   - **Einladungs-Link** versenden (z.B. `https://app-url.com/?secret=DeinGruppenSecret123`)

### 2. Mitglied tritt bei

**Für eingeladene User:**

1. Scanne QR-Code oder öffne Einladungs-Link
2. App lädt automatisch das Gruppen-Secret
3. Melde dich mit deinem Nostr-Keypair an
4. Whitelist-Check → Zugang gewährt ✅

### 3. Angebot erstellen

1. Klicke "Neues Angebot"
2. Beschreibe dein Bitcoin-Tauschgeschäft
3. Veröffentliche (automatisch mit temp. Keypair)
4. **Wichtig:** Speichere dein Offer-Secret!

### 4. Interesse zeigen

1. Durchsuche Angebote im Marketplace
2. Klicke "Interesse zeigen"
3. Warte auf Auswahl durch Angebotsgeber

### 5. Deal-Room nutzen

1. Warte auf Benachrichtigung
2. Öffne Deal-Room (P2P WebRTC)
3. Chatte direkt mit deinem Handelspartner
4. Tausche Bitcoin-Details aus

---

## 🔧 Technische Details

### Nostr Integration

- **NIP-01**: Basic Event Structure (Events, Subscriptions)
- **NIP-04**: Encrypted Direct Messages (Interest Signals, Deal Notifications)
- **NIP-05**: Nostr Address (nur Anzeige, keine Verifikation)

> **Hinweis:** NIP-05 Adressen werden aus User-Profilen (Kind 0) gelesen und angezeigt, aber **nicht verifiziert** (kein `.well-known/nostr.json` Fetch).

### Anonymitäts-Konzept

1. **Marketplace**: Temp. Keypairs pro Angebot
2. **Interest Signals**: Verschlüsselt via NIP-04
3. **Deal-Room**: P2P WebRTC (kein Relay)
4. **Room-ID**: Deterministisch aus Secrets

### P2P WebRTC Details

- **Library**: Trystero
- **Strategy**: torrent (BitTorrent Tracker)
- **Appid**: Bitcoin-Tausch-P2P
- **Encryption**: Browser-native WebRTC Encryption

---

## 📚 Dokumentation

| Dokument | Beschreibung |
|----------|-------------|
| [AKTUELLER-STAND.md](./AKTUELLER-STAND.md) | Vollständiger technischer Status |
| [ANONYMITAET-ERKLAERT.md](./ANONYMITAET-ERKLAERT.md) | Anonymitäts-Mechanismen erklärt |
| [WORKFLOW.md](./WORKFLOW.md) | User-Journey & Prozesse |
| [PROJEKT-STRUKTUR.md](./PROJEKT-STRUKTUR.md) | Dateistruktur & Organisation |

---

## 🌐 Deployment

### Vercel (Empfohlen)

```bash
# Vercel CLI installieren
npm i -g vercel

# Deployen
vercel

# Production Deployment
vercel --prod
```

### Andere Plattformen

Die App ist eine statische SvelteKit-Anwendung und kann auf jeder Platform deployed werden, die Node.js SSR unterstützt:

- Netlify
- Cloudflare Pages
- GitHub Pages (mit Adapter)
- Self-hosted (Node.js)

---

## 🛡️ Sicherheit

### Best Practices

- ✅ Speichere deine Secrets sicher (Passwort-Manager)
- ✅ Nutze nur vertrauenswürdige Nostr-Relays
- ✅ Überprüfe Room-IDs vor dem Chat-Beitritt
- ✅ Teile niemals deine Private Keys

### Bekannte Limitierungen

- **Mobile NAT/Firewall**: P2P WebRTC funktioniert am besten auf Desktop
- **Browser-Support**: Chromium-basierte Browser empfohlen
- **Relay-Verfügbarkeit**: Abhängig von Nostr-Relay-Uptime

---

## 🤝 Mitwirken

Contributions sind willkommen! Bitte:

1. Forke das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Committe deine Änderungen (`git commit -m 'Add AmazingFeature'`)
4. Pushe zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

---

## 📜 Lizenz

Dieses Projekt ist unter der **MIT License** lizenziert - siehe [LICENSE](./LICENSE) Datei für Details.

---

## 👤 Autor

**Walpurga03**

- GitHub: [@Walpurga03](https://github.com/Walpurga03)
- Repository: [Bitcoin-Swap](https://github.com/Walpurga03/Bitcoin-Swap)

---

## 🙏 Danksagungen

- [Nostr Protocol](https://nostr.com/) - Dezentrales Social Protocol
- [Trystero](https://github.com/dmotz/trystero) - P2P WebRTC Library
- [SvelteKit](https://kit.svelte.dev/) - Web Framework
- [nostr-tools](https://github.com/nbd-wtf/nostr-tools) - Nostr JavaScript Library

---

<div align="center">

**[⬆ Nach oben](#-bitcoin-tausch-netzwerk)**

Made with ❤️ and ⚡ Bitcoin

</div>