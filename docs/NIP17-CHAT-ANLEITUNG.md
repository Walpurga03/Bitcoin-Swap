# NIP-17 Private Chat - Anleitung

## 📋 Übersicht

Das Bitcoin-Tausch-Netzwerk verwendet **NIP-17 (Gift-Wrapped Direct Messages)** für private, Ende-zu-Ende verschlüsselte Chats zwischen Nutzern. Dies bietet deutlich bessere Privatsphäre als das ältere NIP-04 Protokoll.

## 🔐 Was ist NIP-17?

NIP-17 ist ein Nostr-Standard für private Nachrichten mit folgenden Vorteilen:

### Vorteile gegenüber NIP-04:
- **Metadaten-Schutz**: Sender und Empfänger sind nicht öffentlich sichtbar
- **Gift-Wrapping**: Dreifache Verschlüsselung (Rumor → Seal → Gift Wrap)
- **Zeitstempel-Randomisierung**: Erschwert Timing-Analysen
- **Zufällige Pubkeys**: Keine Verknüpfung zur echten Identität

### Technische Details:
1. **Rumor (Kind 14)**: Unsignierte Nachricht mit Inhalt
2. **Seal (Kind 13)**: Verschlüsselter Rumor mit zufälligem Pubkey
3. **Gift Wrap (Kind 1059)**: Äußere Verschlüsselung, nur Empfänger-Tag sichtbar

## 🚀 Verwendung

### Chat starten

1. **Über Marketplace-Angebot:**
   - Erstelle ein Angebot oder zeige Interesse an einem bestehenden Angebot
   - Als Anbieter siehst du die Interessenten mit "💬 Chat starten" Button
   - Klicke auf den Button um den privaten Chat zu öffnen

2. **Auto-Delete Feature:**
   - Wenn du als Anbieter einen Chat startest, wird dein Angebot automatisch gelöscht
   - Dies verhindert weitere Interessenten und fokussiert auf die aktuelle Verhandlung
   - Du wirst vor dem Löschen um Bestätigung gebeten

### Nachrichten senden

1. Öffne den Chat mit einem Nutzer
2. Schreibe deine Nachricht im Eingabefeld
3. Klicke "Senden" oder drücke Enter
4. Die Nachricht wird automatisch verschlüsselt und als Gift-Wrapped Message gesendet

### Nachrichten empfangen

- Nachrichten werden automatisch alle 5 Sekunden aktualisiert
- Eingehende Nachrichten werden automatisch entschlüsselt
- Du siehst nur Nachrichten zwischen dir und dem Chat-Partner

## 🔧 Technische Implementierung

### Dateien

- **`src/lib/nostr/nip17.ts`**: NIP-17 Implementierung
  - `sendNIP17Message()`: Sendet verschlüsselte Nachricht
  - `fetchNIP17Conversation()`: Lädt Konversation
  - `unwrapGiftWrap()`: Entschlüsselt empfangene Nachricht

- **`src/routes/(app)/dm/[pubkey]/+page.svelte`**: Chat-UI
  - Verwendet NIP-17 für alle Nachrichten
  - Auto-Refresh alle 5 Sekunden
  - Optimistische UI-Updates

- **`src/routes/(app)/group/+page.svelte`**: Marketplace
  - "💬 Chat starten" Button bei Interessenten
  - Auto-Delete beim Chat-Start

### Verschlüsselungs-Flow

```
Sender → Rumor (Kind 14) → Seal (Kind 13) → Gift Wrap (Kind 1059) → Relay
                ↓                ↓                    ↓
           Unsigniert      Verschlüsselt      Doppelt verschlüsselt
                                                      ↓
Relay → Gift Wrap (Kind 1059) → Seal (Kind 13) → Rumor (Kind 14) → Empfänger
              ↓                       ↓                  ↓
        Entschlüsseln          Entschlüsseln        Klartext
```

### Event-Typen

| Kind | Name | Beschreibung |
|------|------|--------------|
| 14 | Rumor | Unsignierte Nachricht (nicht im Relay) |
| 13 | Seal | Verschlüsselter Rumor mit Random-Pubkey |
| 1059 | Gift Wrap | Äußere Verschlüsselung, nur p-Tag sichtbar |

## 🔍 Debugging

### Console-Logs

Das System gibt detaillierte Logs aus:

```
📨 [NIP-17] Sende Private Message...
  👤 Empfänger: abc123...
  📝 Rumor erstellt
  🔒 Seal erstellt
  🎁 Gift Wrap erstellt
  ✅ Nachricht gesendet: 2/2 Relays

💬 [NIP-17] Lade Konversation...
  👤 User: xyz789...
  👤 Other: abc123...
  📦 Gift Wraps gefunden: 5
  ✅ Messages entpackt: 5
  ✅ Konversation geladen: 5 Messages
```

### Häufige Probleme

**Problem**: Nachrichten werden nicht angezeigt
- **Lösung**: Prüfe ob der Relay erreichbar ist
- **Lösung**: Warte 5 Sekunden auf Auto-Refresh
- **Lösung**: Prüfe Browser-Console auf Fehler

**Problem**: "Fehler beim Entpacken"
- **Lösung**: Stelle sicher dass du der richtige Empfänger bist
- **Lösung**: Prüfe ob dein Private Key korrekt ist

**Problem**: Chat-Button funktioniert nicht
- **Lösung**: Stelle sicher dass du ein Angebot erstellt hast (tempKeypair vorhanden)
- **Lösung**: Prüfe ob du der Anbieter bist (nur Anbieter sehen Chat-Button)

## 🔒 Sicherheit

### Best Practices

1. **Private Keys schützen**: Niemals teilen oder in unsicheren Umgebungen speichern
2. **Relay-Auswahl**: Verwende vertrauenswürdige Relays
3. **Metadaten**: Auch mit NIP-17 können Timing-Muster analysiert werden
4. **Backup**: Sichere deinen Private Key für Zugriff auf alte Nachrichten

### Limitierungen

- **Relay-Abhängigkeit**: Nachrichten werden auf Relays gespeichert
- **Keine Forward Secrecy**: Kompromittierter Key = alle Nachrichten lesbar
- **Timing-Analysen**: Trotz Randomisierung möglich bei großen Datenmengen

## 📚 Weitere Ressourcen

- [NIP-17 Spezifikation](https://github.com/nostr-protocol/nips/blob/master/17.md)
- [NIP-44 Verschlüsselung](https://github.com/nostr-protocol/nips/blob/master/44.md)
- [Nostr Protocol](https://nostr.com)

## 🆘 Support

Bei Problemen oder Fragen:
1. Prüfe die Browser-Console auf Fehler
2. Lies diese Dokumentation
3. Kontaktiere den Admin über die Whitelist-Verwaltung