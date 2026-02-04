import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ----------------------------------------------------------------------
// 1. FIX LEAFLET ICONS (MANDATORY)
// ----------------------------------------------------------------------
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// ----------------------------------------------------------------------
// 2. HELPER COMPONENTS
// ----------------------------------------------------------------------

// Handles Click Events: Captures Lat/Lng and notifies parent
const ClickHandler = ({ onMapClick, readOnly }) => {
    useMapEvents({
        click(e) {
            if (readOnly) return;
            // STRICT REQUIREMENT: Capture lat/lng immediately
            onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });
    return null;
};

// Handles View Updates: Pans map to new center if changed programmatically
const MapRecenter = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
};

// Fixes Modal Rendering: Invalidate size to ensure map renders correctly in hidden/modal containers
const MapResizer = () => {
    const map = useMap();
    useEffect(() => {
        if (map) {
            setTimeout(() => {
                map.invalidateSize();
            }, 200);
        }
    }, [map]);
    return null;
};

// ----------------------------------------------------------------------
// 3. MAIN COMPONENT
// ----------------------------------------------------------------------
const MapLocationPicker = ({ 
    onLocationSelect,      // Callback( { lat, lng } )
    initialLocation,       // { lat, lng } | null
    defaultCenter = { lat: 12.9716, lng: 77.5946 }, // Default: Bangalore
    readOnly = false,
    height = "400px"       // Fixed height
}) => {
    // Local state for immediate UI update
    const [selectedPos, setSelectedPos] = useState(initialLocation);

    // Sync with props
    useEffect(() => {
        if (initialLocation) {
            setSelectedPos(initialLocation);
        }
    }, [initialLocation]);

    const handleMapClick = (latlng) => {
        if (readOnly) return;
        
        // 1. Update Local State
        setSelectedPos(latlng);
        
        // 2. Notify Parent
        if (onLocationSelect) {
            onLocationSelect(latlng);
        }
    };

    // Determine center: Selected Position > Initial Location > Default Center
    const currentCenter = selectedPos || defaultCenter;

    return (
        <div className="w-full flex flex-col gap-3">
            <div 
                style={{ height: height, width: '100%' }} 
                className="relative rounded-lg overflow-hidden border-2 border-slate-200 shadow-sm"
            >
                <MapContainer 
                    center={currentCenter} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {/* Utilities */}
                    <MapResizer />
                    <ClickHandler onMapClick={handleMapClick} readOnly={readOnly} />
                    {selectedPos && <MapRecenter center={selectedPos} />}

                    {/* Marker */}
                    {selectedPos && (
                        <Marker position={selectedPos}>
                            <Popup>
                                <div className="text-center">
                                    <p className="font-bold text-slate-900 m-0">Selected Location</p>
                                    <p className="text-xs text-slate-500 m-0">
                                        {selectedPos.lat.toFixed(5)}, {selectedPos.lng.toFixed(5)}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>

                {/* Instruction Overlay */}
                {!readOnly && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
                        <div className="bg-white/90 backdrop-blur text-indigo-800 text-xs font-bold px-4 py-2 rounded-full shadow-md border border-indigo-100 flex items-center gap-2">
                            <span>📍 Click on map to pin location</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Coordinate Display */}
            {!readOnly && selectedPos && (
                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs font-mono text-slate-600 flex justify-between items-center">
                    <span>LAT: <strong className="text-slate-900">{selectedPos.lat.toFixed(6)}</strong></span>
                    <span>LNG: <strong className="text-slate-900">{selectedPos.lng.toFixed(6)}</strong></span>
                </div>
            )}
        </div>
    );
};

export default MapLocationPicker;
