# 📂 Projekt-Struktur# 📁 Bitcoin-Swap - Projekt-Struktur



> **Bitcoin-Tausch-Netzwerk - Dateiorganisation & Architektur****Stand:** 18. November 2025



[![TypeScript](https://img.shields.io/badge/Files-Well%20Organized-success?style=flat)]()---

[![Components](https://img.shields.io/badge/Components-Modular-blue?style=flat)]()

## 📊 Struktur-Übersicht

**Stand:** 18. November 2025 (Nach Component Refactoring)

```

---Bitcoin-Tausch-Netzwerk/

├── 📄 Dokumentation (Root)

## 📋 Inhaltsverzeichnis│   ├── README.md                    # Landing Page (Coming Soon)

│   ├── AKTUELLER-STAND.md          # Technische Dokumentation

- [Überblick](#-überblick)│   ├── ANONYMITAET-ERKLAERT.md     # Endnutzer-Erklärung

- [Verzeichnis-Struktur](#-verzeichnis-struktur)│   ├── WORKFLOW.md                  # Workflow-Übersicht

- [Source Code](#-source-code-src)│   └── CLEANUP-CHECKPOINT.md        # Cleanup-Plan (NEU!)

- [Components](#-components-detail)│

- [Nostr Module](#-nostr-module)├── 📦 archive/                      # Alte Dokumentation

- [Stores](#-stores-state-management)│   └── old-docs/                    # Legacy Docs (NIP-17 Ära)

- [Utilities](#-utilities--helpers)│

- [Routes](#-routes-pages)├── 🔧 Config Files (Root)

- [Code-Statistiken](#-code-statistiken)│   ├── package.json                 # Dependencies

│   ├── package-lock.json

---│   ├── svelte.config.js             # SvelteKit Config

│   ├── tsconfig.json                # TypeScript Config

## 🎯 Überblick│   ├── vite.config.ts               # Vite Build Config

│   └── vercel.json                  # Vercel Deployment

Das Projekt folgt einer **modularen SvelteKit-Architektur** mit klarer Trennung von:│

├── 🧪 Test Scripts (Root)

- **Routes** - Page Components & Routing│   ├── test-nip04.js               # NIP-04 Test

- **Components** - Wiederverwendbare UI-Komponenten│   ├── test-relay-query.js         # Relay Query Tool

- **Stores** - Globales State Management│   └── test-room-id.js             # Room-ID Generator Test

- **Lib** - Business Logic & Utilities│

- **Nostr** - Nostr Protocol Integration└── 📂 src/

    ├── app.d.ts                     # Global Types

**Aktuelle Statistiken:**    │

- **Gesamt Lines of Code:** ~5.200+ Zeilen    ├── 📂 lib/

- **Components:** 13 Svelte Components    │   ├── config.ts                # App Config (Relays, etc.)

- **Nostr Modules:** 9 Module    │   │

- **Type Safety:** 100% TypeScript    │   ├── 📂 components/           # UI Components

- **Refactoring:** -44% Code im Main File    │   │   ├── ✅ DonationButton.svelte

    │   │   ├── ✅ InterestListSimple.svelte

---    │   │   ├── ✅ SecretBackupModal.svelte

    │   │   ├── ✅ SecretLoginModal.svelte

## 📁 Verzeichnis-Struktur    │   │   ├── ✅ WhitelistModal.svelte

    │   │   ├── ❓ DealInvitations.svelte      # Legacy NIP-17?

```    │   │   ├── ❓ DealRoom.svelte             # Legacy NIP-17?

Bitcoin-Tausch-Netzwerk/    │   │   └── ❓ DealStatusCard.svelte       # Legacy NIP-17?

│    │   │

├── 📄 README.md                    # Haupt-Dokumentation    │   ├── 📂 nostr/                # Nostr Protocol Logic

├── 📄 AKTUELLER-STAND.md          # Technischer Status    │   │   ├── ✅ client.ts                   # Nostr Client

├── 📄 ANONYMITAET-ERKLAERT.md     # Anonymitäts-Konzept    │   │   ├── ✅ crypto.ts                   # Verschlüsselung

├── 📄 WORKFLOW.md                  # User Workflows    │   │   ├── ✅ types.ts                    # TypeScript Types

├── 📄 PROJEKT-STRUKTUR.md         # Diese Datei    │   │   ├── ✅ groupConfig.ts              # Gruppen-Verwaltung

│    │   │   ├── ✅ whitelist.ts                # Whitelist-Verwaltung

├── 📦 package.json                 # Dependencies & Scripts    │   │   ├── ✅ userConfig.ts               # User-Profile

├── ⚙️  svelte.config.js            # SvelteKit Konfiguration    │   │   ├── ✅ marketplace.ts              # Angebote erstellen/laden

├── ⚙️  vite.config.ts              # Vite Build Config    │   │   ├── ✅ interestSignal.ts           # Interesse-Signale

├── ⚙️  tsconfig.json               # TypeScript Config    │   │   ├── ✅ offerSecret.ts              # Temp-Key Generierung

├── 🚀 vercel.json                  # Vercel Deployment    │   │   ├── ✅ offerExpiration.ts          # 72h Expiration

│    │   │   ├── ✅ nip04.ts                    # Deal-Benachrichtigung

├── 📂 src/                         # Source Code    │   │   └── ❓ dealStatus.ts               # Legacy NIP-17?

│   ├── app.html                    # HTML Template    │   │

│   ├── app.css                     # Global Styles    │   ├── 📂 security/             # Security Utils

│   ├── app.d.ts                    # TypeScript Declarations    │   │   └── ✅ validation.ts               # Input Validation

│   │    │   │

│   ├── 📂 lib/                     # Business Logic    │   ├── 📂 stores/               # Svelte Stores

│   │   ├── config.ts              # App Konfiguration    │   │   ├── ✅ userStore.ts                # User State

│   │   │    │   │   ├── ✅ groupStore.ts               # Group State

│   │   ├── 📂 components/         # UI Components (13)    │   │   └── ❓ dealRoomStore.ts            # Legacy NIP-17?

│   │   ├── 📂 nostr/              # Nostr Integration (9)    │   │

│   │   ├── 📂 security/           # Security Validation    │   ├── 📂 utils/                # Utility Functions

│   │   ├── 📂 stores/             # State Management (3)    │   │   ├── ✅ index.ts                    # Helper Functions

│   │   └── 📂 utils/              # Helper Functions    │   │   ├── ✅ logger.ts                   # Logging (DEBUG-heavy!)

│   │    │   │   └── ❓ padding.ts                  # Ungenutzt?

│   └── 📂 routes/                  # SvelteKit Routes    │   │

│       ├── +layout.svelte         # Root Layout    │   └── 📂 __test__/             # Tests

│       ├── +page.svelte           # Landing Page    │       └── ✅ crypto.test.ts              # Unit Tests

│       │    │

│       └── 📂 (app)/              # App Routes (Protected)    └── 📂 routes/                   # SvelteKit Routes

│           ├── 📂 group/          # Marketplace        ├── ✅ +layout.svelte                  # App Layout

│           └── 📂 deal/           # P2P Chat        ├── ✅ +page.svelte                    # Landing Page

│        │

├── 📂 static/                      # Static Assets        ├── 📂 (app)/                # Main App Routes

│   └── favicon.png        │   ├── 📂 group/

│        │   │   └── ✅ +page.svelte            # Marketplace (GROSS!)

└── 📂 archive/                     # Old Docs (Reference)        │   └── 📂 deal/

    └── old-docs/        │       └── 📂 [dealId]/

```        │           └── ✅ +page.svelte        # P2P Chat

        │

---        └── 📂 debug-secret/         # Debug Route

            └── ❓ +page.svelte                # Nur für Dev?

## 💻 Source Code (`src/`)```



### Root Files---



| Datei | Beschreibung | Zeilen |## 🎯 Legende

|-------|-------------|--------|

| `app.html` | HTML Template mit Dark Mode | ~30 |- ✅ = **Aktiv genutzt** (BEHALTEN)

| `app.css` | Global CSS Variables & Styles | ~100 |- ❓ = **Zu prüfen** (Legacy NIP-17? Ungenutzt?)

| `app.d.ts` | TypeScript Global Declarations | ~20 |- 🔴 = **Löschen** (nach Prüfung)



------



## 🎨 Components Detail## 📏 Datei-Größen



### 📂 `src/lib/components/` (13 Components)### Größte Dateien (zu prüfen):

1. `src/routes/(app)/group/+page.svelte` - **~1256 Zeilen** 🚨 ZU GROSS!

#### **Marketplace Components**2. `src/routes/(app)/deal/[dealId]/+page.svelte` - **~564 Zeilen**

3. `AKTUELLER-STAND.md` - Dokumentation (OK)

| Component | Zeilen | Beschreibung |4. `ANONYMITAET-ERKLAERT.md` - Dokumentation (OK)

|-----------|--------|--------------|

| `MarketplaceHeader.svelte` | 128 | Header mit User-Info, Admin-Badge, Buttons |---

| `OfferForm.svelte` | 185 | Marketplace-Header + Angebots-Formular |

| `OfferList.svelte` | 311 | Angebots-Liste mit Loading/Empty States |## 🔍 Cleanup-Priorität



#### **Modal Components**### Priorität 1 (SOFORT):

1. **Legacy NIP-17 Code identifizieren & löschen**

| Component | Zeilen | Beschreibung |   - DealInvitations.svelte

|-----------|--------|--------------|   - DealRoom.svelte

| `DealNotificationModal.svelte` | 248 | Deal-Benachrichtigung (Pink/Violett Design) |   - DealStatusCard.svelte

| `WhitelistModal.svelte` | ~300 | Admin-Panel für Whitelist-Verwaltung |   - dealStatus.ts

| `SecretBackupModal.svelte` | ~200 | Offer-Secret Backup & Download |   - dealRoomStore.ts

| `SecretLoginModal.svelte` | ~180 | Secret-basierter Re-Login |

2. **Debug-Logs reduzieren**

#### **Feature Components**   - logger.ts: Production Mode

   - deal/[dealId]/+page.svelte: Console.logs entfernen

| Component | Zeilen | Beschreibung |   - group/+page.svelte: Console.logs entfernen

|-----------|--------|--------------|

| `InterestListSimple.svelte` | ~250 | Liste der Interessenten mit Accept-Button |3. **Ungenutzte Files löschen**

| `DonationButton.svelte` | ~50 | Lightning Donation Button |   - test-nip04.js (optional behalten)

   - test-room-id.js

#### **Gesamt:** 13 Components, ~1.850 Zeilen   - debug-secret/+page.svelte

   - padding.ts (falls ungenutzt)

---

### Priorität 2 (Refactoring):

## 🌐 Nostr Module1. **group/+page.svelte aufteilen** (1256 Zeilen → mehrere Components)

   - OfferList Component

### 📂 `src/lib/nostr/` (9 Module)   - OfferForm Component

   - DealModal Component

| Modul | Zeilen | Beschreibung |   - etc.

|-------|--------|--------------|

| `client.ts` | ~150 | Nostr Client & Relay Connection |2. **Code-Stil vereinheitlichen**

| `crypto.ts` | ~200 | NIP-04 Encryption, Keypair Generation |   - Konsistente Formatierung

| `marketplace.ts` | ~400 | Offer CRUD (Create, Read, Delete) |   - Imports aufräumen

| `interestSignal.ts` | ~350 | Interest Signals (NIP-04 encrypted) |   - Unused Imports löschen

| `offerSecret.ts` | ~100 | Temp Keypair Derivation from Secret |

| `nip04.ts` | ~150 | NIP-04 Direct Messages |### Priorität 3 (Polishing):

| `groupConfig.ts` | ~200 | Group Admin & Whitelist Config |1. **Dokumentation vervollständigen**

| `userConfig.ts` | ~100 | User Profile Events |2. **TypeScript Warnings fixen**

| `whitelist.ts` | ~250 | Whitelist CRUD Operations |3. **Performance optimieren**



#### **Gesamt:** 9 Module, ~1.900 Zeilen---



---**Nächster Schritt:** Phase 1 - Legacy Components prüfen!


## 🗂️ Stores (State Management)

### 📂 `src/lib/stores/` (3 Stores)

| Store | Zeilen | Beschreibung |
|-------|--------|--------------|
| `userStore.ts` | ~200 | User State (Pubkey, Privkey, Name) |
| `groupStore.ts` | ~250 | Group State (Relay, Secret, Admin) |
| `dealStore.ts` | ~100 | Deal Room State (temporary) |

**Pattern:** Svelte Writable Stores mit Persistence (localStorage/sessionStorage)

---

## 🛠️ Utilities & Helpers

### 📂 `src/lib/utils/`

| File | Zeilen | Beschreibung |
|------|--------|--------------|
| `index.ts` | ~150 | Helper Functions (truncatePubkey, getTimeRemaining, etc.) |
| `logger.ts` | ~80 | Production-ready Logger (isDev flag) |

### 📂 `src/lib/security/`

| File | Zeilen | Beschreibung |
|------|--------|--------------|
| `validation.ts` | ~100 | Input Validation & Sanitization |

---

## 📄 Routes (Pages)

### 📂 `src/routes/`

```
routes/
├── +layout.svelte (50 lines)        # Root Layout mit Theme
├── +page.svelte (600 lines)         # Landing Page (Login/Join)
│
└── (app)/                            # Protected Routes
    ├── group/
    │   └── +page.svelte (698 lines) # Marketplace (REFACTORED ✅)
    │
    └── deal/
        └── [dealId]/
            └── +page.svelte (800 lines) # P2P WebRTC Chat
```

#### **Marketplace Page** (`group/+page.svelte`)

**Vor Refactoring:** 1.255 Zeilen (monolithisch)  
**Nach Refactoring:** 698 Zeilen (-44%) ✅

**Extrahierte Components:**
1. DealNotificationModal (248 Zeilen)
2. MarketplaceHeader (128 Zeilen)
3. OfferForm (185 Zeilen)
4. OfferList (311 Zeilen)

**Jetzt nur noch:**
- State Management
- Business Logic
- Event Handlers
- Component Composition

---

## 📊 Code-Statistiken

### Lines of Code by Category

| Kategorie | Lines | Prozent |
|-----------|-------|---------|
| Components | ~1.850 | 35% |
| Nostr Module | ~1.900 | 36% |
| Routes/Pages | ~2.150 | 41% |
| Stores | ~550 | 10% |
| Utils/Security | ~330 | 6% |
| **Gesamt** | **~5.200** | **100%** |

### TypeScript Coverage

- **100% TypeScript** in Business Logic
- **Type Definitions:** Comprehensive
- **Strict Mode:** Enabled
- **Type Safety:** ✅ 0 Errors

---

## 🚀 Build Output

### Production Build Stats

```
Client Bundle:
  - Total Size: ~270 KB (gzipped)
  - Chunks: 15
  - Lazy Loading: ✅ Components on demand
  - Tree Shaking: ✅ Optimized

Server Bundle:
  - SSR: ✅ SvelteKit SSR
  - Adapter: Vercel
  - Build Time: ~3.5s
```

---

## 📦 Dependencies

### Main Dependencies

| Package | Version | Verwendung |
|---------|---------|------------|
| `svelte` | 5.x | UI Framework |
| `@sveltejs/kit` | 2.x | App Framework |
| `nostr-tools` | Latest | Nostr Protocol |
| `trystero` | Latest | P2P WebRTC |

### Dev Dependencies

- `typescript` - Type Safety
- `vite` - Build Tool
- `vitest` - Testing
- `@sveltejs/adapter-vercel` - Deployment

---

## 🎯 Architektur-Prinzipien

### Design Patterns

1. **Component-Based Architecture**
   - Kleine, wiederverwendbare Components
   - Single Responsibility Principle
   - Props-down, Events-up

2. **Store Pattern**
   - Zentrales State Management
   - Reactive Updates via Svelte Stores
   - Persistence Layer (localStorage)

3. **Module Pattern**
   - Klare Trennung: Nostr, Security, Utils
   - Dependency Injection
   - Type-safe Exports

4. **Route-based Code Splitting**
   - Lazy Loading via SvelteKit
   - Optimierte Bundle Size
   - Fast Initial Load

---

## 🔐 Security Architecture

### Layers

1. **Input Validation** (`security/validation.ts`)
2. **Encryption** (`nostr/crypto.ts` - NIP-04)
3. **Whitelist** (`nostr/whitelist.ts`)
4. **Temp Keypairs** (`nostr/offerSecret.ts`)

### Best Practices

- ✅ No Private Keys in localStorage
- ✅ Input Sanitization
- ✅ Content Security Policy (CSP)
- ✅ HTTPS-only in Production

---

## 📈 Refactoring-Historie

### Phase 3: Component Extraction (Nov 2025)

**Problem:** `group/+page.svelte` war 1.255 Zeilen groß (unübersichtlich)

**Lösung:** Aufgeteilt in 4 wiederverwendbare Components

**Resultat:**
- Main File: 1.255 → 698 Zeilen (-44%)
- 4 neue Components: 872 Zeilen
- TypeScript: ✅ 0 Errors
- Build: ✅ Successful

**Git Commits:**
1. `5515d4f` - DealNotificationModal (-213 Zeilen)
2. `f804347` - MarketplaceHeader (-66 Zeilen)
3. `9856cb5` - OfferForm (-94 Zeilen)
4. `8dae213` - OfferList (-184 Zeilen)
5. `e1df028` - Final Cleanup & Testing

---

<div align="center">

**[⬆ Nach oben](#-projekt-struktur)**

Letzte Aktualisierung: 18. November 2025

</div>
