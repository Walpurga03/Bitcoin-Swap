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

### Kernprinzip

- 🎭 **Anonymität**: Temporäre Keypairs für Angebote
- 🔐 **Verschlüsselung**: NIP-04 + P2P WebRTC
- 🌐 **Dezentral**: Keine zentrale Datenbank
- ⚡ **Schnell**: Direkte Peer-to-Peer Verbindungen

---

## ✨ Features

### 🛒 Marketplace
- Anonyme Angebote veröffentlichen (Temp-Keypairs)
- Interesse zeigen (NIP-04 verschlüsselt)
- Automatisches Expiry (72 Stunden)
- Admin-Whitelist für vertrauenswürdige Nutzer

### 💬 P2P Deal-Räume
- Direkte WebRTC-Verbindung (kein Relay)
- BitTorrent Discovery für Peer-Finding
- Identity Exchange via P2P (keine Relay-Metadaten)

> **Hinweis:** Für detaillierte Informationen siehe [AKTUELLER-STAND.md](./AKTUELLER-STAND.md) und [WORKFLOW.md](./WORKFLOW.md)

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

- **Frontend**: [SvelteKit](https://kit.svelte.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Nostr**: [nostr-tools](https://github.com/nbd-wtf/nostr-tools) ([NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md), [NIP-04](https://github.com/nostr-protocol/nips/blob/master/04.md), [NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md))
- **P2P**: [Trystero](https://github.com/dmotz/trystero) (WebRTC via BitTorrent)
- **Crypto**: [secp256k1](https://github.com/bitcoin-core/secp256k1), [AES-GCM](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt#aes-gcm)
- **Deployment**: [Vercel](https://vercel.com/)

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

### Schnellstart

1. **Admin**: Erstelle Gruppe → Teile QR-Code/Link mit Mitgliedern
2. **Mitglied**: Scanne QR → Melde dich an (Nostr nsec) → Erstelle Angebote
3. **Deal**: Interesse zeigen → Warte auf Auswahl → Chatte via P2P WebRTC

### Detaillierter Workflow

**1. Gruppe erstellen (Admin)**
- Erstelle Gruppen-Secret
- Konfiguriere Relay (z.B. wss://damus.io)
- Füge Mitglieder zur Whitelist hinzu
- Teile Einladungs-Link: `https://app-url.com/?secret=DeinSecret`

**2. Gruppe beitreten**
- Scanne QR-Code oder öffne Link
- Melde dich mit Nostr-Keypair (nsec) an
- Whitelist-Check → Zugang gewährt ✅

**3. Angebot erstellen**
- Beschreibe dein Bitcoin-Tauschgeschäft
- Angebot wird mit temp. Keypair signiert (anonym!)
- **Wichtig:** Speichere dein Offer-Secret!

**4. Deal abschließen**
- Bei Interesse: Modal-Benachrichtigung mit Room-ID
- "🚀 Zum Chat" → P2P WebRTC Chat startet
- Tausche Bitcoin-Details direkt aus

> **Detaillierte Erklärung:** Siehe [WORKFLOW.md](./WORKFLOW.md) für vollständige User-Journey

---

## 🔧 Technische Details

### Nostr NIPs

- **[NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md)**: Basic Event Structure
- **[NIP-04](https://github.com/nostr-protocol/nips/blob/master/04.md)**: Encrypted Direct Messages
- **[NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md)**: Nostr Address (nur Anzeige)

### Kernkonzepte

**Anonymität:**
- Temp-Keypairs pro Angebot (Secret → SHA-256 → Keypair)
- NIP-04 Verschlüsselung (ECDH + AES-256-CBC)
- P2P WebRTC Chat (keine Relay-Metadaten)

**Event-Kinds:**
- Kind 42: Marketplace-Angebot
- Kind 30078: Interesse-Signal (NIP-04 verschlüsselt)
- Kind 30000: GroupConfig/Whitelist

> **Ausführliche technische Dokumentation:** [AKTUELLER-STAND.md](./AKTUELLER-STAND.md)

---

## 📚 Dokumentation

Für detaillierte Informationen siehe:

| Dokument | Beschreibung |
|----------|-------------|
| [AKTUELLER-STAND.md](./AKTUELLER-STAND.md) | **Technischer Status** - Vollständige Implementierung, Event-Kinds, Verschlüsselung |
| [WORKFLOW.md](./WORKFLOW.md) | **User-Journey** - 7-Schritte-Workflow von Gruppe bis Chat |
| [ANONYMITAET-ERKLAERT.md](./ANONYMITAET-ERKLAERT.md) | **Privacy-Konzept** - Anonymitäts-Mechanismen für Nicht-Techniker |
| [PROJEKT-STRUKTUR.md](./PROJEKT-STRUKTUR.md) | **Code-Organisation** - Dateistruktur & Architektur |

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

- ✅ Speichere Secrets sicher (Passwort-Manager)
- ✅ Nutze vertrauenswürdige Nostr-Relays
- ✅ Teile niemals Private Keys

### Bekannte Limitierungen

- **P2P WebRTC**: Desktop-Browser empfohlen (mobile NAT/Firewall-Probleme)
- **Browser-Support**: Chromium-basierte Browser optimal
- **Relay-Verfügbarkeit**: Abhängig von Nostr-Relay-Uptime

> **Anonymitäts-Details:** [ANONYMITAET-ERKLAERT.md](./ANONYMITAET-ERKLAERT.md) erklärt was öffentlich/privat ist

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