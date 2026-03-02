import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Users, ChevronRight, Calendar, LogOut, Search, Check, AlertCircle } from 'lucide-react';
import { format, parse } from 'date-fns';
import { useBookings } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { searchRooms } from '../utils/bookingUtils';
import { validateBookingDate } from '../utils/validationUtils';

const FLOOR_LABELS = {
    3: '3rd Floor — Group Study',
    4: '4th Floor — Group Study',
    5: '5th Floor — Quiet Study',
};

const LibraryDashboard = () => {
    const navigate = useNavigate();
    const { rooms: allRooms = [], bookings, loadBookings } = useBookings();
    const { currentUser, logout } = useAuth();

    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [searchResults, setSearchResults] = useState(null);

    // Filter only Library rooms
    const libraryRooms = useMemo(
        () => allRooms.filter(r => r.building === 'Library'),
        [allRooms]
    );

    // Group by floor
    const roomsByFloor = useMemo(() => {
        const grouped = {};
        libraryRooms.forEach(room => {
            const floor = room.floor || 0;
            if (!grouped[floor]) grouped[floor] = [];
            grouped[floor].push(room);
        });
        return grouped;
    }, [libraryRooms]);

    // Load bookings for selected date
    useEffect(() => {
        if (selectedDate) loadBookings(selectedDate);
    }, [selectedDate, loadBookings]);

    // Time options
    const timeOptions = useMemo(() => {
        const opts = [];
        for (let i = 8; i <= 22; i++) {
            for (let j = 0; j < 60; j += 30) {
                if (i === 22 && j > 0) continue;
                const hour = i.toString().padStart(2, '0');
                const minute = j.toString().padStart(2, '0');
                const displayHour = i % 12 || 12;
                const ampm = i < 12 ? 'AM' : 'PM';
                opts.push({ value: `${hour}:${minute}`, label: `${displayHour}:${minute} ${ampm}` });
            }
        }
        return opts;
    }, []);

    const handleSearch = () => {
        if (!selectedDate || !startTime || !endTime) return;

        const parsedDate = parse(selectedDate, 'yyyy-MM-dd', new Date());
        const dateError = validateBookingDate(parsedDate);
        if (dateError) return;

        const results = searchRooms({
            date: parsedDate,
            startTime,
            endTime,
            building: 'Library',
        }, allRooms, bookings);

        setSearchResults(results);
    };

    const handleBook = (room) => {
        navigate('/book', {
            state: {
                prefilled: {
                    room: room.id,
                    date: selectedDate,
                    startTime,
                    endTime,
                }
            }
        });
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const floors = Object.keys(roomsByFloor).sort((a, b) => Number(a) - Number(b));

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-sans text-white">
            {/* Header */}
            <header className="bg-slate-900/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-30">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight leading-none">BullSpace</h1>
                            <p className="text-xs text-blue-300 font-medium">Library Study Rooms</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {currentUser && (
                            <span className="text-white/60 text-sm hidden md:block">
                                Hello, <span className="font-bold text-white">{currentUser.name}</span>
                            </span>
                        )}
                        {currentUser?.role === 'admin' && (
                            <Link
                                to="/"
                                className="px-3 py-2 bg-white/10 rounded-lg text-xs font-medium text-white hover:bg-white/20 transition"
                            >
                                Event Spaces →
                            </Link>
                        )}
                        <button
                            onClick={handleLogout}
                            className="px-3 py-2 bg-white/10 rounded-lg text-xs font-medium text-white hover:bg-red-500/30 transition flex items-center gap-1"
                        >
                            <LogOut className="w-3 h-3" /> Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-5xl">
                {/* Search Bar */}
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5 text-blue-400" /> Find an Available Room
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 font-medium">Date</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => { setSelectedDate(e.target.value); setSearchResults(null); }}
                                className="w-full px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 font-medium">From</label>
                            <select
                                value={startTime}
                                onChange={(e) => { setStartTime(e.target.value); setSearchResults(null); }}
                                className="w-full px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                            >
                                <option value="" className="bg-slate-800">Select</option>
                                {timeOptions.map(t => (
                                    <option key={t.value} value={t.value} className="bg-slate-800">{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1 font-medium">Until</label>
                            <select
                                value={endTime}
                                onChange={(e) => { setEndTime(e.target.value); setSearchResults(null); }}
                                className="w-full px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                            >
                                <option value="" className="bg-slate-800">Select</option>
                                {timeOptions.map(t => (
                                    <option key={t.value} value={t.value} className="bg-slate-800">{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={handleSearch}
                                disabled={!selectedDate || !startTime || !endTime}
                                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/30 text-white font-medium px-4 py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
                            >
                                <Search className="w-4 h-4" /> Search
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search Results */}
                {searchResults && (
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-white mb-4">
                            {searchResults.filter(r => r.isAvailable).length} rooms available
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {searchResults.map(room => (
                                <div
                                    key={room.id}
                                    className={`p-4 rounded-2xl border transition-all ${room.isAvailable
                                            ? 'bg-white/5 border-white/10 hover:border-blue-400/40 hover:bg-white/10'
                                            : 'bg-red-500/5 border-red-500/20 opacity-60'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-white text-sm">{room.name}</h4>
                                            <p className="text-xs text-gray-400">Floor {room.floor}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${room.isAvailable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {room.isAvailable ? 'Open' : 'Taken'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {room.capacity}</span>
                                        <span className="capitalize">{room.type}</span>
                                    </div>
                                    {room.isAvailable ? (
                                        <button
                                            onClick={() => handleBook(room)}
                                            className="w-full bg-blue-500/20 text-blue-400 font-medium py-2 rounded-xl text-xs hover:bg-blue-500/30 transition flex items-center justify-center gap-1"
                                        >
                                            <Check className="w-3 h-3" /> Reserve
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-1 text-xs text-red-400">
                                            <AlertCircle className="w-3 h-3" /> {room.conflict?.time_slot || 'Unavailable'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Floor-by-floor overview */}
                {!searchResults && (
                    <div>
                        <h2 className="text-xl font-bold text-white mb-6">All Library Study Rooms</h2>
                        {floors.map(floor => (
                            <div key={floor} className="mb-8">
                                <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-3">
                                    {FLOOR_LABELS[floor] || `Floor ${floor}`}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {roomsByFloor[floor].map(room => (
                                        <div
                                            key={room.id}
                                            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-400/30 transition-all"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-white text-sm">{room.name}</h4>
                                                <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-white/10 text-gray-300 capitalize">
                                                    {room.type}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {room.capacity} seats</span>
                                                {room.features?.length > 0 && (
                                                    <span>{room.features.join(', ')}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default LibraryDashboard;
