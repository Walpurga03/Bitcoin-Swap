# 🚀 Vercel Deployment - Schritt-für-Schritt Anleitung

## ✅ Aktueller Status
- [x] Vercel Login erfolgreich
- [x] Build erfolgreich getestet
- [x] Erste Frage beantwortet: "Set up and deploy" → **Y**

## 📋 Nächste Schritte

### 1. Scope/Account auswählen
**Frage:** `Which scope do you want to deploy to?`
**Antwort:** Wähle deinen Vercel Account (meist der erste in der Liste)

### 2. Projekt verknüpfen
**Frage:** `Link to existing project?`
**Antwort:** **N** (für neues Projekt)

### 3. Projekt-Name eingeben
**Frage:** `What's your project's name?`
**Empfehlung:** `nostr-group-chat` oder `bitcoin-swap-01`

### 4. Verzeichnis bestätigen
**Frage:** `In which directory is your code located?`
**Antwort:** `./` (Enter drücken für aktuelles Verzeichnis)

## 🔧 Nach dem ersten Deployment

### Environment Variables setzen
```bash
npx vercel env add PUBLIC_ALLOWED_PUBKEYS
```

**Wert eingeben:**
```
npub1s98sys9c58fy2xn62wp8cy5ke2rak3hjdd3z7ahc4jm5tck4fadqrfd9f5,npub1vj0rae3fxgx5k7uluvgg2fk2hzagaqpqqdxxtt9lrmuqgzwspv6qw5vdam,npub1z90zurzsh00cmg6qfuyc5ca4auyjsp8kqxyf4hykyynxjj42ps6svpfgt3
```

**Environment:** `Production`

### Production Deployment
```bash
npx vercel --prod
```

## 🌐 Erwartete URLs
- **Preview:** `https://[projekt-name]-[hash].vercel.app`
- **Production:** `https://[projekt-name].vercel.app`

## 🎯 Test-Link nach Deployment
```
https://[deine-url].vercel.app/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group123
```

---
**Status:** Warte auf weitere Vercel-Fragen...