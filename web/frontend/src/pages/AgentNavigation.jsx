import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Navigation, MapPin, Store } from 'lucide-react';
import 'leaflet/dist/leaflet.css';


import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const AgentNavigation = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [order, setOrder] = useState(null);
    const [myLocation, setMyLocation] = useState(null);
    const [targetLocation, setTargetLocation] = useState(null);
    const [loading, setLoading] = useState(true);

    
    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/orders');
                
                
                
                const myOrders = res.data; 
                const found = myOrders.find(o => o._id === orderId);
                setOrder(found);
            } catch (err) {
                console.error("Failed to fetch order", err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId]);

    
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setMyLocation([pos.coords.latitude, pos.coords.longitude]);
                },
                (err) => console.error(err),
                { enableHighAccuracy: true }
            );
        }
    }, []);

    
    useEffect(() => {
        if (order) {
            if (order.status === 'READY_FOR_PICKUP') {
                
                if (order.seller?.location?.coordinates) {
                    
                    setTargetLocation([
                        order.seller.location.coordinates[1],
                        order.seller.location.coordinates[0]
                    ]);
                }
            } else {
                
                
                
                if (order.delivery_location?.coordinates) {
                    setTargetLocation([
                        order.delivery_location.coordinates[1],
                        order.delivery_location.coordinates[0]
                    ]);
                } else if (order.customer_location?.latitude) {
                    setTargetLocation([
                        order.customer_location.latitude,
                        order.customer_location.longitude
                    ]);
                }
            }
        }
    }, [order]);

    
    const FitBounds = ({ markers }) => {
        const map = useMap();
        useEffect(() => {
            if (markers.length > 0) {
                const bounds = L.latLngBounds(markers);
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }, [map, markers]);
        return null;
    };

    if (loading) return <div className="p-10 text-center">Loading Mission Data...</div>;
    if (!order) return <div className="p-10 text-center">Order not found or access denied.</div>;

    const isPickup = order.status === 'READY_FOR_PICKUP';
    const targetName = isPickup ? (order.seller?.name || 'Seller Shop') : (order.user?.name || 'Customer');
    const targetLabel = isPickup ? 'Pickup Point' : 'Delivery Point';

    return (
        <div className="h-screen flex flex-col bg-slate-900 text-white">
            {}
            <div className="p-4 bg-slate-800 shadow-lg z-10 flex justify-between items-center">
                <button 
                    onClick={() => navigate('/agent')}
                    className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} /> Back to Dashboard
                </button>
                <div className="text-right">
                    <h2 className="font-bold text-lg flex items-center gap-2 justify-end">
                        <Navigation size={18} className="text-indigo-400" />
                        {targetLabel}: {targetName}
                    </h2>
                    <p className="text-xs text-slate-400 font-mono">#{order._id.slice(-6).toUpperCase()}</p>
                </div>
            </div>

            {}
            <div className="flex-1 relative">
                {(myLocation && targetLocation) ? (
                    <MapContainer 
                        center={myLocation} 
                        zoom={13} 
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; OpenStreetMap contributors'
                        />
                        
                        {}
                        <Marker position={myLocation}>
                             <Popup>My Location</Popup>
                        </Marker>

                        {}
                        <Marker position={targetLocation}>
                             <Popup>{targetLabel}</Popup>
                        </Marker>

                        {}
                        <Polyline 
                            positions={[myLocation, targetLocation]} 
                            color="#3b82f6" 
                            weight={5}
                            opacity={0.8}
                            dashArray="10, 10" 
                        />
                        
                        <FitBounds markers={[myLocation, targetLocation]} />
                    </MapContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <MapPin size={48} className="mb-4 opacity-50" />
                        <p>Waiting for GPS signal...</p>
                        <p className="text-xs mt-2">Ensure location permission is granted.</p>
                    </div>
                )}
                
                {}
                <div className="absolute bottom-6 left-6 right-6 bg-slate-800/90 backdrop-blur p-4 rounded-xl border border-slate-700 shadow-xl max-w-md mx-auto">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isPickup ? 'bg-orange-500' : 'bg-emerald-500'}`}>
                            {isPickup ? <Store className="text-white" /> : <MapPin className="text-white" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{isPickup ? 'Navigate to Shop' : 'Navigate to Customer'}</h3>
                            <p className="text-sm text-slate-300">
                                Follow the <span className="text-blue-400 font-bold">Blue Line</span> to your destination.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentNavigation;
