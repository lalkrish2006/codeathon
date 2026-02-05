import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Truck, MapPin, Navigation, Package, CheckCircle, Power, User } from 'lucide-react';
import io from 'socket.io-client';
import FixedLocationPicker from '../components/FixedLocationPicker';

const DeliveryAgentDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [availableOrders, setAvailableOrders] = useState([]);
    const [myDelivery, setMyDelivery] = useState(null);
    const [isAvailable, setIsAvailable] = useState(false);
    const [loading, setLoading] = useState(true);

    const API_URL = 'http://localhost:5000/api';

    useEffect(() => {
         
         fetchAvailableOrders();
         fetchMyActiveDelivery();

         const socket = io('http://localhost:5000');
         
         socket.on('delivery_assigned', (order) => {
             if (order.assigned_to === user.id || order.assigned_to?._id === user.id) {
                 setMyDelivery(order);
                 
                 setAvailableOrders(prev => prev.filter(o => o._id !== order._id));
             }
         });

         socket.on('order_ready_for_pickup', (order) => {
             
             if (order.assigned_to === user.id || order.assigned_to?._id === user.id) {
                setAvailableOrders(prev => [order, ...prev]);
             }
         });

         return () => socket.disconnect();
    }, []);

    const fetchAvailableOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            
            const myOrders = res.data.filter(o => 
                (o.assigned_to === user.id || o.assigned_to?._id === user.id) && 
                o.status !== 'DELIVERED'
            );
            setAvailableOrders(myOrders);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyActiveDelivery = async () => {
        try {
            const token = localStorage.getItem('token');
            
            const res = await axios.get(`${API_URL}/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const active = res.data.find(o => 
                (o.assigned_to === user.id || o.assigned_to?._id === user.id) && 
                o.status !== 'DELIVERED'
            );
            setMyDelivery(active || null);
        } catch (err) {
            console.error(err);
        }
    };

    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [mapLocation, setMapLocation] = useState(null);

    const handleToggleClick = () => {
        if (isAvailable) {
            
            updateAgentStatus(false, 0, 0);
        } else {
            
            setLocationModalOpen(true);
        }
    };

    const updateAgentStatus = async (status, lat, lon) => {
        try {
            const token = localStorage.getItem('token');
            
            await axios.patch(`${API_URL}/users/location`, {
                latitude: lat,
                longitude: lon,
                isAvailable: status
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setIsAvailable(status);
            if (status) setLocationModalOpen(false);
        } catch (err) {
            alert("Failed to update status");
        }
    };

    const confirmOnline = () => {
        if (!mapLocation) return alert("Please set your location");
        updateAgentStatus(true, mapLocation.latitude, mapLocation.longitude);
    };

    
    const markAsDelivered = async (orderId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/orders/${orderId}/status`, { status: "DELIVERED" }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            alert("Order marked as Delivered!");
            
            setAvailableOrders(prev => prev.filter(o => o._id !== orderId));
            if (myDelivery && myDelivery._id === orderId) {
                setMyDelivery(null);
            }
        } catch (err) {
            alert("Failed to update status: " + err.message);
        }
    };

    const updateStatus = async (status) => {
        if (!myDelivery) return;
        try {
             const token = localStorage.getItem('token');
             await axios.patch(`${API_URL}/orders/${myDelivery._id}/status`, { status }, {
                 headers: { Authorization: `Bearer ${token}` }
             });
             if (status === 'DELIVERED') {
                 setMyDelivery(null);
                 alert("Delivery Completed! Great job.");
                 
                 setAvailableOrders(prev => prev.filter(o => o._id !== myDelivery._id));
             } else {
                 setMyDelivery(prev => ({ ...prev, status }));
             }
        } catch (err) {
            alert("Failed to update status");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans text-slate-900 pb-20">
            {}
            <header className="bg-slate-900 text-white p-4 sticky top-0 z-20 shadow-md">
                <div className="flex justify-between items-center max-w-md mx-auto">
                    <div className="flex items-center gap-2">
                        <Truck className="text-white" size={24} />
                        <h1 className="text-lg font-bold">Courier App</h1>
                    </div>
                    <div className="flex items-center gap-3">
                         <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                         <button onClick={logout} className="text-xs font-semibold bg-slate-800 px-3 py-1.5 rounded border border-slate-700">LOGOUT</button>
                    </div>
                </div>
            </header>

            <main className="max-w-md mx-auto p-4 space-y-6">
                
                {}
                <div className="card-base p-4 flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-slate-900">Availability Status</h2>
                        <p className="text-xs text-slate-500">{isAvailable ? 'You are visible to sellers' : 'You are offline'}</p>
                    </div>
                    <button 
                        onClick={handleToggleClick}
                        className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 flex items-center ${isAvailable ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}
                    >
                        <div className="w-6 h-6 bg-white rounded-full shadow-md"></div>
                    </button>
                </div>

                {}
                {locationModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl w-full max-w-sm p-5 animate-in slide-in-from-bottom-5">
                            <h3 className="font-bold text-lg mb-2">Set Base Location</h3>
                            <p className="text-xs text-slate-500 mb-4">Select where you are starting your shift. You will be assigned orders near this point.</p>
                            
                            <FixedLocationPicker 
                                onLocationSelect={setMapLocation}
                                height="250px"
                            />

                            <div className="flex gap-3 mt-4">
                                <button onClick={() => setLocationModalOpen(false)} className="flex-1 py-2 text-slate-500 font-bold text-sm">Cancel</button>
                                <button 
                                    onClick={confirmOnline}
                                    disabled={!mapLocation}
                                    className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-sm shadow-md"
                                >
                                    Go Online
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {}
                {myDelivery && (
                    <div className="bg-indigo-600 rounded-xl shadow-lg text-white overflow-hidden">
                        <div className="p-4 border-b border-indigo-500 bg-indigo-700/50 flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2">
                                <Navigation size={18} /> Current Mission
                            </h3>
                            <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded uppercase">{myDelivery.status.replace(/_/g, " ")}</span>
                        </div>
                        <div className="p-5">
                            <div className="mb-6">
                                <p className="text-indigo-200 text-xs uppercase font-bold tracking-wider mb-1">Destination</p>
                                <p className="text-lg font-bold leading-tight mb-1">{myDelivery.user?.name}</p>
                                <div className="flex items-start gap-2 opacity-90">
                                    <MapPin size={16} className="mt-0.5 shrink-0" />
                                    <p className="text-sm">{
                                        myDelivery.status === 'READY_FOR_PICKUP' 
                                            ? `Pickup: ${myDelivery.seller?.name || 'Seller'}` 
                                            : (myDelivery.customer_location?.address || "GPS Location Only")
                                    }</p>
                                </div>
                                {(() => {
                                    
                                    let lat, lon, label;
                                    if (myDelivery.status === 'READY_FOR_PICKUP') {
                                        
                                        if (myDelivery.seller?.location?.coordinates) {
                                            lon = myDelivery.seller.location.coordinates[0];
                                            lat = myDelivery.seller.location.coordinates[1];
                                            label = "Navigate to Shop";
                                        }
                                    } else {
                                        
                                        if (myDelivery.customer_location?.latitude) {
                                            lat = myDelivery.customer_location.latitude;
                                            lon = myDelivery.customer_location.longitude;
                                            label = "Navigate to Customer";
                                        }
                                    }

                                    if (lat && lon) {
                                        return (
                                            <button 
                                                onClick={() => navigate(`/agent/navigation/${myDelivery._id}`)}
                                                className="text-xs font-bold text-indigo-200 hover:text-white flex items-center gap-1 mt-2 underline"
                                            >
                                                <Navigation size={12} /> {label}
                                            </button>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {myDelivery.status === 'IN_TRANSIT' && (
                                     <button 
                                        onClick={() => updateStatus('DELIVERED')}
                                        className="col-span-2 bg-white text-indigo-700 py-3 rounded-lg font-bold shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                                     >
                                         <CheckCircle size={18} /> Mark Delivered
                                     </button>
                                )}
                                {myDelivery.status !== 'IN_TRANSIT' && (
                                    <button 
                                        onClick={() => updateStatus('IN_TRANSIT')}
                                        className="col-span-2 bg-white text-indigo-700 py-3 rounded-lg font-bold shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-sm"
                                    >
                                        Start Delivery
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {}
                <div>
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Package size={18} /> My Assigned Deliveries
                    </h3>
                    
                    {loading ? (
                        <p className="text-center text-slate-400 py-4">Loading assignments...</p>
                    ) : availableOrders.filter(o => !myDelivery || o._id !== myDelivery._id).length === 0 && !myDelivery ? (
                        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300 text-slate-400">
                            <p>No deliveries assigned yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {}
                            {availableOrders.filter(o => !myDelivery || o._id !== myDelivery._id).map(order => (
                                <div key={order._id} className="card-base p-4 border-l-4 border-l-indigo-500">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-slate-900">{order.user?.name}</h4>
                                            <p className="text-xs text-slate-500">{order.customer_location?.city || "Local Delivery"}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-mono font-bold text-slate-900 block">${order.total_amount}</span>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase">{order.status.replace(/_/g, " ")}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-50 p-2 rounded text-xs text-slate-600 mb-4 line-clamp-2">
                                        <span className="font-bold">Item:</span> {order.product_name} (x{order.quantity})
                                    </div>

                                    <button 
                                        onClick={() => markAsDelivered(order._id)}
                                        className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-slate-800 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle size={16} /> Mark as Delivered
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default DeliveryAgentDashboard;
