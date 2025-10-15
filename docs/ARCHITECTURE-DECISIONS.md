# 🏗️ Architektur-Entscheidungen
## Warum keine NIP-29 Relay-basierte Gruppen?

**Datum:** 2025-01-15  
**Version:** 1.0.0

---

## 📋 Inhaltsverzeichnis

1. [Die Frage](#die-frage)
2. [Was ist NIP-29?](#was-ist-nip-29)
3. [Unsere Architektur](#unsere-architektur)
4. [Vergleich: NIP-29 vs. Unsere Lösung](#vergleich-nip-29-vs-unsere-lösung)
5. [Warum wir uns gegen NIP-29 entschieden haben](#warum-wir-uns-gegen-nip-29-entschieden-haben)
6. [Vorteile unserer Lösung](#vorteile-unserer-lösung)
7. [Nachteile unserer Lösung](#nachteile-unserer-lösung)
8. [Zukunftsperspektive](#zukunftsperspektive)

---

## 🤔 Die Frage

> "Warum verwendet ihr nicht NIP-29 (Relay-basierte Gruppen) und habt euch stattdessen für eine eigene AES-GCM-Lösung mit NIP-44/NIP-12/NIP-09 entschieden?"

**Kurze Antwort:** Maximale Privatsphäre, Kontrolle und Einfachheit für unseren spezifischen Use-Case (Bitcoin-Tauschgeschäfte).

---

## 📚 Was ist NIP-29?

**NIP-29** (Relay-based Groups) ist ein Nostr-Standard für **Relay-verwaltete Gruppen** mit folgenden Features:

### NIP-29 Architektur

```
┌─────────────────────────────────────────┐
│         NIP-29 Relay (Server)           │
│  ┌───────────────────────────────────┐  │
│  │   Group Management (Server-side)  │  │
│  │   - Mitgliederverwaltung          │  │
│  │   - Rollen & Permissions          │  │
│  │   - Moderation                    │  │
│  │   - Event-Validierung             │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           ↑           ↑           ↑
           │           │           │
      Client A     Client B     Client C
```

### NIP-29 Features

✅ **Server-seitige Gruppenverwaltung**
- Relay verwaltet Mitgliederliste
- Rollen-System (Admin, Moderator, Member)
- Automatische Zugriffskontrolle

✅ **Standardisiert**
- Offizieller Nostr-Standard
- Interoperabilität zwischen Clients
- Gemeinsame Event-Kinds (9000-9030)

✅ **Moderation**
- Admins können Mitglieder entfernen
- Nachrichten können gelöscht werden
- Rollen können geändert werden

### NIP-29 Event-Kinds

| Kind | Beschreibung |
|------|--------------|
| 9 | Group Chat Message |
| 10 | Group Chat Threaded Reply |
| 11 | Group Thread |
| 12 | Group Thread Reply |
| 9000 | Group Metadata |
| 9001 | Group Admins |
| 9002 | Group Members |
| 9003 | Add User |
| 9004 | Remove User |
| 9005 | Edit Metadata |
| 9006 | Delete Event |
| 9007 | Create Group |

---

## 🏗️ Unsere Architektur

### Unsere Lösung: Client-seitige Verschlüsselung

```
┌─────────────────────────────────────────┐
│      Standard Nostr Relay (Dumb)        │
│  ┌───────────────────────────────────┐  │
│  │   Nur Event-Speicherung           │  │
│  │   - Keine Gruppenverwaltung       │  │
│  │   - Keine Entschlüsselung         │  │
│  │   - Nur Event-Relay               │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
           ↑           ↑           ↑
           │           │           │
      ┌────────┐  ┌────────┐  ┌────────┐
      │Client A│  │Client B│  │Client C│
      │AES-GCM │  │AES-GCM │  │AES-GCM │
      │Encrypt │  │Decrypt │  │Decrypt │
      └────────┘  └────────┘  └────────┘
```

### Verwendete NIPs

| NIP | Verwendung | Zweck |
|-----|------------|-------|
| **NIP-01** | Basic Protocol | Event-Struktur, Signing |
| **NIP-09** | Event Deletion | Angebote/Interesse löschen |
| **NIP-12** | Generic Tag Queries | `#t=bitcoin-group` Filter |
| **NIP-17** | Gift-Wrapped DMs | Private Chats (Metadaten-Schutz) |
| **NIP-44** | Encrypted Payloads | Seal/Gift Wrap Verschlüsselung |
| **Custom** | AES-GCM | Gruppen-Verschlüsselung |

### Verschlüsselungs-Flow

```typescript
// 1. Gruppen-Nachricht (AES-GCM)
Secret → SHA-256 → GroupKey (256-bit)
Message → AES-GCM(GroupKey) → Encrypted
Encrypted → Nostr Event (Kind 1) → Relay

// 2. Private Chat (NIP-17)
Message → Rumor (Kind 14)
Rumor → Seal (Kind 13, NIP-44)
Seal → Gift Wrap (Kind 1059, NIP-44)
Gift Wrap → Relay
```

---

## ⚖️ Vergleich: NIP-29 vs. Unsere Lösung

### Architektur-Vergleich

| Aspekt | NIP-29 | Unsere Lösung |
|--------|--------|---------------|
| **Gruppenverwaltung** | Server-seitig (Relay) | Client-seitig (Secret) |
| **Verschlüsselung** | Optional, nicht standardisiert | Pflicht, AES-GCM + NIP-44 |
| **Relay-Anforderungen** | Spezieller NIP-29 Relay | Jeder Standard-Relay |
| **Metadaten-Schutz** | Relay sieht Mitglieder | Relay sieht nur verschlüsselte Events |
| **Zugriffskontrolle** | Relay validiert | Client validiert (Whitelist) |
| **Interoperabilität** | Hoch (Standard) | Niedrig (Custom) |
| **Komplexität** | Hoch (Server-Logik) | Niedrig (Client-Logik) |

### Feature-Vergleich

| Feature | NIP-29 | Unsere Lösung |
|---------|--------|---------------|
| Gruppen-Chat | ✅ Kind 9 | ✅ Kind 1 + AES-GCM |
| Private Chat | ❌ Nicht Teil von NIP-29 | ✅ NIP-17 Gift-Wrapped |
| Mitgliederverwaltung | ✅ Server-seitig | ✅ Client-seitig (Whitelist) |
| Rollen-System | ✅ Admin/Mod/Member | ⚠️ Nur Admin (Whitelist) |
| Moderation | ✅ Server-seitig | ⚠️ Client-seitig (NIP-09) |
| Verschlüsselung | ⚠️ Optional | ✅ Pflicht (AES-GCM) |
| Metadaten-Schutz | ❌ Relay sieht alles | ✅ Relay sieht nur Encrypted |
| Anonyme Angebote | ❌ Nicht vorgesehen | ✅ Temp-Keypairs |
| Relay-Unabhängigkeit | ❌ Braucht NIP-29 Relay | ✅ Jeder Standard-Relay |

---

## 🚫 Warum wir uns gegen NIP-29 entschieden haben

### 1. **Privatsphäre-Anforderungen** 🔐

**Problem mit NIP-29:**
- Relay sieht **alle Gruppenmitglieder** (Public Keys)
- Relay sieht **wer mit wem kommuniziert**
- Relay kann **Nachrichten-Metadaten analysieren**
- Keine **Ende-zu-Ende-Verschlüsselung** standardisiert

**Unser Use-Case:**
- Bitcoin-Tauschgeschäfte erfordern **maximale Privatsphäre**
- Relay sollte **nichts über Teilnehmer** wissen
- **Metadaten-Schutz** ist kritisch

**Unsere Lösung:**
```typescript
// Relay sieht nur:
{
  kind: 1,
  content: "a8f3b2c1d4e5...", // Verschlüsselt
  tags: [["t", "bitcoin-group"]], // Nur generischer Tag
  pubkey: "random..." // Kann temporär sein
}

// Relay weiß NICHT:
// - Wer die Gruppenmitglieder sind
// - Was der Nachrichteninhalt ist
// - Welche Gruppe es ist (nur Hash)
```

### 2. **Relay-Abhängigkeit** 🌐

**Problem mit NIP-29:**
- Braucht **speziellen NIP-29-fähigen Relay**
- Nicht alle Relays unterstützen NIP-29
- **Vendor Lock-in** zu NIP-29 Relays
- Migration schwierig

**Unsere Lösung:**
- Funktioniert mit **jedem Standard-Relay**
- Nur NIP-01 (Basic) + NIP-12 (Tags) erforderlich
- **Relay-Wechsel** jederzeit möglich
- Eigener Relay einfach aufzusetzen

### 3. **Kontrolle & Zensur-Resistenz** 🛡️

**Problem mit NIP-29:**
- Relay-Admin kann:
  - Mitglieder entfernen
  - Nachrichten löschen
  - Gruppe schließen
- **Zentralisierte Kontrolle** beim Relay

**Unsere Lösung:**
- **Keine zentrale Autorität**
- Nur wer das Secret kennt, kann teilnehmen
- Relay kann Gruppe nicht kontrollieren
- **Zensur-resistent** (Relay sieht nur Encrypted)

### 4. **Anonyme Marketplace-Angebote** 🎭

**Problem mit NIP-29:**
- Alle Mitglieder sind bekannt
- Keine **temporären Identitäten**
- Angebote sind mit echter Identity verknüpft

**Unser Use-Case:**
- Marketplace braucht **Anonymität**
- Temporäre Keypairs für Angebote
- Nur bei Interesse wird Identity offenbart

**Unsere Lösung:**
```typescript
// Angebot mit Temp-Keypair
const { privateKey, publicKey } = generateTempKeypair();
await createMarketplaceOffer(content, tempPrivateKey);

// Niemand weiß wer der Anbieter ist
// Erst bei Chat-Start wird Identity offenbart (NIP-17)
```

### 5. **Einfachheit** 🎯

**NIP-29 Komplexität:**
- Server-seitige Gruppenverwaltung
- Rollen-System implementieren
- Permissions-Logik
- Event-Validierung auf Relay
- Komplexe State-Synchronisation

**Unsere Lösung:**
- **Client-seitige Logik** (einfacher)
- Nur Verschlüsselung/Entschlüsselung
- Kein komplexes Rollen-System
- Standard-Relay reicht

### 6. **Spezifischer Use-Case** 💼

**NIP-29 ist designed für:**
- Öffentliche/Semi-öffentliche Gruppen
- Viele Mitglieder (100+)
- Komplexe Moderation
- Interoperabilität zwischen Clients

**Unser Use-Case:**
- **Private, geschlossene Gruppen**
- Wenige Mitglieder (5-20)
- Einfache Whitelist-Verwaltung
- **Bitcoin-Tausch-spezifisch**

---

## ✅ Vorteile unserer Lösung

### 1. **Maximale Privatsphäre** 🔐

```
NIP-29:  Relay weiß alles über die Gruppe
Unsere:  Relay weiß NICHTS über die Gruppe
```

- **Ende-zu-Ende-Verschlüsselung** (AES-GCM 256-bit)
- **Metadaten-Schutz** (Relay sieht nur Encrypted)
- **Anonyme Angebote** (Temp-Keypairs)
- **NIP-17 Private Chats** (Gift-Wrapping)

### 2. **Relay-Unabhängigkeit** 🌐

- Funktioniert mit **jedem Standard-Relay**
- Kein spezieller NIP-29 Relay nötig
- **Relay-Wechsel** jederzeit möglich
- Eigener Relay einfach aufzusetzen

### 3. **Zensur-Resistenz** 🛡️

- Relay kann Gruppe **nicht kontrollieren**
- Keine zentrale Autorität
- Nur Secret-Besitzer haben Zugriff
- **Unveränderbar** durch Relay-Admin

### 4. **Einfachheit** 🎯

- Keine komplexe Server-Logik
- Client-seitige Verschlüsselung
- Standard-Relay reicht
- Einfach zu deployen

### 5. **Flexibilität** 🔧

- **Custom Features** einfach hinzufügen
- Nicht an NIP-29 Standard gebunden
- Marketplace-spezifische Funktionen
- Temp-Keypairs für Anonymität

---

## ⚠️ Nachteile unserer Lösung

### 1. **Keine Interoperabilität** 🔌

**Problem:**
- Andere Nostr-Clients können nicht teilnehmen
- Nur unser Client versteht die Verschlüsselung
- Kein Standard-Protokoll

**Mitigation:**
- Für unseren Use-Case nicht kritisch
- Bitcoin-Tausch ist spezialisiert
- Alle Nutzer verwenden unseren Client

### 2. **Secret-Management** 🔑

**Problem:**
- Secret muss sicher geteilt werden
- Verlust des Secrets = Verlust des Zugriffs
- Keine Server-seitige Wiederherstellung

**Mitigation:**
- Einladungslinks mit Secret
- Backup-Strategien dokumentiert
- Admin kann neue Gruppe erstellen

### 3. **Keine Server-seitige Moderation** 🚫

**Problem:**
- Spam kann nicht vom Relay blockiert werden
- Missbrauch schwerer zu verhindern
- Nur Client-seitige Filterung

**Mitigation:**
- Whitelist-System (nur autorisierte Nutzer)
- Rate-Limiting im Client
- NIP-09 Delete Events

### 4. **Skalierung** 📈

**Problem:**
- Alle Clients müssen alle Events entschlüsseln
- Bei vielen Nachrichten Performance-Impact
- Keine Server-seitige Filterung

**Mitigation:**
- NIP-12 Tag-Filter (`#t=bitcoin-group`)
- Limit-Parameter für Pagination
- Since-Parameter für Updates
- Für kleine Gruppen (5-20) kein Problem

---

## 🔮 Zukunftsperspektive

### Mögliche Migration zu NIP-29

**Wann macht NIP-29 Sinn?**

1. **Größere Gruppen** (100+ Mitglieder)
2. **Öffentliche Gruppen** (Privatsphäre weniger kritisch)
3. **Interoperabilität** gewünscht (andere Clients)
4. **Komplexe Moderation** erforderlich

### Hybrid-Ansatz

**Beste beider Welten:**

```
┌─────────────────────────────────────────┐
│         NIP-29 Relay                    │
│  - Gruppenverwaltung                    │
│  - Mitgliederliste                      │
└─────────────────────────────────────────┘
           ↑
           │ + Client-seitige Verschlüsselung
           ↓
      ┌────────┐
      │ Client │
      │AES-GCM │
      └────────┘
```

**Vorteile:**
- NIP-29 Gruppenverwaltung
- + Unsere Ende-zu-Ende-Verschlüsselung
- = Beste Privatsphäre + Interoperabilität

**Nachteil:**
- Komplexer zu implementieren
- Braucht NIP-29 Relay

---

## 📊 Entscheidungsmatrix

### Wann NIP-29 verwenden?

| Kriterium | NIP-29 | Unsere Lösung |
|-----------|--------|---------------|
| Große Gruppen (100+) | ✅ Besser | ❌ Skaliert schlechter |
| Öffentliche Gruppen | ✅ Besser | ❌ Overkill |
| Interoperabilität | ✅ Besser | ❌ Nicht möglich |
| Komplexe Moderation | ✅ Besser | ❌ Limitiert |
| Maximale Privatsphäre | ❌ Schlechter | ✅ Besser |
| Anonyme Angebote | ❌ Nicht möglich | ✅ Besser |
| Relay-Unabhängigkeit | ❌ Schlechter | ✅ Besser |
| Einfachheit | ❌ Komplexer | ✅ Einfacher |
| Bitcoin-Tausch Use-Case | ❌ Nicht optimal | ✅ Perfekt |

---

## 🎯 Fazit

### Warum unsere Lösung für Bitcoin-Tausch optimal ist:

1. **Maximale Privatsphäre** 🔐
   - Ende-zu-Ende-Verschlüsselung
   - Metadaten-Schutz
   - Anonyme Angebote

2. **Kontrolle** 🛡️
   - Keine zentrale Autorität
   - Zensur-resistent
   - Secret-basierter Zugriff

3. **Einfachheit** 🎯
   - Client-seitige Logik
   - Standard-Relay reicht
   - Einfach zu deployen

4. **Flexibilität** 🔧
   - Custom Features möglich
   - Marketplace-spezifisch
   - Temp-Keypairs

### NIP-29 wäre besser für:

- Große, öffentliche Gruppen
- Interoperabilität zwischen Clients
- Komplexe Moderation
- Standard-Compliance

### Unsere Entscheidung:

**Für Bitcoin-Tauschgeschäfte ist Privatsphäre wichtiger als Interoperabilität.**

Wir haben bewusst **maximale Privatsphäre** über **Standard-Compliance** gestellt, weil:
- Bitcoin-Tausch sensible Daten sind
- Anonymität kritisch ist
- Kleine, geschlossene Gruppen
- Spezifischer Use-Case

---

## 📚 Referenzen

- [NIP-29 Specification](https://github.com/nostr-protocol/nips/blob/master/29.md)
- [NIP-01 Basic Protocol](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [NIP-09 Event Deletion](https://github.com/nostr-protocol/nips/blob/master/09.md)
- [NIP-12 Generic Tag Queries](https://github.com/nostr-protocol/nips/blob/master/12.md)
- [NIP-17 Private Direct Messages](https://github.com/nostr-protocol/nips/blob/master/17.md)
- [NIP-44 Encrypted Payloads](https://github.com/nostr-protocol/nips/blob/master/44.md)

---

**Erstellt von:** Bitcoin-Tausch-Netzwerk Team  
**Datum:** 2025-01-15  
**Version:** 1.0.0