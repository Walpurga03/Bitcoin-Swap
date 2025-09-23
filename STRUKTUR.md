mein-nostr-projekt/
├── .vscode/
│   └── settings.json         # Empfohlene VS Code Einstellungen
│
├── src/
│   ├── lib/                  # Der wichtigste Ordner für deine Logik
│   │   ├── nostr/
│   │   │   ├── client.ts     # Logik für Relay-Verbindung, Subscriptions, Events senden
│   │   │   ├── crypto.ts     # Funktionen für Ver-/Entschlüsselung, Schlüsselableitung
│   │   │   ├── events.ts     # Hilfsfunktionen zum Erstellen von Nostr-Events (Angebot, DM, etc.)
│   │   │   └── types.ts      # TypeScript-Typdefinitionen (z.B. für ein Angebot)
│   │   │
│   │   ├── stores/
│   │   │   ├── userStore.ts  # Svelte Store für User-Infos (Schlüssel, Profil)
│   │   │   ├── groupStore.ts # Store für Gruppendaten (Nachrichten, Mitglieder)
│   │   │   └── offerStore.ts # Store für alle Angebote
│   │   │
│   │   └── utils/
│   │       └── index.ts      # Allgemeine Hilfsfunktionen (z.B. Datumsformatierung)
│   │
│   ├── routes/               # Definiert die Seiten und URLs deiner App
│   │   ├── +page.svelte      # Startseite (Login / Eingabe des Einladungslinks)
│   │   │
│   │   └── (app)/            # Eine "Route Group", die ein gemeinsames Layout teilt
│   │       ├── +layout.svelte  # Gemeinsames Layout (z.B. mit Sidebar/Header)
│   │       │
│   │       ├── group/
│   │       │   └── +page.svelte  # Die private Chat-Ansicht
│   │       │
│   │       ├── offers/
│   │       │   └── +page.svelte  # Der Angebots-Chat-Raum
│   │       │
│   │       └── dm/[pubkey]/    # Dynamische Route für private Chats
│   │           └── +page.svelte  # z.B. /dm/npub123...
│   │
│   └── components/             # Wiederverwendbare UI-Elemente
│       ├── OfferCard.svelte    # Zeigt ein einzelnes Angebot an
│       ├── Message.svelte      # Stellt eine einzelne Chat-Nachricht dar
│       ├── ProfileAvatar.svelte# Zeigt den Avatar und Namen eines Nutzers
│       └── LoginModal.svelte   # Modal zur Eingabe des Gruppenschlüssels
│
├── static/
│   └── favicon.png
│
├── package.json              # Projekt-Abhängigkeiten und Skripte
├── svelte.config.js
├── tailwind.config.cjs
└── tsconfig.json