const express = require('express');
const router = express.Router();
const Batch = require('../models/Batch');
const User = require('../models/User');
const auth = require('../middleware/auth');
const pqcrypto = require('../utils/pqcrypto');

// Get all batches
router.get('/', async (req, res) => {
  try {
    const batches = await Batch.find().sort({ createdAt: -1 });
    
    // Decrypt all batches
    const safeBatches = await Promise.all(
      batches.map(batch => batch.toSafeJSON())
    );
    
    res.status(200).json(safeBatches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Create new batch
router.post('/', auth, async (req, res) => {
  try {
    const { batchId, cropName, cropVariety, location, harvestDate, farmer, price, transactionHash } = req.body;
    
    // Verify user is a farmer
    if (req.user.role !== 'farmer') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Check if batch already exists
    const existingBatch = await Batch.findOne({ batchId: String(batchId) });
    if (existingBatch) {
      return res.status(400).json({ message: 'Batch already exists' });
    }
    
    // Create batch history entry
    const history = [{
      from: '0x0000000000000000000000000000000000000000',
      to: farmer,
      timestamp: new Date(),
      action: 'CREATED'
    }];
    
    // Create new batch
    const newBatch = new Batch({
      batchId: String(batchId),
      cropName,
      cropVariety,
      location,
      harvestDate: new Date(harvestDate),
      farmer,
      price: Number(price),
      history,
      status: 'CREATED'
    });
    
    await newBatch.save();
    
    // Update farmer's registered crops
    const farmer_user = await User.findOne({ walletAddress: farmer });
    if (farmer_user) {
      farmer_user.registeredCrops.push(String(batchId));
      await farmer_user.save();
    }
    
    // Get safe batch data with decrypted fields
    const safeBatch = await newBatch.toSafeJSON();
    
    res.status(201).json({
      message: 'Batch created successfully',
      batch: safeBatch
    });
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Certify batch
router.put('/:batchId/certify', auth, async (req, res) => {
  try {
    const { certifier, cropHealth, expiry, labResults, transactionHash } = req.body;
    
    // Verify user is a certifier
    if (req.user.role !== 'certifier') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Find batch
    const batch = await Batch.findOne({ batchId: req.params.batchId });
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    
    // Check if batch is in correct state
    if (batch.status !== 'CREATED') {
      return res.status(400).json({ message: 'Batch cannot be certified' });
    }
    
    // Update batch
    batch.certifier = certifier;
    batch.cropHealth = cropHealth;
    batch.expiry = new Date(expiry);
    batch.labResults = labResults;
    batch.certifiedAt = new Date();
    batch.status = labResults ? 'CERTIFIED' : 'REJECTED';
    
    // Add to history
    batch.history.push({
      from: batch.farmer,
      to: certifier,
      timestamp: new Date(),
      action: labResults ? 'CERTIFIED' : 'REJECTED'
    });
    
    await batch.save();
    
    // Update certifier's certified/rejected crops
      if (labResults) {
      await User.findOneAndUpdate(
        { walletAddress: certifier },
          { $addToSet: { certifiedCrops: String(batch.batchId) } }
      );
    } else {
      await User.findOneAndUpdate(
        { walletAddress: certifier },
          { $addToSet: { rejectedCrops: String(batch.batchId) } }
      );
    }
    
    res.status(200).json({
      message: labResults ? 'Batch certified successfully' : 'Batch rejected',
      batch
    });
  } catch (error) {
    console.error('Error certifying batch:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Purchase batch
router.put('/:batchId/purchase', auth, async (req, res) => {
  try {
    const { retailer, transactionHash } = req.body;
    
    // Verify user is a retailer
    if (req.user.role !== 'retailer') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Find batch
    const batch = await Batch.findOne({ batchId: req.params.batchId });
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    
    // Check if batch is in correct state
    if (batch.status !== 'CERTIFIED') {
      return res.status(400).json({ message: 'Batch cannot be purchased' });
    }
    
    // Update batch
    batch.retailer = retailer;
    batch.status = 'PURCHASED';
    batch.purchasedAt = new Date();
    
    // Add to history
    batch.history.push({
      from: batch.farmer,
      to: retailer,
      timestamp: new Date(),
      action: 'PURCHASED'
    });
    
    await batch.save();
    
    // Update retailer's purchased crops
    await User.findOneAndUpdate(
      { walletAddress: retailer },
      { $addToSet: { purchasedCrops: String(batch.batchId) } }
    );
    
    res.status(200).json({
      message: 'Batch purchased successfully',
      batch
    });
  } catch (error) {
    console.error('Error purchasing batch:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search batches
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    
    // If query is a number, search by batchId
    if (!isNaN(query)) {
      const batch = await Batch.findOne({ batchId: String(query) });
      if (batch) {
        return res.status(200).json([batch]);
      }
    }
    
    // Otherwise search by crop name or variety
    const batches = await Batch.find({
      $or: [
        { cropName: { $regex: query, $options: 'i' } },
        { cropVariety: { $regex: query, $options: 'i' } },
        { location: { $regex: query, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });
    
    res.status(200).json(batches);
  } catch (error) {
    console.error('Error searching batches:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get pending certification batches
router.get('/pending-certification', async (req, res) => {
  try {
    const batches = await Batch.find({ 
      status: 'CREATED'
    }).sort({ createdAt: -1 });
    
    res.status(200).json(batches);
  } catch (error) {
    console.error('Error fetching pending batches:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get certified batches available for purchase
router.get('/available-purchase', async (req, res) => {
  try {
    const batches = await Batch.find({ 
      status: 'CERTIFIED'
    }).sort({ certifiedAt: -1 });
    
    res.status(200).json(batches);
  } catch (error) {
    console.error('Error fetching available batches:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get batches by farmer
router.get('/farmer/:walletAddress', async (req, res) => {
  try {
    const batches = await Batch.find({ 
      farmer: req.params.walletAddress 
    }).sort({ createdAt: -1 });
    
    res.status(200).json(batches);
  } catch (error) {
    console.error('Error fetching farmer batches:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get batches by certifier
router.get('/certifier/:walletAddress', async (req, res) => {
  try {
    const batches = await Batch.find({ 
      certifier: req.params.walletAddress 
    }).sort({ certifiedAt: -1 });
    
    res.status(200).json(batches);
  } catch (error) {
    console.error('Error fetching certifier batches:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get batches by retailer
router.get('/retailer/:walletAddress', async (req, res) => {
  try {
    const batches = await Batch.find({ 
      retailer: req.params.walletAddress 
    }).sort({ purchasedAt: -1 });
    
    res.status(200).json(batches);
  } catch (error) {
    console.error('Error fetching retailer batches:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get batch by ID (keep this last to avoid shadowing the specific routes above)
router.get('/:batchId', async (req, res) => {
  try {
    const id = req.params.batchId;
    // Support both legacy numeric batchId and new string batchId
    const batch = await Batch.findOne({ $or: [ { batchId: id }, { batchId: String(id) } ] });
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }
    res.status(200).json(batch);
  } catch (error) {
    console.error('Error fetching batch:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
