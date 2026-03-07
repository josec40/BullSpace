import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Users, Calendar, LogOut, Search, Check, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { format, parse } from 'date-fns';
import { useBookings } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { searchRooms } from '../utils/bookingUtils';
import { validateBookingDate } from '../utils/validationUtils';
import EditBookingModal from '../components/EditBookingModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

const FLOOR_LABELS = {
    3: '3rd Floor — Group Study',
    4: '4th Floor — Group Study',
    5: '5th Floor — Quiet Study',
};

const LibraryDashboard = () => {
    const navigate = useNavigate();
    const { rooms: allRooms = [], bookings, loadBookings, studentBookings = [], editBooking, removeBooking, addBooking, fetchBookings } = useBookings();
    const { currentUser, logout } = useAuth();

    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [searchResults, setSearchResults] = useState(null);

    // Edit/Delete modal state
    const [editingBooking, setEditingBooking] = useState(null);
    const [deletingBooking, setDeletingBooking] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Inline booking state
    const [bookingRoom, setBookingRoom] = useState(null);
    const [bookingStudentName, setBookingStudentName] = useState('');
    const [bookingGroupSize, setBookingGroupSize] = useState('');
    const [isBooking, setIsBooking] = useState(false);
    const [bookError, setBookError] = useState(null);

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

    const handleSearch = async () => {
        if (!selectedDate || !startTime || !endTime) return;

        const parsedDate = parse(selectedDate, 'yyyy-MM-dd', new Date());
        const dateError = validateBookingDate(parsedDate);
        if (dateError) return;

        // Fetch latest bookings for conflict accuracy
        const latestBookings = await fetchBookings(selectedDate);

        const results = searchRooms({
            date: parsedDate,
            startTime,
            endTime,
            building: 'Library',
        }, allRooms, latestBookings || bookings);

        setSearchResults(results);
    };

    const handleBook = (room) => {
        setBookingRoom(room);
        setBookingStudentName('');
        setBookingGroupSize('');
        setBookError(null);
    };

    const handleConfirmBook = async () => {
        if (!bookingRoom || !selectedDate || !startTime || !endTime) return;
        if (currentUser?.role === 'admin' && !bookingStudentName.trim()) {
            setBookError('Please enter the student name.');
            return;
        }
        if (!bookingGroupSize) {
            setBookError('Please select a group size.');
            return;
        }

        setIsBooking(true);
        setBookError(null);

        const startDate = new Date(`2000-01-01T${startTime}`);
        const endDate = new Date(`2000-01-01T${endTime}`);
        const fmtTime = (d) => {
            const h = d.getHours();
            const m = d.getMinutes().toString().padStart(2, '0');
            const ampm = h < 12 ? 'AM' : 'PM';
            return `${h % 12 || 12}:${m} ${ampm}`;
        };

        const newBooking = {
            roomId: bookingRoom.id,
            date: selectedDate,
            time_slot: `${fmtTime(startDate)} - ${fmtTime(endDate)}`,
            startTime,
            endTime,
            organization: currentUser?.role === 'admin'
                ? bookingStudentName.trim()
                : (currentUser?.name || 'Individual Student'),
            eventName: 'Study Session',
        };

        try {
            await addBooking(newBooking);
            setBookingRoom(null);
            setSearchResults(null);
        } catch (err) {
            if (err.status === 409) {
                setBookError(err.message);
            } else {
                setBookError('Something went wrong. Please try again.');
            }
        } finally {
            setIsBooking(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleConfirmDelete = async (bookingId, roomId, date) => {
        setIsDeleting(true);
        try {
            await removeBooking(bookingId, roomId, date);
            setDeletingBooking(null);
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const floors = Object.keys(roomsByFloor).sort((a, b) => Number(a) - Number(b));

    // My reservations — student bookings belonging to this user (only future/today)
    const myReservations = useMemo(() => {
        if (!currentUser) return [];
        const todayStr = format(new Date(), 'yyyy-MM-dd');

        // Admin sees all library bookings; student sees only their own
        if (currentUser.role === 'admin') {
            // Merge API bookings + locally-added student bookings, deduplicate
            const allBookings = [...bookings, ...studentBookings];
            const unique = [...new Map(allBookings.map(b => [b.id, b])).values()];
            return unique
                .filter(b => {
                    const room = allRooms.find(r => r.id === b.roomId);
                    return room?.building === 'Library' && b.date >= todayStr;
                })
                .map(b => {
                    const room = allRooms.find(r => r.id === b.roomId);
                    return { ...b, room };
                });
        }
        // Student: own bookings (bookedBy) + admin-assigned bookings (organization matches name)
        const ownBookings = studentBookings.filter(b => b.bookedBy === currentUser.name && b.date >= todayStr);
        const assignedBookings = bookings.filter(b => {
            const room = allRooms.find(r => r.id === b.roomId);
            return room?.building === 'Library'
                && b.organization === currentUser.name
                && b.bookedBy !== currentUser.name
                && b.date >= todayStr;
        });
        const merged = [...ownBookings, ...assignedBookings];
        const unique = [...new Map(merged.map(b => [b.id, b])).values()];
        return unique.map(b => {
            const room = allRooms.find(r => r.id === b.roomId);
            return { ...b, room };
        });
    }, [studentBookings, bookings, currentUser, allRooms]);

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
                {/* My Reservations */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-400" />
                        {currentUser?.role === 'admin' ? 'All Library Bookings' : 'My Reservations'}
                    </h2>
                    {myReservations.length === 0 ? (
                        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 text-center">
                            <p className="text-gray-400 text-sm">
                                {currentUser?.role === 'admin' ? 'No library bookings found.' : "You haven't booked any study rooms yet."}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {myReservations.map(booking => (
                                <div
                                    key={booking.id}
                                    className="relative p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-400/20 hover:border-blue-400/40 transition-all group"
                                >
                                    <h4 className="font-bold text-white text-sm mb-1">
                                        {booking.room?.name || booking.roomId}
                                    </h4>
                                    <p className="text-xs text-gray-400 mb-2">
                                        {booking.room?.building || 'Library'}
                                        {booking.room?.floor ? ` · Floor ${booking.room.floor}` : ''}
                                    </p>
                                    {currentUser?.role === 'admin' && booking.organization && (
                                        <p className="text-xs text-blue-300 mb-1">{booking.organization}</p>
                                    )}
                                    <div className="flex items-center gap-3 text-xs text-gray-300">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-blue-400" />
                                            {booking.date}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-blue-400" />
                                            {booking.time_slot}
                                        </span>
                                    </div>

                                    {/* Edit / Delete buttons */}
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                                        <button
                                            onClick={() => setEditingBooking(booking)}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-300 text-xs font-medium transition-all border border-white/10 hover:border-blue-400/30"
                                        >
                                            <Pencil size={12} />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => setDeletingBooking(booking)}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-xs font-medium transition-all border border-white/10 hover:border-red-400/30"
                                        >
                                            <Trash2 size={12} />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
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
                                        bookingRoom?.id === room.id ? (
                                            /* Inline booking form */
                                            <div className="bg-white/10 rounded-xl p-3 border border-blue-400/30 space-y-3">
                                                <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">Confirm Reservation</p>
                                                <div className="text-xs text-gray-300 space-y-1">
                                                    <p><span className="text-gray-500">Date:</span> {selectedDate}</p>
                                                    <p><span className="text-gray-500">Time:</span> {timeOptions.find(t => t.value === startTime)?.label} – {timeOptions.find(t => t.value === endTime)?.label}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-400 mb-1">Group Size</label>
                                                    <select
                                                        value={bookingGroupSize}
                                                        onChange={(e) => setBookingGroupSize(e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-xs border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                                                    >
                                                        <option value="" className="bg-slate-800">Select</option>
                                                        {Array.from({ length: room.capacity }, (_, i) => i + 1).map(n => (
                                                            <option key={n} value={n} className="bg-slate-800">{n} {n === 1 ? 'person' : 'people'}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {currentUser?.role === 'admin' && (
                                                    <div>
                                                        <label className="block text-xs text-gray-400 mb-1">Student Name</label>
                                                        <input
                                                            type="text"
                                                            value={bookingStudentName}
                                                            onChange={(e) => setBookingStudentName(e.target.value)}
                                                            placeholder="Enter student name"
                                                            className="w-full px-3 py-2 rounded-lg bg-white/10 text-white text-xs border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400/50 placeholder-gray-500"
                                                        />
                                                    </div>
                                                )}
                                                {bookError && (
                                                    <div className="flex items-center gap-1 text-xs text-red-400">
                                                        <AlertCircle className="w-3 h-3" /> {bookError}
                                                    </div>
                                                )}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleConfirmBook}
                                                        disabled={isBooking}
                                                        className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-xs transition flex items-center justify-center gap-1"
                                                    >
                                                        {isBooking ? 'Booking...' : <><Check className="w-3 h-3" /> Confirm</>}
                                                    </button>
                                                    <button
                                                        onClick={() => setBookingRoom(null)}
                                                        className="flex-1 bg-white/10 hover:bg-white/20 text-gray-300 font-medium py-2 rounded-lg text-xs transition"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleBook(room)}
                                                className="w-full bg-blue-500/20 text-blue-400 font-medium py-2 rounded-xl text-xs hover:bg-blue-500/30 transition flex items-center justify-center gap-1"
                                            >
                                                <Check className="w-3 h-3" /> Reserve
                                            </button>
                                        )
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

            {/* Edit Modal */}
            {editingBooking && (
                <EditBookingModal
                    booking={editingBooking}
                    rooms={allRooms}
                    onSave={editBooking}
                    onClose={() => setEditingBooking(null)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deletingBooking && (
                <ConfirmDeleteModal
                    booking={deletingBooking}
                    onConfirm={handleConfirmDelete}
                    onClose={() => setDeletingBooking(null)}
                    deleting={isDeleting}
                />
            )}
        </div>
    );
};

export default LibraryDashboard;
