import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Truck, Store, Home } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

// Fix for default marker icons in Leaflet with Vite/Webpack
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Helper to create custom icons from Lucide React components
const createIcon = (IconComponent, color) => {
    const iconMarkup = renderToStaticMarkup(
        <div style={{ color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', background: 'white', borderRadius: '50%', boxShadow: '0 2px 5px rgba(0,0,0,0.3)', border: `2px solid ${color}` }}>
            <IconComponent size={18} />
        </div>
    );
    
    return L.divIcon({
        html: iconMarkup,
        className: 'custom-leaflet-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });
};

// Component to update map view bounds based on markers
const MapUpdater = ({ bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);
    return null;
};

const LiveTrackingMap = ({ order }) => {
    const [agentLocation, setAgentLocation] = useState(null);
    
    // Extract Locations
    // Customer Location (Fixed)
    const customerLoc = order?.customer_location ? [order.customer_location.latitude, order.customer_location.longitude] : null;

    // Seller Location (Fixed usually)
    const sellerLoc = order?.seller && (order.seller.live_location || order.seller.location?.coordinates) 
        ? [
            order.seller.live_location?.latitude || order.seller.location.coordinates[1],
            order.seller.live_location?.longitude || order.seller.location.coordinates[0]
          ] 
        : null;

    // Agent Location (Dynamic)
    // If agent is assigned, usage the agent's live location if available, else static
    // NOTE: In a real app, we would listen to socket updates here for 'agentLocation'
    // For this specific task, we'll initialize it from the order's assigned agent data
    const assignedAgent = order?.assigned_to;
    const initialAgentLoc = assignedAgent && (assignedAgent.live_location || assignedAgent.location?.coordinates)
        ? [
            assignedAgent.live_location?.latitude || assignedAgent.location.coordinates[1],
            assignedAgent.live_location?.longitude || assignedAgent.location.coordinates[0]
          ]
        : null;

    useEffect(() => {
        if (initialAgentLoc) {
            setAgentLocation(initialAgentLoc);
        }
    }, [order]); // Update if order changes

    // Determine Route: Agent -> Customer OR Seller -> Customer
    const isAgentAssigned = !!assignedAgent;
    const startPoint = isAgentAssigned ? agentLocation : sellerLoc;
    const endPoint = customerLoc;

    if (!order || !startPoint || !endPoint) {
        return (
            <div className="w-full h-[400px] bg-gray-100 flex items-center justify-center rounded-xl border border-gray-200">
                <p className="text-slate-400 font-medium flex items-center gap-2">
                    <Store className="w-5 h-5" /> Waiting for location data...
                </p>
            </div>
        );
    }

    const routePath = [startPoint, endPoint];
    const bounds = L.latLngBounds(routePath);

    return (
        <div className="w-full h-[400px] rounded-xl overflow-hidden shadow-md border border-gray-200 relative z-0">
             <MapContainer 
                center={endPoint} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Customer Marker */}
                <Marker position={endPoint} icon={createIcon(Home, '#2563eb')}>
                    <Popup>
                        <div className="text-center">
                            <h3 className="font-bold text-slate-900">Delivery Location</h3>
                            <p className="text-xs text-slate-500">{order.user?.name}</p>
                        </div>
                    </Popup>
                </Marker>

                {/* Seller Marker (Only if Agent NOT assigned) */}
                {!isAgentAssigned && sellerLoc && (
                    <Marker position={sellerLoc} icon={createIcon(Store, '#ea580c')}>
                         <Popup>
                            <div className="text-center">
                                <h3 className="font-bold text-slate-900">Seller</h3>
                                <p className="text-xs text-slate-500">{order.product_name}</p>
                            </div>
                        </Popup>
                    </Marker>
                )}

                 {/* Agent Marker (Only if Agent IS assigned) */}
                 {isAgentAssigned && agentLocation && (
                    <Marker position={agentLocation} icon={createIcon(Truck, '#16a34a')}>
                         <Popup>
                            <div className="text-center">
                                <h3 className="font-bold text-slate-900">Delivery Agent</h3>
                                <p className="text-xs text-slate-500">{assignedAgent.name}</p>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Route Line */}
                <Polyline 
                    positions={routePath} 
                    pathOptions={{ 
                        color: isAgentAssigned ? '#16a34a' : '#ea580c', // Green if Agent, Orange if Seller
                        weight: 4, 
                        dashArray: isAgentAssigned ? null : '10, 10', // Dashed if pending assignment
                        opacity: 0.8
                    }} 
                />

                <MapUpdater bounds={bounds} />

                {/* Legend Overlay */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-md border border-gray-200 z-[1000] text-xs">
                    <h4 className="font-bold text-slate-800 mb-2">Live Tracking</h4>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Home size={14} className="text-blue-600" />
                            <span>Destination</span>
                        </div>
                        {isAgentAssigned ? (
                             <div className="flex items-center gap-2">
                                <Truck size={14} className="text-green-600" />
                                <span>Agent (On the way)</span>
                            </div>
                        ) : (
                             <div className="flex items-center gap-2">
                                <Store size={14} className="text-orange-600" />
                                <span>Seller (Preparing)</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 mt-1 pt-1 border-t border-gray-100">
                             <div className={`w-8 h-1 rounded-full ${isAgentAssigned ? 'bg-green-600' : 'bg-orange-600'}`}></div>
                             <span className="text-[10px] uppercase font-bold">{isAgentAssigned ? 'Live Route' : 'Est. Path'}</span>
                        </div>
                    </div>
                </div>
            </MapContainer>
        </div>
    );
};

export default LiveTrackingMap;
