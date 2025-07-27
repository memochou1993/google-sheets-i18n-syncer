#!/usr/bin/env node

import { program } from 'commander';
import { I18nSyncer } from '../lib/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get package.json info for version
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.join(__dirname, '../package.json');
const { version } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Define the CLI version and description
program
  .name('i18n-syncer')
  .description('CLI to pull and push translations between Google Sheets and local files')
  .version(version);

// Helper function to handle common functionality for both commands
const createSyncer = (options) => {
  return new I18nSyncer({
    spreadsheetId: options.spreadsheetId,
    credentialsPath: options.credentials,
    translationDir: options.translationDir,
  });
};

// Enhanced error handler with more informative messages
const handleError = (error) => {
  if (error.code === 'ENOENT' && error.path?.includes('credentials.json')) {
    console.error('Error: Credentials file not found. Please provide a valid path to your Google API credentials.');
  } else if (error.message?.includes('invalid_grant') || error.message?.includes('authorization')) {
    console.error('Error: Google API authorization failed. Please check your credentials and permissions.');
  } else if (error.response?.status === 404) {
    console.error('Error: Spreadsheet not found. Please check your spreadsheet ID.');
  } else {
    console.error('Error:', error.message);
  }
  process.exit(1);
};

// Command to pull translations from Google Sheets
program
  .command('pull')
  .description('Pull translations from Google Sheets to translation files')
  .requiredOption('-s, --spreadsheet-id <id>', 'Google Spreadsheet ID')
  .option('-n, --sheet-name <name>', 'Name of the sheet to pull data from')
  .option('-c, --credentials <path>', 'Path to credentials file', './credentials.json')
  .option('-t, --translation-dir <directory>', 'Directory for translation JSON files', './translations')
  .action(async (options) => {
    try {
      console.log('Starting translation pull from Google Sheets...');

      const syncer = createSyncer(options);

      await syncer.pull({
        sheetName: options.sheetName,
        translationDir: options.translationDir,
      });

    } catch (error) {
      handleError(error);
    }
  });

// Command to push translations to Google Sheets
program
  .command('push')
  .description('Push translations from translation files to Google Sheets')
  .requiredOption('-s, --spreadsheet-id <id>', 'Google Spreadsheet ID')
  .option('-n, --sheet-name <name>', 'Name of the sheet to push data to')
  .option('-c, --credentials <path>', 'Path to credentials file', './credentials.json')
  .option('-t, --translation-dir <directory>', 'Directory for translation JSON files', './translations')
  .action(async (options) => {
    try {
      console.log('Starting translation push to Google Sheets...');

      const syncer = createSyncer(options);

      await syncer.push({
        sheetName: options.sheetName,
        translationDir: options.translationDir,
      });

    } catch (error) {
      handleError(error);
    }
  });

// Parse command line arguments
program.parse();
