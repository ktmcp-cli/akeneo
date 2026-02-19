import axios from 'axios';
import { getConfig, setConfig } from './config.js';

const DEFAULT_BASE_URL = 'https://demo.akeneo.com/api/rest/v1';

async function getAccessToken() {
  const baseUrl = getConfig('baseUrl') || DEFAULT_BASE_URL;
  const clientId = getConfig('clientId');
  const clientSecret = getConfig('clientSecret');
  const username = getConfig('username');
  const password = getConfig('password');

  // Check if we have a valid cached token
  const cachedToken = getConfig('accessToken');
  const tokenExpiry = getConfig('tokenExpiry');
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  // Get the base URL without /api/rest/v1
  const authBaseUrl = baseUrl.replace('/api/rest/v1', '');

  try {
    const response = await axios.post(`${authBaseUrl}/api/oauth/v1/token`, {
      grant_type: 'password',
      client_id: clientId,
      client_secret: clientSecret,
      username,
      password
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const { access_token, expires_in } = response.data;
    setConfig('accessToken', access_token);
    setConfig('tokenExpiry', Date.now() + (expires_in * 1000) - 60000);
    return access_token;
  } catch (error) {
    if (error.response) {
      const msg = error.response.data?.message || JSON.stringify(error.response.data);
      throw new Error(`Authentication failed: ${msg}`);
    }
    throw new Error(`Cannot connect to Akeneo at ${authBaseUrl}. Check your base URL.`);
  }
}

async function getClient() {
  const token = await getAccessToken();
  const baseURL = getConfig('baseUrl') || DEFAULT_BASE_URL;

  return axios.create({
    baseURL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
}

function handleApiError(error) {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    if (status === 401) throw new Error('Authentication failed. Run: akeneo config set --client-id ... --client-secret ... --username ... --password ...');
    if (status === 403) throw new Error('Access forbidden. Check your Akeneo user permissions.');
    if (status === 404) throw new Error('Resource not found in Akeneo.');
    if (status === 422) throw new Error(`Validation error: ${JSON.stringify(data?.errors || data)}`);
    if (status === 429) throw new Error('Rate limit exceeded. Please wait before retrying.');
    const message = data?.message || JSON.stringify(data);
    throw new Error(`API Error (${status}): ${message}`);
  } else if (error.request) {
    const baseURL = getConfig('baseUrl') || DEFAULT_BASE_URL;
    throw new Error(`No response from Akeneo at ${baseURL}. Check your instance URL.`);
  } else {
    throw error;
  }
}

function parseAkeneoList(response) {
  // Akeneo returns paginated results in HAL format
  const data = response.data;
  if (data._embedded && data._embedded.items) {
    return data._embedded.items;
  }
  return Array.isArray(data) ? data : [];
}

// ============================================================
// PRODUCTS
// ============================================================

export async function listProducts({ limit = 20, page = 1, search } = {}) {
  try {
    const client = await getClient();
    const params = { limit, page };
    if (search) params.search = search;
    const response = await client.get('/products', { params });
    return parseAkeneoList(response);
  } catch (error) {
    handleApiError(error);
  }
}

export async function getProduct(code) {
  try {
    const client = await getClient();
    const response = await client.get(`/products/${code}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function createProduct({ identifier, family, categories, values }) {
  try {
    const client = await getClient();
    const body = {
      identifier,
      ...(family && { family }),
      ...(categories && { categories }),
      ...(values && { values })
    };
    await client.post('/products', body);
    return { identifier, family, categories };
  } catch (error) {
    handleApiError(error);
  }
}

// ============================================================
// CATEGORIES
// ============================================================

export async function listCategories({ limit = 20, page = 1 } = {}) {
  try {
    const client = await getClient();
    const params = { limit, page };
    const response = await client.get('/categories', { params });
    return parseAkeneoList(response);
  } catch (error) {
    handleApiError(error);
  }
}

export async function getCategory(code) {
  try {
    const client = await getClient();
    const response = await client.get(`/categories/${code}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function createCategory({ code, parent, labels }) {
  try {
    const client = await getClient();
    const body = {
      code,
      ...(parent && { parent }),
      ...(labels && { labels })
    };
    await client.post('/categories', body);
    return { code, parent, labels };
  } catch (error) {
    handleApiError(error);
  }
}

// ============================================================
// ATTRIBUTES
// ============================================================

export async function listAttributes({ limit = 20, page = 1, type } = {}) {
  try {
    const client = await getClient();
    const params = { limit, page };
    if (type) params.search = JSON.stringify({ type: [{ operator: '=', value: type }] });
    const response = await client.get('/attributes', { params });
    return parseAkeneoList(response);
  } catch (error) {
    handleApiError(error);
  }
}

export async function getAttribute(code) {
  try {
    const client = await getClient();
    const response = await client.get(`/attributes/${code}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function createAttribute({ code, type, group, labels, scopable = false, localizable = false }) {
  try {
    const client = await getClient();
    const body = {
      code,
      type,
      group: group || 'other',
      scopable,
      localizable,
      ...(labels && { labels })
    };
    await client.post('/attributes', body);
    return { code, type, group: group || 'other' };
  } catch (error) {
    handleApiError(error);
  }
}
