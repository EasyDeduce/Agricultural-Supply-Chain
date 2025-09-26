import axios from 'axios';
import pqcrypto from '../utils/crypto/pqcrypto';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const pqcSignature = localStorage.getItem('pqcSignature');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // Add PQC signature header if available
      if (pqcSignature) {
        config.headers['X-PQC-Signature'] = pqcSignature;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear localStorage if unauthorized
      localStorage.removeItem('token');
      
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API with PQC support
export const authAPI = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.pqcSignature) {
      localStorage.setItem('pqcSignature', response.data.pqcSignature);
    }
    return response;
  },
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.pqcSignature) {
      localStorage.setItem('pqcSignature', response.data.pqcSignature);
    }
    return response;
  },
  verifyWallet: (walletAddress) => api.post('/auth/verify-wallet', { walletAddress }),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('pqcSignature');
  }
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (userData) => api.put('/users/profile', userData),
  getUserByWallet: (walletAddress) => api.get(`/users/by-wallet/${walletAddress}`),
  getFarmerProfile: (farmerId) => api.get(`/users/farmer/${farmerId}`),
  getCertifierProfile: (certifierId) => api.get(`/users/certifier/${certifierId}`),
  getRetailerProfile: (retailerId) => api.get(`/users/retailer/${retailerId}`),
  updateHarvestDate: (harvestDate) => api.put('/users/farmer/harvest-date', { harvestDate }),
  addCrop: (cropId, role, certified) => api.put('/users/add-crop', { cropId, role, certified }),
};

// Batch API
export const batchAPI = {
  getAllBatches: () => api.get('/batches'),
  getBatchById: (batchId) => api.get(`/batches/${batchId}`),
  createBatch: (batchData) => api.post('/batches', batchData),
  certifyBatch: (batchId, certData) => api.put(`/batches/${batchId}/certify`, certData),
  purchaseBatch: (batchId, purchaseData) => api.put(`/batches/${batchId}/purchase`, purchaseData),
  searchBatches: (query) => api.get(`/batches/search/${query}`),
  getFarmerBatches: (walletAddress) => api.get(`/batches/farmer/${walletAddress}`),
  getCertifierBatches: (walletAddress) => api.get(`/batches/certifier/${walletAddress}`),
  getRetailerBatches: (walletAddress) => api.get(`/batches/retailer/${walletAddress}`),
  getPendingCertificationBatches: () => api.get('/batches/pending-certification'),
  getAvailablePurchaseBatches: () => api.get('/batches/available-purchase'),
};

export default api;
