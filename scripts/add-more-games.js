import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.VITE_GAMESDB_API_KEY;
const BASE_URL = 'https://api.thegamesdb.net/v1';
const ROM_SET_PATH = path.join(process.cwd(), 'public', 'rom-set.json');

const newGames = [
    { name: "The Legend of Zelda: Tears of the Kingdom", id: "109536", type: "Switch" },
    { name: "Hollow Knight", id: "46830", type: "Switch" },
    { name: "Stardew Valley", id: "34914", type: "Switch" }
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
    console.log("🚀 Adding 3 more high-res games to NeoFlow...");
    
    let currentData = [];
    if (fs.existsSync(ROM_SET_PATH)) {
        currentData = JSON.parse(fs.readFileSync(ROM_SET_PATH, 'utf8'));
    }

    for (const game of newGames) {
        if (currentData.some(g => g.title === game.name)) {
            console.log(`⏩ ${game.name} already exists, skipping.`);
            continue;
        }

        console.log(`🔍 Fetching metadata for: ${game.name}...`);
        
        try {
            // 1. Get images
            const imgResponse = await axios.get(`${BASE_URL}/Games/Images`, {
                params: { apikey: API_KEY, games_id: game.id },
                headers: { 'Accept': 'application/json', 'User-Agent': 'NeoFlow/1.0' }
            });

            const images = imgResponse.data.data.images[game.id];
            if (!images) {
                console.log(`❌ No images found for ${game.name}`);
                continue;
            }

            const imageBaseUrl = 'https://cdn.thegamesdb.net/images/original/';
            
            // Find best portrait (boxart front)
            const portrait = images.find(img => img.type === 'boxart' && img.side === 'front') || images[0];
            // Find best background (fanart or screenshot)
            const background = images.find(img => img.type === 'fanart') || images.find(img => img.type === 'screenshot') || images[0];

            const coverLocal = await downloadImage(`${imageBaseUrl}${portrait.filename}`, 'covers', `${game.id}_portrait.jpg`);
            const bgLocal = await downloadImage(`${imageBaseUrl}${background.filename}`, 'backgrounds', `${game.id}_bg.jpg`);

            // 2. Get Metadata (platform, genre)
            const metaResponse = await axios.get(`${BASE_URL}/Games/ByGameID`, {
                params: { apikey: API_KEY, id: game.id, fields: 'genres,platform' },
                headers: { 'Accept': 'application/json', 'User-Agent': 'NeoFlow/1.0' }
            });

            const meta = metaResponse.data.data.games[0];
            
            const newEntry = {
                id: `${game.type.toUpperCase()}-${game.id}`,
                title: game.name,
                platform: game.type === 'Switch' ? 'Nintendo Switch' : 'Other',
                genre: meta.genres ? meta.genres.map(g => g.name).join(', ') : 'Action',
                fileSize: "N/A",
                cover: coverLocal || "",
                bg: bgLocal || "",
                type: game.type,
                romUrl: `/roms/${game.name.toLowerCase().replace(/ /g, '_')}.nsp`
            };

            currentData.push(newEntry);
            console.log(`✅ Added ${game.name}`);

        } catch (e) {
            console.error(`❌ Error processing ${game.name}:`, e.message);
        }
    }

    fs.writeFileSync(ROM_SET_PATH, JSON.stringify(currentData, null, 2));
    console.log("✨ All done! rom-set.json updated.");
}

run();
