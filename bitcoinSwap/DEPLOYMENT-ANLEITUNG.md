# 🚀 WEB-DEPLOYMENT ANLEITUNG

## 🎯 **ZIEL: Bitcoin-Tausch-Netzwerk weltweit verfügbar machen**

Von `localhost` zu einer öffentlich zugänglichen Web-App über:
- ✅ **Vercel** (Empfohlen) - `https://vercel.com/walpurga03s-projects`
- ✅ **GitHub Pages** (Alternative) - Kostenlos über GitHub

---

## 🔧 **SCHRITT 1: SvelteKit für statisches Hosting vorbereiten**

### **1.1 Adapter-Konfiguration prüfen**

Prüfe [`svelte.config.js`](bitcoinSwap/svelte.config.js):

```javascript
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/kit/vite';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html', // Für SPA-Modus
      precompress: false,
      strict: true
    }),
    prerender: {
      handleHttpError: 'warn'
    }
  }
};

export default config;
```

### **1.2 Package.json Build-Scripts**

Prüfe [`package.json`](bitcoinSwap/package.json):

```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview",
    "deploy:vercel": "npm run build && vercel --prod",
    "deploy:github": "npm run build && gh-pages -d build"
  },
  "devDependencies": {
    "@sveltejs/adapter-static": "^3.0.0",
    "gh-pages": "^6.0.0"
  }
}
```

---

## 🌐 **OPTION A: VERCEL DEPLOYMENT (Empfohlen)**

### **Warum Vercel?**
- ✅ Automatische HTTPS
- ✅ Globales CDN
- ✅ Automatische Deployments bei Git-Push
- ✅ Perfekt für SvelteKit
- ✅ Kostenlos für persönliche Projekte

### **A.1 Vercel CLI installieren**

```bash
# Global installieren
npm install -g vercel

# Oder lokal im Projekt
cd bitcoinSwap
npm install --save-dev vercel
```

### **A.2 Vercel-Konfiguration erstellen**

```bash
# In bitcoinSwap/ Verzeichnis
vercel init
```

Erstelle [`vercel.json`](bitcoinSwap/vercel.json):

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "framework": "svelte",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "require-corp"
        },
        {
          "key": "Cross-Origin-Opener-Policy", 
          "value": "same-origin"
        }
      ]
    }
  ]
}
```

### **A.3 Deployment durchführen**

```bash
# Erste Einrichtung
cd bitcoinSwap
vercel login  # Mit GitHub-Account anmelden

# Projekt verknüpfen
vercel link

# Build und Deploy
npm run build
vercel --prod

# Oder direkt:
npm run deploy:vercel
```

### **A.4 Automatische Deployments**

1. **GitHub Repository erstellen** (falls noch nicht vorhanden)
2. **Vercel mit GitHub verknüpfen:**
   - Gehe zu https://vercel.com/walpurga03s-projects
   - "New Project" → "Import Git Repository"
   - Wähle dein Bitcoin-Tausch-Netzwerk Repository
   - Root Directory: `bitcoinSwap`
   - Framework: SvelteKit
   - Build Command: `npm run build`
   - Output Directory: `build`

3. **Automatische Deployments:**
   - Jeder Push zu `main` Branch → Automatisches Deployment
   - Pull Requests → Preview-Deployments

---

## 📄 **OPTION B: GITHUB PAGES (Alternative)**

### **Warum GitHub Pages?**
- ✅ Komplett kostenlos
- ✅ Direkt aus GitHub Repository
- ✅ Einfache Einrichtung
- ❌ Nur statische Seiten (aber perfekt für SvelteKit)

### **B.1 GitHub Pages vorbereiten**

```bash
# gh-pages Package installieren
cd bitcoinSwap
npm install --save-dev gh-pages
```

### **B.2 GitHub Actions Workflow erstellen**

Erstelle [`.github/workflows/deploy.yml`](bitcoinSwap/.github/workflows/deploy.yml):

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: bitcoinSwap/package-lock.json
        
    - name: Install dependencies
      run: |
        cd bitcoinSwap
        npm ci
        
    - name: Build
      run: |
        cd bitcoinSwap
        npm run build
        
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: bitcoinSwap/build
        cname: bitcoin-tausch.deine-domain.com  # Optional: Custom Domain
```

### **B.3 GitHub Pages aktivieren**

1. **Repository Settings:**
   - Gehe zu deinem GitHub Repository
   - Settings → Pages
   - Source: "Deploy from a branch"
   - Branch: `gh-pages` / `root`

2. **Manuelles Deployment:**
```bash
cd bitcoinSwap
npm run build
npm run deploy:github
```

---

## ⚙️ **SCHRITT 2: Build-Optimierung für Production**

### **2.1 Vite-Konfiguration optimieren**

Aktualisiere [`vite.config.ts`](bitcoinSwap/vite.config.ts):

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  
  // Production-Optimierungen
  build: {
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Nostr-Bibliotheken in separaten Chunk
          nostr: ['./src/lib/nostr/realNostrClient.ts', './src/lib/nostr/realCrypto.ts'],
          // UI-Komponenten
          components: ['./src/components/SimpleOfferInterface.svelte']
        }
      }
    }
  },
  
  // Für WebSocket-Verbindungen zu Nostr-Relays
  server: {
    proxy: {
      '/wss': {
        target: 'wss://nostr-relay.online',
        ws: true,
        changeOrigin: true
      }
    }
  },
  
  // Optimierungen
  optimizeDeps: {
    include: ['crypto-js']
  }
});
```

### **2.2 Environment-Konfiguration**

Erstelle [`.env.production`](bitcoinSwap/.env.production):

```bash
# Production-Konfiguration
PUBLIC_APP_NAME="Bitcoin-Tausch-Netzwerk"
PUBLIC_APP_VERSION="1.0.0"
PUBLIC_DEFAULT_RELAY="wss://nostr-relay.online"
PUBLIC_BACKUP_RELAYS="wss://relay.damus.io,wss://nos.lol"
PUBLIC_ENVIRONMENT="production"
```

---

## 🔒 **SCHRITT 3: HTTPS und Sicherheit**

### **3.1 HTTPS-Konfiguration**

**Vercel:** Automatisch aktiviert ✅

**GitHub Pages:** 
- Settings → Pages → "Enforce HTTPS" aktivieren
- Custom Domain für bessere HTTPS-Unterstützung

### **3.2 Content Security Policy**

Erstelle [`app.html`](bitcoinSwap/src/app.html) Header:

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <link rel="icon" href="%sveltekit.assets%/favicon.svg" />
  <meta name="viewport" content="width=device-width" />
  
  <!-- Security Headers -->
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    connect-src 'self' wss://nostr-relay.online wss://relay.damus.io wss://nos.lol wss://relay.nostr.band;
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
  ">
  
  <title>Bitcoin-Tausch-Netzwerk</title>
  %sveltekit.head%
</head>
<body data-sveltekit-preload-data="hover">
  <div style="display: contents">%sveltekit.body%</div>
</body>
</html>
```

---

## 🌍 **SCHRITT 4: Domain-Konfiguration**

### **4.1 Custom Domain (Optional)**

**Für Vercel:**
```bash
# Domain hinzufügen
vercel domains add bitcoin-tausch.deine-domain.com
```

**Für GitHub Pages:**
- Repository Settings → Pages → Custom Domain
- CNAME-Datei wird automatisch erstellt

### **4.2 DNS-Konfiguration**

```dns
# Für Vercel
CNAME bitcoin-tausch 76.76.19.123

# Für GitHub Pages  
CNAME bitcoin-tausch username.github.io
```

---

## 🚀 **SCHRITT 5: Deployment durchführen**

### **5.1 Finale Vorbereitung**

```bash
# Dependencies prüfen
cd bitcoinSwap
npm audit fix

# Build testen
npm run build
npm run preview

# Lokal testen auf http://localhost:4173
```

### **5.2 Vercel Deployment**

```bash
# Einmalige Einrichtung
vercel login
vercel link

# Deployment
npm run build
vercel --prod

# URL wird angezeigt, z.B.:
# https://bitcoin-tausch-netzwerk.vercel.app
```

### **5.3 GitHub Pages Deployment**

```bash
# Automatisch via GitHub Actions
git add .
git commit -m "🚀 Prepare for web deployment"
git push origin main

# Oder manuell
npm run deploy:github
```

---

## ✅ **SCHRITT 6: Deployment-Checkliste**

### **Vor dem Deployment:**
- [ ] Build läuft ohne Fehler
- [ ] Alle TypeScript-Fehler behoben
- [ ] WebSocket-Verbindungen zu Nostr-Relays funktionieren
- [ ] Responsive Design getestet
- [ ] Browser-Kompatibilität geprüft

### **Nach dem Deployment:**
- [ ] HTTPS funktioniert
- [ ] Nostr-Relay-Verbindungen funktionieren
- [ ] Bitcoin-Angebote können erstellt werden
- [ ] Reaktionssystem funktioniert
- [ ] Mobile Ansicht funktioniert

---

## 🎯 **EMPFOHLENER DEPLOYMENT-PFAD**

### **Für sofortigen Start:**
1. **Vercel verwenden** (einfachste Option)
2. **Automatische Deployments** einrichten
3. **Custom Domain** später hinzufügen

### **Deployment-Befehle:**
```bash
# 1. Vorbereitung
cd bitcoinSwap
npm install
npm run build

# 2. Vercel Deployment
vercel login
vercel --prod

# 3. URL teilen
# https://bitcoin-tausch-netzwerk-xyz.vercel.app
```

**Nach dem Deployment ist dein Bitcoin-Tausch-Netzwerk weltweit über HTTPS erreichbar! 🌍**