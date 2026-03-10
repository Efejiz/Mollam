const API_URL = location.origin;
export const APP_VERSION = '2.5.0';

/**
 * Perform a fetch request with active authorization headers if applicable.
 */
export async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('mollam_token');

    const defaultHeaders = {
        'Content-Type': 'application/json'
    };

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'API request failed');
        }

        return { success: true, data };
    } catch (error) {
        console.error(`API Error on ${endpoint}:`, error);
        return { success: false, error: error.message };
    }
}
