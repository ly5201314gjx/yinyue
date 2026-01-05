import { Song } from '../types';

const ITUNES_API_BASE = 'https://itunes.apple.com/search';
// Public Netease Cloud Music API instance
const NCM_API_BASE = 'https://ncm.zhenxin.me'; 

// --- iTunes Search ---
const searchItunes = async (term: string): Promise<Song[]> => {
  const query = encodeURIComponent(term);
  const url = `${ITUNES_API_BASE}?term=${query}&media=music&entity=song&limit=24`; 

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('iTunes API error');
    const data = await response.json();
    return (data.results as any[]).map(item => ({
        ...item,
        source: 'itunes'
    }));
  } catch (error) {
    console.error("iTunes Search failed:", error);
    return [];
  }
};

// --- Netease Search ---
const searchNetease = async (term: string): Promise<Song[]> => {
  const query = encodeURIComponent(term);
  // cloudsearch usually provides better matches for songs
  const url = `${NCM_API_BASE}/cloudsearch?keywords=${query}&limit=24`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Netease API error');
    const data = await response.json();
    const songs = data.result?.songs || [];

    return songs.map((song: any) => ({
      trackId: song.id,
      trackName: song.name,
      artistName: song.ar?.map((a: any) => a.name).join(', ') || 'Unknown',
      collectionName: song.al?.name || '',
      artworkUrl100: song.al?.picUrl || '',
      // Construct direct URL. This is optimistic.
      previewUrl: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`,
      trackTimeMillis: song.dt || 0,
      isFullVersion: true,
      source: 'netease',
      // We store the original ID to use for detail checks later if needed
      originalId: song.id 
    }));
  } catch (error) {
    console.error("Netease Search failed:", error);
    return [];
  }
};

// --- Combined Search ---
export const searchMusic = async (term: string): Promise<Song[]> => {
  if (!term.trim()) return [];

  // Parallel search
  const [ncmResults, itunesResults] = await Promise.all([
    searchNetease(term),
    searchItunes(term)
  ]);

  return [...ncmResults, ...itunesResults];
};

export const getTopCharts = async (): Promise<Song[]> => {
  return searchMusic('Hot Hits 2024');
};

// --- Helpers ---

export const getNeteaseLyrics = async (id: number): Promise<string> => {
    try {
        const lyricRes = await fetch(`${NCM_API_BASE}/lyric?id=${id}`);
        const lyricData = await lyricRes.json();
        return lyricData.lrc?.lyric || "";
    } catch (e) {
        console.warn("Lyrics fetch failed", e);
        return "";
    }
}

const cleanTitle = (title: string) => {
  return title
    .replace(/\(.*\)/g, '') 
    .replace(/\[.*\]/g, '') 
    .replace(/feat\..*/i, '')
    .replace(/ft\..*/i, '')
    .replace(/-.*remaster.*/i, '')
    .replace(/version/i, '')
    .trim();
}

// Check privileges to avoid VIP songs that won't play
const checkSongDetails = async (ids: number[]): Promise<Set<number>> => {
    if (ids.length === 0) return new Set();
    try {
        const res = await fetch(`${NCM_API_BASE}/song/detail?ids=${ids.join(',')}`);
        const data = await res.json();
        const playableIds = new Set<number>();
        
        data.songs?.forEach((song: any) => {
            // fee: 0 = free, 8 = free/low-quality, 1 = VIP, 4 = Paid Album
            // We generally want to avoid 1 and 4 for direct playback
            if (song.fee !== 1 && song.fee !== 4) {
                playableIds.add(song.id);
            }
        });
        return playableIds;
    } catch (e) {
        console.warn("Detail check failed", e);
        // If check fails, assume all are okay to try
        return new Set(ids);
    }
}

export const findNeteaseMusic = async (trackName: string, artistName: string): Promise<{ url: string, lyrics: string, duration: number } | null> => {
  const cleanTrack = cleanTitle(trackName);
  // Strategy: 
  // 1. Exact match
  // 2. Clean title match
  // 3. If standard search fails/is VIP, try searching for "Cover" or "Live" versions which are often free
  const queries = [
      `${trackName} ${artistName}`,
      `${cleanTrack} ${artistName}`,
      `${cleanTrack}`
  ];
  
  const uniqueQueries = [...new Set(queries)];

  for (const q of uniqueQueries) {
      try {
        const query = encodeURIComponent(q);
        const timestamp = Date.now();
        
        // Fetch more results to increase chance of finding a free version
        const searchRes = await fetch(`${NCM_API_BASE}/cloudsearch?keywords=${query}&limit=6&timestamp=${timestamp}`);
        const searchData = await searchRes.json();
        const songs = searchData.result?.songs || [];
        
        if (songs.length === 0) continue;

        const songIds = songs.map((s: any) => s.id);
        const playableIds = await checkSongDetails(songIds);

        // Iterate through songs and pick the first playable one
        for (const song of songs) {
            const ncmSongId = song.id;
            const ncmDuration = song.dt ? song.dt / 1000 : 0; 
            
            // Skip very short clips
            if (ncmDuration < 60) continue;

            // Prioritize playable songs
            if (!playableIds.has(ncmSongId)) {
                // If this is the only result, we might try it anyway, but let's prefer others first.
                // If we are at the last query and haven't found anything, maybe just return this one?
                // For now, strict skipping of VIP to ensure "Playable"
                continue; 
            }

            // Direct URL
            const songUrl = `https://music.163.com/song/media/outer/url?id=${ncmSongId}.mp3`;
            const rawLyrics = await getNeteaseLyrics(ncmSongId);

            return {
                url: songUrl,
                lyrics: rawLyrics,
                duration: ncmDuration
            };
        }
      } catch (error) {
        console.error(`Netease API Error for query "${q}":`, error);
      }
  }
  
  return null;
};