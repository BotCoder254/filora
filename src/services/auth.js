import api from './api';

export const authService = {
  async signup(userData) {
    const response = await api.post('/auth/signup/', userData);
    if (response.data.access) {
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
    }
    return response.data;
  },

  async login(credentials) {
    const response = await api.post('/auth/login/', credentials);
    if (response.data.access) {
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
    }
    return response.data;
  },

  async getMe() {
    const response = await api.get('/auth/me/');
    return response.data;
  },

  async passwordReset(email) {
    const response = await api.post('/auth/password-reset/', { email });
    return response.data;
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  isAuthenticated() {
    return !!localStorage.getItem('access_token');
  }
};