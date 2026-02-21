import React from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parse } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const MonthView = ({ currentDate, bookings, onDateClick }) => {
    const { currentUser } = useAuth();

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const getBookingsForDay = (day) => {
        return bookings.filter(b =>
            isSameDay(parse(b.date, 'yyyy-MM-dd', new Date()), day)
        );
    };

    const getDisplayName = (booking) => {
        if (currentUser?.role === 'admin' || currentUser?.name === booking.organization) {
            return booking.organization;
        }
        return 'Reserved';
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg text-slate-800">{format(currentDate, 'MMMM yyyy')}</h3>
                    <p className="text-sm text-slate-500">All Rooms</p>
                </div>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-fr bg-slate-200 gap-px border-b border-slate-200">
                {days.map((day, i) => {
                    const dayBookings = getBookingsForDay(day);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div
                            key={i}
                            onClick={() => onDateClick(day)}
                            className={`min-h-[100px] bg-white p-2 cursor-pointer hover:bg-slate-50 transition-colors ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : ''}`}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : ''}`}>
                                    {format(day, 'd')}
                                </span>
                                {dayBookings.length > 0 && (
                                    <span className="text-[10px] font-bold text-slate-400">{dayBookings.length} events</span>
                                )}
                            </div>
                            <div className="mt-2 space-y-1">
                                {dayBookings.slice(0, 3).map((booking, idx) => (
                                    <div key={idx} className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded truncate border border-indigo-100" title={`${getDisplayName(booking)} in ${booking.room_name}`}>
                                        <span className="font-bold">{booking.room_name}</span>: {getDisplayName(booking)}
                                    </div>
                                ))}
                                {dayBookings.length > 3 && (
                                    <div className="text-[10px] text-slate-400 pl-1">
                                        + {dayBookings.length - 3} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MonthView;
