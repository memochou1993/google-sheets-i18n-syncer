# google-sheets-i18n-syncer

A command-line tool for syncing translation data from Google Sheets.

## Installation

### Global Installation

```bash
npm install -g google-sheets-i18n-syncer
```

### Local Installation

```bash
npm install google-sheets-i18n-syncer
```

## Prerequisites

1. A Google Sheets spreadsheet with your translation data
2. Google API credentials (JSON file)

## Usage

### Command Line

```bash
# Pull data from Google Sheets and save as language files
i18n-syncer pull --spreadsheet-id YOUR_SPREADSHEET_ID --credentials path/to/credentials.json

# Pull data from a specific sheet by name
i18n-syncer pull --spreadsheet-id YOUR_SPREADSHEET_ID --sheet-name "Sheet1" --credentials path/to/credentials.json

# Save language files to a custom directory
i18n-syncer pull --spreadsheet-id YOUR_SPREADSHEET_ID --translation-dir ./translations

# Push language files to Google Sheets
i18n-syncer push --spreadsheet-id YOUR_SPREADSHEET_ID --translation-dir ./translations
```

### Programmatic Usage

You can also use google-sheets-i18n-syncer programmatically in your Node.js applications:

```javascript
import { I18nSyncer } from 'google-sheets-i18n-syncer';

const syncer = new I18nSyncer({
  spreadsheetId: 'YOUR_SPREADSHEET_ID',
  credentialsPath: './credentials.json',
  translationDir: './translations'
});

// Pull data from Google Sheets to language files
await syncer.pull();

// Or pull data from a specific sheet
await syncer.pull({
  sheetName: 'Sheet1',
  translationDir: './custom-dir'
});

// Push language files to Google Sheets
await syncer.push({
  sheetName: 'Sheet1'
});
```

## API Documentation

### I18nSyncer

The main class for syncing translation data with Google Sheets.

#### Constructor Options

- `spreadsheetId`: Your Google Spreadsheet ID
- `credentialsPath`: Path to your Google API credentials JSON file (default: './credentials.json')
- `translationDir`: Directory where translation JSON files will be stored (default: './translations')

#### Methods

- `pull({ translationDir, sheetName })`: Pulls data from Google Sheets and saves as language-specific JSON files
- `push({ translationDir, sheetName })`: Pushes language files back to Google Sheets

### GoogleSheetsClient

Lower-level class for interacting with the Google Sheets API.

## License

ISC
