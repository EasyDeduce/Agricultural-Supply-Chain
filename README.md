# AgroTrust — Blockchain GI Supply Chain Tracking

AgroTrust is a decentralized application (dApp) for transparent GI (Geographical Indication) supply chain tracking. It connects farmers, certifiers, and retailers, ensuring authenticity and end‑to‑end traceability of agricultural batches on Ethereum.

## Features

- **Roles and profiles**: Farmer, Certifier, Retailer with detailed profile data
- **Manual batch ID**: Farmers provide a human `batchId` string; on‑chain ID is `keccak256(batchId)`
- **Certification workflow**: Certifiers approve/reject with health, expiry, and lab results
- **Retailer purchase**: Retailers view certified batches and purchase on‑chain
- **Lookup and tracking**: Universal lookup by `batchId` and full transfer history
- **QR codes + scanner**: Auto‑generated QR per batch and in‑app QR scanner for public verification
- **CSV upload**: Farmers can bulk‑create batches from CSV
- **Account deletion**: Users can delete their accounts; related off‑chain data is cleaned up
- **Hashing + gas**: Surfaces hashing, gas estimation and MetaMask integration

## Technology Stack

- **Blockchain**: Ethereum, Solidity, Hardhat, OpenZeppelin
- **Smart contracts**: ERC‑721 `BatchToken`, `AgriChain`, `Authentication`
- **Frontend**: React 18, MUI 5, Web3.js v4, React Router, Context API
- **Extras**: `date-fns`, `qrcode.react`, `@yudiel/react-qr-scanner`, `papaparse`
- **Backend**: Node.js, Express, JWT, bcrypt, MongoDB/Mongoose
- **Security**: Post-Quantum Cryptography (PQC) using Kyber (KEM) and Dilithium (signatures) for data encryption and authentication

## Project Structure

```
Agri_chain/
├── contracts/                # Solidity contracts
│   ├── AgriChain.sol         # Core supply chain logic
│   ├── Authentication.sol    # On‑chain roles and basic profiles
│   └── BatchToken.sol        # ERC‑721 per‑batch token
├── scripts/                  # Deployment scripts
├── backend/                  # Express API + MongoDB
│   ├── models/               # Mongoose schemas
│   ├── routes/               # Auth, user, batch routes
│   └── server.js             # Server entry
├── frontend/                 # React app (AgroTrust UI)
│   ├── public/
│   └── src/
│       ├── components/
│       ├── contexts/         # Web3Context, AuthContext
│       ├── pages/
│       ├── services/
│       └── utils/
├── artifacts/                # Hardhat build outputs (local)
├── cache/                    # Hardhat cache (local)
└── hardhat.config.js
```

## Smart contract highlights

- `createBatch(string _batchId, ...)` derives on‑chain ID as `keccak256(_batchId)` and enforces uniqueness
- Events include the original `batchId` string for easier UX
- Increased gas estimate for creation to reduce MetaMask underestimation
- `BatchToken` uses explicit overrides for ERC‑721 transfer functions

## Environment Variables

Create `.env` files at the project root, `backend/`, and `frontend/`.

- Root `.env` (Hardhat / optional deployments)
  - `INFURA_API_KEY=...`
  - `PRIVATE_KEY=...`
  - `ETHERSCAN_API_KEY=...`

- Backend `.env`
  - `PORT=3001`
  - `MONGODB_URI=mongodb://localhost:27017/agritrust`
  - `JWT_SECRET=<random-long-secret>`
  - `ENABLE_PQC_SIGNATURES=true` (enables Post-Quantum Cryptography for signatures)
  - `PQC_KEY_STORAGE_DIR=./keys` (directory to store PQC keys)

- Frontend `.env`
  - `REACT_APP_BACKEND_URL=http://localhost:3001/api`
  - `REACT_APP_AGRI_CHAIN_ADDRESS=0x...` (no quotes, includes `0x`)
  - `REACT_APP_BATCH_TOKEN_ADDRESS=0x...`
  - `REACT_APP_AUTHENTICATION_ADDRESS=0x...`

Note: Frontend trims accidental whitespace and also reads contract addresses from `localStorage` if not present in `.env` (useful during local redeploys).

## Quick start (local)

1) Start a local chain
```
npx hardhat node
```
2) Deploy contracts (new terminal)
```
npx hardhat run scripts/deploy.js --network localhost
```
Copy the printed addresses into `frontend/.env`.

3) Start MongoDB
```
mongod
```
4) Run backend
```
cd backend && npm start
```
5) Run frontend
```
cd frontend && npm start
```
6) Configure MetaMask network
- RPC: `http://localhost:8545`
- Chain ID: `31337`
- Import a Hardhat test account using its private key

## Common tips

- On‑chain ID = `web3.utils.keccak256(batchIdString)` and is used directly (hex). No `BigInt` conversion is required.
- If the chain restarts, redeploy and update addresses (or clear saved ones in `localStorage`).
- If MongoDB shows “address in use” or socket errors, stop the process and remove the stale socket before restarting.

## License

MIT

## Acknowledgments

- OpenZeppelin
- Material‑UI
- Ethereum community