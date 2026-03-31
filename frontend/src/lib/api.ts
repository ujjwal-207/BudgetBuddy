const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

const getDefaultApiUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }

  if (localHosts.has(window.location.hostname)) {
    return 'http://localhost:4000';
  }

  return window.location.origin;
};

export const API_URL = (import.meta.env.VITE_API_URL || getDefaultApiUrl()).replace(/\/$/, '');
