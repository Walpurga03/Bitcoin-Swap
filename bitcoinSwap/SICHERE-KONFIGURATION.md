# 🔒 Sichere Konfiguration für Bitcoin Tausch Netzwerk

## 📋 Übersicht

Das System verwendet eine sichere Konfigurationsdatei (`src/config.json`), die **NICHT** in Git gespeichert wird, um Ihre Gruppen-Secrets zu schützen.

## 🛠️ Setup-Anleitung

### 1. Konfigurationsdatei erstellen

Kopieren Sie die Beispiel-Konfiguration:
```bash
cp src/config.example.json src/config.json
```

### 2. Secrets anpassen

Bearbeiten Sie `src/config.json` mit Ihren eigenen sicheren Secrets:

```json
{
  "groupSecrets": {
    "bitcoin-traders": "IhrSuperSicheresSecret123!",
    "premium-group": "AnotherSecureSecret456#",
    "vip-traders": "VipSecret789$"
  },
  "defaultRelay": "wss://nostr-relay.online",
  "allowedRelays": [
    "wss://nostr-relay.online",
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.nostr.band",
    "wss://nostr.wine"
  ],
  "adminSettings": {
    "maxGroupSize": 50,
    "messageRetentionDays": 30
  }
}
```

## 🔐 Secret-Sicherheit

### **Sichere Secret-Erstellung:**
- **Mindestens 16 Zeichen**
- **Kombination aus Groß-/Kleinbuchstaben, Zahlen, Sonderzeichen**
- **Einzigartig für jede Gruppe**
- **Nicht vorhersagbar oder ableitbar**

### **Beispiele für sichere Secrets:**
```
BitcoinTraders2024!SecureGroup
PremiumBTC#2024$VerySecret
VipTrading789!@#SecureAccess
```

## 🚫 Was NICHT getan werden sollte

❌ **Secrets in Git committen**
❌ **Einfache Passwörter verwenden** (z.B. "password123")
❌ **Secrets in öffentlichen Channels teilen**
❌ **Dieselben Secrets für mehrere Gruppen verwenden**

## ✅ Sicherheits-Checkliste

- [ ] `src/config.json` erstellt und angepasst
- [ ] Sichere, einzigartige Secrets für jede Gruppe
- [ ] `src/config.json` ist in `.gitignore` (bereits erledigt)
- [ ] Ihr eigener Relay `wss://nostr-relay.online` als Standard gesetzt
- [ ] Whitelist mit erlaubten npub-Adressen aktualisiert
- [ ] Backup der Konfiguration an sicherem Ort gespeichert

## 🔄 Workflow für neue Gruppen

### 1. **Admin-Seite verwenden** (`/admin`)
- Wählen Sie eine vorkonfigurierte Gruppe
- Wählen Sie Ihren Relay (`wss://nostr-relay.online`)
- Generieren Sie den Einladungslink

### 2. **Link sicher verteilen**
- Senden Sie Links nur über verschlüsselte Kanäle
- Nur an Personen, die in der Whitelist stehen
- Dokumentieren Sie, wer Zugang erhalten hat

### 3. **Benutzer-Onboarding**
- Benutzer öffnet Einladungslink
- Gibt nsec oder hex-Private-Key ein
- System prüft automatisch Whitelist
- Bei Erfolg: Zugang zur verschlüsselten Gruppe

## 🏗️ Architektur-Übersicht

```
Einladungslink
    ↓
Login-Seite (Whitelist-Prüfung)
    ↓
Gruppen-Chat (verschlüsselt)
    ↓
Ihr Relay: wss://nostr-relay.online
```

## 🔧 Technische Details

### **Channel-ID-Ableitung:**
```typescript
// Deterministisch aus Secret abgeleitet
const channelId = SHA256(secret + 'bitcoin-group-channel')
```

### **Verschlüsselung:**
- **AES-256-GCM** für Nachrichten
- **PBKDF2** für Schlüsselableitung
- **Ende-zu-Ende verschlüsselt**

### **Authentifizierung:**
```typescript
// nsec → npub → Whitelist-Vergleich
const npub = nip19.npubEncode(getPublicKey(privateKey))
if (whitelist.includes(npub)) { /* Zugang gewährt */ }
```

## 📁 Datei-Struktur

```
bitcoinSwap/
├── src/
│   ├── config.json          # ← Ihre sichere Konfiguration (nicht in Git)
│   ├── config.example.json  # ← Vorlage (in Git)
│   ├── whitelist.json       # ← Erlaubte npub-Adressen (nicht in Git)
│   └── ...
├── .gitignore               # ← Schützt config.json und whitelist.json
└── ...
```

## 🚨 Notfall-Verfahren

### **Bei kompromittiertem Secret:**
1. Neues Secret in `config.json` generieren
2. Neue Einladungslinks erstellen
3. Alte Links für ungültig erklären
4. Alle Benutzer über neue Links informieren

### **Bei Relay-Problemen:**
1. Backup-Relay in `allowedRelays` auswählen
2. Neue Links mit anderem Relay generieren
3. Benutzer über Relay-Wechsel informieren

## 📞 Support & Debugging

### **Debug-Tools:**
- `/test` - System-Funktionstest
- `/admin` - Einladungslink-Generierung
- Browser-Konsole - Detaillierte Logs

### **Häufige Probleme:**
1. **"config.json nicht gefunden"** → Datei aus example kopieren
2. **"Ungültiges Secret"** → Mindestens 8 Zeichen verwenden
3. **"Nicht auf Whitelist"** → npub in whitelist.json hinzufügen
4. **"Relay nicht erreichbar"** → Anderen Relay aus Liste wählen

## 🎯 Produktions-Deployment

### **Vor dem Deployment:**
1. Sichere `config.json` mit Production-Secrets erstellen
2. Whitelist mit echten npub-Adressen füllen
3. Relay-Verfügbarkeit testen
4. Backup-Strategie für Konfigurationsdateien einrichten

### **Nach dem Deployment:**
1. Admin-Panel testen (`/admin`)
2. Test-Einladungslink erstellen und testen
3. Monitoring für Relay-Verbindungen einrichten
4. Dokumentation für Endbenutzer bereitstellen