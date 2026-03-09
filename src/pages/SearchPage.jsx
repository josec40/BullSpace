import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Users, Calendar, Clock, ArrowRight, Filter, BookOpen, AlertCircle } from 'lucide-react';
import { validateBookingDate } from '../utils/validationUtils';
import { parse } from 'date-fns';
import { searchRooms } from '../utils/bookingUtils';
import { useBookings } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

// Stock images per room type
const DEFAULT_IMAGES = {
    'Study Room': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'Classroom': 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80',
    'Conference Room': 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&q=80',
    'Computer Lab': 'https://images.unsplash.com/photo-1517502884422-41eae6c63f6e?w=800&q=80',
    'Group Study Room': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'Quiet Study Room': 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&q=80',
    'Sports Facility': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
};

const SearchPage = () => {
    const navigate = useNavigate();
    const { bookings, rooms: allRooms = [], fetchBookings } = useBookings();
    const { currentUser } = useAuth();

    // Filter rooms by role
    const roomsData = allRooms.filter(r => {
        if (currentUser?.role === 'student') return r.building === 'Library';
        if (currentUser?.role === 'org' || currentUser?.role === 'admin') return r.building !== 'Library';
        return true;
    });

    const [filters, setFilters] = useState({
        building: '',
        type: '',
        capacity: '',
        date: '',
        startTime: '',
        endTime: ''
    });

    const generateTimeOptions = () => {
        const options = [];
        for (let i = 8; i <= 20; i++) {
            for (let j = 0; j < 60; j += 30) {
                if (i === 20 && j > 0) continue;
                const hour = i.toString().padStart(2, '0');
                const minute = j.toString().padStart(2, '0');
                const displayHour = i % 12 || 12;
                const ampm = i < 12 ? 'AM' : 'PM';
                options.push({ value: `${hour}:${minute}`, label: `${displayHour}:${minute} ${ampm}` });
            }
        }
        return options;
    };
    const timeOptions = generateTimeOptions();

    const [results, setResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        if (name === 'date') setError(null);
    };

    const handleSearch = async (e) => {
        e.preventDefault();

        if (!filters.date || !filters.startTime || !filters.endTime) {
            setError("Please select a date and time range.");
            return;
        }

        const parsedSearchDate = parse(filters.date, 'yyyy-MM-dd', new Date());

        const dateError = validateBookingDate(parsedSearchDate);
        if (dateError) {
            setError(dateError);
            return;
        }

        // Fetch latest bookings for conflict accuracy
        const latestBookings = await fetchBookings(filters.date);

        const foundRooms = searchRooms({
            ...filters,
            date: parsedSearchDate
        }, roomsData, latestBookings || bookings);

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

    // Determine subtitle based on role
    const subtitle = currentUser?.role === 'student'
        ? 'Library Rooms'
        : currentUser?.role === 'admin'
            ? 'Administration'
            : 'Organization Portal';

    return (
        <div className="min-h-screen bg-background">
            <Navbar subtitle={subtitle} username={currentUser?.name || 'User'} />

            <main className="container mx-auto p-6 max-w-7xl">
                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-foreground">Find a Room</h2>
                    <p className="text-muted-foreground mt-1">Search for available spaces across campus.</p>
                </div>

                {/* Search Form */}
                <Card className="mb-8">
                    <CardContent className="pt-6">
                        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Building */}
                            <div>
                                <Label className="mb-2 flex items-center gap-2">
                                    <MapPin size={16} className="text-primary" /> Building
                                </Label>
                                <select
                                    name="building"
                                    value={filters.building}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="">Any Building</option>
                                    <option value="Engineering Building II">Engineering Building II</option>
                                    <option value="Marshall Student Center">Marshall Student Center</option>
                                    <option value="Interdisciplinary Sciences">Interdisciplinary Sciences</option>
                                    {currentUser?.role !== 'org' && <option value="Library">Library</option>}
                                    <option value="Recreation Center">Recreation Center</option>
                                </select>
                            </div>

                            {/* Type */}
                            <div>
                                <Label className="mb-2 flex items-center gap-2">
                                    <BookOpen size={16} className="text-primary" /> Room Type
                                </Label>
                                <select
                                    name="type"
                                    value={filters.type}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="">Any Type</option>
                                    <option value="Conference Room">Conference Room</option>
                                    <option value="Classroom">Classroom</option>
                                    <option value="Computer Lab">Computer Lab</option>
                                </select>
                            </div>

                            {/* Capacity */}
                            <div>
                                <Label className="mb-2 flex items-center gap-2">
                                    <Users size={16} className="text-primary" /> Capacity
                                </Label>
                                <select
                                    name="capacity"
                                    value={filters.capacity}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="">Any Capacity</option>
                                    <option value="10-20">10-20 People</option>
                                    <option value="20-40">20-40 People</option>
                                    <option value="50+">50+ People</option>
                                </select>
                            </div>

                            {/* Date */}
                            <div>
                                <Label className="mb-2 flex items-center gap-2">
                                    <Calendar size={16} className="text-primary" /> Date
                                </Label>
                                <input
                                    type="date"
                                    name="date"
                                    value={filters.date}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                            </div>

                            {/* Time Range */}
                            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="mb-2 flex items-center gap-2">
                                        <Clock size={16} className="text-primary" /> From
                                    </Label>
                                    <select
                                        name="startTime"
                                        value={filters.startTime}
                                        onChange={handleChange}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        <option value="">Select Time</option>
                                        {timeOptions.map(opt => <option key={`start-${opt.value}`} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label className="mb-2 flex items-center gap-2">
                                        <Clock size={16} className="text-primary" /> Until
                                    </Label>
                                    <select
                                        name="endTime"
                                        value={filters.endTime}
                                        onChange={handleChange}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        <option value="">Select Time</option>
                                        {timeOptions.map(opt => <option key={`end-${opt.value}`} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="md:col-span-2 lg:col-span-3 flex items-end justify-end">
                                <Button type="submit" size="lg">
                                    <Search className="mr-2 h-5 w-5" />
                                    Search Rooms
                                </Button>
                            </div>
                        </form>
                        {error && (
                            <div className="mt-4 p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm font-medium flex items-center gap-2">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Results */}
                {hasSearched && (
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                            <Filter size={20} className="text-primary" />
                            Search Results ({results.length})
                        </h3>

                        {results.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Search size={32} className="text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground">No rooms found</h3>
                                    <p className="text-muted-foreground">Try adjusting your filters or time range.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {results.map(room => {
                                    const imageUrl = DEFAULT_IMAGES[room.type] || DEFAULT_IMAGES['Classroom'];
                                    return (
                                        <Card
                                            key={room.id}
                                            className={`overflow-hidden hover:shadow-md transition-shadow ${!room.isAvailable ? 'border-destructive/30 bg-destructive/5' : ''}`}
                                        >
                                            <div className="relative h-40 overflow-hidden">
                                                <img
                                                    src={imageUrl}
                                                    alt={room.name}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute top-2 right-2">
                                                    <Badge variant={room.isAvailable ? 'default' : 'destructive'}>
                                                        {room.isAvailable ? 'Available' : 'Unavailable'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <CardContent className="p-5 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h4 className={`text-lg font-bold ${room.isAvailable ? 'text-foreground' : 'text-destructive'}`}>
                                                                {room.name}
                                                            </h4>
                                                            <p className={`text-sm ${room.isAvailable ? 'text-muted-foreground' : 'text-destructive/70'}`}>
                                                                {room.building}
                                                            </p>
                                                        </div>
                                                        <Badge variant="secondary">
                                                            {room.type}
                                                        </Badge>
                                                    </div>
                                                    <div className={`flex items-center gap-4 text-sm mb-4 ${room.isAvailable ? 'text-muted-foreground' : 'text-destructive/70'}`}>
                                                        <span className="flex items-center gap-1"><Users size={14} /> {room.capacity} Seats</span>
                                                        <span className="flex items-center gap-1"><BookOpen size={14} /> {room.features.join(', ')}</span>
                                                    </div>
                                                    {!room.isAvailable && room.conflict && (
                                                        <div className="text-sm font-bold text-destructive mb-4 flex items-center gap-1">
                                                            <AlertCircle size={16} /> Taken ({room.conflict.time_slot})
                                                        </div>
                                                    )}
                                                </div>
                                                <Button
                                                    onClick={() => handleBook(room)}
                                                    disabled={!room.isAvailable}
                                                    variant={room.isAvailable ? 'default' : 'destructive'}
                                                    className="w-full mt-2"
                                                >
                                                    {room.isAvailable ? 'Book This Room' : 'Unavailable'} <ArrowRight className="ml-2 h-4 w-4" />
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default SearchPage;
