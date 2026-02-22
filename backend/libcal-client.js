/**
 * USF LibCal → DynamoDB Availability Sync
 *
 * 1. Fetches available time slots from USF Library's LibCal API.
 * 2. Maps LibCal itemIds → BullSpace room IDs.
 * 3. Writes AVAILABLE# items to BullSpaceTable in DynamoDB.
 *
 * Dates are calculated dynamically (today → tomorrow).
 *
 * Usage:  node libcal-client.js
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

// ── config ───────────────────────────────────────────────────────────
const LIBCAL_URL = 'https://calendar.lib.usf.edu/spaces/availability/grid';
const TABLE_NAME = process.env.TABLE_NAME || 'BullSpaceTable';
const REGION = process.env.AWS_REGION || 'us-east-1';

// Map LibCal numeric itemIds → BullSpace room IDs
// Add new mappings here as you discover more LibCal room IDs.
const ITEM_ID_TO_ROOM = {
    105593: 'lib-305',
    105594: 'lib-306',
    11355: 'lib-307',   // placeholder — update with real room
    11357: 'lib-308',   // placeholder — update with real room
    11358: 'lib-309',   // placeholder — update with real room
    11359: 'lib-310',   // placeholder — update with real room
    11361: 'lib-311',   // placeholder — update with real room
    11362: 'lib-312',   // placeholder — update with real room
    11364: 'lib-313',   // placeholder — update with real room
    11365: 'lib-314',   // placeholder — update with real room
    11366: 'lib-315',   // placeholder — update with real room
    11367: 'lib-316',   // placeholder — update with real room
    11548: 'lib-317',   // placeholder — update with real room
    11549: 'lib-318',   // placeholder — update with real room
    11550: 'lib-319',   // placeholder — update with real room
    11551: 'lib-320',   // placeholder — update with real room
    11552: 'lib-321',   // placeholder — update with real room
    11553: 'lib-322',   // placeholder — update with real room
    11555: 'lib-323',   // placeholder — update with real room
    11556: 'lib-324',   // placeholder — update with real room
    108082: 'lib-325',   // placeholder — update with real room
};

// ── AWS clients ──────────────────────────────────────────────────────
const client = new DynamoDBClient({ region: REGION });
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

function formatTime(datetimeStr) {
    // "2026-02-21 17:00:00" → "5:00 PM"
    const [, time] = datetimeStr.split(' ');
    const [h, m] = time.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
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
            console.warn(`⚠  Unknown itemId ${slot.itemId} — skipping. Add it to ITEM_ID_TO_ROOM.`);
            continue;
        }

        // slot.start = "2026-02-21 17:00:00"
        const [date, time] = slot.start.split(' ');
        const [, endTime] = slot.end.split(' ');

        items.push({
            PK: `ROOM#${roomId}`,
            SK: `AVAILABLE#${slot.start}`,       // e.g. AVAILABLE#2026-02-21 17:00:00
            roomId,
            date,
            startTime: time.slice(0, 5),         // "17:00"
            endTime: endTime.slice(0, 5),        // "17:15"
            source: 'libcal',
            itemId: slot.itemId,
            GSI1PK: date,                        // enables query by date
            GSI1SK: `ROOM#${roomId}`,
        });
    }

    return items;
}

// ── batch-write items to DynamoDB ────────────────────────────────────
async function writeToDynamo(items) {
    // DynamoDB BatchWrite max = 25 items per request
    const BATCH_SIZE = 25;
    let written = 0;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);

        try {
            const result = await ddb.send(
                new BatchWriteCommand({
                    RequestItems: {
                        [TABLE_NAME]: batch.map((item) => ({
                            PutRequest: { Item: item },
                        })),
                    },
                })
            );

            // Handle unprocessed items (throttling / capacity)
            const unprocessed = result.UnprocessedItems?.[TABLE_NAME];
            if (unprocessed?.length) {
                console.warn(`⚠  ${unprocessed.length} item(s) were not processed — retrying once...`);
                await ddb.send(
                    new BatchWriteCommand({
                        RequestItems: { [TABLE_NAME]: unprocessed },
                    })
                );
            }

            written += batch.length;
        } catch (err) {
            console.error(`❌ Batch write failed at offset ${i}:`, err.message);
            throw err;
        }
    }

    return written;
}

// ── main ─────────────────────────────────────────────────────────────
async function main() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`\n📅  Fetching LibCal slots for ${toDateStr(today)} → ${toDateStr(tomorrow)} …\n`);

    // 1 — Fetch from LibCal
    const slots = await fetchSlots(today, tomorrow);

    if (slots.length === 0) {
        console.log('No available slots found for this date range.');
        return;
    }

    // 2 — Print summary
    const grouped = {};
    for (const slot of slots) {
        const id = slot.itemId;
        if (!grouped[id]) grouped[id] = [];
        grouped[id].push(slot);
    }

    for (const [itemId, itemSlots] of Object.entries(grouped)) {
        const roomId = ITEM_ID_TO_ROOM[itemId] ?? '(unmapped)';
        console.log(`🏛  Item ${itemId}  →  ${roomId}  (${itemSlots.length} slots)`);
        console.log('─'.repeat(48));
        for (const s of itemSlots) {
            console.log(`   ${formatTime(s.start)}  →  ${formatTime(s.end)}`);
        }
        console.log();
    }

    // 3 — Build DynamoDB items
    const dynamoItems = buildDynamoItems(slots);

    if (dynamoItems.length === 0) {
        console.log('No items to write (all itemIds are unmapped).');
        return;
    }

    // 4 — Write to DynamoDB
    console.log(`☁  Writing ${dynamoItems.length} availability item(s) to ${TABLE_NAME} …`);
    const written = await writeToDynamo(dynamoItems);
    console.log(`✅ Done! ${written} slot(s) synced to DynamoDB.\n`);
}

main().catch((err) => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
