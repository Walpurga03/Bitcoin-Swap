# 🔨 Refactoring Plan - group/+page.svelte

**Aktuell:** 1255 Zeilen in einer Datei  
**Ziel:** Aufteilen in kleinere, wartbare Components

---

## 📊 Analyse der aktuellen Struktur

### Hauptbereiche (grob):

1. **Script-Bereich (~450 Zeilen)**
   - State Management (Variables)
   - Helper Functions (loadMyInterests, checkNotifications, etc.)
   - Event Handlers (handleCreateOffer, handleShowInterest, etc.)
   - Lifecycle (onMount, onDestroy)

2. **Template-Bereich (~600 Zeilen)**
   - Header & Admin-Bereich
   - Offer-Form (Angebot erstellen)
   - Offer-Liste (Marketplace)
   - Modals (Whitelist, Secret, Deal-Notification)

3. **Style-Bereich (~200 Zeilen)**
   - CSS Styles

---

## 🎯 Refactoring-Strategie

### Components zu extrahieren:

#### 1. ✅ `OfferForm.svelte` - Angebot erstellen
**Lines:** ~150-200  
**Props:**
- `onSubmit: (content: string, secret: string) => Promise<void>`
- `loading: boolean`
- `hasActiveOffer: boolean`

**State (intern):**
- offerInput
- showForm
- generatedSecret

**Emit:**
- `submit` Event

---

#### 2. ✅ `OfferList.svelte` - Marketplace Angebote
**Lines:** ~200-300  
**Props:**
- `offers: Offer[]`
- `myInterestOfferIds: Set<string>`
- `interestCounts: Record<string, number>`
- `hasActiveOffer: boolean`
- `onShowInterest: (offer: Offer) => void`
- `onShowInterests: (offer: Offer) => void`
- `onDeleteOffer: (offerId: string) => void`

**Features:**
- Offer Cards mit Expiration
- Interest Count Badge
- "Interesse zeigen" / "Interessenten anzeigen" Buttons

---

#### 3. ✅ `DealNotificationModal.svelte` - Deal Modal
**Lines:** ~50-80  
**Props:**
- `show: boolean`
- `data: { roomId: string; message: string; type: 'accepted' | 'created' }`
- `onClose: () => void`
- `onGoToChat: (roomId: string) => void`

**Features:**
- Pink/Violett Gradient
- Room-ID Display
- "Zum Chat" / "Später" Buttons

---

#### 4. ✅ `MarketplaceHeader.svelte` - Header & Admin
**Lines:** ~80-100  
**Props:**
- `isAdmin: boolean`
- `groupName: string`
- `relay: string`
- `onOpenWhitelist: () => void`
- `onRefresh: () => void`

**Features:**
- Gruppen-Info
- Admin-Button (Whitelist)
- Refresh-Button
- Status-Anzeige

---

### Verbleibender Code in `+page.svelte`:

**~400-500 Zeilen:**
- State Management & Coordination
- Business Logic Functions
- onMount/onDestroy Lifecycle
- Component Composition (Layout)
- Modal State Management

---

## 📋 Reihenfolge der Extraktion:

### Phase 3.1: Simple Components (kein State-Sharing)
1. ✅ `DealNotificationModal.svelte` - Einfachste (isoliert)
2. ✅ `MarketplaceHeader.svelte` - Nur Props, kein komplexer State

### Phase 3.2: Medium Components
3. ✅ `OfferForm.svelte` - Eigener State, einfache Events
4. ✅ `OfferList.svelte` - Viele Props, aber klar definiert

### Phase 3.3: Cleanup & Testing
5. ✅ Unused Imports entfernen
6. ✅ Code-Stil vereinheitlichen
7. ✅ TypeScript Errors fixen
8. ✅ Build & Test

---

## 🎨 Vorteile nach Refactoring:

- ✅ **Bessere Wartbarkeit:** Jeder Component ~100-200 Zeilen
- ✅ **Wiederverwendbarkeit:** Components können woanders genutzt werden
- ✅ **Testbarkeit:** Kleine Components einfacher zu testen
- ✅ **Übersichtlichkeit:** Klare Verantwortlichkeiten
- ✅ **Performance:** Granulare Re-Rendering

---

## 📊 Erwartete Reduktion:

**Vorher:**
- `group/+page.svelte`: 1255 Zeilen

**Nachher:**
- `group/+page.svelte`: ~400-500 Zeilen (Koordination)
- `MarketplaceHeader.svelte`: ~100 Zeilen
- `OfferForm.svelte`: ~150 Zeilen
- `OfferList.svelte`: ~250 Zeilen
- `DealNotificationModal.svelte`: ~80 Zeilen

**Total:** Gleiche Funktionalität, aber in 5 wartbare Teile aufgeteilt!

---

**Nächster Schritt:** Start mit DealNotificationModal.svelte (einfachste)
