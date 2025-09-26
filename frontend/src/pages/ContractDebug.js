import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { useWeb3 } from '../contexts/Web3Context';

const ContractDebug = () => {
  const { web3, account, networkId, contracts, loading, error } = useWeb3();
  
  const [contractAddresses, setContractAddresses] = useState({
    agriChainAddress: '',
    batchTokenAddress: '',
    authenticationAddress: '',
  });

  const [networkInfo, setNetworkInfo] = useState({
    name: '',
    chainId: '',
    gasPrice: '',
  });

  const [testBatchData, setTestBatchData] = useState({
    batchId: 'TEST-' + Date.now(),
    cropName: 'Test Crop',
    cropVariety: 'Test Variety',
    location: 'Test Location',
    harvestDate: Math.floor(Date.now() / 1000),
    price: '0.01',
  });

  const [txResult, setTxResult] = useState(null);
  const [txError, setTxError] = useState(null);
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => {
    // Load saved contract addresses from localStorage
    const savedAgriChainAddress = localStorage.getItem('agriChainAddress');
    const savedBatchTokenAddress = localStorage.getItem('batchTokenAddress');
    const savedAuthenticationAddress = localStorage.getItem('authenticationAddress');

    if (savedAgriChainAddress) {
      setContractAddresses(prev => ({ ...prev, agriChainAddress: savedAgriChainAddress }));
    }
    if (savedBatchTokenAddress) {
      setContractAddresses(prev => ({ ...prev, batchTokenAddress: savedBatchTokenAddress }));
    }
    if (savedAuthenticationAddress) {
      setContractAddresses(prev => ({ ...prev, authenticationAddress: savedAuthenticationAddress }));
    }

    // Get network info if web3 is available
    if (web3) {
      getNetworkInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [web3, networkId, getNetworkInfo]);

  const getNetworkInfo = async () => {
    try {
      // Get network name
      let networkName;
      switch (networkId) {
        case 1:
          networkName = 'Ethereum Mainnet';
          break;
        case 5:
          networkName = 'Goerli Testnet';
          break;
        case 11155111:
          networkName = 'Sepolia Testnet';
          break;
        case 80001:
          networkName = 'Mumbai Testnet (Polygon)';
          break;
        case 1337:
          networkName = 'Local Development Network';
          break;
        default:
          networkName = `Unknown Network (${networkId})`;
      }

      // Get gas price
      const gasPrice = await web3.eth.getGasPrice();
      const gasPriceGwei = web3.utils.fromWei(gasPrice, 'gwei');

      setNetworkInfo({
        name: networkName,
        chainId: networkId,
        gasPrice: `${gasPriceGwei} Gwei`,
      });
    } catch (error) {
      console.error('Error getting network info:', error);
    }
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setContractAddresses(prev => ({ ...prev, [name]: value }));
  };

  const handleTestDataChange = (e) => {
    const { name, value } = e.target;
    setTestBatchData(prev => ({ ...prev, [name]: value }));
  };

  const saveAddresses = () => {
    const { agriChainAddress, batchTokenAddress, authenticationAddress } = contractAddresses;
    
    if (agriChainAddress) {
      localStorage.setItem('agriChainAddress', agriChainAddress);
    }
    if (batchTokenAddress) {
      localStorage.setItem('batchTokenAddress', batchTokenAddress);
    }
    if (authenticationAddress) {
      localStorage.setItem('authenticationAddress', authenticationAddress);
    }

    // Reload the page to reinitialize contracts with new addresses
    window.location.reload();
  };

  const testCreateBatch = async () => {
    try {
      setTxLoading(true);
      setTxError(null);
      setTxResult(null);

      if (!web3 || !account || !contracts.agriChain) {
        throw new Error('Web3 or contract not initialized');
      }

      // Convert price to wei
      const priceInWei = web3.utils.toWei(testBatchData.price, 'ether');

      // Estimate gas for the transaction
      const gasEstimate = await contracts.agriChain.methods
        .createBatch(
          testBatchData.batchId,
          testBatchData.cropName,
          testBatchData.cropVariety,
          testBatchData.location,
          testBatchData.harvestDate,
          priceInWei
        )
        .estimateGas({ from: account });

      console.log('Gas estimate:', gasEstimate);

      // Send transaction with 20% more gas than estimated
      const gas = Math.floor(gasEstimate * 1.2);
      
      const result = await contracts.agriChain.methods
        .createBatch(
          testBatchData.batchId,
          testBatchData.cropName,
          testBatchData.cropVariety,
          testBatchData.location,
          testBatchData.harvestDate,
          priceInWei
        )
        .send({
          from: account,
          gas
        });

      setTxResult(result);
      console.log('Transaction result:', result);
    } catch (error) {
      console.error('Error testing createBatch:', error);
      setTxError(error.message || 'Transaction failed');
    } finally {
      setTxLoading(false);
    }
  };

  const checkUserRole = async () => {
    try {
      if (!web3 || !account || !contracts.agriChain) {
        throw new Error('Web3 or contract not initialized');
      }

      // Check if user is registered
      const user = await contracts.agriChain.methods.users(account).call();
      console.log('User data:', user);
      
      // Format the role
      let roleName;
      switch (Number(user.role)) {
        case 0:
          roleName = 'Farmer';
          break;
        case 1:
          roleName = 'Certifier';
          break;
        case 2:
          roleName = 'Retailer';
          break;
        default:
          roleName = 'None';
      }

      alert(`User Role: ${roleName} (${user.role})\nRegistered: ${user.isRegistered}`);
    } catch (error) {
      console.error('Error checking user role:', error);
      alert(`Error checking user role: ${error.message}`);
    }
  };

  const registerAsFarmer = async () => {
    try {
      if (!web3 || !account || !contracts.agriChain) {
        throw new Error('Web3 or contract not initialized');
      }

      // Register as farmer (role 0)
      const result = await contracts.agriChain.methods
        .registerUser(0)
        .send({
          from: account,
          gas: 200000
        });

      console.log('Registration result:', result);
      alert('Successfully registered as Farmer!');
    } catch (error) {
      console.error('Error registering as farmer:', error);
      alert(`Error registering: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading Web3...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          AgroTrust Contract Debug Tool
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Use this page to debug contract interactions and set contract addresses
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Network Information
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {account ? (
            <List dense>
              <ListItem>
                <ListItemText primary="Connected Account" secondary={account} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Network" secondary={networkInfo.name || 'Unknown'} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Chain ID" secondary={networkInfo.chainId || 'Unknown'} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Gas Price" secondary={networkInfo.gasPrice || 'Unknown'} />
              </ListItem>
            </List>
          ) : (
            <Alert severity="warning">
              Not connected to MetaMask. Please connect your wallet.
            </Alert>
          )}
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Contract Addresses
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                name="agriChainAddress"
               label="AgroTrust (AgriChain) Contract Address"
                fullWidth
                value={contractAddresses.agriChainAddress}
                onChange={handleAddressChange}
                margin="normal"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="batchTokenAddress"
                label="BatchToken Contract Address"
                fullWidth
                value={contractAddresses.batchTokenAddress}
                onChange={handleAddressChange}
                margin="normal"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="authenticationAddress"
                label="Authentication Contract Address"
                fullWidth
                value={contractAddresses.authenticationAddress}
                onChange={handleAddressChange}
                margin="normal"
                variant="outlined"
              />
            </Grid>
          </Grid>
          
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ mt: 2 }}
            onClick={saveAddresses}
          >
            Save Addresses
          </Button>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            User Role
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Button 
                variant="outlined" 
                fullWidth
                onClick={checkUserRole}
                disabled={!account || !contracts.agriChain}
              >
                Check My Role
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button 
                variant="contained" 
                color="secondary"
                fullWidth
                onClick={registerAsFarmer}
                disabled={!account || !contracts.agriChain}
              >
                Register as Farmer
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Test Create Batch
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="batchId"
                label="Batch ID"
                fullWidth
                value={testBatchData.batchId}
                onChange={handleTestDataChange}
                margin="normal"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="cropName"
                label="Crop Name"
                fullWidth
                value={testBatchData.cropName}
                onChange={handleTestDataChange}
                margin="normal"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="cropVariety"
                label="Crop Variety"
                fullWidth
                value={testBatchData.cropVariety}
                onChange={handleTestDataChange}
                margin="normal"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="location"
                label="Location"
                fullWidth
                value={testBatchData.location}
                onChange={handleTestDataChange}
                margin="normal"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="harvestDate"
                label="Harvest Date (Unix Timestamp)"
                fullWidth
                value={testBatchData.harvestDate}
                onChange={handleTestDataChange}
                margin="normal"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="price"
                label="Price (ETH)"
                fullWidth
                value={testBatchData.price}
                onChange={handleTestDataChange}
                margin="normal"
                variant="outlined"
              />
            </Grid>
          </Grid>
          
          <Button 
            variant="contained" 
            color="primary" 
            sx={{ mt: 2 }}
            onClick={testCreateBatch}
            disabled={txLoading || !account || !contracts.agriChain}
          >
            {txLoading ? <CircularProgress size={24} /> : 'Test Create Batch'}
          </Button>
          
          {txError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {txError}
            </Alert>
          )}
          
          {txResult && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                Transaction successful!
              </Alert>
              <Typography variant="subtitle2">Transaction Hash:</Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                {txResult.transactionHash}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default ContractDebug;
