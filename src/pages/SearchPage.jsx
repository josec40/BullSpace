import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Users, Calendar, Clock, ArrowRight, Filter, BookOpen } from 'lucide-react';
import roomsData from '../data/rooms.json';
import { searchRooms } from '../utils/bookingUtils';
import { validateBookingDate } from '../utils/validationUtils';
import { useBookings } from '../context/BookingContext';

const SearchPage = () => {
    const navigate = useNavigate();
    const { bookings } = useBookings();
    const [filters, setFilters] = useState({
        building: '',
        type: '',
        capacity: '',
        date: '',
        startTime: '',
        endTime: ''
    });

    const [results, setResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        if (name === 'date') setError(null);
    };

    const handleSearch = (e) => {
        e.preventDefault();


        if (!filters.date || !filters.startTime || !filters.endTime) {
            setError("Please select a date and time range.");
            return;
        }

        const dateError = validateBookingDate(new Date(filters.date));
        if (dateError) {
            setError(dateError);
            return;
        }

        const foundRooms = searchRooms({
            ...filters,
            date: new Date(filters.date)
        }, roomsData, bookings);

        setResults(foundRooms);
        setHasSearched(true);
    };

    const handleBook = (room) => {
        navigate('/book', {
            state: {
                prefilled: {
                    room: room.id,
                    date: filters.date,
                    startTime: filters.startTime,
                    endTime: filters.endTime
                }
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <header className="bg-emerald-600 shadow-lg sticky top-0 z-30">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <Link to="/" className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 font-bold text-xl shadow-lg">
                            B
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight leading-none">Bullspace</h1>
                            <p className="text-xs text-emerald-50 font-medium">USF Room Reservation</p>
                        </div>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">Find a Room</h2>
                        <p className="text-slate-500">Search for available spaces across campus.</p>
                    </div>

                    {/* Search Form */}
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 mb-8">
                        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Building */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                    <MapPin size={16} className="text-emerald-600" /> Building
                                </label>
                                <select
                                    name="building"
                                    value={filters.building}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                                >
                                    <option value="">Any Building</option>
                                    <option value="Engineering Building II">Engineering Building II</option>
                                    <option value="Marshall Student Center">Marshall Student Center</option>
                                    <option value="Interdisciplinary Sciences">Interdisciplinary Sciences</option>
                                    <option value="Library">Library</option>
                                    <option value="Recreation Center">Recreation Center</option>
                                </select>
                            </div>

                            {/* Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                    <BookOpen size={16} className="text-emerald-600" /> Room Type
                                </label>
                                <select
                                    name="type"
                                    value={filters.type}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                                >
                                    <option value="">Any Type</option>
                                    <option value="Conference Room">Conference Room</option>
                                    <option value="Classroom">Classroom</option>
                                    <option value="Computer Lab">Computer Lab</option>
                                </select>
                            </div>

                            {/* Capacity */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                    <Users size={16} className="text-emerald-600" /> Capacity
                                </label>
                                <select
                                    name="capacity"
                                    value={filters.capacity}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                                >
                                    <option value="">Any Capacity</option>
                                    <option value="10-20">10-20 People</option>
                                    <option value="20-40">20-40 People</option>
                                    <option value="50+">50+ People</option>
                                </select>
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                    <Calendar size={16} className="text-emerald-600" /> Date
                                </label>
                                <input
                                    type="date"
                                    name="date"
                                    value={filters.date}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                            </div>

                            {/* Time Range */}
                            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                        <Clock size={16} className="text-emerald-600" /> From
                                    </label>
                                    <input
                                        type="time"
                                        name="startTime"
                                        value={filters.startTime}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                        <Clock size={16} className="text-emerald-600" /> Until
                                    </label>
                                    <input
                                        type="time"
                                        name="endTime"
                                        value={filters.endTime}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="md:col-span-2 lg:col-span-3 flex items-end justify-end">
                                <button
                                    type="submit"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                                >
                                    <Search size={20} />
                                    Search Rooms
                                </button>
                            </div>
                        </form>
                        {error && (
                            <div className="mt-4 p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-sm font-medium">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Results */}
                    {hasSearched && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Filter size={20} className="text-emerald-600" />
                                Search Results ({results.length})
                            </h3>

                            {results.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Search size={32} className="text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-700">No rooms found</h3>
                                    <p className="text-slate-500">Try adjusting your filters or time range.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {results.map(room => (
                                        <div key={room.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="text-lg font-bold text-slate-800">{room.name}</h4>
                                                        <p className="text-sm text-slate-500">{room.building}</p>
                                                    </div>
                                                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md uppercase tracking-wide">
                                                        {room.type}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                                                    <span className="flex items-center gap-1"><Users size={14} /> {room.capacity} Seats</span>
                                                    <span className="flex items-center gap-1"><BookOpen size={14} /> {room.features.join(', ')}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleBook(room)}
                                                className="w-full mt-4 bg-white border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                                            >
                                                Book This Room <ArrowRight size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SearchPage;
