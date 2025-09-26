import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Link,
  Typography,
  Divider,
  Stack,
  IconButton
} from '@mui/material';
import { GitHub, LinkedIn, Twitter } from '@mui/icons-material';
import { useWeb3 } from '../../contexts/Web3Context';
import { getNetworkName } from '../../utils/web3Utils';

const Footer = () => {
  const { networkId, account } = useWeb3();
  
  const footerLinks = [
    {
      title: 'Product',
      links: [
        { name: 'Home', path: '/' },
        { name: 'Search Batches', path: '/search' },
        { name: 'About', path: '/about' },
        { name: 'FAQ', path: '/faq' }
      ]
    },
    {
      title: 'Roles',
      links: [
        { name: 'For Farmers', path: '/farmer' },
        { name: 'For Certifiers', path: '/certifier' },
        { name: 'For Retailers', path: '/retailer' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { name: 'Documentation', path: '/docs' },
        { name: 'API', path: '/api' },
        { name: 'Privacy Policy', path: '/privacy' }
      ]
    }
  ];

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        pt: 6,
        pb: 3,
        mt: 'auto',
        borderTop: '1px solid',
        borderColor: 'divider'
      }}
      component="footer"
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} justifyContent="space-between">
          {/* Logo and Description */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box component="img" src="/agrotrust-logo.svg" alt="AgroTrust" sx={{ mr: 1, width: 28, height: 28 }} />
              <Typography variant="h6" color="text.primary">
                AgroTrust
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              Blockchain-based supply chain platform for agricultural products providing complete transparency and traceability.
            </Typography>
            <Stack direction="row" spacing={1}>
              <IconButton color="inherit" aria-label="GitHub">
                <GitHub />
              </IconButton>
              <IconButton color="inherit" aria-label="LinkedIn">
                <LinkedIn />
              </IconButton>
              <IconButton color="inherit" aria-label="Twitter">
                <Twitter />
              </IconButton>
            </Stack>
          </Grid>
          
          {/* Links */}
          {footerLinks.map((section) => (
            <Grid item xs={6} sm={4} md={2} key={section.title}>
              <Typography variant="subtitle1" color="text.primary" gutterBottom>
                {section.title}
              </Typography>
              <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                {section.links.map((link) => (
                  <Box component="li" sx={{ mb: 1 }} key={link.name}>
                    <Link
                      component={RouterLink}
                      to={link.path}
                      variant="body2"
                      color="text.secondary"
                      underline="hover"
                    >
                      {link.name}
                    </Link>
                  </Box>
                ))}
              </Box>
            </Grid>
          ))}

          {/* Blockchain Status */}
          <Grid item xs={12} sm={4}>
            <Typography variant="subtitle1" color="text.primary" gutterBottom>
              Blockchain Status
            </Typography>
            <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Network: {networkId ? getNetworkName(networkId) : 'Not Connected'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status: {account ? 'Connected' : 'Not Connected'}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ mt: 4, mb: 3 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: { xs: 1, md: 0 } }}>
            &copy; {new Date().getFullYear()} AgroTrust. All rights reserved.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Built with ❤️ for agricultural sustainability
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
