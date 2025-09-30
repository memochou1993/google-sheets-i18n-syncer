# google-sheets-i18n-syncer

A command-line tool for syncing translation data from Google Sheets.

## Installation

Install the package as a project dependency:

```bash
npm i @memochou1993/google-sheets-i18n-syncer
```

After installation, you can use the CLI tool through npm scripts or via npx.

## Prerequisites

1. A Google Sheets spreadsheet with your translation data
2. Google API credentials (JSON file)

## Google Sheets Format

Your Google Sheets document should follow this format:

| Key           | en             | zh-TW         | ja             |
|---------------|----------------|---------------|----------------|
| greeting      | Hello          | 你好          | こんにちは     |
| goodbye       | Goodbye        | 再見          | さようなら     |
| thankyou      | Thank you      | 謝謝          | ありがとう     |
| welcome       | Welcome        | 歡迎          | ようこそ       |

- The first column must contain translation keys
- Each additional column represents a language with its language code as the header (en, zh-TW, ja, etc.)
- Column headers (language codes) will be used as filenames when generating translation files

## Configuration

You can configure the tool in two ways:

### Command-line Options

Pass options directly to the CLI commands (see examples in the Usage section).

### Environment Variables

Create a `.env` file in your project root with the following variables:

```BASH
# Required
I18N_SYNCER_SPREADSHEET_ID=your_spreadsheet_id_here

# Optional
I18N_SYNCER_SHEET_NAME=Translations
I18N_SYNCER_CREDENTIALS_PATH=./credentials.json
I18N_SYNCER_TRANSLATION_DIR=./translations
I18N_SYNCER_FORMAT=json
```

An example `.env.example` file is included in the package for reference.

## Usage

### Command Line

```bash
# Pull data from Google Sheets and save as language files
npx i18n-syncer pull --spreadsheet-id YOUR_SPREADSHEET_ID --credentials path/to/credentials.json

# Pull data from a specific sheet by name
npx i18n-syncer pull --spreadsheet-id YOUR_SPREADSHEET_ID --sheet-name "Sheet1" --credentials path/to/credentials.json

# Save language files to a custom directory
npx i18n-syncer pull --spreadsheet-id YOUR_SPREADSHEET_ID --translation-dir ./translations

# Push language files to Google Sheets
npx i18n-syncer push --spreadsheet-id YOUR_SPREADSHEET_ID --translation-dir ./translations

# Specify format (json or js)
npx i18n-syncer pull --spreadsheet-id YOUR_SPREADSHEET_ID --format js

# Specify main language for key ordering when pushing
npx i18n-syncer push --spreadsheet-id YOUR_SPREADSHEET_ID --format js --main-language en
```

Or add to your package.json scripts:

```json
{
  "scripts": {
    "i18n:pull": "i18n-syncer pull",
    "i18n:push": "i18n-syncer push"
  }
}
```

### Programmatic Usage

You can also use google-sheets-i18n-syncer programmatically in your Node.js applications:

```javascript
import { I18nSyncer } from 'google-sheets-i18n-syncer';

const syncer = new I18nSyncer({
  spreadsheetId: 'YOUR_SPREADSHEET_ID',
  credentialsPath: './credentials.json',
  translationDir: './translations',
});

// Pull data from Google Sheets to language files
await syncer.pull();

// Or pull data from a specific sheet
await syncer.pull({
  sheetName: 'Sheet1',
  translationDir: './custom-dir',
});

// Push language files to Google Sheets
await syncer.push({
  sheetName: 'Sheet1',
});

// Push with specific main language for key ordering
await syncer.push({
  sheetName: 'Sheet1',
  mainLanguage: 'en',
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

- `pull({ translationDir, sheetName, format })`: Pulls data from Google Sheets and saves as language-specific files
- `push({ translationDir, sheetName, format, mainLanguage })`: Pushes language files back to Google Sheets
  - `mainLanguage`: Specifies which language file to use as the base for key ordering (default: 'en')

### GoogleSheetsClient

Lower-level class for interacting with the Google Sheets API.

## License

MIT
