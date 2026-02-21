import React from 'react';
import { parseTimeSlot } from '../utils/bookingUtils';
import { parse, isWithinInterval, addMinutes } from 'date-fns';

const DashboardGrid = ({ bookings, rooms, timeHeaders }) => {

    const isSlotBooked = (room, timeStr) => {
        const slotStart = parse(timeStr, 'hh:mm a', new Date());
        const roomBookings = bookings.filter(b => b.room_name === room);

        // Find all bookings that overlap this slot
        const overlappingBookings = roomBookings.filter(b => {
            const { start, end } = parseTimeSlot(b.time_slot);
            return isWithinInterval(slotStart, { start, end: addMinutes(end, -1) });
        });

        if (overlappingBookings.length > 1) {
            return { ...overlappingBookings[0], isConflict: true, count: overlappingBookings.length };
        }

        return overlappingBookings[0];
    };

    return (
        <div className="overflow-x-auto shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-200 bg-white">
            <div className="min-w-max">
                {/* Header */}
                <div className="flex bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-20">
                    <div className="w-48 px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-30 border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                        Room Name
                    </div>
                    {timeHeaders.map((time, index) => (
                        <div key={index} className="w-32 px-2 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider flex-shrink-0 border-r border-slate-100 last:border-r-0">
                            {time}
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div className="divide-y divide-slate-100">
                    {rooms.map((room, rowIndex) => (
                        <div key={rowIndex} className="flex hover:bg-slate-50/50 transition-colors group">
                            <div className="w-48 px-6 py-4 text-sm font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50/50 z-20 border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex items-center">
                                {room}
                            </div>
                            {timeHeaders.map((time, colIndex) => {
                                const booking = isSlotBooked(room, time);
                                return (
                                    <div key={colIndex} className="w-32 p-1 h-20 flex-shrink-0 border-r border-slate-50 last:border-r-0">
                                        <div
                                            className={`w-full h-full rounded-lg transition-all duration-300 transform ${booking
                                                ? booking.isConflict
                                                    ? 'bg-rose-500 hover:bg-rose-600 shadow-md shadow-rose-200 cursor-pointer relative group/cell flex flex-col justify-center items-center text-center p-1'
                                                    : 'bg-indigo-500 hover:bg-indigo-600 shadow-md shadow-indigo-200 cursor-pointer relative group/cell flex flex-col justify-center items-center text-center p-1'
                                                : 'bg-slate-50 hover:bg-slate-100'
                                                }`}
                                        >
                                            {booking && (
                                                <>
                                                    <span className="text-[10px] text-white font-bold uppercase tracking-tight leading-tight opacity-95 line-clamp-2">
                                                        {booking.isConflict ? 'Conflict!' : booking.organization}
                                                    </span>

                                                    {/* Tooltip */}
                                                    <div className="absolute z-50 invisible group-hover/cell:visible bg-slate-800 text-white text-xs rounded-xl p-4 -mt-32 left-1/2 transform -translate-x-1/2 w-56 shadow-2xl pointer-events-none transition-all opacity-0 group-hover/cell:opacity-100 translate-y-2 group-hover/cell:translate-y-0">
                                                        {booking.isConflict ? (
                                                            <div>
                                                                <p className="font-bold text-rose-300 mb-2 uppercase tracking-wide">Double Booked</p>
                                                                <p className="mb-1">Multiple events scheduled.</p>
                                                                <p className="text-slate-400 text-[10px]">Check alert banner to resolve.</p>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <p className="font-bold text-sm mb-1 text-indigo-100">{booking.organization}</p>
                                                                <p className="mb-2 text-slate-300">{booking.time_slot}</p>
                                                                <div className="flex items-center justify-between border-t border-slate-700 pt-2 mt-2">
                                                                    <span className="text-slate-400 text-[10px] uppercase tracking-wide">Source</span>
                                                                    <span className="bg-slate-700 px-2 py-0.5 rounded text-[10px] font-mono">{booking.system_source}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-slate-800"></div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DashboardGrid;
