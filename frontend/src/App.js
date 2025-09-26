import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Web3Provider } from './contexts/Web3Context';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ConnectWallet from './components/auth/ConnectWallet';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import CreateBatch from './pages/farmer/CreateBatch';
import CertifierDashboard from './pages/certifier/CertifierDashboard';
import CertifyBatch from './pages/certifier/CertifyBatch';
import RetailerDashboard from './pages/retailer/RetailerDashboard';
import BatchDetail from './pages/BatchDetail';
import BatchSearch from './pages/BatchSearch';
import Profile from './pages/Profile';
import ContractDebug from './pages/ContractDebug';

// Protected route component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

function App() {
  const [darkMode, setDarkMode] = useState(false);
  
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#4caf50',
      },
      secondary: {
        main: '#ff9800',
      },
    },
  });
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('darkMode', !darkMode);
  };
  
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode) {
      setDarkMode(savedMode === 'true');
    }
  }, []);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Web3Provider>
        <AuthProvider>
          <Router>
            <div className="app">
              <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
              <div className="content">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/connect-wallet" element={<ConnectWallet />} />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/farmer/dashboard" element={
                    <ProtectedRoute allowedRoles={['farmer']}>
                      <FarmerDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/farmer/create-batch" element={
                    <ProtectedRoute allowedRoles={['farmer']}>
                      <CreateBatch />
                    </ProtectedRoute>
                  } />
                  <Route path="/certifier/dashboard" element={
                    <ProtectedRoute allowedRoles={['certifier']}>
                      <CertifierDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/certifier/certify/:batchId" element={
                    <ProtectedRoute allowedRoles={['certifier']}>
                      <CertifyBatch />
                    </ProtectedRoute>
                  } />
                  <Route path="/retailer/dashboard" element={
                    <ProtectedRoute allowedRoles={['retailer']}>
                      <RetailerDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/batch/:batchId" element={<BatchDetail />} />
                   {/* Public search and QR scan access */}
                   <Route path="/search" element={<BatchSearch />} />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  <Route path="/debug" element={<ContractDebug />} />
                </Routes>
              </div>
              <Footer />
            </div>
          </Router>
        </AuthProvider>
      </Web3Provider>
    </ThemeProvider>
  );
}

export default App;