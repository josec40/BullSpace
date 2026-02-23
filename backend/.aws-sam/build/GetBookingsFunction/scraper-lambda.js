/**
 * USF LibCal → DynamoDB Availability Sync  (AWS Lambda version)
 *
 * This is the Lambda-ready version of libcal-client.js.
 * Triggered by EventBridge / CloudWatch Events on a schedule.
 *
 * 1. Fetches available time slots from USF Library's LibCal API.
 * 2. Maps LibCal itemIds → BullSpace room IDs.
 * 3. Writes AVAILABLE# items to BullSpaceTable in DynamoDB.
 *
 * Environment Variables (set in Lambda config):
 *   TABLE_NAME  — DynamoDB table name (default: BullSpaceTable)
 *   AWS_REGION  — provided automatically by Lambda
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

// ── config ───────────────────────────────────────────────────────────
const LIBCAL_URL = 'https://calendar.lib.usf.edu/spaces/availability/grid';
const TABLE_NAME = process.env.TABLE_NAME || 'BullSpaceTable';

// Map LibCal numeric itemIds → BullSpace room IDs
const ITEM_ID_TO_ROOM = {
    105593: 'lib-305',   // Group Study Room #305 (4 person, 3rd floor)
    105594: 'lib-306',   // Group Study Room #306 (4 person, 3rd floor)
    11355: 'lib-307',   // Group Study Room #307 (4 person, 3rd floor)
    108082: 'lib-308',   // Large Group Study Room #308 (6 person, 3rd floor)
    11357: 'lib-356',   // Group Study Room #356 (4 person, 3rd floor)
    11358: 'lib-357',   // Group Study Room #357 (4 person, 3rd floor)
    11359: 'lib-358',   // Group Study Room #358 (4 person, 3rd floor)
    11361: 'lib-436',   // Group Study Room #436 (4 person, 4th floor)
    11362: 'lib-437',   // Group Study Room #437 (4 person, 4th floor)
    11364: 'lib-438',   // Group Study Room #438 (4 person, 4th floor)
    11365: 'lib-440',   // Group Study Room #440 (4 person, 4th floor)
    11366: 'lib-441',   // Group Study Room #441 (4 person, 4th floor)
    11367: 'lib-442',   // Group Study Room #442 (4 person, 4th floor)
    11548: 'lib-514a',  // Quiet Study Room 514A (2 person, 5th floor)
    11549: 'lib-514b',  // Quiet Study Room 514B (2 person, 5th floor)
    11550: 'lib-514c',  // Quiet Study Room 514C (2 person, 5th floor)
    11551: 'lib-514d',  // Quiet Study Room 514D (2 person, 5th floor)
    11552: 'lib-520a',  // Quiet Study Room 520A (2 person, 5th floor)
    11553: 'lib-520b',  // Quiet Study Room 520B (2 person, 5th floor)
    11555: 'lib-520c',  // Quiet Study Room 520C (2 person, 5th floor)
    11556: 'lib-520d',  // Quiet Study Room 520D (2 person, 5th floor)
};

// ── AWS clients (created outside handler for connection reuse) ────────
const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
});

// ── helpers ──────────────────────────────────────────────────────────
function toDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ── fetch slots from LibCal ──────────────────────────────────────────
async function fetchSlots(startDate, endDate) {
    const params = new URLSearchParams({
        lid: '1729',
        gid: '19125',
        eid: '105593',
        seat: '0',
        seatId: '0',
        zone: '0',
        start: toDateStr(startDate),
        end: toDateStr(endDate),
        pageIndex: '0',
        pageSize: '18',
    });

    const res = await fetch(LIBCAL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            Referer: 'https://calendar.lib.usf.edu/allspaces',
            Origin: 'https://calendar.lib.usf.edu',
            Accept: 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: params.toString(),
    });

    if (!res.ok) {
        throw new Error(`LibCal returned HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data.slots ?? [];
}

// ── build DynamoDB items from slots ──────────────────────────────────
function buildDynamoItems(slots) {
    const items = [];

    for (const slot of slots) {
        const roomId = ITEM_ID_TO_ROOM[slot.itemId];

        if (!roomId) {
            console.warn(`Unknown itemId ${slot.itemId} — skipping.`);
            continue;
        }

        const [date, time] = slot.start.split(' ');
        const [, endTime] = slot.end.split(' ');

        items.push({
            PK: `ROOM#${roomId}`,
            SK: `AVAILABLE#${slot.start}`,
            roomId,
            date,
            startTime: time.slice(0, 5),
            endTime: endTime.slice(0, 5),
            source: 'libcal',
            itemId: slot.itemId,
        });
    }

    return items;
}

// ── batch-write items to DynamoDB ────────────────────────────────────
async function writeToDynamo(items) {
    const BATCH_SIZE = 25;
    let written = 0;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);

        const result = await ddb.send(
            new BatchWriteCommand({
                RequestItems: {
                    [TABLE_NAME]: batch.map((item) => ({
                        PutRequest: { Item: item },
                    })),
                },
            })
        );

        // Retry unprocessed items once (throttling / capacity)
        const unprocessed = result.UnprocessedItems?.[TABLE_NAME];
        if (unprocessed?.length) {
            console.warn(`${unprocessed.length} item(s) unprocessed — retrying…`);
            await ddb.send(
                new BatchWriteCommand({
                    RequestItems: { [TABLE_NAME]: unprocessed },
                })
            );
        }

        written += batch.length;
    }

    return written;
}

// ── Lambda handler ───────────────────────────────────────────────────
export const handler = async (event) => {
    console.log('LibCal scraper invoked', JSON.stringify(event));

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 7);

    console.log(`Fetching slots for ${toDateStr(today)} → ${toDateStr(endDate)}`);

    // 1 — Fetch from LibCal
    const slots = await fetchSlots(today, endDate);
    console.log(`Received ${slots.length} slot(s) from LibCal`);

    if (slots.length === 0) {
        return { statusCode: 200, body: 'No slots available for today.' };
    }

    // 2 — Build DynamoDB items
    const dynamoItems = buildDynamoItems(slots);
    console.log(`${dynamoItems.length} item(s) mapped to BullSpace rooms`);

    if (dynamoItems.length === 0) {
        return { statusCode: 200, body: 'All itemIds are unmapped — nothing written.' };
    }

    // 3 — Write to DynamoDB
    const written = await writeToDynamo(dynamoItems);
    console.log(`${written} slot(s) synced to ${TABLE_NAME}`);

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: `Synced ${written} availability slot(s) to DynamoDB.`,
            slotsReceived: slots.length,
            slotsWritten: written,
            dateRange: `${toDateStr(today)} → ${toDateStr(tomorrow)}`,
        }),
    };
};
