# 🔐 Deal-Rooms mit NIP-17 Verschlüsselung

## Übersicht

Das Bitcoin-Tausch-Netzwerk verwendet **NIP-17** (Private Direct Messages) für vollständig anonyme und Ende-zu-Ende verschlüsselte Deal-Räume zwischen Handelspartnern.

## 🎯 Funktionsweise

### 1. **Angebot erstellen**
- Nutzer erstellt Bitcoin-Tauschangebot im Marketplace
- Angebot wird anonym mit temporärem Keypair veröffentlicht
- Secret wird generiert und gespeichert (nur Angebotsgeber kennt es)
- **📢 Whitelist-Broadcast:** ALLE Whitelist-Mitglieder bekommen verschlüsselte NIP-17 Nachricht "Neues Angebot verfügbar"
  - Relay sieht: X verschlüsselte Nachrichten (weiß nicht wer der Anbieter ist)

### 2. **Interesse zeigen**
- Andere Nutzer können Interesse am Angebot zeigen
- Interessenten werden anonym in einer Liste gespeichert
- Nur der Angebotsgeber sieht die Liste der Interessenten

### 3. **Deal-Room erstellen & Whitelist-Broadcast**
- Angebotsgeber wählt einen Interessenten aus
- System erstellt automatisch:
  - **Deal-Status** (Kind 30081) für Marketplace-Anzeige
  - **Deal-Room** (lokaler Store) für Chat-Verwaltung
- **📢 Whitelist-Broadcast:** ALLE Whitelist-Mitglieder bekommen verschlüsselte NIP-17 Nachricht:
  - **Ausgewählter Partner (1 Person):** "🎉 Du wurdest ausgewählt!" + Chat-Einladung mit Room-Link
  - **Alle anderen (X-1 Personen):** "📢 Angebot vergeben - Versuch es nächstes Mal wieder!"
  - **Relay sieht:** X verschlüsselte Nachrichten (alle sehen identisch aus)
  - **Relay kann NICHT unterscheiden:** Wer die Einladung vs. wer die Absage bekommen hat
  - **Perfekt für Privatsphäre:** Niemand (auch nicht der Relay) weiß wer Interesse hatte oder ausgewählt wurde
- Angebot wird aus Marketplace entfernt
- Angebotsgeber wird zum Chat-Raum weitergeleitet

### 4. **Benachrichtigungen empfangen**
- Alle Whitelist-Mitglieder sehen verschlüsselte Benachrichtigungen in der App
- Bei neuem Angebot: "📢 Neues Angebot verfügbar: ..."
- Bei Deal-Vergabe:
  - Nicht-ausgewählte sehen: "📢 Angebot vergeben - Versuch es nächstes Mal wieder!"
  - Ausgewählter sieht: "🎉 Du wurdest ausgewählt!" + Chat-Einladung
- Ausgewählter kann Einladung annehmen oder ablehnen
- Bei Annahme: Automatische Weiterleitung zum Chat-Raum

### 5. **Privater Chat**
- Beide Partner können im verschlüsselten Chat kommunizieren
- Nur die beiden Parteien können Nachrichten lesen
- Relays sehen nur verschlüsselte Gift Wraps mit zufälligen Pubkeys

## 🔒 NIP-17 Sicherheitsarchitektur

### 3-Schichten Verschlüsselung

```
Nachricht → Kind 14 (Chat Message)
         ↓ NIP-44 Verschlüsselung mit Partner-Pubkey
         → Kind 13 (Seal)
         ↓ NIP-44 Verschlüsselung mit Random-Pubkey
         → Kind 1059 (Gift Wrap)
         ↓ Publiziert auf Relays
```

### Anonymitätsgarantien

1. **Relay-Perspektive:**
   - Sieht nur Gift Wrap (Kind 1059) mit zufälligen Sender-Pubkey
   - Weiß NICHT wer die Nachricht gesendet hat
   - Sieht nur Empfänger-Pubkey (im p-Tag)
   - **Kann NICHT unterscheiden:** Welche Nachricht eine Einladung, eine Absage oder eine "Neues Angebot" Benachrichtigung ist
   - **Wichtig:** Bei Whitelist-Broadcast bekommen ALLE Mitglieder Nachrichten
     - Phase 1 (Angebot erstellt): Alle bekommen "Neues Angebot"
     - Phase 2 (Deal vergeben): Alle bekommen Nachricht (1x Einladung, Rest Absagen)
   - **Relay kann NIEMALS erkennen:**
     - Wer hat das Angebot erstellt? ❌
     - Wer hat Interesse gezeigt? ❌
     - Wer wurde ausgewählt? ❌

2. **Netzwerk-Perspektive:**
   - Timestamps werden randomisiert (±2 Tage)
   - Keine Korrelation zwischen verschiedenen Nachrichten möglich
   - Keine Metadaten über Beziehungen zwischen Nutzern
   - Whitelist-Broadcast erzeugt "Rauschen" - echte Deals verschwinden in der Masse

3. **Empfänger-Perspektive:**
   - Kann Gift Wrap mit eigenem Private Key öffnen (1. Ebene)
   - Erhält Seal mit tatsächlichem Sender-Pubkey
   - Kann Seal mit Sender-Pubkey öffnen (2. Ebene)
   - Erhält ursprüngliche Chat-Nachricht oder Benachrichtigung (je nachdem)

## 📂 Technische Komponenten

### Files & Stores

```
src/lib/nostr/crypto.ts          # NIP-17 Verschlüsselungsfunktionen
src/lib/stores/dealRoomStore.ts  # Deal-Room State Management
src/lib/components/DealRoom.svelte              # Chat-Interface
src/lib/components/DealInvitations.svelte       # Einladungs-Verwaltung
src/routes/(app)/deal/[roomId]/+page.svelte    # Deal-Room Route
```

### Wichtige Funktionen

**Verschlüsselung (crypto.ts):**
- `createNIP17Message()` - Erstellt 3-Schichten verschlüsselte Nachricht
- `decryptNIP17Message()` - Entschlüsselt empfangene Gift Wraps
- `randomPastTimestamp()` - Generiert randomisierte Timestamps

**Store (dealRoomStore.ts):**
- `createRoom()` - Erstellt neuen Deal-Room
- `sendInvitation()` - Sendet NIP-17 Einladung an ausgewählten Partner
- `sendBroadcast()` - Sendet NIP-17 "Angebot beendet" Benachrichtigung
- `addMessage()` - Fügt Nachricht zu Room hinzu
- `setActiveRoom()` - Wechselt aktiven Chat-Raum

**UI (DealRoom.svelte):**
- Echtzeit-Chat mit Auto-Scroll
- Nachrichtenverschlüsselung vor dem Senden
- Automatische Entschlüsselung eingehender Nachrichten
- Typing-Indikator (optional)


## 🔐 Sicherheitshinweise

### ✅ Was geschützt ist:
- **Nachrichteninhalt:** Niemand außer Sender und Empfänger kann lesen (NIP-44 Verschlüsselung)
- **Sender-Identität:** Relay sieht nur zufälligen Pubkey, nicht den echten Sender
- **Timing-Analyse:** Randomisierte Timestamps (±2 Tage) verhindern Korrelation
- **Wer ausgewählt wurde:** Whitelist-Broadcast verschleiert die echte Einladung unter vielen Benachrichtigungen
- **Nachrichtentyp:** Relay kann nicht unterscheiden zwischen Einladung, Absage oder Chat-Nachricht

### ⚠️ Was SICHTBAR ist (aber mit Whitelist-Broadcast geschützt):
- **Empfänger-Pubkey:** Relay sieht für wen jede Nachricht ist (p-Tag)
  - ✅ **ABER:** Bei Whitelist-Broadcast bekommen ALLE eine Nachricht
  - ✅ Relay kann nicht erkennen wer die echte Einladung bekommen hat
  - ✅ Alle Nachrichten sehen gleich aus (verschlüsselt)
- **Nachrichtenanzahl:** Relay kann zählen, wie viele Nachrichten ein User empfängt
  - ✅ **ABER:** Durch Broadcast-Strategie ist das normale Gruppen-Kommunikation
- **Netzwerk-IP:** Relay sieht IP-Adresse des Senders
  - 🛡️ **Lösung:** Nutze VPN/Tor für vollständige Anonymität

### 🎯 Whitelist-Broadcast Strategie:

**Problem ohne Broadcast:**
```
Nur ausgewählter Partner bekommt Nachricht
→ Relay weiß: "Dieser User wurde ausgewählt"
→ Anonymität des Interesse-Signals kaputt
→ Relay kann korrelieren: "Dieser User hatte Interesse gezeigt"
```

**Lösung mit 2-Phasen Whitelist-Broadcast:**

**Phase 1: Angebot-Erstellung**
```
ALLE 50 Whitelist-Mitglieder bekommen:
"📢 Neues Angebot: Tausche 0.1 BTC..."

→ Relay sieht: 50 verschlüsselte Gift Wraps
→ Relay weiß NICHT wer der Anbieter ist ✅
→ Alle bekommen die Info (normale Gruppen-Kommunikation)
```

**Phase 2: Deal-Vergabe**
```
ALLE 50 Whitelist-Mitglieder bekommen Nachricht:
- 49 Mitglieder: "Angebot vergeben - Versuch es nächstes Mal!" (verschlüsselt)
- 1 Mitglied: "Du wurdest ausgewählt!" + Chat-Einladung (verschlüsselt)

→ Relay sieht: 50 verschlüsselte Gift Wraps (alle identisch aussehend)
→ Relay kann NICHT unterscheiden welche die Einladung ist
→ Relay weiß NICHT wer Interesse hatte ✅
→ Relay weiß NICHT wer ausgewählt wurde ✅
→ Perfekte Anonymität! ✅✅✅
```

**Wichtig:** 
- Alle Whitelist-Mitglieder bekommen bei jedem Angebot 2 Nachrichten
- Relay kann keine Muster erkennen (alle verschlüsselt, alle sehen gleich aus)
- Interesse-Signal bleibt vollständig anonym
- Ausgewählter Partner bleibt anonym

### 🛡️ Best Practices:
1. **Verwende mehrere Relays** für bessere Redundanz
2. **Wechsle Relays regelmäßig** um Tracking zu erschweren
3. **Nutze VPN/Tor** für vollständige Netzwerk-Anonymität
4. **Teile niemals deinen Private Key** mit anderen
5. **Backup deinen Private Key sicher** (verschlüsselt!)
6. **Mehr Interessenten = bessere Tarnung** - Je mehr Interessenten, desto schwieriger zu erkennen wer ausgewählt wurde

## 📊 Event-Kinds Referenz

| Kind | Name | Beschreibung |
|------|------|--------------|
| 14 | Chat Message | Originale Nachricht (vor Verschlüsselung) |
| 13 | Seal | Erste Verschlüsselungsebene (mit Partner-Pubkey) |
| 1059 | Gift Wrap | Zweite Verschlüsselungsebene (mit Random-Pubkey) |
| 30081 | Deal Status | Marketplace Deal-Status (für UI-Anzeige) |

## 📚 Weiterführende Links

- [NIP-17 Spezifikation](https://github.com/nostr-protocol/nips/blob/master/17.md)
- [NIP-44 Verschlüsselung](https://github.com/nostr-protocol/nips/blob/master/44.md)
- [Nostr-Tools Library](https://github.com/nbd-wtf/nostr-tools)
- [ANONYMITAET-ERKLAERT.md](./ANONYMITAET-ERKLAERT.md) - Detaillierte Erklärung der Verschlüsselung
