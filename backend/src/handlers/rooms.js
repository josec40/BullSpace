/**
 * Rooms handler — GET /rooms and GET /rooms/{roomId}
 */
import { QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import ddb, { TABLE_NAME } from '../lib/ddbClient.js';

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
};

/**
 * GET /rooms          → list all rooms  (GSI2: SK = METADATA)
 * GET /rooms/{roomId} → single room     (GetItem PK + SK)
 */
export const getRooms = async (event) => {
    const roomId = event.pathParameters?.roomId;

    try {
        if (roomId) {
            // ── Single room ────────────────────────────
            const { Item } = await ddb.send(
                new GetCommand({
                    TableName: TABLE_NAME,
                    Key: { PK: `ROOM#${roomId}`, SK: 'METADATA' },
                })
            );

            if (!Item) {
                return { statusCode: 404, headers, body: JSON.stringify({ message: 'Room not found' }) };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(formatRoom(Item)),
            };
        }

        // ── All rooms (GSI2: SK=METADATA) ────────────
        const { Items = [] } = await ddb.send(
            new QueryCommand({
                TableName: TABLE_NAME,
                IndexName: 'GSI2',
                KeyConditionExpression: 'SK = :sk',
                ExpressionAttributeValues: { ':sk': 'METADATA' },
            })
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(Items.map(formatRoom)),
        };
    } catch (err) {
        console.error('getRooms error:', err);
        return { statusCode: 500, headers, body: JSON.stringify({ message: 'Internal server error' }) };
    }
};

// ── Helpers ──────────────────────────────────────
function formatRoom(item) {
    return {
        id: item.roomId,
        name: item.name,
        building: item.building,
        capacity: item.capacity,
        type: item.type,
        features: item.features || [],
    };
}
