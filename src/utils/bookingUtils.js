import { parse, isBefore, isAfter, isEqual, addMinutes, format, setHours, setMinutes, startOfDay, isSameDay, setDate, setMonth, setYear } from 'date-fns';

export const parseTimeSlot = (timeSlot) => {
    const [startStr, endStr] = timeSlot.split(' - ');
    const baseDate = new Date();
    const start = parse(startStr, 'hh:mm a', baseDate);
    const end = parse(endStr, 'hh:mm a', baseDate);
    return { start, end };
};

// Helper to join reservations with room info
export const getEnrichedBookings = (reservations, rooms) => {
    return reservations.map(res => {
        const room = rooms.find(r => r.id === res.roomId);
        return {
            ...res,
            room_name: room ? room.name : 'Unknown Room',
            building: room ? room.building : 'Unknown Building',
            room_capacity: room ? room.capacity : 0
        };
    });
};

export const detectConflicts = (bookings) => {
    const conflicts = [];
    const groupedByRoom = bookings.reduce((acc, booking) => {
        if (!acc[booking.room_name]) {
            acc[booking.room_name] = [];
        }
        acc[booking.room_name].push(booking);
        return acc;
    }, {});

    Object.entries(groupedByRoom).forEach(([roomName, roomBookings]) => {
        for (let i = 0; i < roomBookings.length; i++) {
            for (let j = i + 1; j < roomBookings.length; j++) {
                const b1 = roomBookings[i];
                const b2 = roomBookings[j];

                // Only check conflicts for the same date
                if (b1.date !== b2.date) continue;

                const t1 = parseTimeSlot(b1.time_slot);
                const t2 = parseTimeSlot(b2.time_slot);

                if (isBefore(t1.start, t2.end) && isAfter(t1.end, t2.start)) {
                    conflicts.push({
                        room_name: roomName,
                        booking1: b1,
                        booking2: b2,
                        type: b1.system_source !== b2.system_source ? 'Cross-System Conflict' : 'Double Booking'
                    });
                }
            }
        }
    });

    return conflicts;
};

export const getGridData = (bookings, date = new Date()) => {
    // Filter bookings for the specific date
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayBookings = bookings.filter(b => b.date === dateStr);

    const rooms = [...new Set(bookings.map(b => b.room_name))].sort();

    // Dynamic Time Range (based on day's bookings or default 8-8)
    let earliest = setMinutes(setHours(new Date(), 8), 0);
    let latest = setMinutes(setHours(new Date(), 20), 0);

    if (dayBookings.length > 0) {
        dayBookings.forEach(b => {
            const { start, end } = parseTimeSlot(b.time_slot);
            if (isBefore(start, earliest)) earliest = start;
            if (isAfter(end, latest)) latest = end;
        });
    }

    earliest = setMinutes(earliest, 0);
    if (latest.getMinutes() > 0) {
        latest = addMinutes(latest, 60 - latest.getMinutes());
    }

    const timeHeaders = [];
    let currentTime = earliest;

    while (isBefore(currentTime, latest) || isEqual(currentTime, latest)) {
        timeHeaders.push(format(currentTime, 'hh:mm a'));
        currentTime = addMinutes(currentTime, 60);
    }

    return { rooms, timeHeaders, dayBookings };
};

export const findAvailableRoom = (bookings, conflictingTimeSlot, currentRoom, dateStr) => {
    const { start: conflictStart, end: conflictEnd } = parseTimeSlot(conflictingTimeSlot);
    const allRooms = [...new Set(bookings.map(b => b.room_name))];
    const candidateRooms = allRooms.filter(r => r !== currentRoom);

    for (const room of candidateRooms) {
        const roomBookings = bookings.filter(b => b.room_name === room && b.date === dateStr);
        let isFree = true;

        for (const booking of roomBookings) {
            const { start, end } = parseTimeSlot(booking.time_slot);
            if (isBefore(conflictStart, end) && isAfter(conflictEnd, start)) {
                isFree = false;
                break;
            }
        }

        if (isFree) {
            const roomInfo = bookings.find(b => b.room_name === room);
            return {
                room_name: room,
                building: roomInfo ? roomInfo.building : 'Unknown Building'
            };
        }
    }

    return null;
};

export const searchRooms = (criteria, rooms, bookings) => {
    const { building, type, capacity, date, startTime, endTime } = criteria;
    const dateStr = format(date, 'yyyy-MM-dd');

    // 1. Filter by Static Criteria
    let filteredRooms = rooms.filter(room => {
        if (building && room.building !== building) return false;
        if (type && room.type !== type) return false;

        if (capacity) {
            if (capacity === '10-20' && (room.capacity < 10 || room.capacity > 20)) return false;
            if (capacity === '20-40' && (room.capacity < 20 || room.capacity > 40)) return false;
            if (capacity === '50+' && room.capacity < 50) return false;
        }

        return true;
    });

    // 2. Filter by Availability
    if (startTime && endTime) {
        const searchStart = parse(startTime, 'HH:mm', date);
        const searchEnd = parse(endTime, 'HH:mm', date);

        filteredRooms = filteredRooms.filter(room => {
            // Find bookings for this room on this date
            const roomBookings = bookings.filter(b =>
                b.roomId === room.id &&
                b.date === dateStr
            );

            // Check for overlaps
            const hasConflict = roomBookings.some(booking => {
                const { start: bookingStart, end: bookingEnd } = parseTimeSlot(booking.time_slot);
                // Overlap logic: (StartA < EndB) and (EndA > StartB)
                // Note: isBefore/isAfter compares full Date objects.
                // We need to ensure bookingStart/End are on the same 'date' as searchStart/End

                // parseTimeSlot returns dates on "today".
                // searchStart/End are parsed on "date".
                // We need to normalize them to compare ONLY time.

                const bStart = setDate(setMonth(setYear(bookingStart, date.getFullYear()), date.getMonth()), date.getDate());
                const bEnd = setDate(setMonth(setYear(bookingEnd, date.getFullYear()), date.getMonth()), date.getDate());

                return isBefore(searchStart, bEnd) && isAfter(searchEnd, bStart);
            });

            return !hasConflict;
        });
    }

    return filteredRooms;
};
