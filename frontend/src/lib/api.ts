const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

const getDevelopmentApiUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }

  if (localHosts.has(window.location.hostname)) {
    return 'http://localhost:4000';
  }

  return null;
};

const configuredApiUrl = import.meta.env.VITE_API_URL || getDevelopmentApiUrl();

if (!configuredApiUrl) {
  throw new Error('VITE_API_URL is missing');
}

export const API_URL = configuredApiUrl.replace(/\/$/, '');
