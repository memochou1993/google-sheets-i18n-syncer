import BaseFormatHandler from './BaseFormatHandler.js';

/**
 * JsFormatHandler
 * Handles reading and writing translation files in JavaScript module format
 */
export default class JsFormatHandler extends BaseFormatHandler {
  /**
   * Get the file extension for JavaScript format
   * @returns {string} File extension (.js)
   */
  get extension() {
    return '.js';
  }

  /**
   * Convert translation object to JavaScript module string format
   * @param {Object} translation - Translation object
   * @returns {string} Formatted JavaScript module content as string
   */
  save(translation) {
    // Serialize with unquoted keys and single-quoted string values
    const escapeString = (s) => String(s)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, '\\' + String.fromCharCode(39))
      .replace(/\r?\n/g, '\\n');

    const serializeObject = (obj, level = 0) => {
      const isPlainObject = obj && typeof obj === 'object' && !Array.isArray(obj);
      if (!isPlainObject) {
        // For non-objects (numbers, booleans, arrays, null, undefined) coerce to string and single-quote
        return `'${escapeString(String(obj))}'`;
      }

      const indent = '  '.repeat(level + 1);
      const closing = '  '.repeat(level);
      const lines = Object.entries(obj).map(([k, v]) => {
        const valueStr = (v && typeof v === 'object' && !Array.isArray(v))
          ? serializeObject(v, level + 1)
          : `'${escapeString(String(v))}'`;
        // Do not quote keys per requirement
        return `${indent}${k}: ${valueStr},`;
      });
      return `{\n${lines.join('\n')}\n${closing}}`;
    };

    const body = serializeObject(translation, 0);
    return `export default ${body};\n`;
  }

  /**
   * Parse JavaScript module content
   * @param {string} content - File content
   * @param {string} fileName - File name for error reporting
   * @returns {Object} Parsed translation object
   * @protected
   */
  parseContent(content, fileName) {
    const jsObject = this.#extractObjectFromModule(content, fileName);
    return this.#evaluateJsObject(jsObject, fileName);
  }

  /**
   * Extract JavaScript object from module export statement
   * @param {string} content - File content
   * @param {string} fileName - File name for error reporting
   * @returns {string} JavaScript object as string
   * @private
   */
  #extractObjectFromModule(content, fileName) {
    // Try to match export default with object (most common pattern)
    const patterns = [
      /export\s+default\s+(\{[\s\S]*?\n\};?)/m,  // With newline before closing brace
      /export\s+default\s+(\{[\s\S]*?\};?)/m,     // Without requiring newline
    ];

    // Try each pattern until we find a match
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // If we get here, no patterns matched
    throw new Error(`Could not find valid export default statement in ${fileName}`);
  }

  /**
   * Safely evaluate a JavaScript object string
   * @param {string} jsObjectStr - JavaScript object as string
   * @param {string} fileName - File name for error reporting
   * @returns {Object} Parsed object
   * @private
   */
  #evaluateJsObject(jsObjectStr, fileName) {
    try {
      // Remove any trailing semicolons before evaluating
      const cleanJsObject = jsObjectStr.replace(/;+\s*$/, '');

      // This is generally not recommended, but in this controlled case it's acceptable
      // We're only parsing translation files that we control
      return eval(`(${cleanJsObject})`);
    } catch (err) {
      throw new Error(`Failed to parse JS content in ${fileName}: ${err.message}`);
    }
  }
}
