const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const pqcrypto = require('../utils/pqcrypto');

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get safe user data with decrypted fields
    const safeUser = await user.toSafeJSON();
    
    res.status(200).json(safeUser);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, location, company } = req.body;
    
    // Build update object
    const updateData = {};
    if (name) updateData.name = name;
    if (location) updateData.location = location;
    if (company && req.user.role === 'certifier') updateData.company = company;
    
    // Find and update the user
    const user = await User.findById(req.user.id);
    
    if (name) user.name = name;
    if (location) user.location = location;
    if (company && req.user.role === 'certifier') user.company = company;
    
    // Save updated user with encrypted fields
    await user.save();
    
    // Get safe user data with decrypted fields
    const safeUser = await user.toSafeJSON();
    
    res.status(200).json(safeUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by wallet address
router.get('/by-wallet/:walletAddress', async (req, res) => {
  try {
    const user = await User.findOne({ 
      walletAddress: req.params.walletAddress 
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get safe user data with decrypted fields
    const safeUser = await user.toSafeJSON();
    
    res.status(200).json(safeUser);
  } catch (error) {
    console.error('Error fetching user by wallet:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get farmer profile
router.get('/farmer/:farmerId', async (req, res) => {
  try {
    const farmer = await User.findOne({
      userId: req.params.farmerId,
      role: 'farmer'
    }).select('-password');
    
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }
    
    res.status(200).json({
      name: farmer.name,
      userId: farmer.userId,
      location: farmer.location,
      lastHarvestDate: farmer.lastHarvestDate,
      registeredCrops: farmer.registeredCrops
    });
  } catch (error) {
    console.error('Error fetching farmer profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get certifier profile
router.get('/certifier/:certifierId', async (req, res) => {
  try {
    const certifier = await User.findOne({
      userId: req.params.certifierId,
      role: 'certifier'
    }).select('-password');
    
    if (!certifier) {
      return res.status(404).json({ message: 'Certifier not found' });
    }
    
    res.status(200).json({
      name: certifier.name,
      userId: certifier.userId,
      company: certifier.company,
      certifiedCrops: certifier.certifiedCrops,
      rejectedCrops: certifier.rejectedCrops
    });
  } catch (error) {
    console.error('Error fetching certifier profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get retailer profile
router.get('/retailer/:retailerId', async (req, res) => {
  try {
    const retailer = await User.findOne({
      userId: req.params.retailerId,
      role: 'retailer'
    }).select('-password');
    
    if (!retailer) {
      return res.status(404).json({ message: 'Retailer not found' });
    }
    
    res.status(200).json({
      name: retailer.name,
      userId: retailer.userId,
      location: retailer.location,
      purchasedCrops: retailer.purchasedCrops
    });
  } catch (error) {
    console.error('Error fetching retailer profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update farmer harvest date
router.put('/farmer/harvest-date', auth, async (req, res) => {
  try {
    // Verify user is a farmer
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { harvestDate } = req.body;
    
    if (!harvestDate) {
      return res.status(400).json({ message: 'Harvest date is required' });
    }
    
    const farmer = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { lastHarvestDate: new Date(harvestDate) } },
      { new: true }
    );
    
    res.status(200).json({ 
      message: 'Harvest date updated',
      lastHarvestDate: farmer.lastHarvestDate
    });
  } catch (error) {
    console.error('Error updating harvest date:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add crop to user profile based on role
router.put('/add-crop', auth, async (req, res) => {
  try {
    const { cropId, role, certified } = req.body;
    
    if (!cropId) {
      return res.status(400).json({ message: 'Crop ID is required' });
    }
    
    let updateField;
    
    switch (role || req.user.role) {
      case 'farmer':
        updateField = { $addToSet: { registeredCrops: String(cropId) } };
        break;
      case 'certifier':
        if (certified === true) {
          updateField = { $addToSet: { certifiedCrops: String(cropId) } };
        } else if (certified === false) {
          updateField = { $addToSet: { rejectedCrops: String(cropId) } };
        } else {
          return res.status(400).json({ message: 'Certification status is required' });
        }
        break;
      case 'retailer':
        updateField = { $addToSet: { purchasedCrops: String(cropId) } };
        break;
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }
    
    await User.findByIdAndUpdate(req.user.id, updateField);
    
    res.status(200).json({ message: 'Crop added to user profile' });
  } catch (error) {
    console.error('Error adding crop to profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
