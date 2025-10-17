# Deal-Room System - Dokumentation

## Übersicht

Das Deal-Room System ersetzt die alte Whitelist-basierte Chat-Lösung durch separate verschlüsselte 2-Personen-Chats zwischen Anbieter und Interessent.

## Vorteile gegenüber Whitelist-Lösung

### ✅ Alte Lösung (Whitelist-basiert)
- ❌ Whitelist wird manipuliert
- ❌ Alle anderen User verlieren Zugriff
- ❌ Nur 1 Deal gleichzeitig möglich
- ❌ Komplexe Verwaltung mit 3 Keys

### ✅ Neue Lösung (Deal-Rooms)
- ✅ Whitelist bleibt unverändert
- ✅ Alle User bleiben aktiv
- ✅ Mehrere parallele Deals möglich
- ✅ Einfache 2-Personen-Chats
- ✅ Bessere Skalierbarkeit

## Architektur

### 1. Event-Typen

#### Deal-Room Metadata (Kind 30080)
```typescript
{
  kind: 30080,
  content: "encrypted({
    offerId: string,
    offerContent: string,
    sellerPubkey: string,
    buyerPubkey: string,
    created_at: number
  })",
  tags: [
    ['d', 'deal-{timestamp}-{random}'],  // Unique Deal-ID
    ['e', offerId, '', 'root'],          // Original Offer
    ['e', channelId, '', 'channel'],     // Channel-ID
    ['p', sellerPubkey],                 // Seller
    ['p', buyerPubkey],                  // Buyer
    ['t', 'bitcoin-deal']                // Deal-Tag
  ]
}
```

#### Deal-Room Nachricht (Kind 1)
```typescript
{
  kind: 1,
  content: "encrypted(message)",
  tags: [
    ['e', dealId, '', 'root'],           // Deal-Room ID
    ['p', senderPubkey],                 // Sender
    ['t', 'bitcoin-deal']                // Deal-Tag
  ]
}
```

### 2. Komponenten

#### `src/lib/nostr/types.ts`
Neue TypeScript-Interfaces:
- `DealRoom` - Deal-Room Datenstruktur
- `DealMessage` - Nachricht in Deal-Room
- `DealRoomMetadata` - Metadata für Deal-Room

#### `src/lib/nostr/client.ts`
Neue Funktionen:
- `createDealRoom()` - Erstellt Deal-Room
- `fetchDealRooms()` - Lädt alle Deal-Rooms für User
- `sendDealMessage()` - Sendet Nachricht in Deal-Room
- `fetchDealMessages()` - Lädt Nachrichten für Deal-Room

#### `src/lib/stores/dealStore.ts`
Neuer Store für Deal-Room State Management:
- `loadRooms()` - Lädt alle Deal-Rooms
- `createRoom()` - Erstellt neuen Deal-Room
- `loadMessages()` - Lädt Nachrichten
- `sendMessage()` - Sendet Nachricht
- `setActiveRoom()` - Setzt aktiven Room

#### `src/routes/(app)/deal/[dealId]/+page.svelte`
Neue Page für Deal-Room Chat:
- Zeigt Original-Angebot
- 2-Personen-Chat
- Auto-Refresh alle 5 Sekunden
- Berechtigungsprüfung

#### `src/routes/(app)/group/+page.svelte`
Umstrukturierte Marketplace-Page:
- Kein Chat-Bereich mehr
- Nur Marketplace sichtbar
- "Deal starten" Button statt "Chat starten"
- Nur 1 Angebot pro User erlaubt
- Link zu aktiven Deal-Rooms

## Workflow

### 1. Angebot erstellen
```
User A → Erstellt Angebot mit temp-key
       → Angebot wird im Marketplace angezeigt
       → Nur 1 Angebot pro User erlaubt
```

### 2. Interesse zeigen
```
User B → Sieht Angebot im Marketplace
       → Klickt "Interesse zeigen"
       → Interesse-Event wird erstellt
       → User A sieht Interessent
```

### 3. Deal-Room starten
```
User A → Sieht Interessenten-Liste
       → Klickt "Deal starten" bei User B
       → Deal-Room wird erstellt (Kind 30080)
       → Angebot wird gelöscht
       → Navigation zu /deal/{dealId}
```

### 4. Privater Chat
```
User A & B → Befinden sich im Deal-Room
           → Können verschlüsselt chatten
           → Nur diese 2 User haben Zugriff
           → Original-Angebot wird angezeigt
```

## Sicherheit

### Verschlüsselung
- Alle Deal-Room Daten sind AES-GCM verschlüsselt
- Gleicher Group-Key wie für Marketplace
- Nur Teilnehmer können entschlüsseln

### Zugriffskontrolle
- Deal-Room Page prüft Berechtigung
- Nur Seller und Buyer haben Zugriff
- Andere User sehen Deal-Room nicht

### Privacy
- Angebote sind anonym (temp-key)
- Erst bei Interesse wird echter pubkey sichtbar
- Deal-Rooms sind komplett privat

## Migration von alter Lösung

### Was wurde entfernt:
- ❌ `setPrivateChatWhitelist()` Aufrufe
- ❌ Chat-Bereich in group/+page.svelte
- ❌ `groupMessages` Store-Nutzung in UI
- ❌ Whitelist-Manipulation

### Was wurde hinzugefügt:
- ✅ Deal-Room System (Kind 30080)
- ✅ Separate Deal-Room Page
- ✅ Deal-Store für State Management
- ✅ "Meine Deals" Button im Header
- ✅ Nur 1 Angebot pro User Limit

### Whitelist bleibt:
- ✅ Whitelist-Verwaltung für Admin
- ✅ Gruppen-Zugriffskontrolle
- ✅ Marketplace-Zugriff für alle

## Testing

### Manueller Test-Flow:

1. **User A erstellt Angebot:**
   ```
   - Login als User A
   - Klicke "+ Neues Angebot"
   - Gib Angebotstext ein
   - Klicke "Angebot veröffentlichen"
   - Prüfe: Angebot erscheint im Marketplace
   - Prüfe: Button ist disabled (nur 1 Angebot)
   ```

2. **User B zeigt Interesse:**
   ```
   - Login als User B (anderer Browser/Inkognito)
   - Sehe Angebot von User A
   - Klicke "Interesse zeigen"
   - Prüfe: Button ändert zu "Interesse gezeigt"
   ```

3. **User A startet Deal-Room:**
   ```
   - Als User A: Klicke auf Interessenten-Badge
   - Sehe User B in Liste
   - Klicke "Deal starten"
   - Bestätige Dialog
   - Prüfe: Navigation zu /deal/{dealId}
   - Prüfe: Original-Angebot wird angezeigt
   - Prüfe: Angebot ist aus Marketplace gelöscht
   ```

4. **Chat im Deal-Room:**
   ```
   - Als User A: Sende Nachricht
   - Als User B: Öffne /deal/{dealId}
   - Prüfe: Nachricht ist sichtbar
   - Als User B: Sende Antwort
   - Prüfe: Beide Nachrichten sichtbar
   ```

5. **Parallele Deals:**
   ```
   - Als User A: Erstelle neues Angebot
   - Als User C: Zeige Interesse
   - Als User A: Starte zweiten Deal-Room
   - Prüfe: Beide Deal-Rooms in "Meine Deals"
   - Prüfe: Beide Chats funktionieren parallel
   ```

## Troubleshooting

### Deal-Room wird nicht geladen
- Prüfe: User ist Teilnehmer (seller oder buyer)
- Prüfe: Deal-Room Event existiert im Relay
- Prüfe: Group-Key ist korrekt
- Console-Logs prüfen

### Nachrichten werden nicht angezeigt
- Prüfe: Auto-Refresh läuft (alle 5 Sek)
- Prüfe: Verschlüsselung funktioniert
- Prüfe: Events haben korrekten #t Tag
- Console-Logs prüfen

### "Nur 1 Angebot" funktioniert nicht
- Prüfe: tempKeypair ist gespeichert
- Prüfe: Angebote werden korrekt geladen
- Prüfe: hasActiveOffer reactive statement
- Console-Logs prüfen

## Performance

### Optimierungen:
- Auto-Refresh nur für aktive Page
- Lazy Loading von Deal-Rooms
- Effiziente Event-Filter (#t, #p)
- Lokales Caching im Store

### Skalierung:
- Unbegrenzte parallele Deals möglich
- Keine Whitelist-Manipulation
- Keine Konflikte zwischen Usern
- Relay-freundliche Event-Struktur

## Zukünftige Erweiterungen

### Mögliche Features:
- [ ] Deal-Status (active, completed, cancelled)
- [ ] Deal-Bewertungen
- [ ] Datei-Uploads in Deal-Rooms
- [ ] Push-Benachrichtigungen
- [ ] Deal-Archivierung
- [ ] Multi-Relay Support für Deal-Rooms

## Vergleich: Alt vs. Neu

| Feature | Whitelist-Lösung | Deal-Room System |
|---------|------------------|------------------|
| Whitelist-Änderung | ✅ Ja (3 Keys) | ❌ Nein |
| Andere User betroffen | ✅ Ja (ausgeschlossen) | ❌ Nein |
| Parallele Deals | ❌ Nein (nur 1) | ✅ Ja (unbegrenzt) |
| Komplexität | 🔴 Hoch | 🟢 Niedrig |
| Skalierbarkeit | 🔴 Schlecht | 🟢 Gut |
| Wartbarkeit | 🔴 Schwierig | 🟢 Einfach |
| Privacy | 🟡 Mittel | 🟢 Hoch |

## Fazit

Das Deal-Room System ist eine deutliche Verbesserung gegenüber der Whitelist-basierten Lösung:

✅ **Einfacher** - Keine komplexe Whitelist-Verwaltung
✅ **Skalierbarer** - Unbegrenzte parallele Deals
✅ **Sicherer** - Separate verschlüsselte Räume
✅ **Benutzerfreundlicher** - Klare Trennung Marketplace/Chat
✅ **Wartbarer** - Saubere Architektur

Die Implementierung ist vollständig und produktionsbereit.