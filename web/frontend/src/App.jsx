import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import CustomerDashboard from './pages/CustomerDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Protected Route Component
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;

  return children;
};

// Placeholder for Agent/Seller
const Placeholder = ({ title }) => (
    <div className="flex h-screen items-center justify-center text-2xl font-bold bg-gray-50">
        {title} Coming Soon
        <span className="text-sm font-normal text-gray-500 ml-2">(Phase 5 Extension)</span>
    </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Customer Routes */}
          <Route path="/customer" element={
            <ProtectedRoute roles={['customer']}>
              <CustomerDashboard />
            </ProtectedRoute>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          {/* Seller/Agent Routes (Placeholders) */}
          <Route path="/seller" element={
            <ProtectedRoute roles={['seller']}>
               <Placeholder title="Seller Dashboard" />
            </ProtectedRoute>
          } />
          
          <Route path="/agent" element={
            <ProtectedRoute roles={['delivery_agent']}>
               <Placeholder title="Delivery Agent App" />
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
