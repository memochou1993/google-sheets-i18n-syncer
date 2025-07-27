import { getFormatHandler } from './formatHandlers/index.js';
import fs from 'fs';
import GoogleSheetsClient from './GoogleSheetsClient.js';
import path from 'path';

/**
 * I18nSyncer class
 * Handles the workflow for syncing translations from Google Sheets and organizing by language
 */
export class I18nSyncer {
  #client;
  #translationDir;

  /**
   * Constructor
   * @param {Object} params - Constructor parameters
   * @param {string} params.spreadsheetId - Google Spreadsheet ID
   * @param {string} [params.credentialsPath='./credentials.json'] - Path to credentials file
   * @param {string} [params.translationDir='./translations'] - Directory for translation JSON files
   */
  constructor({
    spreadsheetId,
    credentialsPath = './credentials.json',
    translationDir = './translations',
  } = {}) {
    // Validate required parameters
    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID is required');
    }

    // Validate credentials path
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Credentials file not found at: ${credentialsPath}`);
    }

    this.#translationDir = translationDir;
    this.#client = new GoogleSheetsClient({
      spreadsheetId,
      credentialsPath,
    });

    // Ensure translation directory exists
    this.#ensureDirectoryExists(this.#translationDir);
  }

  /**
   * Ensure the specified directory exists
   * @param {string} dir - Directory path
   */
  #ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Directory created: ${dir}`);
    }
  }

  /**
   * Process data into language-specific key-value pairs
   * @param {Array} data - Raw sheet data
   * @returns {Object} Object with language codes as keys and their respective translation objects as values
   */
  #processDataByLanguage(data) {
    if (!data || data.length < 2) {
      console.log('Insufficient data for processing (minimum 2 rows required)');
      return {};
    }

    // First row contains headers: [Key, lang1, lang2, ...]
    const [headers] = data;

    // Assuming "Key" is always the first column
    const keyIndex = 0;

    // Create translation objects for each language
    const translations = {};

    // Initialize translation objects based on headers
    for (let i = 1; i < headers.length; i++) {
      const langCode = headers[i];
      translations[langCode] = {};
    }

    // Process each data row
    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      const key = row[keyIndex];

      // Skip if no key
      if (!key) continue;

      // For each language, add the translation
      for (let colIndex = 1; colIndex < headers.length; colIndex++) {
        const langCode = headers[colIndex];
        const value = row[colIndex] || '';

        // Store the translation value as is (no special handling for pipe character)
        translations[langCode][key] = value;
      }
    }

    return translations;
  }

  /**
   * Save translations to separate files based on format
   * @param {Object} translations - Processed translations data
   * @param {string} translationDir - Directory to save translation files
   * @param {string} [format='json'] - Format of translation files ('json', 'js', etc.)
   */
  #saveLanguageFiles(translations, translationDir, format = 'json') {
    // Only ensure directory exists if it's different from the default one
    if (translationDir !== this.#translationDir) {
      this.#ensureDirectoryExists(translationDir);
    }

    const formatHandler = getFormatHandler(format);

    for (const [langCode, translation] of Object.entries(translations)) {
      const filePath = formatHandler.generateFilePath(translationDir, langCode);
      const fileContent = formatHandler.save(translation);

      fs.writeFileSync(filePath, fileContent);
      console.log(`Translation file saved: ${filePath}`);
    }
  }

  /**
   * Pull translations from Google Sheets to translation files
   * @param {Object} params - Pull parameters
   * @param {string} [params.translationDir] - Directory to save translation files
   * @param {string} [params.sheetName] - Specific sheet name to pull from
   * @param {string} [params.format='json'] - Format of translation files ('json' or 'js')
   * @returns {Promise<Object>} Translations organized by language code
   */
  async pull({ translationDir, sheetName, format = 'json' } = {}) {
    try {
      console.log('Starting translation pull from Google Sheets...');

      // Initialize client
      await this.#client.initialize();

      // Determine which sheet to use
      let targetSheet = sheetName;

      // If no specific sheet name was provided, use the first sheet
      if (!targetSheet) {
        const sheetsList = await this.#client.getSheetList();

        // Return early if no sheets found
        if (!sheetsList.length) {
          console.error('No worksheets found in the spreadsheet');
          return {};
        }

        // Use first sheet
        const [firstSheet] = sheetsList;
        targetSheet = firstSheet.title;
      }

      console.log(`Fetching data from worksheet "${targetSheet}"...`);
      const data = await this.#client.getEntireSheetData(targetSheet);

      console.log('Processing data and generating language files...');
      const languageData = this.#processDataByLanguage(data);

      // Save language files
      const saveDir = translationDir || this.#translationDir;
      this.#saveLanguageFiles(languageData, saveDir, format);

      // Count languages and keys for symmetrical reporting with push
      const languageCount = Object.keys(languageData).length;
      let keyCount = 0;

      // Get key count if languages exist
      if (languageCount > 0) {
        const firstLang = Object.keys(languageData)[0];
        keyCount = Object.keys(languageData[firstLang]).length;
      }

      console.log(`Pulled ${keyCount} translation keys across ${languageCount} languages from Google Sheets`);
      return languageData;

    } catch (err) {
      console.error('Error pulling data:', err);
      throw err;
    }
  }

  /**
   * Push translations from translation files to Google Sheets
   * @param {Object} params - Push parameters
   * @param {string} [params.translationDir] - Directory to load translation files from
   * @param {string} [params.sheetName] - Specific sheet name to push to
   * @param {string} [params.format='json'] - Format of translation files to read
   * @returns {Promise<boolean>} Success status
   */
  async push({ translationDir, sheetName, format = 'json' } = {}) {
    try {
      // Initialize client
      await this.#client.initialize();

      const sourceDir = translationDir || this.#translationDir;
      console.log(`Scanning for language files in ${sourceDir}...`);

      // Check if directory exists
      if (!fs.existsSync(sourceDir)) {
        console.error(`Directory not found: ${sourceDir}`);
        return false;
      }

      const formatHandler = getFormatHandler(format);

      // Determine which sheet to use
      let targetSheet = sheetName;
      if (!targetSheet) {
        const sheetsList = await this.#client.getSheetList();

        if (!sheetsList.length) {
          console.error('No worksheets found in the spreadsheet');
          return false;
        }

        const [firstSheet] = sheetsList;
        targetSheet = firstSheet.title;
      }

      console.log(`Pushing translations to worksheet "${targetSheet}"...`);

      // Read all language files from the directory
      const languageFiles = fs.readdirSync(sourceDir)
        .filter(file => file.endsWith(formatHandler.extension))
        .map(file => {
          try {
            const filePath = path.join(sourceDir, file);
            let content;

            try {
              content = formatHandler.read(filePath);
            } catch (err) {
              console.warn(`Could not read ${file}: ${err.message}`);
              return null;
            }

            const langCode = path.basename(file, formatHandler.extension);
            return { langCode, content };
          } catch (err) {
            console.warn(`Could not process file ${file}: ${err.message}`);
            return null;
          }
        })
        .filter(Boolean);

      if (languageFiles.length === 0) {
        console.error(`No valid language files with extension ${formatHandler.extension} found in the specified directory`);
        return false;
      }

      console.log(`Found ${languageFiles.length} language files: ${languageFiles.map(f => f.langCode).join(', ')}`);

      // Convert language files to Google Sheets format
      // First, collect all unique keys across all language files
      const allKeys = new Set();
      languageFiles.forEach(({ content }) => {
        Object.keys(content).forEach(key => allKeys.add(key));
      });

      // Create the header row: [Key, lang1, lang2, ...]
      const headers = ['Key', ...languageFiles.map(f => f.langCode)];

      // Create the rows with translations for each key
      const rows = Array.from(allKeys).map(key => {
        // First column is the key
        const row = [key];

        // Add translations for each language
        languageFiles.forEach(({ content }) => {
          // Convert any problematic values to strings and handle potential undefined values
          let value = content[key] || '';

          // Handle nested objects and arrays by stringifying them
          if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
          }

          // Ensure the value is a string
          value = String(value);

          row.push(value);
        });

        return row;
      });

      // Prepare the complete data for upload (headers + rows)
      const sheetData = [headers, ...rows];

      // Log data dimensions for debugging
      console.log(`Preparing data: ${sheetData.length} rows × ${headers.length} columns`);

      // Additional check for any potential null/undefined values that could cause API errors
      const sanitizedData = sheetData.map(row =>
        row.map(cell => (cell === null || cell === undefined) ? '' : String(cell)),
      );

      // Clear and update the sheet with the sanitized data
      await this.#client.clearAndUpdateSheet(targetSheet, sanitizedData);

      console.log(`Pushed ${rows.length} translation keys across ${languageFiles.length} languages to Google Sheets`);
      return true;
    } catch (err) {
      console.error('Error pushing translations:', err);
      // Log more details about the error for debugging
      if (err.response && err.response.data) {
        console.error('API error details:', JSON.stringify(err.response.data, null, 2));
      }
      throw err;
    }
  }
}

export default I18nSyncer;
