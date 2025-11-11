# 📊 Aktueller Stand - Bitcoin-Tausch-Netzwerk

**Stand:** 11. November 2025  
**Status:** ✅ Kern-Features implementiert & funktionsfähig

---

## 🎯 Was ist implementiert?

Ein **anonymes, dezentrales Bitcoin-Tausch-Netzwerk** auf Basis von Nostr:
- **Komplett anonym:** Niemand sieht wer Angebote erstellt oder Interesse zeigt
- **Dezentral:** Läuft auf Nostr-Relays, keine zentrale Datenbank
- **Privatsphäre:** Echte Identitäten nur verschlüsselt gespeichert

---

## 🚀 Workflow: Von der Gruppe bis zum Kontakt

### 1️⃣ **Admin erstellt Gruppe**

**Was macht der Admin?**
- Erstellt ein **Gruppen-Secret** (geheimer Text, z.B. "BitcoinMünchen2025")
- Konfiguriert das **Relay** (z.B. wss://nostr-relay.online)
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
- Format: `https://app-url.com/join?secret=BitcoinMünchen2025`
- Mitglieder scannen QR-Code ODER klicken auf Link
- ➡️ Secret wird automatisch aus dem Link extrahiert

---

### 2️⃣ **Mitglied tritt Gruppe bei**

**Was macht das Mitglied?**
- Gibt das **Gruppen-Secret** ein
- App berechnet automatisch die **Channel-ID** (Hash)
- App lädt die **Whitelist** vom Relay

**Whitelist-Check:**
- ✅ Pubkey auf Whitelist → Zugang gewährt
- ❌ Pubkey nicht auf Whitelist → Kein Zugang

**⚠️ WICHTIG - Sicherheits-Hinweis:**
- **Whitelist wird NUR im Client geprüft**, nicht auf Relay-Ebene!
- **Relay speichert ALLE Events** (auch von Nicht-Mitgliedern)
- **Was bedeutet das?**
  - ✅ Client zeigt nur Angebote von Whitelist-Mitgliedern
  - ⚠️ Jemand kann direkt ans Relay Events senden (ohne Client)
  - ✅ Diese Events werden NICHT im Client angezeigt (gefiltert)
  - ✅ Ohne Gruppen-Secret können sie NICHT in richtigen Channel
  
**Schutz-Mechanismen:**
1. **Secret-Hash Filter:** Nur Angebote mit richtigem Secret-Hash (g-Tag) werden geladen
2. **Whitelist-Filter:** Client zeigt nur Events von bekannten Mitgliedern
3. **Channel-ID Filter:** Nur Events für diese Gruppe werden abgerufen
4. ➡️ Angreifer bräuchten: Gruppen-Secret + Whitelist-Eintrag

**Technisch möglich, aber nutzlos:**
- Jemand könnte Events direkt ans Relay senden
- Diese landen im "falschen" Channel (ohne Secret-Hash)
- Werden vom Client gefiltert und NICHT angezeigt
- ✅ Keine Gefahr für die Gruppe!

**Wichtig:** Whitelist ist **öffentlich sichtbar** auf dem Relay!  
→ Jeder kann sehen WER Mitglied ist, aber nicht WER welches Angebot erstellt.

---

### 3️⃣ **Mitglied erstellt Angebot**

**Was gibt das Mitglied ein?**
```
Titel: "Tausche 0.1 BTC gegen EUR"
Details: "Frankfurt, Bargeschäft"
Angebots-Secret: "MeinGeheimesAngebot123"
```

**Was passiert im Hintergrund?**

1. **Temp-Pubkey wird generiert:**
   - Aus dem Angebots-Secret wird ein **temporärer Keypair** abgeleitet
   - Dieser Keypair ist **nicht** der echte Keypair des Users!
   - ➡️ **Vollständige Anonymität auf dem Relay!**

2. **Angebot wird signiert & veröffentlicht:**
   - Event-Kind: **42** (Marketplace-Angebot)
   - Signiert mit: **Temp-Pubkey** (NICHT dem echten Pubkey!)
   - Tags: Channel-ID, Secret-Hash, Expiration (72h)

3. **Angebots-Secret wird lokal gespeichert:**
   - ⚠️ **WICHTIG:** Secret wird im Browser/App gespeichert (localStorage)
   - **Warum?** Damit du später:
     - ✅ Interessenten sehen kannst (zum Entschlüsseln benötigt)
     - ✅ Angebot löschen kannst (Beweis dass du der Ersteller bist)
     - ✅ Nachweisen kannst dass es dein Angebot ist
   - **Sicherheit:** Secret verlässt NIEMALS dein Gerät!

**Was ist öffentlich sichtbar?**

| Daten | Sichtbar? | Verschlüsselt? |
|-------|-----------|----------------|
| Titel & Details | ✅ Ja | ❌ Nein (Klartext) |
| **Temp-Pubkey** | ✅ Ja | ❌ Nein |
| **Echter Pubkey** | ❌ NEIN! | ✅ Im 'author' Tag (für NIP-17) |
| Channel-ID | ✅ Ja | ❌ Nein |
| Secret-Hash | ✅ Ja | ❌ Nein |

⚠️ **WICHTIG:** Auf dem Relay sieht NIEMAND, wer das Angebot erstellt hat!  
Nur der **Temp-Pubkey** ist sichtbar, nicht der echte User-Pubkey.

---

### 4️⃣ **Anderes Mitglied zeigt Interesse**

**Was macht der Interessent?**
- Sieht das Angebot in der Liste
- Klickt auf "Interesse zeigen"
- Gibt sein **Angebots-Secret** NICHT ein (hat er ja nicht!)

**Was passiert im Hintergrund?**

1. **Temp-Keypair für Anonymität:**
   - Interessent generiert **eigenes Temp-Keypair** (wie beim Angebot)
   - Wird aus einem zufälligen Secret abgeleitet
   - Event wird mit **Temp-PrivateKey signiert** → Temp-Pubkey im Event sichtbar

2. **Interesse-Signal wird erstellt:**
   - Event-Kind: **30078** (Interesse-Signal)
   - Signiert mit: **Temp-Pubkey des Interessenten** (NICHT seinem echten Pubkey!)
   - Content: **NIP-04 verschlüsselt** (echter Pubkey des Interessenten darin versteckt)

3. **Verschlüsselung (NIP-04 mit ECDH + AES-256-CBC):**
   - **Algorithmus:** Elliptic Curve Diffie-Hellman + AES-256-CBC
   - **Verschlüsselt mit:**
     - Temp-PrivateKey des Interessenten (Sender)
     - Temp-PublicKey des Angebots (Empfänger)
   - **Entschlüsselung nur möglich mit:**
     - Angebots-PrivateKey (Empfänger)
     - Temp-PublicKey des Interessenten (Sender, im Event sichtbar)
   - **Inhalt:** Echter Pubkey + Name + Nachricht (JSON)
   - ➡️ Nur wer das **Angebots-Secret** kennt, kann entschlüsseln!

**Warum NIP-04 hier SICHER ist:**
- ✅ Jedes Interesse-Signal = **neue Temp-Keys** (kein Key-Reuse!)
- ✅ Kein p-Tag im Event (volle Metadata-Privatsphäre)
- ✅ Perfect Forward Secrecy (jedes Signal isoliert)
- ✅ Einfacher als NIP-17, aber gleich sicher für diesen Use-Case!

**Was ist öffentlich sichtbar?**

| Daten | Sichtbar? | Verschlüsselt? |
|-------|-----------|----------------|
| **Temp-Pubkey (Interessent)** | ✅ Ja | ❌ Nein |
| **Echter Pubkey (Interessent)** | ❌ NEIN! | ✅ Ja (NIP-04) |
| Angebots-ID (e-Tag) | ✅ Ja | ❌ Nein |
| Content | ✅ Ja | ✅ Ja (verschlüsselter Blob) |

⚠️ **Auf dem Relay:** Niemand sieht, WER Interesse gezeigt hat!  
Nur ein verschlüsselter Text ist sichtbar.

---

### 5️⃣ **Angebots-Ersteller sieht Interessenten**

**Was sieht der Angebots-Ersteller?**

1. **App lädt Interesse-Signale vom Relay:**
   - Filtert nach seiner Angebots-ID
   - Findet alle Interesse-Signale (verschlüsselt)

2. **App entschlüsselt die Signale:**
   - Verwendet das **Angebots-Secret** (das nur der Ersteller kennt!)
   - Leitet daraus den **Temp-Keypair** ab
   - Entschlüsselt die **echten Pubkeys** der Interessenten

3. **App zeigt die Interessenten:**
   ```
   💌 3 Interessenten:
   1. npub1abc... (Max Mustermann)
   2. npub1def... (Anna Schmidt)
   3. npub1ghi... (Tom Weber)
   ```

**Was kann der Angebots-Ersteller jetzt tun?**
- Sieht die **echten Pubkeys** der Interessenten
- Kann deren **Profile** anzeigen (Name, NIP-05)
- ✅ **Kann jetzt Kontakt aufnehmen!**

---

### 6️⃣ **Kontaktaufnahme (aktueller Stand)**

**✅ Was funktioniert JETZT:**
- Angebots-Ersteller sieht **alle Interessenten** (Namen, Pubkeys)
- Kann deren **Profile** anzeigen
- Weiß WER Interesse gezeigt hat

**⏳ Was kommt als NÄCHSTES:**
- **Deal-Rooms:** Verschlüsselte 1:1 Chats (NIP-17)
- **Deal-Status:** Tracking von Deals (pending → accepted → completed)
- **Deal-Auswahl:** Anbieter kann einen Interessenten auswählen

**🎯 Aktuell:** Kontaktaufnahme muss **außerhalb der App** erfolgen  
(z.B. via andere Nostr-Clients, Signal, E-Mail)

---

## 🔐 Privatsphäre & Anonymität - Zusammenfassung

### ✅ Was ist ANONYM (auf dem Relay nicht sichtbar):

1. **Wer erstellt Angebote?**
   - ✅ Nur Temp-Pubkeys sichtbar
   - ❌ Echter Pubkey nur verschlüsselt im 'author' Tag

2. **Wer zeigt Interesse?**
   - ✅ Nur Temp-Pubkeys sichtbar
   - ❌ Echter Pubkey nur verschlüsselt im Content

3. **Wer tauscht mit wem?**
   - ✅ Komplett privat
   - ❌ Niemand auf dem Relay kann Verbindungen sehen

### ⚠️ Was ist ÖFFENTLICH (auf dem Relay sichtbar):

1. **Whitelist:**
   - ✅ Alle Mitglieds-Pubkeys sichtbar
   - ✅ Admin-Pubkey sichtbar
   - ➡️ Man kann sehen WER Mitglied ist

2. **Angebots-Inhalte:**
   - ✅ Titel, Details, Preis (Klartext)
   - ✅ Channel-ID, Secret-Hash
   - ➡️ Man kann Angebote lesen

3. **Gruppenkonfiguration:**
   - ✅ Relay-URL
   - ✅ Secret-Hash
   - ➡️ Man kann Gruppen-Metadaten sehen

### 🎭 Das Anonymitäts-Prinzip:

```
ÖFFENTLICH:          PRIVAT:
- Wer Mitglied ist   - Wer welches Angebot erstellt
- Was angeboten wird - Wer an welchem Angebot interessiert ist
- Welche Gruppe      - Wer mit wem dealt
```

---

## 📋 Technische Details (kurz & knapp)

### Event-Kinds (aktiv implementiert):

| Kind | Beschreibung | Signiert mit | Verschlüsselt? |
|------|--------------|--------------|----------------|
| **42** | Marketplace-Angebot | Temp-Pubkey | ❌ Nein (Klartext) |
| **30078** | Interesse-Signal | Temp-Pubkey | ✅ Ja (NIP-04: ECDH + AES-256-CBC) |
| **30000** | GroupConfig | Admin-Pubkey | ❌ Nein |
| **30000** | Whitelist | Admin-Pubkey | ❌ Nein |
| **0** | User-Profil | User-Pubkey | ❌ Nein |

### 🔐 Verschlüsselung (NIP-04):

**Algorithmus:** Elliptic Curve Diffie-Hellman (ECDH) + AES-256-CBC

**Wie funktioniert's?**
```
1. ECDH Key-Exchange:
   Shared-Secret = ECDH(tempPrivKey_Sender, tempPubKey_Empfänger)

2. AES-256-CBC Verschlüsselung:
   Ciphertext = AES-256-CBC(Shared-Secret, Plaintext, IV)

3. Entschlüsselung (nur für Anbieter):
   Plaintext = AES-256-CBC-Decrypt(Shared-Secret, Ciphertext, IV)
```

**Warum sicher?**
- ✅ **ECDH:** Kryptographisch sicherer Key-Exchange (secp256k1 Curve)
- ✅ **AES-256-CBC:** Industrie-Standard Verschlüsselung
- ✅ **Neue Keys pro Angebot:** Kein Key-Reuse Problem!
- ✅ **Kein Metadata-Leak:** Keine p-Tags, nur verschlüsselter Content

### Temp-Pubkey-Generierung:

```javascript
Angebots-Secret → SHA-256 Hash → Seed für Keypair → Temp-Pubkey
```

**Beispiel:**
```
Secret: "MeinGeheimesAngebot123"
  ↓
SHA-256: a1b2c3d4... (256-bit Hash)
  ↓
Keypair-Generierung: secp256k1 (Bitcoin-Curve)
  ↓
Temp-Pubkey: npub1xyz... (33 bytes compressed)
```

➡️ **Deterministisch:** Gleiches Secret = gleicher Temp-Pubkey  
➡️ **Einzigartig:** Niemand kann Secret aus Temp-Pubkey ableiten  
➡️ **Sicher:** SHA-256 ist nicht reversibel (One-Way-Function)

---

## 🎯 Nächste Schritte (geplant)

### 🔜 Deal-Status Tracking:
- Event-Kind **30081:** Deal-Status Updates
- Status: `pending` → `accepted` → `completed` / `cancelled`
- Öffentlich sichtbar (für Transparenz)

### 🔜 Deletion Events:
- Event-Kind **5:** Angebote/Interessen löschen (NIP-09)
- Aufräumen abgelaufener/abgeschlossener Deals

### 🔜 Deal-Rooms (NIP-17):
- Verschlüsselte 1:1 Chats zwischen Anbieter & Interessent
- Nur für ausgewählte Deals
- Komplett privat & verschlüsselt

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

## ✅ Status-Übersicht

| Feature | Status | Kommentar |
|---------|--------|-----------|
| Gruppen erstellen | ✅ Fertig | Admin-Funktion |
| Whitelist-Verwaltung | ✅ Fertig | Mitglieder hinzufügen/entfernen |
| Angebote erstellen | ✅ Fertig | Mit Temp-Pubkeys (anonym) |
| Interesse zeigen | ✅ Fertig | Verschlüsselt (NIP-04) |
| Interessenten anzeigen | ✅ Fertig | Entschlüsselung funktioniert |
| Profile anzeigen | ✅ Fertig | Name, NIP-05, etc. |
| Deal-Status | ⏳ Geplant | Kind 30081 |
| Deal-Rooms (Chat) | ⏳ Geplant | NIP-17 |
| Deletion Events | ⏳ Geplant | Kind 5 |

---

**🎉 Fazit:** Kern-Features funktionieren! Der komplette Workflow von Gruppen-Erstellung bis zur Anzeige der Interessenten ist implementiert und getestet.

**🔒 Privatsphäre:** Vollständige Anonymität auf dem Relay dank Temp-Pubkeys und NIP-04 Verschlüsselung!

**🚀 Nächste Schritte:** Deal-Status Tracking und Deal-Rooms für direkte Kommunikation.
