# AI Chat API Dokumentation

## Endpoint

```
POST /api/chat/complete
```

## Input Format (JSON)

```json
{
  "prompt": "Die Benutzeranfrage",
  "document": "Das aktuelle Markdown-Dokument (optional, default: '')",
  "history": [] // Chat-Historie (optional)
}
```

### Beispiel-Request

```bash
curl -X POST http://localhost:3210/api/chat/complete \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Schreibe eine Einleitung über Markdown",
    "document": ""
  }'
```

## Output Format (JSON)

Die API gibt **immer beide Outputs** zurück:

```json
{
  "message": "Antwort/Erklärung an den Benutzer",
  "markdown": "Das angepasste Markdown-Dokument" oder null,
  "action": "REPLACE|INSERT|APPEND|PREPEND|ADVICE"
}
```

### Felder

- **message**: Die Antwort auf den Prompt (immer vorhanden)
- **markdown**: Das angepasste Dokument (null bei ADVICE)
- **action**: Die Art der Dokumentänderung

### Aktionen

| Action | Beschreibung | markdown-Feld |
|--------|--------------|---------------|
| `ADVICE` | Nur Beratung, keine Änderung | `null` |
| `REPLACE` | Ersetzt das gesamte Dokument | Vollständiges neues Dokument |
| `APPEND` | Fügt Text am Ende hinzu | Anzuhängender Text |
| `PREPEND` | Fügt Text am Anfang hinzu | Voranzustellender Text |
| `INSERT` | Fügt Text an Cursor-Position ein | Einzufügender Text |

## Beispiele

### 1. Beratung (ADVICE)

**Request:**
```json
{
  "prompt": "Was ist Markdown?",
  "document": "# Mein Dokument"
}
```

**Response:**
```json
{
  "message": "Markdown ist eine leichtgewichtige Auszeichnungssprache...",
  "markdown": null,
  "action": "ADVICE"
}
```

### 2. Dokument erstellen (REPLACE)

**Request:**
```json
{
  "prompt": "Schreibe eine Einleitung über KI",
  "document": ""
}
```

**Response:**
```json
{
  "message": "Ich habe eine Einleitung erstellt.",
  "markdown": "# Künstliche Intelligenz\n\nKI ist...",
  "action": "REPLACE"
}
```

### 3. Text anhängen (APPEND)

**Request:**
```json
{
  "prompt": "Füge eine Zusammenfassung hinzu",
  "document": "# Einleitung\n\nText..."
}
```

**Response:**
```json
{
  "message": "Ich habe eine Zusammenfassung hinzugefügt.",
  "markdown": "\n\n## Zusammenfassung\n\nDie wichtigsten Punkte...",
  "action": "APPEND"
}
```

## Backward Compatibility

Die API unterstützt auch das alte Format:

```json
{
  "message": "Benutzeranfrage",
  "currentMarkdown": "Dokument"
}
```

Das Response-Objekt enthält zusätzlich ein `content`-Feld für Legacy-Support.

## Fehlerbehandlung

Bei Fehlern wird ein JSON-Objekt mit `error`-Feld zurückgegeben:

```json
{
  "error": "Fehlerbeschreibung"
}
```

### Fehler-Codes

- `400`: Ungültige Anfrage (z.B. fehlender Prompt)
- `413`: Prompt zu lang (max 10.000 Zeichen)
- `500`: Server-Fehler
- `503`: API-Key nicht konfiguriert
