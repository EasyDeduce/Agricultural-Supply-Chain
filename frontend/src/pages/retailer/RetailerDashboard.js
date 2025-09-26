import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Divider,
  Avatar,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  ShoppingCart,
  VerifiedUser,
  Search,
  History,
  LocalShipping,
  SortByAlpha,
  AttachMoney,
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import { useWeb3 } from '../../contexts/Web3Context';
import { batchAPI } from '../../services/api';
import { shortenAddress, formatFromWei } from '../../utils/web3Utils';

const RetailerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { account, web3 } = useWeb3();
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [purchasedBatches, setPurchasedBatches] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'price', 'name'
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    purchased: 0,
  });
  
  const fetchRetailerData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch available batches for purchase
      const availableResponse = await batchAPI.getAvailablePurchaseBatches();
      setAvailableBatches(Array.isArray(availableResponse.data) ? availableResponse.data : []);
      
      // Fetch batches purchased by this retailer
      const retailerResponse = await batchAPI.getRetailerBatches(account);
      setPurchasedBatches(Array.isArray(retailerResponse.data) ? retailerResponse.data : []);
      
      // Update statistics
      setStats({
        total: (Array.isArray(availableResponse.data) ? availableResponse.data.length : 0) + (Array.isArray(retailerResponse.data) ? retailerResponse.data.length : 0),
        available: Array.isArray(availableResponse.data) ? availableResponse.data.length : 0,
        purchased: Array.isArray(retailerResponse.data) ? retailerResponse.data.length : 0,
      });
      
    } catch (err) {
      console.error('Error fetching retailer data:', err);
      setError('Failed to load retailer dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (!account) return;
    fetchRetailerData();
  }, [account, fetchRetailerData]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  
  const handleSortChange = (sortType) => {
    setSortBy(sortType);
  };
  
  const handlePurchase = (batchId) => {
    navigate(`/batch/${batchId}`);
  };
  
  const handleViewBatch = (batchId) => {
    navigate(`/batch/${batchId}`);
  };
  
  const getFilteredBatches = () => {
    const currentTab = tabValue === 0 ? availableBatches : purchasedBatches;
    
    // Filter by search query
    let filtered = currentTab;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = currentTab.filter(batch => 
        batch.cropName.toLowerCase().includes(query) ||
        batch.cropVariety.toLowerCase().includes(query) ||
        batch.location.toLowerCase().includes(query) ||
        batch.batchId.toString().includes(query)
      );
    }
    
    // Sort results
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return parseFloat(a.price) - parseFloat(b.price);
        case 'name':
          return a.cropName.localeCompare(b.cropName);
        case 'date':
        default:
          // For available, sort by certified date
          // For purchased, sort by purchase date
          const aDate = tabValue === 0 ? (a.certifiedAt ? new Date(a.certifiedAt) : new Date(0)) : (a.purchasedAt ? new Date(a.purchasedAt) : new Date(0));
          const bDate = tabValue === 0 ? (b.certifiedAt ? new Date(b.certifiedAt) : new Date(0)) : (b.purchasedAt ? new Date(b.purchasedAt) : new Date(0));
          return bDate - aDate; // newest first
      }
    });
  };
  
  const renderBatchCards = (batches) => {
    const filteredBatches = batches;
    
    if (filteredBatches.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No batches found in this category
        </Alert>
      );
    }
    
    return (
      <Grid container spacing={3}>
        {filteredBatches.map((batch) => (
          <Grid item xs={12} sm={6} md={4} key={batch.batchId}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" component="h3">
                    {batch.cropName}
                  </Typography>
                  <Chip
                    label={`ID: ${batch.batchId}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Variety: {batch.cropVariety}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Location: {batch.location}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Harvest Date: {new Date(batch.harvestDate).toLocaleDateString()}
                </Typography>
                
                {batch.status === 'CERTIFIED' && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <VerifiedUser fontSize="small" color="success" sx={{ mr: 1 }} />
                      <Typography variant="body2" gutterBottom>
                        Certified on: {new Date(batch.certifiedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" gutterBottom>
                      <strong>Health:</strong> {batch.cropHealth}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Expires:</strong> {new Date(batch.expiry).toLocaleDateString()}
                    </Typography>
                    <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                      {web3 ? formatFromWei(batch.price.toString(), web3) : batch.price} ETH
                    </Typography>
                  </>
                )}
                
                {batch.status === 'PURCHASED' && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ShoppingCart fontSize="small" color="secondary" sx={{ mr: 1 }} />
                      <Typography variant="body2" gutterBottom>
                        Purchased on: {new Date(batch.purchasedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </>
                )}
              </CardContent>
              <CardActions>
                {batch.status === 'CERTIFIED' ? (
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<ShoppingCart />}
                    onClick={() => handlePurchase(batch.batchId)}
                    fullWidth
                  >
                    Purchase
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<History />}
                    onClick={() => handleViewBatch(batch.batchId)}
                    fullWidth
                  >
                    View Details
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };
  
  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading retailer dashboard...</Typography>
      </Container>
    );
  }
  
  const filteredBatches = getFilteredBatches();
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Retailer Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Browse and purchase certified agricultural products
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}
        
        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <StatsCard
              icon={<VerifiedUser fontSize="large" />}
              title="Available Products"
              value={stats.available}
              color="#4caf50"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatsCard
              icon={<ShoppingCart fontSize="large" />}
              title="Purchased Products"
              value={stats.purchased}
              color="#2196f3"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatsCard
              icon={<LocalShipping fontSize="large" />}
              title="Total Products"
              value={stats.total}
              color="#ff9800"
            />
          </Grid>
        </Grid>
        
        {/* Retailer Profile */}
        <Paper variant="outlined" sx={{ p: 2, mb: 4 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                  <ShoppingCart />
                </Avatar>
                <Box>
                  <Typography variant="h6">{user?.name}</Typography>
                  <Typography variant="body2" color="text.secondary">Retailer</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" gutterBottom>
                <strong>ID:</strong> {user?.userId || 'N/A'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Location:</strong> {user?.location || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Wallet:</strong> {shortenAddress(account)}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Search and Sort Controls */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Search products"
                variant="outlined"
                value={searchQuery}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ mr: 2 }}>
                  Sort by:
                </Typography>
                <Chip
                  label="Date"
                  clickable
                  color={sortBy === 'date' ? 'primary' : 'default'}
                  onClick={() => handleSortChange('date')}
                  icon={<History fontSize="small" />}
                  sx={{ mr: 1 }}
                />
                <Chip
                  label="Price"
                  clickable
                  color={sortBy === 'price' ? 'primary' : 'default'}
                  onClick={() => handleSortChange('price')}
                  icon={<AttachMoney fontSize="small" />}
                  sx={{ mr: 1 }}
                />
                <Chip
                  label="Name"
                  clickable
                  color={sortBy === 'name' ? 'primary' : 'default'}
                  onClick={() => handleSortChange('name')}
                  icon={<SortByAlpha fontSize="small" />}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
        
        {/* Tabs for different batch statuses */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="batch tabs">
            <Tab 
              label={`Available for Purchase (${stats.available})`} 
              icon={<VerifiedUser />} 
              iconPosition="start" 
            />
            <Tab 
              label={`Your Purchases (${stats.purchased})`} 
              icon={<ShoppingCart />} 
              iconPosition="start" 
            />
          </Tabs>
        </Box>
        
        <Box sx={{ mt: 3 }}>
          {tabValue === 0 && renderBatchCards(filteredBatches)}
          {tabValue === 1 && renderBatchCards(filteredBatches)}
        </Box>
      </Paper>
    </Container>
  );
};

// Stats Card Component
const StatsCard = ({ icon, title, value, color }) => (
  <Paper 
    elevation={1} 
    sx={{ 
      p: 2, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      borderLeft: `4px solid ${color}`
    }}
  >
    <Box sx={{ color, mb: 1 }}>
      {icon}
    </Box>
    <Typography variant="h4" component="div">
      {value}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {title}
    </Typography>
  </Paper>
);

export default RetailerDashboard;
