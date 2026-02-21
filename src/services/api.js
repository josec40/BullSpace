/**
 * API service layer — replaces local JSON imports with calls to the BullSpace API.
 *
 * Set VITE_API_URL in your .env file, e.g.:
 *   VITE_API_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com/prod
 *
 * During local development without the backend, the app falls back to
 * the local JSON files via BookingContext.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

// ─────────────────────────────────────────────────
//  Rooms
// ─────────────────────────────────────────────────

/** Fetch all rooms */
export async function fetchRooms() {
    const res = await fetch(`${API_BASE}/rooms`);
    if (!res.ok) throw new Error(`Failed to fetch rooms: ${res.status}`);
    return res.json();
}

/** Fetch a single room by ID */
export async function fetchRoom(roomId) {
    const res = await fetch(`${API_BASE}/rooms/${roomId}`);
    if (!res.ok) throw new Error(`Failed to fetch room ${roomId}: ${res.status}`);
    return res.json();
}

// ─────────────────────────────────────────────────
//  Bookings
// ─────────────────────────────────────────────────

/** Fetch all bookings for a given date (YYYY-MM-DD) */
export async function fetchBookingsByDate(date) {
    const res = await fetch(`${API_BASE}/bookings?date=${date}`);
    if (!res.ok) throw new Error(`Failed to fetch bookings: ${res.status}`);
    return res.json();
}

/** Fetch bookings for a specific room on a specific date */
export async function fetchBookingsByRoomDate(roomId, date) {
    const res = await fetch(`${API_BASE}/bookings?date=${date}&roomId=${roomId}`);
    if (!res.ok) throw new Error(`Failed to fetch bookings: ${res.status}`);
    return res.json();
}

/**
 * Create a new booking. Returns the created booking on success,
 * or throws with a conflict message on 409.
 */
export async function createBooking(bookingData) {
    const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
    });

    const body = await res.json();

    if (res.status === 409) {
        const err = new Error(body.message || 'Booking conflict');
        err.conflict = body.conflictWith;
        err.status = 409;
        throw err;
    }

    if (!res.ok) {
        throw new Error(body.message || `Failed to create booking: ${res.status}`);
    }

    return body;
}
