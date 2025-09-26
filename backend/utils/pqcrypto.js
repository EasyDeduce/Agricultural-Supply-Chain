/**
 * Post-Quantum Cryptography Utility
 * Implements data encryption/decryption using Kyber and signatures using Dilithium
 */
const CryptoJS = require('crypto-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Helpers to lazily load ESM modules from CommonJS
let mlKEMPromise;
let mlDSAPromise;

const getMlKEM = async () => {
  if (!mlKEMPromise) {
    mlKEMPromise = import('@noble/post-quantum/ml-kem.js').then((mod) => mod.default || mod);
  }
  return mlKEMPromise;
};

const getMlDSA = async () => {
  if (!mlDSAPromise) {
    mlDSAPromise = import('@noble/post-quantum/ml-dsa.js').then((mod) => mod.default || mod);
  }
  return mlDSAPromise;
};

// Load environment variables
dotenv.config();

// Default key storage paths - should be set in .env
const KEY_STORAGE_DIR = process.env.PQC_KEY_STORAGE_DIR || path.join(__dirname, '..', 'keys');
const KYBER_PRIVATE_KEY_PATH = path.join(KEY_STORAGE_DIR, 'kyber_private.key');
const KYBER_PUBLIC_KEY_PATH = path.join(KEY_STORAGE_DIR, 'kyber_public.key');
const DILITHIUM_PRIVATE_KEY_PATH = path.join(KEY_STORAGE_DIR, 'dilithium_private.key');
const DILITHIUM_PUBLIC_KEY_PATH = path.join(KEY_STORAGE_DIR, 'dilithium_public.key');

// Ensure key directory exists
if (!fs.existsSync(KEY_STORAGE_DIR)) {
  fs.mkdirSync(KEY_STORAGE_DIR, { recursive: true });
}

/**
 * Generate Kyber key pair for encryption/decryption
 * @returns {Object} Object containing public and private keys
 */
const generateKyberKeys = async () => {
  try {
  const mlKEM = await getMlKEM();
  const kyber = mlKEM.ml_kem768;
  const { publicKey, secretKey } = kyber.keygen();
    
  // Save keys to files for persistence
  fs.writeFileSync(KYBER_PRIVATE_KEY_PATH, Buffer.from(secretKey).toString('hex'));
  fs.writeFileSync(KYBER_PUBLIC_KEY_PATH, Buffer.from(publicKey).toString('hex'));
    
  return { publicKey, privateKey: secretKey };
  } catch (error) {
    console.error('Error generating Kyber keys:', error);
    throw new Error('Failed to generate Kyber keys');
  }
};

/**
 * Generate Dilithium key pair for signing/verification
 * @returns {Object} Object containing public and private keys
 */
const generateDilithiumKeys = async () => {
  try {
  const mlDSA = await getMlDSA();
  const dilithium = mlDSA.ml_dsa65;
  const { publicKey, secretKey } = dilithium.keygen();

  // Save keys to files for persistence
  fs.writeFileSync(DILITHIUM_PRIVATE_KEY_PATH, Buffer.from(secretKey).toString('hex'));
  fs.writeFileSync(DILITHIUM_PUBLIC_KEY_PATH, Buffer.from(publicKey).toString('hex'));

  return { publicKey, privateKey: secretKey };
  } catch (error) {
    console.error('Error generating Dilithium keys:', error);
    throw new Error('Failed to generate Dilithium keys');
  }
};

/**
 * Load existing Kyber keys or generate new ones
 * @returns {Object} Object containing public and private keys
 */
const loadOrGenerateKyberKeys = async () => {
  try {
    if (fs.existsSync(KYBER_PRIVATE_KEY_PATH) && fs.existsSync(KYBER_PUBLIC_KEY_PATH)) {
  const privateKey = Buffer.from(fs.readFileSync(KYBER_PRIVATE_KEY_PATH, 'utf8'), 'hex');
  const publicKey = Buffer.from(fs.readFileSync(KYBER_PUBLIC_KEY_PATH, 'utf8'), 'hex');
  return { privateKey, publicKey };
    }
    return await generateKyberKeys();
  } catch (error) {
    console.error('Error loading Kyber keys:', error);
    return await generateKyberKeys();
  }
};

/**
 * Load existing Dilithium keys or generate new ones
 * @returns {Object} Object containing public and private keys
 */
const loadOrGenerateDilithiumKeys = async () => {
  try {
    if (fs.existsSync(DILITHIUM_PRIVATE_KEY_PATH) && fs.existsSync(DILITHIUM_PUBLIC_KEY_PATH)) {
      const privateKey = Buffer.from(fs.readFileSync(DILITHIUM_PRIVATE_KEY_PATH, 'utf8'), 'hex');
      const publicKey = Buffer.from(fs.readFileSync(DILITHIUM_PUBLIC_KEY_PATH, 'utf8'), 'hex');
      return { privateKey, publicKey };
    }
    return await generateDilithiumKeys();
  } catch (error) {
    console.error('Error loading Dilithium keys:', error);
    return await generateDilithiumKeys();
  }
};

/**
 * Encrypt data using Kyber
 * @param {Object|String} data - Data to encrypt
 * @returns {Object} Object containing encrypted data and ciphertext
 */
const encryptData = async (data) => {
  try {
    // Convert data to JSON string if it's an object
    const dataString = typeof data === 'object' ? JSON.stringify(data) : data;
    
    // Get Kyber keys
  const mlKEM = await getMlKEM();
  const kyber = mlKEM.ml_kem768;
    const keys = await loadOrGenerateKyberKeys();
    
    // Generate a shared secret and encapsulation
  const { cipherText, sharedSecret } = kyber.encapsulate(keys.publicKey);
    
    // Use the shared secret as AES key
    const aesKey = CryptoJS.enc.Hex.parse(Buffer.from(sharedSecret).toString('hex'));
    
    // Generate a random IV
    const iv = CryptoJS.lib.WordArray.random(16);
    
    // Encrypt data with AES using the shared secret
    const encrypted = CryptoJS.AES.encrypt(dataString, aesKey, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Return the encrypted data along with ciphertext and IV
    return {
  ciphertext: Buffer.from(cipherText).toString('hex'),
      encryptedData: encrypted.toString(),
      iv: iv.toString(CryptoJS.enc.Hex)
    };
  } catch (error) {
    console.error('Error encrypting data:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt data using Kyber
 * @param {Object} encryptedPackage - Object containing encrypted data, ciphertext, and IV
 * @returns {Object|String} Decrypted data
 */
const decryptData = async (encryptedPackage) => {
  try {
    const { ciphertext, encryptedData, iv } = encryptedPackage;
    
    // Get Kyber keys
  const mlKEM = await getMlKEM();
  const kyber = mlKEM.ml_kem768;
    const keys = await loadOrGenerateKyberKeys();
    
    // Decapsulate the shared secret using the ciphertext and private key
    const sharedSecret = kyber.decapsulate(
      Buffer.from(ciphertext, 'hex'),
      keys.privateKey
    );
    
    // Use the shared secret as AES key
    const aesKey = CryptoJS.enc.Hex.parse(Buffer.from(sharedSecret).toString('hex'));
    const ivValue = CryptoJS.enc.Hex.parse(iv);
    
    // Decrypt the data using AES
    const decrypted = CryptoJS.AES.decrypt(encryptedData, aesKey, {
      iv: ivValue,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    
    // Try to parse as JSON if possible
    try {
      return JSON.parse(decryptedText);
    } catch (e) {
      return decryptedText;
    }
  } catch (error) {
    console.error('Error decrypting data:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Sign data using Dilithium
 * @param {Object|String} data - Data to sign
 * @returns {Object} Object containing the data and signature
 */
const signData = async (data) => {
  try {
    // Convert data to string if it's an object
    const dataString = typeof data === 'object' ? JSON.stringify(data) : data;
    
    // Get Dilithium keys
  const mlDSA = await getMlDSA();
  const dilithium = mlDSA.ml_dsa65;
    const keys = await loadOrGenerateDilithiumKeys();
    
    // Sign the data
    const signature = await dilithium.sign(
      Buffer.from(dataString, 'utf8'),
      keys.privateKey
    );
    
    return {
      data,
      signature: Buffer.from(signature).toString('hex')
    };
  } catch (error) {
    console.error('Error signing data:', error);
    throw new Error('Failed to sign data');
  }
};

/**
 * Verify signed data using Dilithium
 * @param {Object} signedPackage - Object containing data and signature
 * @returns {Boolean} True if signature is valid
 */
const verifySignature = async (signedPackage) => {
  try {
    const { data, signature } = signedPackage;
    
    // Convert data to string if it's an object
    const dataString = typeof data === 'object' ? JSON.stringify(data) : data;
    
    // Get Dilithium keys
  const mlDSA = await getMlDSA();
  const dilithium = mlDSA.ml_dsa65;
    const keys = await loadOrGenerateDilithiumKeys();
    
    // Verify the signature
    return await dilithium.verify(
      Buffer.from(dataString, 'utf8'),
      Buffer.from(signature, 'hex'),
      keys.publicKey
    );
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
};

/**
 * Initialize PQC system by generating or loading keys
 */
const initPQCrypto = async () => {
  try {
    await loadOrGenerateKyberKeys();
    await loadOrGenerateDilithiumKeys();
    console.log('PQCrypto initialized successfully');
  } catch (error) {
    console.error('Error initializing PQCrypto:', error);
    throw new Error('Failed to initialize PQCrypto');
  }
};

// Export the utility functions
module.exports = {
  initPQCrypto,
  encryptData,
  decryptData,
  signData,
  verifySignature,
  generateKyberKeys,
  generateDilithiumKeys,
  loadOrGenerateKyberKeys,
  loadOrGenerateDilithiumKeys
};