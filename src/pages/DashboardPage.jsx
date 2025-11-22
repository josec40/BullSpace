import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import roomsData from '../data/rooms.json';
import { getGridData, getEnrichedBookings } from '../utils/bookingUtils';
import DashboardGrid from '../components/DashboardGrid';
import DateNavigator from '../components/DateNavigator';
import ViewSwitcher from '../components/ViewSwitcher';
import WeekView from '../components/WeekView';
import MonthView from '../components/MonthView';
import { Calendar, Plus, Building2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useBookings } from '../context/BookingContext';

const DashboardPage = () => {
    const navigate = useNavigate();
    const { bookings: rawBookings } = useBookings();
    const [gridData, setGridData] = useState({ rooms: [], timeHeaders: [], dayBookings: [] });
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('day');
    const [selectedRoom, setSelectedRoom] = useState(roomsData[0]); // Default to first room for room-specific views

    // Enrich bookings with room data - memoized to prevent infinite loop
    const bookings = useMemo(() => getEnrichedBookings(rawBookings, roomsData), [rawBookings]);

    useEffect(() => {
        // Update grid data when date or bookings change
        const data = getGridData(bookings, currentDate);
        setGridData(data);
    }, [bookings, currentDate]);

    const handleDateChange = (newDate) => {
        setCurrentDate(newDate);
    };

    const handleViewChange = (view) => {
        setCurrentView(view);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <header className="bg-emerald-600 shadow-lg sticky top-0 z-30">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 font-bold text-xl shadow-lg">
                            B
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight leading-none">Bullspace</h1>
                            <p className="text-xs text-emerald-50 font-medium">USF Room Reservation</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            to="/map"
                            className="bg-white border-2 border-white text-emerald-600 hover:bg-emerald-50 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                            <Search size={18} />
                            Map View
                        </Link>
                        <button
                            onClick={() => navigate('/search')}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2 border-2 border-emerald-500"
                        >
                            <Plus size={18} />
                            Book a Room
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">

                <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Calendar className="text-emerald-600" size={24} />
                            Room Schedule
                        </h2>
                        <p className="text-slate-500 mt-1">View and manage room reservations across campus.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        {/* Room Selector for Week/Month Views */}
                        {currentView !== 'day' && (
                            <div className="relative">
                                <Building2 className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <select
                                    value={selectedRoom.id}
                                    onChange={(e) => setSelectedRoom(roomsData.find(r => r.id === e.target.value))}
                                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    {roomsData.map(room => (
                                        <option key={room.id} value={room.id}>{room.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <DateNavigator currentDate={currentDate} onDateChange={handleDateChange} />
                        <ViewSwitcher currentView={currentView} onViewChange={handleViewChange} />
                    </div>
                </div>

                {/* Legend (Only for Day View) */}
                {currentView === 'day' && (
                    <div className="mb-4 flex space-x-6 text-sm font-medium">
                        <div className="flex items-center">
                            <span className="w-3 h-3 bg-emerald-50 border border-emerald-200 rounded-full mr-2"></span>
                            <span className="text-slate-600">Available</span>
                        </div>
                        <div className="flex items-center">
                            <span className="w-3 h-3 bg-emerald-500 rounded-full mr-2 shadow-sm"></span>
                            <span className="text-slate-600">Booked</span>
                        </div>
                        <div className="flex items-center">
                            <span className="w-3 h-3 bg-rose-500 rounded-full mr-2 shadow-sm"></span>
                            <span className="text-slate-600">Conflict</span>
                        </div>
                    </div>
                )}

                {/* View Content */}
                {currentView === 'day' && (
                    <DashboardGrid
                        bookings={gridData.dayBookings}
                        rooms={gridData.rooms}
                        timeHeaders={gridData.timeHeaders}
                    />
                )}

                {currentView === 'week' && (
                    <WeekView
                        currentDate={currentDate}
                        bookings={bookings}
                        room={selectedRoom}
                    />
                )}

                {currentView === 'month' && (
                    <MonthView
                        currentDate={currentDate}
                        bookings={bookings}
                        room={selectedRoom}
                        onDateClick={(date) => {
                            setCurrentDate(date);
                            setCurrentView('day');
                        }}
                    />
                )}
            </main>
        </div>
    );
};

export default DashboardPage;
