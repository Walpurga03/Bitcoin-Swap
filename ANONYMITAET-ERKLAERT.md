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

### Die 3 Phasen: Angebot → Interesse → Chatraum

```
1️⃣ ANGEBOT ERSTELLEN           2️⃣ INTERESSE ZEIGEN           3️⃣ CHATRAUM STARTEN
   (Bob)                           (Alice)                        (Bob & Alice)
      │                               │                               │
      ↓                               ↓                               ↓
  ✅ Anonym                       ✅ Anonym                       ✅ P2P direkt
  ✅ Temp-ID                      ✅ Verschlüsselt                ✅ Kein Server
  ✅ Nur Bob kennt Secret         ✅ Nur Bob kann lesen           ✅ Privat
```

**Was bedeutet das für dich?**

| Phase | Wer sieht was | Privacy-Level |
|-------|--------------|---------------|
| **1️⃣ Angebot** | Alle sehen Angebot-Text, NIEMAND weiß wer es erstellt hat | ✅ 100% anonym |
| **2️⃣ Interesse** | Nur Bob kann verschlüsselte Signale lesen | ✅ 100% anonym |
| **3️⃣ Chatraum** | Nur Bob & Alice (direkt verbunden, kein Server) | ✅ 100% privat |

---

## 🎬 So funktioniert's: Alice & Bob tauschen Bitcoin

### 📌 Die Situation

```
Bob hat:     0.1 Bitcoin      →  Will:  10000 Euro
Alice hat:   10000 Euro        →  Will:  0.1 Bitcoin
```

### 🔄 Die 5 Schritte (einfach erklärt)

```
┌─────────────────────────────────────────────────────────────┐
│  1️⃣ BOB ERSTELLT ANGEBOT                                    │
│     Bob: "Verkaufe 0.1 BTC für 10000€"                      │
│     System: Macht Bob anonym → ANONYM_XYZ123                │
│     ✅ Niemand weiß dass es Bob ist!                        │
└─────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│  2️⃣ ALICE ZEIGT INTERESSE                                   │
│     Alice sieht: Angebot von ANONYM_XYZ123                  │
│     Alice klickt: "Interesse zeigen"                        │
│     System: Verschlüsselt Alice's Daten → Nur Bob kann lesen│
│     ✅ Niemand weiß dass Alice interessiert ist!            │
└─────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│  3️⃣ BOB SIEHT INTERESSENTEN                                 │
│     Bob gibt sein Secret ein                                │
│     System entschlüsselt: "Alice hat Interesse!"            │
│     Bob wählt: "Deal mit Alice starten"                     │
│     ✅ Nur Bob kann die echten Namen sehen!                 │
└─────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│  4️⃣ ALLE BEKOMMEN NACHRICHT (Privacy-Trick!)               │
│     Alice: "🎉 Du wurdest ausgewählt! Chatraum: abc123"    │
│     49 andere: "📢 Angebot vergeben, nächstes Mal!"        │
│     ✅ Server weiß nicht wer gewonnen hat!                  │
└─────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│  5️⃣ CHATRAUM STARTET (P2P = Peer-to-Peer)                  │
│     Alice ←→ Bob (Direkte Verbindung!)                     │
│     Keine Server dazwischen!                                │
│     ✅ Komplett privat, niemand hört mit!                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ ANGEBOT ERSTELLEN (Bob)

### Was Bob macht

```
Bob öffnet die App:
┌────────────────────────────────────┐
│  Neues Angebot erstellen           │
├────────────────────────────────────┤
│  Angebots-Text:                    │
│  ┌──────────────────────────────┐  │
│  │ Verkaufe 0.1 BTC für 10000€  │  │
│  └──────────────────────────────┘  │
│                                    │
│  [Angebot erstellen] ← Klick!      │
└────────────────────────────────────┘
```

### Was die App automatisch macht (Magie! ✨)

```
1. Secret erstellen:
   Zufallszahl → a1b2c3d4e5f6g7h8... (64 Zeichen)
   💡 Bob muss sich das merken!
   
2. Anonyme ID erstellen:
   Secret → ANONYM_XYZ123
   💡 Das ist NICHT Bob's echter Name!
   
3. Angebot veröffentlichen:
   Von: ANONYM_XYZ123 (anonym!)
   Text: "Verkaufe 0.1 BTC für 10000€"
```

### Was alle anderen sehen

```
Marketplace:
┌────────────────────────────────────┐
│  📢 Neues Angebot                  │
├────────────────────────────────────┤
│  Von: ANONYM_XYZ123                │
│  "Verkaufe 0.1 BTC für 10000€"     │
│                                    │
│  [Interesse zeigen]                │
└────────────────────────────────────┘

❓ Wer ist ANONYM_XYZ123?
   → Niemand weiß es! Auch der Server nicht!
```

### ✅ Privacy-Garantie

- ✅ Dein Name ist komplett anonym
- ✅ Nur DU kennst dein Secret
- ✅ Server speichert nur "ANONYM_XYZ123"
- ✅ Andere User sehen nur die anonyme ID

---

## 2️⃣ INTERESSE ZEIGEN (Alice)

### Was Alice macht

```
Alice sieht das Angebot:
┌────────────────────────────────────┐
│  Angebot von ANONYM_XYZ123         │
├────────────────────────────────────┤
│  "Verkaufe 0.1 BTC für 10000€"     │
│                                    │
│  [Interesse zeigen] ← Alice klickt!│
└────────────────────────────────────┘
```

### Was die App automatisch macht (Verschlüsselung! 🔐)

```
1. Secret für Alice erstellen:
   Zufallszahl → x9y8z7w6v5u4t3s2... (automatisch!)
   💡 Alice muss nichts merken!
   
2. Alice's echte Daten verschlüsseln:
   Klartext: "Alice (npub1alice789...)"
   🔒 Verschlüsselt → "K8HJ3LP9QWERTY..."
   💡 Nur Bob kann das lesen!
   
3. Verschlüsselte Nachricht senden:
   Von: ANONYM_ABC789 (Alice anonym!)
   An: ANONYM_XYZ123 (Bob anonym!)
   Inhalt: K8HJ3LP9... (verschlüsselt!)
```

### Was der Server sieht

```
Server speichert:
┌─────────────────────────────────────┐
│ Von: ANONYM_ABC789  ← Wer? 🤷      │
│ An:  ANONYM_XYZ123  ← Wer? 🤷      │
│ Text: K8HJ3LP9...   ← Was? 🤷      │
└─────────────────────────────────────┘

❌ Server kann nichts lesen!
❌ Server weiß nicht wer Alice ist!
❌ Server weiß nicht wer Bob ist!
```

### ✅ Privacy-Garantie

- ✅ Alice bleibt anonym (ANONYM_ABC789)
- ✅ Nachricht ist verschlüsselt
- ✅ Nur Bob kann sie lesen (mit seinem Secret)
- ✅ Server sieht nur Kauderwelsch

---

## 3️⃣ BOB SIEHT INTERESSENTEN

### Was Bob macht

```
Bob öffnet sein Angebot:
┌────────────────────────────────────┐
│  Dein Angebot                      │
│  "Verkaufe 0.1 BTC für 10000€"     │
│                                    │
│  💌 1 Interessent                  │
│  [Interessenten anzeigen] ← Klick! │
└────────────────────────────────────┘
     ↓
┌────────────────────────────────────┐
│  Gib dein Secret ein:              │
│  ┌──────────────────────────────┐  │
│  │ a1b2c3d4e5f6g7h8...          │  │
│  └──────────────────────────────┘  │
│  [Entschlüsseln]                   │
└────────────────────────────────────┘
```

### Was die App automatisch macht (Entschlüsselung! 🔓)

```
1. Secret prüfen:
   Bob's Secret → Stimmt? ✅
   
2. Verschlüsselte Nachricht holen:
   "K8HJ3LP9QWERTY..." vom Server
   
3. Entschlüsseln:
   K8HJ3LP9... → "Alice (npub1alice789...)"
   💡 Jetzt sieht Bob wer interessiert ist!
```

### Was Bob dann sieht

```
Interessenten-Liste:
┌────────────────────────────────────┐
│  📋 Interessenten (1)              │
├────────────────────────────────────┤
│  👤 Alice                          │
│     npub1alice789xyz...            │
│                                    │
│  [Deal mit Alice starten]          │
└────────────────────────────────────┘
```

### Was andere noch immer NICHT sehen

```
Andere User sehen:
┌────────────────────────────────────┐
│  Angebot von ANONYM_XYZ123         │
│  "Verkaufe 0.1 BTC für 10000€"     │
│  Status: Aktiv ✅                  │
└────────────────────────────────────┘

❌ Sie wissen NICHT:
   • Dass Bob der Angebotsgeber ist
   • Dass Alice Interesse gezeigt hat
   • Dass Bob Alice's Namen sehen kann
```

### ✅ Privacy-Garantie

- ✅ Nur Bob kann mit seinem Secret entschlüsseln
- ✅ Server kann nicht entschlüsseln
- ✅ Andere User sehen nur anonyme IDs

---

## 4️⃣ BOB WÄHLT ALICE AUS

### Was Bob macht

```
Bob öffnet Interessenten-Liste:
┌────────────────────────────────────┐
│  � Interessenten (1)              │
├────────────────────────────────────┤
│  �👤 Alice                          │
│     npub1alice789xyz...            │
│                                    │
│  [Deal mit Alice starten] ← Klick! │
└────────────────────────────────────┘
```

### Was die App automatisch macht

```
1. Erstellt Chatraum-ID:
   Zufallszahl → abc123xyz...
   
2. Sendet verschlüsselte Nachricht an Alice:
   "🎉 Du wurdest ausgewählt! Chatraum: abc123xyz"
   (NIP-04 verschlüsselt)
   
3. Löscht das Angebot vom Server:
   Status: "Vergeben" oder komplett gelöscht
```

### Was Alice bekommt

```
Notification:
┌────────────────────────────────────┐
│  🎉 Deal-Einladung!                │
├────────────────────────────────────┤
│  Du wurdest ausgewählt!            │
│  Chatraum: abc123xyz...            │
│                                    │
│  [Zum Chat] ← Alice klickt         │
└────────────────────────────────────┘
```

### Was andere sehen

```
Marketplace:
┌────────────────────────────────────┐
│  ⚠️ Angebot nicht mehr verfügbar   │
│  (wurde vergeben oder gelöscht)    │
└────────────────────────────────────┘

💡 Niemand weiß dass Alice ausgewählt wurde!
💡 Nur Alice bekommt die Chatraum-ID!
```

### ✅ Privacy-Garantie

- ✅ Nur Alice bekommt Chatraum-ID (NIP-04 verschlüsselt)
- ✅ Server kann Nachricht nicht lesen
- ✅ Andere sehen nur "Angebot vergeben"
- ✅ Niemand weiß wer ausgewählt wurde

---

## 5️⃣ CHATRAUM STARTEN (P2P = Peer-to-Peer)

### Was ist P2P?

```
❌ NORMAL (mit Server):
   Alice → Server → Bob
   💡 Server hört alles mit!

✅ P2P (Peer-to-Peer = direkt):
   Alice ←─────────→ Bob
   💡 KEIN Server dazwischen!
```

### Wie der Chatraum startet

```
1. Alice bekommt: "Chatraum-ID: abc123"
2. Bob bekommt: "Chatraum-ID: abc123"
   ↓
3. Beide öffnen Chatraum mit ID: abc123
   ↓
4. System verbindet Alice & Bob DIREKT
   ↓
5. Chat läuft ohne Server!
```

### Was im Chatraum passiert

```
┌──────────────────────────────────────────┐
│  Chatraum: abc123                        │
├──────────────────────────────────────────┤
│  Alice: "Hast du Kraken-Account?"       │
│  Bob:   "Ja! Wann können wir tauschen?" │
│  Alice: "Morgen 14 Uhr?"                │
│  Bob:   "Perfect! 👍"                   │
└──────────────────────────────────────────┘

✅ Nachrichten gehen DIREKT von Alice zu Bob
✅ Kein Server kann mitlesen
✅ Keine Logs werden gespeichert
```

### Vergleich: Mit vs. Ohne Server

| | Mit Server (Normal) | P2P (Unser System) |
|---|---|---|
| **Verbindung** | Alice → Server → Bob | Alice ←→ Bob |
| **Server liest mit** | ✅ Ja | ❌ Nein! |
| **Server speichert** | ✅ Ja | ❌ Nein! |
| **Privatsphäre** | ⚠️ Mittel | ✅ Maximum |

### ✅ Privacy-Garantie

- ✅ Chatraum ist komplett privat
- ✅ Kein Server kann mitlesen
- ✅ Keine Logs, keine Speicherung
- ✅ Nur Alice & Bob kennen den Inhalt

---

## 📊 Zusammenfassung: Die 5 Phasen

```
┌─────────────────────────────────────────────────────────┐
│ 1️⃣ ANGEBOT                                              │
│    Bob erstellt → ANONYM_XYZ123 (komplett anonym)      │
├─────────────────────────────────────────────────────────┤
│ 2️⃣ INTERESSE                                            │
│    Alice klickt → Verschlüsselte Nachricht an Bob       │
├─────────────────────────────────────────────────────────┤
│ 3️⃣ AUSWAHL                                              │
│    Bob gibt Secret ein → Sieht "Alice"                  │
├─────────────────────────────────────────────────────────┤
│ 4️⃣ EINLADUNG                                            │
│    Nur Alice bekommt Chatraum-ID (verschlüsselt)        │
├─────────────────────────────────────────────────────────┤
│ 5️⃣ CHATRAUM                                             │
│    Alice ↔ Bob direkt verbunden → Kein Server!         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Wie funktioniert Verschlüsselung? (Einfach erklärt)

### Die Farb-Analogie

**Stell dir vor:** Verschlüsselung funktioniert wie Farben mischen!

#### Schritt 1: Jeder hat 2 Farben

```
Alice hat:                    Bob hat:
🔴 Geheim (nur für Alice)     🟡 Geheim (nur für Bob)
🟠 Öffentlich (alle sehen)    🟢 Öffentlich (alle sehen)
```

#### Schritt 2: Alice verschlüsselt ihre Nachricht

```
Alice mischt:
  🔴 (ihre geheime Farbe)
  + 🟢 (Bob's öffentliche Farbe)
  = 🟤 (Geheimer Schlüssel)

Alice verschlüsselt mit 🟤:
  "Ich bin Alice" → "K8HJ3LP9..."
  
Alice sendet: "K8HJ3LP9..." (öffentlich)
```

#### Schritt 3: Bob entschlüsselt die Nachricht

```
Bob mischt:
  🟡 (seine geheime Farbe)
  + 🟠 (Alice's öffentliche Farbe)
  = 🟤 (GLEICHER geheimer Schlüssel!)

Bob entschlüsselt mit 🟤:
  "K8HJ3LP9..." → "Ich bin Alice" ✅
```

#### Schritt 4: Warum kann der Server nichts lesen?

```
Server (Charlie) hat:
  🟠 Alice's öffentliche Farbe
  🟢 Bob's öffentliche Farbe
  "K8HJ3LP9..." (verschlüsselt)

Charlie versucht zu mischen:
  🟠 + 🟢 = 🧡 (FALSCHE Farbe!)

Charlie entschlüsselt:
  "K8HJ3LP9..." → "xG#9!?@..." ❌ Müll!

❌ Charlie kann 🟤 NICHT erzeugen!
   Er braucht 🔴 oder 🟡 (beide geheim!)
```

### Wer kann was?

| Wer | Hat Farben | Kann entschlüsseln? |
|-----|-----------|-------------------|
| **Alice** | 🔴 + 🟢 = 🟤 | ✅ Ja |
| **Bob** | 🟡 + 🟠 = 🟤 | ✅ Ja |
| **Server** | 🟠 + 🟢 = 🧡❌ | ❌ Nein! |

---

## 👁️ Wer sieht was? (Übersicht)

| Was passiert | Bob | Alice | Andere | Server |
|-------------|-----|-------|--------|--------|
| **Angebot erstellen** | ✅ Kennt Secret | ❌ Sieht ANONYM_XYZ | ❌ Sieht ANONYM_XYZ | ❌ Sieht ANONYM_XYZ |
| **Interesse zeigen** | ❌ Noch nichts | ✅ Hat geklickt | ❌ Sieht nichts | ❌ Sieht verschlüsselt |
| **Secret eingeben** | ✅ Sieht "Alice" | ❌ Weiß nichts | ❌ Sieht nichts | ❌ Sieht verschlüsselt |
| **Alice auswählen** | ✅ Sendet Einladung | ✅ Bekommt Chatraum-ID | ⚠️ "Vergeben" | ❌ Sieht verschlüsselt |
| **Chatraum** | ✅ Chattet mit Alice | ✅ Chattet mit Bob | ❌ Nichts | ❌ Nichts (P2P!) |

---

## 🛡️ Was ist geschützt?

### ✅ Sicher & Anonym

```
1. Angebote erstellen
   ✅ Niemand weiß wer das Angebot erstellt hat
   ✅ Nur anonyme ID (ANONYM_XYZ123) sichtbar

2. Interesse zeigen
   ✅ Niemand sieht wer Interesse hat
   ✅ Nachricht ist verschlüsselt

3. Auswahl treffen
   ✅ Server weiß nicht wer ausgewählt wurde
   ✅ Alle 50 bekommen verschlüsselte Nachricht

4. Chatraum nutzen
   ✅ Kein Server kann mitlesen
   ✅ Direkte P2P-Verbindung
   ✅ Keine Logs, keine Speicherung
```

### ⚠️ Nicht geschützt (notwendig fürs System)

```
❌ Whitelist-Mitgliedschaft
   Alle wissen wer in der Gruppe ist
   💡 Wichtig für Vertrauen!

❌ Angebots-Text
   Angebot ist öffentlich sichtbar
   💡 Wichtig für Marketplace!

❌ Deal-Partner (nach Start)
   Bob und Alice kennen sich
   💡 Wichtig für Verhandlung!
```

---

## 💡 Tipps für Nutzer

### Für Angebotsgeber (wie Bob)

#### ⚠️ Secret gut aufbewahren!

```
✅ GUT:
• Passwort-Manager (1Password, Bitwarden, etc.)
• Papier-Notiz (sicher verwahrt)
• Screenshot (verschlüsselt gespeichert)

❌ SCHLECHT:
• Nur im Browser-Tab lassen
• Post-It am Monitor
• Unverschlüsselt in Cloud
```

**Ohne Secret:**
- ❌ Keine Interessenten sehen
- ❌ Kein Deal starten
- 💡 Angebot läuft nach 24h ab

---

### Für Interessenten (wie Alice)

#### ✅ Einfach & Unkompliziert

```
1. Angebot finden
2. "Interesse zeigen" klicken
3. Auf Auswahl warten
4. Bei Auswahl: Chatraum öffnen

� Kein Secret nötig!
💡 Alles automatisch!
```

---

## ❓ Häufige Fragen

<details>
<summary><strong>F: Kann der Server meine Daten lesen?</strong></summary>

**Antwort:** ❌ **Nein!**

```
Server sieht nur:
• Anonyme IDs: ANONYM_XYZ123
• Verschlüsselt: K8HJ3LP9...
• Timestamps

Server sieht NICHT:
❌ Wer Angebote erstellt
❌ Wer Interesse zeigt
❌ Inhalt der Nachrichten
❌ Wer ausgewählt wurde
❌ Chat-Nachrichten
```
</details>

<details>
<summary><strong>F: Sehen andere was ich mache?</strong></summary>

**Antwort:** ❌ **Nein!**

```
Andere sehen:
✅ Du bist in der Whitelist
✅ "Jemand" hat Angebot erstellt
✅ "Angebot wurde vergeben"

Andere sehen NICHT:
❌ Dass DU das Angebot erstellt hast
❌ Dass DU Interesse gezeigt hast
❌ Dass DU ausgewählt wurdest
```
</details>

<details>
<summary><strong>F: Was wenn ich mein Secret verliere?</strong></summary>

**Antwort:** ⚠️ **Angebot nicht mehr steuerbar**

```
Ohne Secret:
❌ Keine Interessenten sehen
❌ Kein Deal starten
❌ Nicht löschen

ABER:
✅ Angebot läuft nach 24h ab
✅ Neues Angebot möglich
```
</details>

<details>
<summary><strong>F: Ist das wirklich sicher?</strong></summary>

**Antwort:** ✅ **Ja, Bitcoin-Level!**

```
Technologie:
• SHA-256 (wie Bitcoin)
• secp256k1 (wie Bitcoin)
• AES-256 (Military Standard)

Knacken dauert:
• >1 Milliarde Jahre (AES-256)
• >100 Milliarden Jahre (secp256k1)

✅ Sicher gegen Server
✅ Sicher gegen Andere
✅ Sicher gegen Angriffe
```
</details>

<details>
<summary><strong>F: Warum bekommt nur Alice die Einladung?</strong></summary>

**Antwort:** � **Verschlüsselte Direktnachricht!**

```
Bob sendet:
• Verschlüsselte NIP-04 Nachricht an Alice
• Inhalt: Chatraum-ID (abc123xyz...)
• Nur Alice kann entschlüsseln

Angebot wird gelöscht:
• Status: "Vergeben" oder komplett weg
• Andere sehen: "Nicht mehr verfügbar"
• Niemand weiß dass Alice gewonnen hat

Privacy:
✅ Server kann Nachricht nicht lesen
✅ Andere wissen nicht wer ausgewählt wurde
✅ Nur Alice hat die Chatraum-ID
```

**Das ist Privacy by Design!** 🎭

</details>

---

## 🎓 Fazit

### Die 3 Kernphasen

```
1️⃣ ANGEBOT          2️⃣ INTERESSE          3️⃣ CHATRAUM
   Anonym              Verschlüsselt         P2P Direkt
   ↓                   ↓                     ↓
   ANONYM_XYZ123       K8HJ3LP9...           Alice ↔ Bob
```

### Privacy-Level

| Phase | Anonymität | Verschlüsselung | Server-Schutz |
|-------|-----------|----------------|---------------|
| **Angebot** | ✅ 100% | - | ✅ Ja |
| **Interesse** | ✅ 100% | ✅ NIP-04 | ✅ Ja |
| **Einladung** | ⚠️ Nur Bob & Alice | ✅ NIP-04 | ✅ Ja |
| **Chatraum** | ⚠️ Nur Bob & Alice | ✅ P2P | ✅ Kein Server! |

---

<div align="center">

**Deine Privatsphäre ist unsere Priorität! 🎭**

**[⬆ Nach oben](#-anonymität--privacy)**

---

*Letzte Aktualisierung: 18. November 2025*  
*Version 2.0 - Für Endnutzer optimiert*

</div>
