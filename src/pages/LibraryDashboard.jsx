import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Users, Calendar, Search, Check, AlertCircle, Pencil, Trash2, MapPin } from 'lucide-react';
import { format, parse } from 'date-fns';
import { useBookings } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { searchRooms } from '../utils/bookingUtils';
import { validateBookingDate } from '../utils/validationUtils';
import EditBookingModal from '../components/EditBookingModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import Navbar from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

const FLOOR_LABELS = {
    3: '3rd Floor — Group Study',
    4: '4th Floor — Group Study',
    5: '5th Floor — Quiet Study',
};

// Stock images per room type
const DEFAULT_IMAGES = {
    'Study Room': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'Group Study Room': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'Quiet Study Room': 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&q=80',
    'Conference Room': 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&q=80',
    'Classroom': 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80',
    'Computer Lab': 'https://images.unsplash.com/photo-1517502884422-41eae6c63f6e?w=800&q=80',
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

    // My reservations
    const myReservations = useMemo(() => {
        if (!currentUser) return [];
        const todayStr = format(new Date(), 'yyyy-MM-dd');

        if (currentUser.role === 'admin') {
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

    // Navbar actions for admin
    const navActions = currentUser?.role === 'admin' ? (
        <Link to="/">
            <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10">
                Event Spaces →
            </Button>
        </Link>
    ) : null;

    return (
        <div className="min-h-screen bg-background">
            <Navbar
                subtitle="Library Study Rooms"
                username={currentUser?.name || 'Student'}
                actions={navActions}
            />

            <main className="container mx-auto px-4 py-6 max-w-6xl">
                {/* ── My Reservations ────────────────────── */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        {currentUser?.role === 'admin' ? 'All Library Bookings' : 'My Reservations'}
                    </h2>
                    {myReservations.length === 0 ? (
                        <Card>
                            <CardContent className="py-8 text-center">
                                <p className="text-muted-foreground">
                                    {currentUser?.role === 'admin' ? 'No library bookings found.' : "You haven't booked any study rooms yet."}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {myReservations.map(booking => (
                                <Card key={booking.id} className="border-l-4 border-l-primary">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-semibold text-foreground">
                                                {booking.room?.name || booking.roomId}
                                            </h3>
                                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                                                Booked
                                            </Badge>
                                        </div>
                                        <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                                            <p className="flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {booking.room?.building || 'Library'}
                                                {booking.room?.floor ? ` · Floor ${booking.room.floor}` : ''}
                                            </p>
                                            {currentUser?.role === 'admin' && booking.organization && (
                                                <p className="flex items-center gap-1.5 text-primary font-medium">
                                                    <Users className="w-3.5 h-3.5" />
                                                    {booking.organization}
                                                </p>
                                            )}
                                            <p className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5" /> {booking.date}
                                            </p>
                                            <p className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" /> {booking.time_slot}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingBooking(booking)}>
                                                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                                            </Button>
                                            <Button size="sm" variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={() => setDeletingBooking(booking)}>
                                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>

                {/* ── Search Bar ─────────────────────────── */}
                <Card className="mb-8">
                    <CardContent className="pt-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Search className="w-5 h-5 text-primary" /> Find an Available Room
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <Label className="mb-2 flex items-center gap-2">
                                    <Calendar size={14} className="text-primary" /> Date
                                </Label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => { setSelectedDate(e.target.value); setSearchResults(null); }}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                            </div>
                            <div>
                                <Label className="mb-2 flex items-center gap-2">
                                    <Clock size={14} className="text-primary" /> From
                                </Label>
                                <select
                                    value={startTime}
                                    onChange={(e) => { setStartTime(e.target.value); setSearchResults(null); }}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="">Select</option>
                                    {timeOptions.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label className="mb-2 flex items-center gap-2">
                                    <Clock size={14} className="text-primary" /> Until
                                </Label>
                                <select
                                    value={endTime}
                                    onChange={(e) => { setEndTime(e.target.value); setSearchResults(null); }}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="">Select</option>
                                    {timeOptions.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <Button
                                    onClick={handleSearch}
                                    disabled={!selectedDate || !startTime || !endTime}
                                    className="w-full"
                                >
                                    <Search className="w-4 h-4 mr-2" /> Search
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Search Results ─────────────────────── */}
                {searchResults && (
                    <section className="mb-8">
                        <h3 className="text-lg font-semibold text-foreground mb-4">
                            {searchResults.filter(r => r.isAvailable).length} rooms available
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {searchResults.map(room => {
                                const imageUrl = DEFAULT_IMAGES[room.type] || DEFAULT_IMAGES['Study Room'];
                                return (
                                    <Card
                                        key={room.id}
                                        className={`overflow-hidden transition-all ${room.isAvailable
                                            ? 'hover:shadow-md hover:border-primary/30'
                                            : 'opacity-75 border-destructive/30'
                                            }`}
                                    >
                                        {/* Room Image */}
                                        <div className="relative h-36 overflow-hidden">
                                            <img
                                                src={imageUrl}
                                                alt={room.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute top-2 right-2">
                                                <Badge variant={room.isAvailable ? 'default' : 'destructive'}>
                                                    {room.isAvailable ? 'Available' : 'Taken'}
                                                </Badge>
                                            </div>
                                        </div>

                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-semibold text-foreground">{room.name}</h4>
                                                    <p className="text-xs text-muted-foreground">Floor {room.floor}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                                                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {room.capacity}</span>
                                                <span className="capitalize">{room.type}</span>
                                            </div>

                                            {room.isAvailable ? (
                                                bookingRoom?.id === room.id ? (
                                                    /* Inline booking form */
                                                    <div className="bg-primary/5 rounded-lg p-3 border border-primary/20 space-y-3">
                                                        <p className="text-xs font-bold text-primary uppercase tracking-wider">Confirm Reservation</p>
                                                        <div className="text-xs text-muted-foreground space-y-1">
                                                            <p><span className="font-medium">Date:</span> {selectedDate}</p>
                                                            <p><span className="font-medium">Time:</span> {timeOptions.find(t => t.value === startTime)?.label} – {timeOptions.find(t => t.value === endTime)?.label}</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-foreground mb-1">Group Size</label>
                                                            <select
                                                                value={bookingGroupSize}
                                                                onChange={(e) => setBookingGroupSize(e.target.value)}
                                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                            >
                                                                <option value="">Select</option>
                                                                {Array.from({ length: room.capacity }, (_, i) => i + 1).map(n => (
                                                                    <option key={n} value={n}>{n} {n === 1 ? 'person' : 'people'}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        {currentUser?.role === 'admin' && (
                                                            <div>
                                                                <label className="block text-xs font-medium text-foreground mb-1">Student Name</label>
                                                                <input
                                                                    type="text"
                                                                    value={bookingStudentName}
                                                                    onChange={(e) => setBookingStudentName(e.target.value)}
                                                                    placeholder="Enter student name"
                                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
                                                                />
                                                            </div>
                                                        )}
                                                        {bookError && (
                                                            <div className="flex items-center gap-1 text-xs text-destructive">
                                                                <AlertCircle className="w-3 h-3" /> {bookError}
                                                            </div>
                                                        )}
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                className="flex-1"
                                                                onClick={handleConfirmBook}
                                                                disabled={isBooking}
                                                            >
                                                                {isBooking ? 'Booking...' : <><Check className="w-3 h-3 mr-1" /> Confirm</>}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="flex-1"
                                                                onClick={() => setBookingRoom(null)}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="w-full"
                                                        onClick={() => handleBook(room)}
                                                    >
                                                        <Check className="w-3.5 h-3.5 mr-1" /> Reserve
                                                    </Button>
                                                )
                                            ) : (
                                                <div className="flex items-center gap-1 text-xs text-destructive font-medium">
                                                    <AlertCircle className="w-3 h-3" /> {room.conflict?.time_slot || 'Unavailable'}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* ── Floor-by-floor overview ────────────── */}
                {!searchResults && (
                    <section>
                        <h2 className="text-xl font-semibold text-foreground mb-6">All Library Study Rooms</h2>
                        {floors.map(floor => (
                            <div key={floor} className="mb-8">
                                <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3">
                                    {FLOOR_LABELS[floor] || `Floor ${floor}`}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {roomsByFloor[floor].map(room => {
                                        const imageUrl = DEFAULT_IMAGES[room.type] || DEFAULT_IMAGES['Study Room'];
                                        return (
                                            <Card key={room.id} className="overflow-hidden hover:shadow-md hover:border-primary/30 transition-all">
                                                <div className="relative h-32 overflow-hidden">
                                                    <img
                                                        src={imageUrl}
                                                        alt={room.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute top-2 right-2">
                                                        <Badge variant="secondary" className="capitalize">
                                                            {room.type}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <CardContent className="p-3">
                                                    <h4 className="font-semibold text-foreground text-sm">{room.name}</h4>
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {room.capacity} seats</span>
                                                        {room.features?.length > 0 && (
                                                            <span>{room.features.join(', ')}</span>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </section>
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
