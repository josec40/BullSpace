/**
 * Bookings handler — GET /bookings and POST /bookings
 */
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
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
            // Bookings for a specific room + date (main table query)
            const items = await queryRoomDate(roomId, date);
            return { statusCode: 200, headers, body: JSON.stringify(items.map(formatBooking)) };
        }

        if (date) {
            // All bookings for a date across every room (GSI1)
            const { Items = [] } = await ddb.send(
                new QueryCommand({
                    TableName: TABLE_NAME,
                    IndexName: 'GSI1',
                    KeyConditionExpression: 'GSI1PK = :date',
                    ExpressionAttributeValues: { ':date': date },
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

        // ── Validate required fields ──────────────────
        if (!roomId || !date || !startTime || !endTime || !organization) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    message: 'Missing required fields: roomId, date, startTime, endTime, organization',
                }),
            };
        }

        // ── Conflict detection ────────────────────────
        const existing = await queryRoomDate(roomId, date);
        const conflict = existing.find((b) => {
            // Overlap: newStart < existingEnd AND newEnd > existingStart
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

        // ── Write new booking ─────────────────────────
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
