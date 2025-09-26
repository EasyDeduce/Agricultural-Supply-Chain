const mongoose = require('mongoose');
const encryptionPlugin = require('./plugins/encryptionPlugin');

const batchHistorySchema = new mongoose.Schema({
  from: String,
  to: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  action: {
    type: String,
    enum: ['CREATED', 'CERTIFIED', 'REJECTED', 'PURCHASED']
  }
});

const batchSchema = new mongoose.Schema({
  batchId: {
    type: String,
    required: true,
    unique: true
  },
  cropName: {
    type: String,
    required: true
  },
  cropVariety: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  harvestDate: {
    type: Date,
    required: true
  },
  farmer: {
    type: String,  // Ethereum address
    required: true
  },
  certifier: String,  // Ethereum address
  retailer: String,   // Ethereum address
  status: {
    type: String,
    enum: ['CREATED', 'CERTIFIED', 'REJECTED', 'PURCHASED'],
    default: 'CREATED'
  },
  cropHealth: String,
  expiry: Date,
  labResults: Boolean,
  createdAt: {
    type: Date,
    default: Date.now
  },
  certifiedAt: Date,
  purchasedAt: Date,
  price: {
    type: Number,
    required: true
  },
  history: [batchHistorySchema]
});

// Apply the encryption plugin with fields to encrypt
batchSchema.plugin(encryptionPlugin, {
  fields: ['cropName', 'cropVariety', 'location', 'cropHealth']
});

// Add method to safely return batch data with decrypted fields
batchSchema.methods.toSafeJSON = async function() {
  const batch = this.toObject();
  
  try {
    // Decrypt sensitive fields
    const decryptedFields = await this.decryptFields();
    
    // Merge decrypted fields
    Object.assign(batch, decryptedFields);
    
    // Remove encryption-related fields
    delete batch._encrypted;
    delete batch._encryptedCiphers;
    delete batch._encryptedIVs;
    
    return batch;
  } catch (error) {
    console.error('Error creating safe batch JSON:', error);
    // Return batch without sensitive encryption fields as fallback
    delete batch._encrypted;
    delete batch._encryptedCiphers;
    delete batch._encryptedIVs;
    return batch;
  }
};

const Batch = mongoose.model('Batch', batchSchema);

module.exports = Batch;