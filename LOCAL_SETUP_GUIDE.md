# Local Setup Guide — AgroTrust

This guide sets up the AgroTrust project (frontend + backend + smart contracts) for local development.

## Prerequisites

- Node.js 18+
- npm 8+
- Git
- MongoDB (v5.0 or higher)
- MetaMask browser extension

## Step 1: Clone the Repository

```bash
git clone <your-repo-url>.git AgroTrust
cd AgroTrust
## Prerequisites

- Node.js 20.19+ (required for @noble/post-quantum ESM)
- npm 8+
## Step 2: Install Dependencies

### Install Root Dependencies

```bash
npm install
Update the frontend `.env` with these addresses (include the `0x` prefix, no quotes or spaces). Alternatively, open the Debug page at `/debug` and paste the three addresses; they’ll be saved in `localStorage` for convenience during local development.
```

### Install Backend Dependencies

Tip: If you used the Debug page to set addresses, refresh after saving to load the contracts.

```bash
cd backend
npm install
cd ..
```


On‑chain roles: You must register your wallet on-chain via the AgriChain contract to perform role‑guarded actions (e.g., click "Register as Farmer" in the Create Batch page). App registration (backend) and on-chain registration (AgriChain.registerUser) are separate steps.
### Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```


### PQC Environment and Key Management

- In `backend/.env` set:
   - `ENABLE_PQC_SIGNATURES=true` to enable PQC signing and verification.
   - `PQC_KEY_STORAGE_DIR=./keys` as the directory to persist generated Kyber/Dilithium keys (auto‑created at startup). Do not commit keys to VCS.
- Keys are generated automatically on first run. For production, plan HSM/KMS backed storage and key rotation policies.
## Step 3: Configure Environment Variables

Create `.env` files in the root, backend, and frontend directories:

If you see "Parameter decoding error" or "role check failed":
- Ensure the three contract addresses are correct and currently deployed. After restarting Hardhat, previous addresses are invalid. Redeploy and update addresses via `.env` or the `/debug` page.
- Verify MetaMask is on the local Hardhat network (Chain ID 31337).
- The app now performs a bytecode check at each address; if any address has no code, you’ll see a clear error in the UI.

### Root .env (Hardhat / optional)


### Environment Files (Recommended)

- Use `.env.example` files (root, backend, frontend) as templates. Copy to `.env` and fill in values.
- Never commit real secrets. For local dev, `.env` is fine; for production, use your platform’s secret manager.
```
INFURA_API_KEY=your_infura_api_key
PRIVATE_KEY=your_private_key_for_deployment
5. Update `frontend/.env` or set fresh addresses in `/debug`, or clear saved addresses in browser `localStorage`

## Security and Ops Best Practices

- Keep Node.js updated (>= 20.19) and lock dependencies for reproducible builds.
- Do not commit `.env` files or the PQC key directory; add them to `.gitignore`.
- After Hardhat restarts, always redeploy and update addresses before using the dApp.
- For production: enforce HTTPS, use a managed MongoDB with network policies, and consider rotating PQC keys on a schedule.
```

### Backend .env

```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/agritrust
JWT_SECRET=<generate-a-long-random-string>

# Post-Quantum Cryptography Settings
ENABLE_PQC_SIGNATURES=true
PQC_KEY_STORAGE_DIR=./keys
```

### Frontend .env

```
REACT_APP_BACKEND_URL=http://localhost:3001/api
REACT_APP_AGRI_CHAIN_ADDRESS=0x...
REACT_APP_BATCH_TOKEN_ADDRESS=0x...
REACT_APP_AUTHENTICATION_ADDRESS=0x...
```

## Step 4: Start Local Blockchain

Open a terminal and start the local Hardhat blockchain:

```bash
npx hardhat node
```

This starts a local Ethereum blockchain and generates funded test accounts. Keep this terminal open.

## Step 5: Deploy Smart Contracts

In a new terminal:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

This deploys the contracts locally. Note the addresses printed in the console:

```
BatchToken deployed to: 0x...
AgriChain deployed to: 0x...
BatchToken configured with AgriChain address
Authentication deployed to: 0x...
```

Update the frontend `.env` with these addresses (include the `0x` prefix, no quotes or spaces). The app also reads saved addresses from `localStorage` if `.env` is empty during dev.

## Step 6: Set Up MongoDB

Ensure MongoDB is running. You can start it with:

```bash
mongod
```

The backend auto‑creates the database and collections on start.

## Step 7: Start Backend Server

In a new terminal:

```bash
cd backend
npm run start
```

The server starts on http://localhost:3001.

## Step 8: Start Frontend Application

In another terminal:

```bash
cd frontend
npm start
```

The React app opens at http://localhost:3000.

## Step 9: Connect MetaMask

1. Open MetaMask
2. Add a new network:
   - Network Name: Hardhat Local
   - RPC URL: http://localhost:8545
   - Chain ID: 31337
   - Currency Symbol: ETH
3. Import a Hardhat test account using its private key (printed when `hardhat node` starts)

## Step 10: Register and Use the Application

1. Navigate to http://localhost:3000
2. Connect MetaMask
3. Register as Farmer, Certifier, or Retailer
4. Use the app by role:
   - Farmers: create new batches (manual `batchId` string), request certification, bulk import via CSV
   - Certifiers: approve/reject with health/expiry/lab fields
   - Retailers: view certified batches and purchase
   - Anyone: lookup batches and view full history; scan QR to verify

## Common Issues and Troubleshooting

### PQC Library Imports

The `@noble/post-quantum` package is ESM-only. Use explicit submodule paths with the `.js` suffix. In a CommonJS backend (Node/Express), use dynamic import; in the React frontend (ESM), use static import.

Backend (CommonJS) — dynamic import inside an async function:
```js
// Node 20.19+ required
const kyber = await import('@noble/post-quantum/ml-kem.js');
const dsa = await import('@noble/post-quantum/ml-dsa.js');

const { ml_kem768 } = kyber;
const { ml_dsa65 } = dsa;
```

Frontend (ESM) — static import is fine:
```js
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
// import { ml_kem768 } from '@noble/post-quantum/ml-kem.js'; // if needed in browser
```

Avoid importing the package root or using `require()` on the root; both will throw errors:
```js
// Incorrect (will error)
// const noble = require('@noble/post-quantum');
// const { mlKEM, mlDSA } = require('@noble/post-quantum');
```

### MetaMask Connection Issues

If you encounter problems connecting MetaMask:
- Make sure the Hardhat node is running
- Confirm you have the correct RPC URL and Chain ID
- Try resetting your account in MetaMask (Settings > Advanced > Reset Account)

### Transaction Errors

If transactions fail:
- Check dev console/network tab for messages
- Ensure the current MetaMask account matches the role
- Gas is estimated automatically; confirm chain is `31337`

### Contract Deployment Issues

If contract deployment fails:
- Ensure `hardhat node` is running
- Use an unlocked Hardhat account for deployment
- Verify `.env` and RPC URL

## Development Tips

### Running Tests

To run smart contract tests:

```bash
npx hardhat test
```

### Compiling Contracts

To compile contracts without deploying:

```bash
npx hardhat compile
```

### Full Reset

If you need to completely reset:

1. Stop all running processes
2. Delete `artifacts/` and `cache/`
3. Restart `npx hardhat node`
4. Redeploy contracts
5. Update `frontend/.env` or clear saved addresses in browser `localStorage`

## Create a new Git repo and push (Ubuntu CLI)

1) Initialize locally in this folder
```
git init
git add .
git commit -m "Initial commit: AgroTrust"
```
2) Create a matching empty repo on GitHub (via UI), copy its HTTPS URL, then:
```
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```
If you prefer SSH, replace the remote URL accordingly.
