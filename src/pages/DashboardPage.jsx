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
import Navbar from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Search, BookOpen, Pencil, Trash2, Eye, X, MapPin, Clock, Users as UsersIcon, Tag, ScrollText, BarChart2 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useBookings } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { useActivityLog } from '../context/ActivityLogContext';

// Unread badge for Activity Log button
const UnreadBadge = () => {
    const { unreadCount } = useActivityLog();
    if (unreadCount === 0) return null;
    return (
        <span className="absolute -top-1.5 -right-1.5 bg-destructive text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
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

    // Navbar actions — admin sees nav links
    const navActions = currentUser?.role === 'admin' ? (
        <>
            <Link to="/org-stats">
                <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10">
                    <BarChart2 className="w-4 h-4 mr-1" /> Stats
                </Button>
            </Link>
            <Link to="/activity-log" className="relative">
                <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10">
                    <ScrollText className="w-4 h-4 mr-1" /> Log
                </Button>
                <UnreadBadge />
            </Link>
            <Link to="/library">
                <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10">
                    <BookOpen className="w-4 h-4 mr-1" /> Library
                </Button>
            </Link>
        </>
    ) : null;

    return (
        <div className="min-h-screen bg-background">
            <Navbar
                subtitle="Event Space Dashboard"
                username={currentUser?.name || 'Admin'}
                actions={
                    <>
                        {navActions}
                        <Link to="/map">
                            <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10">
                                <Search className="w-4 h-4 mr-1" /> Map
                            </Button>
                        </Link>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate('/search')}
                        >
                            <Plus className="w-4 h-4 mr-1" /> Book a Room
                        </Button>
                    </>
                }
            />

            <main className="container mx-auto px-4 py-8">
                {/* My Upcoming Events — org and admin */}
                {(currentUser?.role === 'org' || currentUser?.role === 'admin') && (
                    <section className="mb-8">
                        <h2 className="text-xl font-semibold text-foreground mb-4">
                            {currentUser?.role === 'admin' ? 'All Upcoming Events' : 'My Upcoming Events'}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {upcomingEvents.map((b, i) => (
                                <Card
                                    key={b.id || i}
                                    className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all border-l-4 border-l-primary"
                                    onClick={() => setSelectedEvent(b)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h3 className="font-semibold text-foreground">{b.room_name}</h3>
                                                <p className="text-sm text-primary font-medium">{b.date}</p>
                                            </div>
                                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                                {b.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{b.organization}</p>
                                        <p className="text-sm text-muted-foreground">{b.time_slot}</p>

                                        {/* Action buttons */}
                                        <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1"
                                                onClick={(e) => { e.stopPropagation(); setSelectedEvent(b); }}
                                            >
                                                <Eye size={13} className="mr-1" /> View
                                            </Button>
                                            {canModify(b) && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="flex-1"
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(b); }}
                                                    >
                                                        <Pencil size={13} className="mr-1" /> Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="flex-1 text-destructive hover:text-destructive"
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(b); }}
                                                    >
                                                        <Trash2 size={13} className="mr-1" /> Delete
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {upcomingEvents.length === 0 && (
                                <Card className="col-span-1 md:col-span-2 lg:col-span-3">
                                    <CardContent className="py-8 text-center">
                                        <p className="text-muted-foreground">
                                            No upcoming events found{currentUser?.role === 'org' ? ' for your organization' : ''}.
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </section>
                )}

                <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                            <Calendar className="text-primary" size={22} />
                            Room Schedule
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm">View and manage room reservations across campus.</p>
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
                            <span className="w-3 h-3 bg-primary/10 border border-primary/20 rounded-full mr-2"></span>
                            <span className="text-muted-foreground">Available</span>
                        </div>
                        <div className="flex items-center">
                            <span className="w-3 h-3 bg-primary rounded-full mr-2 shadow-sm"></span>
                            <span className="text-muted-foreground">Booked</span>
                        </div>
                        <div className="flex items-center">
                            <span className="w-3 h-3 bg-destructive rounded-full mr-2 shadow-sm"></span>
                            <span className="text-muted-foreground">Conflict</span>
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
                    <div className="bg-background rounded-lg shadow-lg border border-border max-w-lg w-full overflow-hidden animate-in fade-in-0 zoom-in-95" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-border">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-foreground">Event Details</h3>
                                <button onClick={() => setSelectedEvent(null)} className="text-muted-foreground hover:text-foreground transition p-1 rounded-md hover:bg-muted">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Event Name */}
                            <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Event Name</p>
                                <p className="text-lg font-semibold text-foreground">{selectedEvent.eventName || 'Untitled Event'}</p>
                            </div>

                            {/* Org & Room */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Tag size={16} className="text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Organization</p>
                                        <p className="text-sm font-semibold text-foreground">{selectedEvent.organization || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <MapPin size={16} className="text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Room</p>
                                        <p className="text-sm font-semibold text-foreground">{selectedEvent.room_name || 'Unknown Room'}</p>
                                        <p className="text-xs text-muted-foreground">{selectedEvent.building || ''}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Date, Time, Capacity */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Calendar size={16} className="text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Date</p>
                                        <p className="text-sm font-semibold text-foreground">{selectedEvent.date}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Clock size={16} className="text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Time</p>
                                        <p className="text-sm font-semibold text-foreground">{selectedEvent.time_slot}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                                        <UsersIcon size={16} className="text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Attendance</p>
                                        <p className="text-sm font-semibold text-foreground">{selectedEvent.groupSize || selectedEvent.capacity || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Status & Source */}
                            <div className="flex items-center gap-3 pt-3 border-t border-border">
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{selectedEvent.status}</Badge>
                                {selectedEvent.system_source && (
                                    <Badge variant="secondary" className="font-mono">{selectedEvent.system_source}</Badge>
                                )}
                            </div>

                            {/* Actions */}
                            {canModify(selectedEvent) && (
                                <div className="flex gap-3 pt-3 border-t border-border">
                                    <Button
                                        className="flex-1"
                                        onClick={() => { handleEdit(selectedEvent); setSelectedEvent(null); }}
                                    >
                                        <Pencil size={14} className="mr-1" /> Edit Booking
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex-1 text-destructive hover:text-destructive"
                                        onClick={() => { handleDelete(selectedEvent); setSelectedEvent(null); }}
                                    >
                                        <Trash2 size={14} className="mr-1" /> Delete
                                    </Button>
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
