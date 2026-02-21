import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import roomsData from '../data/rooms.json';
import { getGridData, getEnrichedBookings } from '../utils/bookingUtils';
import DashboardGrid from '../components/DashboardGrid';
import DateNavigator from '../components/DateNavigator';
import ViewSwitcher from '../components/ViewSwitcher';
import WeekView from '../components/WeekView';
import MonthView from '../components/MonthView';
import { Calendar, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useBookings } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';

const DashboardPage = () => {
    const navigate = useNavigate();
    const { bookings: rawBookings } = useBookings();
    const { currentUser, logout } = useAuth();
    const [gridData, setGridData] = useState({ rooms: [], timeHeaders: [], dayBookings: [] });
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('day');


    const bookings = useMemo(() => getEnrichedBookings(rawBookings, roomsData), [rawBookings]);

    useEffect(() => {

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
                            <h1 className="text-xl font-bold text-white tracking-tight leading-none">BullSpace</h1>
                            <p className="text-xs text-emerald-50 font-medium">USF Room Reservation</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {currentUser && (
                            <div className="text-white mr-4 text-sm hidden md:block">
                                Hello, <span className="font-bold">{currentUser.name}</span>
                            </div>
                        )}
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
                        <button
                            onClick={logout}
                            className="text-white hover:text-emerald-100 text-sm font-medium transition-colors ml-2"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {currentUser?.role === 'org' && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">My Upcoming Events</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {bookings.filter(b => b.organization === currentUser.name).slice(0, 3).map((b, i) => (
                                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-bold text-slate-800 text-lg">{b.room_name}</p>
                                            <p className="text-sm text-emerald-600 font-medium">{b.date}</p>
                                        </div>
                                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-bold">
                                            {b.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-2">{b.time_slot}</p>
                                </div>
                            ))}
                            {bookings.filter(b => b.organization === currentUser.name).length === 0 && (
                                <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-slate-100 rounded-xl p-6 text-center text-slate-500">
                                    No upcoming events found for your organization.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Calendar className="text-emerald-600" size={24} />
                            Room Schedule
                        </h2>
                        <p className="text-slate-500 mt-1">View and manage room reservations across campus.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <DateNavigator currentDate={currentDate} onDateChange={handleDateChange} currentView={currentView} />
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
                    />
                )}

                {currentView === 'month' && (
                    <MonthView
                        currentDate={currentDate}
                        bookings={bookings}
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
