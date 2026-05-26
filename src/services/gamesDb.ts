import axios from 'axios';

const API_KEY = import.meta.env.VITE_GAMESDB_API_KEY || '';
const BASE_URL = 'https://api.thegamesdb.net/v1';
export const IMAGE_BASE_URL = 'https://cdn.thegamesdb.net/images/original/';

export const isApiConfigured = () => API_KEY.length > 0;

export const searchGame = async (name: string) => {
  if (!isApiConfigured()) return [];
  try {
    const response = await axios.get(`${BASE_URL}/Games/ByGameName`, {
      params: {
        apikey: API_KEY,
        name: name,
        fields: 'genres,overview,platform'
      }
    });
    return response.data.data.games;
  } catch (error) {
    console.error('Error fetching from TheGamesDB:', error);
    return [];
  }
};

export const getGameArt = async (gameId: number | string) => {
  if (!isApiConfigured()) return [];
  try {
    const response = await axios.get(`${BASE_URL}/Games/Images`, {
      params: {
        apikey: API_KEY,
        games_id: gameId
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NeoFlow/1.0'
      }
    });
    return response.data.data.images[gameId] || [];
  } catch (error) {
    console.error('Error fetching images from TheGamesDB:', error);
    return [];
  }
};
