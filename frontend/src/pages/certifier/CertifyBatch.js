import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Divider,
  Chip,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import {
  VerifiedUser,
  Cancel,
  Agriculture,
  CheckCircle,
  Science,
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import { useWeb3 } from '../../contexts/Web3Context';
import { batchAPI } from '../../services/api';
import { shortenAddress, dateToTimestamp } from '../../utils/web3Utils';

const CertifyBatch = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { account, contracts, web3 } = useWeb3();
  
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [gasEstimate, setGasEstimate] = useState(null);
  const [isCertifierRegistered, setIsCertifierRegistered] = useState(false);
  const [onchainExists, setOnchainExists] = useState(null); // null=unknown, true/false
  
  const [certificationData, setCertificationData] = useState({
    passed: true,
    cropHealth: '',
    expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days in future
    notes: '',
  });
  
  useEffect(() => {
    if (batchId) {
      fetchBatchDetails();
    }
  }, [batchId]);

  // Check on-chain role/registration
  useEffect(() => {
    const checkRole = async () => {
      try {
        if (!contracts.agriChain || !account) return;
        const userInfo = await contracts.agriChain.methods.users(account).call();
        const roleVal = Number(userInfo.role ?? userInfo[1]);
        const registered = Boolean(userInfo.isRegistered ?? userInfo[2]);
        setIsCertifierRegistered(registered && roleVal === 1);
      } catch (e) {
        // Best-effort; don't block UI
        console.warn('Unable to fetch on-chain user role:', e);
        setIsCertifierRegistered(false);
      }
    };
    checkRole();
  }, [contracts.agriChain, account]);

  // Check whether batch exists on-chain (token minted) and cache the result
  useEffect(() => {
    const checkOnchainBatch = async () => {
      try {
        if (!web3 || !contracts?.batchToken || !batchId) {
          setOnchainExists(null);
          return;
        }
        const cleanId = String(batchId).trim();
        const tokenId = web3.utils.keccak256(cleanId);
        try {
          await contracts.batchToken.methods.ownerOf(tokenId).call();
          setOnchainExists(true);
        } catch (err) {
          setOnchainExists(false);
        }
      } catch (e) {
        setOnchainExists(null);
      }
    };
    checkOnchainBatch();
  }, [web3, contracts?.batchToken, batchId]);
  
  const fetchBatchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch batch details from API
      const response = await batchAPI.getBatchById(batchId);
      setBatch(response.data);
      
      if (response.data.status !== 'CREATED') {
        setError(`This batch cannot be certified (Current status: ${response.data.status})`);
      }
      
    } catch (err) {
      console.error('Error fetching batch details:', err);
      setError('Failed to load batch details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCertificationData({
      ...certificationData,
      [name]: name === 'passed' ? value === 'true' : value,
    });
  };
  
  const handleDateChange = (newDate) => {
    setCertificationData({
      ...certificationData,
      expiry: newDate,
    });
  };
  
  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };
  
  const estimateGas = async () => {
    try {
      if (!contracts.agriChain) {
        throw new Error('Contract not initialized');
      }
      if (!isCertifierRegistered) {
        throw new Error('You are not registered on-chain as a Certifier. Please register first.');
      }
      
      const gasEstimate = await contracts.agriChain.methods
        .estimateGasForCertification()
        .call();
      
      setGasEstimate(gasEstimate);
      return gasEstimate;
    } catch (error) {
      console.error('Error estimating gas:', error);
      setError('Failed to estimate gas. Please try again.');
      return null;
    }
  };
  
  const handleSubmitCertification = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      if (!web3 || !account || !contracts.agriChain || !batch) {
        throw new Error('Blockchain connection not available');
      }
      if (!isCertifierRegistered) {
        throw new Error('You are not registered on-chain as a Certifier. Please register first.');
      }
      
      // Convert expiry date to timestamp
      const expiryTimestamp = dateToTimestamp(certificationData.expiry);
      // Convert human batchId (string) to on-chain uint256 (keccak256)
      const cleanId = String(batchId).trim();
      const onchainBatchId = web3.utils.keccak256(cleanId);

      // Ensure batch exists on-chain and is in Created state before sending tx
      try {
        // Prefer checking via NFT ownership; ownerOf reverts if token does not exist
        await contracts.batchToken.methods.ownerOf(onchainBatchId).call();
        // Optionally also ensure status is CREATED via AgriChain if available
        try {
          const details = await contracts.agriChain.methods.getBatchDetails(onchainBatchId).call();
          const statusVal = Number(details.status ?? details[7]);
          if (statusVal !== 0) {
            throw new Error('Batch is not in CREATED state on-chain and cannot be certified.');
          }
        } catch (ignored) {
          // If getBatchDetails is unavailable or fails, continue; ownerOf already proved existence
        }
      } catch (chk) {
        throw chk;
      }
      
      // Call contract method to certify batch
      const certifyTx = await contracts.agriChain.methods
        .certifyBatch(
          onchainBatchId,
          certificationData.passed,
          certificationData.cropHealth,
          expiryTimestamp
        )
        .send({ from: account, gas: 200000 });
      
      // Update backend with certification data
      await batchAPI.certifyBatch(batchId, {
        certifier: account,
        cropHealth: certificationData.cropHealth,
        expiry: certificationData.expiry,
        labResults: certificationData.passed,
        notes: certificationData.notes,
        transactionHash: certifyTx.transactionHash,
      });
      
      setSuccess(true);
      setActiveStep(3);
      
      // Navigate back after delay
      setTimeout(() => {
        navigate('/certifier/dashboard');
      }, 3000);
      
    } catch (err) {
      console.error('Error certifying batch:', err);
      const detailed = err?.data?.message || err?.error?.message || err?.message;
      setError(detailed || 'Failed to certify batch. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterCertifier = async () => {
    try {
      setSubmitting(true);
      setError(null);
      if (!contracts.agriChain || !account) throw new Error('Wallet not connected');
      // 1 = Certifier per UserRole enum
      await contracts.agriChain.methods.registerUser(1).send({ from: account });
      setIsCertifierRegistered(true);
    } catch (e) {
      const detailed = e?.data?.message || e?.error?.message || e?.message;
      setError(detailed || 'Failed to register as Certifier');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading batch details...</Typography>
      </Container>
    );
  }
  
  if (!batch) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">
          Batch not found or you don't have permission to view it.
        </Alert>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={() => navigate('/certifier/dashboard')}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Certify Batch #{batchId}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {!isCertifierRegistered && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Your wallet is not registered on-chain as a Certifier.
            <Box sx={{ mt: 1 }}>
              <Button variant="contained" onClick={handleRegisterCertifier} disabled={submitting}>
                Register as Certifier
              </Button>
            </Box>
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 4 }}>
            Batch {certificationData.passed ? 'certified' : 'rejected'} successfully! Redirecting to dashboard...
          </Alert>
        )}
        
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1">Crop Details</Typography>
              <Typography variant="body1">{batch.cropName} - {batch.cropVariety}</Typography>
              <Typography variant="body2" color="text.secondary">
                Location: {batch.location}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Harvest Date: {new Date(batch.harvestDate).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1">Farmer Information</Typography>
              <Typography variant="body2">
                <strong>Address:</strong> {shortenAddress(batch.farmer)}
              </Typography>
                    <Chip
                icon={<Agriculture />}
                label={`Batch ID: ${batch.batchId}`}
                color="primary"
                size="small"
                sx={{ mt: 1 }}
              />
            </Grid>
          </Grid>
        </Box>
        
        {/* On-chain status banner */}
        {onchainExists === false && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            This batch exists in the database but was not found on the current blockchain network.
            Certification is disabled. Ask the farmer to create this batch on-chain again, or ensure
            you're connected to the same network and contract addresses used when the batch was created.
          </Alert>
        )}

        <Divider sx={{ mb: 4 }} />
        
        <Stepper activeStep={activeStep} orientation="vertical">
          {/* Step 1: Lab Testing Results */}
          <Step key="lab-results">
            <StepLabel>Lab Testing Results</StepLabel>
            <StepContent>
              <FormControl component="fieldset" sx={{ mb: 3 }}>
                <FormLabel component="legend">Lab Test Result</FormLabel>
                <RadioGroup
                  name="passed"
                  value={certificationData.passed.toString()}
                  onChange={handleChange}
                  row
                >
                  <FormControlLabel 
                    value="true" 
                    control={<Radio color="success" />} 
                    label="Pass" 
                  />
                  <FormControlLabel 
                    value="false" 
                    control={<Radio color="error" />} 
                    label="Fail" 
                  />
                </RadioGroup>
              </FormControl>
              
              <TextField
                name="cropHealth"
                label="Crop Health Assessment"
                multiline
                rows={3}
                fullWidth
                required
                value={certificationData.cropHealth}
                onChange={handleChange}
                disabled={submitting}
                placeholder="Provide details about crop health, quality, etc."
                sx={{ mb: 3 }}
              />
              
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  sx={{ mt: 1, mr: 1 }}
                  disabled={!certificationData.cropHealth}
                >
                  Continue
                </Button>
              </Box>
            </StepContent>
          </Step>
          
          {/* Step 2: Additional Information */}
          <Step key="additional-info">
            <StepLabel>Additional Information</StepLabel>
            <StepContent>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Expected Expiry Date"
                  value={certificationData.expiry}
                  onChange={handleDateChange}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      fullWidth 
                      required 
                      sx={{ mb: 3 }} 
                      disabled={submitting}
                    />
                  )}
                  minDate={new Date()}
                />
              </LocalizationProvider>
              
              <TextField
                name="notes"
                label="Additional Notes"
                multiline
                rows={3}
                fullWidth
                value={certificationData.notes}
                onChange={handleChange}
                disabled={submitting}
                placeholder="Any additional notes about the certification"
                sx={{ mb: 3 }}
              />
              
              <Box sx={{ mb: 2 }}>
                <Button
                  onClick={handleBack}
                  sx={{ mt: 1, mr: 1 }}
                  disabled={submitting}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  sx={{ mt: 1, mr: 1 }}
                >
                  Continue
                </Button>
              </Box>
            </StepContent>
          </Step>
          
          {/* Step 3: Review and Submit */}
          <Step key="review">
            <StepLabel>Review and Submit</StepLabel>
            <StepContent>
              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Certification Summary
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Batch:</strong> #{batch.batchId} - {batch.cropName} ({batch.cropVariety})
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Result:</strong> {certificationData.passed ? (
                    <Chip icon={<CheckCircle />} label="Pass" color="success" size="small" />
                  ) : (
                    <Chip icon={<Cancel />} label="Fail" color="error" size="small" />
                  )}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Crop Health:</strong> {certificationData.cropHealth}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Expiry Date:</strong> {certificationData.expiry.toLocaleDateString()}
                </Typography>
                {certificationData.notes && (
                  <Typography variant="body2" gutterBottom>
                    <strong>Notes:</strong> {certificationData.notes}
                  </Typography>
                )}
              </Paper>
              
              <Box sx={{ mt: 3, mb: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => estimateGas()}
                  disabled={submitting}
                  startIcon={<Science />}
                  sx={{ mb: 2 }}
                >
                  Estimate Gas
                </Button>
                
                {gasEstimate && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Estimated Gas: {gasEstimate} units (approximately{' '}
                    {(Number(gasEstimate) * 0.000000021).toFixed(6)} ETH)
                  </Typography>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button
                    onClick={handleBack}
                    disabled={submitting}
                  >
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    color={certificationData.passed ? 'primary' : 'error'}
                    onClick={handleSubmitCertification}
                    disabled={submitting || onchainExists === false}
                    startIcon={submitting ? 
                      <CircularProgress size={20} color="inherit" /> : 
                      certificationData.passed ? <VerifiedUser /> : <Cancel />
                    }
                  >
                    {submitting ? 'Processing...' : certificationData.passed ? 'Certify Batch' : 'Reject Batch'}
                  </Button>
                </Box>
              </Box>
            </StepContent>
          </Step>
          
          {/* Step 4: Completed */}
          <Step key="completed">
            <StepLabel>Completed</StepLabel>
            <StepContent>
              <Typography variant="body1" gutterBottom>
                Certification has been successfully processed on the blockchain.
              </Typography>
              <Typography variant="body2" gutterBottom>
                The batch is now {certificationData.passed ? 'certified and available for purchase' : 'marked as rejected'}.
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={() => navigate('/certifier/dashboard')}
                >
                  Return to Dashboard
                </Button>
              </Box>
            </StepContent>
          </Step>
        </Stepper>
      </Paper>
    </Container>
  );
};

export default CertifyBatch;
