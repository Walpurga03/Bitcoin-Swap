# 🧹 Code-Cleanup Checkliste
**Datum:** 2025-11-07  
**Ziel:** Code aufräumen, veraltete Dateien archivieren, Dokumentation aktualisieren

---

## ✅ PHASE 1: DATEIEN ARCHIVIEREN

### 🗑️ Ins Archiv verschieben (veraltete Dokumentation)
```bash
mkdir -p archive/old-docs
mv PROJEKT-ANALYSE.md archive/old-docs/
mv NEUER-WORKFLOW-ANALYSE.md archive/old-docs/
mv LOCALSTORAGE-AUDIT.md archive/old-docs/
mv COMPLIANCE-CHECK.md archive/old-docs/
mv CLEANUP-PLAN.md archive/old-docs/
mv TEST-CHECKLIST.md archive/old-docs/
mv PHASE-2-UI-PLAN.md archive/old-docs/
mv "aktueller stand.md" archive/old-docs/
```

**Warum:** Diese Dokumente sind veraltet und reflektieren nicht mehr den aktuellen Projektstand.

---

## 🗑️ PHASE 2: UNGENUTZTEN CODE LÖSCHEN

### Dateien zum Löschen (nicht genutzt)

#### 1. `/src/routes/admin/+page.svelte`
- **Status:** ❌ UNGENUTZT
- **Grund:** Admin-Features sind jetzt in `group/+page.svelte` integriert
- **Aktion:**
```bash
rm -rf src/routes/admin
```

#### 2. `/src/routes/(app)/deal/[dealId]/+page.svelte`
- **Status:** ❌ UNGENUTZT
- **Grund:** Deal-Status ist jetzt in `group/+page.svelte` integriert
- **Abhängigkeit:** Verwendet `dealStore.ts`
- **Aktion:**
```bash
rm -rf src/routes/\(app\)/deal
```

#### 3. `/src/lib/stores/dealStore.ts`
- **Status:** ❌ UNGENUTZT
- **Grund:** Wird nur von ungenutzter Deal-Route verwendet
- **Aktion:**
```bash
rm src/lib/stores/dealStore.ts
```

---

## ✅ PHASE 3: CONSOLE-LOGS AUFRÄUMEN

### Strategie: Umgebungs-basiertes Logging

**Erstelle:** `src/lib/utils/logger.ts`
```typescript
const isDev = import.meta.env.DEV;

export const logger = {
  info: (message: string, ...args: any[]) => {
    if (isDev) console.log(message, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    if (isDev) console.warn(message, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(message, ...args); // Errors immer loggen
  },
  debug: (message: string, ...args: any[]) => {
    if (isDev) console.log(message, ...args);
  }
};
```

**Dann:** Ersetze alle `console.log()` mit `logger.info()`

### Dateien mit vielen Console-Logs:
- ✅ `src/routes/(app)/group/+page.svelte` - ~30 console.logs
- ✅ `src/lib/nostr/marketplace.ts` - ~15 console.logs
- ✅ `src/lib/nostr/interestSignal.ts` - ~20 console.logs
- ✅ `src/lib/nostr/dealStatus.ts` - ~10 console.logs
- ✅ `src/lib/nostr/client.ts` - ~15 console.logs

---

## 📝 PHASE 4: README.MD KOMPLETT NEU SCHREIBEN

### Neue Struktur:

```markdown
# 🛒 Bitcoin Tausch Netzwerk

> Dezentraler Bitcoin-Tauschmarkt auf Nostr mit vollständiger Anonymität

## 🎯 Was ist das?
- Bitcoin-Tausch-Marketplace auf Nostr
- Anonyme Angebote & Interesse-Signale
- End-to-End verschlüsselte Kommunikation
- Kein zentraler Server, nur Nostr-Relays

## ✨ Features
- ✅ Anonyme Marketplace-Angebote (temp-keypairs)
- ✅ Verschlüsselte Interesse-Signale (NIP-04)
- ✅ Deal-Status-Tracking
- ✅ Whitelist-basierte Gruppen
- ✅ Admin-Verwaltung
- ✅ Automatische Angebots-Ablauf (72h)

## 🚀 Quick Start
[Installation, Setup, Erste Schritte]

## 📚 Dokumentation
[Architektur, Anonymität, Security]

## 🛠️ Entwicklung
[Tech-Stack, Setup, Scripts]

## 📖 Weitere Docs
- [ANONYMITAET-ERKLAERT.md](ANONYMITAET-ERKLAERT.md) - End-User-Dokumentation
- [RELAY-OPERATIONS.md](RELAY-OPERATIONS.md) - Relay-Setup & Operationen
- [TEST-GRUPPE-ERSTELLEN.md](TEST-GRUPPE-ERSTELLEN.md) - Gruppen erstellen

## 📄 Lizenz
MIT License
```

---

## 🔍 PHASE 5: CODE-REVIEW

### Zu prüfende Bereiche:

#### Security
- [ ] Input-Validierung in allen Forms
- [ ] XSS-Schutz (keine `@html` ohne Sanitization)
- [ ] Keine Secrets im Code hardcoded
- [ ] Private Keys nur in Memory/sessionStorage

#### TypeScript
- [ ] Keine `any`-Types (wo möglich)
- [ ] Alle Interfaces dokumentiert
- [ ] Return-Types definiert

#### Performance
- [ ] Keine unnötigen API-Calls
- [ ] Debouncing für User-Input
- [ ] Lazy-Loading für große Komponenten

#### Code-Qualität
- [ ] Keine doppelten Funktionen
- [ ] Sinnvolle Funktions-Namen
- [ ] Kommentare wo nötig
- [ ] JSDoc für alle Public-Functions

---

## 🧪 PHASE 6: TESTS ERWEITERN

### Kritische Funktionen ohne Tests:
```
src/lib/nostr/marketplace.ts
  - createOffer()
  - deleteOffer()
  - loadOffers()

src/lib/nostr/interestSignal.ts
  - sendInterestSignal() 
  - loadInterestSignals()
  - verschlüsselung/entschlüsselung

src/lib/nostr/dealStatus.ts
  - createDeal()
  - updateDealStatus()
  - loadMyDeals()

src/lib/nostr/offerSecret.ts
  - generateOfferSecret()
  - deriveKeypairFromSecret()
  - validateOfferSecret()
```

### Test-Framework
- ✅ Vitest (schon vorhanden)
- ⏳ Testing-Library für Svelte-Components
- ⏳ Playwright für E2E-Tests

---

## 📊 PHASE 7: BUNDLE-SIZE OPTIMIERUNG

### Analyse
```bash
npm run build
npx vite-bundle-visualizer
```

### Optimierungen:
- [ ] Code-Splitting für Routes
- [ ] Tree-Shaking prüfen
- [ ] Lazy-Loading für große Dependencies
- [ ] nostr-tools: Nur benötigte Funktionen importieren

---

## 🔄 AUSFÜHRUNGS-REIHENFOLGE

### Schritt 1: Backup erstellen ✅
```bash
git add .
git commit -m "Backup vor Cleanup"
git push
```

### Schritt 2: Dateien archivieren ⏳
```bash
mkdir -p archive/old-docs
mv PROJEKT-ANALYSE.md archive/old-docs/
mv NEUER-WORKFLOW-ANALYSE.md archive/old-docs/
mv LOCALSTORAGE-AUDIT.md archive/old-docs/
mv COMPLIANCE-CHECK.md archive/old-docs/
mv CLEANUP-PLAN.md archive/old-docs/
mv TEST-CHECKLIST.md archive/old-docs/
mv PHASE-2-UI-PLAN.md archive/old-docs/
mv "aktueller stand.md" archive/old-docs/
```

### Schritt 3: Ungenutzten Code löschen ⏳
```bash
rm -rf src/routes/admin
rm -rf src/routes/\(app\)/deal
rm src/lib/stores/dealStore.ts
```

### Schritt 4: Logger erstellen ⏳
```bash
# Datei src/lib/utils/logger.ts erstellen
# Console-logs in kritischen Dateien ersetzen
```

### Schritt 5: README.md neu schreiben ⏳
```bash
# README.md komplett überarbeiten
```

### Schritt 6: Tests schreiben ⏳
```bash
# Test-Coverage erhöhen
```

### Schritt 7: Commit & Push ⏳
```bash
git add .
git commit -m "Code-Cleanup: Archive alte Docs, lösche ungenutzten Code, verbessere Logging"
git push
```

---

## 📋 CHECKLISTE ZUSAMMENFASSUNG

### Sofort (Prio 1)
- [ ] 1. Git Backup erstellen
- [ ] 2. Alte Docs archivieren (8 Dateien)
- [ ] 3. Ungenutzten Code löschen (3 Dateien/Ordner)
- [ ] 4. README.md neu schreiben

### Bald (Prio 2)
- [ ] 5. Logger-Utility erstellen
- [ ] 6. Console-logs in Prod deaktivieren
- [ ] 7. Code-Review durchführen

### Später (Prio 3)
- [ ] 8. Test-Coverage erhöhen
- [ ] 9. Bundle-Size optimieren
- [ ] 10. Performance-Optimierung

---

**Status:** ⏳ In Arbeit  
**Nächster Schritt:** Dateien archivieren
