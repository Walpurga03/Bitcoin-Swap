# 🚀 BitcoinSwap0.1 - Vercel Deployment Anleitung

## ✅ Vorbereitung (Bereits erledigt)

- [x] Dependencies installiert
- [x] Build erfolgreich getestet
- [x] Production-Whitelist konfiguriert
- [x] Vercel CLI installiert
- [x] @sveltejs/adapter-vercel konfiguriert

## 🔧 Deployment-Schritte

### 1. Vercel Login
```bash
cd bitcoinSwap0.1
npx vercel login
```

### 2. Erstes Deployment
```bash
npx vercel
```

**Antworten Sie auf die Fragen:**
- `Set up and deploy "~/bitcoinSwap0.1"?` → **Y**
- `Which scope do you want to deploy to?` → **Ihr Vercel Account**
- `Link to existing project?` → **N** (für neues Projekt)
- `What's your project's name?` → **bitcoin-swap-01** (oder gewünschter Name)
- `In which directory is your code located?` → **./** (Enter drücken)

### 3. Environment Variables setzen
Nach dem ersten Deployment:

```bash
npx vercel env add PUBLIC_ALLOWED_PUBKEYS
```

**Wert eingeben:**
```
npub1s98sys9c58fy2xn62wp8cy5ke2rak3hjdd3z7ahc4jm5tck4fadqrfd9f5,npub1vj0rae3fxgx5k7uluvgg2fk2hzagaqpqqdxxtt9lrmuqgzwspv6qw5vdam,npub1z90zurzsh00cmg6qfuyc5ca4auyjsp8kqxyf4hykyynxjj42ps6svpfgt3
```

**Environment auswählen:** `Production`

### 4. Production Deployment
```bash
npx vercel --prod
```

## 🌐 Nach dem Deployment

### Ihre App ist verfügbar unter:
- **Preview URL:** `https://bitcoin-swap-01-[hash].vercel.app`
- **Production URL:** `https://bitcoin-swap-01.vercel.app`

### Test-Einladungslink:
```
https://bitcoin-swap-01.vercel.app/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group123
```

## 🔧 Vercel Dashboard Konfiguration

1. Gehen Sie zu: https://vercel.com/dashboard
2. Wählen Sie Ihr Projekt: **bitcoin-swap-01**
3. Gehen Sie zu **Settings** → **Environment Variables**
4. Bestätigen Sie, dass `PUBLIC_ALLOWED_PUBKEYS` korrekt gesetzt ist

## 🚀 Zukünftige Updates

Für Updates einfach:
```bash
git add .
git commit -m "Update"
npx vercel --prod
```

## 📋 Wichtige URLs

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Projekt Settings:** https://vercel.com/[username]/bitcoin-swap-01/settings
- **Deployment Logs:** https://vercel.com/[username]/bitcoin-swap-01/deployments

## 🔐 Sicherheit

- ✅ Whitelist ist aktiv (nur zugelassene Public Keys)
- ✅ Environment Variables sind sicher gespeichert
- ✅ HTTPS ist automatisch aktiviert
- ✅ Nostr-Verschlüsselung ist aktiv

## 🎯 Features der BitcoinSwap0.1

- **Verschlüsselter Gruppenchat** mit Nostr
- **Einladungslink-System** mit Secrets
- **Direct Messages** zwischen Nutzern
- **Debug-Tools** für Entwicklung
- **Mobile-optimiert** und responsive

---

**Status:** ✅ Deployment-bereit
**Version:** BitcoinSwap0.1
**Framework:** SvelteKit + Vercel
**Protokoll:** Nostr (wss://nostr-relay.online)