import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import CustomerDashboard from './pages/CustomerDashboard';
import AdminDashboard from './pages/AdminDashboard';

import SellerDashboard from './pages/SellerDashboard';
import DeliveryAgentDashboard from './pages/DeliveryAgentDashboard';

import MyOrders from './pages/MyOrders';

// Protected Route Component
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;

  return children;
};

// Placeholder for Agent/Seller
// REMOVED Placeholders

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Customer Routes */}
          <Route path="/customer" element={
            <ProtectedRoute roles={['customer']}>
              <Navigate to="/customer/products" replace />
            </ProtectedRoute>
          } />
          
          <Route path="/customer/products" element={
            <ProtectedRoute roles={['customer']}>
              <CustomerDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/customer/orders" element={
            <ProtectedRoute roles={['customer']}>
              <MyOrders />
            </ProtectedRoute>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          {/* Seller Route */}
          <Route path="/seller" element={
            <ProtectedRoute roles={['seller']}>
               <SellerDashboard />
            </ProtectedRoute>
          } />
          
          {/* Delivery Agent Route */}
          <Route path="/agent" element={
            <ProtectedRoute roles={['delivery_agent']}>
               <DeliveryAgentDashboard />
            </ProtectedRoute>
          } />

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
