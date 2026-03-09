import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { parse, format } from 'date-fns';
import { ArrowLeft, Check, Users, Building, Calendar, Clock, AlertCircle } from 'lucide-react';
import { validateBookingDate } from '../utils/validationUtils';
import { useBookings } from '../context/BookingContext';
import { searchRooms } from '../utils/bookingUtils';
import { useAuth } from '../context/AuthContext';
import Navbar from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const BookingPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { addBooking, fetchBookings, rooms: roomsData = [] } = useBookings();
    const { currentUser } = useAuth();
    const prefilled = location.state?.prefilled || {};

    const [formData, setFormData] = useState({
        orgName: currentUser?.role === 'org' ? currentUser.name : '',
        eventName: '',
        occupancy: '',
        date: prefilled.date || '',
        startTime: prefilled.startTime || '',
        endTime: prefilled.endTime || '',
        room: prefilled.room || ''
    });

    const [error, setError] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch bookings when date changes to ensure latest data for conflict checking
    useEffect(() => {
        if (formData.date) fetchBookings(formData.date);
    }, [formData.date, fetchBookings]);

    const selectedRoom = roomsData.find(r => r.id === formData.room);

    // Live date/time validation
    const todayStr = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 5);

    const dateError = formData.date && formData.date < todayStr
        ? 'Cannot select a past date.'
        : null;

    const pastTimeError = !dateError && formData.date === todayStr && formData.startTime && formData.startTime < nowTime
        ? 'Cannot select a time that has already passed today.'
        : null;

    const timeError = formData.startTime && formData.endTime && formData.startTime >= formData.endTime
        ? 'End time must be after start time.'
        : null;

    const validationError = dateError || pastTimeError || timeError;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (name === 'date') setError(null);
        if (name === 'startTime' || name === 'endTime') {
            setError(null);
            setSuggestions([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuggestions([]);

        if (!formData.room) {
            setError("No room selected. Please select a room from the Search page.");
            return;
        }

        const parsedDate = parse(formData.date, 'yyyy-MM-dd', new Date());
        const dateError = validateBookingDate(parsedDate);
        if (dateError) {
            setError(dateError);
            return;
        }

        // Fetch latest bookings before conflict check
        const latestBookings = await fetchBookings(formData.date);

        const conflictCheck = searchRooms({
            date: parsedDate,
            startTime: formData.startTime,
            endTime: formData.endTime,
        }, roomsData, latestBookings);

        const targetRoom = conflictCheck.find(r => r.id === formData.room);
        const isRoomAvailable = targetRoom && targetRoom.isAvailable;

        if (!isRoomAvailable) {
            setError("Room taken at this time.");

            if (selectedRoom) {
                const alternatives = searchRooms({
                    date: new Date(formData.date),
                    startTime: formData.startTime,
                    endTime: formData.endTime,
                    building: selectedRoom.building
                }, roomsData, latestBookings);

                setSuggestions(alternatives);
            }
            return;
        }

        setIsSubmitting(true);

        const newBooking = {
            roomId: formData.room,
            date: formData.date,
            time_slot: `${format(new Date(`2000-01-01T${formData.startTime}`), 'hh:mm a')} - ${format(new Date(`2000-01-01T${formData.endTime}`), 'hh:mm a')}`,
            startTime: formData.startTime,
            endTime: formData.endTime,
            organization: currentUser?.role === 'student' ? (currentUser.name || 'Individual Student') : formData.orgName,
            eventName: currentUser?.role === 'student' ? 'Study Session' : formData.eventName,
            groupSize: formData.occupancy || null,
        };

        try {
            await addBooking(newBooking);
            console.log('Booking Submitted:', newBooking);
            navigate(currentUser?.role === 'student' ? '/library' : '/');
        } catch (err) {
            if (err.status === 409) {
                setError(err.message);
            } else {
                setError('Something went wrong. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar
                subtitle="Book a Room"
                username={currentUser?.name || 'User'}
            />

            <main className="container mx-auto px-4 py-12 max-w-3xl">
                <Card className="overflow-hidden shadow-md">
                    {/* Green banner header */}
                    <div className="bg-primary px-8 py-8 text-primary-foreground">
                        <h1 className="text-3xl font-bold mb-2">Book a Room</h1>
                        <p className="text-primary-foreground/80">
                            {currentUser?.role === 'student'
                                ? 'Reserve a study space.'
                                : 'Reserve a space for your organization or event.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg">
                                <div className="flex items-start gap-3 mb-2">
                                    <AlertCircle className="shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <p className="font-bold">Validation Error</p>
                                        <p className="text-sm">{error}</p>
                                    </div>
                                </div>
                                {suggestions.length > 0 && (
                                    <div className="mt-3 pl-8">
                                        <p className="text-sm font-semibold mb-1">Other available rooms in {selectedRoom?.building}:</p>
                                        <ul className="list-disc pl-4 text-sm space-y-1">
                                            {suggestions.map(room => (
                                                <li key={room.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, room: room.id }))}
                                                        className="underline hover:opacity-80 font-medium"
                                                    >
                                                        {room.name}
                                                    </button>
                                                    <span className="opacity-80 ml-2">({room.capacity} seats, {room.type})</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Pre-filled Room Info */}
                        {selectedRoom && (
                            <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-primary font-bold uppercase tracking-wider">Selected Room</p>
                                    <p className="text-lg font-semibold text-foreground">{selectedRoom.name}</p>
                                    <p className="text-sm text-muted-foreground">{selectedRoom.building}</p>
                                </div>
                                <Link to="/search" className="text-sm text-primary font-medium hover:underline">Change</Link>
                            </div>
                        )}

                        {/* Section 1: Event / Booking Details */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2 flex items-center gap-2">
                                <Building size={20} className="text-primary" />
                                {currentUser?.role === 'student' ? 'Booking Details' : 'Event Details'}
                            </h2>

                            {currentUser?.role !== 'student' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label className="mb-2">Organization Name</Label>
                                        <input
                                            type="text"
                                            name="orgName"
                                            required
                                            readOnly={currentUser?.role === 'org'}
                                            className={`w-full px-4 py-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${currentUser?.role === 'org' ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}`}
                                            placeholder="e.g. Society of Engineers"
                                            value={formData.orgName}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div>
                                        <Label className="mb-2">Event Name</Label>
                                        <input
                                            type="text"
                                            name="eventName"
                                            required
                                            className="w-full px-4 py-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            placeholder="e.g. Weekly Meeting"
                                            value={formData.eventName}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <Label className="mb-2">Expected Attendance</Label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-3.5 text-muted-foreground pointer-events-none" size={18} />
                                    <input
                                        type="number"
                                        name="occupancy"
                                        required
                                        min="1"
                                        placeholder="e.g. 25"
                                        className="w-full pl-10 pr-4 py-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={formData.occupancy}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Time & Date */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2 flex items-center gap-2">
                                <Clock size={20} className="text-primary" />
                                Date & Time
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <Label className="mb-2">Date</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3.5 text-muted-foreground" size={18} />
                                        <input
                                            type="date"
                                            name="date"
                                            required
                                            className="w-full pl-10 pr-4 py-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            value={formData.date}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label className="mb-2">Start Time</Label>
                                    <input
                                        type="time"
                                        name="startTime"
                                        required
                                        className="w-full px-4 py-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={formData.startTime}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <Label className="mb-2">End Time</Label>
                                    <input
                                        type="time"
                                        name="endTime"
                                        required
                                        className="w-full px-4 py-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={formData.endTime}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Live validation warning */}
                        {validationError && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-lg text-sm flex items-center gap-2">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{validationError}</span>
                            </div>
                        )}

                        <div className="pt-6">
                            <Button
                                type="submit"
                                size="lg"
                                disabled={isSubmitting || !!validationError}
                                className="w-full text-base py-6"
                            >
                                {isSubmitting ? (
                                    <span className="animate-pulse">Processing...</span>
                                ) : (
                                    <>
                                        <Check size={20} className="mr-2" />
                                        Confirm Booking
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Card>
            </main>
        </div>
    );
};

export default BookingPage;
