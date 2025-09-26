const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const encryptionPlugin = require('./plugins/encryptionPlugin');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['farmer', 'certifier', 'retailer'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true,
    unique: true
  },
  location: String,
  registrationDate: {
    type: Date,
    default: Date.now
  },
  // Farmer specific fields
  lastHarvestDate: Date,
  registeredCrops: [String],
  
  // Certifier specific fields
  company: String,
  certifiedCrops: [String],
  rejectedCrops: [String],
  
  // Retailer specific fields
  purchasedCrops: [String]
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password validity
userSchema.methods.isValidPassword = async function(password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    throw error;
  }
};

// Apply the encryption plugin with fields to encrypt
userSchema.plugin(encryptionPlugin, {
  fields: ['name', 'email', 'location', 'company']
});

// Add method to safely return user data with decrypted fields
userSchema.methods.toSafeJSON = async function() {
  const user = this.toObject();
  
  try {
    // Decrypt sensitive fields
    const decryptedFields = await this.decryptFields();
    
    // Merge decrypted fields
    Object.assign(user, decryptedFields);
    
    // Remove encryption-related fields
    delete user._encrypted;
    delete user._encryptedCiphers;
    delete user._encryptedIVs;
    
    // Remove password
    delete user.password;
    
    return user;
  } catch (error) {
    console.error('Error creating safe user JSON:', error);
    // Return user without sensitive encryption fields as fallback
    delete user._encrypted;
    delete user._encryptedCiphers;
    delete user._encryptedIVs;
    delete user.password;
    return user;
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;