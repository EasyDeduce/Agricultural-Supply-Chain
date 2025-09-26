import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Stack,
  Divider
} from '@mui/material';
import {
  AccountBalanceWallet,
  CheckCircleOutline,
  ErrorOutline
} from '@mui/icons-material';
import { useWeb3 } from '../../contexts/Web3Context';
import { useAuth } from '../../contexts/AuthContext';
import { shortenAddress, getNetworkName } from '../../utils/web3Utils';

const ConnectWallet = () => {
  const navigate = useNavigate();
  const { account, networkId, connectWallet, loading: web3Loading, error: web3Error } = useWeb3();
  const { verifyWallet, isAuthenticated, user, loading: authLoading, error: authError } = useAuth();
  
  const [activeStep, setActiveStep] = useState(0);
  const [verificationAttempted, setVerificationAttempted] = useState(false);

  // Auto-advance steps when conditions are met
  useEffect(() => {
    if (account && activeStep === 0) {
      setActiveStep(1);
    }
  }, [account, activeStep]);

  useEffect(() => {
    // Auto verify wallet if connected
    const autoVerifyWallet = async () => {
      if (account && activeStep === 1 && !verificationAttempted) {
        setVerificationAttempted(true);
        try {
          await verifyWallet(account);
          setActiveStep(2);
        } catch (error) {
          console.log('Wallet not registered');
          // Stay on step 1 if verification fails
        }
      }
    };

    autoVerifyWallet();
  }, [account, activeStep, verifyWallet, verificationAttempted]);

  useEffect(() => {
    if (isAuthenticated && user) {
      setActiveStep(2);
    }
  }, [isAuthenticated, user]);

  const handleConnect = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleVerify = async () => {
    if (!account) return;
    
    try {
      await verifyWallet(account);
    } catch (error) {
      console.error('Failed to verify wallet:', error);
    }
  };

  const handleContinue = () => {
    navigate('/dashboard');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  return (
    <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
      <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <AccountBalanceWallet sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Connect Your Wallet
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Connect your Ethereum wallet to access the AgroTrust platform and manage your agricultural products on the blockchain
          </Typography>
        </Box>

        {(web3Error || authError) && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {web3Error || authError}
          </Alert>
        )}

        <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 4 }}>
          <Step key="connect">
            <StepLabel>
              <Typography variant="subtitle1">Connect Wallet</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" paragraph>
                Connect your MetaMask or other Ethereum wallet to get started.
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleConnect}
                  disabled={web3Loading || !!account}
                  startIcon={web3Loading ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {web3Loading ? 'Connecting...' : account ? 'Wallet Connected' : 'Connect Wallet'}
                </Button>
              </Box>
              {account && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="success" icon={<CheckCircleOutline />}>
                    Connected: {shortenAddress(account)} on {getNetworkName(networkId)}
                  </Alert>
                </Box>
              )}
            </StepContent>
          </Step>

          <Step key="verify">
            <StepLabel>
              <Typography variant="subtitle1">Verify Wallet</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" paragraph>
                Verify your wallet to access your account.
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleVerify}
                  disabled={authLoading || !account}
                  sx={{ mr: 2 }}
                  startIcon={authLoading ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {authLoading ? 'Verifying...' : 'Verify Wallet'}
                </Button>
                <Button onClick={handleRegister} disabled={!account}>
                  Register New Account
                </Button>
              </Box>
              {verificationAttempted && !isAuthenticated && !authLoading && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="warning" icon={<ErrorOutline />}>
                    This wallet is not registered. Please register a new account.
                  </Alert>
                </Box>
              )}
            </StepContent>
          </Step>

          <Step key="complete">
            <StepLabel>
              <Typography variant="subtitle1">Complete</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" paragraph>
                Your wallet is connected and verified. You can now use the AgroTrust platform.
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Button variant="contained" onClick={handleContinue}>
                  Continue to Dashboard
                </Button>
              </Box>
            </StepContent>
          </Step>
        </Stepper>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary" paragraph>
            New to blockchain wallets?
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="text" size="small" href="https://metamask.io/download/" target="_blank">
              Install MetaMask
            </Button>
            <Button variant="text" size="small" href="https://docs.metamask.io/guide/" target="_blank">
              Learn More
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
};

export default ConnectWallet;
