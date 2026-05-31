import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.VITE_GAMESDB_API_KEY;
const BASE_URL = 'https://api.thegamesdb.net/v1';
const ROM_SET_PATH = path.join(process.cwd(), 'public', 'rom-set.json');

const newGames = [
    { name: "Super Mario Party", type: "Switch" },
    { name: "Mario Party Superstars", type: "Switch" }
];

async function downloadImage(url, folder, filename) {
    const dir = path.join(process.cwd(), 'public', 'media', folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const dest = path.join(dir, filename);
    try {
        const response = await axios.get(url, { 
            responseType: 'stream',
            headers: { 
                'User-Agent': 'NeoFlow/1.0',
                'Referer': 'https://thegamesdb.net/'
            }
        });
        
        return new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(dest);
            response.data.pipe(writer);
            writer.on('finish', () => resolve(`/media/${folder}/${filename}`));
            writer.on('error', (err) => {
                console.error(`Write error for ${filename}:`, err.message);
                reject(err);
            });
        });
    } catch (e) {
        console.error(`Failed to download ${url}: ${e.message}`);
        return null;
    }
}

async function run() {
    console.log("🚀 Adding 3 more Switch games with VERIFIED logic...");
    
    let currentData = [];
    if (fs.existsSync(ROM_SET_PATH)) {
        currentData = JSON.parse(fs.readFileSync(ROM_SET_PATH, 'utf8'));
    }

    for (const game of newGames) {
        if (currentData.some(g => g.title === game.name)) {
            console.log(`⏩ ${game.name} already exists, skipping.`);
            continue;
        }

        console.log(`🔍 Searching for Switch version of: ${game.name}...`);
        
        try {
            // STEP 1: Search by name
            const searchRes = await axios.get(`${BASE_URL}/Games/ByGameName`, {
                params: { apikey: API_KEY, name: game.name },
                headers: { 'Accept': 'application/json', 'User-Agent': 'NeoFlow/1.0' }
            });

            const gamesList = searchRes.data.data.games;
            if (!gamesList || gamesList.length === 0) {
                console.log(`❌ No matches found for ${game.name}`);
                continue;
            }

            // STEP 2: Find the Switch platform (4971) specifically
            const switchEntry = gamesList.find(g => g.platform === 4971);
            if (!switchEntry) {
                console.log(`❌ Switch version not found for ${game.name}. Skipping.`);
                continue;
            }

            const realId = switchEntry.id;
            console.log(`✅ Found Switch ID: ${realId}`);

            // STEP 3: Get assets
            const imgRes = await axios.get(`${BASE_URL}/Games/Images`, {
                params: { apikey: API_KEY, games_id: realId },
                headers: { 'Accept': 'application/json', 'User-Agent': 'NeoFlow/1.0' }
            });

            const images = imgRes.data.data.images[realId];
            if (!images) {
                console.log(`❌ No images found for ID: ${realId}`);
                continue;
            }

            const imageBaseUrl = 'https://cdn.thegamesdb.net/images/original/';
            
            const portrait = images.find(img => img.type === 'boxart' && img.side === 'front') || images[0];
            const background = images.find(img => img.type === 'fanart') || images.find(img => img.type === 'screenshot') || images[0];

            const coverLocal = await downloadImage(`${imageBaseUrl}${portrait.filename}`, 'covers', `${realId}_portrait.jpg`);
            const bgLocal = await downloadImage(`${imageBaseUrl}${background.filename}`, 'backgrounds', `${realId}_bg.jpg`);

            const newEntry = {
                id: `SWITCH-${realId}`,
                title: game.name,
                platform: 'Nintendo Switch',
                genre: 'Action-Adventure',
                fileSize: 'N/A',
                cover: coverLocal || '',
                bg: bgLocal || '',
                type: 'Switch',
                romUrl: `/roms/${game.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.nsp`
            };

            currentData.push(newEntry);
            console.log(`✅ Correctly added Switch version of ${game.name}`);

        } catch (e) {
            console.error(`❌ Error processing ${game.name}:`, e.message);
        }
    }

    fs.writeFileSync(ROM_SET_PATH, JSON.stringify(currentData, null, 2));
    console.log("✨ All done! rom-set.json updated.");
}

run();

