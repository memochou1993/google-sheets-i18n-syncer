import JsonFormatHandler from './JsonFormatHandler.js';
import JsFormatHandler from './JsFormatHandler.js';

/**
 * @import BaseFormatHandler from './BaseFormatHandler.js';
 */

// Export all format handlers
export {
  JsonFormatHandler,
  JsFormatHandler,
};

// Map of format name to handler class
const formatHandlers = {
  json: JsonFormatHandler,
  js: JsFormatHandler,
};

/**
 * Get a format handler instance by format name
 * @param {string} format - Format name (e.g., 'json', 'js')
 * @returns {BaseFormatHandler} Format handler instance
 */
export function getFormatHandler(format = 'json') {
  const formatLower = format.toLowerCase();
  const HandlerClass = formatHandlers[formatLower];

  if (!HandlerClass) {
    console.warn(`Invalid format "${format}", using "json" as default`);
    return new formatHandlers.json();
  }

  return new HandlerClass();
}

export default {
  getFormatHandler,
};
