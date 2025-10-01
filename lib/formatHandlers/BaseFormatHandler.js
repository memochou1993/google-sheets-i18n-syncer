/* eslint-disable no-unused-vars */
import path from 'path';
import fs from 'fs';

/**
 * BaseFormatHandler
 * Abstract base class for all format handlers
 */
export default class BaseFormatHandler {
  /**
   * Get the file extension for this format
   * @returns {string} File extension with dot prefix
   */
  get extension() {
    throw new Error('extension must be implemented by subclass');
  }

  /**
   * Convert translation object to string format
   * @param {Object} translation - Translation object
   * @returns {string} Formatted content as string
   */
  save(translation) {
    throw new Error('save method must be implemented by subclass');
  }

  /**
   * Read and parse a translation file
   * @param {string} filePath - Path to the translation file
   * @returns {Object} Parsed translation object
   */
  read(filePath) {
    const fileContent = this.readFileContent(filePath);
    return this.parseContent(fileContent, path.basename(filePath));
  }

  /**
   * Read file content
   * @param {string} filePath - Path to the file
   * @returns {string} File content
   * @protected
   */
  readFileContent(filePath) {
    return fs.readFileSync(filePath, 'utf8');
  }

  /**
   * Parse file content (to be implemented by subclasses)
   * @param {string} content - File content
   * @param {string} fileName - File name for error reporting
   * @returns {Object} Parsed translation object
   * @protected
   */
  parseContent(content, fileName) {
    throw new Error('parseContent method must be implemented by subclass');
  }

  /**
   * Generate a file path for a language code
   * @param {string} dir - Directory path
   * @param {string} langCode - Language code
   * @returns {string} Complete file path
   */
  generateFilePath(dir, langCode) {
    return path.join(dir, `${langCode}${this.extension}`);
  }

  /**
   * Convert data to Google Sheets format (flatten nested objects)
   * @param {Object} translation - Translation object
   * @returns {Object} Flattened translation object
   */
  toSheets(translation) {
    return this.#flattenObject(translation);
  }

  /**
   * Convert data from Google Sheets format (restore nested structure)
   * @param {Object} flatData - Flattened translation data
   * @returns {Object} Nested translation object
   */
  fromSheets(flatData) {
    return this.#unflattenObject(flatData);
  }

  /**
   * Flatten a nested object into dotted key notation
   * @param {Object} obj - Object to flatten
   * @param {string} prefix - Key prefix
   * @param {Object} out - Output object
   * @returns {Object} Flattened object
   * @private
   */
  #flattenObject(obj, prefix = '', out = {}) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      out[prefix] = obj;
      return out;
    }

    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      this.#flattenObject(v, key, out);
    }

    return out;
  }

  /**
   * Convert flattened key-value pairs to nested object
   * @param {Object} kv - Flattened key-value pairs
   * @returns {Object} Nested object
   * @private
   */
  #unflattenObject(kv) {
    const out = {};

    for (const [dottedKey, value] of Object.entries(kv)) {
      if (!dottedKey) continue;

      const parts = String(dottedKey).split('.');
      let cur = out;

      for (let i = 0; i < parts.length; i++) {
        const key = parts[i].trim();

        if (i === parts.length - 1) {
          cur[key] = value;
          continue;
        }

        if (typeof cur[key] !== 'object' || cur[key] === null || Array.isArray(cur[key])) {
          cur[key] = {};
        }

        cur = cur[key];
      }
    }

    return out;
  }
}
