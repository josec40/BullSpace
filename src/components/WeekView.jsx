import React from 'react';
import { format, startOfWeek, addDays, isSameDay, parse, isWithinInterval, addMinutes } from 'date-fns';
import { parseTimeSlot } from '../utils/bookingUtils';

const WeekView = ({ currentDate, bookings, room }) => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekDays = Array.from({ length: 5 }).map((_, i) => addDays(startDate, i)); // Mon-Fri

    // Generate time slots 8 AM - 8 PM
    const timeSlots = [];
    let currentTime = parse('08:00 AM', 'hh:mm a', new Date());
    const endTime = parse('08:00 PM', 'hh:mm a', new Date());

    while (currentTime <= endTime) {
        timeSlots.push(format(currentTime, 'hh:mm a'));
        currentTime = addMinutes(currentTime, 60);
    }

    const getBookingForSlot = (day, timeStr) => {
        const slotStart = parse(timeStr, 'hh:mm a', day);
        const dayBookings = bookings.filter(b =>
            b.room_name === room.name &&
            isSameDay(parse(b.date, 'yyyy-MM-dd', new Date()), day)
        );

        return dayBookings.find(b => {
            const { start, end } = parseTimeSlot(b.time_slot);
            // Adjust start/end to match the specific day for comparison
            // (Since parseTimeSlot uses "today" as base)
            // Actually, we just need to check time overlap, assuming date is already filtered.
            // But isWithinInterval requires full dates.
            // Let's construct full dates for the slot and the booking times on THIS day.

            // Simple time string comparison might be easier if we trust the format
            // But let's stick to date-fns for robustness

            // Re-parse start/end times onto the specific 'day'
            const bStart = parse(format(start, 'HH:mm'), 'HH:mm', day);
            const bEnd = parse(format(end, 'HH:mm'), 'HH:mm', day);

            return isWithinInterval(slotStart, { start: bStart, end: addMinutes(bEnd, -1) });
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800">{room.name} - Weekly Schedule</h3>
                <p className="text-sm text-slate-500">{room.building}</p>
            </div>
            <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                    <div className="grid grid-cols-6 border-b border-slate-200">
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
                            <div key={i} className="grid grid-cols-6 h-16">
                                <div className="p-2 text-xs text-slate-400 font-medium border-r border-slate-100 flex items-center justify-end pr-4">
                                    {time}
                                </div>
                                {weekDays.map((day, j) => {
                                    const booking = getBookingForSlot(day, time);
                                    return (
                                        <div key={j} className="border-r border-slate-100 last:border-r-0 p-1 relative group">
                                            {booking && (
                                                <div className="w-full h-full bg-indigo-100 border-l-2 border-indigo-500 rounded-sm p-1 cursor-pointer hover:bg-indigo-200 transition-colors">
                                                    <p className="text-[10px] font-bold text-indigo-900 truncate">{booking.organization}</p>
                                                    <p className="text-[9px] text-indigo-700 truncate">{booking.time_slot}</p>
                                                </div>
                                            )}
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
