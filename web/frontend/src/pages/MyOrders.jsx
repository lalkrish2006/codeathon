import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, ArrowLeft, Truck, Clock, AlertCircle } from 'lucide-react';
import io from 'socket.io-client';
import OrderStatusTimeline from '../components/OrderStatusTimeline';
import { Link } from 'react-router-dom';

const MyOrders = () => {
    const { user, logout } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const API_URL = 'http://localhost:5000/api';

    useEffect(() => {
        fetchOrders();

        const socket = io('http://localhost:5000');
        socket.on('order_updated', (updatedOrder) => {
            if (updatedOrder.user._id === user.id || updatedOrder.user === user.id) {
                 setOrders(prev => {
                     const exists = prev.find(o => o._id === updatedOrder._id);
                     if (exists) return prev.map(o => o._id === updatedOrder._id ? updatedOrder : o);
                     return [updatedOrder, ...prev];
                 });
            }
        });

        return () => socket.disconnect();
    }, []);

    const fetchOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const userOrders = res.data.filter(o => o.user._id === user.id || o.user === user.id);
            setOrders(userOrders);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch orders", err);
            setLoading(false);
        }
    };

    
    const activeOrders = orders.filter(o => o.status !== 'DELIVERED');

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-slate-900">
            {}
            <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/customer/products" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </Link>
                        <h1 className="text-lg font-bold text-slate-900">My Active Orders</h1>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-8">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-500">Loading your orders...</p>
                    </div>
                ) : activeOrders.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                        <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 mb-2">No active orders</h3>
                        <p className="text-slate-500 mb-6">You don't have any orders in progress currently.</p>
                        <Link to="/customer/products" className="btn-primary inline-flex items-center gap-2">
                            Browse Products
                        </Link>
                    </div>
                ) : (
                    activeOrders.map(order => (
                        <div key={order._id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                            {}
                            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4 bg-slate-50/50">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                        {order.product_name}
                                        <span className="text-xs font-normal text-slate-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                                            Qty: {order.quantity}
                                        </span>
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Order #{order._id.slice(-6).toUpperCase()} • <span className="font-bold text-slate-700">${order.total_amount}</span>
                                    </p>
                                </div>
                            </div>

                            {}
                            <OrderStatusTimeline order={order} />
                            
                        </div>
                    ))
                )}
            </main>
        </div>
    );
};

export default MyOrders;
