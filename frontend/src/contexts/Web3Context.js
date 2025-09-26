import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { Web3 } from 'web3';
import AgriChainABI from '../contracts/AgriChain.json';
import BatchTokenABI from '../contracts/BatchToken.json';
import AuthenticationABI from '../contracts/Authentication.json';

const Web3Context = createContext();

export const useWeb3 = () => useContext(Web3Context);

export const Web3Provider = ({ children }) => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [networkId, setNetworkId] = useState(null);
  const [contracts, setContracts] = useState({
    agriChain: null,
    batchToken: null,
    authentication: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize Web3
  const initWeb3 = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if MetaMask is installed
      if (window.ethereum) {
        const web3Instance = new Web3(window.ethereum);
        setWeb3(web3Instance);

        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);

        // Get network ID
        const chainId = await web3Instance.eth.getChainId();
        setNetworkId(chainId);

        // Initialize contracts
        initContracts(web3Instance);

        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
          setAccount(accounts[0]);
        });

        // Listen for network changes
        window.ethereum.on('chainChanged', () => {
          window.location.reload();
        });
      } else {
        setError('MetaMask is not installed. Please install MetaMask to use this application.');
      }
    } catch (error) {
      console.error('Error initializing Web3:', error);
      setError('Failed to connect to MetaMask. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize contracts
  const initContracts = useCallback(async (web3Instance) => {
    try {
      // Get contract addresses from environment or deployed network
      let agriChainAddress = process.env.REACT_APP_AGRI_CHAIN_ADDRESS;
      let batchTokenAddress = process.env.REACT_APP_BATCH_TOKEN_ADDRESS;
      let authenticationAddress = process.env.REACT_APP_AUTHENTICATION_ADDRESS;

      // For development, if addresses are not in .env, try to get them from localStorage
      // This is useful for local development where contracts are redeployed frequently
      if (!agriChainAddress) {
        agriChainAddress = localStorage.getItem('agriChainAddress');
      }
      if (!batchTokenAddress) {
        batchTokenAddress = localStorage.getItem('batchTokenAddress');
      }
      if (!authenticationAddress) {
        authenticationAddress = localStorage.getItem('authenticationAddress');
      }

      // Trim any accidental whitespace from .env values
      agriChainAddress = agriChainAddress && agriChainAddress.trim();
      batchTokenAddress = batchTokenAddress && batchTokenAddress.trim();
      authenticationAddress = authenticationAddress && authenticationAddress.trim();

      console.log('Contract addresses:', {
        agriChainAddress,
        batchTokenAddress,
        authenticationAddress
      });

      if (!agriChainAddress || !batchTokenAddress || !authenticationAddress) {
        setError('Contract addresses not found. Please deploy contracts and set addresses in the application.');
        return;
      }

      // Optional sanity checks
      const looksLikeAddress = (addr) => typeof addr === 'string' && addr.startsWith('0x') && addr.length === 42;
      if (!looksLikeAddress(agriChainAddress) || !looksLikeAddress(batchTokenAddress) || !looksLikeAddress(authenticationAddress)) {
        setError('Invalid contract address format detected. Please verify your .env or saved addresses.');
        return;
      }

      // Verify code exists at addresses to avoid ABI/decoding errors
      const [agriCode, tokenCode, authCode] = await Promise.all([
        web3Instance.eth.getCode(agriChainAddress),
        web3Instance.eth.getCode(batchTokenAddress),
        web3Instance.eth.getCode(authenticationAddress),
      ]);

      const isNoCode = (code) => !code || code === '0x' || code === '0x0';
      if (isNoCode(agriCode) || isNoCode(tokenCode) || isNoCode(authCode)) {
        console.error('One or more addresses have no contract code:', { agriCode, tokenCode, authCode });
        setError('Contract code not found at one or more addresses. Re-deploy and update addresses (or open the Debug page to set them), then refresh.');
        return;
      }

      // Optional: warn if not on Hardhat local when using local dev
      try {
        const currentChainId = await web3Instance.eth.getChainId();
        if (currentChainId !== 31337) {
          console.warn('Connected chainId is not Hardhat local (31337):', currentChainId);
        }
      } catch {}

      // Initialize contract instances
      const agriChain = new web3Instance.eth.Contract(
        AgriChainABI.abi,
        agriChainAddress
      );

      const batchToken = new web3Instance.eth.Contract(
        BatchTokenABI.abi,
        batchTokenAddress
      );

      const authentication = new web3Instance.eth.Contract(
        AuthenticationABI.abi,
        authenticationAddress
      );

      setContracts({
        agriChain,
        batchToken,
        authentication,
      });
    } catch (error) {
      console.error('Error initializing contracts:', error);
      setError('Failed to initialize smart contracts. Please check your network configuration.');
    }
  }, []);

  // Connect to MetaMask
  const connectWallet = async () => {
    await initWeb3();
  };

  // Disconnect from MetaMask
  const disconnectWallet = () => {
    setAccount(null);
  };

  useEffect(() => {
    // Auto-connect if previously connected
    if (localStorage.getItem('walletConnected') === 'true') {
      initWeb3();
    } else {
      setLoading(false);
    }
  }, [initWeb3]);

  // Update localStorage when account changes
  useEffect(() => {
    if (account) {
      localStorage.setItem('walletConnected', 'true');
    } else {
      localStorage.setItem('walletConnected', 'false');
    }
  }, [account]);

  const value = {
    web3,
    account,
    networkId,
    contracts,
    loading,
    error,
    connectWallet,
    disconnectWallet,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};