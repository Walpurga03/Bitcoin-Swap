# 🔍 LocalStorage Audit & Reduzierungs-Plan

**Ziel:** Minimalen LocalStorage verwenden - nur absolut Notwendiges!

**Prinzip:** **Relay = Source of Truth**, LocalStorage = Temporärer Cache

---

## 📊 Aktueller Status

### **Was wird AKTUELL in LocalStorage gespeichert:**

| Key | Inhalt | Warum? | Status | Alternative |
|-----|--------|--------|--------|-------------|
| `nostr_session` | Private Key, Secret, Relay | Session | ⚠️ KRITISCH | Session Storage? |
| `marketplace_temp_keypair` | Temp Private/Public Key | Angebote löschen | ✅ NOTWENDIG | Keine gute Alternative |
| `is_group_admin` | "true"/"false" | UI-State | ❌ UNNÖTIG | Vom Relay laden |
| `admin_pubkey` | Admin Public Key | Vergleich | ❌ UNNÖTIG | Vom Relay laden |
| `group_secret` | Gruppen-Secret | Auto-Join | ⚠️ KRITISCH | User muss neu eingeben |
| `invite_link` | Einladungslink | Convenience | ❌ UNNÖTIG | Kann entfernt werden |

---

## 🎯 **Reduzierungs-Strategie**

### **Kategorie 1: ✅ BEHALTEN (Absolut notwendig)**

#### **1.1 Temp-Keypair für Marketplace**
```javascript
marketplace_temp_keypair: {
  privateKey: "...",
  publicKey: "..."
}
```

**Warum NOTWENDIG?**
- Ohne diesen Key kannst du **dein eigenes Angebot nicht löschen**!
- Nostr-Signatur-Check: Nur wer das Event erstellt hat, kann es löschen
- **Keine gute Alternative:** 
  - ❌ Relay speichern → Relay kennt Private Keys nicht
  - ❌ Jedes Mal neu generieren → Alte Angebote nicht mehr löschbar

**Status:** ✅ **BEHALTEN**

---

### **Kategorie 2: ⚠️ KRITISCH (Können wir reduzieren)**

#### **2.1 Private Key (`nostr_session.privateKey`)**

**Aktuell:**
```javascript
localStorage.setItem('nostr_session', JSON.stringify({
  privateKey: "nsec1..."  // ⚠️ KRITISCH!
}));
```

**Problem:**
- Private Key im LocalStorage = **Security-Risiko**!
- XSS-Angriffe können darauf zugreifen
- Nicht empfohlen für Production

**Alternativen:**

##### **Option 1: Session Storage** (Auto-Löschen beim Tab-Close)
```javascript
sessionStorage.setItem('nostr_session', ...);
```
✅ Wird automatisch gelöscht wenn Tab geschlossen
❌ User muss bei jedem Tab-Open neu anmelden

##### **Option 2: In-Memory (kein Storage)**
```javascript
// Nur im Svelte Store, nie persistiert
let privateKey = '';
```
✅ Maximale Sicherheit
❌ User muss bei jedem Reload neu anmelden

##### **Option 3: Browser Extension (nos2x, Alby)**
```javascript
// Private Key bleibt in Extension
window.nostr.signEvent(event);
```
✅ **BESTE Lösung** für Production
❌ User braucht Extension

**Empfehlung für jetzt:** 
- Development: Session Storage OK
- Production: Browser Extension empfehlen

---

#### **2.2 Gruppen-Secret (`group_secret`)**

**Aktuell:**
```javascript
localStorage.setItem('group_secret', 'MeinSecret123');
```

**Problem:**
- Secret sollte nicht dauerhaft gespeichert werden
- User sollte es sich merken (wie Passwort)

**Alternativen:**

##### **Option 1: Session Storage**
```javascript
sessionStorage.setItem('group_secret', secret);
```
✅ Nur für aktuelle Session
❌ User muss nach Tab-Close neu eingeben

##### **Option 2: Gar nicht speichern**
```javascript
// User muss Secret bei jedem Login eingeben
```
✅ Maximale Sicherheit
❌ Schlechte UX

**Empfehlung:**
- Development: Session Storage
- User kann entscheiden: "Secret merken?" Checkbox

---

### **Kategorie 3: ❌ ENTFERNEN (Vom Relay laden)**

#### **3.1 Admin-Status (`is_group_admin`)**

**Aktuell:**
```javascript
localStorage.setItem('is_group_admin', 'true');
```

**Warum UNNÖTIG?**
- Admin-Status steht im **GroupConfig Event auf Relay**!
- Kann jederzeit neu geladen werden

**Neue Lösung:**
```javascript
// Immer vom Relay laden:
const adminPubkey = await loadGroupAdmin(secretHash, [relay]);
const isAdmin = adminPubkey === userPubkey;

// ❌ NICHT mehr in LocalStorage speichern!
```

**Status:** ❌ **ENTFERNEN**

---

#### **3.2 Admin Public Key (`admin_pubkey`)**

**Aktuell:**
```javascript
localStorage.setItem('admin_pubkey', '115e2e0c...');
```

**Warum UNNÖTIG?**
- Steht im GroupConfig Event auf Relay
- Kann jederzeit neu geladen werden

**Status:** ❌ **ENTFERNEN**

---

#### **3.3 Einladungslink (`invite_link`)**

**Aktuell:**
```javascript
localStorage.setItem('invite_link', 'https://...');
```

**Warum UNNÖTIG?**
- Nur für Convenience
- Kann jederzeit neu generiert werden

**Status:** ❌ **ENTFERNEN**

---

## 📋 **Implementierungs-Plan**

### **Phase 1: Sofort (Security Critical)** ⚠️

#### **1.1 Admin-Status nicht mehr speichern**
```typescript
// ❌ ALT:
localStorage.setItem('is_group_admin', 'true');

// ✅ NEU:
// Gar nicht speichern, immer vom Relay laden
```

**Dateien:**
- `src/lib/nostr/userConfig.ts`
- `src/routes/+page.svelte`
- `src/routes/(app)/group/+page.svelte`

---

#### **1.2 Admin-Pubkey nicht mehr speichern**
```typescript
// ❌ ALT:
localStorage.setItem('admin_pubkey', adminPubkey);

// ✅ NEU:
// Immer aus GroupConfig Event laden
const config = await loadGroupConfig(secretHash, [relay]);
const adminPubkey = config.admin_pubkey;
```

**Dateien:**
- `src/lib/nostr/userConfig.ts`

---

#### **1.3 Invite-Link entfernen**
```typescript
// ❌ ALT:
localStorage.setItem('invite_link', link);

// ✅ NEU:
// Komplett entfernen, kann jederzeit neu generiert werden
```

**Dateien:**
- `src/lib/nostr/userConfig.ts`

---

### **Phase 2: Mittelfristig (UX vs Security)** ⚡

#### **2.1 Private Key in Session Storage**
```typescript
// ❌ ALT:
localStorage.setItem('nostr_session', JSON.stringify({
  privateKey: "nsec1..."
}));

// ✅ NEU:
sessionStorage.setItem('nostr_session', JSON.stringify({
  privateKey: "nsec1..."
}));
```

**Vorteil:**
- ✅ Wird beim Tab-Close automatisch gelöscht
- ✅ Weniger Security-Risiko

**Nachteil:**
- ❌ User muss bei neuem Tab neu anmelden

**Dateien:**
- `src/lib/stores/userStore.ts`

---

#### **2.2 Gruppen-Secret: Optional speichern**
```typescript
// User-Choice: "Secret merken?"
if (rememberSecret) {
  sessionStorage.setItem('group_secret', secret);
} else {
  // Nicht speichern
}
```

**Dateien:**
- `src/routes/+page.svelte` (Login-Formular)

---

### **Phase 3: Langfristig (Production-Ready)** 🚀

#### **3.1 Browser Extension Integration**
```typescript
// Statt localStorage:
if (window.nostr) {
  // nos2x, Alby Extension vorhanden
  const pubkey = await window.nostr.getPublicKey();
  const signedEvent = await window.nostr.signEvent(event);
} else {
  // Fallback: Session Storage oder In-Memory
}
```

**Dateien:**
- Neue Datei: `src/lib/nostr/extensionAuth.ts`
- `src/lib/stores/userStore.ts`

---

## 🎯 **Neue LocalStorage-Regel:**

### **✅ ERLAUBT:**
1. **Temp-Keypairs** (für Marketplace-Angebote)
2. **UI-Preferences** (Theme, Sprache)
3. **Non-Sensitive Cache** (Relay-Liste)

### **❌ VERBOTEN:**
1. **Private Keys** → Session Storage oder Extension
2. **Secrets** → Session Storage oder User-Input
3. **Relay-Daten** → Immer vom Relay laden
4. **Admin-Status** → Immer vom Relay laden

---

## 📊 **Vorher/Nachher Vergleich:**

### **Vorher (Aktuell):**
```javascript
localStorage: {
  nostr_session: {...},           // ⚠️ Private Key!
  marketplace_temp_keypair: {...}, // ✅ OK
  is_group_admin: "true",         // ❌ Unnötig
  admin_pubkey: "...",            // ❌ Unnötig
  group_secret: "...",            // ⚠️ Kritisch
  invite_link: "..."              // ❌ Unnötig
}
```

### **Nachher (Ziel):**
```javascript
sessionStorage: {
  nostr_session: {
    privateKey: "...",  // ⚠️ Nur Session, wird beim Tab-Close gelöscht
    secret: "..."       // ⚠️ Optional, wenn User "merken" wählt
  }
}

localStorage: {
  marketplace_temp_keypair: {...}  // ✅ Nur das Notwendigste!
}

// ✅ Admin-Status: Immer vom Relay laden
// ✅ Admin-Pubkey: Immer vom Relay laden
// ✅ Invite-Link: Jederzeit neu generieren
```

---

## 🛠️ **Implementation Checklist:**

### **Sofort (Security Critical):**
- [ ] `is_group_admin` aus LocalStorage entfernen
- [ ] `admin_pubkey` aus LocalStorage entfernen
- [ ] `invite_link` aus LocalStorage entfernen
- [ ] Admin-Status immer vom Relay laden
- [ ] Code-Review: Alle `localStorage.setItem()` Calls prüfen

### **Mittelfristig (UX):**
- [ ] Private Key in `sessionStorage` statt `localStorage`
- [ ] Secret optional speichern (User-Choice)
- [ ] UI: "Daten merken?" Checkbox
- [ ] Dokumentation für User: Warum neu anmelden?

### **Langfristig (Production):**
- [ ] Browser Extension Support (nos2x, Alby)
- [ ] Fallback-Mechanismus
- [ ] User-Guide: Extension installieren
- [ ] Security-Audit

---

## 📝 **Code-Beispiel: Admin-Check ohne LocalStorage**

### **Vorher (mit LocalStorage):**
```typescript
// ❌ ALT:
const isAdmin = localStorage.getItem('is_group_admin') === 'true';
```

### **Nachher (vom Relay):**
```typescript
// ✅ NEU:
const config = await loadGroupConfig(secretHash, [relay]);
const isAdmin = config?.admin_pubkey === userPubkey;

// Kein LocalStorage mehr nötig!
```

---

## 🎯 **Monitoring:**

**Regel:** Jeder `localStorage.setItem()` Call muss gerechtfertigt werden!

**Code-Review Fragen:**
1. ❓ Warum wird das gespeichert?
2. ❓ Kann es vom Relay geladen werden?
3. ❓ Ist es wirklich notwendig?
4. ❓ Ist es Security-kritisch?
5. ❓ Gibt es eine bessere Alternative?

---

**Letzte Aktualisierung:** 27. Oktober 2025

**Status:** 🟡 In Arbeit - Phase 1 startet jetzt!
