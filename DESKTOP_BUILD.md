# Sonnental Hof — Desktop-Build (Windows 10/11 .exe & CachyOS Linux)

Dieses Spiel ist zu 100 % offlinefähig und speichert den gesamten Spielfortschritt lokal.

## Fertige Downloads direkt aus der Web-App
Im Startbildschirm sowie unter **Optionen → Speicherstand & Desktop** stehen die fertigen Pakete direkt zum Download bereit (sobald gebaut):
- `release/Sonnental-Hof-Beta-1.1-linux-x64.tar.gz` (für CachyOS / Arch Linux)
- `release/Sonnental-Hof-Setup-Beta-1.1-win-x64.exe` (Windows 10/11 Setup-Assistent)
- `release/SHA256SUMS.txt` (SHA-256 Prüfsummen)

### CachyOS / Arch Linux starten
```bash
tar -xzf Sonnental-Hof-Beta-1.1-linux-x64.tar.gz
cd Sonnental-Hof-Beta-1.1-linux-x64
./sonnental-hof
```

### Windows 10/11 Setup ausführen
- `Sonnental-Hof-Setup-Beta-1.1-win-x64.exe` doppelklicken (installiert pro Benutzer ohne Admin-Zwang inkl. Desktop- & Startmenü-Verknüpfung).
- **Hinweis zu SmartScreen:** Da kein kostenpflichtiges Code-Signing-Zertifikat eingebettet ist, kann Windows beim ersten Start einmalig „Der Computer wurde durch Windows geschützt“ melden → **„Weitere Informationen“ → „Trotzdem ausführen“**.

## Selbst neu bauen (optional)
```bash
npm install
npm run desktop:all
```
(Einzelbuilds: `npm run desktop:linux` oder `npm run desktop:win`)
