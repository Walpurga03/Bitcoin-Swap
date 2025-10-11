# Sicherheitsrichtlinien

## 🔐 Sicherheitsübersicht

Das Bitcoin-Tausch-Netzwerk implementiert mehrere Sicherheitsebenen zum Schutz der Benutzer und ihrer Daten.

## 🛡️ Implementierte Sicherheitsmaßnahmen

### 1. Client-seitige Verschlüsselung
- **Private Keys** verlassen niemals den Browser
- Alle Keys werden nur im lokalen Storage gespeichert
- Keine Server-seitige Speicherung von Schlüsselmaterial

### 2. Ende-zu-Ende-Verschlüsselung
- **AES-GCM** für Gruppen-Nachrichten (256-bit)
- **NIP-44** für private Direktnachrichten (geplant)
- Symmetrische Verschlüsselung mit aus Secret abgeleitetem Key

### 3. Zugriffskontrolle
- **Whitelist-System**: Nur autorisierte Public Keys haben Zugriff
- **Zwei-Faktor-Authentifizierung**: Einladungslink + Private Key
- Channel-Isolation durch SHA-256 Hash des Secrets

### 4. Rate-Limiting
- Maximale 20 Requests pro Minute pro Public Key
- Automatische Cleanup alter Einträge
- Schutz vor Spam und DoS-Angriffen

### 5. Input-Validierung
- Validierung aller Private/Public Keys (NSEC/NPUB/Hex)
- Relay-URL Validierung (nur wss:// oder ws://)
- Secret-Validierung (Länge, erlaubte Zeichen)
- Schutz vor Injection-Angriffen

### 6. Event-Validierung
- Signatur-Prüfung aller Nostr-Events
- Channel-ID Matching
- Client-seitiges Filtering ungültiger Events

## 🚨 Sicherheitslücken melden

Wenn Sie eine Sicherheitslücke entdecken, **melden Sie diese bitte NICHT als öffentliches Issue**.

## ⚠️ Bekannte Einschränkungen

### Proof-of-Concept Status
- Dies ist eine Proof-of-Concept-Implementation
- Für Production-Einsatz werden zusätzliche Sicherheitsaudits empfohlen
- Regelmäßige Updates und Patches sind erforderlich

### Browser-Sicherheit
- Private Keys werden im localStorage gespeichert
- Anfällig für XSS-Angriffe (wenn vorhanden)
- Empfehlung: Verwendung von Browser-Extensions für Key-Management

### Relay-Abhängigkeit
- Sicherheit hängt von der Vertrauenswürdigkeit der Relays ab
- Relays können Events speichern und analysieren (verschlüsselt)
- Empfehlung: Verwendung eigener Relays für maximale Privatsphäre

### Metadaten
- Relay-Server sehen:
  - Zeitstempel der Nachrichten
  - Public Keys der Teilnehmer
  - Nachrichtengröße (verschlüsselt)
- Keine Verschlüsselung der Metadaten

## 🔒 Best Practices für Benutzer

### Private Key Management
1. **Niemals teilen**: Geben Sie Ihren Private Key niemals weiter
2. **Sicher aufbewahren**: Speichern Sie Backups an sicheren Orten
3. **Regelmäßig rotieren**: Erwägen Sie regelmäßige Key-Rotation
4. **Browser-Extensions**: Verwenden Sie dedizierte Key-Management-Tools

### Gruppen-Secrets
1. **Lange Secrets**: Mindestens 12 Zeichen, besser 20+
2. **Zufällig generieren**: Verwenden Sie Passwort-Generatoren
3. **Nicht wiederverwenden**: Jede Gruppe sollte ein einzigartiges Secret haben
4. **Sicher teilen**: Teilen Sie Secrets nur über sichere Kanäle

### Relay-Auswahl
1. **Vertrauenswürdige Relays**: Verwenden Sie bekannte, vertrauenswürdige Relays
2. **Eigene Relays**: Betreiben Sie eigene Relays für maximale Kontrolle
3. **Mehrere Relays**: Verwenden Sie mehrere Relays für Redundanz
4. **Relay-Monitoring**: Überwachen Sie die Verfügbarkeit Ihrer Relays

### Whitelist-Management
1. **Regelmäßig prüfen**: Überprüfen Sie die Whitelist regelmäßig
2. **Inaktive entfernen**: Entfernen Sie inaktive oder kompromittierte Keys
3. **Dokumentieren**: Führen Sie Aufzeichnungen über autorisierte Keys
4. **Backup**: Sichern Sie die Whitelist-Konfiguration

## 🔄 Sicherheitsupdates

### Update-Prozess
1. Sicherheitsupdates werden priorisiert behandelt
2. Kritische Patches werden innerhalb von 24-48 Stunden veröffentlicht
3. Benutzer werden über GitHub Releases informiert
4. Changelog enthält Sicherheitshinweise

### Versionshinweise
- **Major Updates** (X.0.0): Können Breaking Changes enthalten
- **Minor Updates** (0.X.0): Neue Features, keine Breaking Changes
- **Patch Updates** (0.0.X): Bugfixes und Sicherheitspatches

## 📚 Weitere Ressourcen

- [Nostr Security Best Practices](https://github.com/nostr-protocol/nips)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

## 🙏 Danksagungen

Wir danken allen Sicherheitsforschern, die verantwortungsvoll Schwachstellen melden und zur Verbesserung der Sicherheit beitragen.

---

**Letzte Aktualisierung**: 2025-01-11  
**Version**: 1.0.0