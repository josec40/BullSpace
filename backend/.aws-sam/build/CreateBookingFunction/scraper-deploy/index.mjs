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
    105593: 'lib-305',
    105594: 'lib-306',
    11355: 'lib-307',
    11357: 'lib-308',
    11358: 'lib-309',
    11359: 'lib-310',
    11361: 'lib-311',
    11362: 'lib-312',
    11364: 'lib-313',
    11365: 'lib-314',
    11366: 'lib-315',
    11367: 'lib-316',
    11548: 'lib-317',
    11549: 'lib-318',
    11550: 'lib-319',
    11551: 'lib-320',
    11552: 'lib-321',
    11553: 'lib-322',
    11555: 'lib-323',
    11556: 'lib-324',
    108082: 'lib-325',
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
            GSI1PK: date,
            GSI1SK: `ROOM#${roomId}`,
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
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`Fetching slots for ${toDateStr(today)} → ${toDateStr(tomorrow)}`);

    // 1 — Fetch from LibCal
    const slots = await fetchSlots(today, tomorrow);
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
