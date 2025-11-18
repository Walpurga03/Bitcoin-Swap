# 🧹 Project Cleanup Checkpoint

**Datum:** 18. November 2025  
**Status:** Bereit für gründliches Aufräumen

---

## ✅ Was funktioniert (NICHT LÖSCHEN!)

### Core Features:
- ✅ Gruppen erstellen & Whitelist-Verwaltung
- ✅ Anonyme Angebote (Temp-Keys)
- ✅ Interesse zeigen (NIP-04 verschlüsselt)
- ✅ Deal-Benachrichtigung (Modal-Popups)
- ✅ P2P WebRTC Chat (Trystero/Torrent)
- ✅ Identity Exchange (Namen via P2P)
- ✅ Desktop ↔ Desktop Chat funktioniert

### Mobile:
- ⚠️ Mobile Peer-Discovery: Beta/Experimental (NAT-Probleme)

---

## 📋 Cleanup-Plan (Schritt für Schritt)

### Phase 1: Legacy/Unused Components identifizieren

#### 🔍 Zu prüfen - Components:
- [ ] `DealInvitations.svelte` - Wird genutzt? (Legacy NIP-17?)
- [ ] `DealRoom.svelte` - Wird genutzt? (Legacy NIP-17?)
- [ ] `DealStatusCard.svelte` - Wird genutzt? (Legacy NIP-17?)
- [ ] `DonationButton.svelte` - ✅ Behalten (aktiv)
- [ ] `InterestListSimple.svelte` - ✅ Behalten (aktiv)
- [ ] `SecretBackupModal.svelte` - ✅ Behalten (aktiv)
- [ ] `SecretLoginModal.svelte` - ✅ Behalten (aktiv)
- [ ] `WhitelistModal.svelte` - ✅ Behalten (aktiv)

#### 🔍 Zu prüfen - Nostr Modules:
- [ ] `dealStatus.ts` - Legacy NIP-17? Wird genutzt?
- [ ] `nip04.ts` - ✅ Behalten (Deal-Benachrichtigung)
- [ ] `offerExpiration.ts` - ✅ Behalten (72h Expiration)
- [ ] `offerSecret.ts` - ✅ Behalten (Temp-Keys)
- [ ] `marketplace.ts` - ✅ Behalten (Angebote)
- [ ] `interestSignal.ts` - ✅ Behalten (Interesse)
- [ ] `groupConfig.ts` - ✅ Behalten (Gruppen)
- [ ] `whitelist.ts` - ✅ Behalten (Whitelist)
- [ ] `userConfig.ts` - ✅ Behalten (User-Profile)
- [ ] `client.ts` - ✅ Behalten (Nostr Client)
- [ ] `crypto.ts` - ✅ Behalten (Verschlüsselung)
- [ ] `types.ts` - ✅ Behalten (TypeScript Types)

#### 🔍 Zu prüfen - Stores:
- [ ] `dealRoomStore.ts` - Legacy NIP-17? Wird genutzt?
- [ ] `groupStore.ts` - ✅ Behalten (aktiv)
- [ ] `userStore.ts` - ✅ Behalten (aktiv)

#### 🔍 Zu prüfen - Utils:
- [ ] `padding.ts` - Wird genutzt?
- [ ] `logger.ts` - ✅ Behalten (aber Logs reduzieren!)
- [ ] `index.ts` - ✅ Behalten (Utils)

#### 🔍 Zu prüfen - Test Files:
- [ ] `test-nip04.js` - Löschen? (Dev-Tool)
- [ ] `test-relay-query.js` - Behalten? (nützlich für Debugging)
- [ ] `test-room-id.js` - Löschen? (Dev-Tool)
- [ ] `crypto.test.ts` - ✅ Behalten (Unit Tests)

#### 🔍 Zu prüfen - Routes:
- [ ] `debug-secret/+page.svelte` - Löschen? (nur für Debugging)
- [ ] `(app)/deal/[dealId]/+page.svelte` - ✅ Behalten (P2P Chat)
- [ ] `(app)/group/+page.svelte` - ✅ Behalten (Marketplace)
- [ ] `+layout.svelte` - ✅ Behalten (Layout)
- [ ] `+page.svelte` - ✅ Behalten (Landing Page)

---

## Phase 2: Code Cleanup Tasks

### A) Console Logs reduzieren
- [ ] `src/routes/(app)/deal/[dealId]/+page.svelte` - Debug-Logs minimieren
- [ ] `src/routes/(app)/group/+page.svelte` - Debug-Logs minimieren
- [ ] `src/lib/utils/logger.ts` - Production Mode Flag?

### B) Ungenutzte Imports entfernen
- [ ] Alle .svelte Dateien durchgehen
- [ ] Alle .ts Dateien durchgehen

### C) Tote Code-Pfade löschen
- [ ] Legacy NIP-17 Code entfernen (falls nicht genutzt)
- [ ] Kommentierte Code-Blöcke prüfen

### D) TypeScript Errors beheben
- [ ] `npm run check` ausführen
- [ ] Alle Warnings prüfen

### E) Code-Stil vereinheitlichen
- [ ] Einrückung konsistent (2 Spaces)
- [ ] String-Quotes konsistent (Single vs Double)
- [ ] Semicolons konsistent

---

## Phase 3: Dokumentation

### A) Code-Kommentare
- [ ] Jede wichtige Funktion dokumentieren
- [ ] Komplexe Algorithmen erklären
- [ ] TODOs entfernen/umsetzen

### B) README.md
- [ ] Installation Guide
- [ ] User Guide
- [ ] Developer Guide
- [ ] API Dokumentation

### C) AKTUELLER-STAND.md
- [ ] Finale Features-Liste
- [ ] Mobile-Status dokumentieren
- [ ] Bekannte Limitationen

---

## Phase 4: Performance & Security

### A) Performance
- [ ] Unnötige Re-Renders prüfen
- [ ] Große Dependencies prüfen
- [ ] Bundle Size analysieren

### B) Security
- [ ] Input Validation überall
- [ ] XSS-Sicherheit prüfen
- [ ] Secret Storage sicher?

---

## 🎯 Ziel

**Clean, Production-Ready Code:**
- 📦 Minimale Dependencies
- 🧹 Kein Dead Code
- 📝 Gut dokumentiert
- 🔒 Sicher
- ⚡ Performant
- 🐛 Keine Debug-Logs in Production

---

## 📊 Progress Tracking

**Aktueller Stand:**
- [ ] Phase 1: Legacy identifizieren (0%)
- [ ] Phase 2: Code Cleanup (0%)
- [ ] Phase 3: Dokumentation (0%)
- [ ] Phase 4: Performance & Security (0%)

**Nächster Schritt:** Phase 1 starten - Components durchgehen

---

**🔖 CHECKPOINT:** Hier zurückkommen für systematisches Cleanup!
