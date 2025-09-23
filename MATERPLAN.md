# MASTERPLAN

## 1. Konzeptionelle Ausarbeitung & Technische Entscheidungen

Bevor wir in die Phasenplanung gehen, schärfen wir die technischen Konzepte hinter den Funktionalitäten.

### 1.1 Private Chat-Gruppe (NIP-28 + Verschlüsselung)

- **Zugang:**
  - Der "spezielle Einladungslink" ist der Schlüssel. 
  - Beispiel: `meine-app://gruppe?relay=wss://mein.relay.com&secret=SuperGeheimesPasswort123`

- **Umsetzung:**
  - Alle Nachrichten in der Gruppe sind Events vom Typ `channel_message` (gemäß NIP-28) und beziehen sich auf eine feste `channel_id`.
  - Der Nachrichteninhalt (`content`) wird clientseitig verschlüsselt, bevor die Nachricht gesendet wird.
  - Als Verschlüsselungsschlüssel wird ein aus dem Secret abgeleiteter Schlüssel (z.B. mittels PBKDF2) verwendet.
  - Alle Mitglieder mit dem Secret können die Nachrichten wieder entschlüsseln.

### 1.2 Anonyme Angebote (Temporäre Schlüssel)

- **Herausforderung:**
  - Ein normales Nostr-Event ist immer mit dem `pubkey` des Erstellers signiert, was Anonymität verhindert.

- **Lösung – Ephemeral Keys (Wegwerf-Schlüssel):**
  - Beim Erstellen eines anonymen Angebots generiert der Client automatisch ein neues, temporäres Nostr-Schlüsselpaar (`temp_privkey` und `temp_pubkey`).
  - Das Angebot wird als normales Nostr-Event (z.B. `kind:1` oder ein spezieller Kind-Code wie `kind:30078`) erstellt, jedoch mit dem `temp_privkey` signiert.
  - Für andere Mitglieder erscheint das Angebot, als stamme es von einem unbekannten `pubkey` (`temp_pubkey`).
  - **Mapping:** Der Client speichert lokal die Zuordnung: `mapping[temp_pubkey] = real_user_pubkey`.
  - **Zahlungsoptionen:** Die Optionen "Rechnung", "Bargeld" und "Überweisung" werden als Tags (z.B. `["t", "payment_rechnung"]`) im Event abgelegt.

### 1.3 Angebotsannahme & Privater Chat (NIP-17 & NIP-09)

- **Interesse zeigen:**
  - Andere Mitglieder reagieren auf das Angebots-Event (z.B. mit einem "❤️" oder "🙋") und signalisieren damit Interesse.
  - Der Client filtert diese Reaktionen und zeigt sie dem ursprünglichen Anbieter an.

- **Auswahl und Start des Privatchats:**
  - Der Anbieter, der den `temp_privkey` besitzt, wählt einen der interessierten Nutzer aus.
  - Beim Start des privaten Chats:
    - Öffnet sich ein privater Chat-Raum (PrivatChat-Raum) über Nostr mittels NIP-17.
    - In diesem Chat werden beide Profile (Namen u.a.) angezeigt.

- **Angebot löschen (NIP-09):**
  - Sobald der PrivatChat-Raum geöffnet wird, sendet der Client ein Deletion-Event, signiert mit dem `temp_privkey`.
  - Dadurch wird das ursprüngliche Angebot aus der Hauptgruppe entfernt.

---

## 2. Projektplan in Meilensteinen

### Phase 1: Basis-Setup und verschlüsselter Gruppen-Chat

- **Ziel:** Aufbau einer funktionierenden, privaten Chat-Gruppe basierend auf einem gemeinsamen Secret.

- **Aufgaben:**
  - UI-Grundgerüst: Erstellen einer einfachen Oberfläche mit Nachrichtenfenster, Eingabezeile und Mitgliederliste.
  - Nostr-Integration: Einbindung einer Nostr-Bibliothek (z.B. nostr-tools) und Aufbau der Verbindung zu einem oder mehreren Relays.
  - Schlüssel-Management: Nutzer können ihren privaten Schlüssel eingeben oder generieren (z.B. über eine NIP-07 Browser-Extension).
  - Verschlüsselung:
    - Ableiten eines kryptografischen Schlüssels aus einem Secret (z.B. mittels PBKDF2).
    - Implementierung der AES-256-GCM Ver- und Entschlüsselung.
  - Nachrichtenübermittlung: Senden und Empfangen von verschlüsselten NIP-28-Nachrichten.

### Phase 2: Angebots-Funktionalität (zunächst nicht-anonym)

- **Ziel:** Nutzer können Angebote erstellen und andere Nutzer können darauf reagieren.

- **Aufgaben:**
  - Angebots-Formular: Erstellung einer UI, in der ein Angebot mit drei Zahlungsoptionen erstellt werden kann.
  - Event-Erstellung: Logik zum Erstellen eines Nostr-Events für das Angebot, initial signiert mit dem echten Nutzerschlüssel.
  - Anzeige: Filterung und Darstellung der Angebots-Events in einem separaten Angebots-Raum.
  - Reaktionen (NIP-25): Ermöglichen von Reaktionen (z.B. "❤️") und Anzeige der Interessentenliste.

### Phase 3: Anonymität für Angebote

- **Ziel:** Angebote werden anonym erstellt, sodass die Identität des Erstellers verborgen bleibt.

- **Aufgaben:**
  - Temporäre Schlüsselgenerierung: Automatische Erstellung eines neuen Schlüsselpaares beim Klick auf "Anonymes Angebot erstellen".
  - Anpassung der Signierung: Nutzung des `temp_privkey` anstelle des echten Schlüssels beim Erstellen des Events.
  - Lokales Mapping: Sicheres Speichern der Zuordnung von temporärem Schlüssel zum echten Nutzer (z.B. im localStorage).

### Phase 4: Angebotsannahme und Privater Chat

- **Ziel:** Der Anbieter kann einen interessierten Nutzer auswählen, woraufhin ein privater Chat gestartet und das Angebot gelöscht wird.

- **Aufgaben:**
  - Auswahl-Interface: Erweiterung der Angebotsansicht zur Auswahl eines Interessenten.
  - Privaten Chat initiieren (NIP-17):
    - Erstellen einer NIP-04 Direct Message vom echten `pubkey` des Anbieters zum Interessenten.
    - Integration einer NIP-17 "Gift Wrap" Nachricht für erhöhte Privatsphäre.
    - Umleiten in einen privaten 1-zu-1 Chat-Raum (PrivatChat-Raum), in dem beide Profile angezeigt werden.
  - Angebot löschen (NIP-09):
    - Senden eines Deletion-Events, signiert mit dem `temp_privkey`.
    - Das Angebot wird aus der Hauptgruppe entfernt.

### Phase 5: UI/UX-Polishing, Tests und Deployment

- **Ziel:** Eine stabile und benutzerfreundliche Anwendung.

- **Aufgaben:**
  - UI-Verbesserungen: Optimierung der Benutzeroberfläche, Including Ladezustände, Fehlermeldungen und klare Handlungsanweisungen.
  - Robustheit: Sicherstellen, dass temporäre Schlüssel nicht verloren gehen (z.B. bei Browser-Schließung) – Evaluation, ob persistent gespeichert werden muss.
  - Testing: Umfassende Tests der kryptografischen Prozesse und Anonymitätsfeatures.
  - Deployment: Bereitstellung der Web-App auf einer statischen Hosting-Plattform (z.B. Vercel, Netlify, Cloudflare Pages) und Einrichtung eines dedizierten Relays (optional, aber empfehlenswert).

---

Dies ist die überarbeitete und besser formatierte Version des Masterplans, die die Konzepte und Phasen klar strukturiert und leserlich darstellt.