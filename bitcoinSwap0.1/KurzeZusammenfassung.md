### Kurze Zusammenfassung des Projekts: Nostr-Gruppen-Chat mit Marketplace

Dieses Projekt ist ein dezentrales Login- und Chat-System basierend auf Nostr, speziell für private Gruppen. Es nutzt Einladungslinks (Format: https://domain.com/?relay=wss://relay&secret=group123), um Relay (Kommunikationsserver) und Secret (Gruppen-ID) zu definieren. Der Secret wird via SHA-256 zur Channel-ID gehasht, was vollständige Gruppen-Isolation ermöglicht – unterschiedliche Secrets = separate Chats.

Authentifizierung: Zwei-Faktor-ähnlich – Link für Berechtigung, gefolgt von NSEC-Private-Key-Eingabe mit Whitelist-Prüfung (Pubkeys aus .env). Alles client-seitig in Svelte, mit modularer Struktur (z.B. validation.ts für Checks, userStore.ts für Daten, crypto.ts für Verschlüsselung).

Events & Sicherheit: Nachrichten als Nostr-Events (Kind 1/1059) mit Channel-ID-Tags. Verschlüsselung via NIP-17/NIP-44 (sicherer als NIP-04) mit Gruppen-Key aus Secret – E2EE, client-seitiges Filtering für Privatsphäre. Best Practices: Rate-Limiting, Sig-Validierung, Multi-Relay-Fallback.

Zusatz-Feature: Anonymer Marketplace: User erstellen anonyme Angebote (Temp-Key, Kind 30000), Mitglieder zeigen öffentlich Interesse (Replies mit Pubkey). Ersteller wählt aus, startet privaten NIP-17-Chat und löscht das Angebot (NIP-09).

Tech-Stack: Svelte, TypeScript, Nostr-Libs (z.B. nostr-tools). Ideal für kleine, sichere Communities – skalierbar, zensurresistent, ohne zentrale DB. MVP-ready, mit Debug-Tools für Tests. Ein starkes, dezentrales Tool für kollaborative Gruppen! 🚀