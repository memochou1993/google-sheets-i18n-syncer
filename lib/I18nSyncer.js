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

  // Helpers to transform between dotted keys and nested objects
  #setNestedValue(target, dottedKey, value) {
    const parts = String(dottedKey).split('.');
    let cur = target;
    for (let i = 0; i < parts.length; i++) {
      const k = parts[i];
      if (i === parts.length - 1) {
        cur[k] = value;
      } else {
        if (typeof cur[k] !== 'object' || cur[k] === null || Array.isArray(cur[k])) {
          cur[k] = {};
        }
        cur = cur[k];
      }
    }
  }

  #unflattenObjectFromMap(kv) {
    const out = {};
    for (const [k, v] of Object.entries(kv)) {
      if (!k) continue;
      this.#setNestedValue(out, k, v);
    }
    return out;
  }

  #flattenObject(obj, prefix = '', out = {}) {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        this.#flattenObject(v, key, out);
      }
    } else {
      out[prefix] = obj;
    }
    return out;
  }

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

        // Convert actual newlines to escaped \n strings
        const processedValue = value.replace(/\r?\n/g, '\\n');

        // Store the processed translation value (flattened map for now)
        translations[langCode][key] = processedValue;
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
      const languageDataFlat = this.#processDataByLanguage(data);

      // If saving as JS, restore nested structure from dotted keys
      const languageData = (format && format.toLowerCase() === 'js')
        ? Object.fromEntries(Object.entries(languageDataFlat).map(([lang, kv]) => [lang, this.#unflattenObjectFromMap(kv)]))
        : languageDataFlat;

      // Save language files
      const saveDir = translationDir || this.#translationDir;
      this.#saveLanguageFiles(languageData, saveDir, format);

      // Count languages and keys for symmetrical reporting with push
      const languageCount = Object.keys(languageData).length;
      let keyCount = 0;

      // Get key count if languages exist
      if (languageCount > 0) {
        const firstLang = Object.keys(languageDataFlat)[0];
        keyCount = Object.keys(languageDataFlat[firstLang]).length;
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
   * @param {string} [params.mainLanguage='en'] - Main language to use as base for key ordering
   * @returns {Promise<boolean>} Success status
   */
  async push({ translationDir, sheetName, format = 'json', mainLanguage = 'en' } = {}) {
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

      // Sort language files to prioritize the specified main language for key order
      // Also put files starting with underscore at the end
      languageFiles.sort((a, b) => {
        // Main language always comes first
        if (a.langCode === mainLanguage) return -1;
        if (b.langCode === mainLanguage) return 1;

        // Files starting with underscore come last
        const aStartsWithUnderscore = a.langCode.startsWith('_');
        const bStartsWithUnderscore = b.langCode.startsWith('_');

        if (aStartsWithUnderscore && !bStartsWithUnderscore) return 1;
        if (!aStartsWithUnderscore && bStartsWithUnderscore) return -1;

        // For all other cases, sort alphabetically
        return a.langCode.localeCompare(b.langCode);
      });

      console.log(`Using ${mainLanguage} as the primary language for key ordering`);

      // Flatten contents (so nested JS objects become dotted keys for Sheets)
      const flattenedByLang = Object.fromEntries(
        languageFiles.map(({ langCode, content }) => [
          langCode,
          this.#flattenObject(content),
        ]),
      );

      // Collect all unique keys while preserving the order from the main language file
      const allKeys = [];
      const keySet = new Set();

      // First, add keys from the main language file to maintain its order
      const mainLanguageFile = languageFiles.find(f => f.langCode === mainLanguage);

      if (!mainLanguageFile) {
        console.warn(`Main language file (${mainLanguage}) not found, using first available file for key ordering`);
        if (languageFiles.length > 0) {
          Object.keys(flattenedByLang[languageFiles[0].langCode]).forEach(key => {
            if (!keySet.has(key)) {
              allKeys.push(key);
              keySet.add(key);
            }
          });
        }
      }

      if (mainLanguageFile) {
        Object.keys(flattenedByLang[mainLanguageFile.langCode]).forEach(key => {
          if (!keySet.has(key)) {
            allKeys.push(key);
            keySet.add(key);
          }
        });
        console.log(`Main language file (${mainLanguage}) has ${Object.keys(flattenedByLang[mainLanguageFile.langCode]).length} keys`);
      }

      // Then add any additional keys from other language files
      languageFiles.forEach(({ langCode }) => {
        Object.keys(flattenedByLang[langCode]).forEach(key => {
          if (!keySet.has(key)) {
            console.log(`Adding missing key "${key}" from ${langCode}`);
            allKeys.push(key);
            keySet.add(key);
          }
        });
      });

      const headers = ['Key', ...languageFiles.map(f => f.langCode)];

      // Create the rows with translations for each key
      const rows = allKeys.map(key => {
        // First column is the key
        const row = [key];

        // Add translations for each language
        languageFiles.forEach(({ langCode }) => {
          // Convert any problematic values to strings and handle potential undefined values
          let value = flattenedByLang[langCode][key] ?? '';

          // Handle nested objects and arrays by stringifying them
          if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
          }

          // Ensure the value is a string
          value = String(value);

          // Convert \n string representations to actual newlines for Google Sheets display
          value = value.replace(/\\n/g, '\n');

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
