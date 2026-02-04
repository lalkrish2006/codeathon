import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Click Handler Component
const MapClickHandler = ({ onLocationSelect }) => {
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            onLocationSelect({ latitude: lat, longitude: lng });
        },
    });
    return null;
};

// Map View Updater (Recenter map when position changes programmatically)
const MapRecenter = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
};

// Map Invalidator (Fix for modal rendering)
const MapInvalidator = () => {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => map.invalidateSize(), 200);
    }, [map]);
    return null;
};

const FixedLocationPicker = ({ 
    onLocationSelect, 
    initialLocation = null, 
    height = "400px" 
}) => {
    // Default to Bangalore or provided location
    const defaultCenter = [12.9716, 77.5946];
    const [markerPosition, setMarkerPosition] = useState(initialLocation);

    useEffect(() => {
        if (initialLocation) {
            setMarkerPosition(initialLocation);
        }
    }, [initialLocation]);

    const handleMapClick = (location) => {
        setMarkerPosition(location);
        if (onLocationSelect) {
            onLocationSelect(location);
        }
    };

    const center = markerPosition ? [markerPosition.latitude, markerPosition.longitude] : defaultCenter;

    return (
        <div className="w-full relative border rounded-lg overflow-hidden shadow-sm" style={{ height }}>
             <MapContainer 
                center={center} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                <MapInvalidator />
                <MapClickHandler onLocationSelect={handleMapClick} />
                <MapRecenter center={center} />

                {markerPosition && (
                    <Marker position={[markerPosition.latitude, markerPosition.longitude]} />
                )}
            </MapContainer>
            
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[400] bg-white px-4 py-1 rounded-full shadow text-xs font-bold text-slate-700 pointer-events-none border border-slate-200">
                Click map to set location
            </div>
        </div>
    );
};

export default FixedLocationPicker;
