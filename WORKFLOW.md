# 🔄 User Workflows & Prozesse

> **Bitcoin-Tausch-Netzwerk - Vollständige User Journey**

[![Workflow](https://img.shields.io/badge/Workflow-Complete-success?style=flat)]()
[![Privacy](https://img.shields.io/badge/Privacy-Anonymous-purple?style=flat)]()

**Stand:** 18. November 2025  
**Status:** ✅ Vollständig implementiert & produktionsbereit

---

## 📋 Inhaltsverzeichnis

- [Überblick](#-überblick)
- [1. Admin erstellt Gruppe](#1️⃣-admin-erstellt-gruppe)
- [2. Whitelist konfigurieren](#2️⃣-whitelist-konfigurieren)
- [3. User beitreten](#3️⃣-user-treten-bei)
- [4. Angebot erstellen](#4️⃣-angebot-erstellen)
- [5. Interesse zeigen](#5️⃣-interesse-zeigen)
- [6. Interessent auswählen](#6️⃣-interessent-auswählen)
- [7. Deal-Benachrichtigung](#7️⃣-deal-benachrichtigung)
- [8. P2P Chat](#8️⃣-p2p-webrtc-chat)
- [9. Chat beenden](#9️⃣-chat-beenden)
- [Privacy-Features](#-privacy-features)
- [Design-Features](#-design-features)

---

## 🎯 Überblick

Der Workflow zeigt die **komplette User Journey** vom Admin-Setup bis zum erfolgreichen Bitcoin-Tausch:

```
Admin Setup → Whitelist → User Join → Offer → Interest → Select → Deal → P2P Chat
```

**Kernprinzipien:**
- 🎭 **Vollständige Anonymität** auf dem Relay
- 🔐 **Ende-zu-Ende Verschlüsselung** für sensible Daten
- 🌐 **P2P WebRTC** für private Kommunikation
- 🛡️ **Whitelist-Schutz** gegen unerwünschte Teilnehmer

---

## 1️⃣ Admin erstellt Gruppe

### Prozess

```
┌─────────────┐
│    Admin    │
└──────┬──────┘
       │
       │ 1. Erstellt Gruppen-Secret
       │    (z.B. "MySecureGroup123")
       ▼
┌─────────────────────┐
│  Hash wird berechnet│
│  SHA-256(Secret)    │
└──────┬──────────────┘
       │
       │ 2. Publiziert auf Relay
       ▼
┌─────────────────────┐
│   Nostr Event       │
│   Kind: 40 (Group)  │
│   - Secret-Hash     │
│   - Relay-URL       │
│   - Admin-Pubkey    │
└─────────────────────┘
```

### Was wird gespeichert?

| Daten | Speicherort | Sichtbarkeit |
|-------|------------|--------------|
| Secret-Hash | Relay (Public) | 🌐 Alle |
| Relay-URL | Relay (Public) | 🌐 Alle |
| Admin-Pubkey | Relay (Public) | 🌐 Alle |
| **Secret selbst** | ❌ Nirgends! | 🔒 Nur Admin kennt es |

### Admin-Aufgaben

- ✅ Sicheres Gruppen-Secret wählen
- ✅ Relay konfigurieren (z.B. wss://relay.damus.io)
- ✅ Admin-Rolle wird automatisch gesetzt

---

## 2️⃣ Whitelist konfigurieren

### Prozess

```
┌─────────────┐
│    Admin    │
└──────┬──────┘
       │
       │ Fügt Pubkeys hinzu
       │ (npub1abc..., npub1def...)
       ▼
┌─────────────────────┐
│  Whitelist Event    │
│  Kind: 30000        │
│  - Array von Pubkeys│
└──────┬──────────────┘
       │
       │ Publiziert auf Relay
       ▼
┌─────────────────────┐
│   Relay speichert   │
│   Whitelist (public)│
└─────────────────────┘
```

### Whitelist-Features

- ✅ **Öffentlich sichtbar** - Jeder sieht wer Mitglied ist
- ✅ **Client-seitige Filterung** - Nur Mitglieder-Angebote werden angezeigt
- ✅ **Admin-only Verwaltung** - Nur Admin kann Whitelist ändern
- ✅ **Dynamisch** - Neue Mitglieder können jederzeit hinzugefügt werden

### Einladung versenden

Admin teilt **Einladungs-Link**:
```
https://app-url.com/?secret=MySecureGroup123
```

Oder als **QR-Code** für mobiles Scannen.

---

## 3️⃣ User treten bei

### Prozess

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ 1. Scannt QR-Code oder klickt Link
       │    Secret wird extrahiert
       ▼
┌─────────────────────┐
│  App berechnet Hash │
│  SHA-256(Secret)    │
└──────┬──────────────┘
       │
       │ 2. Lädt Whitelist vom Relay
       ▼
┌─────────────────────┐
│  Whitelist-Check    │
│  User-Pubkey in     │
│  Whitelist? ✓/✗     │
└──────┬──────────────┘
       │
       ├─✅─ Auf Whitelist
       │     → Zugang gewährt
       │
       └─❌─ NICHT auf Whitelist
             → Zugang verweigert
```

### Was sieht der User?

**Bei Erfolg:**
- ✅ Zugang zum Marketplace
- ✅ Angebote von Whitelist-Mitgliedern
- ✅ "Neues Angebot" Button

**Bei Ablehnung:**
- ❌ "Du bist nicht auf der Whitelist"
- 💡 "Kontaktiere den Admin für Zugang"

---

## 4️⃣ Angebot erstellen

### Prozess

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ 1. Klickt "Neues Angebot"
       │    Gibt Angebots-Text ein
       ▼
┌─────────────────────┐
│  Secret generieren  │
│  offerSecret =      │
│  random(32 bytes)   │
└──────┬──────────────┘
       │
       │ 2. Temp-Keypair ableiten
       ▼
┌─────────────────────┐
│ deriveKeypair(      │
│   offerSecret)      │
│ → tempPrivkey       │
│ → tempPubkey        │
└──────┬──────────────┘
       │
       │ 3. Signiert Angebot
       ▼
┌─────────────────────┐
│  Nostr Event        │
│  Kind: 42 (Offer)   │
│  Pubkey: tempPubkey │ ← NICHT echter Pubkey!
│  Content: "..."     │
│  Tags: [g, expires] │
└──────┬──────────────┘
       │
       │ 4. Publiziert auf Relay
       ▼
┌─────────────────────┐
│   Marketplace       │
│   Zeigt Angebot     │
│   (anonym!)         │
└─────────────────────┘
```

### Anonymitäts-Mechanismus

| Was | Echt | Auf Relay |
|-----|------|-----------|
| Pubkey | User-Pubkey | ❌ Temp-Pubkey |
| Content | Angebots-Text | ✅ Sichtbar |
| Secret | offerSecret | ❌ Nur lokal (sessionStorage) |

**Resultat:** Relay sieht **NICHT** wer das Angebot erstellt hat! 🎭

---

## 5️⃣ Interesse zeigen

### Prozess

```
┌─────────────┐
│ Interessent │
└──────┬──────┘
       │
       │ 1. Sieht Angebot im Marketplace
       │    Klickt "Interesse zeigen"
       ▼
┌─────────────────────┐
│  Temp Secret gen.   │
│  interestSecret =   │
│  random(32 bytes)   │
└──────┬──────────────┘
       │
       │ 2. Temp-Keypair ableiten
       ▼
┌─────────────────────┐
│ deriveKeypair(      │
│   interestSecret)   │
│ → interestPrivkey   │
│ → interestPubkey    │
└──────┬──────────────┘
       │
       │ 3. Erstellt Interest Signal
       ▼
┌─────────────────────┐
│  NIP-04 Message     │
│  From: interestPub  │ ← Temp!
│  To: offerPub       │ ← Temp!
│  Content: encrypted │
│  { realPubkey,      │
│    name, ...}       │
└──────┬──────────────┘
       │
       │ 4. Publiziert verschlüsselt
       ▼
┌─────────────────────┐
│   Relay speichert   │
│   Nur Temp→Temp     │
│   (encrypted blob)  │
└─────────────────────┘
```

### Was sieht der Relay?

```
Event {
  kind: 4,
  pubkey: "temp_interest_abc123",  ← NICHT echter Pubkey!
  content: "EncryptedBlob...",     ← Verschlüsselt!
  tags: [
    ["p", "temp_offer_xyz789"]     ← NICHT echter Pubkey!
  ]
}
```

**Relay weiß NICHT:**
- ❌ Wer Interesse zeigt
- ❌ Für welches echte Angebot
- ❌ Welcher echte User dahintersteckt

---

## 6️⃣ Interessent auswählen

### Prozess

```
┌─────────────────┐
│ Angebotsgeber   │
└──────┬──────────┘
       │
       │ 1. Öffnet "Interessenten-Liste"
       │    Sieht Badge "💌 3 Interessenten"
       ▼
┌─────────────────────┐
│  App lädt Interest  │
│  Signals vom Relay  │
└──────┬──────────────┘
       │
       │ 2. Entschlüsselt mit offerSecret
       ▼
┌─────────────────────┐
│  Zeigt echte Namen  │
│  & Pubkeys:         │
│  - Alice (npub1...) │
│  - Bob (npub1...)   │
│  - Carol (npub1...) │
└──────┬──────────────┘
       │
       │ 3. Wählt einen aus (z.B. Alice)
       ▼
┌─────────────────────┐
│  Generiert Room-ID  │
│  roomId = hash(     │
│    offerSecret +    │
│    aliceInterestSec)│
└──────┬──────────────┘
       │
       │ 4. Sendet NIP-04 an Alice's Temp-Key
       ▼
┌─────────────────────┐
│  Deal Notification  │
│  { type: "accepted",│
│    roomId,          │
│    offerContent }   │
└─────────────────────┘
```

### Was passiert mit den anderen?

**Alice (Gewinner):**
- ✅ Bekommt verschlüsselte NIP-04 Nachricht
- ✅ Modal: "🎉 Dein Interesse wurde akzeptiert!"
- ✅ Button: "Zum Chat"

**Bob & Carol (Abgelehnte):**
- 🗑️ Sehen gelöschtes Angebot im Marketplace
- 🤐 **Kein Alert** - Privacy by Design!
- 💭 Denken: "Angebot wurde zurückgezogen"

---

## 7️⃣ Deal-Benachrichtigung

### NIP-04 Nachricht (Verschlüsselt)

```
┌─────────────────────────────────────┐
│  Von: offerTempPubkey               │
│  An: interestTempPubkey (Alice)     │
│  Verschlüsselt: ✅                   │
│                                     │
│  Inhalt (nach Entschlüsselung):     │
│  {                                  │
│    "type": "deal-accepted",         │
│    "roomId": "abc123xyz...",        │
│    "offerId": "...",                │
│    "offerContent": "Verkaufe 0.1..." │
│  }                                  │
└─────────────────────────────────────┘
```

### Modal-Popup (Beide Parteien)

**Für Alice (Interessent):**
```
┌─────────────────────────────────────┐
│  🎉 Dein Interesse wurde akzeptiert!│
│                                     │
│  Angebot: "Verkaufe 0.1 BTC..."     │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Room-ID: abc123xyz...         │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Zum Chat] [Später]                │
└─────────────────────────────────────┘
```

**Für Angebotsgeber:**
```
┌─────────────────────────────────────┐
│  ✅ Deal-Room erstellt!             │
│                                     │
│  Interessent: Alice (npub1...)      │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Room-ID: abc123xyz...         │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Zum Chat] [Später]                │
└─────────────────────────────────────┘
```

---

## 8️⃣ P2P WebRTC Chat

### Verbindungsaufbau

```
Alice                          Bob (Angebotsgeber)
  │                               │
  │  1. Navigiert zu /deal/roomId │
  ├───────────────────────────────┤
  │                               │
  │  2. Trystero initialisiert    │
  │     WebRTC Signaling          │
  ├─────────┬─────────────────────┤
  │         │  BitTorrent         │
  │         │  Tracker            │
  │         │  (Discovery)        │
  │         └─────────────────────┤
  │                               │
  │  3. P2P Verbindung etabliert  │
  │◄─────────────────────────────►│
  │         WebRTC Direct         │
  │                               │
  │  4. Identity Exchange         │
  │  "Hallo, ich bin Alice"       │
  ├──────────────────────────────►│
  │                               │
  │  "Hi Alice, ich bin Bob"      │
  │◄──────────────────────────────┤
  │                               │
  │  5. Chat-Nachrichten (P2P)    │
  │◄─────────────────────────────►│
  │   Keine Relay-Beteiligung!    │
  │                               │
```

### Chat-Features

**UI:**
- 🌙 Dunkles Theme (Pink/Violett Gradients)
- 💬 Message Bubbles mit Namen
- ⏰ Timestamps
- 🔄 Echtzeit-Updates

**Privacy:**
- ✅ **Peer-to-Peer** - Kein Server sieht Nachrichten
- ✅ **WebRTC Encryption** - Browser-native Verschlüsselung
- ✅ **Keine Metadaten** - Relay weiß nichts vom Chat
- ✅ **Identity-Schutz** - Namen nur via P2P ausgetauscht

**Technisch:**
- Library: Trystero
- Strategy: torrent (BitTorrent Tracker)
- Appid: "Bitcoin-Tausch-P2P"
- Transport: WebRTC DataChannel

---

## 9️⃣ Chat beenden

### Prozess

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ Klickt "Chat beenden"
       ▼
┌─────────────────────┐
│  P2P Disconnect     │
│  room.leave()       │
└──────┬──────────────┘
       │
       │ Navigation
       ▼
┌─────────────────────┐
│  Zurück zum         │
│  Marketplace        │
│  (/group)           │
└──────┬──────────────┘
       │
       │ Kann neues Angebot erstellen
       ▼
┌─────────────────────┐
│  Workflow beginnt   │
│  von vorne          │
└─────────────────────┘
```

### Was wird aufgeräumt?

- ✅ P2P Verbindung geschlossen
- ✅ Room State geleert
- ✅ Zurück zum Marketplace
- ⚠️ **Kein Chat-Verlauf** - Privacy by Design!

---

## 🔐 Privacy-Features

### Übersicht

| Feature | Implementierung | Schutz |
|---------|----------------|--------|
| **Temp-Keypairs** | SHA-256 aus Random Secret | 🎭 Angebote anonym |
| **NIP-04 Encryption** | AES-CBC mit ECDH | 🔐 Interesse-Signale verschlüsselt |
| **P2P WebRTC** | Trystero/BitTorrent | 🌐 Chat ohne Relay |
| **Metadata-Schutz** | Keine echten Pubkeys auf Relay | 🛡️ Wer-mit-wem unbekannt |
| **Auto-Listener** | Prüft alle 10s auf Benachrichtigungen | 🔔 Real-time ohne Polling |
| **Identity Exchange** | Nur via P2P, nie über Relay | 👤 Namen bleiben privat |

### Was sieht der Relay?

```
❌ NICHT sichtbar:
- Echte User-Identitäten bei Angeboten
- Echte User-Identitäten bei Interest Signals
- Welcher echte User mit wem dealt
- Chat-Nachrichten
- Ausgetauschte Namen

✅ Sichtbar (unvermeidbar):
- Whitelist (Liste von Pubkeys)
- Temp-Pubkeys (anonym)
- Verschlüsselte NIP-04 Blobs
- Angebots-Inhalte (öffentlich)
```

---

## 🎨 Design-Features

### UI-Komponenten

| Komponente | Design | Features |
|-----------|--------|----------|
| **Marketplace** | Dark Theme, Pink/Violett | Cards, Hover-Effekte |
| **Modal-Popups** | Gradient Header | Slide-in Animation |
| **Chat-Interface** | Dark Bubbles, Gradients | Real-time Updates |
| **Buttons** | Rounded, Primary/Secondary | Hover States |
| **Forms** | Dark Inputs, Pink Focus | Validation |

### Theme-Details

- **Primärfarbe:** `#ff006e` (Pink)
- **Sekundärfarbe:** `#8338ec` (Violett)
- **Hintergrund:** `#1a1a2e` (Dunkelblau)
- **Text:** `#e0e0e0` (Hell-Grau)
- **Akzent:** `#ffbe0b` (Gold)

---

## 📋 Status-Übersicht

### ✅ Vollständig implementiert

1. ✅ **Gruppe erstellen & Whitelist**
   - Admin-Setup
   - Whitelist-Verwaltung
   - Einladungs-Links

2. ✅ **Anonyme Angebote**
   - Temp-Keypairs
   - 24h Auto-Expiration
   - Marketplace-UI

3. ✅ **Interesse-Signale**
   - NIP-04 Verschlüsselung
   - Temp-Key basiert
   - Interest-Liste

4. ✅ **Deal-Benachrichtigungen**
   - NIP-04 Messages
   - Room-ID Generation
   - Modal-Popups

5. ✅ **P2P WebRTC Chat**
   - Trystero Integration
   - Identity Exchange
   - Real-time Messaging

6. ✅ **Dark Theme**
   - Konsistente Farben
   - Responsive Design
   - Animationen

---

## 🚀 Workflow-Diagramm (Komplett)

```
┌──────────┐
│  Admin   │ Erstellt Gruppe + Whitelist
└────┬─────┘
     │
     ├──► Einladungs-Link/QR-Code
     │
┌────▼─────┐
│  User N  │ Treten bei (mit Secret)
└────┬─────┘
     │
     ├──► Whitelist-Check ✓
     │
┌────▼─────────┐
│  Marketplace │ Öffentlich sichtbare Angebote
└────┬─────────┘
     │
     ├──► User A erstellt Angebot (Temp-Key)
     │
┌────▼──────────┐
│ User B, C, D  │ Zeigen Interesse (Temp-Keys)
└────┬──────────┘
     │
     ├──► User A wählt User B aus
     │
┌────▼───────────┐
│  NIP-04 Notify │ Verschlüsselt an B's Temp-Key
└────┬───────────┘
     │
     ├──► Beide bekommen Room-ID
     │
┌────▼──────────┐
│  P2P Chat     │ WebRTC direkt A ↔ B
└────┬──────────┘
     │
     ├──► Deal abgeschlossen
     │
┌────▼──────────┐
│  Marketplace  │ Zurück für neues Angebot
└───────────────┘
```

---

<div align="center">

**[⬆ Nach oben](#-user-workflows--prozesse)**

Bereit für Production! 🚀

</div>
