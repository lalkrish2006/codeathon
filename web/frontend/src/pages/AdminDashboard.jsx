import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Shield, AlertTriangle, Check, X, Clock, Zap } from 'lucide-react';
import clsx from 'clsx'; 

const socket = io('http://localhost:5000'); // Connect to backend

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  
  // Real-time listener
  useEffect(() => {
    fetchOrders();

    socket.on('new_order', (order) => {
      setOrders(prev => [order, ...prev]);
    });
    
    socket.on('order_updated', (updatedOrder) => {
        setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
    });

    return () => {
      socket.off('new_order');
      socket.off('order_updated');
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/orders');
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    }
  };

  const handleApproval = async (id, approved, waiveFee = false) => {
      try {
          await axios.patch(`http://localhost:5000/api/orders/${id}/approve`, {
              approved,
              waive_fee: waiveFee,
              reasoning: approved ? "Manual Approval by Admin" : "Manual Rejection by Admin"
          });
      } catch (err) {
          alert('Action failed: ' + err.message);
      }
  }

  const [selectedOrder, setSelectedOrder] = useState(null);

  // Helper to format location
  const formatLoc = (usr) => {
      if (usr?.live_location && usr.live_location.latitude) {
          return `Live: ${usr.live_location.latitude.toFixed(4)}, ${usr.live_location.longitude.toFixed(4)}`;
      }
      if (usr?.location?.coordinates) {
          return `Static: ${usr.location.coordinates[1].toFixed(4)}, ${usr.location.coordinates[0].toFixed(4)}`;
      }
      return "Unknown";
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
       {/* Top Bar */}
       <header className="bg-slate-900 text-white shadow-lg z-10">
         <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
                <Shield className="h-8 w-8 text-emerald-400" />
                <h1 className="text-2xl font-bold tracking-tight">RapidPost <span className="text-emerald-400">AI Control Center</span></h1>
            </div>
            <div className="flex items-center space-x-4">
                <span className="bg-slate-800 px-3 py-1 rounded text-sm text-slate-300">Admin Mode</span>
                <button onClick={logout} className="text-sm font-medium hover:text-white text-slate-400">Logout</button>
            </div>
         </div>
       </header>

       {/* Main Content */}
       <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
           
           {/* Stats Row */}
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
               <StatCard label="Pending Review" value={orders.filter(o => o.requires_human_approval && !o.human_approved && o.status === 'HUMAN_APPROVAL_REQUIRED').length} color="bg-orange-500" icon={<AlertTriangle className="text-white" />} />
               <StatCard label="High Priority (1-3)" value={orders.filter(o => o.ai_priority <= 3).length} color="bg-red-500" icon={<Zap className="text-white" />} />
               <StatCard label="Avg Confidence" value={`${(orders.reduce((acc, o) => acc + (o.confidence_score||0), 0) / (orders.length||1) * 100).toFixed(0)}%`} color="bg-blue-500" icon={<Shield className="text-white" />} />
               <StatCard label="Total Orders" value={orders.length} color="bg-slate-600" icon={<Clock className="text-white" />} />
           </div>

           {/* Orders Table */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                   <h2 className="text-lg font-semibold text-gray-800">Incoming Deliveries Live Feed</h2>
                   <div className="flex space-x-2 text-xs text-gray-500">
                       <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>Connected</span>
                   </div>
               </div>
               
               <div className="overflow-x-auto">
                   <table className="min-w-full divide-y divide-gray-200">
                       <thead className="bg-gray-50">
                           <tr>
                               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Details</th>
                               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocation</th>
                               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                               <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                           </tr>
                       </thead>
                       <tbody className="bg-white divide-y divide-gray-200">
                           {orders.map((order) => (
                                   <tr key={order._id} className={clsx("hover:bg-gray-50 transition-colors", order.requires_human_approval && order.status === 'HUMAN_APPROVAL_REQUIRED' ? "bg-red-50" : "")}>
                                   <td className="px-6 py-4 whitespace-nowrap">
                                       <div className="flex items-center">
                                           <div className={clsx(
                                               "flex items-center justify-center w-8 h-8 rounded-full font-bold text-white",
                                               order.ai_priority <= 2 ? "bg-red-600 animate-pulse" :
                                               order.ai_priority <= 5 ? "bg-orange-500" :
                                               "bg-blue-500"
                                           )}>
                                               {order.ai_priority}
                                           </div>
                                       </div>
                                   </td>
                                   <td className="px-6 py-4">
                                       <div className="text-sm font-medium text-gray-900">{order.product_name} (x{order.quantity})</div>
                                       <div className="text-xs text-gray-500">Cust: {order.user?.name || 'Unknown'}</div>
                                       {order.customer_location?.city && (
                                            <div className="text-xs text-blue-600">
                                                Loc: {order.customer_location.city}, {order.customer_location.state}
                                            </div>
                                       )}
                                   </td>
                                   <td className="px-6 py-4">
                                        <div className="text-xs">
                                            <p><span className="font-semibold">Seller:</span> {order.seller?.name || "Pending"}</p>
                                            <p><span className="font-semibold">Agent:</span> {order.assigned_to?.name || "Unassigned"}</p>
                                        </div>
                                   </td>
                                   <td className="px-6 py-4 whitespace-nowrap">
                                       <span className={clsx(
                                           "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                                           (order.status === 'APPROVED_FOR_SELLER' || order.status === 'HUMAN_APPROVED') ? "bg-green-100 text-green-800" :
                                           order.status === 'REJECTED' ? "bg-red-100 text-red-800" :
                                           order.status === 'HUMAN_APPROVAL_REQUIRED' ? "bg-yellow-100 text-yellow-800" :
                                           "bg-gray-100 text-gray-800"
                                       )}>
                                           {order.status}
                                       </span>
                                   </td>
                                   <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                       <button 
                                            onClick={() => setSelectedOrder(order)}
                                            className="text-blue-600 hover:text-blue-900 mr-3 text-xs border border-blue-200 px-2 py-1 rounded bg-white">
                                            View Details
                                       </button>
                                       
                                       {order.requires_human_approval && order.status === 'HUMAN_APPROVAL_REQUIRED' && (
                                           <div className="flex flex-col space-y-1 items-end">
                                               {order.priority_fee > 0 && (
                                                   <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded">
                                                       Fee: ${order.priority_fee}
                                                   </span>
                                               )}
                                               <div className="inline-flex space-x-2">
                                                   <button onClick={() => handleApproval(order._id, true, false)} className="text-green-600 hover:text-green-900 p-1 border border-green-200 rounded hover:bg-green-50" title="Approve">
                                                       <Check size={18} />
                                                   </button>
                                                   <button onClick={() => handleApproval(order._id, true, true)} className="text-blue-600 hover:text-blue-900 p-1 border border-blue-200 rounded hover:bg-blue-50" title="Approve & Waive Fee">
                                                       <span className="font-bold text-xs">$0</span>
                                                   </button>
                                                    <button onClick={() => handleApproval(order._id, false)} className="text-red-600 hover:text-red-900 p-1 border border-red-200 rounded hover:bg-red-50" title="Reject">
                                                       <X size={18} />
                                                   </button>
                                               </div>
                                           </div>
                                       )}
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
           </div>

           {/* DETAIL MODAL */}
           {selectedOrder && (
               <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                   <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 animate-in fade-in zoom-in duration-200">
                       <div className="flex justify-between items-start mb-6">
                           <h3 className="text-xl font-bold text-gray-800">Order Details</h3>
                           <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                               <X size={24} />
                           </button>
                       </div>

                       <div className="grid grid-cols-2 gap-6 mb-6">
                           <div className="bg-gray-50 p-4 rounded-lg">
                               <h4 className="font-bold text-sm text-gray-500 uppercase mb-2">Customer Context</h4>
                               <p className="font-medium text-lg text-gray-900">{selectedOrder.user?.name}</p>
                               <p className="text-sm text-gray-600 mb-2">{selectedOrder.user?.email}</p>
                               <div className="text-sm bg-white p-2 rounded border border-gray-200 h-24 overflow-y-auto">
                                   <span className="font-semibold text-xs text-gray-400 block">DESCRIPTION:</span>
                                   {selectedOrder.description}
                               </div>
                               <div className="mt-2 text-xs text-blue-800 bg-blue-50 p-2 rounded">
                                   <p>Location: {formatLoc(selectedOrder.user)}</p>
                                   <p>City: {selectedOrder.customer_location?.city || 'N/A'}</p>
                               </div>
                           </div>

                           <div className="bg-gray-50 p-4 rounded-lg">
                               <h4 className="font-bold text-sm text-gray-500 uppercase mb-2">Supply Chain</h4>
                               
                               <div className="mb-4">
                                   <p className="font-semibold text-xs text-gray-400">SELLER</p>
                                   <p className="text-sm font-bold">{selectedOrder.seller?.name || "Pending Allocation"}</p>
                                   <p className="text-xs text-gray-500">{formatLoc(selectedOrder.seller)}</p>
                               </div>
                               
                               <div>
                                   <p className="font-semibold text-xs text-gray-400">DELIVERY AGENT</p>
                                   {selectedOrder.assigned_to ? (
                                       <>
                                         <p className="text-sm font-bold text-emerald-700">{selectedOrder.assigned_to.name}</p>
                                         <p className="text-xs text-gray-500">{formatLoc(selectedOrder.assigned_to)}</p>
                                         <p className="text-[10px] uppercase bg-green-200 text-green-800 px-1 rounded inline-block mt-1">
                                            {selectedOrder.delivery_type?.replace(/_/g, ' ') || 'Assigned'}
                                         </p>
                                       </>
                                   ) : (
                                       <p className="text-sm text-gray-400 italic">Waiting for assignment...</p>
                                   )}
                               </div>
                           </div>
                       </div>

                       <div className="border-t pt-4">
                           <h4 className="font-bold text-sm text-gray-500 uppercase mb-2">Decision Logic</h4>
                           <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded border border-yellow-100">
                               {selectedOrder.decision_explanation}
                           </p>
                           <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                <span>Priority: {selectedOrder.ai_priority}</span>
                                <span>Confidence: {(selectedOrder.confidence_score*100).toFixed(0)}%</span>
                                <span>Source: {selectedOrder.decision_source}</span>
                           </div>
                           {selectedOrder.priority_fee > 0 && (
                               <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 flex justify-between">
                                   <span>Priority Fee Applied:</span>
                                   <span className="font-bold">${selectedOrder.priority_fee}</span>
                               </div>
                           )}
                           {selectedOrder.total_amount > 0 && selectedOrder.priority_fee > 0 && (
                               <div className="mt-1 flex justify-end text-xs text-gray-500">
                                   Total: ${selectedOrder.total_amount}
                               </div>
                           )}
                       </div>
                   </div>
               </div>
           )}

       </main>
    </div>
  );
};

const StatCard = ({ label, value, color, icon }) => (
    <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 flex items-center mb-0">
        <div className={`${color} p-3 rounded-full mr-4 shadow-md`}>
            {icon}
        </div>
        <div>
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
    </div>
);

export default AdminDashboard;
