# Post-Quantum Cryptography (PQC) Implementation

This document describes the implementation of Post-Quantum Cryptography (PQC) in the AgroTrust application to secure data stored in MongoDB and enhance authentication security using quantum-resistant algorithms.

## Overview

The application now uses two PQC algorithms:

1. **Kyber**: A Key Encapsulation Mechanism (KEM) used to encrypt sensitive data before storing it in MongoDB.
2. **Dilithium**: A signature scheme used to sign and verify authentication tokens, providing quantum-resistant authentication.

## Implementation Details

### Backend Components

1. **PQC Utility (`backend/utils/pqcrypto.js`)**:
   - Provides key generation, encryption/decryption, and signing/verification functions
   - Handles key management and persistence
   - Uses `@noble/post-quantum` library for Kyber and Dilithium implementation

2. **Mongoose Encryption Plugin (`backend/models/plugins/encryptionPlugin.js`)**:
   - Integrates with Mongoose schema to automatically encrypt/decrypt fields
   - Transparently handles encrypted data storage in MongoDB
   - Provides methods for secure data retrieval

3. **Authentication Middleware (`backend/middleware/auth.js`)**:
   - Now verifies PQC signatures alongside JWT tokens
   - Enhances security against quantum attacks

4. **Route Handlers**:
   - Updated to handle encrypted data properly
   - Return decrypted data to authenticated clients

### Frontend Components

1. **PQC Utility (`frontend/src/utils/crypto/pqcrypto.js`)**:
   - Handles signature verification
   - Manages PQC public keys

2. **API Service (`frontend/src/services/api.js`)**:
   - Includes PQC signature headers in requests
   - Stores PQC signatures from authentication responses

3. **Auth Context (`frontend/src/contexts/AuthContext.js`)**:
   - Manages PQC signatures alongside JWT tokens
   - Initializes PQC system on authentication

## Configuration

The PQC system is configurable through environment variables:

```
# Enable/disable PQC signatures
ENABLE_PQC_SIGNATURES=true

# Directory to store PQC keys
PQC_KEY_STORAGE_DIR=./keys
```

## Fields Protected by Encryption

### User Model
- `name`
- `email`
- `location`
- `company`

### Batch Model
- `cropName`
- `cropVariety`
- `location`
- `cropHealth`

## Testing the Implementation

To verify the PQC implementation is working correctly:

1. **Check MongoDB Collections**:
   - Encrypted fields should be stored as encrypted data in the database
   - `_encrypted`, `_encryptedCiphers`, and `_encryptedIVs` fields should be present in documents

2. **User Registration/Login Flow**:
   - Register a new user
   - Verify that PQC signature is returned alongside the JWT token
   - Log in with the user credentials
   - Verify that PQC signature is sent with API requests

3. **Batch Creation Flow**:
   - Create a new batch as a farmer
   - Verify that sensitive fields are encrypted in MongoDB
   - Retrieve the batch and verify decryption works correctly

## Security Considerations

1. **Key Management**:
   - Keys are stored locally on the server
   - For production, consider using a secure key management solution

2. **Signature Verification**:
   - PQC signatures are optional and can be enabled/disabled through configuration
   - For maximum security, set `ENABLE_PQC_SIGNATURES=true`

## Future Enhancements

1. **Key Rotation**:
   - Implement regular key rotation for enhanced security
   - Add support for multiple key versions

2. **Client-Side Encryption**:
   - Extend PQC encryption to the client side
   - Implement end-to-end encryption for critical data

3. **Hardware Security Module (HSM) Integration**:
   - Store keys in a hardware security module for production deployments
   - Implement secure key distribution