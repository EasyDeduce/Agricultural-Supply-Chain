import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Divider,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
} from '@mui/material';
import { VerifiedUser, Cancel, ShoppingCart, QrCode2 } from '@mui/icons-material';
import QRCode from 'qrcode.react';
import { SvgIcon } from '@mui/material';
import { useWeb3 } from '../contexts/Web3Context';
import { format } from 'date-fns';
import { batchAPI } from '../services/api';

// Custom icon for farmer
function FarmerIcon(props) {
  return (
    <SvgIcon {...props}>
      <path d="M15,4V6H18V18H15V20H20V4H15M4,4V20H9V18H6V6H9V4H4Z" />
    </SvgIcon>
  );
}

const BatchDetail = () => {
  const { batchId } = useParams();
  const { web3, account, contracts } = useWeb3();
  
  const [batch, setBatch] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionError, setTransactionError] = useState(null);
  const [transactionSuccess, setTransactionSuccess] = useState(false);

  useEffect(() => {
    if (batchId && web3) {
      fetchBatchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, web3, account, contracts.agriChain]);

  // Get batch status chip color and label
  const getBatchStatusDetails = (status) => {
    switch (status) {
      case 'CREATED':
        return { color: 'primary', label: 'Created', icon: <FarmerIcon /> };
      case 'CERTIFIED':
        return { color: 'success', label: 'Certified', icon: <VerifiedUser /> };
      case 'REJECTED':
        return { color: 'error', label: 'Rejected', icon: <Cancel /> };
      case 'PURCHASED':
        return { color: 'secondary', label: 'Purchased', icon: <ShoppingCart /> };
      default:
        return { color: 'default', label: status, icon: null };
    }
  };

  // Fetch batch data and history
  const fetchBatchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch batch details from backend
      const response = await batchAPI.getBatchById(batchId);
      const batchData = response.data;

      // If we have a blockchain connection, get on-chain history
      let batchHistory = [];
      if (web3 && contracts.agriChain) {
        try {
          // Convert batchId to uint256 hash if needed
          const batchIdHash = web3.utils.keccak256(batchId);
          const cleanId = String(batchId).trim();
          const batchIdUint = web3.utils.keccak256(cleanId);
          
          // Get batch history from blockchain
          const historyData = await contracts.agriChain.methods
            .getBatchHistory(batchIdUint)
            .call();
          
          batchHistory = historyData.map(item => ({
            from: item.from,
            to: item.to,
            timestamp: new Date(Number(item.timestamp) * 1000),
            action: item.action
          }));
        } catch (chainErr) {
          console.error('Error fetching on-chain history:', chainErr);
          // Continue with backend data even if blockchain history fails
        }
      }

      setBatch(batchData);
      setHistory(batchHistory.length > 0 ? batchHistory : batchData.history || []);
    } catch (err) {
      console.error('Error fetching batch data:', err);
      setError('Failed to fetch batch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Purchase batch (for retailers)
  const handlePurchaseBatch = async () => {
    try {
      setTransactionLoading(true);
      setTransactionError(null);
      setTransactionSuccess(false);

      if (!web3 || !account || !contracts.agriChain) {
        throw new Error('Wallet not connected or contract not initialized');
      }

      // Get batch price for the transaction value
      const batchPrice = web3.utils.toWei(batch.price, 'ether');

      // Convert batchId to uint256 hash
      const batchIdHash = web3.utils.keccak256(batchId);
      const cleanId = String(batchId).trim();
      const batchIdUint = web3.utils.keccak256(cleanId);

      // Call contract method to purchase batch
      const purchaseTx = await contracts.agriChain.methods
        .purchaseBatch(batchIdUint)
        .send({ 
          from: account, 
          value: batchPrice,
          gas: 300000 // Set explicit gas limit
        });

      console.log('Purchase transaction:', purchaseTx);

      // Update backend with purchase data
      await batchAPI.purchaseBatch(batchId, {
        retailer: account,
        transactionHash: purchaseTx.transactionHash
      });

      setTransactionSuccess(true);
      
      // Refresh data after 2 seconds
      setTimeout(() => {
        fetchBatchData();
        setTransactionSuccess(false);
      }, 2000);

    } catch (err) {
      console.error('Error purchasing batch:', err);
      setTransactionError(err.message || 'Failed to purchase batch. Please try again.');
    } finally {
      setTransactionLoading(false);
    }
  };

  // Safely format various date shapes (Date, number, seconds, ISO string)
  const formatDate = (value) => {
    if (!value && value !== 0) return 'N/A';
    let d = null;
    if (value instanceof Date) {
      d = value;
    } else if (typeof value === 'number') {
      d = new Date(value > 1e12 ? value : value * 1000);
    } else if (typeof value === 'string') {
      const asNum = Number(value);
      if (!Number.isNaN(asNum)) {
        d = new Date(asNum > 1e12 ? asNum : asNum * 1000);
      } else {
        d = new Date(value);
      }
    }
    if (!d || Number.isNaN(d.getTime())) return 'N/A';
    return format(d, 'PPP');
  };

  // unused placeholder removed

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading batch details...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Batch #{batch?.batchId}
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            {batch?.cropName} - {batch?.cropVariety}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Typography variant="body1" sx={{ mr: 2 }}>
              Status:
            </Typography>
            {batch && (
              <Chip
                icon={getBatchStatusDetails(batch.status).icon}
                label={getBatchStatusDetails(batch.status).label}
                color={getBatchStatusDetails(batch.status).color}
              />
            )}
          </Box>
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
            <QrCode2 sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">Scan to verify:</Typography>
          </Box>
          <Box sx={{ mt: 1 }}>
            <QRCode value={String(batch?.batchId || '')} size={128} includeMargin />
          </Box>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}
        
        {/* Batch Details */}
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Product Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Crop Name
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {batch?.cropName}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Variety
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {batch?.cropVariety}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Location
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {batch?.location}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Harvest Date
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {formatDate(batch?.harvestDate)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Batch Created
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {formatDate(batch?.createdAt)}
                    </Typography>
                  </Grid>
                  
                  {batch?.status === 'CERTIFIED' || batch?.status === 'PURCHASED' ? (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Crop Health
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {batch?.cropHealth}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Expires
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {formatDate(batch?.expiry)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Lab Results
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                          {batch?.labResults ? 'Pass' : 'Fail'}
                        </Typography>
                      </Grid>
                    </>
                  ) : null}
                  
                  {batch?.status === 'CERTIFIED' && (
                    <Grid item xs={12}>
                      <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                        Price: {batch?.price} ETH
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Ownership & Certification
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Typography variant="body2" color="text.secondary">
                  Farmer Address
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ wordBreak: 'break-all' }}>
                  {batch?.farmer || 'N/A'}
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Certifier Address
                  </Typography>
                  <Typography variant="body1" gutterBottom sx={{ wordBreak: 'break-all' }}>
                    {batch?.certifier || 'Not yet certified'}
                  </Typography>
                </Box>
                
                {batch?.status === 'CERTIFIED' && (
                  <Typography variant="body2" gutterBottom sx={{ mt: 1 }}>
                    Certified on: {formatDate(batch?.certifiedAt)}
                  </Typography>
                )}
                
                {batch?.status === 'PURCHASED' && (
                  <>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Retailer Address
                      </Typography>
                      <Typography variant="body1" gutterBottom sx={{ wordBreak: 'break-all' }}>
                        {batch?.retailer || 'Not yet purchased'}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" gutterBottom sx={{ mt: 1 }}>
                      Purchased on: {formatDate(batch?.purchasedAt)}
                    </Typography>
                  </>
                )}
                
                {batch?.status === 'CERTIFIED' && (
                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      disabled={transactionLoading}
                      onClick={handlePurchaseBatch}
                    >
                      {transactionLoading ? 'Processing...' : 'Purchase Batch'}
                    </Button>
                    
                    {transactionSuccess && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        Purchase successful!
                      </Alert>
                    )}
                    
                    {transactionError && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {transactionError}
                      </Alert>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Batch History */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Batch History
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Stepper orientation="vertical">
            {history.map((item, index) => (
              <Step key={index} active={true} completed={true}>
                <StepLabel
                  StepIconComponent={() => {
                    switch (item.action) {
                      case 'CREATED':
                        return <FarmerIcon color="primary" />;
                      case 'CERTIFIED':
                        return <VerifiedUser color="success" />;
                      case 'REJECTED':
                        return <Cancel color="error" />;
                      case 'PURCHASED':
                        return <ShoppingCart color="secondary" />;
                      default:
                        return null;
                    }
                  }}
                >
                  <Typography variant="subtitle1">
                    {item.action === 'CREATED' ? 'Batch Created' :
                     item.action === 'CERTIFIED' ? 'Certified' :
                     item.action === 'REJECTED' ? 'Rejected' : 'Purchased'}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2">
                    {formatDate(item.timestamp)}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    From: {item.from === '0x0000000000000000000000000000000000000000' ? 'System' : item.from}
                  </Typography>
                  <Typography variant="body2">
                    To: {item.to}
                  </Typography>
                </StepContent>
              </Step>
            ))}
          </Stepper>
          
          {history.length === 0 && (
            <Alert severity="info">
              No history available for this batch
            </Alert>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default BatchDetail;