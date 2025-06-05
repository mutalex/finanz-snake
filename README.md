# Finanz-Snake

Browserbasiertes Snake-Spiel mit Finanzbildungs-Aspekten.

Um das Spiel zu starten, sollte ein lokaler Webserver verwendet werden, da moderne Browser beim direkten Öffnen von `index.html` lokale Module blockieren. Rufe dazu im Projektordner zum Beispiel

```bash
python3 -m http.server
```

auf und öffne danach die angegebene Adresse (z. B. <http://localhost:8000>) im Browser.

Entwickelt in TypeScript und Tailwind ohne Build-Tool – kompilierte Dateien liegen im `dist`-Ordner.
