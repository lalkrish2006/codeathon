import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Shield, AlertTriangle, Check, X, Clock, Zap, MapPin, Truck, ChevronDown, Activity, Users, Filter, ArrowRight } from 'lucide-react';
import clsx from 'clsx'; 
import MapLocationPicker from '../components/MapLocationPicker'; 

const socket = io('http://localhost:5000');

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const [orders, setOrders] = useState([]);
    const [agents, setAgents] = useState([]);
    const [overrideAgentId, setOverrideAgentId] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
  
  useEffect(() => {
    fetchOrders();
    fetchAgents();

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

  const fetchAgents = async () => {
      try {
          const res = await axios.get('http://localhost:5000/api/users?role=delivery_agent');
          setAgents(res.data);
      } catch (err) {
          console.error("Failed to fetch agents", err);
      }
  };

  const handleApproval = async (id, approved, waiveFee = false, overrideId = null) => {
      try {
          await axios.patch(`http://localhost:5000/api/orders/${id}/approve`, {
              approved,
              waive_fee: waiveFee,
              override_agent_id: overrideId,
              reasoning: approved 
                ? (overrideId ? "Manual Approval with Override" : "Manual Approval by Admin") 
                : "Manual Rejection by Admin"
          });
          if (selectedOrder && selectedOrder._id === id) {
              setSelectedOrder(null);
              setOverrideAgentId('');
          }
      } catch (err) {
          alert('Action failed: ' + err.message);
      }
  }

  const handleManualAssign = async (orderId, agentId) => {
      try {
          const res = await axios.patch(`http://localhost:5000/api/orders/${orderId}/assign`, {
              agent_id: agentId
          });
          
          const assignedAgent = agents.find(a => a._id === agentId);
          const agentName = assignedAgent ? assignedAgent.name : 'Unknown Agent';
          
          alert(`✅ Assignment Confirmed\n\nAgent: ${agentName}\nOrder ID: ${orderId}\nPriority Level: ${res.data.ai_priority}`);
          
          
          if (selectedOrder && selectedOrder._id === orderId) {
            setSelectedOrder(null);
            setOverrideAgentId('');
          }
      } catch (err) {
          alert('Assignment failed: ' + (err.response?.data?.message || err.message));
      }
  };

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
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
            {}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm h-16">
                <div className="max-w-[1600px] mx-auto px-6 h-full flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="bg-slate-900 p-2 rounded text-white">
                            <Shield className="h-5 w-5" />
                        </div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">RapidPost <span className="text-slate-500 font-medium">Control Panel</span></h1>
                    </div>
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                             <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                             <span>System Operational</span>
                        </div>
                        <div className="h-6 w-px bg-gray-200"></div>
                        <button onClick={logout} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Logout</button>
                    </div>
                </div>
            </header>

            {}
            <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-8">
                
                {}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <StatCard 
                        label="Pending Review" 
                        value={orders.filter(o => o.requires_human_approval && !o.human_approved && o.status === 'HUMAN_APPROVAL_REQUIRED').length} 
                        icon={<AlertTriangle className="text-amber-600 w-5 h-5" />}
                        bgColor="bg-amber-50"
                        textColor="text-amber-700"
                    />
                    <StatCard 
                        label="Critical Priority" 
                        value={orders.filter(o => o.ai_priority <= 2).length} 
                        icon={<Zap className="text-red-600 w-5 h-5" />}
                        bgColor="bg-red-50"
                        textColor="text-red-700"
                    />
                    <StatCard 
                        label="Active Agents" 
                        value={agents.length} 
                        icon={<Truck className="text-blue-600 w-5 h-5" />} 
                        bgColor="bg-blue-50"
                        textColor="text-blue-700"
                    />
                    <StatCard 
                        label="Total Orders" 
                        value={orders.length} 
                        icon={<Clock className="text-slate-600 w-5 h-5" />} 
                        bgColor="bg-slate-100"
                        textColor="text-slate-700"
                    />
                </div>

                {}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-280px)]">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Activity size={16} /> Live Authorization Feed
                        </h2>
                        <div className="flex space-x-2 text-xs">
                             <span className="px-3 py-1 bg-white border border-gray-200 rounded text-slate-600 font-medium">{orders.length} Records</span>
                        </div>
                    </div>
                    
                    <div className="overflow-auto flex-1">
                        <table className="min-w-full divide-y divide-gray-200 text-left">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase w-20">Priority</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Context</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">AI Analysis</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {orders.map((order) => (
                                    <tr key={order._id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4 align-top">
                                            <div className={clsx(
                                                "flex items-center justify-center w-8 h-8 rounded-lg font-bold text-white text-sm shadow-sm",
                                                order.ai_priority === 1 ? "bg-red-600" :
                                                order.ai_priority === 2 ? "bg-orange-500" :
                                                order.ai_priority <= 4 ? "bg-amber-400" :
                                                "bg-slate-400"
                                            )}>
                                                {order.ai_priority}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{order.product_name}</span>
                                                <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                    <Users size={12} /> {order.user?.name}
                                                </span>
                                                <span className="text-xs text-slate-400 font-mono mt-0.5">#{order._id.slice(-6).toUpperCase()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top max-w-sm">
                                             <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className={`h-full ${order.confidence_score > 0.8 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{width: `${(order.confidence_score || 0) * 100}%`}}></div>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600">{(order.confidence_score*100).toFixed(0)}%</span>
                                                </div>
                                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{order.decision_explanation}</p>
                                             </div>
                                        </td>
                                        <td className="px-6 py-4 align-top whitespace-nowrap">
                                            <span className={clsx(
                                                "px-2.5 py-1 inline-flex text-xs font-bold rounded-full border",
                                                (order.status === 'APPROVED_FOR_SELLER' || order.status === 'HUMAN_APPROVED') ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                order.status === 'REJECTED' ? "bg-red-50 text-red-700 border-red-200" :
                                                order.status === 'HUMAN_APPROVAL_REQUIRED' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                "bg-slate-100 text-slate-600 border-slate-200"
                                            )}>
                                                {order.status.replace(/_/g, " ")}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 align-top text-right">
                                            <button 
                                                onClick={() => { setSelectedOrder(order); setOverrideAgentId(''); }}
                                                className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded font-bold text-xs transition-colors border border-indigo-100">
                                                Inspect
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {}
                {selectedOrder && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            
                            {}
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        Order Inspection <span className="text-slate-400 font-mono text-sm">#{selectedOrder._id}</span>
                                    </h3>
                                </div>
                                <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-gray-200 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-white">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    
                                    {}
                                    <div className="space-y-6 lg:col-span-2">
                                        {}
                                        {selectedOrder.customer_context && (
                                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                                                <h4 className="text-xs font-bold text-red-700 uppercase mb-1 flex items-center gap-2">
                                                    <AlertTriangle size={14} /> Reported Emergency
                                                </h4>
                                                <p className="text-slate-800 font-medium italic">"{selectedOrder.customer_context}"</p>
                                            </div>
                                        )}

                                        {}
                                        <div className="card-base p-5 border border-gray-200 shadow-none">
                                            <h4 className="font-bold text-xs text-slate-500 uppercase mb-3 flex items-center gap-2">
                                                <Shield size={14} className="text-indigo-500" /> AI Ethics Decision
                                            </h4>
                                            <p className="text-sm text-slate-700 bg-gray-50 p-3 rounded border border-gray-100 mb-4 leading-relaxed">
                                                {selectedOrder.decision_explanation}
                                            </p>
                                            
                                            <div className="flex gap-8 border-t border-gray-100 pt-4">
                                                <div>
                                                    <span className="text-xs text-slate-500 font-medium block">Priority Level</span>
                                                    <span className={`text-xl font-bold ${selectedOrder.ai_priority <= 2 ? 'text-red-600' : 'text-slate-800'}`}>
                                                        {selectedOrder.ai_priority}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-slate-500 font-medium block">Confidence</span>
                                                    <span className="text-xl font-bold text-slate-800">{(selectedOrder.confidence_score * 100).toFixed(0)}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        {}
                                        <div className="card-base p-5 border border-gray-200 shadow-none">
                                             <h4 className="font-bold text-xs text-slate-500 uppercase mb-3">Customer Entity</h4>
                                             <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                                                    {selectedOrder.user?.name ? selectedOrder.user.name[0] : 'U'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{selectedOrder.user?.name}</p>
                                                    <p className="text-xs text-slate-500">{selectedOrder.user?.email}</p>
                                                </div>
                                             </div>
                                             <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 bg-gray-50 p-2 rounded">
                                                <MapPin size={14} /> {formatLoc(selectedOrder.user)}
                                             </div>
                                        </div>
                                    </div>

                                    {}
                                    <div className="space-y-4">
                                        <div className="card-base p-5 bg-gray-50 border border-gray-200 shadow-none">
                                            <h4 className="font-bold text-xs text-slate-500 uppercase mb-3">Logistics Status</h4>
                                            
                                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                                                <span className="text-sm text-slate-600">Assigned Agent</span>
                                                <span className={`text-sm font-bold ${selectedOrder.assigned_to ? 'text-indigo-700' : 'text-slate-400 italic'}`}>
                                                    {selectedOrder.assigned_to 
                                                        ? selectedOrder.assigned_to.name 
                                                        : (selectedOrder.ai_priority >= 5 
                                                            ? "Assignment not required at this stage" 
                                                            : "Waiting for Assignment")
                                                    }
                                                </span>
                                            </div>

                                            {(selectedOrder.system_recommended_agent || selectedOrder.ai_priority <= 4) && (
                                                <>
                                                    <h4 className="font-bold text-xs text-slate-500 uppercase mb-3">System Recommendation</h4>
                                                    {selectedOrder.system_recommended_agent ? (
                                                        <div className="flex items-center justify-between bg-white p-3 rounded border border-gray-200 mb-3">
                                                            <span className="text-sm font-bold text-slate-900">{agents.find(a => a._id === selectedOrder.system_recommended_agent)?.name || 'Unknown Agent'}</span>
                                                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">BEST FIT</span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-slate-500 italic mb-3">Analysis Pending...</div>
                                                    )}
                                                </>
                                            )}

                                            {}
                                            {selectedOrder.ai_priority > 2 && !selectedOrder.assigned_to && (
                                                 <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-4">
                                                     <h4 className="flex items-center gap-2 text-xs font-bold text-orange-800 uppercase mb-2">
                                                         <AlertTriangle size={14} /> Manual Assignment Required
                                                     </h4>
                                                     <p className="text-xs text-orange-700 mb-3 leading-tight">
                                                         Priority Level {selectedOrder.ai_priority} requires manual agent selection.
                                                     </p>
                                                     
                                                     <div className="space-y-2">
                                                         <select 
                                                             className="input-field bg-white"
                                                             value={overrideAgentId} 
                                                             onChange={(e) => setOverrideAgentId(e.target.value)}
                                                         >
                                                             <option value="">-- Select Delivery Agent --</option>
                                                             {agents.map(agent => (
                                                                 <option key={agent._id} value={agent._id}>
                                                                     {agent.name} {agent.isAvailable ? '(Online)' : '(Offline)'}
                                                                 </option>
                                                             ))}
                                                         </select>
                                                         
                                                         <button 
                                                             onClick={() => handleManualAssign(selectedOrder._id, overrideAgentId)}
                                                             disabled={!overrideAgentId}
                                                             className="w-full bg-orange-600 text-white font-bold py-2 rounded text-xs hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                                         >
                                                             Assign Agent
                                                         </button>
                                                     </div>
                                                 </div>
                                            )}
                                        
                                            {selectedOrder.requires_human_approval && !selectedOrder.human_approved && selectedOrder.status === 'HUMAN_APPROVAL_REQUIRED' ? (
                                                <div className="space-y-3 mt-4">
                                                    <label className="text-xs font-bold text-slate-700 block">Override Assignment (Optional)</label>
                                                    <select 
                                                        className="input-field"
                                                        value={overrideAgentId} 
                                                        onChange={(e) => setOverrideAgentId(e.target.value)}
                                                    >
                                                        <option value="">-- Auto Assign --</option>
                                                        {agents.map(agent => (
                                                            <option key={agent._id} value={agent._id}>
                                                                {agent.name}
                                                            </option>
                                                        ))}
                                                    </select>

                                                    <button 
                                                        onClick={() => handleApproval(selectedOrder._id, true, false, overrideAgentId)}
                                                        className="w-full btn-primary flex justify-center items-center gap-2"
                                                    >
                                                        <Check size={16} /> {overrideAgentId ? 'Override & Approve' : 'Approve Order'}
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => handleApproval(selectedOrder._id, true, true, overrideAgentId)}
                                                        className="w-full bg-blue-50 text-blue-700 font-bold py-2 rounded text-xs hover:bg-blue-100 transition-colors border border-blue-100"
                                                    >
                                                        Approve & Waive Priority Fee
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => handleApproval(selectedOrder._id, false)}
                                                        className="w-full bg-white text-red-600 font-bold py-2 rounded text-xs hover:bg-red-50 transition-colors border border-red-200"
                                                    >
                                                        Reject Order
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-center p-4 text-xs text-slate-400 font-medium italic bg-white rounded border border-gray-100">
                                                    No actions required
                                                </div>
                                            )}
                                        </div>

                                        <div className="card-base p-5 border border-gray-200 shadow-none">
                                            <h4 className="font-bold text-xs text-slate-500 uppercase mb-3">Order Total</h4>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-600 text-sm">Amount</span>
                                                <span className="font-bold text-xl text-slate-900">${selectedOrder.total_amount}</span>
                                            </div>
                                            {selectedOrder.priority_fee > 0 && (
                                                <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded flex justify-between">
                                                    <span>Priority Fee</span>
                                                    <span className="font-bold">${selectedOrder.priority_fee}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

const StatCard = ({ label, value, icon, bgColor, textColor }) => (
    <div className={`p-5 rounded-xl border border-gray-100 flex items-center justify-between ${bgColor}`}>
        <div>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${textColor} opacity-80`}>{label}</p>
            <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
        </div>
        <div className="p-3 bg-white rounded-lg shadow-sm">
            {icon}
        </div>
    </div>
);

export default AdminDashboard;
