# 🐛 SECRET BUG ANALYSE

## Problem
**User-Beobachtung:** `premium-group123` und `premium-group12` führen zur **gleichen Gruppe**.

## Debug-Tools erstellt

### 1. ✅ Channel-ID im Gruppenchat anzeigen
- **Datei:** `src/routes/(app)/group/+page.svelte`
- **Änderung:** Channel-ID wird jetzt im Header angezeigt
- **Format:** `🆔 abc123def456...`

### 2. ✅ Erweiterte Debug-Logs im Login
- **Datei:** `src/routes/+page.svelte`
- **Verbesserung:** Vollständige Secret-Anzeige und Input-Längen
- **Logs:**
  ```
  🔧 Channel-ID Ableitung:
    🔐 Secret (vollständig): "premium-group123"
    📝 Input für Hash: "premium-group123bitcoin-group-channel"
    📏 Secret Länge: 17
    📏 Input Länge: 38
    📋 Abgeleitete Channel-ID: abc123...
  ```

### 3. ✅ Interaktive Debug-Seite
- **URL:** `http://localhost:5173/debug-secret`
- **Features:**
  - Automatische Tests für verschiedene Secrets
  - Custom Secret Eingabe
  - Duplikate-Erkennung
  - URL-Parsing-Test
  - Vollständige Channel-ID Anzeige

### 4. ✅ Debug-Dokumentation
- **Datei:** `SECRET-DEBUG-TEST.md`
- **Inhalt:** Browser Console Tests und Analyse-Schritte

## Test-Anweisungen

### Schritt 1: Debug-Seite öffnen
```bash
# Server starten (falls nicht läuft)
cd bitcoinSwap
npm run dev

# Debug-Seite öffnen
http://localhost:5173/debug-secret
```

### Schritt 2: Manuelle Tests
1. **Test mit `premium-group123`:**
   - URL: `http://localhost:5173/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group123`
   - Login durchführen
   - Channel-ID im Gruppenchat notieren

2. **Test mit `premium-group12`:**
   - URL: `http://localhost:5173/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group12`
   - Login durchführen
   - Channel-ID im Gruppenchat notieren

3. **Vergleich:**
   - Sind die Channel-IDs identisch? → BUG bestätigt
   - Sind sie unterschiedlich? → Kein Bug, anderes Problem

### Schritt 3: Browser Console prüfen
```javascript
// In Browser Console ausführen:
async function testChannelGeneration(secret) {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret + 'bitcoin-group-channel');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const channelId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  console.log(`Secret: "${secret}"`);
  console.log(`Channel-ID: ${channelId}`);
  return channelId;
}

// Tests:
const id1 = await testChannelGeneration('premium-group123');
const id2 = await testChannelGeneration('premium-group12');
console.log('Identisch?', id1 === id2);
```

## Mögliche Ursachen

### 1. **URL-Parsing Problem**
- Secret wird falsch aus URL extrahiert
- Encoding/Decoding Fehler

### 2. **String-Manipulation**
- Secret wird irgendwo gekürzt
- Whitespace oder Sonderzeichen

### 3. **Browser Cache**
- LocalStorage behält alte Channel-ID
- SessionStorage Problem

### 4. **Nostr Client Cache**
- Event-Cache verwendet alte Channel-ID
- Subscription-Problem

## Erwartetes Verhalten

**SHA-256 ist deterministisch:**
- `"premium-group123bitcoin-group-channel"` → eindeutiger Hash A
- `"premium-group12bitcoin-group-channel"` → eindeutiger Hash B
- Hash A ≠ Hash B (garantiert)

**Falls gleiche Channel-ID:**
- Input-String ist identisch (Bug in String-Verarbeitung)
- Cache-Problem (alte Werte werden wiederverwendet)

## Nächste Schritte

1. **Debug-Seite testen:** `http://localhost:5173/debug-secret`
2. **Console-Logs prüfen:** Browser DevTools öffnen
3. **Manuelle Tests:** Beide Secrets einzeln testen
4. **Cache leeren:** Browser-Cache und LocalStorage löschen
5. **Ergebnisse melden:** Channel-IDs und Console-Logs teilen

## Debugging aktiviert ✅

Alle Debug-Tools sind jetzt aktiv. Das System wird detaillierte Logs ausgeben, die das Problem identifizieren werden.