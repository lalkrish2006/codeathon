import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Truck, MapPin, CheckCircle, Navigation } from 'lucide-react';
import io from 'socket.io-client';

const DeliveryAgentDashboard = () => {
    const { user, logout } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const API_URL = 'http://localhost:5000/api/orders';

    useEffect(() => {
        fetchOrders();
        
        const socket = io('http://localhost:5000');
        // Listen for new assignments
        socket.on('order_ready_for_pickup', (newOrder) => {
             setOrders(prev => {
                const exists = prev.find(o => o._id === newOrder._id);
                if (exists) return prev.map(o => o._id === newOrder._id ? newOrder : o);
                return [newOrder, ...prev];
             });
        });

        return () => socket.disconnect();
    }, []);

    const fetchOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(API_URL, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching orders:", error);
            setLoading(false);
        }
    };

    const updateStatus = async (orderId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            // Optimistic update
            setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
            
            await axios.patch(`${API_URL}/${orderId}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status");
            fetchOrders(); // Revert on failure
        }
    };

    // Filter Queues
    // Sort by Priority (ASC) -> 1 (Highest) to 3 (Lowest)
    const sortedOrders = [...orders].sort((a, b) => a.ai_priority - b.ai_priority);

    const pendingPickup = sortedOrders.filter(o => o.status === 'READY_FOR_PICKUP');
    const inTransit = sortedOrders.filter(o => o.status === 'IN_TRANSIT');
    const delivered = sortedOrders.filter(o => o.status === 'DELIVERED').slice(0, 10); // Show recent 10

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
            {/* Mobile Header / Sidebar */}
            <aside className="bg-slate-800 text-white p-4 md:w-64 flex-shrink-0 flex justify-between md:block">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Truck /> SwiftDelivery
                    </h1>
                    <p className="text-xs text-slate-400 mt-1 hidden md:block">Agent Portal</p>
                </div>
                <button onClick={logout} className="text-sm bg-slate-700 px-3 py-1 rounded hover:bg-slate-600">
                    Logout
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                <header className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">My Route</h2>
                    <p className="text-gray-600">You have {pendingPickup.length} orders to pickup.</p>
                </header>

                {loading ? <p>Loading route...</p> : (
                    <div className="space-y-8">
                        
                        {/* ACTIVE DELIVERIES (IN TRANSIT) */}
                        {inTransit.length > 0 && (
                            <section>
                                <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
                                    <Navigation className="text-blue-600" /> In Transit ({inTransit.length})
                                </h3>
                                <div className="space-y-4">
                                    {inTransit.map(order => (
                                        <DeliveryCard 
                                            key={order._id} 
                                            order={order} 
                                            actionLabel="Mark Delivered"
                                            onAction={() => updateStatus(order._id, 'DELIVERED')}
                                            variant="active"
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* PICKUP QUEUE */}
                        <section>
                            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <MapPin className="text-orange-600" /> 
                                Pickup Queue (Sorted by Priority)
                            </h3>
                            {pendingPickup.length === 0 ? (
                                <p className="text-gray-400 italic bg-white p-4 rounded shadow-sm">No orders ready for pickup.</p>
                            ) : (
                                <div className="space-y-4">
                                    {pendingPickup.map(order => (
                                        <DeliveryCard 
                                            key={order._id} 
                                            order={order} 
                                            actionLabel="Start Delivery"
                                            onAction={() => updateStatus(order._id, 'IN_TRANSIT')}
                                            variant="pending"
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* RECENTLY DELIVERED */}
                        <section className="opacity-75">
                             <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <CheckCircle className="text-green-600" /> Recent Deliveries
                            </h3>
                            <div className="space-y-2">
                                {delivered.map(order => (
                                    <div key={order._id} className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center">
                                        <span className="text-gray-800 font-medium">{order.product_name}</span>
                                        <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded">DELIVERED</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                    </div>
                )}
            </main>
        </div>
    );
};

const DeliveryCard = ({ order, actionLabel, onAction, variant }) => {
    const priorityBadge = order.ai_priority === 1 ? 'bg-red-600 text-white' : 
                          order.ai_priority === 2 ? 'bg-orange-500 text-white' : 'bg-green-500 text-white';

    return (
        <div className={`bg-white rounded-lg shadow-sm border-l-4 p-4 flex flex-col md:flex-row justify-between gap-4 ${variant === 'active' ? 'border-blue-500 ring-1 ring-blue-100' : 'border-gray-300'}`}>
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${priorityBadge}`}>
                        Priority {order.ai_priority}
                    </span>
                    <h4 className="font-bold text-gray-800 text-lg">{order.product_name}</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mt-2">
                    <div className="flex items-start gap-2">
                        <MapPin size={16} className="mt-0.5 text-gray-400" />
                        <div>
                            <span className="block font-semibold text-gray-700">Pickup Location:</span>
                            <span>{order.user?.name || 'Central Warehouse'}</span>
                        </div>
                    </div>
                     <div className="flex items-start gap-2">
                        <Truck size={16} className="mt-0.5 text-gray-400" />
                         <div>
                            <span className="block font-semibold text-gray-700">Destination:</span>
                            <span>{order.recipient_type || 'Customer Address'}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-3 text-xs bg-gray-50 p-2 rounded text-gray-500 border border-gray-100">
                    <span className="font-semibold">Handling Note:</span> {order.decision_explanation}
                </div>
            </div>

            <div className="flex flex-col justify-center">
                <button 
                    onClick={onAction}
                    className={`px-6 py-3 rounded font-bold shadow-sm transition-transform active:scale-95 ${
                        variant === 'active' 
                            ? 'bg-green-600 text-white hover:bg-green-700' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                    {actionLabel}
                </button>
            </div>
        </div>
    );
};

export default DeliveryAgentDashboard;
