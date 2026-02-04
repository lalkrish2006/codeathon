import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, MapPin, Navigation, X, Filter, Activity, ArrowRight, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import MapLocationPicker from '../components/MapLocationPicker';

const CustomerDashboard = () => {
    const { user, logout } = useAuth();
    const [products, setProducts] = useState([]);
    
    // Purchase Modal State
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [context, setContext] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Location State
    const [locationMode, setLocationMode] = useState('map');
    const [addressText, setAddressText] = useState("");
    const [mapLocation, setMapLocation] = useState(null);

    const API_URL = 'http://localhost:5000/api';

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await axios.get(`${API_URL}/products`);
            setProducts(res.data);
        } catch (err) {
            console.error("Failed to fetch products", err);
        }
    };

    const handleBuyClick = (product) => {
        setSelectedProduct(product);
        setContext("");
        setQuantity(1);
        setModalOpen(true);
        setLocationMode('map');
        setAddressText("");
        setMapLocation(null);
    };

    const getGeoLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("Geolocation is not supported by your browser"));
            } else {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            source: "gps"
                        });
                    },
                    (error) => {
                        reject(error);
                    }
                );
            }
        });
    };

    const geocodeAddress = async (address) => {
        try {
            const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
                params: {
                    q: address,
                    format: 'json',
                    limit: 1
                }
            });

            if (response.data && response.data.length > 0) {
                const { lat, lon, display_name } = response.data[0];
                return {
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lon),
                    accuracy: 0,
                    source: "manual",
                    address: display_name
                };
            } else {
                throw new Error("Address not found");
            }
        } catch (error) {
            console.error("Geocoding failed:", error);
            throw new Error("Unable to locate this address. Please try a valid address or use GPS.");
        }
    };

    const handleSubmitOrder = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let locationData = null;
            try {
                if (locationMode === 'map') {
                     if (!mapLocation) throw new Error("Please select a delivery location on the map.");
                     locationData = {
                         latitude: mapLocation.lat,
                         longitude: mapLocation.lng,
                         accuracy: 10,
                         source: "map_picker",
                         message: "Map Selected"
                     };
                } else {
                    if (!addressText.trim()) throw new Error("Please enter a delivery address.");
                    locationData = await geocodeAddress(addressText);
                }
            } catch (locErr) {
                alert(locErr.message || "Location access is required for delivery.");
                setLoading(false);
                return;
            }

            const token = localStorage.getItem('token');
            const payload = {
                product_id: selectedProduct._id,
                quantity: parseInt(quantity),
                customer_context: context,
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                customer_location: {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    accuracy: locationData.accuracy,
                    source: locationData.source,
                    address: locationMode === 'manual' ? addressText : "GPS Location"
                }
            };

            await axios.post(`${API_URL}/orders`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setModalOpen(false);
            // Optionally redirect to My Orders
            if (window.confirm("Order placed successfully! view status in 'My Orders'?")) {
                 window.location.href = '/customer/orders';
            }
        } catch (err) {
            console.error(err);
            alert("Failed to place order.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans text-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-600 p-2 rounded-lg text-white">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">ShopEthics</h1>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <Link to="/customer/orders" className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2">
                            <Activity size={16} /> My Active Orders
                        </Link>
                        
                        <div className="hidden md:flex flex-col items-end border-l border-gray-100 pl-6">
                            <span className="text-xs text-slate-500">Hello,</span>
                            <span className="text-sm font-bold text-slate-900 leading-none">{user?.name}</span>
                        </div>
                        <button onClick={logout} className="text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
                
                {/* PRODUCTS SECTION */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                             <h2 className="text-2xl font-bold text-slate-900">Featured Products</h2>
                             <p className="text-slate-500">Ethically sourced, instantly delivered.</p>
                        </div>
                        <button className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
                            <Filter className="w-4 h-4" /> Filter
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {products.map(product => (
                            <div key={product._id} className="card-base group flex flex-col h-full hover:shadow-xl transition-all duration-300">
                                <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center relative overflow-hidden">
                                    <ShoppingBag className="w-12 h-12 text-gray-300 group-hover:scale-110 transition-transform duration-300" />
                                    <div className="absolute top-3 left-3">
                                        <span className="bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded text-slate-700 shadow-sm">
                                            {product.category || 'General'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="p-5 flex flex-col flex-1">
                                    <h3 className="font-bold text-slate-900 text-lg mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                        {product.name}
                                    </h3>
                                    <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">
                                        {product.base_description}
                                    </p>
                                    
                                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium">Price</p>
                                            <p className="text-xl font-bold text-slate-900">${product.price}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleBuyClick(product)}
                                            className="btn-primary flex items-center gap-1 group/btn"
                                        >
                                            Buy Now <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* PURCHASE MODAL - Clean & Functional */}
            {modalOpen && selectedProduct && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
                            <h3 className="text-lg font-bold text-slate-900">Checkout</h3>
                            <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleSubmitOrder} className="space-y-6">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex gap-4">
                                    <div className="w-16 h-16 bg-white rounded-lg border border-gray-200 flex items-center justify-center shrink-0">
                                        <ShoppingBag className="w-6 h-6 text-indigo-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-slate-900">{selectedProduct.name}</h4>
                                        <div className="flex justify-between items-center mt-2">
                                            <div className="flex items-center gap-2">
                                                 <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-6 h-6 bg-white border rounded hover:bg-gray-50">-</button>
                                                 <span className="text-sm font-bold">{quantity}</span>
                                                 <button type="button" onClick={() => setQuantity(quantity + 1)} className="w-6 h-6 bg-white border rounded hover:bg-gray-50">+</button>
                                            </div>
                                            <p className="text-lg font-bold text-indigo-600">${(selectedProduct.price * quantity).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-3">Delivery Address</label>
                                    <div className="flex gap-2 mb-4">
                                        <button
                                            type="button"
                                            onClick={() => setLocationMode('map')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${
                                                locationMode === 'map' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white text-slate-600 border-gray-200'
                                            }`}
                                        >
                                            <MapPin size={16} /> Pick on Map
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setLocationMode('manual')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${
                                                locationMode === 'manual' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white text-slate-600 border-gray-200'
                                            }`}
                                        >
                                            <Edit size={16} /> Enter Address
                                        </button>
                                    </div>

                                    {locationMode === 'manual' && (
                                        <textarea
                                            placeholder="Enter full address..."
                                            value={addressText}
                                            onChange={e => setAddressText(e.target.value)}
                                            className="input-field h-20 resize-none"
                                            required={locationMode === 'manual'}
                                        />
                                    )}

                                    {locationMode === 'map' && (
                                         <div className="space-y-2">
                                            <MapLocationPicker 
                                                onLocationSelect={(pos) => setMapLocation(pos)}
                                                height="300px"
                                            />
                                            {!mapLocation && <p className="text-xs text-red-500 font-bold">Please click on the map to select a location.</p>}
                                         </div>
                                    )}
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Delivery Instructions & Urgency</label>
                                    <textarea 
                                        className="input-field h-24 resize-none"
                                        placeholder="Note urgency or specific instructions..."
                                        value={context}
                                        onChange={e => setContext(e.target.value)}
                                        required
                                    />
                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4">
                            <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                            <button onClick={handleSubmitOrder} disabled={loading} className="btn-primary flex-1">
                                {loading ? 'Processing...' : 'Confirm Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerDashboard;
