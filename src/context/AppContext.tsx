/**
 * AppContext — Adapter that bridges existing contexts (Auth, Booking, ActivityLog)
 * to the interface expected by NEW_UI components.
 *
 * The NEW_UI pages call `useAppContext()` and expect a unified API with:
 *   reservations, rooms, cancelReservation, addReservation,
 *   updateReservation, addRoom, updateRoom, deleteRoom, logout
 */
import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useBookings } from './BookingContext';
import { useActivityLog } from './ActivityLogContext';
import type { Room, Reservation } from '@/lib/mockData';

// Default images for rooms (by type) when the original data has none
const DEFAULT_IMAGES: Record<string, string> = {
    'Study Room': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'Classroom': 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80',
    'Conference Room': 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=800&q=80',
    'Computer Lab': 'https://images.unsplash.com/photo-1517502884422-41eae6c63f6e?w=800&q=80',
    'Group Study Room': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'Quiet Study Room': 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&q=80',
    'Sports Facility': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
};

// ── Helpers: parse legacy time_slot → startTime/endTime ──────────
function parse12to24(t: string): string {
    // "10:00 AM" → "10:00", "1:00 PM" → "13:00"
    const match = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return t; // already 24h or unparseable
    let h = parseInt(match[1], 10);
    const m = match[2];
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m}`;
}

function parseTimeSlot(slot: string): { startTime: string; endTime: string } {
    const parts = slot.split(/\s*-\s*/);
    if (parts.length === 2) {
        return {
            startTime: parse12to24(parts[0]),
            endTime: parse12to24(parts[1]),
        };
    }
    return { startTime: '00:00', endTime: '23:59' };
}

// ── Context types ────────────────────────────────────
interface AppContextValue {
    rooms: Room[];
    reservations: Reservation[];
    cancelReservation: (id: string) => void;
    addReservation: (data: Omit<Reservation, 'id' | 'status'>) => void;
    updateReservation: (id: string, data: Partial<Reservation>) => void;
    addRoom: (data: Omit<Room, 'id'>) => void;
    updateRoom: (id: string, data: Partial<Room>) => void;
    deleteRoom: (id: string) => void;
    logout: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useAppContext must be used within AppContextProvider');
    return ctx;
}

// ── Provider ─────────────────────────────────────────
export function AppContextProvider({ children }: { children: React.ReactNode }) {
    const { currentUser, logout } = useAuth();
    const {
        rooms: rawRooms,
        bookings: rawBookings,
        addBooking,
        editBooking,
        removeBooking,
    } = useBookings();

    // ── Local room additions (room CRUD not in original BookingContext) ──
    const [localRooms, setLocalRooms] = useState<Room[]>([]);
    const [deletedRoomIds, setDeletedRoomIds] = useState<Set<string>>(new Set());
    const [roomOverrides, setRoomOverrides] = useState<Record<string, Partial<Room>>>({});

    // ── Transform rooms: features→amenities, add imageUrl ──
    const rooms = useMemo<Room[]>(() => {
        const mapped = rawRooms
            .filter((r: any) => !deletedRoomIds.has(r.id))
            .map((r: any): Room => {
                const override = roomOverrides[r.id] || {};
                return {
                    id: r.id,
                    name: override.name ?? r.name,
                    building: override.building ?? r.building,
                    capacity: override.capacity ?? r.capacity,
                    type: override.type ?? r.type,
                    amenities: override.amenities ?? r.features ?? r.amenities ?? [],
                    imageUrl: override.imageUrl ?? r.imageUrl ?? DEFAULT_IMAGES[r.type] ?? DEFAULT_IMAGES['Classroom'],
                    floor: r.floor,
                };
            });
        return [...mapped, ...localRooms];
    }, [rawRooms, localRooms, deletedRoomIds, roomOverrides]);

    // ── Transform bookings → reservations ──
    const reservations = useMemo<Reservation[]>(() => {
        return rawBookings.map((b: any): Reservation => {
            // Handle both legacy time_slot format and new startTime/endTime format
            let startTime = b.startTime;
            let endTime = b.endTime;
            if (!startTime && b.time_slot) {
                const parsed = parseTimeSlot(b.time_slot);
                startTime = parsed.startTime;
                endTime = parsed.endTime;
            }

            // Normalise status: 'Booked' → 'active', 'Available' → 'cancelled'
            let status: 'active' | 'cancelled' = 'active';
            if (b.status === 'cancelled' || b.status === 'Available') {
                status = 'cancelled';
            }

            return {
                id: String(b.id),
                roomId: b.roomId,
                userId: b.userId ?? b.bookedBy ?? b.organization ?? 'unknown',
                date: b.date,
                startTime: startTime ?? '00:00',
                endTime: endTime ?? '23:59',
                title: b.title ?? b.eventName ?? b.organization ?? 'Booking',
                groupSize: b.groupSize ?? b.group_size ?? 0,
                status,
            };
        });
    }, [rawBookings]);

    // ── Cancelling: maps to removeBooking ──
    const cancelReservation = useCallback((id: string) => {
        const res = rawBookings.find((b: any) => String(b.id) === id);
        if (res) {
            removeBooking(res.id, res.roomId, res.date);
        }
    }, [rawBookings, removeBooking]);

    // ── Adding reservation ──
    const addReservation = useCallback((data: Omit<Reservation, 'id' | 'status'>) => {
        addBooking({
            roomId: data.roomId,
            date: data.date,
            startTime: data.startTime,
            endTime: data.endTime,
            organization: data.title,
            eventName: data.title,
            title: data.title,
            groupSize: data.groupSize,
            userId: data.userId,
        });
    }, [addBooking]);

    // ── Updating reservation ──
    const updateReservation = useCallback((id: string, data: Partial<Reservation>) => {
        const numericId = isNaN(Number(id)) ? id : Number(id);
        editBooking(numericId, {
            ...(data.date && { date: data.date }),
            ...(data.startTime && { startTime: data.startTime }),
            ...(data.endTime && { endTime: data.endTime }),
            ...(data.groupSize != null && { groupSize: data.groupSize }),
            ...(data.title && { organization: data.title, eventName: data.title }),
        });
    }, [editBooking]);

    // ── Room CRUD (local) ──
    const addRoom = useCallback((data: Omit<Room, 'id'>) => {
        const newRoom: Room = {
            ...data,
            id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        };
        setLocalRooms(prev => [...prev, newRoom]);
    }, []);

    const updateRoom = useCallback((id: string, data: Partial<Room>) => {
        // If it's a locally-added room, update it directly
        setLocalRooms(prev => {
            const idx = prev.findIndex(r => r.id === id);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], ...data };
                return updated;
            }
            return prev;
        });
        // For original rooms, store overrides
        setRoomOverrides(prev => ({
            ...prev,
            [id]: { ...(prev[id] || {}), ...data },
        }));
    }, []);

    const deleteRoom = useCallback((id: string) => {
        setLocalRooms(prev => prev.filter(r => r.id !== id));
        setDeletedRoomIds(prev => new Set([...prev, id]));
    }, []);

    const value = useMemo<AppContextValue>(() => ({
        rooms,
        reservations,
        cancelReservation,
        addReservation,
        updateReservation,
        addRoom,
        updateRoom,
        deleteRoom,
        logout,
    }), [rooms, reservations, cancelReservation, addReservation, updateReservation, addRoom, updateRoom, deleteRoom, logout]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}
