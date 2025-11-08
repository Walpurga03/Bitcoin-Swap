# 🪙 Bitcoin Tausch Netzwerk

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://bitcoin-swap.vercel.app)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-5.4-FF3E00?logo=svelte)](https://kit.svelte.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Nostr](https://img.shields.io/badge/Nostr-Protocol-8B5CF6)](https://github.com/nostr-protocol/nostr)

> **Dezentraler P2P-Marketplace für Bitcoin-Tauschgeschäfte auf Nostr**

Ein vollständig anonymer Bitcoin-Marktplatz mit Ende-zu-Ende-verschlüsselter Kommunikation. Keine zentralen Server, keine Tracking, nur Nostr-Relays.

---

## ✨ Features

### 🔐 Vollständige Anonymität
- **Temporäre Keypairs** für alle Marketplace-Angebote
- **Anonyme Interesse-Signale** mit temp-keypairs (NIP-04 verschlüsselt)
- **Kein öffentliches Interest-Tracking** - Nur Anbieter kann Interessenten sehen
- **Private Keys bleiben im Browser** (sessionStorage)

### 🛒 Marketplace
- **Öffentliche Angebote** sichtbar für alle Gruppenmitglieder
- **Ein Angebot gleichzeitig** - verhindert Spam
- **Automatischer Ablauf** nach 72 Stunden (NIP-40)
- **Angebot-Secrets** - nur Ersteller kann verwalten/löschen

### 🤝 Deal-System
- **Deal-Status-Tracking** (Kind 30081)
- **Partner-Auswahl** durch Angebotsgeber
- **Status-Updates**: active, completed, cancelled
- **Public Keys austauschen** für externe Kommunikation

### 🔒 Sicherheit
- **Whitelist-basierte Gruppen** (nur geprüfte Mitglieder)
- **Admin-Verwaltung** per Nostr-Event
- **Input-Validierung** für alle User-Eingaben
- **XSS-Schutz** aktiviert

### 🎨 UI/UX
- **Nostr Dark Theme** (Pink #FF006E, Violett #8B5CF6)
- **Responsive Design** (Desktop, Tablet, Mobile)
- **Smooth Animations** und Transitions
- **Lightning-Spenden-Button** ⚡

---

## 🎯 Workflow

### 1. Gruppe erstellen (Admin)
```
Admin generiert Secret → GroupConfig (Kind 30000) auf Relay
→ Whitelist initialisieren → Einladungslink erstellen
```

### 2. Gruppe beitreten
```
User öffnet Link → Login mit NSEC/Secret
→ Whitelist-Check → Zugriff gewährt
```

### 3. Angebot erstellen
```
User erstellt Angebot → Temporäres Keypair generiert
→ Kind 42 Event auf Relay → Secret in sessionStorage
→ Angebot sichtbar für 72h
```

### 4. Interesse zeigen
```
Interessent klickt "Interesse zeigen"
→ Temporäres Keypair generiert (anonym!)
→ NIP-04 verschlüsselter Interest-Signal (Kind 30078)
→ Nur Anbieter kann mit Secret entschlüsseln
```

### 5. Partner auswählen
```
Anbieter öffnet Interessenten-Liste
→ Sieht entschlüsselte Public Keys & Namen
→ Wählt Partner aus → Deal wird erstellt (Kind 30081)
→ Angebot wird gelöscht
```

### 6. Deal abschließen
```
Beide Partner sehen Deal-Status
→ Kommunizieren extern (Public Keys sichtbar)
→ Markieren Deal als "completed"
```

---

## 🏗️ Architektur

### Tech Stack
- **Frontend:** SvelteKit 5.4 + TypeScript 5.7
- **Styling:** Custom CSS (Nostr Dark Theme)
- **Nostr:** nostr-tools (NIP-01, NIP-04, NIP-09, NIP-40)
- **Deployment:** Vercel

### Nostr Event Types
| Kind | Typ | Beschreibung | Verschlüsselt |
|------|-----|--------------|---------------|
| **0** | Metadata | User-Profile (Name, Bild) | ❌ |
| **42** | Channel Message | Marketplace-Angebote | ❌ |
| **30000** | Parameterized Replaceable | Group Config, Whitelist | ✅ NIP-04 |
| **30078** | Parameterized Replaceable | Interesse-Signale | ✅ NIP-04 |
| **30081** | Parameterized Replaceable | Deal-Status | ❌ |

### Projekt-Struktur
```
src/
├── routes/
│   ├── +page.svelte              # Login/Landing
│   ├── +layout.svelte            # Global Layout
│   └── (app)/
│       └── group/+page.svelte    # 🎯 HAUPTSEITE (Marketplace & Deals)
│
├── lib/
│   ├── components/               # Svelte-Komponenten
│   │   ├── WhitelistModal.svelte
│   │   ├── InterestListSimple.svelte
│   │   ├── DealStatusCard.svelte
│   │   ├── SecretBackupModal.svelte
│   │   ├── SecretLoginModal.svelte
│   │   └── DonationButton.svelte
│   │
│   ├── nostr/                    # Nostr-Protokoll-Logic
│   │   ├── client.ts             # Relay-Client
│   │   ├── crypto.ts             # NIP-04 Verschlüsselung
│   │   ├── types.ts              # TypeScript-Interfaces
│   │   ├── groupConfig.ts        # Gruppen-Verwaltung
│   │   ├── whitelist.ts          # Whitelist-Verwaltung
│   │   ├── userConfig.ts         # User-Profile
│   │   ├── marketplace.ts        # Angebote (Kind 42)
│   │   ├── interestSignal.ts     # Interesse-Signale (Kind 30078)
│   │   ├── dealStatus.ts         # Deal-Status (Kind 30081)
│   │   ├── offerSecret.ts        # Secret-Generierung
│   │   └── offerExpiration.ts    # Ablauf-Logik
│   │
│   ├── stores/                   # State-Management
│   │   ├── userStore.ts          # User-State
│   │   └── groupStore.ts         # Gruppen-State
│   │
│   ├── utils/                    # Helper-Funktionen
│   │   └── index.ts
│   │
│   └── security/                 # Sicherheit
│       └── validation.ts         # Input-Validierung
```

---

## 🚀 Installation & Setup

### Voraussetzungen
- Node.js 18+ 
- npm oder pnpm

### 1. Repository klonen
```bash
git clone https://github.com/Walpurga03/Bitcoin-Swap.git
cd Bitcoin-Swap
```

### 2. Dependencies installieren
```bash
npm install
```

### 3. Development-Server starten
```bash
npm run dev
```

→ App läuft auf `http://localhost:5173`

### 4. Production-Build
```bash
npm run build
npm run preview
```

### 5. Deployment (Vercel)
```bash
vercel deploy
```

---

## 🔧 Konfiguration

### Standard-Relay
In `src/lib/config.ts`:
```typescript
export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol'
];
```

### Marketplace-Relay
Konfiguriert beim Erstellen der Gruppe. Standard: `wss://nostr-relay.online`

---

## 📖 Verwendung

### Gruppe erstellen (Admin)
1. Generiere NSEC auf [nostr.com](https://nostr.com) oder mit `nak`
2. Öffne App → "Neue Gruppe erstellen"
3. Wähle Relay und generiere Secret
4. Kopiere Einladungslink
5. Whitelist-Management über Modal

### Angebot erstellen
1. Login mit NSEC
2. "Neues Angebot" Button
3. Beschreibung eingeben (z.B. "Verkaufe 0.1 BTC für 4500 EUR")
4. Secret wird generiert → **BACKUP ERSTELLEN!**
5. Angebot ist 72h sichtbar

### Interesse zeigen
1. Angebot durchsuchen
2. "Interesse zeigen" klicken
3. Bestätigen → Anonym registriert
4. Warten auf Partner-Auswahl

### Partner auswählen & Deal abschließen
1. Anbieter öffnet Interessenten-Liste (💌 Badge)
2. Interessenten werden entschlüsselt (echte Public Keys sichtbar)
3. Partner auswählen → Deal erstellt
4. Extern kommunizieren (Public Keys kopieren)
5. Deal als "completed" markieren

---

## 🔒 Sicherheit

### Anonymität
- **Marketplace-Angebote:** Temporäre Keypairs, kein Link zur echten Identität
- **Interesse-Signale:** Temporäre Keypairs, NIP-04 verschlüsselt
- **Nur Anbieter sieht Interessenten:** Secret-basierte Entschlüsselung

### Secrets
- **Angebots-Secret:** In sessionStorage (kann exportiert werden)
- **Gruppen-Secret:** Im Link, nicht in localStorage
- **Private Keys:** Niemals übertragen oder auf Server gespeichert

### Best Practices
- ✅ Secrets extern sichern (z.B. Password-Manager)
- ✅ NSEC niemals teilen
- ✅ Separate NSEC für Marketplace (optional)
- ✅ Whitelist nur vertrauenswürdige Public Keys

---

## 🛠️ Entwicklung

### Scripts
```bash
npm run dev          # Development-Server
npm run build        # Production-Build
npm run preview      # Preview Production-Build
npm run check        # TypeScript & Svelte-Check
npm run lint         # ESLint
npm run format       # Prettier
```

### Code-Qualität
- **TypeScript Strict Mode:** Aktiviert
- **ESLint:** Code-Style-Checks
- **Prettier:** Auto-Formatierung
- **0 TypeScript Errors** ✅

### Testing
```bash
npm run test         # Vitest Unit-Tests
```

---

## 📚 Dokumentation

- **[ANONYMITAET-ERKLAERT.md](ANONYMITAET-ERKLAERT.md)** - End-User-Anleitung zur Anonymität
- **[archive/old-docs/](archive/old-docs/)** - Archivierte Entwicklungs-Dokumentation

---

## 🤝 Contributing

Contributions sind willkommen! Bitte:

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Commit deine Änderungen (`git commit -m 'Add AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

---

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE)

---

## 💡 Support

### Lightning-Spenden ⚡
```
lnurl1dp68gurn8ghj7ampd3kx2ar0veekzar0wd5xjtnrdakj7tnhv4kxctttdehhwm30d3h82unvwqhhxarpda6kuar9vfgxjumfqfnkyvmyvgmk2unhddm82arg94cpgu5j
```

### Kontakt
- **Nostr:** `npub1z90zrqxafz7s5dqyy7uvfwc22w277lxpyj0qa5f9x2u6yd24q3dssdprls`
- **GitHub:** [Walpurga03](https://github.com/Walpurga03)

---

## 🙏 Credits

- **Nostr-Protokoll:** [nostr-protocol](https://github.com/nostr-protocol/nostr)
- **nostr-tools:** [nbd-wtf/nostr-tools](https://github.com/nbd-wtf/nostr-tools)
- **SvelteKit:** [sveltejs/kit](https://github.com/sveltejs/kit)

---

**Gebaut mit ❤️ für das Nostr-Netzwerk**
