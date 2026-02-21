import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { parse } from 'date-fns';
import { ArrowLeft, Check, Users, Building, Calendar, Clock, AlertCircle } from 'lucide-react';
import { validateBookingDate } from '../utils/validationUtils';
import roomsData from '../data/rooms.json';
import { format } from 'date-fns';
import { useBookings } from '../context/BookingContext';
import { searchRooms } from '../utils/bookingUtils';
import { useAuth } from '../context/AuthContext';

const BookingPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { bookings, addBooking } = useBookings();
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

    const selectedRoom = roomsData.find(r => r.id === formData.room);

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

    const handleSubmit = (e) => {
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

        const conflictCheck = searchRooms({
            date: parsedDate,
            startTime: formData.startTime,
            endTime: formData.endTime,
        }, roomsData, bookings);

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
                }, roomsData, bookings);


                setSuggestions(alternatives);
            }
            return;
        }

        setIsSubmitting(true);


        const newBooking = {
            roomId: formData.room,
            date: formData.date,
            time_slot: `${format(new Date(`2000-01-01T${formData.startTime}`), 'hh:mm a')} - ${format(new Date(`2000-01-01T${formData.endTime}`), 'hh:mm a')}`,
            organization: formData.orgName,
            eventName: formData.eventName // Note: reservations.json structure might not have eventName, but we can add it
        };

        setTimeout(() => {
            addBooking(newBooking);
            console.log('Booking Submitted:', newBooking);
            setIsSubmitting(false);
            navigate('/');
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <header className="bg-white shadow-sm border-b border-slate-200">
                <div className="container mx-auto px-4 py-4">
                    <Link to="/" className="inline-flex items-center text-slate-600 hover:text-emerald-600 transition-colors font-medium">
                        <ArrowLeft size={20} className="mr-2" />
                        Back to Dashboard
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12 max-w-3xl">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                    <div className="bg-emerald-600 px-8 py-8 text-white">
                        <h1 className="text-3xl font-bold mb-2">Book a Room</h1>
                        <p className="text-emerald-50">Reserve a space for your organization or event.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        {error && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg">
                                <div className="flex items-start gap-3 mb-2">
                                    <AlertCircle className="shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <p className="font-bold">Validation Error</p>
                                        <p className="text-sm">{error}</p>
                                    </div>
                                </div>
                                {suggestions.length > 0 && (
                                    <div className="mt-3 pl-8">
                                        <p className="text-sm font-semibold mb-1 text-rose-800">Other available rooms in {selectedRoom?.building}:</p>
                                        <ul className="list-disc pl-4 text-sm space-y-1">
                                            {suggestions.map(room => (
                                                <li key={room.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, room: room.id }))}
                                                        className="underline hover:text-rose-900 font-medium"
                                                    >
                                                        {room.name}
                                                    </button>
                                                    <span className="text-rose-600/80 ml-2">({room.capacity} seats, {room.type})</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Pre-filled Room Info */}
                        {selectedRoom && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Selected Room</p>
                                    <p className="text-lg font-bold text-slate-800">{selectedRoom.name}</p>
                                    <p className="text-sm text-slate-500">{selectedRoom.building}</p>
                                </div>
                                <Link to="/search" className="text-sm text-emerald-600 font-medium hover:underline">Change</Link>
                            </div>
                        )}

                        {/* Section 1: Event Details */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                                <Building size={20} className="text-emerald-600" />
                                Event Details
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Organization Name</label>
                                    <input
                                        type="text"
                                        name="orgName"
                                        required
                                        readOnly={currentUser?.role === 'org'}
                                        className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none ${currentUser?.role === 'org' ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'border-slate-300'}`}
                                        placeholder="e.g. Society of Engineers"
                                        value={formData.orgName}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Event Name</label>
                                    <input
                                        type="text"
                                        name="eventName"
                                        required
                                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                        placeholder="e.g. Weekly Meeting"
                                        value={formData.eventName}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Expected Occupancy</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                    <input
                                        type="number"
                                        name="occupancy"
                                        required
                                        min="1"
                                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                        placeholder="Number of attendees"
                                        value={formData.occupancy}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Time & Date */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                                <Clock size={20} className="text-emerald-600" />
                                Date & Time
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                        <input
                                            type="date"
                                            name="date"
                                            required
                                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                            value={formData.date}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
                                    <input
                                        type="time"
                                        name="startTime"
                                        required
                                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                        value={formData.startTime}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">End Time</label>
                                    <input
                                        type="time"
                                        name="endTime"
                                        required
                                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                                        value={formData.endTime}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
                            >
                                {isSubmitting ? (
                                    <span className="animate-pulse">Processing...</span>
                                ) : (
                                    <>
                                        <Check size={20} />
                                        Confirm Booking
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default BookingPage;
