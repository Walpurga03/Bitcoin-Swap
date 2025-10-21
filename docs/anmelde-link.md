# 🔐 Anmelde-System - Analyse & Kritische Übersicht

## 🎯 Was ist das System?

**Dezentrales Gruppen-Login** ohne zentrale Authentifizierung. Admin erstellt Gruppe → verteilt Einladungslink → System prüft automatisch über Nostr ob User in Whitelist ist.

**Kernmechanismus**: Admin-Status = `pubkey vom Relay === aktueller pubkey` (wird bei jedem Login neu berechnet)

---

## 💡 HAUPTFEATURE: Dynamische Admin-Verwaltung

### ✅ Das Problem (vorher)
Admin A erstellt Gruppe → localStorage speichert `is_group_admin='true'` → Admin B loggt sich auf gleichem PC ein → **Admin B ist fälschlicherweise Admin!** ❌

### ✅ Die Lösung (jetzt)
Admin-Status wird **nicht gespeichert**, sondern **bei jedem Login neu berechnet**: `admin_pubkey (von Nostr) === current_pubkey` → funktioniert korrekt mit mehreren NSECs ✅

---

## 🏆 Implementierte Features

| Feature | Status | Details |
|---------|--------|---------|
| **Dynamische Admin-Verwaltung** | ✅ | Multi-NSEC-sicher, neu berechnet bei jedem Login |
| **Einladungslinks** | ✅ | URL-basiert: `?relay=...&secret=...` |
| **Whitelist-System** | ✅ | Public Keys auf Nostr (Kind 30000), nur Admin editierbar |
| **Admin-Bypass** | ✅ | Admin braucht nicht in Whitelist zu sein |
| **Profil-Laden** | ✅ | Automatisch von Nostr (Kind 0) |
| **Gruppen-spezifische Whitelists** | ✅ | Via Channel-ID gekapselt |

---

## 🔐 Privatsphäre-Analyse

### ✅ STARK - Diese Dinge sind gut geschützt

| Aspekt | Bewertung | Erklärung |
|--------|-----------|-----------|
| **Private Keys** | ✅✅✅ | Verlassen niemals Browser, nur lokal im localStorage |
| **Anonymität** | ✅✅✅ | Keine E-Mail/Passwort, nur Nostr-Keys erforderlich |
| **Dezentralisierung** | ✅✅✅ | Kein Server, alles auf Nostr-Relays |
| **Admin-Erkennung** | ✅✅✅ | Von öffentlicher Config geladen, nicht manipulierbar |
| **Whitelist-Integrität** | ✅✅ | Signiert vom Admin, nicht fälschbar (NIP-01) |

### ⚠️ KRITISCH - Aufgepasst!

| Problem | Schweregrad | Erklärung | Lösung |
|---------|------------|-----------|--------|
| **Relay muss öffentlich sein** | 🔴 KRITISCH | GroupConfig+Whitelist **müssen** öffentlich sein zum Funktionieren | Keine Alternative möglich |
| **Relay-Offline = kein Zugriff** | 🟠 WICHTIG | Wenn Relay offline → Admin-Panel funktioniert nicht | Fallback auf localStorage? (soll vermieden werden) |
| **Secret im URL sichtbar** | 🟠 WICHTIG | Einladungslink zeigt Secret im URL-Parameter (HTTPS schützt) | TBD: Server-seitige Generierung prüfen |
| **localStorage = lokale Schwelle** | 🟡 MITTEL | Browser-Cache-Löschung → Daten weg (aber Relay hat Backup) | Aktuell OK, User wird zu Relogin gezwungen |

---

## 🎯 Detaillierte Architektur

### Admin-Erkennung Flow (das Herzstück!)

```
1. User meldet sich an (mit NSEC)
2. App speichert: group.secret, group.relay
3. Bei Login/Page-Mount passiert dies:
   
   a) Berechne Secret-Hash = SHA256(group.secret)
   b) Frage Nostr: "Gib mir Event wo d=secretHash"
   c) Nostr antwortet: { admin_pubkey: "abc123...", ... }
   d) Vergleiche: admin_pubkey === user.pubkey?
   
   JA → isAdmin = true (Admin-Button sichtbar)
   NEIN → isAdmin = false (User-Ansicht)
```

**VORTEIL**: Nicht hardcoded, dynamisch, Multi-NSEC-sicher ✅
**NACHTEIL**: Braucht funktionierende Relay-Verbindung ⚠️

### Event-Struktur auf Nostr

**GroupConfig** (öffentlich lesbar):
```javascript
{
  kind: 30000,
  d: "SHA256-HASH-DES-SECRETS",  // Eindeutige ID
  content: {
    relay: "wss://relay.example.com",
    admin_pubkey: "abc123def456...",  // Admin erkannt daran!
    secret_hash: "xyz789...",
    created_at: 1729xxx
  }
}
```

**Whitelist** (öffentlich lesbar):
```javascript
{
  kind: 30000,
  d: "CHANNEL-ID",
  content: {
    pubkeys: ["user1hex", "user2hex", ...],
    admin_pubkey: "abc123def456...",
    updated_at: 1729xxx
  }
}
```

🔓 **Beide Events sind öffentlich!** Das ist nötig für Dezentralisierung (User müssen ohne Authentifizierung prüfen können).

---

## 💾 Was wird gespeichert & wo?

| Daten | Ort | Sichtbar? | Bemerkung |
|-------|-----|----------|-----------|
| **Private Key** | Browser localStorage | ❌ Privat (lokal) | Kritisch! Bei Kompromittierung → ganzes Konto weg |
| **Public Key** | Nostr (öffentlich) | ✅ Öffentlich | OK, ist Publikum-Identität |
| **Group Secret** | Browser localStorage | ❌ Privat (lokal) | Identifiziert Gruppe, darf nicht raus! |
| **Admin-Status** | Nostr (öffentlich) | ✅ Öffentlich | Muss öffentlich sein für Prüfung |
| **Whitelist** | Nostr (öffentlich) | ✅ Öffentlich | Muss öffentlich sein für Zugriffs-Prüfung |
| **Chat/Angebote** | Nostr (verschlüsselt) | 🔐 Mit Secret verschlüsselt | Nur wer Secret hat kann lesen |

**Fazit**: Sensible Daten (Private Key, Secret) sind lokal. Notwendig-öffentliche Daten (Admin-Pubkey, Whitelist) auf Relay.

---

## 🔴 KRITISCHE SICHERHEITSANMERKUNGEN

### 1. **Relay muss IMMER erreichbar sein**
❌ Problem: Wenn Relay offline → Admin-Panel zeigt Fehler und lädt nicht
⚠️ Aktuell: App sagt "Relay nicht erreichbar" und leitet zurück
✅ Besser: Lokaler Fallback für bekannte Admin-States?

### 2. **GroupConfig ist ÖFFENTLICH**
⚠️ Das bedeutet: Jeder kann sehen, wer Admin ist
✅ OK wenn: Secret selbst ist nicht öffentlich (SHA-256 hash wird verwendet)
❌ ABER: Mit genug Rechenleistung könnte man Secret bruteforce-en (kurze Secrets)

**→ Empfehlung**: Mindestens 16-32 Zeichen Secret erzwingen, nicht 8!

### 3. **Einladungslink zeigt Secret im URL**
🟠 `https://domain.com/?relay=...&secret=mysecreet123`
⚠️ Wenn Link in Logs/History/Analytics auftaucht → Secret ist kompromittiert!
✅ HTTPS schützt zumindest die Übertragung
✅ Browser-History könnte Problem sein

**→ Empfehlung**: Admin warnen "Behandle Link wie Passwort, nicht weitergeben"

### 4. **localStorage ist unsicher auf Shared PCs**
🟠 Mehrere User auf einem PC können sich gegenseitig nicht sehen (weil Browser sie trennt)
✅ Aber: Browser-Addons könnten Zugriff haben
✅ Aber: Physischer Zugriff + Browser-Dev-Tools = Private Key ist weg

**→ Das ist aber NICHT spezifisch für dieses System** (gilt für alle Browser-basierte Wallets)

---

## 🟢 OPTIMIERUNGSVORSCHLÄGE

### 1. Offline-Fallback (PRIORITÄT 1)
**Status**: ⚠️ Nicht implementiert, aber möglich

```typescript
// Fallback bei Relay-Fehler
async function getAdminStatus(secretHash, relay) {
  try {
    return await loadGroupAdmin(secretHash, [relay]);  // Nostr
  } catch (relayError) {
    console.warn('⚠️ Relay offline, nutze Cache');
    const cached = localStorage.getItem('admin_pubkey');
    if (cached) return cached;  // Fallback zu lokaler Kopie
    throw new Error('Kein Relay + kein lokaler Cache');
  }
}
```

**Nutzen**: App funktioniert auch wenn Relay kurzzeitig offline ist
**Implementierungsaufwand**: Niedrig (30min)

---

### 2. Admin-Status Caching (PRIORITÄT 2)
**Status**: ⚠️ Nicht implementiert, aber wichtig für Performance

Aktuell: Jedes Mount = 1 Nostr-Query (Login, Seiten-Wechsel, Refresh)
Mit Cache: Nur 1 Query alle 5 Minuten

```typescript
// Beispiel: 5-Min-Cache
const adminCache = { 
  value: null, 
  timestamp: 0,
  ttl: 5 * 60 * 1000  // 5 Minuten
};

function getAdminCached(pubkey, group) {
  const now = Date.now();
  if (adminCache.value !== null && 
      now - adminCache.timestamp < adminCache.ttl) {
    return adminCache.value;  // Aus Cache
  }
  // Sonst von Nostr laden
}
```

**Nutzen**: Weniger Relay-Last, schnelleres UI
**Implementierungsaufwand**: Mittel (1-2h)

---

### 3. sessionStorage statt localStorage für Secrets (PRIORITÄT 2)
**Status**: ⚠️ Aktuell localStorage (unsicher bei Shared-PC)

```typescript
// ALT: localStorage (bleibt nach Browser-Close)
localStorage.setItem('group_secret', secret);  // ❌ Dauerhaft!

// NEU: sessionStorage (wird gelöscht beim Browser-Close)
sessionStorage.setItem('group_secret', secret);  // ✅ Temporär
sessionStorage.setItem('admin_pubkey', pubkey);

// Nur NON-SECRET Config sollte persistent sein:
localStorage.setItem('group_config', JSON.stringify({
  relay,      // OK - ist öffentlich
  channelId,  // OK - ist öffentlich
}));
```

**Nutzen**: Höhere Sicherheit auf Shared PCs, Secrets nicht dauerhaft gespeichert
**Implementierungsaufwand**: Niedrig (30min)

---

### 4. Relay-Status Indikator im UI (PRIORITÄT 3)
**Status**: ⚠️ Nicht sichtbar für User, nur in Console logs

```svelte
<!-- Zeige Relay-Status an -->
{#if relayStatus === 'offline'}
  <div class="alert alert-error">
    🔴 Relay offline - manche Funktionen funktionieren nicht
  </div>
{:else if relayStatus === 'connecting'}
  <div class="alert alert-info">
    🟡 Verbinde zu Relay... ({connectingTime}ms)
  </div>
{:else if relayStatus === 'online'}
  <div class="alert alert-success">
    🟢 Mit Relay verbunden
  </div>
{/if}
```

**Nutzen**: User weiß wieso Admin-Panel fehlt
**Implementierungsaufwand**: Niedrig (45min)

---

### 5. Secret-Länge erzwingen (PRIORITÄT 2)
**Status**: ⚠️ Aktuell min. 8 Zeichen, zu kurz

```typescript
// ALT: 8-32 Zeichen (8 Zeichen = leicht bruteforcebar!)
if (secret.length < 8 || secret.length > 32) {
  error = 'Secret muss 8-32 Zeichen sein';
}

// NEU: 16-64 Zeichen (deutlich sicherer)
const MIN_SECRET_LENGTH = 16;
const MAX_SECRET_LENGTH = 64;

if (secret.length < MIN_SECRET_LENGTH) {
  error = `Secret muss mindestens ${MIN_SECRET_LENGTH} Zeichen sein`;
}
```

**Nutzen**: Verhindert Bruteforce auf Secret-Hash
**Implementierungsaufwand**: Niedrig (15min)

---

### 6. Admin-Panel Fehlerbehandlung verbessern (PRIORITÄT 2)
**Status**: ⚠️ Aktuell: "Relay offline → Redirect nach 2s" (zu schnell!)

```typescript
// ALT: Sofort bei Error blocken
if (!adminPubkey) {
  redirectTo('/group');
  return;
}

// NEU: Mit Fallback-Versuch
let attempts = 0;
const maxAttempts = 3;

async function tryLoadAdmin() {
  try {
    adminPubkey = await loadGroupAdmin(secretHash, [relay]);
  } catch (err) {
    attempts++;
    if (attempts < maxAttempts) {
      console.log(`Versuch ${attempts}/${maxAttempts}`);
      setTimeout(tryLoadAdmin, 2000);  // Erneut versuchen
    } else {
      showError('Admin-Status konnte nicht geladen werden');
    }
  }
}
```

**Nutzen**: Temporary Network Issues sind nicht gleich komplett blockiert
**Implementierungsaufwand**: Niedrig (45min)

---

## 📊 Performance-Metriken

| Metrik | Aktuell | Mit Optimierungen |
|--------|---------|------------------|
| Requests pro Session | ~5-10 (ein je Mount) | ~1 (mit Cache) |
| Admin-Panel Load-Time | ~500-2000ms | ~50-100ms (Cache) |
| Relay-Last | Hoch (viele Queries) | Niedrig (Cache) |
| Offline-Support | ❌ Nein | ✅ Mit Fallback |
| sessionStorage-Ready | ❌ Nein | ✅ Ja |

---

## 🛠️ Implementierungs-Roadmap

**SOFORT (diese Woche)**:
- [ ] Offline-Fallback zu localStorage
- [ ] sessionStorage für Secrets statt localStorage
- [ ] Secret-Mindestlänge auf 16 Zeichen erhöhen

**BALD (nächste Woche)**:
- [ ] Admin-Status Caching (5-Min-TTL)
- [ ] Relay-Status Indikator im UI
- [ ] Bessere Error-Recovery beim Admin-Panel

**SPÄTER (Backlog)**:
- [ ] Multi-Relay-Fallback (mehrere Relays konfigurierbar)
- [ ] Offline-Queue für Whitelist-Änderungen (speichern → später sync)
- [ ] Encryption für localStorage (optional)

---

## 📚 Technische Dokumentation

### Wichtige Files

| File | Zweck | Status |
|------|-------|--------|
| `src/routes/+page.svelte` | Login-Seite (Gruppen erstellen/beitreten) | ✅ Aktiv |
| `src/routes/(app)/group/+page.svelte` | Marketplace mit Whitelist-Check | ✅ Aktiv |
| `src/routes/admin/+page.svelte` | Admin-Panel (Whitelist verwalten) | ✅ Aktiv |
| `src/lib/nostr/groupConfig.ts` | GroupConfig laden/speichern | ✅ Aktiv |
| `src/lib/nostr/whitelist.ts` | Whitelist-Verwaltung | ✅ Aktiv |

### Wichtige Functions

```typescript
// GroupConfig laden
loadGroupAdmin(secretHash, relays)
  → admin_pubkey (von Nostr)

// Secret in Hash konvertieren
deriveSecretHash(secret)
  → SHA256 Hash (für Event-ID)

// GroupConfig speichern
saveGroupConfig(config, adminPrivateKey, relays)
  → speichert auf Nostr als Signed Event

// Whitelist prüfen
isUserWhitelisted(pubkey, whitelist)
  → boolean (ist User in Whitelist?)
```

---

## ⚠️ BEKANNTE LIMITATIONEN

### 1. **Relay muss online sein**
- ❌ Offline-Modus nicht unterstützt
- ⚠️ Temporary Relay-Ausfälle blockieren Admin-Panel
- ✅ Fallback zu localStorage möglich (nicht implementiert)

### 2. **Admin-Status ist öffentlich**
- ✅ Notwendig für dezentrale Prüfung
- ⚠️ Jeder sieht wer Admin ist
- ✅ Secret selbst bleibt privat (nur Hash öffentlich)

### 3. **Secret in URL sichtbar**
- 🟠 Einladungslink: `?secret=group-secret-hier`
- ✅ HTTPS verschlüsselt Übertragung
- ⚠️ Browser-History könnte Secret zeigen
- ✅ User sollten Link behandeln wie Passwort

### 4. **localStorage bei Browser-Zugriff**
- 🟠 Browser-Extensions können auslesen
- 🟠 Browser-Dev-Tools (Ctrl+Shift+I → Application)
- ⚠️ Shared PC → jeder User hat eigenen Browser-Profile
- ✅ Physische Sicherheit ist wichtig

### 5. **Keine Device-Synchronisierung**
- ❌ Admin-Status wird nicht zwischen Devices synced
- ⚠️ PC A: Admin ist Admin, PC B: Admin ist Admin (unabhängig)
- ✅ Das ist gewünscht (keine Cloud-Synchronisierung)

---

## 🔐 SECURITY CHECKLIST

Für Produktionseinsatz müssen diese Punkte gecheckt sein:

- [ ] HTTPS ist aktiviert (URLs sind wss:// und https://)
- [ ] Relay ist erreichbar und stabil
- [ ] Secret-Mindestlänge ist 16 Zeichen
- [ ] Offline-Fallback ist implementiert (oder User-Warnung)
- [ ] sessionStorage statt localStorage für Secrets
- [ ] Admin-Status Caching ist implementiert
- [ ] Relay-Status wird im UI angezeigt
- [ ] Error-Recovery ist implementiert (Retry-Logik)
- [ ] Private Keys werden nie an Server gesendet
- [ ] Kein Admin-Key leaks in Logs/Analytics

---

## 📖 FAQ

**F: Kann der Admin sein Passwort vergessen?**
A: Nein - das System verwendet NSEC (Private Keys), nicht Passwörter. Wenn der Private Key verloren ist, ist das Konto verloren. Backup deinen NSEC!

**F: Was passiert wenn der Relay ausfällt?**
A: Aktuell: Admin-Panel funktioniert nicht mehr. Geplant: Fallback zu localStorage für temporäre Ausfälle.

**F: Kann Admin die Whitelist remote verwalten?**
A: Ja - Admin kann von überall aus Whitelist bearbeiten (über Admin-Panel). Änderungen sind sofort sichtbar (Nostr speichert sie).

**F: Sind Chat-Nachrichten verschlüsselt?**
A: Ja - mit Group-Secret (bei Nostr-Events). Nur wer Secret hat kann lesen.

**F: Kann Admin den Secret ändern?**
A: Nein - Secret ist unveränderlich (identifiziert die Gruppe). Neuer Secret = neue Gruppe. Das ist absichtlich so.

**F: Funktioniert das mit Hardware-Wallets?**
A: Ja - über NIP-07 Browser-Extension (z.B. Alby). Private Keys bleiben in der Wallet.

**F: Kann ich Admin-Status an jemand anderen übertragen?**
A: Nein - Admin-Status ist an die Public Key gebunden. Neue Admin = neue Gruppe mit neuem Admin.

### 🔗 Nostr-Integration

#### ✅ Implementierte NIPs
- **NIP-01**: Basic Protocol (Events, Signaturen, Validierung)
- **NIP-19**: bech32 Encoding (NSEC-Format Unterstützung)

#### 📊 Event-Nutzung
```typescript
// GroupConfig-Event (Kind 30000)
// Öffentlich lesbar - enthält nur Admin-Pubkey und Secret-Hash
{
  kind: 30000,
  tags: [
    ['d', secretHash],  // Gruppen-Identifier (SHA-256 des Secrets)
    ['t', 'bitcoin-group-config']
  ],
  content: JSON.stringify({
    relay: 'wss://relay.example.com',
    admin_pubkey: 'admin-hex',
    secret_hash: 'sha256-hash',
    created_at: timestamp,
    updated_at: timestamp
  })
}

// Whitelist-Event (Kind 30000)
// Öffentlich lesbar - enthält nur Public Keys
{
  kind: 30000,
  tags: [
    ['d', channelId],  // Gruppen-spezifische ID
    ['t', 'bitcoin-group-whitelist']
  ],
  content: JSON.stringify({
    pubkeys: ['hex1', 'hex2', ...],
    updated_at: timestamp,
    admin_pubkey: 'admin-hex',
    channel_id: 'channel-id'
  })
}
```

#### 🔍 Admin-Erkennung

```typescript
// Bei jedem Login wird Admin-Status neu berechnet
const secretHash = await deriveSecretHash(group.secret);
const adminPubkey = await loadGroupAdmin(secretHash, [group.relay]);
const isAdmin = adminPubkey.toLowerCase() === user.pubkey.toLowerCase();
```

**Warum wird es immer neu berechnet?**
- ✅ Funktioniert mit mehreren NSECs auf demselben PC
- ✅ localStorage wird nicht benötigt
- ✅ Admin-Status ist immer aktuell
- ✅ Keine Datenspeicherung nötig

## 🚀 Neue Features (Oktober 2025)

### 1. Dynamische Admin-Verwaltung (HAUPTFEATURE!)

#### 🎯 Das Problem (Vorher)
```typescript
// ALT: Admin-Status in localStorage gespeichert
Szenario mit zwei NSECs auf demselben PC:
1. Admin A erstellt Gruppe → localStorage.setItem('is_group_admin', 'true')
2. Admin A geht weg
3. Admin B loggt sich ein → localStorage hat IMMER noch is_group_admin='true'
4. Admin B ist fälschlicherweise als Admin erkannt! ❌
```

#### ✅ Die Lösung (Jetzt)
```typescript
// NEU: Admin-Status wird von Nostr geladen
Szenario mit zwei NSECs auf demselben PC:
1. Admin A erstellt Gruppe → public GroupConfig wird auf Nostr gespeichert
2. Admin A geht weg
3. Admin B loggt sich ein
4. System lädt GroupConfig von Nostr
5. Vergleicht: admin_pubkey (von Nostr) vs. current_pubkey (von Admin B)
6. MATCH? Nein → Admin B ist korrekt NICHT als Admin erkannt ✅
```

#### 🔐 Admin-Erkennung Flow

```
Login/Mount
   ↓
Lade Group-Secret aus Store
   ↓
DerIVE Secret-Hash (SHA-256)
   ↓
Lade GroupConfig von Nostr (öffentlich)
   ↓
Extrahiere admin_pubkey aus Config
   ↓
Vergleiche: admin_pubkey === current_user.pubkey (case-insensitive)
   ↓
JA: isAdmin = true ✅
NEIN: isAdmin = false ❌
```

#### 💻 Implementierung

**In src/routes/admin/+page.svelte (Admin-Panel)**:
```typescript
onMount(async () => {
  // Lade Admin-Status dynamisch von Nostr
  const { loadGroupAdmin, deriveSecretHash } = await import('$lib/nostr/groupConfig');
  const secretHash = await deriveSecretHash(group.secret);
  const adminPubkey = await loadGroupAdmin(secretHash, [group.relay]);
  
  // Prüfe ob aktueller User der Admin ist
  if (!adminPubkey || adminPubkey.toLowerCase() !== user.pubkey?.toLowerCase()) {
    error = 'Zugriff verweigert. Du bist kein Administrator.';
    setTimeout(() => goto('/group'), 2000);
    return;
  }
  
  isAdmin = true;
  await loadWhitelistData(adminPubkey);
});
```

**In src/routes/(app)/group/+page.svelte (Marketplace)**:
```typescript
onMount(async () => {
  if (group && group.relay && group.secret) {
    try {
      const { loadGroupAdmin, deriveSecretHash } = await import('$lib/nostr/groupConfig');
      const secretHash = await deriveSecretHash(group.secret);
      const adminPubkey = await loadGroupAdmin(secretHash, [group.relay]);
      
      const isCurrentUserAdmin = adminPubkey?.toLowerCase() === userPubkey?.toLowerCase();
      isAdmin = isCurrentUserAdmin;
      
      console.log('🔐 [ADMIN-CHECK-DYNAMIC]', {
        isAdmin: isCurrentUserAdmin ? '✅ JA' : '❌ NEIN'
      });
    } catch (adminCheckError) {
      console.warn('⚠️ [ADMIN-CHECK] Konnte Admin-Status nicht laden:', adminCheckError);
      isAdmin = false;
    }
  }
});
```

#### 📊 Vergleich: localStorage vs. Nostr

| Feature | localStorage (ALT) | Nostr (NEU) |
|---------|-------------------|-----------|
| **Multi-NSEC-Support** | ❌ Nein | ✅ Ja |
| **Admin-Status-Berechnung** | Manuell gespeichert | Dynamisch berechnet |
| **PC-Browser-übergreifend** | ❌ Problem | ✅ Kein Problem |
| **Fallback bei Relay-Ausfall** | ✅ Funktioniert weiter | ⚠️ Zeigt Fehler |
| **Sicherheit** | ⚠️ Unsicher bei Fremdzugriff | ✅ Aber lokal gespeichert |

### 2. Sofortiges Admin-Erkennungssystem

Wenn Admin eine Gruppe erstellt, wird er **sofort** als Admin erkannt:

```typescript
// In handleCreateGroup()
async function handleCreateGroup() {
  // ... validierung ...
  
  // Speichere öffentliche GroupConfig auf Nostr
  const secretHash = await deriveSecretHash(finalSecret);
  const groupConfigData = {
    relay: relay,
    admin_pubkey: pubkey,          // ← Admin wird gespeichert
    secret_hash: secretHash,
    created_at: timestamp,
    updated_at: timestamp
  };
  
  await saveGroupConfig(groupConfigData, keyValidation.hex!, [relay]);
  
  // Speichere auch im localStorage als Backup
  localStorage.setItem('is_group_admin', 'true');
  localStorage.setItem('admin_pubkey', pubkey);
  localStorage.setItem('group_secret', finalSecret);
  
  // Initialisiere Gruppe
  await groupStore.initialize(finalSecret, relay);
  
  // → Admin ist SOFORT erkannt! ✅
  // → Keine Logout/Login nötig
  // → Admin-Button erscheint sofort
  await goto('/group');
}
```

### 3. Whitelist-Verwaltung

**Admin-Only Features**:
```typescript
// Nur Admin sieht den Admin-Button im Marketplace
{#if isAdmin}
  <button on:click={() => goto('/admin')}>
    🔐 Whitelist verwalten
  </button>
{/if}

// Admin-Panel ist geschützt
// Nur Admin kann auf /admin zugreifen
// Andere User werden sofort zu /group weitergeleitet
```

**Whitelist-Operationen**:
```typescript
// Public Key hinzufügen
await addToWhitelist(pubkey, adminPrivateKey, [relay], channelId);

// Public Key entfernen
await removeFromWhitelist(pubkey, adminPrivateKey, [relay], channelId);

// Einladungslink generieren
const link = createInviteLink(domain, relay, secret);
```

### 4. Einladungslink-System

Admin kann Einladungslinks generieren:

```typescript
async function generateInviteLink() {
  const domain = window.location.origin;
  const relay = $groupStore.relay;
  const secret = $groupStore.secret;
  
  inviteLink = createInviteLink(domain, relay, secret);
  // → Format: https://domain.com/?relay=wss://...&secret=...
  
  // Link wird in User-Config gespeichert (localStorage)
}
```

## 🔧 Technische Implementierung

### Code-Struktur
```
src/routes/+page.svelte                      # Login-UI (Create/Join Modi)
src/routes/(app)/group/+page.svelte          # Marketplace (Admin-Check + Button)
src/routes/admin/+page.svelte                # Whitelist-Verwaltung + Link-Generator
src/lib/stores/userStore.ts                  # User-State Management
src/lib/stores/groupStore.ts                 # Group-State Management
src/lib/nostr/groupConfig.ts                 # Admin-Erkennung (NEW!)
src/lib/nostr/whitelist.ts                   # Whitelist CRUD-Operationen
src/lib/security/validation.ts               # Input-Validierung
src/lib/config.ts                            # Zentrale Konfiguration (DEFAULT_RELAYS)
```

### NEU: `src/lib/nostr/groupConfig.ts`

Diese Datei ist das Herzstück der dynamischen Admin-Verwaltung:

```typescript
// Admin-Pubkey laden
export async function loadGroupAdmin(
  secretHash: string,
  relays: string[]
): Promise<string>  // Gibt Pubkey hex zurück

// Secret-Hash berechnen (SHA-256)
export async function deriveSecretHash(
  secret: string
): Promise<string>  // Gibt SHA-256 hash zurück

// GroupConfig speichern
export async function saveGroupConfig(
  config: GroupConfig,
  adminPrivateKey: string,
  relays: string[]
): Promise<string>  // Gibt Event-ID zurück

// GroupConfig laden
export async function loadGroupConfig(
  secretHash: string,
  relays: string[]
): Promise<GroupConfig | null>
```

**Verwendung**:
```typescript
// 1. Admin erstellt Gruppe
const secretHash = await deriveSecretHash(secret);
await saveGroupConfig({ relay, admin_pubkey: pubkey, secret_hash: secretHash }, privateKey, [relay]);

// 2. User/Admin meldet sich an
const adminPubkey = await loadGroupAdmin(secretHash, [relay]);
const isAdmin = adminPubkey.toLowerCase() === user.pubkey.toLowerCase();
```

## 🔐 Sicherheitsmodell

### Admin-Erkennung

✅ **Wie Admin-Status funktioniert**:

1. **Bei Gruppe erstellen**: Admin-Pubkey wird öffentlich auf Nostr gespeichert
2. **Bei Login/Mount**: Admin-Pubkey wird von Nostr geladen
3. **Vergleich**: `admin_pubkey von Nostr === current_user.pubkey`
4. **JA** → `isAdmin = true`
5. **NEIN** → `isAdmin = false`

✅ **Warum das sicher ist**:
- Kein localStorage-Fallback nötig
- Jeder Login wird neu berechnet
- Multi-NSEC-Szenarien funktionieren korrekt
- Relay ist Single-Source-of-Truth

### Admin-Bypass für Whitelist

✅ **Admin hat IMMER Zugriff**:

```typescript
// Sicherheitslogik beim Beitreten
if (isAdmin) {
  // ✅ Admin-Bypass aktiviert
  // Keine Whitelist-Prüfung
  // Direkter Zugriff zur Gruppe
} else {
  // ❌ Normale User
  // Whitelist-Prüfung erforderlich
  // Zugriff nur wenn in Whitelist
}
```

**Vorteile**:
1. Admin muss sich nicht selbst zur Whitelist hinzufügen
2. Admin kann sich jederzeit anmelden
3. Admin kann Gruppe immer verwalten
4. Normale User sind durch Whitelist geschützt

### Whitelist-Prüfung (für normale User)

```
User gibt Einladungslink + NSEC ein
   ↓
System extrahiert Relay + Secret
   ↓
Berechne Channel-ID aus Secret
   ↓
Lade Whitelist vom Relay (Kind 30000 Event)
   ↓
Ist aktueller User Admin? → JA: Bypass ✅
   ↓
NEIN: Prüfe Whitelist
   ├─ User in Whitelist? → JA: Zugriff ✅
   └─ NEIN: Zugriff verweigert ❌
```

## ⚠️ Bekannte Probleme & Lösungen

### Problem 1: localStorage-Abhängigkeit (GELÖST!)
- **Vorher**: Admin-Status wurde in localStorage gespeichert
- **Nachher**: Admin-Status wird dynamisch von Nostr geladen
- **Warum gelöst**: Mehrere NSECs auf demselben PC funktionieren jetzt korrekt

### Problem 2: Multi-NSEC-Support (GELÖST!)
- **Vorher**: localStorage konnte NSECs nicht unterscheiden
- **Nachher**: Jeder Login wird neu gegen Nostr validiert
- **Warum gelöst**: Admin-Status basiert auf pubkey-Vergleich, nicht auf localStorage

### Problem 3: Relay-Abhängigkeit (BEKANNT)
- **Symptom**: Wenn Relay offline ist, funktioniert Admin-Panel nicht
- **Workaround**: User wird zu Gruppe zurück geleitet
- **Lösung geplant**: Bessere Fehlerbehandlung und Fallback-Mechanismen

## 📚 Referenzen

- [NIP-01: Basic Protocol](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [NIP-19: bech32-encoded entities](https://github.com/nostr-protocol/nips/blob/master/19.md)
- [NIP-07: window.nostr](https://github.com/nostr-protocol/nips/blob/master/07.md)

---

**Letzte Aktualisierung**: 21. Oktober 2025
**Status**: ✅ Funktional, Dynamische Admin-Verwaltung implementiert
**Priorität**: Hoch (Multi-NSEC-Support auf demselben PC)