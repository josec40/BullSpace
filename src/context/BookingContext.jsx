import React, { createContext, useState, useContext, useEffect } from 'react';
import initialReservations from '../data/reservations.json';

const BookingContext = createContext();

export const useBookings = () => {
    const context = useContext(BookingContext);
    if (!context) {
        throw new Error('useBookings must be used within a BookingProvider');
    }
    return context;
};

export const BookingProvider = ({ children }) => {
    // Initialize state with data from JSON
    // In a real app, this would fetch from an API
    const [bookings, setBookings] = useState(initialReservations);

    const addBooking = (newBooking) => {
        // Generate a simple ID (in real app, backend does this)
        const bookingWithId = {
            ...newBooking,
            id: Math.max(...bookings.map(b => b.id), 0) + 1,
            status: 'Booked',
            system_source: 'Bullspace'
        };

        setBookings(prev => [...prev, bookingWithId]);
        return bookingWithId;
    };

    const value = {
        bookings,
        addBooking
    };

    return (
        <BookingContext.Provider value={value}>
            {children}
        </BookingContext.Provider>
    );
};
