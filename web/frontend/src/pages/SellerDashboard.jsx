import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Package, CheckCircle, Truck, AlertCircle, ShoppingBag, Plus, Trash2, Edit, MapPin, LayoutDashboard, LogOut, X } from 'lucide-react';
import io from 'socket.io-client';

import FixedLocationPicker from '../components/FixedLocationPicker';

const SellerDashboard = () => {
    const { user, logout } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Product Management State
    const [products, setProducts] = useState([]);
    const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'products'
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: '', base_description: '', price: '', stock_quantity: '' });
    const [productLoading, setProductLoading] = useState(false);

    const API_URL = 'http://localhost:5000/api';

    useEffect(() => {
        fetchOrders();
        fetchProducts();
        
        const socket = io('http://localhost:5000');
        socket.on('order_approved_for_seller', (newOrder) => {
             // Add new order or update existing
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
            const res = await axios.get(`${API_URL}/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching orders:", error);
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/products/seller`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProducts(res.data);
        } catch (error) {
            console.error("Error fetching products:", error);
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        setProductLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/products`, newProduct, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProducts([...products, res.data]);
            setShowAddProduct(false);
            setNewProduct({ name: '', base_description: '', price: '', stock_quantity: '' });
            alert("Product added successfully!");
        } catch (error) {
            console.error("Error adding product:", error);
            alert("Failed to add product");
        } finally {
            setProductLoading(false);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/products/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProducts(products.filter(p => p._id !== id));
        } catch (error) {
            console.error("Error deleting product:", error);
            alert("Failed to delete product");
        }
    };

    const updateStatus = async (orderId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/orders/${orderId}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update local state
            setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status");
        }
    };



// ... inside component
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [mapLocation, setMapLocation] = useState(null);

    const updateLocation = async () => {
        if (!mapLocation) return;

        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/users/location`, {
                latitude: mapLocation.latitude,
                longitude: mapLocation.longitude,
                isAvailable: true 
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert("Shop location saved successfully!");
            setLocationModalOpen(false);
        } catch (error) {
            console.error("Location update failed:", error);
            alert("Failed to update location.");
        }
    };

    const approvedOrders = orders.filter(o => o.status === 'APPROVED_FOR_SELLER');
    const packedOrders = orders.filter(o => o.status === 'PACKED');
    const readyOrders = orders.filter(o => o.status === 'READY_FOR_PICKUP');

    return (
        <div className="min-h-screen flex font-sans bg-gray-50 text-slate-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 hidden md:flex flex-col fixed h-full z-10">
                <div className="p-6 border-b border-gray-100 flex items-center gap-2">
                    <ShoppingBag className="text-indigo-600" />
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight">Seller Central</h1>
                </div>
                <nav className="p-4 space-y-1 flex-1">
                    <button 
                        onClick={() => setActiveTab('orders')}
                        className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'orders' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-gray-50'}`}>
                        <LayoutDashboard size={18} /> Orders
                    </button>
                    <button 
                        onClick={() => setActiveTab('products')}
                        className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'products' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-gray-50'}`}>
                        <Package size={18} /> Inventory
                    </button>
                </nav>
                <div className="p-4 border-t border-gray-100">
                     <button onClick={logout} className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors mb-2 flex items-center gap-2">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-8">
                <header className="flex justify-between items-center mb-8">
                    <div>
                         <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
                         <p className="text-slate-500 text-sm mt-1">Manage your orders and inventory</p>
                    </div>
                   
                    <div className="flex items-center gap-4">
                        {/* Location Indicator */}
                        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3">
                             <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                             <div>
                                 <p className="text-xs font-bold text-slate-700 uppercase">Shop Location</p>
                                 <button onClick={() => setLocationModalOpen(true)} className="text-xs text-indigo-600 font-semibold hover:underline">Update on Map</button>
                             </div>
                        </div>

                        {activeTab === 'products' && (
                            <button 
                                onClick={() => setShowAddProduct(true)}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Plus size={18} /> Add Product
                            </button>
                        )}
                    </div>
                </header>

                {activeTab === 'orders' ? (
                    loading ? (
                        <div className="flex items-center justify-center h-64 text-slate-500">
                             <span className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mr-3"></span> Loading orders...
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            {/* APPROVED ORDERS SECTION */}
                            <section className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-slate-800">Pending Action <span className="text-slate-400 font-normal">({approvedOrders.length})</span></h3>
                                </div>
                                {approvedOrders.map(order => (
                                    <OrderCard 
                                        key={order._id} 
                                        order={order} 
                                        actionLabel="Pack Order"
                                        onAction={() => updateStatus(order._id, 'PACKED')}
                                        variant="blue"
                                    />
                                ))}
                                {approvedOrders.length === 0 && <EmptyState message="No pending orders" />}
                            </section>

                            {/* PACKED ORDERS SECTION */}
                            <section className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-slate-800">Packed & Ready <span className="text-slate-400 font-normal">({packedOrders.length})</span></h3>
                                </div>
                                {packedOrders.map(order => (
                                    <OrderCard 
                                        key={order._id} 
                                        order={order} 
                                        actionLabel="Mark Ready for Pickup"
                                        onAction={() => updateStatus(order._id, 'READY_FOR_PICKUP')}
                                        variant="yellow"
                                    />
                                ))}
                                {packedOrders.length === 0 && <EmptyState message="No packed orders" />}
                            </section>

                             {/* READY ORDERS SECTION */}
                             <section className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-slate-800">Awaiting Pickup <span className="text-slate-400 font-normal">({readyOrders.length})</span></h3>
                                </div>
                                {readyOrders.map(order => (
                                    <OrderCard 
                                        key={order._id} 
                                        order={order} 
                                        completed={true}
                                        variant="green"
                                    />
                                ))}
                                {readyOrders.length === 0 && <EmptyState message="No orders awaiting pickup" />}
                            </section>
                        </div>
                    )
                ) : (
                    /* PRODUCT MANAGEMENT TAB */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {products.length === 0 && (
                            <div className="col-span-full card-base p-12 text-center border-dashed border-gray-300">
                                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-slate-900">No products yet</h3>
                                <p className="text-slate-500 mb-6">Add your first product to start selling.</p>
                                <button onClick={() => setShowAddProduct(true)} className="btn-primary">Add Product</button>
                            </div>
                        )}
                        {products.map(product => (
                            <div key={product._id} className="card-base p-5 flex flex-col group">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-bold text-slate-900 text-lg line-clamp-1">{product.name}</h3>
                                    <button 
                                        onClick={() => handleDeleteProduct(product._id)}
                                        className="text-gray-400 hover:text-red-600 transition-colors p-1 -mr-2">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <p className="text-sm text-slate-500 line-clamp-3 mb-6 h-12 leading-relaxed">{product.base_description}</p>
                                <div className="mt-auto flex justify-between items-center pt-4 border-t border-gray-100">
                                    <span className="font-bold text-slate-900 text-lg">${product.price}</span>
                                    <span className="text-xs font-semibold bg-gray-100 text-slate-600 px-2.5 py-1 rounded">Qty: {product.stock_quantity}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* ADD PRODUCT MODAL */}
            {showAddProduct && (
                 <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                 <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
                     <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                        <h3 className="text-xl font-bold text-slate-900">Add New Product</h3>
                        <button onClick={() => setShowAddProduct(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                     </div>
                     
                     <form onSubmit={handleAddProduct} className="space-y-5">
                         <div>
                             <label className="block text-sm font-bold text-slate-700 mb-1.5">Product Name</label>
                             <input 
                                 type="text" 
                                 required
                                 className="input-field"
                                 placeholder="e.g. Wireless Headphones"
                                 value={newProduct.name}
                                 onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                             />
                         </div>
                         <div>
                             <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
                             <textarea 
                                 required
                                 rows="3"
                                 className="input-field resize-none"
                                 placeholder="Enter product description..."
                                 value={newProduct.base_description}
                                 onChange={e => setNewProduct({...newProduct, base_description: e.target.value})}
                             />
                         </div>
                         <div className="grid grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Price ($)</label>
                                <input 
                                    type="number" 
                                    required
                                    min="0"
                                    className="input-field"
                                    value={newProduct.price}
                                    onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Stock Quantity</label>
                                <input 
                                    type="number" 
                                    required
                                    min="0"
                                    className="input-field"
                                    value={newProduct.stock_quantity}
                                    onChange={e => setNewProduct({...newProduct, stock_quantity: e.target.value})}
                                />
                            </div>
                         </div>

                         <div className="flex gap-3 mt-8 pt-2">
                             <button 
                                 type="button" 
                                 onClick={() => setShowAddProduct(false)}
                                 className="btn-secondary flex-1"
                             >
                                 Cancel
                             </button>
                             <button 
                                 type="submit" 
                                 disabled={productLoading}
                                 className="btn-primary flex-1"
                             >
                                 {productLoading ? 'Adding...' : 'Add Product'}
                             </button>
                         </div>
                     </form>
                 </div>
             </div>
            )}

            {/* LOCATION MODAL */}
            {locationModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                            <h3 className="text-xl font-bold text-slate-900">Set Shop Location</h3>
                            <button onClick={() => setLocationModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg flex items-start gap-2">
                                <MapPin size={16} className="shrink-0 mt-0.5" />
                                <p>Tap on the map to pin your shop location.</p>
                            </div>

                            <FixedLocationPicker 
                                onLocationSelect={setMapLocation}
                                initialLocation={mapLocation}
                                height="300px"
                            />

                            <button 
                                onClick={updateLocation}
                                disabled={!mapLocation}
                                className="w-full btn-primary mt-4"
                            >
                                Confirm Location
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

const OrderCard = ({ order, actionLabel, onAction, variant, completed }) => {
    return (
        <div className="card-base p-5 border-l-4 border-l-indigo-500">
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-slate-900 text-md">{order.product_name}</h4>
                <span className="text-xs font-semibold bg-gray-100 text-slate-600 px-2 py-0.5 rounded">Qty: {order.quantity}</span>
            </div>
            
            {order.customer_location?.city && (
                 <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-4">
                    <MapPin size={12} /> {order.customer_location.city}
                    <span className="text-gray-300">•</span>
                    <span className="font-mono text-gray-400">#{order._id.slice(-6).toUpperCase()}</span>
                </div>
            )}


            <div className="mb-4">
                 {order.assigned_to ? (
                    <div className="text-xs text-indigo-600 bg-indigo-50 p-2 rounded border border-indigo-100 flex items-center gap-2">
                        <Truck size={14} /> 
                        <span>Agent: <strong>{order.assigned_to.name}</strong></span>
                    </div>
                ) : (
                    <div className="text-xs text-slate-500 bg-gray-50 p-2 rounded border border-gray-100 flex items-center gap-2">
                         <Truck size={14} className="text-slate-400" />
                         <span className="italic">Waiting for Assignment</span>
                    </div>
                )}
            </div>
            
            {!completed ? (
                <button 
                    onClick={onAction}
                    className={`w-full py-2 rounded-lg font-semibold text-xs uppercase tracking-wide transition-all active:scale-95 border ${
                        variant === 'blue' ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100' :
                        variant === 'yellow' ? 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100' :
                        'bg-gray-100 text-gray-700 border-gray-200'
                    }`}
                >
                    {actionLabel}
                </button>
            ) : (
                 <div className="w-full text-center text-green-600 bg-green-50 py-2 rounded-lg font-bold text-xs border border-green-100 uppercase tracking-wide flex items-center justify-center gap-2">
                    <CheckCircle size={14} /> Ready for Pickup
                 </div>
            )}
        </div>
    );
};

const EmptyState = ({ message }) => (
    <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
        <p className="text-sm text-slate-400 font-medium">{message}</p>
    </div>
);

export default SellerDashboard;
