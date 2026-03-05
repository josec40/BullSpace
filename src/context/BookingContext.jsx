import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
    fetchRooms,
    fetchBookingsByDate,
    createBooking as apiCreateBooking,
    updateBooking as apiUpdateBooking,
    deleteBookingApi,
} from '../services/api';
import { format, eachDayOfInterval } from 'date-fns';

// Fallback data for local dev without the backend
import fallbackRooms from '../data/rooms.json';
import fallbackReservations from '../data/reservations.json';

const BookingContext = createContext();

export const useBookings = () => {
    const context = useContext(BookingContext);
    if (!context) {
        throw new Error('useBookings must be used within a BookingProvider');
    }
    return context;
};

const API_CONFIGURED = Boolean(import.meta.env.VITE_API_URL);

export const BookingProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [rooms, setRooms] = useState(fallbackRooms);
    const [bookings, setBookings] = useState(fallbackReservations);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // ── Student bookings persisted in localStorage ───
    const [studentBookings, setStudentBookings] = useState(() => {
        try {
            const saved = localStorage.getItem('bullspace_student_bookings');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    useEffect(() => {
        localStorage.setItem('bullspace_student_bookings', JSON.stringify(studentBookings));
    }, [studentBookings]);

    // ── Load rooms on mount ──────────────────────────
    useEffect(() => {
        if (!API_CONFIGURED) return;

        setLoading(true);
        fetchRooms()
            .then(setRooms)
            .catch((err) => {
                console.warn('API unavailable, using fallback rooms:', err.message);
                setRooms(fallbackRooms);
            })
            .finally(() => setLoading(false));
    }, []);

    // ── Fetch bookings for a specific date ───────────
    const loadBookings = useCallback(async (date) => {
        if (!API_CONFIGURED) return;

        const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
        setLoading(true);
        setError(null);
        try {
            const data = await fetchBookingsByDate(dateStr);
            setBookings(data);
        } catch (err) {
            console.warn('API unavailable, using fallback bookings:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Fetch bookings for a date range (for Week/Month views) ───────
    const loadBookingsForRange = useCallback(async (startDate, endDate) => {
        if (!API_CONFIGURED) return;

        setLoading(true);
        setError(null);
        try {
            const days = eachDayOfInterval({ start: startDate, end: endDate });
            const dateStrings = days.map(d => format(d, 'yyyy-MM-dd'));

            // Batch requests (7 at a time) to avoid overwhelming API/browser
            const BATCH_SIZE = 7;
            const allResults = [];
            for (let i = 0; i < dateStrings.length; i += BATCH_SIZE) {
                const batch = dateStrings.slice(i, i + BATCH_SIZE);
                const batchResults = await Promise.all(
                    batch.map(dateStr => fetchBookingsByDate(dateStr).catch(() => []))
                );
                allResults.push(...batchResults);
            }

            // Merge & deduplicate by booking id
            const merged = allResults.flat();
            const unique = [...new Map(merged.map(b => [b.id, b])).values()];
            setBookings(unique);
        } catch (err) {
            console.warn('Range fetch error:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Fetch all bookings for a date (used by BookingPage for conflict check) ──
    const fetchBookings = useCallback(async (date) => {
        if (!API_CONFIGURED) return fallbackReservations;
        try {
            const dateStr = typeof date === 'string'
                ? date
                : date instanceof Date
                    ? format(date, 'yyyy-MM-dd')
                    : format(new Date(), 'yyyy-MM-dd');
            const data = await fetchBookingsByDate(dateStr);
            setBookings(data);
            return data;
        } catch (err) {
            console.error('fetchBookings error:', err);
            return [];
        }
    }, []);


    // ── Create a new booking ─────────────────────────
    const addBooking = useCallback(async (newBooking) => {
        if (!API_CONFIGURED) {
            // Local fallback — same as the original behaviour
            const bookingWithId = {
                ...newBooking,
                id: Math.max(...bookings.map(b => b.id || 0), 0) + 1,
                status: 'Booked',
                system_source: 'BullSpace',
                bookedBy: currentUser?.name || 'Unknown',
            };
            setBookings(prev => [...prev, bookingWithId]);
            // Persist for students
            if (currentUser?.role === 'student') {
                setStudentBookings(prev => [...prev, bookingWithId]);
            }
            return bookingWithId;
        }

        // Call the real API
        const created = await apiCreateBooking({
            roomId: newBooking.roomId,
            date: newBooking.date,
            startTime: newBooking.startTime,
            endTime: newBooking.endTime,
            organization: newBooking.organization,
        });

        // Refresh bookings for that date so the UI stays in sync
        await loadBookings(newBooking.date);
        return created;
    }, [bookings, loadBookings, currentUser]);

    // ── Edit an existing booking ─────────────────────
    const editBooking = useCallback(async (bookingId, updatedData) => {
        // Helper: format "HH:mm" → "h:mm AM/PM"
        const fmt12 = (t) => {
            if (!t) return '';
            const [h, m] = t.split(':').map(Number);
            const ampm = h < 12 ? 'AM' : 'PM';
            return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
        };

        const merged = {
            ...updatedData,
            time_slot: updatedData.startTime && updatedData.endTime
                ? `${fmt12(updatedData.startTime)} - ${fmt12(updatedData.endTime)}`
                : undefined,
        };

        if (!API_CONFIGURED) {
            // Local fallback — update bookings + studentBookings in-place
            const updater = (prev) => prev.map(b =>
                b.id === bookingId ? { ...b, ...merged } : b
            );
            setBookings(updater);
            setStudentBookings(updater);
            return { id: bookingId, ...merged };
        }

        const updated = await apiUpdateBooking(bookingId, updatedData);
        await loadBookings(updatedData.date);
        return updated;
    }, [loadBookings]);

    // ── Delete a booking ─────────────────────────────
    const removeBooking = useCallback(async (bookingId, roomId, date) => {
        if (!API_CONFIGURED) {
            // Local fallback
            setBookings(prev => prev.filter(b => b.id !== bookingId));
            setStudentBookings(prev => prev.filter(b => b.id !== bookingId));
            return true;
        }

        await deleteBookingApi(bookingId, roomId, date);
        await loadBookings(date);
        return true;
    }, [loadBookings]);


    const value = {
        rooms,
        bookings,
        loading,
        error,
        loadBookings,
        loadBookingsForRange,
        addBooking,
        fetchBookings,
        studentBookings,
        editBooking,
        removeBooking,
    };

    return (
        <BookingContext.Provider value={value}>
            {children}
        </BookingContext.Provider>
    );
};

