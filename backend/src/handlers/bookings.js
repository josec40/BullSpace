/**
 * Bookings handler — GET, POST, PUT, DELETE /bookings
 */
import { QueryCommand, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import ddb, { TABLE_NAME } from '../lib/ddbClient.js';

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
};

// ─────────────────────────────────────────────────
//  GET /bookings?date=YYYY-MM-DD[&roomId=xxx]
// ─────────────────────────────────────────────────
export const getBookings = async (event) => {
    const { date, roomId } = event.queryStringParameters || {};

    try {
        if (roomId && date) {
            const items = await queryRoomDate(roomId, date);
            return { statusCode: 200, headers, body: JSON.stringify(items.map(formatBooking)) };
        }

        if (date) {
            const { Items = [] } = await ddb.send(
                new QueryCommand({
                    TableName: TABLE_NAME,
                    IndexName: 'GSI1',
                    KeyConditionExpression: 'GSI1PK = :date',
                    FilterExpression: 'begins_with(SK, :skPrefix)',
                    ExpressionAttributeValues: { ':date': date, ':skPrefix': 'BOOKING#' },
                })
            );
            return { statusCode: 200, headers, body: JSON.stringify(Items.map(formatBooking)) };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Query parameter "date" is required. Usage: GET /bookings?date=YYYY-MM-DD' }),
        };
    } catch (err) {
        console.error('getBookings error:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ message: 'Internal server error' }) };
    }
};

// ─────────────────────────────────────────────────
//  POST /bookings  — create with conflict detection
// ─────────────────────────────────────────────────
export const createBooking = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { roomId, date, startTime, endTime, organization } = body;

        if (!roomId || !date || !startTime || !endTime || !organization) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    message: 'Missing required fields: roomId, date, startTime, endTime, organization',
                }),
            };
        }

        const existing = await queryRoomDate(roomId, date);
        const conflict = existing.find((b) => {
            return startTime < b.endTime && endTime > b.startTime;
        });

        if (conflict) {
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({
                    message: 'Time slot conflicts with an existing booking',
                    conflictWith: formatBooking(conflict),
                }),
            };
        }

        const bookingId = uuidv4();
        const item = {
            PK: `ROOM#${roomId}`,
            SK: `BOOKING#${date}#${bookingId}`,
            bookingId,
            roomId,
            date,
            startTime,
            endTime,
            organization,
            status: 'Booked',
            systemSource: body.systemSource || 'BullSpace',
            GSI1PK: date,
            GSI1SK: `ROOM#${roomId}`,
            createdAt: new Date().toISOString(),
        };

        await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify(formatBooking(item)),
        };
    } catch (err) {
        console.error('createBooking error:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ message: 'Internal server error' }) };
    }
};

// ─────────────────────────────────────────────────
//  PUT /bookings/{bookingId}  — update a booking
// ─────────────────────────────────────────────────
export const updateBooking = async (event) => {
    try {
        const { bookingId } = event.pathParameters || {};
        const body = JSON.parse(event.body || '{}');
        const { roomId, date, startTime, endTime, organization } = body;

        if (!bookingId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Missing bookingId in path' }),
            };
        }

        if (!roomId || !date || !startTime || !endTime || !organization) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    message: 'Missing required fields: roomId, date, startTime, endTime, organization',
                }),
            };
        }

        // ── Find the existing booking by bookingId ────
        const existing = await findBookingById(bookingId);
        if (!existing) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ message: 'Booking not found' }),
            };
        }

        // ── Conflict detection (exclude self) ─────────
        const sameDayBookings = await queryRoomDate(roomId, date);
        const conflict = sameDayBookings.find((b) => {
            if (b.bookingId === bookingId) return false; // skip self
            return startTime < b.endTime && endTime > b.startTime;
        });

        if (conflict) {
            return {
                statusCode: 409,
                headers,
                body: JSON.stringify({
                    message: 'Time slot conflicts with an existing booking',
                    conflictWith: formatBooking(conflict),
                }),
            };
        }

        // ── Delete old item (PK/SK may change if room or date changed) ──
        await ddb.send(
            new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { PK: existing.PK, SK: existing.SK },
            })
        );

        // ── Write updated booking ─────────────────────
        const updatedItem = {
            PK: `ROOM#${roomId}`,
            SK: `BOOKING#${date}#${bookingId}`,
            bookingId,
            roomId,
            date,
            startTime,
            endTime,
            organization,
            status: 'Booked',
            systemSource: existing.systemSource || 'BullSpace',
            GSI1PK: date,
            GSI1SK: `ROOM#${roomId}`,
            createdAt: existing.createdAt,
            updatedAt: new Date().toISOString(),
        };

        await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: updatedItem }));

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(formatBooking(updatedItem)),
        };
    } catch (err) {
        console.error('updateBooking error:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ message: 'Internal server error' }) };
    }
};

// ─────────────────────────────────────────────────
//  DELETE /bookings/{bookingId}?roomId=xxx&date=YYYY-MM-DD
// ─────────────────────────────────────────────────
export const deleteBooking = async (event) => {
    try {
        const { bookingId } = event.pathParameters || {};
        const { roomId, date } = event.queryStringParameters || {};

        if (!bookingId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Missing bookingId in path' }),
            };
        }

        if (!roomId || !date) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Query parameters "roomId" and "date" are required' }),
            };
        }

        const pk = `ROOM#${roomId}`;
        const sk = `BOOKING#${date}#${bookingId}`;

        await ddb.send(
            new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { PK: pk, SK: sk },
            })
        );

        return { statusCode: 204, headers, body: '' };
    } catch (err) {
        console.error('deleteBooking error:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ message: 'Internal server error' }) };
    }
};

// ─────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────

/** Query all bookings for a room on a specific date */
async function queryRoomDate(roomId, date) {
    const { Items = [] } = await ddb.send(
        new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
            ExpressionAttributeValues: {
                ':pk': `ROOM#${roomId}`,
                ':skPrefix': `BOOKING#${date}`,
            },
        })
    );
    return Items;
}

/** Find a single booking by its bookingId (scans GSI1 — only used for updates) */
async function findBookingById(bookingId) {
    const { Items = [] } = await ddb.send(
        new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'bookingId = :bid',
            ExpressionAttributeValues: { ':bid': bookingId },
            Limit: 1,
        })
    );
    return Items[0] || null;
}

/** Format a DynamoDB item into the API response shape */
function formatBooking(item) {
    return {
        id: item.bookingId,
        roomId: item.roomId,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        time_slot: formatTimeSlot(item.startTime, item.endTime),
        organization: item.organization,
        status: item.status,
        system_source: item.systemSource,
    };
}

/** Convert 24h times back to the "hh:mm AM - hh:mm PM" format the frontend expects */
function formatTimeSlot(startTime, endTime) {
    return `${to12Hour(startTime)} - ${to12Hour(endTime)}`;
}

function to12Hour(time24) {
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}
