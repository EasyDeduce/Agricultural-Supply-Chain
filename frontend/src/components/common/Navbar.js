import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Brightness4,
  Brightness7,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useWeb3 } from '../../contexts/Web3Context';
import { shortenAddress } from '../../utils/web3Utils';

const Navbar = ({ darkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { account, connectWallet, disconnectWallet } = useWeb3();
  
  const [anchorElNav, setAnchorElNav] = useState(null);
  const [anchorElUser, setAnchorElUser] = useState(null);

  // Navigation links based on role
  const getNavLinks = () => {
    if (!isAuthenticated) {
      return [
        { title: 'Home', path: '/' },
        { title: 'Search', path: '/search' }
      ];
    }

    const links = [
      { title: 'Dashboard', path: '/dashboard' },
      { title: 'Search', path: '/search' },
    ];

    switch (user?.role) {
      case 'farmer':
        links.push({ title: 'Create Batch', path: '/farmer/create-batch' });
        break;
      case 'certifier':
        links.push({ title: 'Pending Certifications', path: '/certifier/dashboard' });
        break;
      case 'retailer':
        links.push({ title: 'Marketplace', path: '/retailer/dashboard' });
        break;
      default:
        break;
    }

    return links;
  };

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };
  
  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleLogout = () => {
    logout();
    disconnectWallet();
    handleCloseUserMenu();
    navigate('/');
  };

  const handleConnect = () => {
    connectWallet();
  };

  // Get the role tag for the user
  const getRoleTag = () => {
    if (!user?.role) return null;
    
    const roleColors = {
      farmer: 'primary',
      certifier: 'success',
      retailer: 'secondary',
    };
    
    return (
      <Chip 
        label={user.role.charAt(0).toUpperCase() + user.role.slice(1)} 
        color={roleColors[user.role]} 
        size="small" 
        sx={{ ml: 1 }}
      />
    );
  };

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Desktop Logo */}
          <Box
            component="img"
            src="/agrotrust-logo.svg"
            alt="AgroTrust"
            sx={{ display: { xs: 'none', md: 'flex' }, mr: 1, width: 32, height: 32 }}
          />
          <Typography
            variant="h6"
            noWrap
            component={RouterLink}
            to="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            AgroTrust
          </Typography>

          {/* Mobile Menu */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{
                display: { xs: 'block', md: 'none' },
              }}
            >
              {getNavLinks().map((link) => (
                <MenuItem 
                  key={link.title} 
                  onClick={() => {
                    handleCloseNavMenu();
                    navigate(link.path);
                  }}
                >
                  <Typography textAlign="center">{link.title}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* Mobile Logo */}
          <Box
            component="img"
            src="/agrotrust-logo.svg"
            alt="AgroTrust"
            sx={{ display: { xs: 'flex', md: 'none' }, mr: 1, width: 28, height: 28 }}
          />
          <Typography
            variant="h5"
            noWrap
            component={RouterLink}
            to="/"
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            AgroTrust
          </Typography>

          {/* Desktop Navigation */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {getNavLinks().map((link) => (
              <Button
                key={link.title}
                component={RouterLink}
                to={link.path}
                onClick={handleCloseNavMenu}
                sx={{ my: 2, color: 'white', display: 'block' }}
              >
                {link.title}
              </Button>
            ))}
          </Box>

          {/* Dark Mode Toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Tooltip title={darkMode ? 'Light Mode' : 'Dark Mode'}>
              <IconButton onClick={toggleDarkMode} color="inherit">
                {darkMode ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Tooltip>
          </Box>

          {/* Wallet Connect / User Menu */}
          <Box sx={{ flexGrow: 0 }}>
            {account ? (
              <>
                <Tooltip title="Open settings">
                  <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                    <Avatar alt={user?.name || 'User'}>
                      {user?.name ? user.name.charAt(0).toUpperCase() : <AccountCircle />}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                <Menu
                  sx={{ mt: '45px' }}
                  id="menu-appbar"
                  anchorEl={anchorElUser}
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={Boolean(anchorElUser)}
                  onClose={handleCloseUserMenu}
                >
                  <MenuItem disabled>
                    <Typography textAlign="center">
                      {shortenAddress(account)}
                      {getRoleTag()}
                    </Typography>
                  </MenuItem>
                  <MenuItem onClick={() => {
                    handleCloseUserMenu();
                    navigate('/profile');
                  }}>
                    <Typography textAlign="center">Profile</Typography>
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <Typography textAlign="center">Logout</Typography>
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Box sx={{ display: 'flex' }}>
                <Button 
                  color="inherit" 
                  onClick={handleConnect}
                  sx={{ mr: 1 }}
                >
                  Connect Wallet
                </Button>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="outlined"
                  sx={{ 
                    color: 'white',
                    borderColor: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    }
                  }}
                >
                  Login
                </Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
