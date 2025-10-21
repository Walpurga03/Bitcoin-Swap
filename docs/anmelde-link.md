# 🔐 Anmelde-System - Analyse & Kritische Übersicht

## 🎯 Was ist das System?

**Dezentrales Gruppen-Login** ohne zentrale Authentifizierung. Admin erstellt Gruppe → verteilt Einladungslink → System prüft automatisch über Nostr ob User in Whitelist ist.

**Kernmechanismus**: Admin-Status = `pubkey vom Relay === aktueller pubkey` (wird bei jedem Login neu berechnet)

---

## 💡 HAUPTFEATURE: Dynamische Admin-Verwaltung

### ✅ Das Problem (vorher)
Admin A erstellt Gruppe → localStorage speichert `is_group_admin='true'` → Admin B loggt sich auf gleichem PC ein → **Admin B ist fälschlicherweise Admin!** ❌

### ✅ Die Lösung (jetzt)
Admin-Status wird **nicht gespeichert**, sondern **bei jedem Login neu berechnet**: `admin_pubkey (von Nostr) === current_pubkey` → funktioniert korrekt mit mehreren NSECs ✅

---

## 🏆 Features & Architektur

| Feature | Status | Details |
|---------|--------|---------|
| **Dynamische Admin-Verwaltung** | ✅ | Multi-NSEC-sicher: pubkey vs. admin_pubkey Vergleich (neu bei jedem Login) |
| **Einladungslinks** | ✅ | URL: `?relay=wss://...&secret=xyz` |
| **Whitelist** | ✅ | Public Keys auf Nostr (Kind 30000), nur Admin editierbar |
| **Admin-Bypass** | ✅ | Admin braucht nicht in Whitelist zu sein |
| **Profil-Laden** | ✅ | Automatisch von Nostr (Kind 0) |

### Speicherung & Sichtbarkeit

| Daten | Ort | Schutz | Zweck |
|-------|-----|--------|-------|
| **Private Key** | Browser localStorage | ❌ Unverschlüsselt | Authentifizierung (KRITISCH) |
| **Group Secret** | Browser localStorage | ❌ Unverschlüsselt | Gruppe identifizieren |
| **Admin-Pubkey** | Nostr (öffentlich) | ✅ Signiert | Admin-Erkennung |
| **Whitelist** | Nostr (öffentlich) | ✅ Signiert | Zugriffskontrolle |

### Admin-Erkennung (das Herzstück!)

```
Bei Login/Mount:
1. Hash = SHA256(group_secret)
2. Lade GroupConfig von Nostr: { admin_pubkey, ... }
3. Vergleich: admin_pubkey === user_pubkey?
   ✅ JA → isAdmin = true
   ❌ NEIN → isAdmin = false
```

**Vorteil**: Funktioniert mit mehreren NSECs (kein localStorage-Konflikt)
**Nachteil**: Braucht Online-Relay

---

## ⚠️ SICHERHEIT & LIMITATIONEN

### Kritische Punkte

| Problem | Status | Workaround |
|---------|--------|-----------|
| **Relay offline** | 🔴 Blockiert Admin-Panel | Fallback zu localStorage (geplant) |
| **Admin-Pubkey öffentlich** | 🟠 Jeder sieht Admin | Secret ist SHA-256 hash geschützt |
| **Secret im URL sichtbar** | 🟠 Browser-History risiko | HTTPS schützt; treat like password |
| **localStorage unverschlüsselt** | 🟡 Browser-Addons Risiko | Gilt für alle Browser-Wallets |

---

## 🟢 OPTIMIERUNGSVORSCHLÄGE

### 1. Offline-Fallback (PRIORITÄT 1)
**Status**: ⚠️ Nicht implementiert, aber möglich

```typescript
// Fallback bei Relay-Fehler
async function getAdminStatus(secretHash, relay) {
  try {
    return await loadGroupAdmin(secretHash, [relay]);  // Nostr
  } catch (relayError) {
    console.warn('⚠️ Relay offline, nutze Cache');
    const cached = localStorage.getItem('admin_pubkey');
    if (cached) return cached;  // Fallback zu lokaler Kopie
    throw new Error('Kein Relay + kein lokaler Cache');
  }
}
```

**Nutzen**: App funktioniert auch wenn Relay kurzzeitig offline ist
**Implementierungsaufwand**: Niedrig (30min)

---

### 2. Admin-Status Caching (PRIORITÄT 2)
Aktuell: Jedes Mount = 1 Nostr-Query
Mit Cache: Nur 1 Query alle 5 Minuten

**Nutzen**: Weniger Relay-Last, schnelleres UI
**Aufwand**: 1-2h

---

### 3. sessionStorage statt localStorage (PRIORITÄT 2)
Aktuell: Secrets dauerhaft in localStorage (unsicher)
Besser: sessionStorage wird beim Browser-Close gelöscht

**Nutzen**: Höhere Sicherheit auf Shared PCs
**Aufwand**: 30min

---

### 4. Relay-Status Indikator (PRIORITÄT 3)
Aktuell: Relay-Status nur in Console logs sichtbar
Besser: UI-Indikator zeigt Relay-Verbindungsstatus

**Nutzen**: User weiß wieso Admin-Panel fehlt
**Aufwand**: 45min

---

### 5. Secret-Mindestlänge (PRIORITÄT 2)
Aktuell: 8 Zeichen (zu kurz, bruteforcebar)
Besser: 16-64 Zeichen erzwingen

**Nutzen**: Verhindert Bruteforce-Attacken
**Aufwand**: 15min

---

### 6. Bessere Error-Recovery (PRIORITÄT 2)
Aktuell: Relay-Fehler → sofort Redirect (zu hart)
Besser: 3x Retry mit 2sec Abstand vor Abbruch

**Nutzen**: Temporary Network Issues nicht gleich blockiert
**Aufwand**: 45min

---

## 📊 Performance-Metriken

| Metrik | Aktuell | Mit Optimierungen |
|--------|---------|------------------|
| Requests pro Session | ~5-10 (ein je Mount) | ~1 (mit Cache) |
| Admin-Panel Load-Time | ~500-2000ms | ~50-100ms (Cache) |
| Relay-Last | Hoch (viele Queries) | Niedrig (Cache) |
| Offline-Support | ❌ Nein | ✅ Mit Fallback |
| sessionStorage-Ready | ❌ Nein | ✅ Ja |

---

## 🛠️ Implementierungs-Roadmap

**SOFORT (diese Woche)**:
- [ ] Offline-Fallback zu localStorage
- [ ] sessionStorage für Secrets statt localStorage
- [ ] Secret-Mindestlänge auf 16 Zeichen erhöhen

**BALD (nächste Woche)**:
- [ ] Admin-Status Caching (5-Min-TTL)
- [ ] Relay-Status Indikator im UI
- [ ] Bessere Error-Recovery beim Admin-Panel

**SPÄTER (Backlog)**:
- [ ] Multi-Relay-Fallback (mehrere Relays konfigurierbar)
- [ ] Offline-Queue für Whitelist-Änderungen (speichern → später sync)
- [ ] Encryption für localStorage (optional)

---

## �️ Implementierungs-Roadmap