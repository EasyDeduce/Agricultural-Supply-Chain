import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  Avatar,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  Person,
  Edit,
  Save,
  AccountBalanceWallet,
  Email,
  Badge,
  Agriculture,
  VerifiedUser,
  ShoppingCart,
  Delete,
  Warning,
} from '@mui/icons-material';

import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';
import { userAPI } from '../services/api';
import { shortenAddress } from '../utils/web3Utils';

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, deleteAccount } = useAuth();
  const { account } = useWeb3();
  
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [profileData, setProfileData] = useState({
    name: '',
    location: '',
    company: '',
    lastHarvestDate: null,
  });
  
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserProfile();
    }
  }, [isAuthenticated, user]);
  
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await userAPI.getProfile();
      
      setProfileData({
        name: response.data.name || '',
        location: response.data.location || '',
        company: response.data.company || '',
        lastHarvestDate: response.data.lastHarvestDate || null,
      });
      
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData({
      ...profileData,
      [name]: value,
    });
  };
  
  const handleEditToggle = () => {
    setEditing(!editing);
    if (!editing) {
      // Reset form when starting to edit
      setProfileData({
        name: user?.name || '',
        location: user?.location || '',
        company: user?.company || '',
        lastHarvestDate: user?.lastHarvestDate || null,
      });
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      // Update profile
      await userAPI.updateProfile(profileData);
      
      setSuccess(true);
      setEditing(false);
      
      // Refresh data
      fetchUserProfile();
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      
      await deleteAccount(account);
      
      // Navigate to home page after successful deletion
      navigate('/');
      
    } catch (err) {
      console.error('Error deleting account:', err);
      setDeleteError('Failed to delete account. Please try again.');
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };
  
  const getRoleIcon = () => {
    switch (user?.role) {
      case 'farmer':
        return <Agriculture fontSize="large" color="primary" />;
      case 'certifier':
        return <VerifiedUser fontSize="large" color="secondary" />;
      case 'retailer':
        return <ShoppingCart fontSize="large" color="action" />;
      default:
        return <Person fontSize="large" />;
    }
  };
  
  if (loading && !user) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading profile...</Typography>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Your Profile
          </Typography>
          <Button
            variant={editing ? 'outlined' : 'contained'}
            color={editing ? 'secondary' : 'primary'}
            startIcon={editing ? <Save /> : <Edit />}
            onClick={editing ? handleSubmit : handleEditToggle}
            disabled={loading}
          >
            {editing ? 'Save Changes' : 'Edit Profile'}
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 4 }}>
            Profile updated successfully!
          </Alert>
        )}
        
        <Grid container spacing={4}>
          {/* Profile Overview */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <Avatar 
                  sx={{ 
                    width: 120, 
                    height: 120,
                    mb: 2,
                    bgcolor: user?.role === 'farmer' ? 'primary.main' : 
                            user?.role === 'certifier' ? 'secondary.main' : 'action.main'
                  }}
                >
                  {getRoleIcon()}
                </Avatar>
                <Typography variant="h5" component="h2" gutterBottom>
                  {user?.name}
                </Typography>
                <Chip 
                  label={user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'User'} 
                  color={
                    user?.role === 'farmer' ? 'primary' : 
                    user?.role === 'certifier' ? 'secondary' : 'default'
                  }
                  sx={{ mb: 2 }}
                />
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Member since {new Date(user?.registrationDate).toLocaleDateString()}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
                  <AccountBalanceWallet fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    {shortenAddress(account)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Profile Details */}
          <Grid item xs={12} md={8}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    name="name"
                    label="Full Name"
                    variant="outlined"
                    fullWidth
                    value={profileData.name}
                    onChange={handleChange}
                    disabled={!editing || loading}
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    name="location"
                    label="Location"
                    variant="outlined"
                    fullWidth
                    value={profileData.location}
                    onChange={handleChange}
                    disabled={!editing || loading}
                    required={['farmer', 'retailer'].includes(user?.role)}
                    helperText={['farmer', 'retailer'].includes(user?.role) ? 'Required for farmers and retailers' : ''}
                  />
                </Grid>
                
                {user?.role === 'certifier' && (
                  <Grid item xs={12}>
                    <TextField
                      name="company"
                      label="Company"
                      variant="outlined"
                      fullWidth
                      value={profileData.company}
                      onChange={handleChange}
                      disabled={!editing || loading}
                      required
                    />
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Account Information
                  </Typography>
                  
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <Badge fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="User ID"
                        secondary={user?.userId}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Email fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Email"
                        secondary={user?.email}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <AccountBalanceWallet fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Wallet Address"
                        secondary={account}
                      />
                    </ListItem>
                  </List>
                </Grid>
                
                {/* Role specific information */}
                {user?.role === 'farmer' && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle1" gutterBottom>
                        Farmer Statistics
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Registered Crops
                          </Typography>
                          <Typography variant="h6">
                            {user?.registeredCrops?.length || 0}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Last Harvest
                          </Typography>
                          <Typography variant="h6">
                            {user?.lastHarvestDate ? new Date(user.lastHarvestDate).toLocaleDateString() : 'N/A'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Grid>
                  </>
                )}
                
                {user?.role === 'certifier' && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle1" gutterBottom>
                        Certification Statistics
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Certified Crops
                          </Typography>
                          <Typography variant="h6" color="success.main">
                            {user?.certifiedCrops?.length || 0}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Rejected Crops
                          </Typography>
                          <Typography variant="h6" color="error.main">
                            {user?.rejectedCrops?.length || 0}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Grid>
                  </>
                )}
                
                {user?.role === 'retailer' && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle1" gutterBottom>
                        Purchase Statistics
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="text.secondary">
                            Purchased Crops
                          </Typography>
                          <Typography variant="h6">
                            {user?.purchasedCrops?.length || 0}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Grid>
                  </>
                )}
              </Grid>
              
              {editing && (
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    color="inherit"
                    onClick={handleEditToggle}
                    sx={{ mr: 2 }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Box>
              )}
            </form>
          </Grid>
        </Grid>

        {/* Danger Zone */}
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="h6" color="error" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <Warning sx={{ mr: 1 }} />
            Danger Zone
          </Typography>
          <Card sx={{ border: '1px solid', borderColor: 'error.main', backgroundColor: 'error.light', color: 'error.contrastText' }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Delete Account
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Once you delete your account, there is no going back. This action cannot be undone and will permanently remove all your data.
              </Typography>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => setDeleteDialogOpen(true)}
                disabled={loading || deleteLoading}
              >
                Delete My Account
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Paper>

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Warning color="error" sx={{ mr: 1 }} />
            Confirm Account Deletion
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you absolutely sure you want to delete your account? This action will:
          </DialogContentText>
          <List dense sx={{ mt: 2 }}>
            <ListItem>
              <ListItemText primary="• Permanently delete your profile and all associated data" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Remove you from all batches and transactions" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Cannot be undone or recovered" />
            </ListItem>
          </List>
          
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
          
          <DialogContentText sx={{ mt: 2, fontWeight: 'bold' }}>
            Type "DELETE" to confirm:
          </DialogContentText>
          <TextField
            fullWidth
            variant="outlined"
            margin="normal"
            placeholder="Type DELETE to confirm"
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button
            id="confirm-delete-button"
            onClick={handleDeleteAccount}
            color="error"
            variant="contained"
            disabled={deleteLoading || deleteInput !== 'DELETE'}
            startIcon={deleteLoading ? <CircularProgress size={20} color="inherit" /> : <Delete />}
          >
            {deleteLoading ? 'Deleting...' : 'Delete Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;
