const isNode = typeof window === 'undefined';
const memoryStorage = new Map();

const storage = isNode
  ? {
      setItem: (key, value) => {
        memoryStorage.set(key, String(value));
      },
      getItem: (key) => memoryStorage.get(key) || null,
      removeItem: (key) => {
        memoryStorage.delete(key);
      },
    }
  : window.localStorage;

const env = /** @type {Record<string, string | undefined>} */ (import.meta.env || {});

const toSnakeCase = (str) => {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
};

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
  if (isNode) {
    return defaultValue || null;
  }

  const storageKey = `base44_${toSnakeCase(paramName)}`;
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);

  if (removeFromUrl) {
    urlParams.delete(paramName);
    const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, newUrl);
  }

  if (searchParam) {
    storage.setItem(storageKey, searchParam);
    return searchParam;
  }

  if (defaultValue) {
    storage.setItem(storageKey, defaultValue);
    return defaultValue;
  }

  return storage.getItem(storageKey);
};

const getVolatileAppParamValue = (paramName, { defaultValue = undefined } = {}) => {
  if (isNode) {
    return defaultValue || null;
  }

  const storageKey = `base44_${toSnakeCase(paramName)}`;
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);

  if (searchParam) {
    storage.setItem(storageKey, searchParam);
    return searchParam;
  }

  if (defaultValue) {
    storage.setItem(storageKey, defaultValue);
    return defaultValue;
  }

  // Do not keep a stale functions version forever. A stale header can make
  // newly deployed Base44 functions return 404 even after the frontend updated.
  storage.removeItem(storageKey);
  return null;
};

const getAppParams = () => {
  if (getAppParamValue('clear_access_token') === 'true') {
    storage.removeItem('base44_access_token');
    storage.removeItem('token');
  }

  return {
    appId: getAppParamValue('app_id', { defaultValue: env.VITE_BASE44_APP_ID }),
    token: getAppParamValue('access_token', { removeFromUrl: true }),
    fromUrl: getAppParamValue('from_url', { defaultValue: isNode ? undefined : window.location.href }),
    functionsVersion: getVolatileAppParamValue('functions_version', { defaultValue: env.VITE_BASE44_FUNCTIONS_VERSION }),
    appBaseUrl: getAppParamValue('app_base_url', { defaultValue: env.VITE_BASE44_APP_BASE_URL }),
  };
};

export const appParams = {
  ...getAppParams(),
};
