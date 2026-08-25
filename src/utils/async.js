export const DEFAULT_OPERATION_TIMEOUT = 12_000;

export function withTimeout(operation, options = {}) {
  const {
    timeout = DEFAULT_OPERATION_TIMEOUT,
    message = 'Le service met trop de temps à répondre. Vérifiez votre connexion puis réessayez.',
  } = options;

  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeout);
  });

  return Promise.race([Promise.resolve(operation), timeoutPromise])
    .finally(() => clearTimeout(timer));
}
