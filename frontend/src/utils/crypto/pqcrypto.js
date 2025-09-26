/**
 * Frontend Post-Quantum Cryptography Utility
 * Handles PQC signature verification for frontend API calls
 */
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import CryptoJS from 'crypto-js';

// Public key for Dilithium signature verification
// This should match the public key generated on the backend
// In a real-world scenario, this would be fetched from the server securely during initialization
let dilithiumPublicKey = null;

/**
 * Initialize the PQC system
 * @param {string} publicKeyHex - Hex representation of the public key
 */
export const initPQCrypto = (publicKeyHex) => {
  if (publicKeyHex) {
    dilithiumPublicKey = Buffer.from(publicKeyHex, 'hex');
  }
};

/**
 * Get the PQC signature for a token to be sent with API requests
 * @param {string} token - JWT token to sign
 * @param {string} signature - PQC signature from backend
 * @returns {Object} Headers object with PQC signature
 */
export const getPQCHeaders = (token, signature) => {
  if (!token || !signature) {
    return {};
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'X-PQC-Signature': signature
  };
};

/**
 * Verify a signature using Dilithium
 * @param {Object} signedPackage - Object containing data and signature
 * @returns {Promise<boolean>} Promise resolving to true if signature is valid
 */
export const verifySignature = async (signedPackage) => {
  try {
    if (!dilithiumPublicKey) {
      console.warn('PQC not initialized with public key');
      return false;
    }
    
    const { data, signature } = signedPackage;
    
    // Convert data to string if it's an object
    const dataString = typeof data === 'object' ? JSON.stringify(data) : data;
    
    // Get Dilithium instance
  const dilithium = ml_dsa65;
    
    // Verify the signature
    return await dilithium.verify(
      Buffer.from(dataString, 'utf8'),
      Buffer.from(signature, 'hex'),
      dilithiumPublicKey
    );
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
};

export default {
  initPQCrypto,
  getPQCHeaders,
  verifySignature
};