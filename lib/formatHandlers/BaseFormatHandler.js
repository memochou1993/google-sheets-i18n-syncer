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
}
