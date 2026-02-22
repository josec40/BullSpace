/**
 * Seed script — populates BullSpaceTable with rooms.json + reservations.json data.
 *
 * Prerequisites:
 *   1. `sam deploy` has been run (table exists)
 *   2. AWS credentials are configured (aws configure / env vars)
 *
 * Usage:
 *   cd backend
 *   npm run seed
 *
 * Set AWS_REGION env var if different from your default (e.g. us-east-1).
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TABLE_NAME = process.env.TABLE_NAME || 'BullSpaceTable';
const REGION = process.env.AWS_REGION || 'us-east-1';

const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
});

// ── Load source data from the frontend ──────────
const rooms = JSON.parse(readFileSync(resolve(__dirname, '../../src/data/rooms.json'), 'utf-8'));
const reservations = JSON.parse(readFileSync(resolve(__dirname, '../../src/data/reservations.json'), 'utf-8'));

// ── Convert "10:00 AM - 12:00 PM" → { startTime: "10:00", endTime: "12:00" }
function parseTimeSlot(slot) {
    const [startStr, endStr] = slot.split(' - ');
    return { startTime: to24Hour(startStr), endTime: to24Hour(endStr) };
}

function to24Hour(time12) {
    const [time, period] = time12.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ── Build DynamoDB items ────────────────────────
const items = [];

// Room items
for (const room of rooms) {
    items.push({
        PK: `ROOM#${room.id}`,
        SK: 'METADATA',
        roomId: room.id,
        name: room.name,
        building: room.building,
        capacity: room.capacity,
        type: room.type,
        features: room.features || [],
    });
}

// Booking items
for (const res of reservations) {
    const bookingId = uuidv4();
    const { startTime, endTime } = parseTimeSlot(res.time_slot);
    items.push({
        PK: `ROOM#${res.roomId}`,
        SK: `BOOKING#${res.date}#${bookingId}`,
        bookingId,
        roomId: res.roomId,
        date: res.date,
        startTime,
        endTime,
        organization: res.organization,
        status: res.status,
        systemSource: res.system_source,
        GSI1PK: res.date,
        GSI1SK: `ROOM#${res.roomId}`,
    });
}

// ── BatchWrite (25 items per batch, DynamoDB limit) ──
async function seed() {
    const batches = [];
    for (let i = 0; i < items.length; i += 25) {
        batches.push(items.slice(i, i + 25));
    }

    console.log(`Seeding ${items.length} items in ${batches.length} batch(es)...`);

    for (const batch of batches) {
        await ddb.send(
            new BatchWriteCommand({
                RequestItems: {
                    [TABLE_NAME]: batch.map((item) => ({
                        PutRequest: { Item: item },
                    })),
                },
            })
        );
    }

    console.log('✅ Seed complete!');
    console.log(`   → ${rooms.length} rooms`);
    console.log(`   → ${reservations.length} bookings`);
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
