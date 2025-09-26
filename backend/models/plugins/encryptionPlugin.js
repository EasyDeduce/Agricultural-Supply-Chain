/**
 * Mongoose schema plugin for field encryption using PQC
 */
const pqcrypto = require('../../utils/pqcrypto');

/**
 * Plugin to handle PQC encryption/decryption for mongoose schemas
 * @param {Schema} schema - Mongoose schema
 * @param {Object} options - Options object with fields to encrypt
 */
module.exports = function encryptionPlugin(schema, options = {}) {
  const encryptedFields = options.fields || [];
  
  // Skip if no fields to encrypt
  if (!encryptedFields.length) return;

  // Add fields to store encrypted data
  schema.add({
    _encrypted: {
      type: Map,
      of: String,
      default: () => new Map(),
      select: false // Don't return these in queries by default
    },
    _encryptedCiphers: {
      type: Map,
      of: String,
      default: () => new Map(),
      select: false
    },
    _encryptedIVs: {
      type: Map, 
      of: String,
      default: () => new Map(),
      select: false
    }
  });

  // Pre-save hook to encrypt fields
  schema.pre('save', async function(next) {
    for (const field of encryptedFields) {
      // Skip if field hasn't been modified
      if (!this.isModified(field)) continue;

      // Skip if field value is undefined or null
      if (this[field] === undefined || this[field] === null) continue;

      try {
        // Encrypt the field value
        const { ciphertext, encryptedData, iv } = await pqcrypto.encryptData(this[field]);
        
        // Store encrypted data
        // Ensure maps exist (in case this doc was created without defaults loaded)
        if (!this._encrypted) this._encrypted = new Map();
        if (!this._encryptedCiphers) this._encryptedCiphers = new Map();
        if (!this._encryptedIVs) this._encryptedIVs = new Map();

        this._encrypted.set(field, encryptedData);
        this._encryptedCiphers.set(field, ciphertext);
        this._encryptedIVs.set(field, iv);
        
      } catch (error) {
        console.error(`Error encrypting field ${field}:`, error);
        return next(error);
      }
    }
    next();
  });

  // Always include encryption metadata when querying so decrypt methods can work
  // (These fields are still stripped out in toSafeJSON before returning responses.)
  schema.pre(/^find/, function(next) {
    this.select('+_encrypted +_encryptedCiphers +_encryptedIVs');
    next();
  });

  // Add method to decrypt fields
  schema.methods.decryptField = async function(field) {
    if (!encryptedFields.includes(field)) {
      throw new Error(`Field ${field} is not configured for encryption`);
    }
    
    // Check if encrypted data exists for this field
    if (
      !this._encrypted || typeof this._encrypted.get !== 'function' ||
      !this._encryptedCiphers || typeof this._encryptedCiphers.get !== 'function' ||
      !this._encryptedIVs || typeof this._encryptedIVs.get !== 'function' ||
      !this._encrypted.get(field) ||
      !this._encryptedCiphers.get(field) ||
      !this._encryptedIVs.get(field)
    ) {
      return this[field]; // Return original value if not encrypted
    }
    
    try {
      // Decrypt the field
      const encryptedPackage = {
        encryptedData: this._encrypted.get(field),
        ciphertext: this._encryptedCiphers.get(field),
        iv: this._encryptedIVs.get(field)
      };
      
      return await pqcrypto.decryptData(encryptedPackage);
    } catch (error) {
      console.error(`Error decrypting field ${field}:`, error);
      throw error;
    }
  };

  // Add method to decrypt all fields
  schema.methods.decryptFields = async function() {
    const decrypted = {};
    
    for (const field of encryptedFields) {
      try {
        decrypted[field] = await this.decryptField(field);
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error);
        // Use original value as fallback
        decrypted[field] = this[field];
      }
    }
    
    return decrypted;
  };
};