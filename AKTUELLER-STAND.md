# 📊 Technischer Status & Implementierung

> **Bitcoin-Tausch-Netzwerk - Vollständige Dokumentation**

[![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=flat)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue?style=flat)]()
[![Build](https://img.shields.io/badge/Build-Passing-brightgreen?style=flat)]()

**Stand:** 18. November 2025  
**Version:** 1.0.0  
**Status:** ✅ Vollständig implementiert & produktionsbereit

---

## 📋 Inhaltsverzeichnis

- [Überblick](#-überblick)
- [Workflow](#-workflow-von-der-gruppe-bis-zum-kontakt)
- [Architektur](#-architektur--technische-details)
- [P2P WebRTC Chat](#-p2p-webrtc-chat-implementierung)
- [Anonymitäts-Konzept](#-anonymitäts-konzept)
- [Code-Struktur](#-code-struktur-nach-refactoring)
- [Deployment](#-deployment--produktion)

---

## 🎯 Überblick

Ein **anonymes, dezentrales Bitcoin-Tausch-Netzwerk** auf Basis von Nostr + WebRTC:
- **Komplett anonym:** Niemand sieht wer Angebote erstellt oder Interesse zeigt
- **Dezentral:** Läuft auf Nostr-Relays, keine zentrale Datenbank
- **Privatsphäre:** Echte Identitäten nur verschlüsselt oder via P2P ausgetauscht
- **P2P Chat:** WebRTC-basierter Chat ohne Relay-Metadaten ([Chitchatter-Prinzip](https://github.com/jeremyckahn/chitchatter))

---

## 🚀 Workflow: Von der Gruppe bis zum Kontakt

### 1️⃣ **Admin erstellt Gruppe**

**Was macht der Admin?**
- Erstellt ein **Gruppen-Secret** (geheimer Text, z.B. "abcde12345")
- Konfiguriert das **Relay** (z.B. wss://damus.io)
- Erstellt eine **Whitelist** mit erlaubten Mitgliedern

**Was wird gespeichert?**

| Daten | Wo gespeichert? | Sichtbar für |
|-------|----------------|--------------|
| Relay-URL | Relay (öffentlich) | ✅ Alle |
| Admin-Pubkey | Relay (öffentlich) | ✅ Alle |
| Secret-Hash (SHA-256) | Relay (öffentlich) | ✅ Alle |
| **Whitelist (Pubkeys)** | Relay (öffentlich) | ✅ Alle |

⚠️ **Das Secret selbst wird NIE gespeichert!** Nur der Hash (Fingerabdruck).

**Admin teilt aus:**
- **Einladungs-Link** mit eingebettetem Secret → Als QR-Code oder Link
- Format: `https://app-url.com/join?secret=abcde12345`
- Mitglieder scannen QR-Code ODER klicken auf Link
- ➡️ Secret wird automatisch aus dem Link extrahiert

---

### 2️⃣ **Mitglied tritt Gruppe bei**

**Was macht das Mitglied?**
- Gibt das **Gruppen-Secret** ein (aus QR-Code oder Link)
- App berechnet automatisch die **Channel-ID** (Hash)
- App lädt die **Whitelist** vom Relay

**Whitelist-Check:**
- ✅ Pubkey auf Whitelist → Zugang gewährt
- ❌ Pubkey nicht auf Whitelist → Kein Zugang

**⚠️ Sicherheits-Hinweis:**

Die **Whitelist wird nur im Client geprüft**, nicht auf Relay-Ebene. Das Relay speichert alle Events, aber der Client filtert:

**Schutz-Mechanismen:**
1. **Secret-Hash Filter:** Nur Angebote mit richtigem `g`-Tag werden geladen
2. **Whitelist-Filter:** Client zeigt nur Events von Mitgliedern
3. **Channel-ID Filter:** Nur Events für diese Gruppe
4. ➡️ Angreifer bräuchten: Gruppen-Secret + Whitelist-Eintrag

**Wichtig:** Whitelist ist **öffentlich sichtbar** auf dem Relay!  
→ Jeder kann sehen WER Mitglied ist, aber nicht WER welches Angebot erstellt.

---

### 3️⃣ **Mitglied erstellt Angebot**

**Eingabe:**
```
Titel: "Tausche 0.1 BTC gegen EUR"
Details: "Frankfurt, Bargeschäft"
Angebots-Secret: "MeinGeheimesAngebot123"
```

**Was passiert?**
1. **Temp-Keypair wird aus Secret generiert** → Vollständige Anonymität!
2. **Event Kind 42** wird mit Temp-Pubkey signiert (NICHT mit echtem Pubkey!)
3. **Secret wird lokal gespeichert** (zum späteren Entschlüsseln der Interessenten)

**Was ist öffentlich sichtbar?**

| Daten | Sichtbar auf Relay? |
|-------|---------------------|
| Titel & Details | ✅ Ja (Klartext) |
| **Temp-Pubkey** | ✅ Ja |
| **Echter Pubkey** | ❌ NEIN! |

⚠️ **Wichtig:** Auf dem Relay sieht NIEMAND, wer das Angebot erstellt hat!

---

### 4️⃣ **Anderes Mitglied zeigt Interesse**

**Was macht der Interessent?**
- Klickt auf "Interesse zeigen" beim Angebot
- Generiert **eigenes Temp-Keypair** (für Anonymität)

**Was passiert?**
1. **Event Kind 30078** wird mit Temp-Pubkey signiert
2. **Content wird mit NIP-04 verschlüsselt:**
   - Algorithmus: ECDH + AES-256-CBC
   - Inhalt: Echter Pubkey + Name + Nachricht (JSON)
   - ➡️ Nur wer das **Angebots-Secret** kennt, kann entschlüsseln!

**Was ist öffentlich sichtbar?**

| Daten | Sichtbar auf Relay? |
|-------|---------------------|
| Temp-Pubkey (Interessent) | ✅ Ja |
| **Echter Pubkey** | ❌ NEIN! (verschlüsselt) |
| Content | ✅ Ja (verschlüsselter Blob) |

**Warum NIP-04 hier sicher ist:**
- ✅ Jedes Interesse-Signal = neue Temp-Keys (kein Key-Reuse!)
- ✅ Kein `p`-Tag im Event (volle Metadata-Privatsphäre)
- ✅ Perfect Forward Secrecy (jedes Signal isoliert)

---

### 5️⃣ **Angebots-Ersteller sieht Interessenten**

**Was passiert?**
1. App lädt Interesse-Signale vom Relay (gefiltert nach Angebots-ID)
2. App entschlüsselt mit **Angebots-Secret** → Zeigt echte Pubkeys
3. App zeigt Liste:
   ```
   💌 3 Interessenten:
   1. npub1abc... (Max Mustermann)
   2. npub1def... (Anna Schmidt)
   3. npub1ghi... (Tom Weber)
   ```

---

### 6️⃣ **Deal-Benachrichtigung & Chat-Einladung**

**Angebots-Ersteller wählt Interessenten aus:**

**Schritt 1: Room-ID Generierung**
- 16-stellige alphanumerische Room-ID (z.B. `a7k3m9x2p5w8q1z4`)
- Kryptographisch sicher zufällig

**Schritt 2: NIP-04 Benachrichtigung**
- **NUR der Gewinner** erhält verschlüsselte Nachricht mit Room-ID
- Verschlüsselung: Temp-Key → Temp-Key (maximale Anonymität!)
- Relay kann NICHT erkennen wer ausgewählt wurde
- Abgelehnte Interessenten sehen nur, dass Angebot gelöscht wurde

**Schritt 3: Modal-Popup**
- Beide Parteien sehen elegantes Modal mit Room-ID
- "🚀 Zum Chat" Button → Navigation zu `/deal/[roomId]`

**Privacy-Vorteil:**
- ✅ Relay sieht nur 1 Event (statt N für alle Interessenten)
- ✅ Nur Angebotsgeber und Gewinner kennen die Room-ID

---

### 7️⃣ **P2P WebRTC Chat**

**Vollständig implementiert - [Chitchatter-Prinzip](https://github.com/jeremyckahn/chitchatter):**

**P2P Verbindung:**
- **Technologie:** WebRTC über [Trystero](https://github.com/dmotz/trystero) (Torrent Strategy)
- **Keine zentrale Instanz:** Direkte Peer-to-Peer Verbindung
- **App-ID:** `bitcoin-swap-chat`
- **Room-ID:** Aus NIP-04 Nachricht (16 Zeichen)

**Identity Exchange (via P2P!):**
- User A sendet `{ name: "Max", npub: "npub1..." }` via WebRTC
- User B empfängt und sendet seine Identity zurück
- **WICHTIG:** Diese Daten gehen NIEMALS über Nostr-Relay!

**Chat-Features:**
- ✅ Echtzeit-Messaging (P2P)
- ✅ Namen anzeigen ("Max Mustermann: Hallo!")
- ✅ System-Nachrichten ("Max ist beigetreten")
- ✅ Peer-Counter & Connection-Status
- ✅ Dunkles Theme (Pink/Violett)
- ✅ Timestamps
- ✅ "Chat beenden" Button

**🔐 Privacy-Garantien:**
- ✅ Keine Relay-Metadaten (Chat läuft über WebRTC)
- ✅ Keine Timestamps auf Relay
- ✅ Identitäten nur P2P (Namen nie über Relay)
- ✅ Relay-unabhängig (funktioniert auch offline)

---

## 🔐 Privatsphäre & Anonymität

### Was ist ANONYM?

- **Wer erstellt Angebote?** → Nur Temp-Pubkeys sichtbar
- **Wer zeigt Interesse?** → Nur Temp-Pubkeys sichtbar
- **Wer tauscht mit wem?** → Komplett privat (P2P Chat)

### Was ist ÖFFENTLICH?

- **Whitelist:** Alle Mitglieds-Pubkeys sichtbar
- **Angebots-Inhalte:** Titel, Details (Klartext)
- **Gruppenkonfiguration:** Relay-URL, Secret-Hash

### Privacy-Strategie

```
ÖFFENTLICH:              PRIVAT:
- Wer Mitglied ist       - Wer welches Angebot erstellt
- Was angeboten wird     - Wer Interesse zeigt
- Welche Gruppe          - Wer mit wem dealt
```

**3-Phasen-Modell:**
1. **Marketplace:** Temp-Keypairs (anonym)
2. **Benachrichtigung:** NIP-04 (nur Gewinner)
3. **Chat:** P2P WebRTC (keine Relay-Metadaten)

---

## 📋 Technische Details

### Event-Kinds

| Kind | Beschreibung | Signiert mit | Verschlüsselt? |
|------|--------------|--------------|----------------|
| **42** | Marketplace-Angebot | Temp-Pubkey | ❌ Nein |
| **30078** | Interesse-Signal | Temp-Pubkey | ✅ Ja (NIP-04) |
| **30000** | GroupConfig/Whitelist | Admin-Pubkey | ❌ Nein |
| **0** | User-Profil | User-Pubkey | ❌ Nein |

### Verschlüsselung (NIP-04)

**Algorithmus:** ECDH + AES-256-CBC

```
1. Shared-Secret = ECDH(tempPrivKey_Sender, tempPubKey_Empfänger)
2. Ciphertext = AES-256-CBC(Shared-Secret, Plaintext, IV)
3. Plaintext = AES-256-CBC-Decrypt(Shared-Secret, Ciphertext, IV)
```

**Sicherheit:**
- ✅ ECDH: secp256k1 Curve (Bitcoin-Standard)
- ✅ AES-256-CBC: Industrie-Standard
- ✅ Neue Keys pro Angebot (kein Key-Reuse)
- ✅ Kein Metadata-Leak (keine `p`-Tags)

### Temp-Pubkey-Generierung

```
Secret → SHA-256 Hash → secp256k1 Keypair → Temp-Pubkey
```

**Eigenschaften:**
- Deterministisch: Gleiches Secret = gleicher Pubkey
- Einzigartig: Secret nicht aus Pubkey ableitbar
- Sicher: SHA-256 ist nicht reversibel

---

## 🎯 Roadmap

### Geplante Features

- **Deletion Events (Kind 5):** Angebote/Interessen aufräumen
- **Typing-Indikator:** "Partner schreibt..." (P2P)
- **Datei-Upload:** P2P File Transfer
- **Voice/Video Chat:** WebRTC nativ

---

## 📊 Relay-Query Tool

**Test-Script:** `test-relay-query.js`

Zeigt alle Events auf dem Relay:
```bash
./test-relay-query.js
```

**Ausgabe:**
- 📦 Marketplace-Angebote (mit Expiration-Check)
- 💌 Interesse-Signale (gruppiert nach Angeboten)
- 👤 User-Profile
- 🏗️ GroupConfigs
- 🔐 Whitelists (mit allen Mitgliedern)

---

## 📊 Status-Übersicht

| Feature | Status | Kommentar |
|---------|--------|-----------|
| Gruppen erstellen | ✅ | Admin-Funktion |
| Whitelist-Verwaltung | ✅ | Mitglieder hinzufügen/entfernen |
| Angebote erstellen | ✅ | Mit Temp-Pubkeys (anonym) |
| Interesse zeigen | ✅ | Verschlüsselt (NIP-04) |
| Interessenten anzeigen | ✅ | Entschlüsselung |
| Profile anzeigen | ✅ | Name, NIP-05 (nur Anzeige) |
| Room-ID Generierung | ✅ | 16 Zeichen alphanumerisch |
| NIP-04 Benachrichtigung | ✅ | Nur Gewinner (Privacy-optimiert) |
| Modal-Popups | ✅ | Dunkles Theme |
| P2P WebRTC Chat | ✅ | Trystero (Chitchatter) |
| Identity Exchange (P2P) | ✅ | Namen via WebRTC |
| Chat-UI | ✅ | Pink/Violett Theme |
| "Chat beenden" | ✅ | Zurück zum Marktplatz |
| Auto-Listener | ✅ | Prüft alle 10s |
| Deletion Events | ⏳ | Geplant |
| Typing-Indikator | ⏳ | Geplant |
| Datei-Upload | ⏳ | Geplant |

---

**🎉 Fazit:** Vollständiger Workflow von Angebot bis P2P Chat implementiert!

**Nutzer können:**
1. ✅ Gruppen erstellen/beitreten
2. ✅ Anonyme Angebote veröffentlichen
3. ✅ Interesse zeigen (verschlüsselt)
4. ✅ Modal-Benachrichtigungen erhalten
5. ✅ P2P Chat starten (ohne Relay-Metadaten)
6. ✅ Sicher & anonym kommunizieren
