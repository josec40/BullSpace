import React from 'react';
import { format, startOfWeek, addDays, isSameDay, parse, isWithinInterval, addMinutes } from 'date-fns';
import { parseTimeSlot } from '../utils/bookingUtils';
import { useAuth } from '../context/AuthContext';

const WeekView = ({ currentDate, bookings }) => {
    const { currentUser } = useAuth();

    const getDisplayName = (booking) => {
        if (currentUser?.role === 'admin' || currentUser?.name === booking.organization) {
            return booking.organization;
        }
        return 'Reserved';
    };

    const startDate = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday start
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i)); // Sun-Sat

    // Generate time slots 8 AM - 8 PM
    const timeSlots = [];
    let currentTime = parse('08:00 AM', 'hh:mm a', new Date());
    const endTime = parse('08:00 PM', 'hh:mm a', new Date());

    while (currentTime <= endTime) {
        timeSlots.push(format(currentTime, 'hh:mm a'));
        currentTime = addMinutes(currentTime, 60);
    }

    const getBookingsForSlot = (day, timeStr) => {
        const slotStart = parse(timeStr, 'hh:mm a', day);
        const dayBookings = bookings.filter(b =>
            isSameDay(parse(b.date, 'yyyy-MM-dd', new Date()), day)
        );

        return dayBookings.filter(b => {
            const { start, end } = parseTimeSlot(b.time_slot);
            const bStart = parse(format(start, 'HH:mm'), 'HH:mm', day);
            const bEnd = parse(format(end, 'HH:mm'), 'HH:mm', day);

            return isWithinInterval(slotStart, { start: bStart, end: addMinutes(bEnd, -1) });
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800">Weekly Schedule</h3>
                <p className="text-sm text-slate-500">All Rooms</p>
            </div>
            <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                    <div className="grid grid-cols-8 border-b border-slate-200">
                        <div className="p-3 text-xs font-bold text-slate-400 uppercase tracking-wider border-r border-slate-100">Time</div>
                        {weekDays.map((day, i) => (
                            <div key={i} className={`p-3 text-center border-r border-slate-100 last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-indigo-50' : ''}`}>
                                <div className="text-xs font-bold text-slate-500 uppercase">{format(day, 'EEE')}</div>
                                <div className={`text-sm font-bold ${isSameDay(day, new Date()) ? 'text-indigo-600' : 'text-slate-800'}`}>
                                    {format(day, 'MMM d')}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="divide-y divide-slate-100">
                        {timeSlots.map((time, i) => (
                            <div key={i} className="grid grid-cols-8 min-h-[4rem]">
                                <div className="p-2 text-xs text-slate-400 font-medium border-r border-slate-100 flex items-center justify-end pr-4">
                                    {time}
                                </div>
                                {weekDays.map((day, j) => {
                                    const slotBookings = getBookingsForSlot(day, time);
                                    return (
                                        <div key={j} className="border-r border-slate-100 last:border-r-0 p-1 relative flex flex-col gap-1">
                                            {slotBookings.map((booking, k) => (
                                                <div key={k} className="w-full bg-indigo-100 border-l-2 border-indigo-500 rounded-sm p-1 cursor-pointer hover:bg-indigo-200 transition-colors" title={`${getDisplayName(booking)} in ${booking.room_name}`}>
                                                    <p className="text-[10px] font-bold text-indigo-900 truncate">{getDisplayName(booking)}</p>
                                                    <p className="text-[9px] text-indigo-700 truncate">{booking.room_name}</p>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeekView;
