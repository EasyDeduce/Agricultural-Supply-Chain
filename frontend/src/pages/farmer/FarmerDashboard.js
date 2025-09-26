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
  Add,
  Agriculture,
  VerifiedUser,
  Cancel,
  ShoppingCart,
  Search,
  History,
  PendingActions,
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import { useWeb3 } from '../../contexts/Web3Context';
import { batchAPI } from '../../services/api';
import { shortenAddress, formatFromWei } from '../../utils/web3Utils';

const FarmerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { account, web3 } = useWeb3();
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [batches, setBatches] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    certified: 0,
    rejected: 0,
    purchased: 0,
  });
  
  // Define before useEffect to avoid TDZ: can't access lexical declaration before initialization
  const fetchFarmerBatches = useCallback(async () => {
    try {
      if (!account) return;
      setLoading(true);
      setError(null);
      
      const response = await batchAPI.getFarmerBatches(account);
      const farmerBatches = response.data;
      setBatches(farmerBatches);
      
      // Calculate statistics
      const nextStats = {
        total: farmerBatches.length,
        pending: 0,
        certified: 0,
        rejected: 0,
        purchased: 0,
      };
      
      farmerBatches.forEach(batch => {
        switch (batch.status) {
          case 'CREATED':
            nextStats.pending++;
            break;
          case 'CERTIFIED':
            nextStats.certified++;
            break;
          case 'REJECTED':
            nextStats.rejected++;
            break;
          case 'PURCHASED':
            nextStats.purchased++;
            break;
          default:
            break;
        }
      });
      
      setStats(nextStats);
      
    } catch (err) {
      console.error('Error fetching farmer batches:', err);
      setError('Failed to load batch data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [account]);
  
  useEffect(() => {
    if (account) {
      fetchFarmerBatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, fetchFarmerBatches]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };
  
  const handleCreateBatch = () => {
    navigate('/farmer/create-batch');
  };
  
  const handleViewBatch = (batchId) => {
    navigate(`/batch/${batchId}`);
  };
  
  // Get filtered batches based on tab and search query
  const getFilteredBatches = () => {
    let filtered = batches;
    
    // Filter by tab
    if (tabValue === 1) {
      filtered = batches.filter(batch => batch.status === 'CREATED');
    } else if (tabValue === 2) {
      filtered = batches.filter(batch => batch.status === 'CERTIFIED');
    } else if (tabValue === 3) {
      filtered = batches.filter(batch => batch.status === 'REJECTED');
    } else if (tabValue === 4) {
      filtered = batches.filter(batch => batch.status === 'PURCHASED');
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(batch => 
        batch.cropName.toLowerCase().includes(query) ||
        batch.cropVariety.toLowerCase().includes(query) ||
        batch.location.toLowerCase().includes(query) ||
        batch.batchId.toString().includes(query)
      );
    }
    
    // Sort by newest first
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };
  
  // Get status chip color and label
  const getStatusChip = (status) => {
    switch (status) {
      case 'CREATED':
        return <Chip icon={<PendingActions />} label="Pending Certification" color="primary" size="small" />;
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
  
  const renderBatchCards = (filteredBatches) => {
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
                  {getStatusChip(batch.status)}
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Variety: {batch.cropVariety}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Location: {batch.location}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Batch ID: #{batch.batchId}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Created: {new Date(batch.createdAt).toLocaleDateString()}
                </Typography>
                <Divider sx={{ my: 1 }} />
                
                {batch.status === 'CERTIFIED' && (
                  <>
                    <Typography variant="body2" gutterBottom>
                      <strong>Certified By:</strong> {shortenAddress(batch.certifier)}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Health:</strong> {batch.cropHealth}
                    </Typography>
                    <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                      {web3 ? formatFromWei(batch.price.toString(), web3) : batch.price} ETH
                    </Typography>
                  </>
                )}
                
                {batch.status === 'REJECTED' && (
                  <Typography variant="body2" gutterBottom>
                    <strong>Rejected By:</strong> {shortenAddress(batch.certifier)}
                  </Typography>
                )}
                
                {batch.status === 'PURCHASED' && (
                  <>
                    <Typography variant="body2" gutterBottom>
                      <strong>Purchased By:</strong> {shortenAddress(batch.retailer)}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Date:</strong> {new Date(batch.purchasedAt).toLocaleDateString()}
                    </Typography>
                    <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                      <strong>Sold for:</strong> {web3 ? formatFromWei(batch.price.toString(), web3) : batch.price} ETH
                    </Typography>
                  </>
                )}
              </CardContent>
              <CardActions>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<History />}
                  onClick={() => handleViewBatch(batch.batchId)}
                  fullWidth
                >
                  View Details
                </Button>
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
        <Typography sx={{ mt: 2 }}>Loading farmer dashboard...</Typography>
      </Container>
    );
  }
  
  const filteredBatches = getFilteredBatches();
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Farmer Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your agricultural product batches
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={handleCreateBatch}
            size="large"
          >
            Create Batch
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}
        
        {/* Statistics Cards */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6} sm={4} md={2.4}>
            <StatsCard title="Total" value={stats.total} color="#2196f3" />
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <StatsCard title="Pending" value={stats.pending} color="#ff9800" />
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <StatsCard title="Certified" value={stats.certified} color="#4caf50" />
          </Grid>
          <Grid item xs={6} sm={6} md={2.4}>
            <StatsCard title="Rejected" value={stats.rejected} color="#f44336" />
          </Grid>
          <Grid item xs={6} sm={6} md={2.4}>
            <StatsCard title="Sold" value={stats.purchased} color="#9c27b0" />
          </Grid>
        </Grid>
        
        {/* Farmer Profile */}
        <Paper variant="outlined" sx={{ p: 2, mb: 4 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <Agriculture />
                </Avatar>
                <Box>
                  <Typography variant="h6">{user?.name}</Typography>
                  <Typography variant="body2" color="text.secondary">Farmer</Typography>
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
        
        {/* Search field */}
        <TextField
          fullWidth
          label="Search batches"
          variant="outlined"
          value={searchQuery}
          onChange={handleSearch}
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        
        {/* Tabs for different batch statuses */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="batch tabs">
            <Tab label={`All (${stats.total})`} />
            <Tab label={`Pending (${stats.pending})`} />
            <Tab label={`Certified (${stats.certified})`} />
            <Tab label={`Rejected (${stats.rejected})`} />
            <Tab label={`Sold (${stats.purchased})`} />
          </Tabs>
        </Box>
        
        <Box sx={{ mt: 3 }}>
          {renderBatchCards(filteredBatches)}
        </Box>
      </Paper>
    </Container>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, color }) => (
  <Paper 
    elevation={1} 
    sx={{ 
      p: 2, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      borderTop: `3px solid ${color}`,
      textAlign: 'center'
    }}
  >
    <Typography variant="h4" component="div" sx={{ fontWeight: 'medium' }}>
      {value}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {title}
    </Typography>
  </Paper>
);

export default FarmerDashboard;
