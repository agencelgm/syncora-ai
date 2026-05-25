/**
 * @param {unknown} value
 * @returns {Record<string, any>}
 */
export const asObject = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return {};
    }
  }

  return {};
};

/**
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
export const asText = (value, fallback = '') => {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;

  const obj = asObject(value);
  if (typeof obj.message === 'string') return obj.message;
  if (typeof obj.text === 'string') return obj.text;
  if (typeof obj.content === 'string') return obj.content;

  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
};

/**
 * @param {unknown} value
 * @returns {string[]}
 */
export const asStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map(item => String(item || '').trim()).filter(Boolean);
};
