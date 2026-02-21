import React from 'react';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

const DateNavigator = ({ currentDate, onDateChange, currentView = 'day' }) => {
    const handlePrevious = () => {
        if (currentView === 'day') onDateChange(subDays(currentDate, 1));
        else if (currentView === 'week') onDateChange(subWeeks(currentDate, 1));
        else if (currentView === 'month') onDateChange(subMonths(currentDate, 1));
    };

    const handleNext = () => {
        if (currentView === 'day') onDateChange(addDays(currentDate, 1));
        else if (currentView === 'week') onDateChange(addWeeks(currentDate, 1));
        else if (currentView === 'month') onDateChange(addMonths(currentDate, 1));
    };

    return (
        <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-200 p-1">
            <button
                onClick={handlePrevious}
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
                onClick={handleNext}
                className="p-2 hover:bg-slate-100 rounded-md text-slate-600 transition-colors"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
};

export default DateNavigator;
