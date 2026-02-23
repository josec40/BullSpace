/**
 * discover-rooms.js
 *
 * Hits the LibCal space-info endpoint for every known itemId
 * and writes the actual room names + metadata into src/data/rooms.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// All known LibCal item IDs from the scraper
const ITEM_IDS = [
    105593, 105594,
    11355, 11357, 11358, 11359, 11361, 11362,
    11364, 11365, 11366, 11367,
    11548, 11549, 11550, 11551, 11552, 11553, 11555, 11556,
    108082,
];

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://calendar.lib.usf.edu/reserve',
};

// ── 1. Try the space item page to scrape the room name ──────────────
async function fetchRoomInfo(itemId) {
    // LibCal embeds room info in the /spaces/availability page
    // But the individual item page often lives at /space/<itemId>
    const urls = [
        `https://calendar.lib.usf.edu/space/${itemId}`,
        `https://calendar.lib.usf.edu/spaces/${itemId}`,
    ];

    for (const url of urls) {
        try {
            const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
            if (!res.ok) continue;

            const html = await res.text();

            // Look for the room name in the page title or common patterns
            // LibCal pages typically have <h1> or <title> with the room name
            let name = null;
            let capacity = null;
            let description = null;

            // Try <title> tag — usually "Room Name - Library Name"
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch) {
                const raw = titleMatch[1].trim();
                // Title usually looks like "Room Name | USF Libraries" or "Room Name - LibCal"
                name = raw.split(/\s*[|–—-]\s*/)[0].trim();
                if (name.toLowerCase().includes('libcal') || name.toLowerCase().includes('error') || name.length < 2) {
                    name = null;
                }
            }

            // Try <h1> tag
            if (!name) {
                const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
                if (h1Match) {
                    name = h1Match[1].trim();
                }
            }

            // Try common LibCal class for room name
            const nameClassMatch = html.match(/class="[^"]*s-lc-eq-title[^"]*"[^>]*>([^<]+)</i);
            if (nameClassMatch) {
                name = nameClassMatch[1].trim();
            }

            // Try to find capacity
            const capMatch = html.match(/[Cc]apacity[:\s]*(\d+)/);
            if (capMatch) {
                capacity = parseInt(capMatch[1], 10);
            }

            // Try to find description
            const descMatch = html.match(/class="[^"]*s-lc-eq-desc[^"]*"[^>]*>([\s\S]*?)<\//i);
            if (descMatch) {
                description = descMatch[1].trim().replace(/<[^>]+>/g, '');
            }

            if (name) {
                return { itemId, name, capacity, description, url };
            }
        } catch (err) {
            // Try next URL
        }
    }

    return { itemId, name: null, capacity: null, description: null };
}

// ── 2. Alternative: fetch the availability grid and extract item names ──
async function fetchRoomNamesFromGrid() {
    console.log('\n🔍 Trying availability grid endpoint for room names...\n');

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 2);

    const toDateStr = (d) => d.toISOString().slice(0, 10);

    const payload = new URLSearchParams({
        lid: '1293',
        gid: '0',
        start: toDateStr(today),
        end: toDateStr(tomorrow),
        pageSize: '100',
    });

    try {
        const res = await fetch('https://calendar.lib.usf.edu/spaces/availability/grid', {
            method: 'POST',
            headers: {
                ...HEADERS,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': 'https://calendar.lib.usf.edu',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: payload.toString(),
        });

        if (!res.ok) {
            console.log(`  Grid response: ${res.status}`);
            return {};
        }

        const html = await res.text();

        // The grid HTML contains room names in elements like:
        // <a class="fc-resource-text" ...>Room Name</a>
        // or in a data attribute / header cell
        const roomMap = {};

        // Pattern 1: LibCal grid typically has data-id and room names
        const pattern1 = /data-(?:seat|item)-id="(\d+)"[^>]*>([^<]*)</gi;
        let match;
        while ((match = pattern1.exec(html)) !== null) {
            const id = parseInt(match[1], 10);
            const name = match[2].trim();
            if (name && ITEM_IDS.includes(id)) {
                roomMap[id] = name;
            }
        }

        // Pattern 2: Grid header cells
        const pattern2 = /itemId['":\s]*(\d+)[^}]*?(?:title|name)['":\s]*['"]([^'"]+)/gi;
        while ((match = pattern2.exec(html)) !== null) {
            const id = parseInt(match[1], 10);
            const name = match[2].trim();
            if (name && ITEM_IDS.includes(id)) {
                roomMap[id] = name;
            }
        }

        // Pattern 3: Look for the JSON data embedded in the HTML
        const jsonPattern = /"itemId"\s*:\s*(\d+)[^}]*?"title"\s*:\s*"([^"]+)"/gi;
        while ((match = jsonPattern.exec(html)) !== null) {
            const id = parseInt(match[1], 10);
            const name = match[2].trim();
            if (ITEM_IDS.includes(id)) {
                roomMap[id] = name;
            }
        }

        // Pattern 4: Reverse order - title before itemId
        const jsonPattern2 = /"title"\s*:\s*"([^"]+)"[^}]*?"itemId"\s*:\s*(\d+)/gi;
        while ((match = jsonPattern2.exec(html)) !== null) {
            const name = match[1].trim();
            const id = parseInt(match[2], 10);
            if (ITEM_IDS.includes(id)) {
                roomMap[id] = name;
            }
        }

        console.log(`  Found ${Object.keys(roomMap).length} room names from grid`);
        for (const [id, name] of Object.entries(roomMap)) {
            console.log(`    ${id} → ${name}`);
        }

        // Also dump a sample of the raw HTML to help debug
        if (Object.keys(roomMap).length === 0) {
            // Save the grid response for analysis
            const outPath = path.join(__dirname, 'grid-response.html');
            fs.writeFileSync(outPath, html);
            console.log(`  Wrote grid HTML to ${outPath} for analysis (${html.length} chars)`);

            // Try to find any item IDs in the HTML
            const allIds = [...html.matchAll(/(\d{4,6})/g)].map(m => parseInt(m[1], 10));
            const knownIds = allIds.filter(id => ITEM_IDS.includes(id));
            console.log(`  Known item IDs found in HTML: ${[...new Set(knownIds)].join(', ')}`);
        }

        return roomMap;
    } catch (err) {
        console.error('  Grid fetch error:', err.message);
        return {};
    }
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
    console.log('🔎 Discovering room metadata from LibCal...\n');

    // Strategy 1: Try individual space pages
    console.log('📄 Strategy 1: Fetching individual space pages...\n');
    const results = [];
    for (const id of ITEM_IDS) {
        console.log(`  Fetching item ${id}...`);
        const info = await fetchRoomInfo(id);
        if (info.name) {
            console.log(`    ✅ ${info.name}${info.capacity ? ` (cap: ${info.capacity})` : ''}`);
        } else {
            console.log(`    ❌ No name found`);
        }
        results.push(info);

        // Be polite — don't blast the server
        await new Promise(r => setTimeout(r, 300));
    }

    // Strategy 2: Try the availability grid
    const gridNames = await fetchRoomNamesFromGrid();

    // Merge results
    const roomData = {};
    for (const r of results) {
        if (r.name) {
            roomData[r.itemId] = { name: r.name, capacity: r.capacity, description: r.description };
        }
    }
    for (const [id, name] of Object.entries(gridNames)) {
        if (!roomData[id]) {
            roomData[id] = { name, capacity: null, description: null };
        }
    }

    console.log(`\n📊 Summary: Found names for ${Object.keys(roomData).length} / ${ITEM_IDS.length} rooms\n`);

    // Print final mapping
    for (const id of ITEM_IDS) {
        const info = roomData[id];
        if (info) {
            console.log(`  ${id} → "${info.name}" (capacity: ${info.capacity || 'unknown'})`);
        } else {
            console.log(`  ${id} → ❓ UNKNOWN`);
        }
    }

    // Write results to a JSON file for review
    const outputPath = path.join(__dirname, 'discovered-rooms.json');
    fs.writeFileSync(outputPath, JSON.stringify(roomData, null, 2));
    console.log(`\n💾 Raw results saved to ${outputPath}`);
}

main().catch(console.error);
