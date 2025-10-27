# 📡 Relay-Operationen Dokumentation

Alle Events die auf das Nostr-Relay geschrieben werden, chronologisch sortiert.

---

## 🎯 Workflow-Übersicht

1. **Gruppe erstellen** → Admin initialisiert Gruppe mit Secret
2. **Whitelist verwalten** → Admin fügt erlaubte NPubs hinzu/entfernt sie
3. **Angebot erstellen** → User erstellt Bitcoin-Tausch-Angebot (Kind 42)
4. **Interesse zeigen** → Interessent sendet NIP-17 DM an Anbieter
   - ⚡️ **Jeder Interessent = 1 private DM zwischen Anbieter ↔ Interessent**
   - ⚡️ **Mehrere Interessenten = Mehrere separate DM-Konversationen**
5. **Partner auswählen** → Anbieter wählt EINE DM aus, in der er den Deal machen will
   - ✅ **Gewählte DM = Deal-Room** (der Chat läuft in dieser NIP-17 DM weiter!)
   - 🗑️ Alle anderen DMs werden ignoriert/gelöscht
   - 🗑️ Marketplace-Angebot wird gelöscht
6. **Deal aushandeln** → Deal wird im privaten NIP-17 DM-Chat abgeschlossen

**Wichtig:** Es gibt KEINEN separaten "Deal-Room-Chat"! Die NIP-17 DM IST der Deal-Room! 🎯

---

## 🎯 **1. Gruppe erstellen**

### **Operation:**
Admin erstellt neue Gruppe mit Secret

### **Relay-Events:**

**Event 1: Group Config (Kind 30000)**
- **Was:** Gruppen-Konfiguration
- **Autor:** Admin-Pubkey
- **Content:** Verschlüsselt (GroupConfig JSON)
- **Tags:**
  - `d`: `group-config-{secretHash}`
  - `channel`: `{channelId}`
- **Aktion:** `WRITE` - Einmalig beim Erstellen

**Beispiel-Query:**
```javascript
{
  kinds: [30000],
  '#d': [`group-config-${secretHash}`],
  limit: 1
}
```

---

## 👥 **2. Whitelist verwalten**

### **2a. Whitelist erstellen/aktualisieren**

**Event: Whitelist (Kind 30000)**
- **Was:** Liste erlaubter NPubs
- **Autor:** Admin-Pubkey
- **Content:** JSON Array `["npub1...", "npub2..."]`
- **Tags:**
  - `d`: `whitelist-{channelId}`
  - `t`: `whitelist`
  - `channel`: `{channelId}`
- **Aktion:** `WRITE/UPDATE` - Bei jedem Hinzufügen/Entfernen

**Beispiel-Query:**
```javascript
{
  kinds: [30000],
  authors: [adminPubkey],
  '#d': [`whitelist-${channelId}`],
  limit: 1
}
```

### **2b. User aus Whitelist entfernen**

- **Was:** Whitelist-Event wird aktualisiert
- **Aktion:** `UPDATE` - Neues Event mit aktualisierter Liste
- **Alte Events:** Werden durch neueres Event ersetzt (NIP-33)

---

## 🏪 **3. Marketplace - Angebot erstellen**

### **Operation:**
User erstellt Bitcoin-Tausch-Angebot

**Event: Marketplace Offer (Kind 42)**
- **Was:** Öffentliches Tausch-Angebot
- **Autor:** Temp-Keypair Public Key (anonym)
- **Content:** Angebots-Text
- **Tags:**
  - `e`: `{channelId}`
  - `expiration`: `{timestamp}` (72h später)
- **Aktion:** `WRITE` - Beim Erstellen

**Temp-Keypair:**
- Wird lokal generiert und im LocalStorage gespeichert
- Verknüpft mit Real-User via Author-Tag in NIP-17 DMs

**Beispiel-Query:**
```javascript
{
  kinds: [42],
  '#e': [channelId],
  limit: 100
}
```

---

## 🗑️ **4. Marketplace - Angebot löschen**

### **Operation:**
User löscht sein Angebot

**Event: Deletion Event (Kind 5)**
- **Was:** Löscht vorheriges Angebot-Event
- **Autor:** Temp-Keypair Public Key (muss übereinstimmen!)
- **Content:** Optional: Lösch-Grund
- **Tags:**
  - `e`: `{offerEventId}` (ID des zu löschenden Events)
- **Aktion:** `WRITE` - Beim Löschen

**Wichtig:**
- Nur der Ersteller (gleicher Temp-Pubkey) kann löschen
- Relay entfernt das Original-Event nach Verarbeitung

**Beispiel-Query:**
```javascript
{
  kinds: [5],
  '#e': [offerEventId],
  limit: 10
}
```

---

## 💌 **4. Interesse zeigen - NIP-17 DM starten**

### **Operation:**
Interessent zeigt Interesse → **Startet private NIP-17 DM-Konversation**

**⚡️ DAS IST DER WICHTIGSTE SCHRITT:**
- Jeder Interessent bekommt SEINE EIGENE private DM mit dem Anbieter
- Der Anbieter hat dann MEHRERE DM-Konversationen (eine pro Interessent)
- Später wählt er EINE dieser DMs aus → Das wird der Deal-Room!

### **Relay-Events:**

**Event 1: Interest Tracking (Kind 30078)**
- **Was:** Trackt gesendete Interests des Users (für UI-State)
- **Autor:** Real-User Pubkey (Interessent)
- **Content:** JSON `{ temp_pubkey: "...", timestamp: ... }`
- **Tags:**
  - `d`: `interest-{offerId}`
  - `app`: `bitcoin-swap-interests`
- **Aktion:** `WRITE` - Bei jedem Interest

**Event 2: Encrypted DM (Kind 14) - NIP-17**
- **Was:** 🔥 **PRIVATE DM-KONVERSATION ZWISCHEN ANBIETER ↔ INTERESSENT**
- **Autor:** Interessent-Pubkey (Gift-Wrapped!)
- **Content:** Verschlüsselt via NIP-17
  - `type`: `deal-request`
  - `message`: "Hallo, ich hätte Interesse an deinem Angebot..."
  - `offerId`: Angebots-ID
  - `temp_pubkey`: Temp-Pubkey vom Interessent (nur für Referenz)
- **Tags:**
  - `p`: `{anbieterRealPubkey}` (Empfänger)
- **Aktion:** `WRITE` - NIP-17 Gift-Wrapping

**💬 Ab jetzt können BEIDE in dieser DM schreiben:**
- Interessent kann weitere Nachrichten schicken
- Anbieter kann zurückschreiben
- **= Private Konversation wie WhatsApp 1:1 Chat**

**Beispiel-Query Interest:**
```javascript
{
  kinds: [30078],
  authors: [userPubkey],
  limit: 100
}
```

**Beispiel-Query DMs (alle an mich):**
```javascript
{
  kinds: [14],
  '#p': [myPubkey],
  limit: 50
}
```

---

## 🔙 **5. Interesse zurückziehen**

### **Operation:**
User zieht sein Interest zurück

**Event: Withdrawal DM (Kind 14)**
- **Was:** Info an Angebotsgeber über Rückzug
- **Autor:** User-Pubkey
- **Content:** Verschlüsselt
  - `type`: `withdraw`
  - `timestamp`: ...
- **Tags:**
  - `p`: `{tempOfferPubkey}`
- **Aktion:** `WRITE`

**Interest-Event (Kind 30078):**
- Bleibt bestehen (wird nur lokal ignoriert)

---

## 🔙 **5. Interesse zurückziehen**

### **Operation:**
User zieht sein Interest zurück (bevor Anbieter ihn gewählt hat)

**Event: Withdrawal DM (Kind 14)**
- **Was:** Info an Angebotsgeber über Rückzug (in der bestehenden DM!)
- **Autor:** User-Pubkey (Interessent)
- **Content:** Verschlüsselt
  - `type`: `withdraw`
  - `message`: "Ich ziehe mein Interesse zurück"
  - `timestamp`: ...
- **Tags:**
  - `p`: `{anbieterPubkey}`
- **Aktion:** `WRITE` - Neue Nachricht in bestehender DM

**Interest-Event (Kind 30078):**
- Bleibt bestehen (wird nur lokal ignoriert)

---

## 🤝 **6. Partner auswählen = Deal-Room aktivieren**

### **Operation:**
🔥 **Anbieter wählt EINE der DM-Konversationen aus → Diese DM IST der Deal-Room!**

**Was passiert:**
1. Anbieter hat mehrere DMs (eine pro Interessent)
2. Er wählt EINE Person aus
3. Diese bestehende DM wird zum "Deal-Room" markiert
4. Alle anderen DMs werden ignoriert
5. Marketplace-Angebot wird gelöscht

### **Relay-Events:**

**Event 1: Deal-Room Status Marker (Kind 30080)**
- **Was:** Markiert die DM als "aktiver Deal-Room" (für UI-State)
- **Autor:** Anbieter Real-Pubkey
- **Content:** JSON
  - `type`: `deal-room-status`
  - `dealId`: Eindeutige Deal-ID
  - `participants`: [anbieterPubkey, partnerPubkey]
  - `status`: `active`
  - `dmThreadId`: ID der ersten DM (Referenz zur Konversation)
- **Tags:**
  - `d`: `deal-room-{dealId}`
  - `app`: `bitcoin-swap-deal-rooms`
  - `p`: `{anbieterPubkey}`
  - `p`: `{partnerPubkey}`
  - `t`: `bitcoin-deal`
- **Aktion:** `WRITE` - Nur für State-Tracking

**Event 2: Deal-Room Confirmation DM (Kind 14) - NIP-17**
- **Was:** 🎉 **Bestätigung in der BESTEHENDEN DM** dass Deal-Room aktiviert ist
- **Autor:** Anbieter-Pubkey
- **Content:** Verschlüsselt via NIP-17
  - `type`: `deal-room-confirmation`
  - `dealId`: Deal-ID
  - `message`: "🤝 Deal-Room aktiviert! Lass uns die Details besprechen..."
- **Tags:**
  - `p`: `{partnerPubkey}`
- **Aktion:** `WRITE` - Neue Nachricht in der DM-Thread

**Event 3: Offer Deletion (Kind 5)**
- **Was:** Löscht das ursprüngliche Marketplace-Angebot
- (siehe Punkt 4)

**💬 WICHTIG:**
- **Die DM-Konversation läuft einfach weiter!**
- Kein neuer Chat nötig
- Alle bisherigen Nachrichten bleiben sichtbar
- Deal-Room Status (Kind 30080) ist nur ein Marker für die UI

**Beispiel-Query Deal-Rooms:**
```javascript
{
  kinds: [30080],
  '#p': [userPubkey],
  '#t': ['bitcoin-deal'],
  limit: 100
}
```

---

## 💬 **7. Deal aushandeln - In der DM weiterchatten**

### **Operation:**
🎯 **Beide Teilnehmer chatten einfach weiter in der NIP-17 DM!**

**⚡️ KEIN NEUER CHAT-TYP NÖTIG:**
- Die DM-Konversation von Schritt 4 läuft einfach weiter
- Beide schreiben normale NIP-17 DMs
- Alles bleibt Ende-zu-Ende verschlüsselt
- Kind 30080 Status ist nur ein UI-Marker (für "aktive Deals" Anzeige)

**Event: Weitere DM-Nachrichten (Kind 14) - NIP-17**
- **Was:** 💬 Normale NIP-17 DMs wie in Schritt 4
- **Autor:** Anbieter ODER Partner Pubkey
- **Content:** Verschlüsselt via NIP-17
  - `message`: "Ich kann morgen um 14 Uhr am Bahnhof..."
- **Tags:**
  - `p`: `{otherParticipant}` (Empfänger)
- **Aktion:** `WRITE` - Bei jeder Nachricht

**💡 Beispiel-Konversation:**
```
Interessent: "Ich hätte Interesse an deinen 100€"        [Schritt 4 - DM Start]
Anbieter:    "Cool! Hast du Bitcoin?"                     [Schritt 4 - DM Reply]
Interessent: "Ja, habe 0.002 BTC"                         [Schritt 4 - DM Reply]
--- Anbieter wählt diesen Interessenten aus [Schritt 6] ---
Anbieter:    "🤝 Deal! Wo treffen wir uns?"              [Schritt 7 - Deal Chat]
Interessent: "Bahnhof um 14 Uhr?"                         [Schritt 7 - Deal Chat]
Anbieter:    "👍 Perfekt, bis dann!"                      [Schritt 7 - Deal Chat]
```

**Alles in EINER DM-Konversation! Kein Context-Switch!** 🎯

**Beispiel-Query (alle DMs mit Partner):**
```javascript
{
  kinds: [14],
  '#p': [myPubkey],
  authors: [partnerPubkey]  // Nur Nachrichten vom Partner
}
```

---

## 📊 **Zusammenfassung Event-Kinds**

| Kind | Typ | Beschreibung | Löschbar? |
|------|-----|--------------|-----------|
| **5** | Deletion | Löscht andere Events | ❌ |
| **14** | Sealed DM | NIP-17 verschlüsselte DMs (= Deal-Room Chat!) | ❌ |
| **42** | Marketplace | Tausch-Angebote | ✅ Via Kind 5 |
| **30000** | Replaceable | GroupConfig & Whitelist | ✅ Via Update |
| **30078** | Addressable | Interest Tracking (UI-State) | ✅ Via Update |
| **30080** | Addressable | Deal-Room Status Marker (UI-State) | ✅ Via Update |

**⚡️ WICHTIG:** Es gibt NUR EINEN Chat-Typ: **Kind 14 (NIP-17 DMs)**
- Wird für Interesse-Anfragen genutzt (Schritt 4)
- Wird für Deal-Verhandlungen genutzt (Schritt 7)
- **Kein separater "Deal-Room-Chat"!** Die DM IST der Deal-Room! 🎯

---

## 🔍 **Query-Tool nutzen**

**Alle Events der letzten Stunde prüfen:**
```bash
npx tsx test-relay-query.js
```

**Custom Queries in `test-relay-query.js`:**
- Angebote: `kinds: [42]`
- DMs: `kinds: [14]`
- Interests: `kinds: [30078]`
- Deal-Rooms: `kinds: [30080]`
- Deletions: `kinds: [5]`

---

## 🎯 **Test-Workflow**

1. ✅ **Gruppe erstellen** → GroupConfig auf Relay (Kind 30000)
2. ✅ **Whitelist hinzufügen** → Whitelist Event (Kind 30000)
3. ✅ **Angebot erstellen** → Offer Event (Kind 42)
4. ✅ **Interesse zeigen** → NIP-17 DM an Anbieter starten (Kind 14)
   - 💬 Ab jetzt: Private DM-Konversation läuft
5. ✅ **Partner auswählen** → Deal-Room Marker (Kind 30080) + Offer-Deletion (Kind 5)
   - 🎯 Gewählte DM = Deal-Room
   - 🗑️ Andere DMs werden ignoriert
6. ✅ **Deal aushandeln** → Weitere NIP-17 DMs in derselben Konversation (Kind 14)

**💡 Vereinfachte Wahrheit:**
- **1 Interessent = 1 DM-Thread**
- **3 Interessenten = 3 separate DM-Threads**
- **Anbieter wählt 1 DM aus = Diese DM wird zum Deal-Room**
- **Kein neuer Chat nötig! Die DM läuft einfach weiter!** 🎯

**Jeder Schritt kann mit `npx tsx test-relay-query.js` verifiziert werden!**

---

**Letzte Aktualisierung:** 27. Oktober 2025
