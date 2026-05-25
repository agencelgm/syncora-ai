export const unwrapFunctionResponse = (response) => {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data;
  }
  return response;
};

export const readFunctionError = (err, functionName = 'function') => {
  const status = err?.status || err?.response?.status;
  const data = err?.data || err?.response?.data;
  const message = data?.message || data?.error || err?.message;

  if (status === 404) {
    return `Le module de synchronisation n'est pas encore publie cote Base44 (${functionName}). Publie les backend functions dans Base44 Dashboard, puis reessaie.`;
  }

  return message || `Erreur pendant l'appel ${functionName}.`;
};
