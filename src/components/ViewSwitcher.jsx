import React from 'react';
import { LayoutGrid, Calendar, Grid } from 'lucide-react';

const ViewSwitcher = ({ currentView, onViewChange }) => {
    const views = [
        { id: 'day', label: 'Day', icon: LayoutGrid },
        { id: 'week', label: 'Week', icon: Grid },
        { id: 'month', label: 'Month', icon: Calendar },
    ];

    return (
        <div className="flex bg-slate-100 p-1 rounded-lg">
            {views.map(view => {
                const Icon = view.icon;
                const isActive = currentView === view.id;
                return (
                    <button
                        key={view.id}
                        onClick={() => onViewChange(view.id)}
                        className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${isActive
                            ? 'bg-emerald-50 text-emerald-700 shadow-md border border-emerald-200'
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
