import axios from 'axios';

// Get backend base URL dynamically depending on hostname
const getBaseUrl = () => {
  const hostname = window.location.hostname;
  const port = '8000';
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:${port}`;
  }
  
  // If it's a subdomain on lvh.me or other domains
  return `${window.location.protocol}//${hostname}:${port}`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
});

// Request interceptor to add tenant-id header & authorization token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Extract tenant from subdomain if available, or fall back to localStorage
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  let tenantSlug = null;
  if (parts.length >= 3 && parts[0] !== 'www') {
    tenantSlug = parts[0];
  } else {
    tenantSlug = localStorage.getItem('tenant_slug');
  }
  
  if (tenantSlug) {
    config.headers['X-Tenant-Id'] = tenantSlug;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
