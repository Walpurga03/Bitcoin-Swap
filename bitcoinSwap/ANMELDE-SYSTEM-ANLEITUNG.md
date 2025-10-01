# 🔐 Anmelde-System Anleitung

## Übersicht: Wie das Anmelden funktioniert

Das Bitcoin-Tausch-Netzwerk verwendet ein **zweistufiges Authentifizierungssystem**:
1. **Einladungslink** (enthält Gruppen-Zugang)
2. **Nostr Private Key** + **Whitelist-Prüfung**

---

## 1. 🔗 Einladungslink-Erzeugung

### Wo wird der Link erzeugt?
**Datei:** [`src/lib/utils/index.ts`](src/lib/utils/index.ts) - Zeilen 254-263

```typescript
export function createInviteLink(relay: string, secret: string, baseUrl?: string): string {
  const base = baseUrl || window.location.origin;
  const params = new URLSearchParams({
    relay,
    secret
  });
  
  return `${base}?${params.toString()}`;
}
```

### Link-Format:
```
https://ihre-domain.vercel.app?relay=wss://nostr-relay.online&secret=geheimer-gruppen-code
```

### Wo können Sie das ändern?

#### A) **Relay-URL ändern:**
- **Standard-Relay:** [`src/lib/utils/index.ts`](src/lib/utils/index.ts) Zeile 258
- **Oder:** Beim Aufruf von `createInviteLink()` den `relay`-Parameter ändern

#### B) **Secret ändern:**
- Der `secret` wird beim Erstellen einer neuen Gruppe generiert
- **Manuell:** Beim Aufruf von `createInviteLink()` den `secret`-Parameter ändern

#### C) **Base-URL ändern:**
- **Automatisch:** `window.location.origin` (aktuelle Domain)
- **Manuell:** `baseUrl`-Parameter bei `createInviteLink()` setzen

---

## 2. 📋 Whitelist-Konfiguration (NPUBs)

### Wo befinden sich die erlaubten NPUBs?

**Datei:** [`.env.production`](.env.production) - Zeile 9

```env
PUBLIC_ALLOWED_PUBKEYS="npub1s98sys9c58fy2xn62wp8cy5ke2rak3hjdd3z7ahc4jm5tck4fadqrfd9f5,npub1vj0rae3fxgx5k7uluvgg2fk2hzagaqpqqdxxtt9lrmuqgzwspv6qw5vdam,npub1z90zurzsh00cmg6qfuyc5ca4auyjsp8kqxyf4hykyynxjj42ps6svpfgt3"
```

### Wie wird die Whitelist geprüft?

**Datei:** [`src/routes/+page.svelte`](src/routes/+page.svelte) - Zeilen 152-159

```typescript
// Whitelist-Prüfung über Environment Variable
const allowedPubkeysEnv = PUBLIC_ALLOWED_PUBKEYS || '';
const allowedPubkeys = allowedPubkeysEnv.split(',').map((key: string) => key.trim()).filter((key: string) => key.length > 0);
const npub = nip19.npubEncode(publicKey);

if (allowedPubkeys.length > 0 && !allowedPubkeys.includes(npub)) {
    throw new Error('Du bist nicht auf der Whitelist! Kontaktieren Sie einen Administrator.');
}
```

---

## 3. 🔄 Änderungen vornehmen

### Schritt 1: NPUBs zur Whitelist hinzufügen/entfernen

**Bearbeiten Sie:** [`.env.production`](.env.production)

```env
# Neue NPUBs hinzufügen (kommagetrennt, keine Leerzeichen)
PUBLIC_ALLOWED_PUBKEYS="npub1abc...,npub1def...,npub1ghi..."
```

### Schritt 2: Standard-Relay ändern (optional)

**Bearbeiten Sie:** [`.env.production`](.env.production)

```env
# Standard-Relay ändern
PUBLIC_DEFAULT_RELAY="wss://ihr-eigener-relay.com"
```

### Schritt 3: Git Push für Vercel-Deployment

```bash
# Alle Änderungen committen
git add .
git commit -m "🔐 Whitelist aktualisiert: Neue NPUBs hinzugefügt"

# Zu GitHub pushen (triggert automatisches Vercel-Deployment)
git push origin main
```

### Schritt 4: Vercel Environment Variables (falls nötig)

Falls Sie die Environment Variables direkt in Vercel ändern möchten:

1. **Vercel Dashboard** → Ihr Projekt → **Settings** → **Environment Variables**
2. **`PUBLIC_ALLOWED_PUBKEYS`** bearbeiten
3. **Redeploy** triggern

---

## 4. 🔍 Anmelde-Prozess im Detail

### Schritt 1: Link-Parsing
```typescript
// URL-Parameter extrahieren
const urlParams = new URLSearchParams(window.location.search);
const relay = urlParams.get('relay');
const secret = urlParams.get('secret');
```

### Schritt 2: Gruppen-Konfiguration
```typescript
// Channel-ID aus Secret ableiten (deterministisch)
const channelId = await deriveChannelIdFromSecret(secret);

const groupConfig = {
    channelId: channelId,
    relay: relay,
    secret: secret,
    name: 'Private Bitcoin-Gruppe'
};
```

### Schritt 3: Private Key Validierung
```typescript
// nsec oder hex-Format akzeptieren
let cleanKey = privateKey.toLowerCase();
if (cleanKey.startsWith('nsec')) {
    const decoded = nip19.decode(cleanKey);
    cleanKey = Array.from(decoded.data).map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### Schritt 4: Whitelist-Prüfung
```typescript
// Public Key aus Private Key ableiten
const publicKey = getPublicKey(privkeyBytes);
const npub = nip19.npubEncode(publicKey);

// Mit Whitelist abgleichen
if (!allowedPubkeys.includes(npub)) {
    throw new Error('Nicht auf der Whitelist!');
}
```

---

## 5. 🛠️ Praktische Beispiele

### Neuen Benutzer hinzufügen:

1. **NPUB des Benutzers erhalten** (z.B. `npub1xyz...`)
2. **`.env.production` bearbeiten:**
   ```env
   PUBLIC_ALLOWED_PUBKEYS="npub1s98sys...,npub1vj0rae...,npub1xyz..."
   ```
3. **Git Push:**
   ```bash
   git add .env.production
   git commit -m "➕ Neuer Benutzer zur Whitelist hinzugefügt"
   git push origin main
   ```

### Einladungslink erstellen:

```typescript
import { createInviteLink } from '$lib/utils';

const inviteLink = createInviteLink(
    'wss://nostr-relay.online',  // Ihr Relay
    'geheimer-gruppen-code-123', // Gruppen-Secret
    'https://ihre-app.vercel.app' // Ihre Domain
);

console.log('Einladungslink:', inviteLink);
// Ergebnis: https://ihre-app.vercel.app?relay=wss://nostr-relay.online&secret=geheimer-gruppen-code-123
```

---

## 6. ⚠️ Wichtige Hinweise

### Sicherheit:
- **NPUBs sind öffentlich** - können sicher in GitHub gespeichert werden
- **Private Keys niemals committen!**
- **Secrets sollten stark und einzigartig sein**

### Deployment:
- **Jede Änderung an `.env.production` erfordert Git Push**
- **Vercel deployed automatisch bei Push zu `main`**
- **Environment Variables werden zur Build-Zeit eingebettet**

### Debugging:
- **Browser-Konsole** zeigt detaillierte Login-Logs
- **Whitelist-Fehler** werden klar angezeigt
- **Relay-Verbindungsfehler** werden geloggt

---

## 7. 🔧 Schnell-Referenz

| Was ändern? | Wo? | Danach? |
|-------------|-----|---------|
| **NPUBs hinzufügen/entfernen** | `.env.production` Zeile 9 | Git Push |
| **Standard-Relay** | `.env.production` Zeile 4 | Git Push |
| **Link-Erzeugung** | `src/lib/utils/index.ts` Zeile 255 | Git Push |
| **Whitelist-Logik** | `src/routes/+page.svelte` Zeile 152 | Git Push |

**Nach jeder Änderung:**
```bash
git add .
git commit -m "Beschreibung der Änderung"
git push origin main
```

---

## 8. 🐛 Lokale Entwicklung - Häufige Probleme

### Problem: "does not provide an export named 'PUBLIC_ALLOWED_PUBKEYS'"

**Ursache:** Lokale Development-Umgebung hat keine `.env` Datei

**Lösung:** `.env` Datei für lokale Entwicklung erstellt ✅

```env
# .env (für lokale Entwicklung)
PUBLIC_ALLOWED_PUBKEYS="npub1s98sys9c58fy2xn62wp8cy5ke2rak3hjdd3z7ahc4jm5tck4fadqrfd9f5,npub1vj0rae3fxgx5k7uluvgg2fk2hzagaqpqqdxxtt9lrmuqgzwspv6qw5vdam,npub1z90zurzsh00cmg6qfuyc5ca4auyjsp8kqxyf4hykyynxjj42ps6svpfgt3"
PUBLIC_DEBUG_MODE="true"
```

### Environment-Dateien Übersicht:

| Datei | Zweck | Git Status |
|-------|-------|------------|
| `.env` | Lokale Entwicklung | ❌ Nicht committed (in .gitignore) |
| `.env.production` | Vercel Production | ✅ Committed (öffentliche Werte) |

### Lokaler Start:
```bash
cd bitcoinSwap
pnpm install
pnpm run dev
```

**Jetzt sollte es lokal funktionieren!** 🎉

---

Das war's! Das System ist jetzt vollständig konfigurierbar und deployment-ready. 🚀