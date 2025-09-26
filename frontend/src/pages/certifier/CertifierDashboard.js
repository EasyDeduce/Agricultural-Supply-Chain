import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  VerifiedUser,
  Cancel,
  History,
  CheckCircle,
  PendingActions,
} from '@mui/icons-material';

import { useAuth } from '../../contexts/AuthContext';
import { useWeb3 } from '../../contexts/Web3Context';
import { batchAPI } from '../../services/api';
import { shortenAddress } from '../../utils/web3Utils';

const CertifierDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { account } = useWeb3();
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingBatches, setPendingBatches] = useState([]);
  const [certifiedBatches, setCertifiedBatches] = useState([]);
  const [rejectedBatches, setRejectedBatches] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    certified: 0,
    rejected: 0,
  });
  
  const fetchCertifierData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch pending batches that need certification
      const pendingResponse = await batchAPI.getPendingCertificationBatches();
      setPendingBatches(Array.isArray(pendingResponse.data) ? pendingResponse.data : []);
      
      // Fetch batches certified by this certifier
      const certifierResponse = await batchAPI.getCertifierBatches(account);
      
      // Separate certified and rejected batches
      const certified = [];
      const rejected = [];
      
      (Array.isArray(certifierResponse.data) ? certifierResponse.data : []).forEach(batch => {
        if (batch.status === 'CERTIFIED') {
          certified.push(batch);
        } else if (batch.status === 'REJECTED') {
          rejected.push(batch);
        }
      });
      
      setCertifiedBatches(certified);
      setRejectedBatches(rejected);
      
      // Update statistics
      setStats({
        total: (Array.isArray(pendingResponse.data) ? pendingResponse.data.length : 0) + certified.length + rejected.length,
        pending: Array.isArray(pendingResponse.data) ? pendingResponse.data.length : 0,
        certified: certified.length,
        rejected: rejected.length,
      });
      
    } catch (err) {
      console.error('Error fetching certifier data:', err);
      setError('Failed to load certifier dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (!account) return;
    fetchCertifierData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleCertifyBatch = (batchId) => {
    navigate(`/certifier/certify/${batchId}`);
  };
  
  const handleViewBatch = (batchId) => {
    navigate(`/batch/${batchId}`);
  };
  
  const renderBatchCards = (batches) => {
    if (batches.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No batches found in this category
        </Alert>
      );
    }
    
    return (
      <Grid container spacing={3}>
        {batches.map((batch) => (
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
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" gutterBottom>
                  Farmer: {shortenAddress(batch.farmer)}
                </Typography>
                {batch.status !== 'CREATED' && (
                  <>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {batch.status === 'CERTIFIED' ? 'Certified' : 'Rejected'} on: {batch.certifiedAt ? new Date(batch.certifiedAt).toLocaleDateString() : 'N/A'}
                    </Typography>
                    {batch.status === 'CERTIFIED' && (
                      <>
                        <Typography variant="body2" gutterBottom>
                          <strong>Crop Health:</strong> {batch.cropHealth}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Expiry:</strong> {batch.expiry ? new Date(batch.expiry).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </>
                    )}
                  </>
                )}
              </CardContent>
              <CardActions>
                {batch.status === 'CREATED' ? (
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<VerifiedUser />}
                    onClick={() => handleCertifyBatch(batch.batchId)}
                    fullWidth
                  >
                    Certify
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
        <Typography sx={{ mt: 2 }}>Loading certifier dashboard...</Typography>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Certifier Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage and certify agricultural product batches
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}
        
        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={6} sm={3}>
            <StatsCard
              icon={<PendingActions fontSize="large" />}
              title="Pending"
              value={stats.pending}
              color="#ff9800"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatsCard
              icon={<CheckCircle fontSize="large" />}
              title="Certified"
              value={stats.certified}
              color="#4caf50"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatsCard
              icon={<Cancel fontSize="large" />}
              title="Rejected"
              value={stats.rejected}
              color="#f44336"
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatsCard
              icon={<VerifiedUser fontSize="large" />}
              title="Total"
              value={stats.total}
              color="#2196f3"
            />
          </Grid>
        </Grid>
        
        {/* Certifier Profile */}
        <Paper variant="outlined" sx={{ p: 2, mb: 4 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                  <VerifiedUser />
                </Avatar>
                <Box>
                  <Typography variant="h6">{user?.name}</Typography>
                  <Typography variant="body2" color="text.secondary">Certifier</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" gutterBottom>
                <strong>ID:</strong> {user?.userId || 'N/A'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Company:</strong> {user?.company || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Wallet:</strong> {shortenAddress(account)}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Tabs for different batch statuses */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="batch tabs">
            <Tab 
              label={`Pending Certification (${stats.pending})`} 
              icon={<PendingActions />} 
              iconPosition="start" 
            />
            <Tab 
              label={`Certified (${stats.certified})`} 
              icon={<CheckCircle />} 
              iconPosition="start" 
            />
            <Tab 
              label={`Rejected (${stats.rejected})`} 
              icon={<Cancel />} 
              iconPosition="start" 
            />
          </Tabs>
        </Box>
        
        <Box sx={{ mt: 3 }}>
          {tabValue === 0 && renderBatchCards(pendingBatches)}
          {tabValue === 1 && renderBatchCards(certifiedBatches)}
          {tabValue === 2 && renderBatchCards(rejectedBatches)}
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

export default CertifierDashboard;
