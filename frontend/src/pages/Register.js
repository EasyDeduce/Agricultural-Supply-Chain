import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Link,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  PersonAdd,
  AccountBalanceWallet,
  ArrowBack,
  ArrowForward,
  Help,
  Agriculture,
  VerifiedUser,
  ShoppingCart,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';
import { shortenAddress } from '../utils/web3Utils';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, isAuthenticated, error: authError } = useAuth();
  const { account, connectWallet } = useWeb3();
  
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    userId: '',
    role: '',
    location: '',
    company: '',
    walletAddress: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Get role from URL params if available
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');
    
    if (roleParam && ['farmer', 'certifier', 'retailer'].includes(roleParam)) {
      setFormData((prev) => ({ ...prev, role: roleParam }));
    }
  }, [location]);
  
  // If wallet is connected, prefill the wallet address
  useEffect(() => {
    if (account) {
      setFormData((prev) => ({ ...prev, walletAddress: account }));
    }
  }, [account]);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  
  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };
  
  const handleNext = () => {
    if (activeStep === 0) {
      // Validate step 1
      if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
        setError('Please fill in all required fields');
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }
    }
    
    if (activeStep === 1) {
      // Validate step 2
      if (!formData.name || !formData.userId || !formData.role) {
        setError('Please fill in all required fields');
        return;
      }
      
      if (formData.role === 'certifier' && !formData.company) {
        setError('Company name is required for certifiers');
        return;
      }
      
      if (['farmer', 'retailer'].includes(formData.role) && !formData.location) {
        setError('Location is required');
        return;
      }
    }
    
    setError(null);
    setActiveStep((prev) => prev + 1);
  };
  
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (err) {
      setError('Failed to connect wallet. Please make sure MetaMask is installed and try again.');
    }
  };
  
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!formData.walletAddress) {
      setError('Please connect your wallet to continue');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Register user
      await register(formData);
      
      // Navigate to login with success message
      navigate('/login?registered=true');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const getRoleIcon = (role) => {
    switch (role) {
      case 'farmer':
        return <Agriculture color="primary" />;
      case 'certifier':
        return <VerifiedUser color="secondary" />;
      case 'retailer':
        return <ShoppingCart color="action" />;
      default:
        return null;
    }
  };
  
  return (
    <Container maxWidth="md" sx={{ mt: { xs: 4, md: 8 }, mb: 8 }}>
      <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <PersonAdd sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography component="h1" variant="h4" gutterBottom>
            Register
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create an account to start using AgroTrust
          </Typography>
        </Box>
        
        {(error || authError) && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error || authError}
          </Alert>
        )}
        
        <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 4 }}>
          {/* Step 1: Account Details */}
          <Step key="account">
            <StepLabel>
              <Typography variant="subtitle1">Account Information</Typography>
            </StepLabel>
            <StepContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="username"
                    label="Username"
                    variant="outlined"
                    fullWidth
                    required
                    value={formData.username}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="email"
                    label="Email Address"
                    type="email"
                    variant="outlined"
                    fullWidth
                    required
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="password"
                    label="Password"
                    type="password"
                    variant="outlined"
                    fullWidth
                    required
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    helperText="Password must be at least 8 characters"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="confirmPassword"
                    label="Confirm Password"
                    type="password"
                    variant="outlined"
                    fullWidth
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </Grid>
              </Grid>
              <Box sx={{ mt: 3, mb: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={<ArrowForward />}
                >
                  Next
                </Button>
              </Box>
            </StepContent>
          </Step>
          
          {/* Step 2: Profile Details */}
          <Step key="profile">
            <StepLabel>
              <Typography variant="subtitle1">Profile Information</Typography>
            </StepLabel>
            <StepContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="name"
                    label="Full Name"
                    variant="outlined"
                    fullWidth
                    required
                    value={formData.name}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="userId"
                    label="User ID"
                    variant="outlined"
                    fullWidth
                    required
                    value={formData.userId}
                    onChange={handleChange}
                    disabled={loading}
                    helperText="Unique identifier for your profile"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel id="role-label">Role</InputLabel>
                    <Select
                      labelId="role-label"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <MenuItem value="farmer">Farmer</MenuItem>
                      <MenuItem value="certifier">Certifier</MenuItem>
                      <MenuItem value="retailer">Retailer</MenuItem>
                    </Select>
                    <FormHelperText>
                      Select your role in the supply chain
                    </FormHelperText>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="location"
                    label="Location"
                    variant="outlined"
                    fullWidth
                    required={['farmer', 'retailer'].includes(formData.role)}
                    value={formData.location}
                    onChange={handleChange}
                    disabled={loading}
                    helperText="Required for farmers and retailers"
                  />
                </Grid>
                {formData.role === 'certifier' && (
                  <Grid item xs={12}>
                    <TextField
                      name="company"
                      label="Company Name"
                      variant="outlined"
                      fullWidth
                      required
                      value={formData.company}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </Grid>
                )}
              </Grid>
              <Box sx={{ mt: 3, mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  onClick={handleBack}
                  startIcon={<ArrowBack />}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={<ArrowForward />}
                  disabled={loading}
                >
                  Next
                </Button>
              </Box>
            </StepContent>
          </Step>
          
          {/* Step 3: Connect Wallet */}
          <Step key="wallet">
            <StepLabel>
              <Typography variant="subtitle1">Connect Wallet</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" paragraph>
                Connect your Ethereum wallet to complete registration. This wallet will be used for all your blockchain transactions.
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                {formData.walletAddress ? (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Wallet connected: {shortenAddress(formData.walletAddress)}
                  </Alert>
                ) : (
                  <Button
                    variant="outlined"
                    onClick={handleConnectWallet}
                    startIcon={<AccountBalanceWallet />}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    Connect MetaMask
                  </Button>
                )}
                
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <Tooltip title="You'll need MetaMask installed to connect your wallet">
                    <IconButton size="small" sx={{ mr: 1 }}>
                      <Help fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  No MetaMask? 
                  <Link 
                    href="https://metamask.io/download/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    sx={{ ml: 1 }}
                  >
                    Install here
                  </Link>
                </Typography>
              </Box>
              
              <Box sx={{ mt: 3, mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  onClick={handleBack}
                  startIcon={<ArrowBack />}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSubmit}
                  disabled={loading || !formData.walletAddress}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {loading ? 'Registering...' : 'Complete Registration'}
                </Button>
              </Box>
            </StepContent>
          </Step>
        </Stepper>
        
        {activeStep === 3 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Alert severity="success">
              Registration submitted successfully!
            </Alert>
          </Box>
        )}
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login">
              Sign in
            </Link>
          </Typography>
          
          {formData.role && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {getRoleIcon(formData.role)}
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                Registering as {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default Register;
