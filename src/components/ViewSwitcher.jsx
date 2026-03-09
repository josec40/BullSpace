import React from 'react';
import { LayoutGrid, Calendar, Grid } from 'lucide-react';

const ViewSwitcher = ({ currentView, onViewChange }) => {
    const views = [
        { id: 'day', label: 'Day', icon: LayoutGrid },
        { id: 'week', label: 'Week', icon: Grid },
        { id: 'month', label: 'Month', icon: Calendar },
    ];

    return (
        <div className="flex bg-muted p-1 rounded-lg">
            {views.map(view => {
                const Icon = view.icon;
                const isActive = currentView === view.id;
                return (
                    <button
                        key={view.id}
                        onClick={() => onViewChange(view.id)}
                        className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${isActive
                            ? 'bg-[#006747]/10 text-[#006747] shadow-md border border-[#006747]/20'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Icon size={16} className="mr-1.5" />
                        {view.label}
                    </button>
                );
            })}
        </div>
    );
};

export default ViewSwitcher;
