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
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Login as LoginIcon, AccountBalanceWallet } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, error: authError } = useAuth();
  const { connectWallet, account } = useWeb3();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Check if there are query params (e.g. redirect after registration)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const registrationSuccess = params.get('registered');
    
    if (registrationSuccess === 'true') {
      setError({
        severity: 'success',
        message: 'Registration successful! Please login with your credentials.',
      });
    }
  }, [location]);
  
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
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Validate form
      if (!formData.username || !formData.password) {
        setError({
          severity: 'error',
          message: 'Please fill in all fields',
        });
        setLoading(false);
        return;
      }
      
      // Login
      await login(formData.username, formData.password);
      
      // Navigate to dashboard on success
      navigate('/dashboard');
    } catch (err) {
      setError({
        severity: 'error',
        message: err.response?.data?.message || 'Login failed. Please check your credentials and try again.',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      navigate('/connect-wallet');
    } catch (err) {
      setError({
        severity: 'error',
        message: 'Failed to connect wallet. Please make sure MetaMask is installed and try again.',
      });
    }
  };
  
  return (
    <Container maxWidth="sm" sx={{ mt: { xs: 4, md: 8 }, mb: 8 }}>
      <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <LoginIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography component="h1" variant="h4" gutterBottom>
            Login
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to access your AgroTrust account
          </Typography>
        </Box>
        
        {(error || authError) && (
          <Alert severity={error?.severity || 'error'} sx={{ mb: 3 }}>
            {error?.message || authError}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <TextField
            name="username"
            label="Username"
            variant="outlined"
            margin="normal"
            fullWidth
            required
            value={formData.username}
            onChange={handleChange}
            disabled={loading}
          />
          <TextField
            name="password"
            label="Password"
            type="password"
            variant="outlined"
            margin="normal"
            fullWidth
            required
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
        
        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="text.secondary">
            OR
          </Typography>
        </Divider>
        
        <Button
          variant="outlined"
          fullWidth
          size="large"
          startIcon={<AccountBalanceWallet />}
          onClick={handleConnectWallet}
          sx={{ mb: 3 }}
        >
          Connect with MetaMask
        </Button>
        
        <Grid container justifyContent="space-between">
          <Grid item>
            <Link component={RouterLink} to="/forgot-password" variant="body2">
              Forgot password?
            </Link>
          </Grid>
          <Grid item>
            <Link component={RouterLink} to="/register" variant="body2">
              Don't have an account? Sign up
            </Link>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default Login;
