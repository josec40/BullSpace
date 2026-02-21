import React from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

const DateNavigator = ({ currentDate, onDateChange }) => {
    return (
        <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-200 p-1">
            <button
                onClick={() => onDateChange(subDays(currentDate, 1))}
                className="p-2 hover:bg-slate-100 rounded-md text-slate-600 transition-colors"
            >
                <ChevronLeft size={20} />
            </button>

            <div className="flex items-center px-4 border-l border-r border-slate-100 mx-1">
                <CalendarIcon size={18} className="text-indigo-500 mr-2" />
                <span className="font-semibold text-slate-700 min-w-[140px] text-center">
                    {format(currentDate, 'EEE, MMM d, yyyy')}
                </span>
            </div>

            <button
                onClick={() => onDateChange(addDays(currentDate, 1))}
                className="p-2 hover:bg-slate-100 rounded-md text-slate-600 transition-colors"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
};

export default DateNavigator;
