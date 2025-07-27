import BaseFormatHandler from './BaseFormatHandler.js';

/**
 * JsonFormatHandler
 * Handles reading and writing translation files in JSON format
 */
export default class JsonFormatHandler extends BaseFormatHandler {
  /**
   * Get the file extension for JSON format
   * @returns {string} File extension (.json)
   */
  get extension() {
    return '.json';
  }

  /**
   * Convert translation object to JSON string format
   * @param {Object} translation - Translation object
   * @returns {string} Formatted JSON content as string
   */
  save(translation) {
    return JSON.stringify(translation, null, 2);
  }

  /**
   * Parse JSON content
   * @param {string} content - File content
   * @param {string} fileName - File name for error reporting
   * @returns {Object} Parsed translation object
   * @protected
   */
  parseContent(content, fileName) {
    try {
      return JSON.parse(content);
    } catch (err) {
      throw new Error(`Invalid JSON in ${fileName}: ${err.message}`);
    }
  }
}
