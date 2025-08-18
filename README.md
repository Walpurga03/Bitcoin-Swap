# 🔐 Bitcoin-Tausch-Netzwerk — Kurz-Anleitung

Worum geht's?
- Menschen, die Bitcoin direkt tauschen wollen, sicher und anonym verbinden.

Problem
- Man weiß oft nicht, ob die andere Person vertrauenswürdig ist. Das führt zu Betrug und Unsicherheit.

Unsere einfache Lösung
- Geprüfte, anonyme Nutzer; Anbieter wählen, wen sie kontaktieren.

Kurz: Wie es funktioniert
1. 🔑 Login mit Nostr‑Schlüssel (kein Passwort)
2. 📊 Einfaches Dashboard: zeigt nur die Angebote
3. 💝 Button: "Interesse zeigen"
4. 👥 Anbieter sehen Interessenten und wählen einen aus
5. 💬 Privater Chat (NIP‑17) für die Kommunikation

Seiten (im Ordner `docs/`)
- `start.html` — Login
- `dashboard.html` — Angebote
- `my-offers.html` — Interessenten & Chat

Technische Struktur
```
docs/
├── start.html
├── dashboard.html
├── my-offers.html
├── config.js       # Allowlist mit npub-Keys
├── styles/main.css
├── dev-tools/      # Nostr Key-Generatoren & Hilfs-Skripte
└── DEMO-ACCOUNTS.md
```

Kurz zur Technik
- Läuft im Browser, nutzt Nostr‑Keys (nsec/npub). Keine Datenbank nötig für die Demo. Für Entwickler: `docs/` enthält Demo-Tools.

Schnell starten (lokal)
```bash
cd docs/
python -m http.server 8001
# → http://localhost:8001/start.html
```

Demo-Login (Beispiel)
```
nsec1dxdzmrddnhdwrwpgu8sn86mtwnakqjl2g92xq3feecge52medwcquqc7hs
```

Implementierungsstatus (Kurz)
- Nostr-Authentifizierung (nsec-Eingabe, Validierung)
- Einfaches Dashboard mit Live-Angeboten
- Responsive Glassmorphic UI
- Dev-Tools + Demo-Accounts

Nächste Schritte (optional)
- Escrow anbieten
- Reputation-Features
- NIP-17 verschlüsselte Chats & Live-Publishing ins Nostr-Netzwerk

Hinweis
- Der Inhalt aus `MASTERPLAN.md` wurde in diese Datei übernommen und `MASTERPLAN.md` entfernt.
