# 🔧 VERCEL PNPM-KONFIGURATION FIX

## ❌ **PROBLEM IDENTIFIZIERT**

**Fehler:** Vercel erkennt `pnpm-lock.yaml` aber verwendet `npm install`

**Ursache:** 
- Vercel-Dashboard ist auf `npm` konfiguriert
- Projekt verwendet aber `pnpm` (erkennbar an `pnpm-lock.yaml`)
- Konflikt zwischen Package Managern

---

## ✅ **LÖSUNG: VERCEL-EINSTELLUNGEN KORRIGIEREN**

### **1. Vercel Dashboard Einstellungen ändern:**

Gehe zu: https://vercel.com/walpurga03s-projects/bitcoin-tausch-netzwerk/settings/general

**Build & Development Settings:**

```
Build Command:
pnpm run build

Output Directory:
build

Install Command:
pnpm install

Node.js Version:
18.x (oder 20.x)
```

### **2. Environment Variables (korrekt):**

```
PUBLIC_APP_NAME=Bitcoin-Tausch-Netzwerk
PUBLIC_DEFAULT_RELAY=wss://nostr-relay.online
PUBLIC_BACKUP_RELAYS=wss://relay.damus.io,wss://nos.lol
```

**⚠️ WICHTIG:** Du hattest einen Typo: `PUBLIC_DEFAULT_RWLAY` → `PUBLIC_DEFAULT_RELAY`

---

## 🚀 **ALTERNATIVE: VERCEL.JSON MIT PNPM**

Falls die Dashboard-Einstellungen nicht funktionieren, erstelle eine neue `vercel.json`:

```json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": "build",
  "installCommand": "pnpm install",
  "framework": "sveltekit",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

---

## 📋 **DEPLOYMENT-CHECKLISTE (KORRIGIERT)**

### **Vercel Dashboard:**
- [ ] Build Command: `pnpm run build` (nicht npm!)
- [ ] Install Command: `pnpm install` (nicht npm!)
- [ ] Output Directory: `build`
- [ ] Environment Variables: Typo korrigiert

### **Lokale Vorbereitung:**
```bash
cd bitcoinSwap
pnpm install
pnpm run build
```

### **Git Push (nach Vercel-Einstellungen):**
```bash
git add .
git commit -m "🔧 Fix: Vercel PNPM configuration"
git push origin main
```

---

## 🎯 **WARUM PNPM STATT NPM?**

**Dein Projekt verwendet PNPM:**
- ✅ `pnpm-lock.yaml` vorhanden
- ✅ Bessere Performance
- ✅ Disk-Space-Optimierung
- ✅ Strikte Dependency-Resolution

**NPM würde Probleme verursachen:**
- ❌ Ignoriert `pnpm-lock.yaml`
- ❌ Erstellt `package-lock.json`
- ❌ Dependency-Konflikte möglich

---

## 🔄 **NÄCHSTE SCHRITTE**

1. **Vercel Dashboard öffnen:** https://vercel.com/walpurga03s-projects/bitcoin-tausch-netzwerk/settings/general
2. **Build Command ändern:** `npm run build` → `pnpm run build`
3. **Install Command ändern:** `npm install` → `pnpm install`
4. **Environment Variable korrigieren:** `PUBLIC_DEFAULT_RWLAY` → `PUBLIC_DEFAULT_RELAY`
5. **Redeploy auslösen**

**Das sollte das Deployment-Problem lösen! 🚀**