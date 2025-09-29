# 🎯 MASTERPLAN - Bitcoin-Tausch-Netzwerk

## 🌟 **VISION: Was wollen wir erreichen?**

**Ein dezentrales, anonymes Bitcoin-Tausch-Netzwerk über Nostr, das es ermöglicht:**
- 🔒 **Private Gruppen** mit verschlüsseltem Chat über Einladungslinks
- 💰 **Anonyme Bitcoin-Angebote** mit temporären Identitäten
- 🤝 **Sichere Kontaktaufnahme** zwischen Käufern und Verkäufern
- 🌐 **Vollständig dezentral** ohne eigene Server

---

## 📋 **PHASEN-ÜBERSICHT**

### ✅ **PHASE 1: Verschlüsselter Gruppen-Chat** 
**Status: ABGESCHLOSSEN**

**Ziel:** Private Chat-Gruppe mit Einladungslink-Zugang

**Was funktioniert:**
- Verschlüsselte Nachrichten über Nostr (NIP-28)
- Zugang über speziellen Einladungslink mit Secret
- Clientseitige Ver-/Entschlüsselung mit PBKDF2
- Mitgliederliste und Echtzeit-Chat

**Technische Umsetzung:**
```
Einladungslink: meine-app://gruppe?relay=wss://relay.com&secret=GeheimesPasswort
→ Alle Nachrichten verschlüsselt mit Secret-abgeleitetem Schlüssel
→ Nur Mitglieder mit Secret können mitlesen
```

---

### ✅ **PHASE 2: Bitcoin-Angebotssystem**
**Status: ABGESCHLOSSEN (vereinfacht)**

**Ziel:** Einfache Textarena für Bitcoin-Angebote

**Was funktioniert:**
- Schlichte Textangebote ohne komplexe Filter
- Reaktionssystem (👀 Interessiert, 👍 Gefällt mir, ❓ Frage)
- Löschfunktion für Angebotssteller
- Benachrichtigungen bei Reaktionen
- Echte Nostr-Events über WebSocket-Relays

**Aktuelle Implementierung:**
```typescript
// Angebot erstellen (Kind 30403)
await simpleOffers.create("Verkaufe 1M Sats für 650€");

// Reaktion senden (Kind 7)
await simpleOffers.react(offer, 'interested', 'Können wir uns treffen?');

// Benachrichtigung (Kind 4)
→ Angebotssteller erhält sofort verschlüsselte Nachricht
```

---

### 🔄 **PHASE 3: Anonymität für Angebote**
**Status: GEPLANT - NÄCHSTER SCHRITT**

**Ziel:** Angebote werden mit temporären Identitäten erstellt

**Was wir implementieren müssen:**

**3.1 Temporäre Schlüsselgenerierung**
```typescript
// Beim Erstellen eines anonymen Angebots
const tempKeyPair = await generateEphemeralKeys();
// → temp_privkey, temp_pubkey für dieses Angebot

// Lokales Mapping speichern
localStorage.setItem('temp_mappings', JSON.stringify({
  [temp_pubkey]: real_user_pubkey
}));
```

**3.2 Anonyme Event-Signierung**
```typescript
// Angebot mit temporärem Schlüssel signieren
const anonymousOffer = await signEvent({
  kind: 30403,
  content: "Verkaufe 1M Sats für 650€",
  tags: [["t", "payment_rechnung"], ["t", "payment_bargeld"]]
}, temp_privkey); // ← Temporärer Schlüssel statt echter
```

**3.3 Zahlungsoptionen als Tags**
- `["t", "payment_rechnung"]` - Rechnung
- `["t", "payment_bargeld"]` - Bargeld  
- `["t", "payment_ueberweisung"]` - Überweisung

---

### 🔄 **PHASE 4: Angebotsannahme & Privater Chat**
**Status: GEPLANT**

**Ziel:** Sichere Kontaktaufnahme zwischen Anbieter und Interessent

**4.1 Interesse zeigen**
```typescript
// Andere reagieren auf anonymes Angebot
await reactToAnonymousOffer(temp_pubkey, "❤️");
// → Anbieter sieht Interessentenliste
```

**4.2 Auswahl und Privatchat-Start**
```typescript
// Anbieter wählt Interessenten aus
const selectedUser = await selectInterested(user_pubkey);

// Privaten Chat starten (NIP-17)
await startPrivateChat({
  from: real_user_pubkey,    // Echte Identität des Anbieters
  to: selectedUser.pubkey,   // Echter Interessent
  offer_context: temp_pubkey // Referenz zum ursprünglichen Angebot
});
```

**4.3 Angebot automatisch löschen (NIP-09)**
```typescript
// Sobald Privatchat startet
await deleteOffer(temp_pubkey, temp_privkey);
// → Angebot verschwindet aus Hauptgruppe
```

---

### 🔄 **PHASE 5: UI/UX & Deployment**
**Status: TEILWEISE ABGESCHLOSSEN**

**Noch zu implementieren:**
- **Anonymitäts-Toggle** in Angebotserstellung
- **Interessentenliste** für Angebotssteller
- **Privatchat-Interface** (NIP-17)
- **Deployment** auf statischem Hosting

---

## 🎯 **AKTUELLE PRIORITÄTEN**

### **SOFORT (Phase 3):**
1. **Temporäre Schlüsselgenerierung** implementieren
2. **Anonyme Angebotserstellung** mit temp_privkey
3. **Lokales Mapping** temp_pubkey ↔ real_pubkey
4. **UI-Toggle** für "Anonymes Angebot"

### **DANACH (Phase 4):**
1. **Interessentenliste** für Angebotssteller
2. **Privatchat-System** (NIP-17) implementieren
3. **Automatische Angebotslöschung** bei Chat-Start

### **ABSCHLUSS (Phase 5):**
1. **UI-Polishing** für alle neuen Features
2. **Testing** der Anonymitätsfunktionen
3. **Deployment** als statische Web-App

---

## 🔧 **TECHNISCHE ARCHITEKTUR**

### **Nostr-Event-Types:**
- **Kind 30403:** Bitcoin-Angebote (anonym mit temp_pubkey)
- **Kind 7:** Reaktionen auf Angebote
- **Kind 4:** Verschlüsselte Benachrichtigungen
- **Kind 9:** Angebotslöschung (mit temp_privkey)
- **Kind 17:** Private Chats (Gift Wrap)

### **Anonymitäts-Flow:**
```
1. User klickt "Anonymes Angebot erstellen"
   ↓
2. System generiert temp_privkey/temp_pubkey
   ↓
3. Angebot wird mit temp_privkey signiert
   ↓
4. Mapping temp_pubkey → real_pubkey lokal gespeichert
   ↓
5. Andere sehen Angebot von "unbekanntem" temp_pubkey
   ↓
6. Bei Interesse: Privatchat mit echten Identitäten
   ↓
7. Angebot wird automatisch gelöscht
```

---

## 📊 **ERFOLGS-METRIKEN**

### **Funktionalität:**
- ✅ Verschlüsselter Gruppenchat
- ✅ Einfache Angebotserstellung
- ✅ Reaktionssystem
- 🔄 Anonyme Angebote
- 🔄 Privater Chat
- 🔄 Automatische Löschung

### **Sicherheit:**
- ✅ Ende-zu-Ende-Verschlüsselung
- ✅ Echte Nostr-Integration
- 🔄 Temporäre Identitäten
- 🔄 Sichere Schlüsselverwaltung

### **Benutzerfreundlichkeit:**
- ✅ Intuitive UI
- ✅ Mobile-optimiert
- ✅ Echtzeit-Updates
- 🔄 Anonymitäts-Toggle
- 🔄 Privatchat-Interface

---

## 🚀 **NÄCHSTE SCHRITTE**

**1. PHASE 3 starten:** Anonymitätsfunktionen implementieren
**2. Temporäre Schlüssel:** Ephemeral Key Generation
**3. UI erweitern:** Anonymitäts-Toggle hinzufügen
**4. Testing:** Anonymitätsfunktionen testen
**5. PHASE 4:** Privatchat-System implementieren

**Ziel:** Vollständig anonymes Bitcoin-Tausch-Netzwerk mit sicherer Kontaktaufnahme! 🎯