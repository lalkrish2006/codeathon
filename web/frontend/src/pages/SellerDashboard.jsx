import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Package, CheckCircle, Truck, AlertCircle, ShoppingBag, Plus, Trash2, Edit } from 'lucide-react';
import io from 'socket.io-client';

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

    const approvedOrders = orders.filter(o => o.status === 'APPROVED_FOR_SELLER');
    const packedOrders = orders.filter(o => o.status === 'PACKED');
    const readyOrders = orders.filter(o => o.status === 'READY_FOR_PICKUP');

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-md flex-shrink-0 hidden md:block">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold text-gray-800">Seller Hub</h1>
                    <p className="text-sm text-gray-500">Ethics-First Delivery</p>
                </div>
                <nav className="p-4 space-y-2">
                    <button 
                        onClick={() => setActiveTab('orders')}
                        className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 ${activeTab === 'orders' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <Package size={18} /> Orders
                    </button>
                    <button 
                        onClick={() => setActiveTab('products')}
                        className={`w-full text-left px-4 py-2 rounded flex items-center gap-2 ${activeTab === 'products' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <ShoppingBag size={18} /> My Products
                    </button>
                    <div className="pt-4 border-t mt-4">
                        <button onClick={logout} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded">
                            Logout
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            {activeTab === 'orders' ? 'Manage Orders' : 'Product Inventory'}
                        </h2>
                        <p className="text-gray-600">Welcome back, {user?.name}</p>
                    </div>
                    {activeTab === 'products' && (
                        <button 
                            onClick={() => setShowAddProduct(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm font-medium">
                            <Plus size={18} /> Add Product
                        </button>
                    )}
                </header>

                {activeTab === 'orders' ? (
                    loading ? <p>Loading orders...</p> : (
                        <div className="space-y-8">
                            {/* APPROVED ORDERS SECTION */}
                            <section>
                                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <AlertCircle className="text-blue-600" /> 
                                    Awaiting Packing ({approvedOrders.length})
                                </h3>
                                {approvedOrders.length === 0 ? (
                                    <p className="text-gray-400 italic">No approved orders yet.</p>
                                ) : (
                                    <div className="grid gap-4">
                                        {approvedOrders.map(order => (
                                            <OrderCard 
                                                key={order._id} 
                                                order={order} 
                                                actionLabel="Mark as Packed"
                                                onAction={() => updateStatus(order._id, 'PACKED')}
                                                variant="blue"
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* PACKED ORDERS SECTION */}
                            <section>
                                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <Package className="text-yellow-600" />
                                    Ready for Labeling ({packedOrders.length})
                                </h3>
                                {packedOrders.length === 0 ? (
                                    <p className="text-gray-400 italic">No packed orders.</p>
                                ) : (
                                    <div className="grid gap-4">
                                        {packedOrders.map(order => (
                                            <OrderCard 
                                                key={order._id} 
                                                order={order} 
                                                actionLabel="Mark Ready for Pickup"
                                                onAction={() => updateStatus(order._id, 'READY_FOR_PICKUP')}
                                                variant="yellow"
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>

                             {/* READY ORDERS SECTION */}
                             <section>
                                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <CheckCircle className="text-green-600" />
                                    Ready for Pickup ({readyOrders.length})
                                </h3>
                                {readyOrders.length === 0 ? (
                                    <p className="text-gray-400 italic">No orders waiting for pickup.</p>
                                ) : (
                                    <div className="grid gap-4">
                                        {readyOrders.map(order => (
                                            <OrderCard 
                                                key={order._id} 
                                                order={order} 
                                                completed={true}
                                                variant="green"
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    )
                ) : (
                    /* PRODUCT MANAGEMENT TAB */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-400">
                                <Package size={48} className="mx-auto mb-4 opacity-50" />
                                <p>You haven't added any products yet.</p>
                            </div>
                        )}
                        {products.map(product => (
                            <div key={product._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-gray-800">{product.name}</h3>
                                    <button 
                                        onClick={() => handleDeleteProduct(product._id)}
                                        className="text-gray-400 hover:text-red-500 p-1">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500 line-clamp-3 mb-4 h-16">{product.base_description}</p>
                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                    <span className="font-bold text-green-700">${product.price}</span>
                                    <span className="text-xs text-gray-500">Stock: {product.stock_quantity}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* ADD PRODUCT MODAL */}
            {showAddProduct && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                 <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
                     <h3 className="text-xl font-bold mb-4">Add New Product</h3>
                     
                     <form onSubmit={handleAddProduct} className="space-y-4">
                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                             <input 
                                 type="text" 
                                 required
                                 className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                 value={newProduct.name}
                                 onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                             />
                         </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Base Description (AI Ground Truth)</label>
                             <textarea 
                                 required
                                 rows="4"
                                 className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                 placeholder="Accurate technical description of the product..."
                                 value={newProduct.base_description}
                                 onChange={e => setNewProduct({...newProduct, base_description: e.target.value})}
                             />
                             <p className="text-xs text-gray-400 mt-1">This description will be combined with customer context for AI analysis.</p>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                                <input 
                                    type="number" 
                                    required
                                    min="0"
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newProduct.price}
                                    onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                                <input 
                                    type="number" 
                                    required
                                    min="0"
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newProduct.stock_quantity}
                                    onChange={e => setNewProduct({...newProduct, stock_quantity: e.target.value})}
                                />
                            </div>
                         </div>

                         <div className="flex gap-3 mt-6">
                             <button 
                                 type="button" 
                                 onClick={() => setShowAddProduct(false)}
                                 className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 font-medium"
                             >
                                 Cancel
                             </button>
                             <button 
                                 type="submit" 
                                 disabled={productLoading}
                                 className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                             >
                                 {productLoading ? 'Adding...' : 'Add Product'}
                             </button>
                         </div>
                     </form>
                 </div>
             </div>
            )}

        </div>
    );
};

const OrderCard = ({ order, actionLabel, onAction, variant, completed }) => {
    const priorityColor = order.ai_priority === 1 ? 'text-red-600 bg-red-100' : 
                          order.ai_priority === 2 ? 'text-orange-600 bg-orange-100' : 'text-green-600 bg-green-100';

    return (
        <div className={`bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex justify-between items-start`}>
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-gray-800 text-lg">{order.product_name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${priorityColor}`}>
                        Priority {order.ai_priority}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700">
                        {order.status.replace(/_/g, ' ')}
                    </span>
                </div>
                <p className="text-gray-600 mb-2">Qty: {order.quantity}</p>
                <div className="text-xs text-gray-400 mt-2 p-2 bg-gray-50 rounded">
                    <p className="font-semibold text-gray-600">Ethics Engine Decision:</p>
                    <p>{order.decision_explanation}</p>
                    <p className="mt-1 text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle size={12} /> Approved by AI & Human Oversight
                    </p>
                </div>
            </div>
            
            {!completed && (
                <button 
                    onClick={onAction}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        variant === 'blue' ? 'bg-blue-600 text-white hover:bg-blue-700' : 
                        variant === 'yellow' ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-200'
                    }`}
                >
                    {actionLabel}
                </button>
            )}
            {completed && (
                 <div className="text-gray-400 flex items-center gap-1">
                    <Truck size={16} /> Ready for Agent
                 </div>
            )}
        </div>
    );
};

export default SellerDashboard;
