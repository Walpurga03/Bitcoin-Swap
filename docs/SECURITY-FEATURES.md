# 🔐 Security Features

## Private Key Handling

### Warum wird der Private Key nicht gespeichert?

Aus **Sicherheitsgründen** wird dein Private Key **niemals** im Browser-localStorage gespeichert. Dies ist ein bewusstes Design-Feature, um deine Sicherheit zu maximieren.

### Was bedeutet das für dich?

- ✅ **Maximale Sicherheit**: Dein Private Key kann nicht von anderen Websites oder Malware ausgelesen werden
- ⚠️ **Re-Login erforderlich**: Nach jedem Browser-Refresh oder Tab-Schließen musst du dich neu einloggen
- 🔄 **Automatischer Redirect**: Wenn du einem Chat beitreten möchtest, wirst du nach dem Re-Login automatisch weitergeleitet

### Was wird gespeichert?

Im localStorage werden nur **nicht-sensitive** Daten gespeichert:

- ✅ `pubkey` - Dein öffentlicher Schlüssel (kann öffentlich geteilt werden)
- ✅ `name` - Dein Anzeigename
- ✅ `tempPrivkey` - Temporärer Key für anonyme Marketplace-Angebote
- ❌ `privateKey` - **NIEMALS gespeichert!**

### Chat-Beitritt Flow

Wenn du auf "Chat beitreten" klickst, aber nicht eingeloggt bist:

1. 📝 System speichert das Chat-Ziel im localStorage (`pending_chat_redirect`)
2. 🔐 Du wirst zur Login-Seite umgeleitet
3. ✍️ Du gibst deinen NSEC-Key ein
4. ✅ Nach erfolgreichem Login wirst du **automatisch** zum Chat weitergeleitet
5. 🗑️ Das Chat-Ziel wird aus dem localStorage gelöscht

### Best Practices

- 🔑 **Verwende einen Password Manager** für deinen NSEC-Key
- 🔒 **Teile deinen Private Key niemals** mit anderen
- 💾 **Sichere deinen NSEC-Key** an einem sicheren Ort
- 🔄 **Akzeptiere den Re-Login** als Security-Feature, nicht als Bug

## NIP-17 Verschlüsselung

Alle privaten Chats verwenden **NIP-17 Gift-Wrapped Messages**:

- 🎁 **Dreifache Verschlüsselung**: Rumor → Seal → Gift Wrap
- 🔒 **Ende-zu-Ende verschlüsselt**: Nur Sender und Empfänger können Nachrichten lesen
- 🕵️ **Metadaten-Schutz**: Sender und Empfänger sind für Dritte nicht sichtbar
- 🔐 **NIP-44 Verschlüsselung**: Moderne, sichere Verschlüsselung

## Whitelist-System

- 👑 **Admin-Kontrolle**: Nur der Admin kann die Whitelist verwalten
- 🔑 **Gruppenbasiert**: Jede Gruppe hat ihre eigene Whitelist
- 🚫 **Zugriffskontrolle**: Nur whitelistete Pubkeys können beitreten
- ✅ **Admin-Bypass**: Der Admin kann sich immer einloggen

## Temporäre Keys für Marketplace

- 🎭 **Anonymität**: Angebote werden mit temporären Keys erstellt
- 🔄 **Session-Persistenz**: Temp-Key wird im localStorage gespeichert
- 🗑️ **Löschbar**: Temp-Key wird beim Logout beibehalten (für Angebots-Verwaltung)
- 🔐 **Getrennt vom Haupt-Key**: Dein echter Private Key bleibt geschützt