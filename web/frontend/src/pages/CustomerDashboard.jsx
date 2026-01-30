import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Package, Truck, AlertCircle, CheckCircle } from 'lucide-react';

const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const [product, setProduct] = useState('');
  const [desc, setDesc] = useState('');
  const [qty, setQty] = useState(1);
  const [lastOrder, setLastOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post('http://localhost:5000/api/orders', {
        product_name: product,
        description: desc,
        quantity: qty,
        user_id: user.id
      });
      
      setLastOrder(res.data);
      setProduct('');
      setDesc('');
      setQty(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Order failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-800">SwiftDelivery Customer</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {user?.name}</span>
              <button onClick={logout} className="text-red-600 hover:text-red-800 text-sm font-medium">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6">
        
        {/* Order Form */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
            <h3 className="text-lg font-semibold text-white">Create New Shipment Request</h3>
            <p className="text-blue-100 text-sm">AI will analyze your request for prioritization.</p>
          </div>
          
          <div className="p-6">
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    placeholder="e.g. Medical Kit"
                    value={product}
                    onChange={e => setProduct(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description & Context (Crucial for AI)
                </label>
                <textarea
                  required
                  rows="3"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                  placeholder="Describe the item and why it is needed instantly..."
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Analyzing...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Real-time Feedback Card */}
        {lastOrder && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden animate-fade-in-up">
            <div className={`px-6 py-4 border-l-4 ${lastOrder.ai_priority <= 2 ? 'border-red-500' : 'border-green-500'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Request Processed</h4>
                  <p className="text-sm text-gray-500">ID: {lastOrder._id}</p>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  lastOrder.ai_priority <= 2 ? 'bg-red-100 text-red-800' : 
                  lastOrder.ai_priority <= 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }`}>
                  Priority: {lastOrder.ai_priority}
                </span>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded text-sm">
                  <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Confidence</span>
                  <span className="text-lg font-mono">{(lastOrder.confidence_score * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-gray-50 p-4 rounded text-sm">
                  <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</span>
                  <span className="flex items-center mt-1">
                    {lastOrder.status === 'pending' && <AlertCircle className="w-4 h-4 text-yellow-500 mr-1" />}
                    {lastOrder.status === 'approved' && <CheckCircle className="w-4 h-4 text-green-500 mr-1" />}
                    {lastOrder.status.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="mt-4">
                  <p className="text-sm text-gray-600">
                      <strong>AI Explanation:</strong> {lastOrder.decision_explanation}
                  </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CustomerDashboard;
