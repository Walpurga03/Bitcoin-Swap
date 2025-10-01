# 🧪 Umfassender Anmelde-Test für Bitcoin-Tausch-Netzwerk

## 📋 Test-Übersicht

Dieser Test prüft verschiedene Anmelde-Szenarien mit korrekten und fehlerhaften Links sowie gültigen und ungültigen NSEC-Schlüsseln.

---

## 🔑 Test-Schlüssel (NSEC)

### ✅ Gültige NSEC-Schlüssel (für Whitelist):
```
1. nsec1fxae3wdgqhcwgwm0e3f38fg7dxr0xvmyyzxv542k3uwfrwv4ww9srh5du8
2. nsec1wcvy0qsgc06pe8403zphyekm0wrlwr8np9mx45x0jha2yaqa4ddqmkn9c9
```

### ❌ Ungültige NSEC-Schlüssel (für Fehler-Tests):
```
3. nsec1invalid123456789abcdefghijklmnopqrstuvwxyz1234567890abcdef
4. nsec1kurz
5. nicht-nsec-format-12345678901234567890123456789012345678901234567890
6. (leer)
```

---

## 🔗 Test-Links

### ✅ Korrekte Einladungslinks:

#### Test 1: Premium Gruppe (Lokal)
```
http://localhost:5173/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group123
```

#### Test 2: VIP Gruppe (Lokal)
```
http://localhost:5173/?relay=wss%3A%2F%2Fnostr-relay.online&secret=vip-traders-456
```

#### Test 3: Test Gruppe (Lokal)
```
http://localhost:5173/?relay=wss%3A%2F%2Fnostr-relay.online&secret=test-group-789
```

#### Test 4: Premium Gruppe (Production)
```
https://bitcoin-tausch-netzwerk.vercel.app/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group123
```

#### Test 5: Backup Relay
```
http://localhost:5173/?relay=wss%3A%2F%2Frelay.damus.io&secret=premium-group123
```

### ❌ Fehlerhafte Einladungslinks:

#### Test 6: Fehlender Relay
```
http://localhost:5173/?secret=premium-group123
```

#### Test 7: Fehlender Secret
```
http://localhost:5173/?relay=wss%3A%2F%2Fnostr-relay.online
```

#### Test 8: Ungültiger Relay (HTTP statt WSS)
```
http://localhost:5173/?relay=http%3A%2F%2Finvalid-relay.com&secret=premium-group123
```

#### Test 9: Ungültiger Relay (Malformed URL)
```
http://localhost:5173/?relay=not-a-url&secret=premium-group123
```

#### Test 10: Leerer Secret
```
http://localhost:5173/?relay=wss%3A%2F%2Fnostr-relay.online&secret=
```

#### Test 11: Keine Parameter
```
http://localhost:5173/
```

---

## 🧪 Test-Matrix

| Test # | Link Status | NSEC Status | Erwartetes Ergebnis |
|--------|-------------|-------------|---------------------|
| 1.1 | ✅ Korrekt (Test 1) | ✅ Gültig (NSEC 1) | ✅ **Erfolgreicher Login** |
| 1.2 | ✅ Korrekt (Test 1) | ✅ Gültig (NSEC 2) | ✅ **Erfolgreicher Login** |
| 1.3 | ✅ Korrekt (Test 2) | ✅ Gültig (NSEC 1) | ✅ **Erfolgreicher Login** |
| 2.1 | ✅ Korrekt (Test 1) | ❌ Ungültig (NSEC 3) | ❌ "Ungültiger nsec-Schlüssel" |
| 2.2 | ✅ Korrekt (Test 1) | ❌ Ungültig (NSEC 4) | ❌ "Ungültiger nsec-Schlüssel" |
| 2.3 | ✅ Korrekt (Test 1) | ❌ Ungültig (NSEC 5) | ❌ "Ungültiger privater Schlüssel" |
| 2.4 | ✅ Korrekt (Test 1) | ❌ Leer (NSEC 6) | ❌ "Bitte füllen Sie alle Felder aus" |
| 3.1 | ❌ Fehlerhaft (Test 6) | ✅ Gültig (NSEC 1) | ❌ "Ungültiger Einladungslink" |
| 3.2 | ❌ Fehlerhaft (Test 7) | ✅ Gültig (NSEC 1) | ❌ "Ungültiger Einladungslink" |
| 3.3 | ❌ Fehlerhaft (Test 8) | ✅ Gültig (NSEC 1) | ❌ "Ungültige Relay-URL" |
| 3.4 | ❌ Fehlerhaft (Test 9) | ✅ Gültig (NSEC 1) | ❌ "Ungültige Relay-URL" |
| 3.5 | ❌ Fehlerhaft (Test 10) | ✅ Gültig (NSEC 1) | ❌ "Ungültiges Secret" |
| 3.6 | ❌ Fehlerhaft (Test 11) | ✅ Gültig (NSEC 1) | ❌ "Bitte füllen Sie alle Felder aus" |

---

## 🔧 Test-Durchführung

### Schritt 1: Whitelist aktualisieren

**Bearbeiten Sie `.env` (lokal) oder `.env.production` (Production):**

```env
# Fügen Sie die entsprechenden NPUBs hinzu (konvertiert von den NSEC-Schlüsseln)
PUBLIC_ALLOWED_PUBKEYS="npub1...,npub2...,npub3..."
```

### Schritt 2: Systematisches Testen

Für jeden Test in der Matrix:

1. **Link öffnen** (aus der Test-Links Sektion)
2. **NSEC eingeben** (aus der Test-Schlüssel Sektion)
3. **"Gruppe beitreten" klicken**
4. **Ergebnis dokumentieren**

### Schritt 3: Erwartete Fehler-Nachrichten

#### Link-Fehler:
- `"Ungültiger Einladungslink"`
- `"Ungültige Relay-URL: ..."`
- `"Ungültiges Secret: ..."`

#### NSEC-Fehler:
- `"Ungültiger privater Schlüssel: ..."`
- `"Ungültiger nsec-Schlüssel"`

#### Whitelist-Fehler:
- `"Du bist nicht auf der Whitelist! Kontaktieren Sie einen Administrator."`

#### Allgemeine Fehler:
- `"Bitte füllen Sie alle Felder aus"`
- `"Ein unerwarteter Fehler ist aufgetreten"`

---

## 📊 Test-Protokoll Vorlage

```
=== ANMELDE-TEST PROTOKOLL ===
Datum: ___________
Tester: ___________
Umgebung: [ ] Lokal [ ] Production

Test 1.1 - Korrekt + Gültig NSEC 1:
Link: http://localhost:5173/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group123
NSEC: nsec1fxae3wdgqhcwgwm0e3f38fg7dxr0xvmyyzxv542k3uwfrwv4ww9srh5du8
Ergebnis: [ ] Erfolg [ ] Fehler
Fehlermeldung: ___________

Test 1.2 - Korrekt + Gültig NSEC 2:
Link: http://localhost:5173/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group123
NSEC: nsec1wcvy0qsgc06pe8403zphyekm0wrlwr8np9mx45x0jha2yaqa4ddqmkn9c9
Ergebnis: [ ] Erfolg [ ] Fehler
Fehlermeldung: ___________

[... weitere Tests ...]
```

---

## 🎯 Zusätzliche Test-Szenarien

### Browser-Kompatibilität:
- [ ] Chrome
- [ ] Firefox  
- [ ] Safari
- [ ] Edge

### Netzwerk-Tests:
- [ ] Normale Internetverbindung
- [ ] Langsame Verbindung
- [ ] Unterbrochene Verbindung während Login

### Edge Cases:
- [ ] Sehr langer Secret (>100 Zeichen)
- [ ] Secret mit Sonderzeichen
- [ ] NSEC mit führenden/nachgestellten Leerzeichen
- [ ] Copy-Paste von NSEC mit Zeilenumbrüchen

---

## 🔍 Debug-Informationen

### Browser-Konsole prüfen:
```javascript
// Diese Logs sollten erscheinen:
"🚀 Starte Login-Prozess..."
"📋 Parse Einladungslink..."
"✅ Gruppenkonfiguration erstellt:"
"🔐 Validiere Private Key..."
"📋 Prüfe Whitelist für: npub1..."
"🌐 Teste Relay-Verbindung..."
"✅ Relay-Verbindung erfolgreich"
"💾 Aktualisiere Stores..."
"🎯 Navigiere zur Gruppenansicht..."
```

### Fehler-Logs:
```javascript
"❌ Login-Fehler: [Fehlermeldung]"
```

---

## ✅ Erfolgs-Kriterien

Ein Test gilt als **erfolgreich**, wenn:

1. **Positive Tests:** Führen zur Gruppenansicht (`/group`)
2. **Negative Tests:** Zeigen korrekte Fehlermeldung
3. **Keine unerwarteten Fehler** in der Browser-Konsole
4. **Konsistente Ergebnisse** bei Wiederholung

---

## 🚀 Nach dem Test

### Bei erfolgreichen Tests:
- Dokumentieren Sie funktionierende Link-Formate
- Notieren Sie sich die Channel-IDs für verschiedene Secrets

### Bei Fehlern:
- Browser-Konsole Screenshots
- Fehlermeldungen dokumentieren
- Netzwerk-Tab prüfen (WebSocket-Verbindungen)

---

**Viel Erfolg beim Testen! 🎯**