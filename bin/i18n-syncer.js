#!/usr/bin/env node

import { program } from 'commander';
import { I18nSyncer } from '../lib/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

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
    process.exit(1);
  }

  if (error.message?.includes('invalid_grant') || error.message?.includes('authorization')) {
    console.error('Error: Google API authorization failed. Please check your credentials and permissions.');
    process.exit(1);
  }

  if (error.response?.status === 404) {
    console.error('Error: Spreadsheet not found. Please check your spreadsheet ID.');
    process.exit(1);
  }

  // Default case
  console.error('Error:', error.message);
  process.exit(1);
};

// Command to pull translations from Google Sheets
program
  .command('pull')
  .description('Pull translations from Google Sheets to translation files')
  .option('-s, --spreadsheet-id <id>', 'Google Spreadsheet ID', process.env.I18N_SYNCER_SPREADSHEET_ID)
  .option('-n, --sheet-name <name>', 'Name of the sheet to pull data from', process.env.I18N_SYNCER_SHEET_NAME)
  .option('-c, --credentials <path>', 'Path to credentials file', process.env.I18N_SYNCER_CREDENTIALS_PATH || './credentials.json')
  .option('-t, --translation-dir <directory>', 'Directory for translation JSON files', process.env.I18N_SYNCER_TRANSLATION_DIR || './translations')
  .option('-f, --format <format>', 'Format of translation files (json or js)', process.env.I18N_SYNCER_FORMAT || 'json')
  .action(async (options) => {
    try {
      // Check if spreadsheet ID is provided either as option or environment variable
      if (!options.spreadsheetId) {
        console.error('Error: Spreadsheet ID is required. Provide it with --spreadsheet-id option or set I18N_SYNCER_SPREADSHEET_ID in .env file.');
        process.exit(1);
      }

      console.log('Starting translation pull from Google Sheets...');

      const syncer = createSyncer(options);

      await syncer.pull({
        sheetName: options.sheetName,
        translationDir: options.translationDir,
        format: options.format,
      });

    } catch (error) {
      handleError(error);
    }
  });

// Command to push translations to Google Sheets
program
  .command('push')
  .description('Push translations from translation files to Google Sheets')
  .option('-s, --spreadsheet-id <id>', 'Google Spreadsheet ID', process.env.I18N_SYNCER_SPREADSHEET_ID)
  .option('-n, --sheet-name <name>', 'Name of the sheet to push data to', process.env.I18N_SYNCER_SHEET_NAME)
  .option('-c, --credentials <path>', 'Path to credentials file', process.env.I18N_SYNCER_CREDENTIALS_PATH || './credentials.json')
  .option('-t, --translation-dir <directory>', 'Directory for translation JSON files', process.env.I18N_SYNCER_TRANSLATION_DIR || './translations')
  .option('-f, --format <format>', 'Format of translation files to read (json or js)', process.env.I18N_SYNCER_FORMAT || 'json')
  .action(async (options) => {
    try {
      // Check if spreadsheet ID is provided either as option or environment variable
      if (!options.spreadsheetId) {
        console.error('Error: Spreadsheet ID is required. Provide it with --spreadsheet-id option or set I18N_SYNCER_SPREADSHEET_ID in .env file.');
        process.exit(1);
      }

      console.log('Starting translation push to Google Sheets...');

      const syncer = createSyncer(options);

      await syncer.push({
        sheetName: options.sheetName,
        translationDir: options.translationDir,
        format: options.format,
      });

    } catch (error) {
      handleError(error);
    }
  });

// Parse command line arguments
program.parse();
