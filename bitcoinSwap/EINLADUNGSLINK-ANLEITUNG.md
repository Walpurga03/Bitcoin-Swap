# 🔗 Einladungslink-Erstellung für Bitcoin Tausch Netzwerk

## 📋 Übersicht

Ein Einladungslink enthält zwei wichtige Parameter:
- **relay**: Die Nostr-Relay-URL für die Kommunikation
- **secret**: Das gemeinsame Geheimnis für die Gruppenverschlüsselung

## 🛠️ Einladungslink-Format

```
https://ihre-domain.com/?relay=wss://relay.damus.io&secret=mein-geheimes-passwort-123
```

### Parameter-Erklärung:

1. **relay** (erforderlich):
   - Nostr-Relay-Server für die Kommunikation
   - Muss mit `wss://` oder `ws://` beginnen
   - Beispiele: `wss://relay.damus.io`, `wss://nos.lol`, `wss://relay.nostr.band`

2. **secret** (erforderlich):
   - Gemeinsames Passwort für die Gruppe
   - Mindestens 8 Zeichen
   - Wird für Verschlüsselung und Channel-ID-Ableitung verwendet
   - **WICHTIG**: Alle Gruppenmitglieder müssen dasselbe Secret haben!

## 🎯 Schritt-für-Schritt Anleitung

### 1. Relay auswählen
Wählen Sie einen zuverlässigen Nostr-Relay:
- `wss://relay.damus.io` (empfohlen)
- `wss://nos.lol`
- `wss://relay.nostr.band`
- `wss://nostr.wine`

### 2. Secret festlegen
Erstellen Sie ein sicheres Gruppen-Secret:
- Mindestens 8 Zeichen
- Kombination aus Buchstaben, Zahlen, Sonderzeichen
- Beispiel: `BitcoinGruppe2024!`

### 3. Link zusammenstellen
```
https://ihre-domain.com/?relay=wss://relay.damus.io&secret=BitcoinGruppe2024!
```

### 4. Link an Whitelist-Benutzer senden
- Senden Sie den Link nur an Personen, die in der Whitelist stehen
- Der Link sollte sicher übertragen werden (verschlüsselte Nachricht, persönlich, etc.)

## ⚠️ Sicherheitshinweise

1. **Secret geheim halten**: Das Secret ist wie ein Passwort - teilen Sie es nur mit vertrauenswürdigen Personen
2. **Whitelist aktuell halten**: Nur Personen in der Whitelist können der Gruppe beitreten
3. **Relay-Verfügbarkeit**: Stellen Sie sicher, dass der gewählte Relay verfügbar ist
4. **Link-Übertragung**: Senden Sie Einladungslinks über sichere Kanäle

## 🧪 Test-Einladungslink

Für Tests können Sie diesen Link verwenden:
```
http://localhost:5173/?relay=wss://relay.damus.io&secret=test-bitcoin-gruppe-2024
```

## 🔧 Technische Details

- **Channel-ID**: Wird automatisch aus dem Secret abgeleitet (SHA-256)
- **Verschlüsselung**: AES-256-GCM mit PBKDF2-Schlüsselableitung
- **Authentifizierung**: nsec → npub → Whitelist-Vergleich

## 📞 Support

Bei Problemen:
1. Prüfen Sie die Browser-Konsole auf Fehlermeldungen
2. Verwenden Sie `/test` für System-Debugging
3. Stellen Sie sicher, dass Relay und Secret korrekt sind