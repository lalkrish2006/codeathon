import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, Star, Clock, AlertCircle } from 'lucide-react';
import io from 'socket.io-client';

const CustomerDashboard = () => {
    const { user, logout } = useAuth();
    const [products, setProducts] = useState([]);
    const [myOrders, setMyOrders] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Form Stats
    const [quantity, setQuantity] = useState(1);
    const [context, setContext] = useState("");
    const [loading, setLoading] = useState(false);

    const API_URL = 'http://localhost:5000/api';

    useEffect(() => {
        fetchProducts();
        fetchMyOrders();

        const socket = io('http://localhost:5000');
        socket.on('order_updated', (updatedOrder) => {
            if (updatedOrder.user._id === user.id || updatedOrder.user === user.id) {
                 setMyOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
            }
        });

        return () => socket.disconnect();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await axios.get(`${API_URL}/products`);
            setProducts(res.data);
        } catch (err) {
            console.error("Failed to fetch products", err);
        }
    };

    const fetchMyOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            // Assuming GET /orders returns all orders (as allowed in orders.js for now)
            // Ideally backend filters, but we filter client side to be safe/simple
            const res = await axios.get(`${API_URL}/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter for current user just in case
            setMyOrders(res.data.filter(o => o.user._id === user.id || o.user === user.id));
        } catch (err) {
            console.error("Failed to fetch orders", err);
        }
    };

    const handleBuyClick = (product) => {
        setSelectedProduct(product);
        setContext("");
        setQuantity(1);
        setModalOpen(true);
    };

    const handleSubmitOrder = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/orders`, {
                product_id: selectedProduct._id,
                quantity: parseInt(quantity),
                customer_context: context,
                // user_id handled by backend from token
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setModalOpen(false);
            fetchMyOrders(); // Refresh list
            alert("Order placed successfully! AI is analyzing priority...");
        } catch (err) {
            console.error(err);
            alert("Failed to place order.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                        <ShoppingBag /> ShopEthics
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-600">Hello, {user?.name}</span>
                        <button onClick={logout} className="text-sm text-red-500 hover:text-red-700 font-medium">Logout</button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                
                {/* PRODUCTS SECTION */}
                <section className="mb-12">
                    <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Available Products</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {products.map(product => (
                            <div key={product._id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-5 border border-gray-100 flex flex-col">
                                <div className="h-40 bg-gray-100 rounded-lg mb-4 flex items-center justify-center text-gray-400">
                                    [Product Image]
                                </div>
                                <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{product.base_description}</p>
                                <div className="mt-auto flex justify-between items-center">
                                    <span className="font-bold text-blue-900 text-lg">${product.price}</span>
                                    <button 
                                        onClick={() => handleBuyClick(product)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                                        Buy Now
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* MY ORDERS SECTION */}
                <section>
                    <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Order History</h2>
                    {myOrders.length === 0 ? (
                        <p className="text-gray-400">No orders placed yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {myOrders.map(order => (
                                <div key={order._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-lg">{order.product_name}</h4>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                                order.ai_priority <= 2 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                                Priority {order.ai_priority}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">Qty: {order.quantity} • Status: <span className="font-medium text-gray-800">{order.status.replace(/_/g, ' ')}</span></p>
                                        <p className="text-xs text-gray-400 mt-2 bg-gray-50 p-2 rounded">{order.decision_explanation}</p>
                                    </div>
                                    <div className="flex flex-col items-end justify-center">
                                        <span className="text-xs text-gray-500 mb-1">Confidence Score</span>
                                        <div className="flex items-center gap-1 text-sm font-bold text-emerald-600">
                                            <Star size={14} fill="currentColor" /> {(order.confidence_score * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {/* BUY MODAL */}
            {modalOpen && selectedProduct && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-4">Buy {selectedProduct.name}</h3>
                        <p className="text-gray-500 text-sm mb-4">{selectedProduct.base_description}</p>
                        
                        <form onSubmit={handleSubmitOrder} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    value={quantity} 
                                    onChange={e => setQuantity(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency / Delivery Context <span className="text-red-500">*</span></label>
                                <textarea 
                                    className="w-full border rounded-lg px-3 py-2 h-24 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="e.g., I need this for a medical emergency..."
                                    value={context}
                                    onChange={e => setContext(e.target.value)}
                                    required
                                />
                                <p className="text-xs text-gray-400 mt-1">Our AI analyzes this to prioritize your delivery ethics-first.</p>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button 
                                    type="button" 
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' : 'Place Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerDashboard;
