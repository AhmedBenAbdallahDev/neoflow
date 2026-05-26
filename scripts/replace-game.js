import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.VITE_GAMESDB_API_KEY;
const BASE_URL = 'https://api.thegamesdb.net/v1';
const IMAGE_BASE_URL = 'https://cdn.thegamesdb.net/images/original/';

const NEW_GAME = { name: "Animal Crossing: New Horizons", id: "61029" };
const TARGET_GAME_TITLE = "Pikmin 4";

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
            writer.on('error', (err) => reject(err));
        });
    } catch (e) {
        console.error(`Failed to download ${url}: ${e.message}`);
        return null;
    }
}

async function run() {
    console.log(`🚀 Replacing "${TARGET_GAME_TITLE}" with "${NEW_GAME.name}"...`);
    
    try {
        // 1. Fetch images for Animal Crossing
        const imgResponse = await axios.get(`${BASE_URL}/Games/Images`, {
            params: {
                apikey: API_KEY,
                games_id: NEW_GAME.id
            },
            headers: { 
                'Accept': 'application/json',
                'User-Agent': 'NeoFlow/1.0'
            }
        });

        const images = imgResponse.data.data.images[NEW_GAME.id];
        let coverPath = "";
        let bgPath = "";

        if (images) {
            const portraitBox = images.find(img => 
                img.type === 'boxart' && 
                img.side === 'front' && 
                !/disc|back|spine|inside|fanart|clearlogo/i.test(img.filename)
            );

            if (portraitBox) {
                coverPath = await downloadImage(`${IMAGE_BASE_URL}${portraitBox.filename}`, 'covers', `${NEW_GAME.id}_portrait.jpg`);
                console.log(`✅ Saved Animal Crossing Portrait Cover`);
            }

            const fanart = images.find(img => img.type === 'fanart') || images.find(img => img.type === 'screenshot');
            if (fanart) {
                bgPath = await downloadImage(`${IMAGE_BASE_URL}${fanart.filename}`, 'backgrounds', `${NEW_GAME.id}_bg.jpg`);
                console.log(`✅ Saved Animal Crossing Background`);
            }
        }

        // 2. Update rom-set.json carefully
        const romSetPath = path.join(process.cwd(), 'rom-set.json');
        const data = JSON.parse(fs.readFileSync(romSetPath, 'utf8'));
        
        const updated = data.map(game => {
            if (game.title === TARGET_GAME_TITLE) {
                console.log(`📝 Swapping data in rom-set.json...`);
                return {
                    ...game,
                    id: "SWITCH-ACNH",
                    title: NEW_GAME.name,
                    genre: "Social Simulation",
                    fileSize: "6.2 GB",
                    cover: coverPath || game.cover,
                    bg: bgPath || game.bg,
                    romUrl: "/roms/acnh.nsp"
                };
            }
            return game;
        });

        fs.writeFileSync(romSetPath, JSON.stringify(updated, null, 2));
        console.log("✨ Transformation complete!");

    } catch (error) {
        console.error("❌ Error during replacement:", error.message);
    }
}

run();
