# Phase 2 – Angebots-Funktionalität & Bitcoin-Handel

## 🎯 Ziele von Phase 2

### Hauptfunktionen:
1. **🏷️ Angebots-Erstellung**: Bitcoin-Handelangebote mit 3 Zahlungsoptionen
2. **👀 Interesse zeigen**: Reaktionen auf Angebote (NIP-25)
3. **🎭 Anonymität**: Temporäre Schlüssel für anonyme Angebote
4. **📱 UI-Erweiterung**: Angebots-Raum neben Chat-Raum

---

## 📋 Phase 2 - Roadmap

### 🏗️ **Schritt 1: Angebots-Datenmodell**
- [ ] Angebots-Types definieren (TypeScript)
- [ ] Nostr-Event-Schema für Angebote (NIP-28 erweitern)
- [ ] Zahlungsoptionen-Struktur (Bargeld, Bank, PayPal)
- [ ] Validierung für Angebots-Daten

### 🎨 **Schritt 2: UI-Erweiterung**
- [ ] Angebots-Tab neben Chat-Tab
- [ ] Angebots-Erstellungs-Formular
- [ ] Angebots-Liste mit Filtern
- [ ] Interesse-Button (👀) für Angebote

### 🔧 **Schritt 3: Nostr-Integration**
- [ ] Angebots-Events senden/empfangen
- [ ] Interesse-Events (NIP-25 Reactions)
- [ ] Anonyme Schlüssel für Angebote
- [ ] Event-Filtering für Angebots-Channel

### 🛡️ **Schritt 4: Sicherheit & Anonymität**
- [ ] Temporäre Schlüsselpaare generieren
- [ ] Angebots-Verschlüsselung
- [ ] Interesse-Matching ohne Preisgabe der Identität
- [ ] Sichere Kontaktaufnahme

### 📱 **Schritt 5: Benutzerfreundlichkeit**
- [ ] Angebots-Benachrichtigungen
- [ ] Interesse-Übersicht
- [ ] Angebots-Status (aktiv/abgelaufen)
- [ ] Mobile-optimierte Angebots-Ansicht

---

## 🏷️ Angebots-Struktur (Geplant)

### Angebots-Event Schema:
```typescript
interface BitcoinOffer {
  id: string;
  type: 'buy' | 'sell';
  amount: number; // in Satoshis
  price: number; // in EUR
  paymentMethods: PaymentMethod[];
  location?: string;
  description?: string;
  expiresAt: number; // Unix timestamp
  anonymousKey: string; // Temporärer Public Key
  encrypted: boolean;
}

interface PaymentMethod {
  type: 'cash' | 'bank' | 'paypal';
  details?: string; // Verschlüsselte Details
}
```

### Interesse-Event Schema:
```typescript
interface OfferInterest {
  offerId: string;
  interestedParty: string; // Anonymer Public Key
  message?: string; // Verschlüsselte Nachricht
  contactMethod: 'nostr' | 'signal' | 'telegram';
}
```

---

## 🎭 Anonymitäts-Konzept

### Temporäre Schlüssel:
1. **Angebots-Erstellung**: Neues Schlüsselpaar für jedes Angebot
2. **Interesse zeigen**: Neues Schlüsselpaar für jede Interessensbekundung
3. **Kontaktaufnahme**: Verschlüsselte Kommunikation über temporäre Schlüssel
4. **Identitäts-Schutz**: Echte Identität bleibt verborgen bis zur Kontaktaufnahme

### Sicherheitsebenen:
- **Stufe 1**: Öffentliche Angebote (sichtbar für alle Gruppenmitglieder)
- **Stufe 2**: Verschlüsselte Details (nur bei Interesse entschlüsselt)
- **Stufe 3**: Direkte Kommunikation (außerhalb der Gruppe)

---

## 📱 UI-Mockup (Geplant)

```
┌─────────────────────────────────────┐
│ 🔐 Private Bitcoin-Gruppe           │
├─────────────────────────────────────┤
│ [💬 Chat] [🏷️ Angebote] [⚙️ Admin] │
├─────────────────────────────────────┤
│                                     │
│ 🏷️ Neues Angebot erstellen         │
│ ┌─────────────────────────────────┐ │
│ │ ○ Kaufe  ○ Verkaufe             │ │
│ │ Betrag: [____] Satoshis         │ │
│ │ Preis:  [____] EUR              │ │
│ │ Zahlung: ☑️ Bar ☑️ Bank ☐ PayPal │ │
│ │ Ort: [________________]         │ │
│ │ [Angebot erstellen]             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 📋 Aktuelle Angebote:               │
│ ┌─────────────────────────────────┐ │
│ │ 🟢 VERKAUFE 1M Sats für 650€   │ │
│ │ 💰 Bar, Bank | 📍 Wien         │ │
│ │ 👀 3 Interessenten [Details]    │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🔵 KAUFE 500k Sats für 320€    │ │
│ │ 💰 PayPal | 📍 Berlin          │ │
│ │ [👀 Interesse zeigen]           │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 🚀 Phase 2 - Startbereit

### ✅ **Solide Grundlage von Phase 1:**
- 🔐 Verschlüsselter Gruppen-Chat funktioniert
- 👥 Multi-User Kommunikation etabliert
- 📡 Nostr-Integration production-ready
- 🛡️ Sicherheits-Framework vorhanden
- 🎨 UI-Framework erweiterbar

### 🎯 **Nächste Schritte:**
1. **Angebots-Datenmodell** definieren
2. **UI-Tabs** für Angebote erweitern
3. **Nostr-Events** für Angebote implementieren
4. **Anonymitäts-Layer** aufbauen

**Phase 2 kann auf der stabilen Phase 1 Basis aufbauen! 🚀**

---

## 📊 Fortschritt Phase 2

### 🏗️ Schritt 1: Angebots-Datenmodell
- [ ] **In Arbeit**: Wird als nächstes implementiert

**Status: Bereit zum Start! 🚀**