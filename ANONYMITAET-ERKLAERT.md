# 🎭 Anonymität & Privacy

> **Wie deine Privatsphäre im Bitcoin-Tausch-Netzwerk geschützt wird**

[![Privacy](https://img.shields.io/badge/Privacy-Anonymous-purple?style=flat)]()
[![Encryption](https://img.shields.io/badge/Encryption-NIP--04-success?style=flat)]()
[![User Guide](https://img.shields.io/badge/Guide-End--Users-blue?style=flat)]()

**Stand:** 18. November 2025  
**Zielgruppe:** 👥 Endnutzer (ohne technisches Vorwissen)

---

## 📋 Inhaltsverzeichnis

- [Das Wichtigste zuerst](#-das-wichtigste-zuerst)
- [Szenario: Alice & Bob](#-szenario-alice--bob-tauschen-bitcoin)
- [Anonymitäts-Architektur](#-anonymitäts-architektur)
- [Verschlüsselung erklärt](#-verschlüsselung-einfach-erklärt)
- [Sichtbarkeits-Matrix](#-wer-sieht-was)
- [Sicherheits-Garantien](#-sicherheits-garantien)
- [Best Practices](#-best-practices)
- [FAQ](#-häufige-fragen)

---

## 🎯 Das Wichtigste zuerst

### 🔐 Kernprinzipien

```
┌────────────────────────────────────────────────────────┐
│  Vollständige Anonymität für Angebote & Interesse      │
│  ↓                                                     │
│  Ende-zu-Ende Verschlüsselung für Nachrichten          │
│  ↓                                                     │
│  Selektive Offenlegung nur bei Deal-Start              │
└────────────────────────────────────────────────────────┘
```

**Was bedeutet das für dich?**

| Feature | Schutz | Status |
|---------|--------|--------|
| **Angebote** | Niemand weiß wer Angebote erstellt | ✅ Vollständig anonym |
| **Interesse** | Niemand sieht wer Interesse zeigt | ✅ Vollständig anonym |
| **Auswahl** | Nur Angebotsgeber sieht Interessenten | ✅ Selektiver Zugriff |
| **Broadcast** | Alle bekommen Notifications (verschleiert Gewinner) | ✅ Privacy-optimiert |

---

## 🎬 Szenario: Alice & Bob tauschen Bitcoin

### Akteure

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│   Bob    │         │  Alice   │         │  Server  │
│  (Seller)│         │  (Buyer) │         │ (Relay)  │
└──────────┘         └──────────┘         └──────────┘
     │                    │                     │
     │ Hat Bitcoin        │ Hat Euro            │ Speichert
     │ Will Euro          │ Will Bitcoin        │ Nur verschlüsselte
     │                    │                     │ Daten
```

### Timeline: 9 Schritte zum erfolgreichen Deal

```
Step 1: Bob erstellt Angebot     [Anonym als ANONYM_XYZ123]
   ↓
Step 2: Alice zeigt Interesse    [Anonym als ANONYM_ABC789]
   ↓
Step 3: Bob sieht Interessenten  [Mit Secret: Alice's echte ID]
   ↓
Step 4: Bob wählt Alice aus      [Whitelist-Broadcast]
   ↓
Step 5: Beide starten Deal-Chat  [P2P WebRTC]
```

---

## 📝 Step 1: Bob erstellt Angebot

### Was Bob sieht

```
┌────────────────────────────────────┐
│  Neues Angebot erstellen           │
├────────────────────────────────────┤
│                                    │
│  Angebots-Text:                    │
│  ┌──────────────────────────────┐  │
│  │ Verkaufe 0.1 BTC für 5000€   │  │
│  └──────────────────────────────┘  │
│                                    │
│  [Angebot erstellen]               │
└────────────────────────────────────┘
```

### Was die App macht (unsichtbar)

```
1. Generiert zufälliges Secret:
   ┌──────────────────────────────────────┐
   │ a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...  │
   └──────────────────────────────────────┘
   
2. Leitet temporären Keypair ab:
   Secret → SHA-256 → Temp-Privkey → Temp-Pubkey
   
3. Signiert Angebot mit Temp-Pubkey:
   ANONYM_XYZ123 ← Nicht Bob's echter Pubkey!
   
4. Publiziert auf Relay:
   Von: ANONYM_XYZ123
   Text: "Verkaufe 0.1 BTC für 5000€"
```

### Was auf dem Relay gespeichert wird

```
Event {
  kind: 42,
  pubkey: "ANONYM_XYZ123",  ← Temporär & anonym!
  content: "Verkaufe 0.1 BTC für 5000€",
  created_at: 1731945600
}
```

### Was andere sehen

```
Marketplace:
┌────────────────────────────────────┐
│  📢 Neues Angebot                  │
├────────────────────────────────────┤
│  Von: ANONYM_XYZ123  ← Unbekannt!  │
│  Text: "Verkaufe 0.1 BTC für 5000€"│
│                                    │
│  [Interesse zeigen]                │
└────────────────────────────────────┘
```

**Privacy-Resultat:**

- ❌ Relay weiß NICHT dass Bob der Ersteller ist
- ❌ Andere User wissen NICHT dass Bob dahintersteckt
- ✅ Nur Bob kennt sein Secret und kann später Interessenten sehen

---

## 💚 Step 2: Alice zeigt Interesse

### Was Alice sieht

```
Angebot von ANONYM_XYZ123:
┌────────────────────────────────────┐
│  Verkaufe 0.1 BTC für 5000€        │
│                                    │
│  [Interesse zeigen] ← Alice klickt │
└────────────────────────────────────┘
```

### Was die App macht (unsichtbar)

```
1. Generiert Alice's Temp-Secret:
   ┌──────────────────────────────────────┐
   │ x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4...  │
   └──────────────────────────────────────┘
   
2. Leitet Alice's Temp-Keypair ab:
   AliceSecret → SHA-256 → AliceTemp-Privkey → AliceTemp-Pubkey
   
3. Verschlüsselt Nachricht (NIP-04):
   Inhalt: { realPubkey: "Alice's echter Pubkey", name: "Alice" }
   Verschlüsselt mit: AliceTemp-Privkey + BobTemp-Pubkey
   
4. Publiziert verschlüsselt:
   Von: ANONYM_ABC789  ← Alice's Temp-ID!
   An: ANONYM_XYZ123   ← Bob's Temp-ID!
   Content: "K8HJ3LP9QWERTYXCVB..." ← Verschlüsselt!
```

### Was auf dem Relay gespeichert wird

```
Event {
  kind: 4,  ← Verschlüsselte Nachricht
  pubkey: "ANONYM_ABC789",  ← Alice's Temp-Pubkey!
  content: "K8HJ3LP9QWERTYXCVB...",  ← Encrypted blob!
  tags: [["p", "ANONYM_XYZ123"]]  ← Bob's Temp-Pubkey!
}
```

### Privacy-Architektur (Diagramm)

```
Relay sieht:
┌─────────────────────────────────────────┐
│  Von: ANONYM_ABC789  (❓ Wer?)          │
│  An:  ANONYM_XYZ123  (❓ Wer?)          │
│  Text: K8HJ3LP9...   (❓ Was?)          │
└─────────────────────────────────────────┘
           ↓
     ❌ Keine echten Identitäten!
     ❌ Kein lesbarer Inhalt!
     ❌ Keine Metadaten!

Nur Bob kann entschlüsseln:
┌─────────────────────────────────────────┐
│  Bob nutzt sein Secret                  │
│  → Entschlüsselt K8HJ3LP9...            │
│  → Sieht: "Alice (npub1alice...)"       │
└─────────────────────────────────────────┘
```

**Privacy-Resultat:**

- ❌ Relay weiß NICHT dass Alice Interesse zeigt
- ❌ Andere User können die Nachricht NICHT lesen
- ✅ Nur Bob kann mit seinem Secret die echte Identität sehen

---

## 🔓 Step 3: Bob öffnet Interessenten-Liste

### Workflow

```
Bob:
  1. Öffnet sein Angebot
  2. Sieht Badge: "💌 1 Interessent"
  3. Klickt "Interessenten anzeigen"
     ↓
  4. System fragt: "Gib dein Angebots-Secret ein"
     ↓
  5. Bob gibt Secret ein: a1b2c3d4e5f6...
     ↓
  6. System entschlüsselt alle Interest-Signals
     ↓
  7. Bob sieht echte Identitäten!
```

### Entschlüsselung (Magic!)

```
┌──────────────────────────────────────────┐
│  Input:                                  │
│  • Bob's Secret: a1b2c3d4e5f6...         │
│  • Verschlüsselte Nachricht vom Relay:   │
│    K8HJ3LP9QWERTYXCVB...                 │
├──────────────────────────────────────────┤
│  Prozess:                                │
│  1. Secret → BobTemp-Privkey             │
│  2. Nachricht laden                      │
│  3. ECDH mit AliceTemp-Pubkey            │
│  4. AES-256 entschlüsseln                │
├──────────────────────────────────────────┤
│  Output:                                 │
│  {                                       │
│    realPubkey: "npub1alice789xyz...",    │
│    name: "Alice"                         │
│  }                                       │
└──────────────────────────────────────────┘
```

### Was Bob sieht

```
Interessenten-Liste:
┌────────────────────────────────────┐
│  📋 Interessenten (1)              │
├────────────────────────────────────┤
│  👤 Alice                          │
│  npub1alice789xyz...               │
│                                    │
│  [Deal starten] ← Bob kann wählen  │
└────────────────────────────────────┘
```

### Was andere sehen

```
Andere User:
┌────────────────────────────────────┐
│  Angebot von ANONYM_XYZ123:        │
│  "Verkaufe 0.1 BTC für 5000€"      │
│                                    │
│  Status: Aktiv ✅                  │
└────────────────────────────────────┘

❌ Sie sehen NICHT:
   • Dass Alice Interesse gezeigt hat
   • Dass Bob der Angebotsgeber ist
   • Wer die verschlüsselten Nachrichten lesen kann
```

---

## 🤝 Step 4: Bob wählt Alice aus

### Whitelist-Broadcast (Privacy-Feature!)

```
Bob wählt Alice aus:
   ↓
System sendet NIP-04 an ALLE 50 Whitelist-Mitglieder:
   ↓
┌─────────────────────────────────────────────────┐
│  Alice (Gewinner):                              │
│  ┌────────────────────────────────────────────┐ │
│  │ 🎉 Dein Interesse wurde akzeptiert!        │ │
│  │ Room-ID: abc123xyz...                      │ │
│  │ [Zum Chat]                                 │ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  Bob, Carol, David, ... (49 andere):            │
│  ┌────────────────────────────────────────────┐ │
│  │ 📢 Angebot wurde vergeben                  │ │
│  │ Versuch es beim nächsten Mal!              │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Warum Broadcast?

**Problem OHNE Broadcast:**
```
❌ Nur Alice bekommt Nachricht
→ Relay sieht: "Nur 1 Person hat Nachricht bekommen"
→ Relay kann schließen: "Diese Person wurde ausgewählt"
→ Metadata-Leak! ❌
```

**Lösung MIT Broadcast:**
```
✅ ALLE 50 Mitglieder bekommen Nachricht
→ Relay sieht: "50 verschlüsselte NIP-04 Messages"
→ Relay kann NICHT unterscheiden welche die Einladung ist
→ Perfekte Anonymität! ✅
```

### Relay-Perspektive

```
Relay speichert 50 Events:
┌─────────────────────────────────────┐
│ Event 1: ANONYM_XYZ123 → Member_1   │
│ Content: "Blob1..." (verschlüsselt) │
├─────────────────────────────────────┤
│ Event 2: ANONYM_XYZ123 → Member_2   │
│ Content: "Blob2..." (verschlüsselt) │
├─────────────────────────────────────┤
│ ...                                 │
├─────────────────────────────────────┤
│ Event 50: ANONYM_XYZ123 → Member_50 │
│ Content: "Blob50..." (verschlüsselt)│
└─────────────────────────────────────┘

❓ Welches ist die Einladung?
❓ Welches ist die Absage?
→ Relay weiß es NICHT! Alle sehen gleich aus!
```

---

## 🌐 Anonymitäts-Architektur

### Layer-Modell

```
Layer 1: Marketplace (Public)
┌────────────────────────────────────────────────┐
│  Angebote: ANONYM_XYZ, ANONYM_ABC, ...         │
│  ✅ Öffentlich sichtbar                        │
│  ❌ Keine echten Identitäten                   │
└────────────────────────────────────────────────┘
                    ↓
Layer 2: Interest Signals (Encrypted)
┌────────────────────────────────────────────────┐
│  NIP-04 Messages: K8HJ3LP9..., L9IK4MQ0...     │
│  ✅ Verschlüsselt                              │
│  ❌ Nur Empfänger kann lesen                   │
└────────────────────────────────────────────────┘
                    ↓
Layer 3: Deal Notification (Broadcast)
┌────────────────────────────────────────────────┐
│  50 verschlüsselte Nachrichten an Whitelist    │
│  ✅ Einladung + 49 Absagen                     │
│  ❌ Relay kann nicht unterscheiden             │
└────────────────────────────────────────────────┘
                    ↓
Layer 4: P2P Chat (WebRTC)
┌────────────────────────────────────────────────┐
│  Direkte Verbindung Alice ↔ Bob                │
│  ✅ Kein Relay beteiligt                       │
│  ❌ Keine Metadaten                            │
└────────────────────────────────────────────────┘
```

### Anonymitäts-Garantien pro Layer

| Layer | Relay sieht | Relay weiß NICHT |
|-------|------------|------------------|
| **Marketplace** | Temp-Pubkeys, Angebots-Text | Wer Angebote erstellt |
| **Interest** | Temp→Temp Messages (encrypted) | Wer mit wem kommuniziert |
| **Deal Notify** | 50 verschlüsselte Messages | Wer ausgewählt wurde |
| **P2P Chat** | ❌ Nichts! (Direkte Verbindung) | ❌ Nichts! |

---

## 🔐 Verschlüsselung einfach erklärt

### Die Farb-Analogie (Diffie-Hellman)

**Konzept:** Zwei Personen erzeugen den gleichen geheimen Schlüssel, ohne ihn jemals auszutauschen!

---

#### Schritt 1: Jeder hat 2 Farben

```
Alice:                         Bob:
┌─────────────────┐           ┌─────────────────┐
│ 🔴 Geheim       │           │ 🟡 Geheim       │
│ (Privkey)       │           │ (Privkey)       │
│                 │           │                 │
│ 🟠 Öffentlich   │           │ 🟢 Öffentlich   │
│ (Pubkey)        │           │ (Pubkey)        │
└─────────────────┘           └─────────────────┘
     ↓ Teilt öffentlich ↓          ↓ Teilt öffentlich ↓
         🟠                             🟢
```

---

#### Schritt 2: Alice verschlüsselt

```
Alice nimmt:
  🔴 Ihre geheime Farbe (Privkey)
  🟢 Bob's öffentliche Farbe (Pubkey)
  
Alice mischt:
  🔴 + 🟢 = 🟤 Shared Secret
  
Alice verschlüsselt mit 🟤:
  Klartext: "Ich habe Interesse!"
  Chiffre:  "K8HJ3LP9QWERTYXCVB..."
  
Alice sendet: K8HJ3LP9... (öffentlich)
```

---

#### Schritt 3: Bob entschlüsselt

```
Bob nimmt:
  🟡 Seine geheime Farbe (Privkey)
  🟠 Alice's öffentliche Farbe (Pubkey)
  
Bob mischt:
  🟡 + 🟠 = 🟤 Shared Secret  ← GLEICH wie Alice!
  
Bob entschlüsselt mit 🟤:
  Chiffre:  "K8HJ3LP9QWERTYXCVB..."
  Klartext: "Ich habe Interesse!" ✅
```

**Mathematische Magie:**
- 🔴 (Alice geheim) + 🟢 (Bob öffentlich) = 🟤
- 🟡 (Bob geheim) + 🟠 (Alice öffentlich) = 🟤
- **Diffie-Hellman garantiert:** Beide bekommen 🟤!

---

#### Schritt 4: Charlie (Angreifer) scheitert

```
Charlie (Relay-Betreiber) sieht:
  🟠 Alice's öffentliche Farbe
  🟢 Bob's öffentliche Farbe
  📨 "K8HJ3LP9QWERTYXCVB..." (verschlüsselt)
  
Charlie versucht:
  🔵 Seine geheime Farbe + 🟠 = 🪻 Lila
  🔵 Seine geheime Farbe + 🟢 = ⬛ Dunkelblau
  🟠 + 🟢 (beide öffentlich) = 🧡 Orange
  
Charlie entschlüsselt mit 🪻, ⬛, 🧡:
  "K8HJ3LP9..." → "xG#9!?@..." ❌ Müll!
  "K8HJ3LP9..." → "2$aK!..." ❌ Müll!
  "K8HJ3LP9..." → "!9Lm#..." ❌ Müll!
  
❌ Charlie kann NICHT 🟤 erzeugen!
   Er braucht entweder 🔴 oder 🟡 (beide geheim!)
```

---

#### Zusammenfassung: Verschlüsselungs-Matrix

| Wer | Kann mischen | Kann entschlüsseln |
|-----|--------------|-------------------|
| **Alice** | 🔴 + 🟢 = 🟤 | ✅ Ja |
| **Bob** | 🟡 + 🟠 = 🟤 | ✅ Ja |
| **Charlie (Relay)** | 🔵 + 🟠 = 🪻 ❌<br>🔵 + 🟢 = ⬛ ❌<br>🟠 + 🟢 = 🧡 ❌ | ❌ Nein |

---

## 👁️ Wer sieht was?

### Sichtbarkeits-Matrix

| Aktion | Bob (Seller) | Alice (Buyer) | Andere User | Relay (Server) |
|--------|-------------|--------------|-------------|---------------|
| **Angebot erstellen** | ✅ Eigenes Secret | ❌ Sieht nur ANONYM_XYZ | ❌ Sieht nur ANONYM_XYZ | ❌ Sieht nur ANONYM_XYZ |
| **Interesse zeigen** | ❌ Noch nicht | ✅ Temp-Secret generiert | ❌ Sieht nur ANONYM_ABC | ❌ Sieht nur ANONYM_ABC |
| **Interest Signal** | ❌ Noch verschlüsselt | ✅ Gesendet | ❌ Verschlüsselt | ❌ Verschlüsselt |
| **Secret eingeben** | ✅ Sieht "Alice" | ❌ Weiß nicht dass Bob weiß | ❌ Keine Ahnung | ❌ Keine Ahnung |
| **Deal auswählen** | ✅ Wählt Alice | ✅ Bekommt Einladung | ✅ Bekommen Absage | ❌ Sieht 50 verschlüsselte Messages |
| **P2P Chat** | ✅ Direkte Verbindung | ✅ Direkte Verbindung | ❌ Nichts | ❌ Nichts (P2P!) |

---

### Timeline: Wann wer wen kennt

```
Zeit T0: Gruppe erstellt
  Admin → Weiß wer in Whitelist ist
  User  → Weiß wer in Whitelist ist
  Relay → Weiß wer in Whitelist ist

Zeit T1: Bob erstellt Angebot
  Bob   → Weiß dass ER anbietet (kennt Secret)
  Alice → Sieht nur "ANONYM_XYZ123"
  Relay → Sieht nur "ANONYM_XYZ123"
  
Zeit T2: Alice zeigt Interesse
  Alice → Weiß dass SIE interessiert ist
  Bob   → Sieht noch nichts
  Relay → Sieht nur verschlüsselte Nachricht
  
Zeit T3: Bob öffnet Interessenten-Liste
  Bob   → Sieht jetzt "Alice"!
  Alice → Weiß nicht dass Bob weiß
  Relay → Sieht immer noch nur Verschlüsselung
  
Zeit T4: Bob wählt Alice aus
  Bob   → Sendet Einladung an Alice
  Alice → Bekommt "Du wurdest ausgewählt!"
  Andere → Bekommen "Angebot vergeben"
  Relay → Sieht 50 verschlüsselte Messages (kann nicht unterscheiden)
  
Zeit T5: P2P Chat startet
  Bob   ↔ Alice (direkt verbunden)
  Relay → Sieht NICHTS (P2P WebRTC!)
```

---

## 🛡️ Sicherheits-Garantien

### ✅ Was geschützt ist

```
┌──────────────────────────────────────────────────┐
│  1. Angebots-Anonymität                          │
│     ✅ Niemand weiß wer Angebote erstellt        │
│     ✅ Temp-Pubkeys statt echte Identitäten      │
├──────────────────────────────────────────────────┤
│  2. Interesse-Anonymität                         │
│     ✅ Niemand sieht wer Interesse zeigt         │
│     ✅ Nachrichten Ende-zu-Ende verschlüsselt    │
├──────────────────────────────────────────────────┤
│  3. Metadata-Schutz                              │
│     ✅ Whitelist-Broadcast verschleiert Gewinner │
│     ✅ Relay kann nicht korrelieren              │
├──────────────────────────────────────────────────┤
│  4. Chat-Privacy                                 │
│     ✅ P2P WebRTC ohne Relay                     │
│     ✅ Keine Logs, keine Metadaten               │
└──────────────────────────────────────────────────┘
```

### ❌ Was NICHT geschützt ist (by Design)

```
┌──────────────────────────────────────────────────┐
│  1. Whitelist-Mitgliedschaft                     │
│     ❌ Alle wissen wer in der Gruppe ist         │
│     💡 Notwendig für Vertrauen                   │
├──────────────────────────────────────────────────┤
│  2. Angebots-Inhalte                             │
│     ❌ Angebots-Text ist öffentlich sichtbar     │
│     💡 Notwendig für Marketplace-Funktion        │
├──────────────────────────────────────────────────┤
│  3. Deal-Partner (nach Start)                    │
│     ❌ Bob und Alice wissen voneinander          │
│     💡 Notwendig für Verhandlung                 │
└──────────────────────────────────────────────────┘
```

### 🔒 Kryptographie-Standards

| Technologie | Standard | Sicherheit |
|------------|---------|-----------|
| **Keypair-Ableitung** | SHA-256 + secp256k1 | ✅ Bitcoin-Level |
| **Verschlüsselung** | NIP-04 (AES-256-CBC) | ✅ Military-Grade |
| **Key Exchange** | ECDH (Elliptic Curve) | ✅ NSA Suite B |
| **Signierung** | Schnorr Signatures | ✅ State-of-the-Art |

---

## 💡 Best Practices

### Für Angebotsgeber (wie Bob)

#### ⚠️ Secret sichern!

```
✅ EMPFOHLEN:
┌────────────────────────────────────┐
│ • Passwort-Manager (1Password, etc)│
│ • Papier-Notiz (sicher verwahrt)   │
│ • Verschlüsselter Screenshot       │
│ • Hardware-Token (YubiKey)         │
└────────────────────────────────────┘

❌ NICHT EMPFOHLEN:
┌────────────────────────────────────┐
│ • Nur im Browser-Tab lassen        │
│ • Auf Post-It an Monitor kleben    │
│ • Per E-Mail an sich selbst senden │
│ • In Cloud ohne Verschlüsselung    │
└────────────────────────────────────┘
```

**Ohne Secret:**
- ❌ Kein Zugriff auf Interessenten-Liste
- ❌ Kein Löschen des Angebots möglich
- 💡 Angebot läuft nach 24h automatisch ab

#### 📋 Interessenten prüfen

```
Vor Deal-Start:
1. ✅ Überprüfe Pubkey der Whitelist
2. ✅ Prüfe Reputation (falls bekannt)
3. ✅ Wähle vertrauenswürdigen Partner
```

---

### Für Interessenten (wie Alice)

#### ✅ Kein Secret nötig!

```
Interesse zeigen:
1. Klick "Interesse zeigen"
2. System generiert alles automatisch
3. Fertig! Warte auf Auswahl
```

#### ⏳ Geduld haben

```
Nach Interesse-Signal:
• ⏰ Warte auf Angebotsgeber
• 📊 Möglicherweise gibt es mehrere Interessenten
• 🎉 Notification wenn du ausgewählt wurdest
• 🗑️ Oder Angebot wird gelöscht (vergeben)
```

---

## ❓ Häufige Fragen

<details>
<summary><strong>F: Kann der Relay-Betreiber meine Daten lesen?</strong></summary>

**Antwort:** ❌ **Nein!**

```
Relay sieht nur:
• Anonyme IDs (ANONYM_XYZ123, ANONYM_ABC789)
• Verschlüsselte Blobs (K8HJ3LP9QWERTYXCVB...)
• Nostr-Event Metadaten (Timestamps, Event-Kinds)

Relay sieht NICHT:
❌ Deine echte Identität bei Angeboten
❌ Deine echte Identität bei Interest Signals
❌ Inhalt der verschlüsselten Nachrichten
❌ Wer mit wem einen Deal startet (Whitelist-Broadcast!)
❌ Chat-Nachrichten (P2P WebRTC!)
```

</details>

<details>
<summary><strong>F: Können andere Gruppenmitglieder sehen was ich mache?</strong></summary>

**Antwort:** ❌ **Nur begrenzt!**

```
Andere sehen:
✅ Du bist in der Whitelist (öffentlich)
✅ "Jemand" hat ein Angebot erstellt (anonym)
✅ "Jemand" hat Interesse gezeigt (anonym)
✅ "Angebot wurde vergeben" (aber nicht an wen!)

Andere sehen NICHT:
❌ Dass DU das Angebot erstellt hast
❌ Dass DU Interesse gezeigt hast
❌ Dass DU ausgewählt wurdest
❌ Deine Chat-Nachrichten
```

</details>

<details>
<summary><strong>F: Was passiert wenn ich mein Secret verliere?</strong></summary>

**Antwort:** 😢 **Zugriff auf Angebot verloren**

```
Ohne Secret kannst du:
❌ NICHT mehr Interessenten-Liste sehen
❌ NICHT mehr Deal starten
❌ NICHT mehr Angebot löschen

ABER:
✅ Angebot läuft nach 24h automatisch ab
✅ Du kannst neues Angebot mit neuem Secret erstellen
✅ Keine dauerhaften Schäden!
```

**Prävention:**
1. 📝 Secret sofort nach Erstellung speichern
2. 🔐 Passwort-Manager nutzen
3. 🗎 Backup auf Papier

</details>

<details>
<summary><strong>F: Ist das wirklich sicher? Wie sicher ist die Verschlüsselung?</strong></summary>

**Antwort:** ✅ **Ja, Bitcoin-Level Sicherheit!**

```
Kryptographie-Stack:
┌──────────────────────────────────────┐
│ SHA-256           Same as Bitcoin    │
│ secp256k1         Same as Bitcoin    │
│ AES-256-CBC       Military Standard  │
│ ECDH              NSA Suite B        │
│ Schnorr Sigs      State-of-the-Art   │
└──────────────────────────────────────┘

Zeit zum Brechen (Brute-Force):
• AES-256: >1 Milliarde Jahre (aktueller Hardware)
• secp256k1: >100 Milliarden Jahre
• SHA-256: >10 Milliarden Jahre

✅ Sicher gegen:
   • Relay-Betreiber
   • Andere Gruppenmitglieder
   • Man-in-the-Middle Attacken
   • Quantencomputer (secp256k1 resistenent genug für next 20 years)
```

</details>

<details>
<summary><strong>F: Kann ich anonym bleiben wenn ich einen Deal starte?</strong></summary>

**Antwort:** ⚠️ **Jein - nur bis zum Deal-Start**

```
Timeline:
T1: Angebot erstellen
    ✅ Vollständig anonym
    
T2: Interesse zeigen
    ✅ Vollständig anonym
    
T3: Deal-Start
    ❌ Beide Parteien lernen sich kennen
    💡 Das ist notwendig für Verhandlung!
    
T4: P2P Chat
    ✅ Relay sieht nichts (P2P WebRTC)
    ❌ Aber Bob und Alice kennen sich
```

**Wenn du KOMPLETT anonym bleiben willst:**
- 🚫 Starte keinen Deal
- 💡 Marketplace-Browsing ist 100% anonym
</details>

<details>
<summary><strong>F: Warum bekommen ALLE eine Nachricht wenn Bob Alice auswählt?</strong></summary>

**Antwort:** 🛡️ **Privacy durch Whitelist-Broadcast!**

```
Problem ohne Broadcast:
❌ Nur Alice bekommt Nachricht
→ Relay sieht: "Bob sendet an Alice"
→ Relay weiß: "Alice wurde ausgewählt"
→ Metadata-Leak! ❌

Lösung mit Broadcast:
✅ Alle 50 Mitglieder bekommen Nachricht
→ Relay sieht: "Bob sendet an 50 Personen"
→ Relay weiß NICHT: "Wer wurde ausgewählt?"
→ Perfekte Anonymität! ✅

Inhalt:
• Alice: "Du wurdest ausgewählt! Room-ID: abc123..."
• Andere 49: "Angebot vergeben - nächstes Mal!"
• Alle Nachrichten verschlüsselt (NIP-04)
• Relay kann nicht unterscheiden!
```

**Das ist Privacy by Design!** 🎭

</details>

---

## 🎓 Fazit

### 4-Layer Privacy-Architektur

```
┌────────────────────────────────────────────────┐
│  Layer 1: Anonyme Angebote (Temp-Keypairs)     │
│           → Niemand weiß wer anbietet          │
├────────────────────────────────────────────────┤
│  Layer 2: Verschlüsselte Signale (NIP-04)      │
│           → Niemand liest Interesse            │
├────────────────────────────────────────────────┤
│  Layer 3: Whitelist-Broadcast (50 Nachrichten) │
│           → Niemand sieht wer ausgewählt wurde │
├────────────────────────────────────────────────┤
│  Layer 4: P2P Chat (WebRTC direkt)             │
│           → Relay sieht nichts                 │
└────────────────────────────────────────────────┘
```

### Kernversprechen

| Prinzip | Garantie | Status |
|---------|----------|--------|
| **Marketplace-Anonymität** | Angebote ohne echte Identität | ✅ 100% |
| **Interest-Privacy** | Verschlüsselte Signale | ✅ 100% |
| **Metadata-Schutz** | Whitelist-Broadcast verschleiert Gewinner | ✅ 100% |
| **Chat-Privacy** | P2P ohne Relay-Beteiligung | ✅ 100% |

---

<div align="center">

**Deine Privatsphäre ist unsere Priorität! 🎭**

**[⬆ Nach oben](#-anonymität--privacy)**

---

*Letzte Aktualisierung: 18. November 2025*  
*Version 2.0 - Für Endnutzer optimiert*

</div>
