# 🔍 SECRET DEBUG TEST

## Problem
User berichtet: `premium-group123` und `premium-group12` führen zur **gleichen Gruppe**.

## Test-Setup

### Test 1: Channel-ID Generierung testen
```javascript
// In Browser Console ausführen:

async function testChannelGeneration(secret) {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret + 'bitcoin-group-channel');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const channelId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  console.log(`Secret: "${secret}"`);
  console.log(`Input: "${secret + 'bitcoin-group-channel'}"`);
  console.log(`Channel-ID: ${channelId}`);
  console.log('---');
  return channelId;
}

// Tests ausführen:
await testChannelGeneration('premium-group123');
await testChannelGeneration('premium-group12');
await testChannelGeneration('premium-group1');
```

### Test 2: URL Parameter prüfen
```javascript
// Test verschiedene URLs:
const urls = [
  'http://localhost:5173/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group123',
  'http://localhost:5173/?relay=wss%3A%2F%2Fnostr-relay.online&secret=premium-group12'
];

urls.forEach(url => {
  const parsed = new URL(url);
  const relay = parsed.searchParams.get('relay');
  const secret = parsed.searchParams.get('secret');
  console.log(`URL: ${url}`);
  console.log(`Relay: ${relay}`);
  console.log(`Secret: "${secret}"`);
  console.log('---');
});
```

## Erwartetes Verhalten
- `premium-group123` sollte eine **andere** Channel-ID generieren als `premium-group12`
- SHA-256 Hash sollte **deterministisch** aber **unterschiedlich** sein

## Mögliche Ursachen
1. **URL Parsing Problem**: Secret wird falsch aus URL extrahiert
2. **String Manipulation**: Secret wird irgendwo gekürzt/modifiziert
3. **Cache Problem**: Alte Channel-ID wird wiederverwendet
4. **Browser Cache**: LocalStorage/SessionStorage behält alte Werte

## Debug-Schritte
1. ✅ Channel-ID im UI anzeigen (bereits implementiert)
2. 🔄 Console-Logs in deriveChannelIdFromSecret() prüfen
3. 🔄 URL Parameter direkt testen
4. 🔄 Browser Cache leeren und neu testen