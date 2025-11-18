# 📁 Bitcoin-Swap - Projekt-Struktur

**Stand:** 18. November 2025

---

## 📊 Struktur-Übersicht

```
Bitcoin-Tausch-Netzwerk/
├── 📄 Dokumentation (Root)
│   ├── README.md                    # Landing Page (Coming Soon)
│   ├── AKTUELLER-STAND.md          # Technische Dokumentation
│   ├── ANONYMITAET-ERKLAERT.md     # Endnutzer-Erklärung
│   ├── WORKFLOW.md                  # Workflow-Übersicht
│   └── CLEANUP-CHECKPOINT.md        # Cleanup-Plan (NEU!)
│
├── 📦 archive/                      # Alte Dokumentation
│   └── old-docs/                    # Legacy Docs (NIP-17 Ära)
│
├── 🔧 Config Files (Root)
│   ├── package.json                 # Dependencies
│   ├── package-lock.json
│   ├── svelte.config.js             # SvelteKit Config
│   ├── tsconfig.json                # TypeScript Config
│   ├── vite.config.ts               # Vite Build Config
│   └── vercel.json                  # Vercel Deployment
│
├── 🧪 Test Scripts (Root)
│   ├── test-nip04.js               # NIP-04 Test
│   ├── test-relay-query.js         # Relay Query Tool
│   └── test-room-id.js             # Room-ID Generator Test
│
└── 📂 src/
    ├── app.d.ts                     # Global Types
    │
    ├── 📂 lib/
    │   ├── config.ts                # App Config (Relays, etc.)
    │   │
    │   ├── 📂 components/           # UI Components
    │   │   ├── ✅ DonationButton.svelte
    │   │   ├── ✅ InterestListSimple.svelte
    │   │   ├── ✅ SecretBackupModal.svelte
    │   │   ├── ✅ SecretLoginModal.svelte
    │   │   ├── ✅ WhitelistModal.svelte
    │   │   ├── ❓ DealInvitations.svelte      # Legacy NIP-17?
    │   │   ├── ❓ DealRoom.svelte             # Legacy NIP-17?
    │   │   └── ❓ DealStatusCard.svelte       # Legacy NIP-17?
    │   │
    │   ├── 📂 nostr/                # Nostr Protocol Logic
    │   │   ├── ✅ client.ts                   # Nostr Client
    │   │   ├── ✅ crypto.ts                   # Verschlüsselung
    │   │   ├── ✅ types.ts                    # TypeScript Types
    │   │   ├── ✅ groupConfig.ts              # Gruppen-Verwaltung
    │   │   ├── ✅ whitelist.ts                # Whitelist-Verwaltung
    │   │   ├── ✅ userConfig.ts               # User-Profile
    │   │   ├── ✅ marketplace.ts              # Angebote erstellen/laden
    │   │   ├── ✅ interestSignal.ts           # Interesse-Signale
    │   │   ├── ✅ offerSecret.ts              # Temp-Key Generierung
    │   │   ├── ✅ offerExpiration.ts          # 72h Expiration
    │   │   ├── ✅ nip04.ts                    # Deal-Benachrichtigung
    │   │   └── ❓ dealStatus.ts               # Legacy NIP-17?
    │   │
    │   ├── 📂 security/             # Security Utils
    │   │   └── ✅ validation.ts               # Input Validation
    │   │
    │   ├── 📂 stores/               # Svelte Stores
    │   │   ├── ✅ userStore.ts                # User State
    │   │   ├── ✅ groupStore.ts               # Group State
    │   │   └── ❓ dealRoomStore.ts            # Legacy NIP-17?
    │   │
    │   ├── 📂 utils/                # Utility Functions
    │   │   ├── ✅ index.ts                    # Helper Functions
    │   │   ├── ✅ logger.ts                   # Logging (DEBUG-heavy!)
    │   │   └── ❓ padding.ts                  # Ungenutzt?
    │   │
    │   └── 📂 __test__/             # Tests
    │       └── ✅ crypto.test.ts              # Unit Tests
    │
    └── 📂 routes/                   # SvelteKit Routes
        ├── ✅ +layout.svelte                  # App Layout
        ├── ✅ +page.svelte                    # Landing Page
        │
        ├── 📂 (app)/                # Main App Routes
        │   ├── 📂 group/
        │   │   └── ✅ +page.svelte            # Marketplace (GROSS!)
        │   └── 📂 deal/
        │       └── 📂 [dealId]/
        │           └── ✅ +page.svelte        # P2P Chat
        │
        └── 📂 debug-secret/         # Debug Route
            └── ❓ +page.svelte                # Nur für Dev?
```

---

## 🎯 Legende

- ✅ = **Aktiv genutzt** (BEHALTEN)
- ❓ = **Zu prüfen** (Legacy NIP-17? Ungenutzt?)
- 🔴 = **Löschen** (nach Prüfung)

---

## 📏 Datei-Größen

### Größte Dateien (zu prüfen):
1. `src/routes/(app)/group/+page.svelte` - **~1256 Zeilen** 🚨 ZU GROSS!
2. `src/routes/(app)/deal/[dealId]/+page.svelte` - **~564 Zeilen**
3. `AKTUELLER-STAND.md` - Dokumentation (OK)
4. `ANONYMITAET-ERKLAERT.md` - Dokumentation (OK)

---

## 🔍 Cleanup-Priorität

### Priorität 1 (SOFORT):
1. **Legacy NIP-17 Code identifizieren & löschen**
   - DealInvitations.svelte
   - DealRoom.svelte
   - DealStatusCard.svelte
   - dealStatus.ts
   - dealRoomStore.ts

2. **Debug-Logs reduzieren**
   - logger.ts: Production Mode
   - deal/[dealId]/+page.svelte: Console.logs entfernen
   - group/+page.svelte: Console.logs entfernen

3. **Ungenutzte Files löschen**
   - test-nip04.js (optional behalten)
   - test-room-id.js
   - debug-secret/+page.svelte
   - padding.ts (falls ungenutzt)

### Priorität 2 (Refactoring):
1. **group/+page.svelte aufteilen** (1256 Zeilen → mehrere Components)
   - OfferList Component
   - OfferForm Component
   - DealModal Component
   - etc.

2. **Code-Stil vereinheitlichen**
   - Konsistente Formatierung
   - Imports aufräumen
   - Unused Imports löschen

### Priorität 3 (Polishing):
1. **Dokumentation vervollständigen**
2. **TypeScript Warnings fixen**
3. **Performance optimieren**

---

**Nächster Schritt:** Phase 1 - Legacy Components prüfen!
