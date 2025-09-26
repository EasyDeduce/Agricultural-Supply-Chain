import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../../contexts/Web3Context';
import { useAuth } from '../../contexts/AuthContext';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  Grid,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import api from '../../services/api';
import Papa from 'papaparse';

const CreateBatch = () => {
  const navigate = useNavigate();
  const { web3, account, contracts } = useWeb3();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [gasEstimate, setGasEstimate] = useState(null);
  const [gasNote, setGasNote] = useState('');
  const [formData, setFormData] = useState({
    batchId: '',
    cropName: '',
    cropVariety: '',
    location: user?.location || '',
    harvestDate: new Date(),
    price: '',
  });
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState(null);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle date change
  const handleDateChange = (newDate) => {
    setFormData({
      ...formData,
      harvestDate: newDate,
    });
  };

  // Estimate gas for transaction
  const estimateGas = async () => {
    try {
      if (!contracts.agriChain || !account) {
        throw new Error('Contract not initialized');
      }

      // Check role first to prevent JSON-RPC revert during estimation
      try {
        const userOnChain = await contracts.agriChain.methods.users(account).call();
        const isRegistered = userOnChain.isRegistered;
        const role = Number(userOnChain.role);
        if (!isRegistered || role !== 0) {
          // Not registered: show fallback estimate from helper function
          let fallback = 300000;
          try {
            fallback = await contracts.agriChain.methods.estimateGasForBatchCreation().call();
          } catch (e) {
            // ignore and use default
          }
          setGasEstimate(fallback);
          setGasNote('Estimated using fallback because your wallet is not registered as Farmer. Register first to get an exact estimate.');
          setError('Your wallet is not registered as Farmer on-chain. Click "Register as Farmer" to proceed.');
          return fallback;
        }
      } catch (roleErr) {
        // If users mapping access reverts, also use fallback
        let fallback = 300000;
        try {
          fallback = await contracts.agriChain.methods.estimateGasForBatchCreation().call();
        } catch (e) { /* noop */ }
        setGasEstimate(fallback);
        setGasNote('Estimated using fallback because role check failed.');
        setError('Could not verify your on-chain role. Please register as Farmer first.');
        return fallback;
      }

      // Prepare parameters like the real call
      const priceInWei = web3.utils.toWei((formData.price || '0').toString(), 'ether');
      const harvestTimestamp = Math.floor((formData.harvestDate || new Date()).getTime() / 1000);

      const gasEstimate = await contracts.agriChain.methods
        .createBatch(
          formData.batchId || 'TEMP-ID',
          formData.cropName || 'TEMP',
          formData.cropVariety || 'TEMP',
          formData.location || 'TEMP',
          harvestTimestamp,
          priceInWei
        )
        .estimateGas({ from: account });

      setGasEstimate(gasEstimate);
      setGasNote('');
      return gasEstimate;
    } catch (error) {
      console.error('Error estimating gas:', error);
      setError(error?.message || 'Failed to estimate gas. Please try again.');
      return null;
    }
  };

  // Inline registration helper
  const registerAsFarmer = async () => {
    try {
      setLoading(true);
      setError(null);
      await contracts.agriChain.methods
        .registerUser(0) // 0 = Farmer per AgriChain.UserRole
        .send({ from: account, gas: 200000 });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (e) {
      const msg = e?.data?.message || e?.error?.message || e?.message;
      setError(msg || 'Failed to register as Farmer.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      if (!web3 || !account || !contracts.agriChain) {
        throw new Error('Wallet not connected or contract not initialized');
      }

      // Validate form data
      if (
        !formData.batchId ||
        !formData.cropName ||
        !formData.cropVariety ||
        !formData.location ||
        !formData.harvestDate ||
        !formData.price
      ) {
        throw new Error('Please fill in all fields');
      }

      // Normalize and validate inputs
      const batchIdTrimmed = (formData.batchId || '').trim();
      // Convert price to wei
      const priceInWei = web3.utils.toWei(formData.price, 'ether');
      
      // Convert harvest date to timestamp
      const harvestTimestamp = Math.floor(formData.harvestDate.getTime() / 1000);

      // Pre-check on-chain role to surface clear error
      try {
        const userOnChain = await contracts.agriChain.methods.users(account).call();
        const isRegistered = userOnChain.isRegistered;
        const role = Number(userOnChain.role);
        if (!isRegistered || role !== 0) {
          throw new Error('Your wallet is not registered as Farmer on-chain. Register first via /debug page.');
        }
      } catch (roleErr) {
        if (roleErr.message.includes('execution reverted') || roleErr.message.includes('User not registered')) {
          throw new Error('Your wallet is not registered as Farmer on-chain. Register first via /debug page.');
        }
        throw roleErr;
      }

      // Estimate gas then send with headroom
      let gasLimit;
      try {
        gasLimit = await contracts.agriChain.methods
          .createBatch(
            batchIdTrimmed,
            formData.cropName,
            formData.cropVariety,
            formData.location,
            harvestTimestamp,
            priceInWei
          )
          .estimateGas({ from: account });
        gasLimit = Math.floor(Number(gasLimit) * 1.2);
      } catch (eg) {
        // fallback
        gasLimit = 350000;
      }

      // Create batch on blockchain
      const createBatchTx = await contracts.agriChain.methods
        .createBatch(
          batchIdTrimmed,
          formData.cropName,
          formData.cropVariety,
          formData.location,
          harvestTimestamp,
          priceInWei
        )
        .send({ 
          from: account,
          gas: gasLimit
        });

      // Use the batch ID provided by the farmer
      const batchId = batchIdTrimmed;

      // Save batch to backend
      await api.post('/batches', {
        batchId: batchId,
        cropName: formData.cropName,
        cropVariety: formData.cropVariety,
        location: formData.location,
        harvestDate: formData.harvestDate,
        farmer: account,
        price: formData.price,
        transactionHash: createBatchTx.transactionHash,
      });

      setSuccess(true);
      
      // Reset form
      setFormData({
        batchId: '',
        cropName: '',
        cropVariety: '',
        location: user?.location || '',
        harvestDate: new Date(),
        price: '',
      });

      // Navigate to batch detail after 2 seconds
      setTimeout(() => {
        navigate(`/batch/${batchId}`);
      }, 2000);

    } catch (error) {
      console.error('Error creating batch:', error);
      // Try to unwrap JSON-RPC error message
      const msg = error?.data?.message || error?.error?.message || error?.message;
      setError(msg || 'Failed to create batch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // CSV upload handler: expects columns batchId,cropName,cropVariety,location,harvestDate,price
  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(null);
    setCsvLoading(true);
    try {
      const parsed = await new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: reject,
        });
      });

      for (const row of parsed) {
        await createSingleBatch(row);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setCsvError(err?.message || 'Failed to process CSV');
    } finally {
      setCsvLoading(false);
    }
  };

  const createSingleBatch = async (row) => {
    const data = {
      batchId: String(row.batchId || '').trim(),
      cropName: String(row.cropName || '').trim(),
      cropVariety: String(row.cropVariety || '').trim(),
      location: String(row.location || '').trim(),
      harvestDate: row.harvestDate ? new Date(row.harvestDate) : new Date(),
      price: String(row.price || '0').trim(),
    };
    if (!data.batchId || !data.cropName || !data.cropVariety || !data.location || !data.price) {
      throw new Error('CSV row missing required fields');
    }

    const priceInWei = web3.utils.toWei(data.price, 'ether');
    const harvestTimestamp = Math.floor(new Date(data.harvestDate).getTime() / 1000);

    let gasLimit = 350000;
    try {
      gasLimit = await contracts.agriChain.methods
        .createBatch(data.batchId, data.cropName, data.cropVariety, data.location, harvestTimestamp, priceInWei)
        .estimateGas({ from: account });
      gasLimit = Math.floor(Number(gasLimit) * 1.2);
    } catch {}

    const tx = await contracts.agriChain.methods
      .createBatch(data.batchId, data.cropName, data.cropVariety, data.location, harvestTimestamp, priceInWei)
      .send({ from: account, gas: gasLimit });

    await api.post('/batches', {
      batchId: data.batchId,
      cropName: data.cropName,
      cropVariety: data.cropVariety,
      location: data.location,
      harvestDate: data.harvestDate,
      farmer: account,
      price: data.price,
      transactionHash: tx.transactionHash,
    });
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Batch
        </Typography>
        <Divider sx={{ mb: 4 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Batch created successfully! Redirecting to batch details...
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                name="batchId"
                label="Batch ID"
                fullWidth
                required
                value={formData.batchId}
                onChange={handleChange}
                disabled={loading}
                helperText="Enter a unique identifier for this batch"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="cropName"
                label="Crop Name"
                fullWidth
                required
                value={formData.cropName}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="cropVariety"
                label="Crop Variety"
                fullWidth
                required
                value={formData.cropVariety}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="location"
                label="Location"
                fullWidth
                required
                value={formData.location}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Harvest Date"
                  value={formData.harvestDate}
                  onChange={handleDateChange}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth required disabled={loading} />
                  )}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="price"
                label="Price (ETH)"
                type="number"
                fullWidth
                required
                value={formData.price}
                onChange={handleChange}
                disabled={loading}
                InputProps={{
                  inputProps: { min: 0, step: 0.001 }
                }}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={() => estimateGas()}
              disabled={loading}
            >
              Estimate Gas
            </Button>
            <Button
              variant="text"
              color="secondary"
              onClick={registerAsFarmer}
              disabled={loading || !account || !contracts.agriChain}
              sx={{ mr: 2 }}
            >
              Register as Farmer
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} color="inherit" />}
            >
              {loading ? 'Creating Batch...' : 'Create Batch'}
            </Button>
          </Box>

          {gasEstimate && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                Estimated Gas: {gasEstimate} units (approximately{' '}
                {(Number(gasEstimate) * 0.000000035).toFixed(6)} ETH)
              </Typography>
              {gasNote && (
                <Typography variant="caption" color="text.secondary">
                  {gasNote}
                </Typography>
              )}
            </Box>
          )}
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" gutterBottom>Bulk upload via CSV</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Columns: batchId, cropName, cropVariety, location, harvestDate, price
          </Typography>
          <Button component="label" variant="outlined" disabled={csvLoading || loading}>
            {csvLoading ? 'Uploading...' : 'Upload CSV'}
            <input hidden accept=".csv" type="file" onChange={handleCsvUpload} />
          </Button>
          {csvError && (
            <Alert severity="error" sx={{ mt: 2 }}>{csvError}</Alert>
          )}
        </form>
      </Paper>
    </Container>
  );
};

export default CreateBatch;