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
    return `Function Base44 introuvable ou ancienne version active (${functionName}). Recharge l'app; si ca continue, le deploiement Base44 n'a pas encore publie cette function.`;
  }

  return message || `Erreur pendant l'appel ${functionName}.`;
};
