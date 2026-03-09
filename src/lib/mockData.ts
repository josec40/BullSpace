// ── Type definitions ─────────────────────────────────
export type RoomType = 'Study Room' | 'Classroom' | 'Conference Room' | 'Computer Lab' | 'Group Study Room' | 'Quiet Study Room' | 'Sports Facility';

export interface Room {
    id: string;
    name: string;
    building: string;
    capacity: number;
    type: RoomType | string;
    amenities: string[];
    imageUrl: string;
    floor?: number;
}

export interface Reservation {
    id: string;
    roomId: string;
    userId: string;
    date: string;          // yyyy-MM-dd
    startTime: string;     // HH:mm (24h)
    endTime: string;       // HH:mm (24h)
    title: string;
    groupSize: number;
    status: 'active' | 'cancelled';
}

// ── Time helpers ─────────────────────────────────────
export const TIME_SLOTS = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
    "20:00", "20:30", "21:00", "21:30", "22:00"
];

/**
 * Format 24h "HH:mm" → 12h "h:mm AM/PM"
 */
export function formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
}
