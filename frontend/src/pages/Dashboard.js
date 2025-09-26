import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Person,
  Agriculture,
  VerifiedUser,
  ShoppingCart,
  Visibility,
  History,
  Add,
  PendingActions,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';

import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';
import { batchAPI } from '../services/api';
import { shortenAddress } from '../utils/web3Utils';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { account } = useWeb3();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalBatches: 0,
    pendingBatches: 0,
    certifiedBatches: 0,
    rejectedBatches: 0,
    purchasedBatches: 0,
  });
  const [recentBatches, setRecentBatches] = useState([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let batches = [];
      let userStats = {
        totalBatches: 0,
        pendingBatches: 0,
        certifiedBatches: 0,
        rejectedBatches: 0,
        purchasedBatches: 0,
      };

      switch (user?.role) {
        case 'farmer':
          const farmerResponse = await batchAPI.getFarmerBatches(account);
          batches = Array.isArray(farmerResponse.data) ? farmerResponse.data : [];
          break;
          
        case 'certifier':
          const pendingResponse = await batchAPI.getPendingCertificationBatches();
          const certifierResponse = await batchAPI.getCertifierBatches(account);
          const pending = Array.isArray(pendingResponse.data) ? pendingResponse.data : [];
          const certifierData = Array.isArray(certifierResponse.data) ? certifierResponse.data : [];
          batches = [...pending.slice(0, 5), ...certifierData.slice(0, 5)];
          userStats.pendingBatches = pending.length;
          // Count certified/rejected from certifierData
          certifierData.forEach(b => {
            if (b.status === 'CERTIFIED') userStats.certifiedBatches++;
            if (b.status === 'REJECTED') userStats.rejectedBatches++;
          });
          break;
          
        case 'retailer':
          const availableResponse = await batchAPI.getAvailablePurchaseBatches();
          const retailerResponse = await batchAPI.getRetailerBatches(account);
          const available = Array.isArray(availableResponse.data) ? availableResponse.data : [];
          const purchased = Array.isArray(retailerResponse.data) ? retailerResponse.data : [];
          batches = [...available.slice(0, 5), ...purchased.slice(0, 5)];
          userStats.certifiedBatches = available.length;
          userStats.purchasedBatches = purchased.length;
          break;
          
        default:
          const allBatches = await batchAPI.getAllBatches();
          batches = Array.isArray(allBatches.data) ? allBatches.data : [];
      }

      // Calculate stats
      batches.forEach(batch => {
        switch (batch.status) {
          case 'CREATED':
            userStats.pendingBatches++;
            break;
          case 'CERTIFIED':
            userStats.certifiedBatches++;
            break;
          case 'REJECTED':
            userStats.rejectedBatches++;
            break;
          case 'PURCHASED':
            userStats.purchasedBatches++;
            break;
          default:
            break;
        }
      });

      userStats.totalBatches = batches.length;
      setStats(userStats);
      setRecentBatches(batches.slice(0, 5)); // Get 5 most recent batches
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !account) return;
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, account]);

  // Render dashboard content based on user role
  const renderDashboardContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      );
    }

    return (
      <Grid container spacing={4}>
        {/* Stats Cards */}
        <Grid item xs={12}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                icon={<Agriculture />}
                title="Total Batches"
                value={stats.totalBatches}
                color="#4caf50"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                icon={<PendingActions />}
                title="Pending"
                value={stats.pendingBatches}
                color="#ff9800"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                icon={<CheckCircle />}
                title="Certified"
                value={stats.certifiedBatches}
                color="#2196f3"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard
                icon={<ShoppingCart />}
                title="Purchased"
                value={stats.purchasedBatches}
                color="#9c27b0"
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Role-specific Actions */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            {user?.role === 'farmer' && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    startIcon={<Add />}
                    onClick={() => navigate('/farmer/create-batch')}
                    sx={{ mb: 2 }}
                  >
                    Create New Batch
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<History />}
                    onClick={() => navigate('/farmer/dashboard')}
                    sx={{ mb: 2 }}
                  >
                    View My Batches
                  </Button>
                </Grid>
              </Grid>
            )}

            {user?.role === 'certifier' && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    startIcon={<VerifiedUser />}
                    onClick={() => navigate('/certifier/dashboard')}
                    sx={{ mb: 2 }}
                  >
                    Review Pending Batches
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<History />}
                    onClick={() => navigate('/certifier/history')}
                    sx={{ mb: 2 }}
                  >
                    View Certification History
                  </Button>
                </Grid>
              </Grid>
            )}

            {user?.role === 'retailer' && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    startIcon={<ShoppingCart />}
                    onClick={() => navigate('/retailer/dashboard')}
                    sx={{ mb: 2 }}
                  >
                    Browse Marketplace
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<History />}
                    onClick={() => navigate('/retailer/purchases')}
                    sx={{ mb: 2 }}
                  >
                    My Purchases
                  </Button>
                </Grid>
              </Grid>
            )}

            <Box sx={{ mt: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                color="secondary"
                startIcon={<Visibility />}
                onClick={() => navigate('/search')}
              >
                Search Batches
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Recent Batches
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {recentBatches.length > 0 ? (
              <List>
                {recentBatches.map((batch) => (
                  <ListItem
                    key={batch.batchId}
                    divider
                    button
                    onClick={() => navigate(`/batch/${batch.batchId}`)}
                  >
                    <ListItemIcon>
                      {getStatusIcon(batch.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={`${batch.cropName} - ${batch.cropVariety}`}
                      secondary={`Batch #${batch.batchId} | ${batch.location} | ${getStatusLabel(batch.status)}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">No recent batches found</Alert>
            )}
          </Paper>
        </Grid>

        {/* User Profile */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Person sx={{ fontSize: 48, mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="h6">{user?.name || 'User'}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'Role'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={5}>
                <Typography variant="body2" gutterBottom>
                  <strong>User ID:</strong> {user?.userId || 'N/A'}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Wallet:</strong> {shortenAddress(account)}
                </Typography>
                <Typography variant="body2">
                  <strong>Location:</strong> {user?.location || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/profile')}
                >
                  View Profile
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.name || 'User'}
        </Typography>
      </Box>
      
      {renderDashboardContent()}
    </Container>
  );
};

// Helper components
const StatsCard = ({ icon, title, value, color }) => (
  <Paper
    sx={{
      p: 3,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderTop: `4px solid ${color}`
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
      <Box sx={{ mr: 2, color }}>
        {icon}
      </Box>
      <Typography variant="h6" component="h3">
        {title}
      </Typography>
    </Box>
    <Typography variant="h3" component="p" sx={{ mt: 1 }}>
      {value}
    </Typography>
  </Paper>
);

// Helper functions
const getStatusIcon = (status) => {
  switch (status) {
    case 'CREATED':
      return <Agriculture color="primary" />;
    case 'CERTIFIED':
      return <VerifiedUser color="success" />;
    case 'REJECTED':
      return <Cancel color="error" />;
    case 'PURCHASED':
      return <ShoppingCart color="secondary" />;
    default:
      return <Agriculture />;
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'CREATED':
      return 'Created';
    case 'CERTIFIED':
      return 'Certified';
    case 'REJECTED':
      return 'Rejected';
    case 'PURCHASED':
      return 'Purchased';
    default:
      return status;
  }
};

export default Dashboard;
