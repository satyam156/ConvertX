import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api', // Points directly to your Express server
});

// Automatically intercept every request and add the JWT token to headers if it exists
API.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default API;