const jwt = require('jsonwebtoken');
const pqcrypto = require('../utils/pqcrypto');

module.exports = async function(req, res, next) {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');
  const pqcSignature = req.header('X-PQC-Signature');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check for PQC signature if enabled
    if (process.env.ENABLE_PQC_SIGNATURES === 'true' && pqcSignature) {
      // Create signed package to verify
      const signedPackage = {
        data: token,
        signature: pqcSignature
      };
      
      // Verify the signature
      const isValid = await pqcrypto.verifySignature(signedPackage);
      
      if (!isValid) {
        return res.status(401).json({ message: 'PQC signature verification failed' });
      }
    }
    
    // Add user from payload
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};
