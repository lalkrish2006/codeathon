import React from 'react';
import { Package, ShieldCheck, User, Truck, CheckCircle, Circle, Clock } from 'lucide-react';
import clsx from 'clsx';

const OrderStatusTimeline = ({ order }) => {
    
    const getStepStatus = (stepIndex, currentStepIndex) => {
        if (stepIndex < currentStepIndex) return 'completed';
        if (stepIndex === currentStepIndex) return 'current';
        return 'pending';
    };

    
    let currentStepIndex = 0;
    
    
    
    
    
    

    
    const isApproved = order.status !== 'PENDING' && order.status !== 'HUMAN_APPROVAL_REQUIRED' && order.status !== 'REJECTED';
    
    
    const isAssigned = !!order.assigned_to;

    
    const isOut = order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED';
    
    
    const isDelivered = order.status === 'DELIVERED';

    if (isDelivered) currentStepIndex = 4;
    else if (isOut) currentStepIndex = 3;
    else if (isAssigned) currentStepIndex = 2;
    else if (isApproved) currentStepIndex = 1; 
    else currentStepIndex = 0; 

    
    
    
    if (order.status === 'REJECTED') currentStepIndex = 0; 

    const steps = [
        {
            title: 'Order Placed',
            description: `We have received your order on ${new Date(order.createdAt).toLocaleDateString()}`,
            icon: Package,
            isCompleted: true 
        },
        {
            title: order.status === 'HUMAN_APPROVAL_REQUIRED' ? 'Approval Pending' : 'Order Approved',
            description: order.status === 'HUMAN_APPROVAL_REQUIRED' 
                ? 'Your order is being reviewed by our team.' 
                : (order.human_approved ? 'Approved by Admin' : 'Automatically Approved'),
            icon: ShieldCheck,
            isCompleted: isApproved
        },
        {
            title: isAssigned ? (order.assigned_to?.role === 'seller' ? 'Seller Assigned' : 'Delivery Agent Assigned') : 'Agent Assignment',
            description: isAssigned 
                ? `${order.assigned_to?.name} is handling your order.` 
                : 'Waiting for Assignment...',
            icon: User,
            isCompleted: isAssigned
        },
        {
            title: 'Out for Delivery',
            description: 'Your package is on the way.',
            icon: Truck,
            isCompleted: isOut
        },
        {
            title: 'Delivered',
            description: 'Package delivered successfully.',
            icon: CheckCircle,
            isCompleted: isDelivered
        }
    ];

    return (
        <div className="py-6 px-4">
            <div className="relative">
                {steps.map((step, index) => {
                    
                    const status = getStepStatus(index, currentStepIndex);
                    const isLast = index === steps.length - 1;

                    return (
                        <div key={index} className="flex gap-4 min-h-[80px]">
                            {}
                            <div className="flex flex-col items-center relative">
                                {}
                                <div className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center z-10 border-2 transition-all duration-300",
                                    step.isCompleted || status === 'current' 
                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-110" 
                                        : "bg-white border-gray-300 text-gray-400"
                                )}>
                                    <step.icon size={18} />
                                </div>
                                
                                {}
                                {!isLast && (
                                    <div className={clsx(
                                        "w-0.5 grow absolute top-10 bottom-[-10px] transition-colors duration-300",
                                        step.isCompleted ? "bg-indigo-600" : "bg-gray-200"
                                    )}></div>
                                )}
                            </div>

                            {}
                            <div className={clsx("pb-8 pt-1 flex-1", status === 'pending' ? "opacity-50" : "opacity-100")}>
                                <h4 className={clsx(
                                    "text-sm font-bold uppercase tracking-wider mb-1", 
                                    status === 'current' ? "text-indigo-700" : "text-slate-800"
                                )}>
                                    {step.title}
                                </h4>
                                <p className="text-sm text-slate-500 font-medium">
                                    {step.description}
                                </p>
                                
                                {}
                                {status === 'current' && !isDelivered && (
                                    <div className="mt-2 flex items-center gap-2 text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-1 rounded w-fit animate-pulse">
                                        <Clock size={12} /> In Progress
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {}
            {order.priority_fee > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <span className="font-bold text-amber-800">Priority Processing Included</span>
                    <span className="font-mono text-amber-700">Emergency Handling Fee Applied</span>
                </div>
            )}
        </div>
    );
};

export default OrderStatusTimeline;
