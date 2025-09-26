import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Grid,
  Typography,
  Paper,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
} from '@mui/material';
import {
  Agriculture,
  VerifiedUser,
  ShoppingCart,
  Search,
  Insights,
  Security,
  AccountTree,
  Speed
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();

  // Render call-to-action based on authentication status
  const renderCTA = () => {
    if (isAuthenticated) {
      return (
        <Button 
          component={RouterLink} 
          to="/dashboard" 
          variant="contained" 
          size="large" 
          color="primary" 
          sx={{ minWidth: 200 }}
        >
          Go to Dashboard
        </Button>
      );
    }
    
    return (
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button 
          component={RouterLink} 
          to="/register" 
          variant="contained" 
          size="large" 
          color="primary" 
          sx={{ minWidth: 200 }}
        >
          Get Started
        </Button>
        <Button 
          component={RouterLink} 
          to="/connect-wallet" 
          variant="outlined" 
          size="large" 
          sx={{ minWidth: 200 }}
        >
          Connect Wallet
        </Button>
      </Stack>
    );
  };

  // Features section data
  const features = [
    {
      icon: <VerifiedUser color="primary" fontSize="large" />,
      title: 'Product Certification',
      description: 'Ensure product quality with transparent certification process by authorized certifiers'
    },
    {
      icon: <AccountTree color="primary" fontSize="large" />,
      title: 'Supply Chain Tracking',
      description: 'Track products from farm to table with immutable blockchain records'
    },
    {
      icon: <Security color="primary" fontSize="large" />,
      title: 'Secure Transactions',
      description: 'Facilitate secure and transparent transactions between farmers and retailers'
    },
    {
      icon: <Speed color="primary" fontSize="large" />,
      title: 'Real-time Updates',
      description: 'Get real-time updates on product status, certifications, and transactions'
    }
  ];

  // Role cards data
  const roleCards = [
    {
      title: 'For Farmers',
      image: 'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=600&q=80',
      description: 'Register your crops, create batch records, and connect with certifiers and retailers',
      features: ['Create batch records', 'Request certifications', 'Sell to retailers', 'Track sales history'],
      action: 'Join as Farmer',
      link: '/register?role=farmer'
    },
    {
      title: 'For Certifiers',
      image: 'https://images.unsplash.com/photo-1579621970590-9d624316904b?auto=format&fit=crop&w=600&q=80',
      description: 'Certify product quality, add lab results, and build trust in the supply chain',
      features: ['Review batch details', 'Add certification records', 'Verify product quality', 'Build reputation'],
      action: 'Join as Certifier',
      link: '/register?role=certifier'
    },
    {
      title: 'For Retailers',
      image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=600&q=80',
      description: 'Find quality certified products, verify authenticity, and complete secure purchases',
      features: ['Browse certified products', 'Verify product history', 'Make secure purchases', 'Track inventory'],
      action: 'Join as Retailer',
      link: '/register?role=retailer'
    }
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box 
        sx={{ 
          bgcolor: 'background.paper',
          pt: { xs: 8, sm: 12, md: 16 },
          pb: { xs: 8, sm: 12, md: 16 },
          textAlign: 'center'
        }}
      >
        <Container maxWidth="md">
          <Box component="img" src="/agrotrust-logo.png" alt="AgroTrust" sx={{ width: 72, height: 72, mb: 3 }} />
           <Typography 
            variant="h2" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              fontSize: { xs: '2.5rem', md: '3.75rem' }
            }}
          >
            AgroTrust
          </Typography>
          <Typography 
            variant="h5" 
            component="h2" 
            color="text.secondary" 
            paragraph
            sx={{ mb: 6 }}
          >
            Blockchain-powered supply chain platform ensuring transparency, traceability, and trust
            in the agricultural product lifecycle
          </Typography>
          
          {renderCTA()}
        </Container>
      </Box>
      
      {/* Features Section */}
      <Container sx={{ py: 8 }}>
        <Typography 
          variant="h4" 
          component="h2" 
          align="center" 
          gutterBottom
          sx={{ fontWeight: 'medium', mb: 6 }}
        >
          Key Features
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 4, 
                  height: '100%', 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center'
                }}
              >
                <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                <Typography variant="h6" component="h3" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography color="text.secondary">
                  {feature.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
      
      {/* How It Works Section */}
      <Box sx={{ bgcolor: 'background.paper', py: 8 }}>
        <Container>
          <Typography 
            variant="h4" 
            component="h2" 
            align="center" 
            gutterBottom
            sx={{ fontWeight: 'medium', mb: 6 }}
          >
            How It Works
          </Typography>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ position: 'relative', height: '100%', minHeight: 300 }}>
                <Box 
                  component="img"
                  src="https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=800&q=80"
                  alt="Supply Chain Diagram"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 2,
                    boxShadow: 3
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <List>
                <ListItem alignItems="flex-start">
                  <ListItemIcon>
                    <Agriculture color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="1. Farmers register batches" 
                    secondary="Farmers create digital records for crop batches with detailed information"
                  />
                </ListItem>
                <ListItem alignItems="flex-start">
                  <ListItemIcon>
                    <VerifiedUser color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="2. Certifiers verify quality" 
                    secondary="Authorized certifiers inspect and certify the product quality"
                  />
                </ListItem>
                <ListItem alignItems="flex-start">
                  <ListItemIcon>
                    <ShoppingCart color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="3. Retailers purchase products" 
                    secondary="Retailers browse certified products and make secure purchases"
                  />
                </ListItem>
                <ListItem alignItems="flex-start">
                  <ListItemIcon>
                    <Search color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="4. Consumers verify authenticity" 
                    secondary="End consumers can look up batch history and verify product authenticity"
                  />
                </ListItem>
                <ListItem alignItems="flex-start">
                  <ListItemIcon>
                    <Insights color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="5. Complete transparency" 
                    secondary="All transactions are recorded on the blockchain for full traceability"
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </Container>
      </Box>
      
      {/* Role Cards Section */}
      <Container sx={{ py: 8 }}>
        <Typography 
          variant="h4" 
          component="h2" 
          align="center" 
          gutterBottom
          sx={{ fontWeight: 'medium', mb: 6 }}
        >
          Join AgroTrust
        </Typography>
        <Grid container spacing={4}>
          {roleCards.map((card, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="img"
                  height="200"
                  image={card.image}
                  alt={card.title}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" component="h3" gutterBottom>
                    {card.title}
                  </Typography>
                  <Typography paragraph>
                    {card.description}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <List dense>
                    {card.features.map((feature, i) => (
                      <ListItem key={i} disablePadding>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Agriculture fontSize="small" color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions sx={{ p: 2 }}>
                  <Button 
                    component={RouterLink} 
                    to={card.link} 
                    variant="outlined" 
                    fullWidth
                  >
                    {card.action}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
      
      {/* CTA Section */}
      <Box 
        sx={{ 
          bgcolor: 'primary.main',
          color: 'white',
          py: 8,
          textAlign: 'center'
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h4" component="h2" gutterBottom>
            Ready to join the future of agricultural supply chain?
          </Typography>
          <Typography variant="body1" paragraph sx={{ mb: 4 }}>
            Start tracking your products on the blockchain today
          </Typography>
          {renderCTA()}
        </Container>
      </Box>
    </Box>
  );
};

export default Home;
