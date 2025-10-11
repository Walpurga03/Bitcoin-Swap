# Beitragsrichtlinien

Vielen Dank für Ihr Interesse, zum Bitcoin-Tausch-Netzwerk beizutragen! Wir freuen uns über jeden Beitrag.

## 🤝 Wie kann ich beitragen?

### Fehler melden

Wenn Sie einen Fehler gefunden haben:

1. Prüfen Sie, ob der Fehler bereits als Issue gemeldet wurde
2. Falls nicht, erstellen Sie ein neues Issue mit:
   - Klarer Beschreibung des Problems
   - Schritten zur Reproduktion
   - Erwartetes vs. tatsächliches Verhalten
   - Screenshots (falls relevant)
   - Browser/OS-Informationen

### Features vorschlagen

Für neue Feature-Vorschläge:

1. Erstellen Sie ein Issue mit dem Label "enhancement"
2. Beschreiben Sie:
   - Das Problem, das gelöst werden soll
   - Ihre vorgeschlagene Lösung
   - Mögliche Alternativen
   - Zusätzlicher Kontext

### Code beitragen

1. **Fork** das Repository
2. **Clone** Ihren Fork:
   ```bash
   git clone https://github.com/IHR-USERNAME/Bitcoin-Swap.git
   cd Bitcoin-Swap
   ```

3. **Branch** erstellen:
   ```bash
   git checkout -b feature/AmazingFeature
   ```

4. **Änderungen** vornehmen und committen:
   ```bash
   git add .
   git commit -m "Add: Beschreibung der Änderung"
   ```

5. **Push** zum Fork:
   ```bash
   git push origin feature/AmazingFeature
   ```

6. **Pull Request** erstellen

## 📝 Commit-Konventionen

Verwenden Sie aussagekräftige Commit-Messages:

- `Add: Neue Funktion hinzufügen`
- `Fix: Fehler beheben`
- `Update: Bestehende Funktion aktualisieren`
- `Refactor: Code umstrukturieren`
- `Docs: Dokumentation aktualisieren`
- `Style: Code-Formatierung`
- `Test: Tests hinzufügen/aktualisieren`

## 🧪 Testing

Vor dem Einreichen eines Pull Requests:

1. Testen Sie Ihre Änderungen lokal:
   ```bash
   npm run dev
   ```

2. Prüfen Sie auf TypeScript-Fehler:
   ```bash
   npm run check
   ```

3. Testen Sie den Build:
   ```bash
   npm run build
   ```

## 🎨 Code-Style

- Verwenden Sie TypeScript für neue Dateien
- Folgen Sie den bestehenden Code-Konventionen
- Fügen Sie JSDoc-Kommentare für Funktionen hinzu
- Halten Sie Funktionen klein und fokussiert
- Verwenden Sie aussagekräftige Variablennamen

## 🔐 Sicherheit

- Committen Sie niemals Private Keys oder Secrets
- Verwenden Sie Environment Variables für sensible Daten
- Melden Sie Sicherheitslücken privat (nicht als öffentliches Issue)

## 📄 Lizenz

Durch Ihren Beitrag stimmen Sie zu, dass Ihre Arbeit unter der MIT-Lizenz lizenziert wird.

## ❓ Fragen?

Bei Fragen können Sie:
- Ein Issue erstellen
- Die Dokumentation in `docs/` konsultieren
- Die Community um Hilfe bitten

Vielen Dank für Ihren Beitrag! 🎉