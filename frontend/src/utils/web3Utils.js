import { Web3 } from 'web3';

/**
 * Format an ETH value to Wei
 * @param {string|number} value - ETH value
 * @returns {string} - Value in Wei
 */
export const formatInWei = (value, web3Instance = null) => {
  if (!value) return '0';
  
  const web3 = web3Instance || new Web3();
  try {
    return web3.utils.toWei(value.toString());
  } catch (error) {
    console.error('Error converting to Wei:', error);
    return '0';
  }
};

/**
 * Format a Wei value to ETH
 * @param {string|number} value - Wei value
 * @returns {string} - Value in ETH
 */
export const formatFromWei = (value, web3Instance = null) => {
  if (!value) return '0';
  
  const web3 = web3Instance || new Web3();
  try {
    return web3.utils.fromWei(value.toString());
  } catch (error) {
    console.error('Error converting from Wei:', error);
    return '0';
  }
};

/**
 * Shorten an Ethereum address for display
 * @param {string} address - Ethereum address
 * @param {number} chars - Number of characters to show at start and end
 * @returns {string} - Shortened address
 */
export const shortenAddress = (address, chars = 4) => {
  if (!address) return '';
  
  const start = address.substring(0, chars + 2); // +2 for '0x'
  const end = address.substring(address.length - chars);
  
  return `${start}...${end}`;
};

/**
 * Check if string is a valid Ethereum address
 * @param {string} address - Address to check
 * @returns {boolean} - True if valid
 */
export const isValidAddress = (address, web3Instance = null) => {
  const web3 = web3Instance || new Web3();
  return web3.utils.isAddress(address);
};

/**
 * Format timestamp to date
 * @param {number} timestamp - Unix timestamp
 * @returns {Date} - JavaScript Date object
 */
export const timestampToDate = (timestamp) => {
  if (!timestamp) return null;
  
  // Check if timestamp is in seconds (Solidity) or milliseconds (JavaScript)
  const ts = timestamp.toString().length < 13
    ? timestamp * 1000 // Convert seconds to milliseconds
    : Number(timestamp);
    
  return new Date(ts);
};

/**
 * Calculate gas price in ETH
 * @param {number} gasUnits - Gas units
 * @param {number} gasPrice - Gas price in Wei
 * @returns {string} - Gas cost in ETH
 */
export const calculateGasCost = (gasUnits, gasPrice, web3Instance = null) => {
  const web3 = web3Instance || new Web3();
  try {
    // Use standard multiplication instead of BigInt
    const gasUnitsNum = Number(gasUnits);
    const gasPriceNum = Number(gasPrice);
    const gasCost = gasUnitsNum * gasPriceNum;
    
    return web3.utils.fromWei(gasCost.toString());
  } catch (error) {
    console.error('Error calculating gas cost:', error);
    return '0';
  }
};

/**
 * Get network name by chain ID
 * @param {number} chainId - Network chain ID
 * @returns {string} - Network name
 */
export const getNetworkName = (chainId) => {
  const networks = {
    1: 'Ethereum Mainnet',
    5: 'Goerli Testnet',
    11155111: 'Sepolia Testnet',
    56: 'Binance Smart Chain',
    137: 'Polygon Mainnet',
    80001: 'Polygon Mumbai',
    31337: 'Hardhat Local',
    1337: 'Local Ganache'
  };
  
  return networks[chainId] || `Unknown Network (${chainId})`;
};

/**
 * Convert date to Unix timestamp
 * @param {Date} date - JavaScript Date object
 * @returns {number} - Unix timestamp in seconds
 */
export const dateToTimestamp = (date) => {
  if (!date) return 0;
  return Math.floor(date.getTime() / 1000);
};