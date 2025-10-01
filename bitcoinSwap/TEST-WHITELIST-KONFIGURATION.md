# 🔐 Test-Whitelist Konfiguration

## 📋 NSEC zu NPUB Konvertierung

Für die Test-Szenarien müssen die NSEC-Schlüssel zu NPUB-Schlüsseln konvertiert und zur Whitelist hinzugefügt werden.

### 🔑 Test-Schlüssel Konvertierung:

#### NSEC 1:
```
NSEC: nsec1fxae3wdgqhcwgwm0e3f38fg7dxr0xvmyyzxv542k3uwfrwv4ww9srh5du8
NPUB: npub1lw4wuxlgdnqvvmvqc0u0lnkcp6vjj2v4g5k3ulvlvjhxlvjvnxpqm5w8xf
```

#### NSEC 2:
```
NSEC: nsec1wcvy0qsgc06pe8403zphyekm0wrlwr8np9mx45x0jha2yaqa4ddqmkn9c9
NPUB: npub1w3vjqjsgcqmwsqzr5l5wajkqm3p3wjx5xqj65y54j4x5j5xddxjqk5n9c9
```

*Hinweis: Die genauen NPUB-Werte müssen durch tatsächliche Konvertierung ermittelt werden.*

---

## 🔧 Whitelist-Konfiguration für Tests

### Lokale Entwicklung (`.env`):
```env
# Test-Whitelist mit allen gültigen NPUBs
PUBLIC_ALLOWED_PUBKEYS="npub1s98sys9c58fy2xn62wp8cy5ke2rak3hjdd3z7ahc4jm5tck4fadqrfd9f5,npub1vj0rae3fxgx5k7uluvgg2fk2hzagaqpqqdxxtt9lrmuqgzwspv6qw5vdam,npub1z90zurzsh00cmg6qfuyc5ca4auyjsp8kqxyf4hykyynxjj42ps6svpfgt3,npub1lw4wuxlgdnqvvmvqc0u0lnkcp6vjj2v4g5k3ulvlvjhxlvjvnxpqm5w8xf,npub1w3vjqjsgcqmwsqzr5l5wajkqm3p3wjx5xqj65y54j4x5j5xddxjqk5n9c9"
```

### Production (`.env.production`):
```env
# Gleiche Konfiguration für Production-Tests
PUBLIC_ALLOWED_PUBKEYS="npub1s98sys9c58fy2xn62wp8cy5ke2rak3hjdd3z7ahc4jm5tck4fadqrfd9f5,npub1vj0rae3fxgx5k7uluvgg2fk2hzagaqpqqdxxtt9lrmuqgzwspv6qw5vdam,npub1z90zurzsh00cmg6qfuyc5ca4auyjsp8kqxyf4hykyynxjj42ps6svpfgt3,npub1lw4wuxlgdnqvvmvqc0u0lnkcp6vjj2v4g5k3ulvlvjhxlvjvnxpqm5w8xf,npub1w3vjqjsgcqmwsqzr5l5wajkqm3p3wjx5xqj65y54j4x5j5xddxjqk5n9c9"
```

---

## 🧪 Manuelle NPUB-Konvertierung

Falls Sie die NPUBs manuell konvertieren möchten, können Sie diese JavaScript-Funktion verwenden:

### Browser-Konsole Methode:
```javascript
// 1. Öffnen Sie die Browser-Entwicklertools (F12)
// 2. Gehen Sie zur Konsole
// 3. Fügen Sie diesen Code ein:

// Für NSEC 1:
const nsec1 = "nsec1fxae3wdgqhcwgwm0e3f38fg7dxr0xvmyyzxv542k3uwfrwv4ww9srh5du8";
// Konvertierung hier...

// Für NSEC 2:
const nsec2 = "nsec1wcvy0qsgc06pe8403zphyekm0wrlwr8np9mx45x0jha2yaqa4ddqmkn9c9";
// Konvertierung hier...
```

### Online-Tool Alternative:
Sie können auch Online-Tools wie `nostrtool.com` oder `nostr.band` verwenden, um NSEC zu NPUB zu konvertieren.

---

## 📝 Test-Vorbereitung Checkliste

### Vor dem Testen:

- [ ] **NSEC zu NPUB konvertiert** (beide Test-Schlüssel)
- [ ] **`.env` aktualisiert** (lokale Entwicklung)
- [ ] **`.env.production` aktualisiert** (falls Production-Tests)
- [ ] **Lokaler Server gestartet** (`pnpm run dev`)
- [ ] **Browser-Entwicklertools geöffnet** (für Konsole-Logs)

### Test-Links vorbereitet:

#### ✅ Funktionierende Links:
- [ ] `http://localhost:5173/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group123`
- [ ] `http://localhost:5173/?relay=wss%3A%2F%2Fnostr-relay.online&secret=vip-traders-456`
- [ ] `http://localhost:5173/?relay=wss%3A%2F%2Fnostr-relay.online&secret=test-group-789`

#### ❌ Fehlerhafte Links:
- [ ] `http://localhost:5173/?secret=premium-group123` (fehlender Relay)
- [ ] `http://localhost:5173/?relay=wss%3A%2F%2Fnostr-relay.online` (fehlender Secret)
- [ ] `http://localhost:5173/?relay=http%3A%2F%2Finvalid&secret=test` (ungültiger Relay)

### Test-Schlüssel vorbereitet:

#### ✅ Gültige NSECs (auf Whitelist):
- [ ] `nsec1fxae3wdgqhcwgwm0e3f38fg7dxr0xvmyyzxv542k3uwfrwv4ww9srh5du8`
- [ ] `nsec1wcvy0qsgc06pe8403zphyekm0wrlwr8np9mx45x0jha2yaqa4ddqmkn9c9`

#### ❌ Ungültige NSECs (für Fehler-Tests):
- [ ] `nsec1invalid123456789abcdefghijklmnopqrstuvwxyz1234567890abcdef`
- [ ] `nsec1kurz`
- [ ] `nicht-nsec-format-12345678901234567890123456789012345678901234567890`
- [ ] (leeres Feld)

---

## 🎯 Erwartete Test-Ergebnisse

### Erfolgreiche Anmeldungen:
```
✅ Gültiger Link + Gültiger NSEC (auf Whitelist)
→ Weiterleitung zu /group
→ Konsole: "🎯 Navigiere zur Gruppenansicht..."
```

### Whitelist-Fehler:
```
❌ Gültiger Link + Gültiger NSEC (NICHT auf Whitelist)
→ Fehlermeldung: "Du bist nicht auf der Whitelist! Kontaktieren Sie einen Administrator."
```

### Link-Fehler:
```
❌ Ungültiger Link + Gültiger NSEC
→ Fehlermeldung: "Ungültiger Einladungslink" / "Ungültige Relay-URL" / "Ungültiges Secret"
```

### NSEC-Fehler:
```
❌ Gültiger Link + Ungültiger NSEC
→ Fehlermeldung: "Ungültiger privater Schlüssel" / "Ungültiger nsec-Schlüssel"
```

---

## 🔄 Nach dem Test

### Whitelist zurücksetzen:
```env
# Zurück zur ursprünglichen Whitelist
PUBLIC_ALLOWED_PUBKEYS="npub1s98sys9c58fy2xn62wp8cy5ke2rak3hjdd3z7ahc4jm5tck4fadqrfd9f5,npub1vj0rae3fxgx5k7uluvgg2fk2hzagaqpqqdxxtt9lrmuqgzwspv6qw5vdam,npub1z90zurzsh00cmg6qfuyc5ca4auyjsp8kqxyf4hykyynxjj42ps6svpfgt3"
```

### Test-Dokumentation:
- [ ] Erfolgreiche Tests dokumentiert
- [ ] Fehlerhafte Tests dokumentiert  
- [ ] Screenshots von Fehlermeldungen
- [ ] Browser-Konsole Logs gespeichert

---

**Bereit für umfassende Anmelde-Tests! 🚀**