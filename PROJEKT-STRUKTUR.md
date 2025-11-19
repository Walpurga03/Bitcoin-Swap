# 📂 Projekt-Struktur

> **Bitcoin-Tausch-Netzwerk - Dateiorganisation & Architektur**

**Stand:** 19. November 2025

[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?style=flat)]()
[![Components](https://img.shields.io/badge/Components-13-success?style=flat)]()
[![Refactored](https://img.shields.io/badge/Code-Optimized-green?style=flat)]()

---

## 📋 Inhaltsverzeichnis

- [Verzeichnis-Übersicht](#-verzeichnis-übersicht)
- [Source Code](#-source-code-detail)
- [Components](#-components-13)
- [Nostr Module](#-nostr-module-9)
- [Code-Statistiken](#-code-statistiken)

---

## 🎯 Überblick

**Modulare SvelteKit-Architektur** mit klarer Trennung:

```
📦 ~5.200 Lines of Code
├── 13 UI Components (modular & wiederverwendbar)
├── 9 Nostr Module (Protocol Integration)
├── 3 Stores (State Management)
└── 100% TypeScript (Type Safety)
```

---

## 📁 Verzeichnis-Übersicht

```
Bitcoin-Tausch-Netzwerk/
├── 📄 Dokumentation
│   ├── README.md                    # Schnellstart & Überblick
│   ├── AKTUELLER-STAND.md          # Technische Details
│   ├── ANONYMITAET-ERKLAERT.md     # Privacy-Erklärung
│   ├── WORKFLOW.md                  # User Journey
│   └── PROJEKT-STRUKTUR.md         # Diese Datei
│
├── 🔧 Config
│   ├── package.json                 # Dependencies
│   ├── svelte.config.js             # SvelteKit Config
│   ├── tsconfig.json                # TypeScript Config
│   ├── vite.config.ts               # Build Config
│   └── vercel.json                  # Deployment
│
└── 📂 src/
    ├── app.d.ts                     # Global Types
    ├── app.html                     # HTML Template
    ├── app.css                      # Global Styles
    │
    ├── 📂 lib/
    │   ├── config.ts                # App Config
    │   ├── 📂 components/           # 13 UI Components
    │   ├── 📂 nostr/                # 9 Nostr Modules
    │   ├── 📂 stores/               # 3 State Stores
    │   ├── 📂 security/             # Validation
    │   └── 📂 utils/                # Helpers
    │
    └── 📂 routes/
        ├── +layout.svelte           # App Layout
        ├── +page.svelte             # Landing Page
        └── 📂 (app)/
            ├── group/+page.svelte   # Marketplace
            └── deal/[dealId]/       # P2P Chat
```

---

## 💻 Source Code Detail

### 📂 `src/lib/components/` (13 Components)

| Component | Zeilen | Beschreibung |
|-----------|--------|--------------|
| **Marketplace** |
| MarketplaceHeader.svelte | 128 | Header mit User-Info & Buttons |
| OfferForm.svelte | 185 | Angebots-Formular |
| OfferList.svelte | 311 | Angebots-Liste |
| **Modals** |
| DealNotificationModal.svelte | 248 | Deal-Benachrichtigung |
| WhitelistModal.svelte | 300 | Whitelist-Verwaltung |
| SecretBackupModal.svelte | 200 | Secret Backup |
| SecretLoginModal.svelte | 180 | Secret Login |
| **Features** |
| InterestListSimple.svelte | 250 | Interessenten-Liste |
| DonationButton.svelte | 50 | Lightning Donations |

**Gesamt:** 13 Components, ~1.850 Zeilen

---

## 🌐 Nostr Module (9)

### 📂 `src/lib/nostr/`

| Modul | Zeilen | Beschreibung |
|-------|--------|--------------|
| client.ts | 150 | Relay Connection & Subscriptions |
| crypto.ts | 200 | NIP-04 Encryption |
| marketplace.ts | 400 | Angebote (Create, Read, Delete) |
| interestSignal.ts | 350 | Interesse-Signale (verschlüsselt) |
| offerSecret.ts | 100 | Temp-Keypair Generation |
| nip04.ts | 150 | Direct Messages (NIP-04) |
| groupConfig.ts | 200 | Gruppen-Verwaltung |
| whitelist.ts | 250 | Whitelist CRUD |
| types.ts | 100 | TypeScript Definitions |

**Gesamt:** 9 Module, ~1.900 Zeilen

---

## 🗂️ Stores & Utils

### State Management (3 Stores)

| Store | Zeilen | Beschreibung |
|-------|--------|--------------|
| userStore.ts | 200 | User State (Pubkey, Name) |
| groupStore.ts | 250 | Group State (Relay, Admin) |
| dealStore.ts | 100 | Deal Room State |

### Security & Utils

| File | Zeilen | Beschreibung |
|------|--------|--------------|
| security/validation.ts | 100 | Input Validation |
| utils/index.ts | 150 | Helper Functions |
| utils/logger.ts | 80 | Production Logger |

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

---

## 📊 Code-Statistiken

| Kategorie | Lines of Code | Anteil |
|-----------|--------------|--------|
| Nostr Module | ~1.900 | 36% |
| Components | ~1.850 | 35% |
| Routes/Pages | ~1.450 | 28% |
| **Gesamt** | **~5.200** | **100%** |

### Technologie

- **TypeScript:** 100% (Strict Mode)
- **Build:** ~270 KB gzipped
- **Components:** 13 (modular)
- **Refactoring:** -44% (Marketplace)

---

## �️ Architektur

### Design Patterns

```
1. Component-Based
   ✅ Wiederverwendbar
   ✅ Single Responsibility
   
2. Store Pattern
   ✅ Zentrales State Management
   ✅ Reactive (Svelte Stores)
   
3. Module Pattern
   ✅ Klare Trennung
   ✅ Type-safe
```

### Refactoring-Historie

**Phase 3 (Nov 2025):** Component Extraction

```
Problem: Marketplace 1.255 Zeilen
Lösung: 4 Components extrahiert
Resultat: -44% (698 Zeilen)

Commits:
• 5515d4f - DealNotificationModal
• f804347 - MarketplaceHeader  
• 9856cb5 - OfferForm
• 8dae213 - OfferList
```

---

<div align="center">

**[⬆ Nach oben](#-projekt-struktur)**

Letzte Aktualisierung: 18. November 2025

</div>
