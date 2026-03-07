import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getGridData, getEnrichedBookings } from '../utils/bookingUtils';
import DashboardGrid from '../components/DashboardGrid';
import DateNavigator from '../components/DateNavigator';
import ViewSwitcher from '../components/ViewSwitcher';
import WeekView from '../components/WeekView';
import MonthView from '../components/MonthView';
import EditBookingModal from '../components/EditBookingModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { Calendar, Plus, Search, BookOpen, Pencil, Trash2, Eye, X, MapPin, Clock, Users as UsersIcon, Tag, ScrollText } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useBookings } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { useActivityLog } from '../context/ActivityLogContext';

// Unread badge for Activity Log button
const UnreadBadge = () => {
    const { unreadCount } = useActivityLog();
    if (unreadCount === 0) return null;
    return (
        <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
        </span>
    );
};

const DashboardPage = () => {
    const navigate = useNavigate();
    const { bookings: rawBookings, rooms: roomsData = [], loadBookings, loadBookingsForRange, editBooking, removeBooking } = useBookings();
    const { currentUser, logout } = useAuth();
    const [gridData, setGridData] = useState({ rooms: [], timeHeaders: [], dayBookings: [] });
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('day');

    // Edit/Delete modal state
    const [editingBooking, setEditingBooking] = useState(null);
    const [deletingBooking, setDeletingBooking] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Event detail modal state
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Fetch bookings for the visible date range based on the current view
    useEffect(() => {
        if (currentView === 'day') {
            loadBookings(currentDate);
        } else if (currentView === 'week') {
            const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
            const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
            loadBookingsForRange(weekStart, weekEnd);
        } else if (currentView === 'month') {
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);
            loadBookingsForRange(monthStart, monthEnd);
        }
    }, [currentDate, currentView, loadBookings, loadBookingsForRange]);

    // Filter rooms by role: orgs see only event spaces, admin sees all
    const filteredRooms = useMemo(() => {
        // Both org and admin exclude Library rooms — those are on the Library dashboard
        if (currentUser?.role === 'org' || currentUser?.role === 'admin') {
            return roomsData.filter(r => r.building !== 'Library');
        }
        return roomsData;
    }, [roomsData, currentUser]);

    const bookings = useMemo(() => {
        // For event spaces dashboard, exclude library room bookings before enrichment
        const relevantBookings = (currentUser?.role === 'org' || currentUser?.role === 'admin')
            ? rawBookings.filter(b => {
                const room = roomsData.find(r => r.id === b.roomId);
                return !(room && room.building === 'Library');
            })
            : rawBookings;
        const enriched = getEnrichedBookings(relevantBookings, filteredRooms);
        if (currentUser?.role === 'org') return enriched.filter(b => b.room_name !== 'Unknown Room');
        return enriched;
    }, [rawBookings, filteredRooms, currentUser, roomsData]);

    // Upcoming events: only future bookings, filtered by role
    const upcomingEvents = useMemo(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        return bookings
            .filter(b => b.date >= todayStr)
            .filter(b => currentUser?.role === 'admin' || b.organization === currentUser?.name)
            .slice(0, 6);
    }, [bookings, currentUser]);

    useEffect(() => {
        const data = getGridData(bookings, currentDate);
        setGridData(data);
    }, [bookings, currentDate]);

    const handleDateChange = (newDate) => setCurrentDate(newDate);
    const handleViewChange = (view) => setCurrentView(view);

    // Permission check: can this user edit/delete a given booking?
    const canModify = (booking) => {
        if (currentUser?.role === 'admin') return true;
        if (currentUser?.role === 'org' && booking.organization === currentUser.name) return true;
        return false;
    };

    const handleEdit = (booking) => setEditingBooking(booking);
    const handleDelete = (booking) => setDeletingBooking(booking);

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
                        {currentUser?.role === 'admin' && (
                            <Link
                                to="/activity-log"
                                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-md flex items-center gap-2 border-2 border-amber-400 relative"
                            >
                                <ScrollText size={16} />
                                Activity Log
                                <UnreadBadge />
                            </Link>
                        )}
                        {currentUser?.role === 'admin' && (
                            <Link
                                to="/library"
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-md flex items-center gap-2 border-2 border-blue-400"
                            >
                                <BookOpen size={16} />
                                Library Rooms
                            </Link>
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
                {/* My Upcoming Events — org and admin */}
                {(currentUser?.role === 'org' || currentUser?.role === 'admin') && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">
                            {currentUser?.role === 'admin' ? 'All Upcoming Events' : 'My Upcoming Events'}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {upcomingEvents.map((b, i) => (
                                <div
                                    key={b.id || i}
                                    className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 group relative cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all"
                                    onClick={() => setSelectedEvent(b)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-bold text-slate-800 text-lg">{b.room_name}</p>
                                            <p className="text-sm text-emerald-600 font-medium">{b.date}</p>
                                        </div>
                                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-bold">
                                            {b.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">{b.organization}</p>
                                    <p className="text-sm text-slate-500 mt-1">{b.time_slot}</p>

                                    {/* Action buttons */}
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(b); }}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium transition-all border border-emerald-200"
                                        >
                                            <Eye size={13} />
                                            View Details
                                        </button>
                                        {canModify(b) && (
                                            <>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(b); }}
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 text-xs font-medium transition-all border border-slate-200 hover:border-emerald-200"
                                                >
                                                    <Pencil size={13} />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(b); }}
                                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-medium transition-all border border-slate-200 hover:border-rose-200"
                                                >
                                                    <Trash2 size={13} />
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {upcomingEvents.length === 0 && (
                                <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-slate-100 rounded-xl p-6 text-center text-slate-500">
                                    No upcoming events found{currentUser?.role === 'org' ? ' for your organization' : ''}.
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
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onEventClick={(booking) => setSelectedEvent(booking)}
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

            {/* Edit Modal */}
            {editingBooking && (
                <EditBookingModal
                    booking={editingBooking}
                    rooms={roomsData}
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

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="bg-emerald-600 px-6 py-5 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">Event Details</h3>
                            <button onClick={() => setSelectedEvent(null)} className="text-white/80 hover:text-white transition">
                                <X size={22} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Event Name */}
                            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Event Name</p>
                                <p className="text-lg font-bold text-slate-800">{selectedEvent.eventName || 'Untitled Event'}</p>
                            </div>

                            {/* Org & Room */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Tag size={16} className="text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Organization</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedEvent.organization || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <MapPin size={16} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Room</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedEvent.room_name || 'Unknown Room'}</p>
                                        <p className="text-xs text-slate-400">{selectedEvent.building || ''}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Date, Time, Capacity */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Calendar size={16} className="text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Date</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedEvent.date}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Clock size={16} className="text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Time</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedEvent.time_slot}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <UsersIcon size={16} className="text-teal-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Expected Attendance</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedEvent.groupSize || selectedEvent.capacity || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Status & Source */}
                            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                                <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-bold">{selectedEvent.status}</span>
                                {selectedEvent.system_source && (
                                    <span className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full font-mono">{selectedEvent.system_source}</span>
                                )}
                            </div>

                            {/* Actions */}
                            {canModify(selectedEvent) && (
                                <div className="flex gap-3 pt-3 border-t border-slate-100">
                                    <button
                                        onClick={() => { handleEdit(selectedEvent); setSelectedEvent(null); }}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-md"
                                    >
                                        <Pencil size={14} /> Edit Booking
                                    </button>
                                    <button
                                        onClick={() => { handleDelete(selectedEvent); setSelectedEvent(null); }}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-semibold transition-all border border-rose-200"
                                    >
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
