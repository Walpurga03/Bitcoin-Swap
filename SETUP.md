# Setup-Anleitung für Bitcoin-Swap

## 📦 Schnellstart

### 1. Projekt klonen und Dependencies installieren

```bash
# Dependencies installieren
npm install

# .env Datei erstellen
cp .env.example .env
```

### 2. Whitelist konfigurieren

Bearbeite `.env` und füge die erlaubten Public Keys hinzu:

```env
PUBLIC_ALLOWED_PUBKEYS=npub1abc...,npub1def...,npub1xyz...
```

**Wichtig:** Du kannst sowohl NPUB- als auch Hex-Format verwenden.

### 3. Development Server starten

```bash
npm run dev
```

Die App läuft nun auf `http://localhost:5173`

## 🔑 Public Keys generieren

### Option 1: Mit der Test-Seite

1. Starte den Dev-Server: `npm run dev`
2. Öffne `http://localhost:5173/test-login`
3. Klicke auf "Test-Keys generieren"
4. Kopiere die generierten NPUB-Keys in deine `.env`

### Option 2: Mit nostr-tools CLI

```bash
# Installiere nostr-tools global
npm install -g nostr-tools

# Generiere Keys (Beispiel mit Node.js)
node -e "const { generatePrivateKey, getPublicKey } = require('nostr-tools'); const sk = generatePrivateKey(); const pk = getPublicKey(sk); console.log('Private:', sk); console.log('Public:', pk);"
```

### Option 3: Mit bestehenden Nostr-Clients

- Verwende Clients wie [Damus](https://damus.io/), [Amethyst](https://github.com/vitorpamplona/amethyst) oder [Snort](https://snort.social/)
- Exportiere deinen Public Key (NPUB)
- Füge ihn zur Whitelist hinzu

## 🔗 Einladungslinks erstellen

### 📋 Was sind Einladungslinks?

Einladungslinks sind spezielle URLs, die es Benutzern ermöglichen, direkt einer Bitcoin-Swap Gruppe beizutreten. Sie enthalten alle notwendigen Informationen:

- **Domain**: Die URL der deployed App
- **Relay**: Der Nostr-Relay Server für die Kommunikation
- **Secret**: Das Gruppen-Passwort für den Zugang

### 🔧 Format und Aufbau

```
https://deine-domain.com/?relay=RELAY_URL&secret=GRUPPEN_SECRET
```

**Komponenten erklärt:**
- `https://deine-domain.com` - Die URL deiner Bitcoin-Swap App
- `?relay=RELAY_URL` - Der URL-encodierte Nostr-Relay Server
- `&secret=GRUPPEN_SECRET` - Das eindeutige Gruppen-Secret

### 🌐 Live-Beispiel (Bitcoin-Swap)

```
https://bitcoin-swap-ogfmixoxv-walpurga03s-projects.vercel.app/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group123
```

**Aufschlüsselung:**
- **App-URL**: `https://bitcoin-swap-ogfmixoxv-walpurga03s-projects.vercel.app`
- **Relay**: `wss://nostr-relay.online` (URL-encoded als `wss%3A%2F%2Fnostr-relay.online`)
- **Secret**: `premium-group123`

### 🏠 Lokales Beispiel (Development)

```
http://localhost:5173/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group123
```

### ⚠️ Wichtige Hinweise

1. **URL-Encoding**: Die Relay-URL muss URL-encoded sein!
   - `wss://nostr-relay.online` → `wss%3A%2F%2Fnostr-relay.online`
   - `:` wird zu `%3A`
   - `/` wird zu `%2F`

2. **Sicherheit**: Teile Einladungslinks nur mit vertrauenswürdigen Personen
3. **Gültigkeit**: Links funktionieren nur, wenn der Public Key in der Whitelist steht

### Mit der Debug-Seite erstellen

1. Öffne `http://localhost:5173/debug-secret`
2. Gib Domain, Relay und Secret ein
3. Klicke auf "Einladungslink erstellen"
4. Kopiere den generierten Link

### Manuell erstellen

```javascript
// In der Browser-Console
const relay = 'wss://nostr-relay.online';
const secret = 'premium-group123';
const domain = 'https://bitcoin-swap-ogfmixoxv-walpurga03s-projects.vercel.app';

const encodedRelay = encodeURIComponent(relay);
const encodedSecret = encodeURIComponent(secret);
const link = `${domain}/?relay=${encodedRelay}&secret=${encodedSecret}`;

console.log(link);
// Ausgabe: https://bitcoin-swap-ogfmixoxv-walpurga03s-projects.vercel.app/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group123
```

## 🚀 Deployment

### ✅ Erfolgreich deployed auf Vercel!

**Live URL:** `https://bitcoin-swap-ogfmixoxv-walpurga03s-projects.vercel.app`

**Repository:** `git@github.com:Walpurga03/Bitcoin-Swap.git`

### Deployment-Details

1. **Git Repository Migration** ✅
   ```bash
   # Altes Remote entfernt: Bitcoin-Tausch-Netzwerk
   # Neues Remote hinzugefügt: Bitcoin-Swap
   git remote add origin git@github.com:Walpurga03/Bitcoin-Swap.git
   git branch -M main
   git push -u origin main
   ```

2. **Vercel Setup** ✅
   ```bash
   # Vercel CLI Login
   npx vercel login
   
   # Projekt verlinkt: walpurga03s-projects/bitcoin-swap
   npx vercel --prod
   ```

3. **Environment Variables** ✅
   - `PUBLIC_ALLOWED_PUBKEYS` bereits konfiguriert
   - Whitelist aktiv mit 3 autorisierten Public Keys

### Für zukünftige Updates

```bash
# Code ändern und committen
git add .
git commit -m "Update message"
git push

# Automatisches Deployment oder manuell:
npx vercel --prod
```

### Vercel Dashboard

- **Projekt:** https://vercel.com/walpurga03s-projects/bitcoin-swap
- **Settings:** https://vercel.com/walpurga03s-projects/bitcoin-swap/settings
- **Deployments:** https://vercel.com/walpurga03s-projects/bitcoin-swap/deployments

### Test-Einladungslink (Live)

```
https://bitcoin-swap-ogfmixoxv-walpurga03s-projects.vercel.app/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group123
```

### Alternative Deployment-Optionen

#### Vercel (für neue Projekte)

1. **Vercel Account erstellen** auf [vercel.com](https://vercel.com)

2. **Projekt verbinden**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

3. **Environment Variables setzen**
   - Gehe zu deinem Projekt auf vercel.com
   - Settings → Environment Variables
   - Füge hinzu: `PUBLIC_ALLOWED_PUBKEYS` mit deiner Whitelist

4. **Deployen**
   ```bash
   npm run deploy
   ```

### Netlify

1. **Build Command:** `npm run build`
2. **Publish Directory:** `build`
3. **Environment Variables:** `PUBLIC_ALLOWED_PUBKEYS`

### Andere Plattformen

```bash
# Build erstellen
npm run build

# Der 'build' Ordner enthält die statischen Dateien
# Diese können auf jedem Static-Hosting deployed werden
```

## 🔧 Konfiguration

### Relay-Auswahl

Empfohlene öffentliche Relays:

- `wss://relay.damus.io`
- `wss://nostr-relay.online`
- `wss://relay.nostr.info`
- `wss://nos.lol`

**Tipp:** Für private Gruppen kannst du auch einen eigenen Relay betreiben!

### Gruppen-Secrets

Best Practices:

- Mindestens 12 Zeichen
- Nur Buchstaben, Zahlen, `-` und `_`
- Eindeutig pro Gruppe
- Nicht in Git committen!

Beispiele:
- `premium-members-2024`
- `dev-team-alpha`
- `family-chat-secure`

### Whitelist-Management

**Development:**
```env
# .env
PUBLIC_ALLOWED_PUBKEYS=npub1test1,npub1test2,npub1test3
```

**Production:**
```env
# .env.production
PUBLIC_ALLOWED_PUBKEYS=npub1real1,npub1real2,npub1real3
```

**Vercel:**
- Setze die Variable in den Project Settings
- Verwende Vercel Secrets für sensible Daten

## 🧪 Testing

### Lokale Tests

```bash
# Starte Dev-Server
npm run dev

# Öffne Test-Seiten
# http://localhost:5173/test-login
# http://localhost:5173/debug-secret
```

### Test-Szenarien

1. **Login-Test**
   - Gültiger NSEC + Whitelist → Erfolg
   - Gültiger NSEC + nicht in Whitelist → Fehler
   - Ungültiger NSEC → Fehler

2. **Channel-ID-Test**
   - Gleiches Secret → Gleiche Channel-ID
   - Unterschiedliche Secrets → Unterschiedliche IDs

3. **Marketplace-Test**
   - Angebot erstellen → Temporärer Key
   - Interesse zeigen → Event wird gesendet
   - Angebot löschen → Delete-Event

## 🔐 Sicherheit

### Best Practices

1. **Private Keys**
   - Niemals in Git committen
   - Nur lokal im Browser speichern
   - Verwende Browser-Extensions für Key-Management

2. **Whitelist**
   - Regelmäßig überprüfen
   - Entferne inaktive Keys
   - Verwende Environment Variables

3. **Relays**
   - Verwende vertrauenswürdige Relays
   - Betreibe eigene Relays für maximale Privatsphäre
   - Teste Relay-Verfügbarkeit

4. **Secrets**
   - Lange, zufällige Strings
   - Nicht wiederverwenden
   - Sicher teilen (nicht per E-Mail!)

## 📊 Monitoring

### Logs prüfen

```bash
# Development
npm run dev
# Öffne Browser Console (F12)

# Production (Vercel)
# Gehe zu vercel.com → Projekt → Logs
```

### Häufige Probleme

**Problem:** "Cannot find module '@sveltejs/adapter-vercel'"
```bash
# Lösung: Dependencies neu installieren
rm -rf node_modules package-lock.json
npm install
```

**Problem:** "Relay connection failed"
```bash
# Lösung: Prüfe Relay-URL
# Öffne /debug-secret und teste die URL
```

**Problem:** "Public Key not in whitelist"
```bash
# Lösung: Prüfe .env Datei
# Stelle sicher, dass der Public Key korrekt ist
```

## 🆘 Support

Bei Problemen:

1. Prüfe die Browser-Console (F12)
2. Teste mit `/test-login` und `/debug-secret`
3. Überprüfe die `.env` Konfiguration
4. Stelle sicher, dass alle Dependencies installiert sind

## 📚 Weitere Ressourcen

- [Nostr Protocol](https://github.com/nostr-protocol/nostr)
- [nostr-tools Dokumentation](https://github.com/nbd-wtf/nostr-tools)
- [SvelteKit Docs](https://kit.svelte.dev/)
- [Vercel Deployment](https://vercel.com/docs)