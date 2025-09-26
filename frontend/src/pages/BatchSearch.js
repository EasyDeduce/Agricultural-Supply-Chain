import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search,
  FilterList,
  VerifiedUser,
  Cancel,
  ShoppingCart,
  Visibility,
  QrCodeScanner,
} from '@mui/icons-material';
import QRCode from 'qrcode.react';
import { QrScanner } from '@yudiel/react-qr-scanner';

import { batchAPI } from '../services/api';
import { useWeb3 } from '../contexts/Web3Context';
import { formatFromWei } from '../utils/web3Utils';

const BatchSearch = () => {
  const navigate = useNavigate();
  const { web3 } = useWeb3();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  // Removed unused scanner toggles
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let results;
      
      // Search based on the selected tab
      switch (tabValue) {
        case 0: // All
          const response = await batchAPI.searchBatches(searchQuery);
          results = response.data;
          break;
        case 1: // By ID
          try {
            const batchResponse = await batchAPI.getBatchById(searchQuery);
            results = batchResponse.data ? [batchResponse.data] : [];
          } catch (e) {
            results = [];
          }
          break;
        case 2: // Available for purchase
          const availableResponse = await batchAPI.getAvailablePurchaseBatches();
          results = availableResponse.data.filter(batch => 
            batch.cropName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            batch.cropVariety.toLowerCase().includes(searchQuery.toLowerCase()) ||
            batch.location.toLowerCase().includes(searchQuery.toLowerCase())
          );
          break;
        default:
          results = [];
      }
      
      setSearchResults(results);
      
      if (results.length === 0) {
        setError(`No batches found for "${searchQuery}"`);
      }
    } catch (err) {
      console.error('Error searching batches:', err);
      setError('Failed to search batches. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setSearchResults([]);
    setError(null);
  };
  
  // Get status chip color and label
  const getStatusChip = (status) => {
    switch (status) {
      case 'CREATED':
        return <Chip label="Created" color="primary" size="small" />;
      case 'CERTIFIED':
        return <Chip icon={<VerifiedUser />} label="Certified" color="success" size="small" />;
      case 'REJECTED':
        return <Chip icon={<Cancel />} label="Rejected" color="error" size="small" />;
      case 'PURCHASED':
        return <Chip icon={<ShoppingCart />} label="Purchased" color="secondary" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Batch Lookup & Tracking
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Search for batches by ID, name, variety, or location. View complete traceability information.
        </Typography>
        
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          sx={{ mb: 4 }}
          centered
        >
          <Tab label="Search All" />
          <Tab label="Lookup by ID" />
          <Tab label="Available for Purchase" />
          <Tab label="Scan QR" icon={<QrCodeScanner />} iconPosition="start" />
        </Tabs>
        
         <Box sx={{ display: tabValue === 3 ? 'none' : 'flex', mb: 4 }}>
          <TextField
            fullWidth
            label={
              tabValue === 0 ? "Search batches..." : 
              tabValue === 1 ? "Enter batch ID..." : 
              "Search available batches..."
            }
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton edge="end" aria-label="filter">
                    <FilterList />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            sx={{ ml: 2 }}
            onClick={handleSearch}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </Box>
        
         {tabValue !== 3 && error && (
          <Alert severity="info" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

         {/* QR Scanner */}
         {tabValue === 3 && (
           <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
             <Typography variant="body1" sx={{ mb: 2 }}>Point your camera to a batch QR code</Typography>
             <Box sx={{ width: 320, maxWidth: '100%' }}>
               <QrScanner
                 onDecode={async (result) => {
                   if (!result) return;
                   const data = String(result);
                   setError(null);
                   setSearchQuery('');
                   try {
                     const resp = await batchAPI.getBatchById(data);
                     setSearchResults(resp.data ? [resp.data] : []);
                   } catch (e) {
                     setSearchResults([]);
                     setError('No batch found for scanned code');
                   }
                 }}
                 onError={(error) => setError(error?.message || 'Failed to scan QR')}
                 constraints={{ facingMode: 'environment' }}
                 style={{ width: '100%' }}
               />
             </Box>
           </Box>
         )}
        
        {searchResults.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Search Results ({searchResults.length})
            </Typography>
            <Grid container spacing={3}>
               {searchResults.map((batch) => (
                <Grid item xs={12} sm={6} md={4} key={batch.batchId}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" component="h3">
                          {batch.cropName}
                        </Typography>
                        {getStatusChip(batch.status)}
                      </Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Variety: {batch.cropVariety}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Location: {batch.location}
                      </Typography>
                       <Typography variant="body2" color="text.secondary" gutterBottom>
                        Batch ID: {batch.batchId}
                       </Typography>
                       <Divider sx={{ my: 1 }} />
                       <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                         <QRCode value={String(batch.batchId)} size={96} includeMargin />
                       </Box>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" gutterBottom>
                        <strong>Harvest Date:</strong> {new Date(batch.harvestDate).toLocaleDateString()}
                      </Typography>
                      {batch.status === 'CERTIFIED' && (
                        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                          {web3 ? formatFromWei(batch.price.toString(), web3) : batch.price} ETH
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => navigate(`/batch/${batch.batchId}`)}
                        fullWidth
                      >
                        View Details
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default BatchSearch;
