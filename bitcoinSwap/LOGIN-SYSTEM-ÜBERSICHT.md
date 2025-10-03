# 🔐 LOGIN-SYSTEM ÜBERSICHT

## Funktionsweise des Login-Systems

### 1. **Einladungslink-Format**
```
https://domain.com/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group123
```

**Komponenten:**
- **Domain:** Basis-URL der Anwendung
- **Relay:** WebSocket-URL des Nostr-Relays (URL-encoded)
- **Secret:** Eindeutiger Gruppen-Identifikator

### 2. **Zwei-Faktor-Authentifizierung**
1. **Einladungslink** → Berechtigung zur Gruppe
2. **NSEC Private Key** → Identität + Whitelist-Prüfung

### 3. **Gruppen-Isolation**
- **Unterschiedliches Secret** = **Andere Gruppe**
- Jedes Secret generiert eine **eindeutige Channel-ID** via SHA-256
- Vollständige Trennung der Nachrichten zwischen Gruppen

## Benötigte Dateien für das Login-System

### 🎯 **KERN-DATEIEN (Login-Logik)**

#### 1. `src/routes/+page.svelte` ⭐ **HAUPT-LOGIN-SEITE**
- **Zweck:** Haupteinstiegspunkt für Login
- **Funktionen:**
  - URL-Parameter parsen (relay + secret)
  - NSEC-Schlüssel validieren
  - Whitelist-Prüfung
  - Channel-ID aus Secret ableiten
  - Weiterleitung zur Gruppe

#### 2. `src/lib/utils/index.ts` ⭐ **URL-VERARBEITUNG**
- **Zweck:** Einladungslink-Funktionen
- **Funktionen:**
  - `parseInviteLink()` - URL zu relay + secret
  - `createInviteLink()` - Einladungslinks erstellen

#### 3. `src/lib/security/validation.ts` ⭐ **VALIDIERUNG**
- **Zweck:** Sicherheitsvalidierung
- **Funktionen:**
  - `validatePrivateKey()` - NSEC/Hex-Schlüssel prüfen
  - `validateRelayUrl()` - WebSocket-URL validieren
  - `validateGroupSecret()` - Secret-Format prüfen

### 🔐 **AUTHENTIFIZIERUNG & KRYPTOGRAFIE**

#### 4. `src/lib/nostr/client.ts` ⭐ **NOSTR-CLIENT**
- **Zweck:** Nostr-Protokoll-Handling
- **Funktionen:**
  - Channel-ID aus Secret ableiten (SHA-256)
  - Event-Cache-Management
  - Gruppen-Isolation sicherstellen

#### 5. `src/lib/nostr/crypto.ts` ⭐ **VERSCHLÜSSELUNG**
- **Zweck:** Kryptografische Funktionen
- **Funktionen:**
  - `deriveKeyFromSecret()` - Encryption-Key aus Secret
  - Nachrichten ver-/entschlüsseln

### 📊 **DATEN-MANAGEMENT**

#### 6. `src/lib/stores/userStore.ts` ⭐ **USER-STORE**
- **Zweck:** Benutzer-Daten verwalten
- **Funktionen:**
  - User-Profil speichern (pubkey, privkey, name)
  - Reactive Svelte Store

#### 7. `src/lib/stores/groupStore.ts` ⭐ **GRUPPEN-STORE**
- **Zweck:** Gruppen-Daten verwalten
- **Funktionen:**
  - Gruppenkonfiguration speichern
  - `clearGroupData()` - Beim Gruppenwechsel leeren
  - Nachrichten-Store verwalten

### ⚙️ **KONFIGURATION & UMGEBUNG**

#### 8. `.env` ⭐ **LOKALE UMGEBUNG**
- **Zweck:** Lokale Entwicklung
- **Inhalt:**
```
PUBLIC_ALLOWED_PUBKEYS=npub1abc...,npub1def...
```

#### 9. `.env.production` ⭐ **PRODUCTION-UMGEBUNG**
- **Zweck:** Vercel-Deployment
- **Inhalt:**
```
PUBLIC_ALLOWED_PUBKEYS=npub1abc...,npub1def...
```

### 🎨 **BENUTZEROBERFLÄCHE**

#### 10. `src/routes/(app)/group/+page.svelte` ⭐ **GRUPPEN-CHAT**
- **Zweck:** Hauptchat nach Login
- **Funktionen:**
  - Channel-ID anzeigen
  - Nachrichten senden/empfangen
  - Gruppen-Isolation visualisieren

### 🔧 **DEBUG & TESTING**

#### 11. `src/routes/debug-secret/+page.svelte` 🛠️ **DEBUG-TOOLS**
- **Zweck:** Secret-Verhalten testen
- **Funktionen:**
  - Channel-ID-Generierung testen
  - URL-Parsing validieren
  - Duplikate erkennen

#### 12. `src/routes/test-login/+page.svelte` 🛠️ **LOGIN-TESTS**
- **Zweck:** Login-Szenarien testen
- **Funktionen:**
  - Verschiedene NSEC-Keys testen
  - Whitelist-Verhalten prüfen

### 📋 **TYPEN & INTERFACES**

#### 13. `src/lib/nostr/types.ts` 📝 **TYPE-DEFINITIONEN**
- **Zweck:** TypeScript-Typen
- **Definitionen:**
  - `UserProfile` - Benutzer-Interface
  - `GroupConfig` - Gruppen-Konfiguration
  - `GroupMessage` - Nachrichten-Format

## Login-Ablauf im Detail

### Schritt 1: URL-Parsing
```typescript
// src/routes/+page.svelte
const urlParams = new URLSearchParams(window.location.search);
const relay = urlParams.get('relay');
const secret = urlParams.get('secret');
```

### Schritt 2: Channel-ID ableiten
```typescript
// src/routes/+page.svelte
async function deriveChannelIdFromSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret + 'bitcoin-group-channel');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### Schritt 3: Whitelist-Prüfung
```typescript
// src/routes/+page.svelte
const allowedPubkeys = PUBLIC_ALLOWED_PUBKEYS.split(',');
const npub = nip19.npubEncode(publicKey);
if (!allowedPubkeys.includes(npub)) {
  throw new Error('Nicht auf der Whitelist');
}
```

### Schritt 4: Gruppen-Isolation
```typescript
// src/lib/nostr/client.ts
async configureGroup(config: GroupConfig) {
  // Cache leeren bei Gruppenwechsel
  if (previousChannelId !== config.channelId) {
    this.eventCache.clear();
    this.unsubscribeAll();
  }
}
```

## Sicherheitsfeatures

### ✅ **Implementierte Sicherheit:**
1. **Zwei-Faktor-Auth:** Link + Private Key
2. **Whitelist-Kontrolle:** Nur autorisierte Public Keys
3. **Gruppen-Isolation:** Eindeutige Channel-IDs
4. **Verschlüsselung:** AES-GCM mit Secret-derived Keys
5. **Cache-Isolation:** Getrennte Event-Caches pro Gruppe

### 🔒 **Gruppen-Trennung:**
- `premium-group123` → Channel-ID: `abc123...`
- `premium-group12` → Channel-ID: `def456...`
- **Vollständig getrennte Nachrichten**

## Deployment-Dateien

#### 14. `vercel.json` 🚀 **VERCEL-KONFIGURATION**
- **Zweck:** Deployment-Einstellungen
- **Konfiguration:** PNPM, Build-Commands

#### 15. `package.json` 📦 **DEPENDENCIES**
- **Zweck:** Projekt-Dependencies
- **Wichtige Pakete:** nostr-tools, svelte, vite

## Zusammenfassung

**Das Login-System basiert auf:**
1. **Einladungslink** (Domain + Relay + Secret)
2. **Private Key** (NSEC/Hex)
3. **Whitelist** (Environment Variable)
4. **Channel-ID** (SHA-256 aus Secret)

**Jedes unterschiedliche Secret = Neue Gruppe mit vollständiger Isolation!**