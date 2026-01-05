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
      // Construct direct URL. Note: This might not work for VIP songs, but works for many.
      previewUrl: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`,
      trackTimeMillis: song.dt || 0,
      isFullVersion: true,
      source: 'netease'
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

  // Merge results
  // We prioritize Netease results because they are full versions.
  // However, we want to avoid duplicates if possible, or just show both options.
  // For simplicity, we interleave or just append. 
  // Let's put Netease first for better "Free Music" experience.
  return [...ncmResults, ...itunesResults];
};

export const getTopCharts = async (): Promise<Song[]> => {
  // We can try to fetch a playlist from Netease for "Top Charts" behavior if iTunes fails or just use iTunes for stable charts
  // For now, use the hybrid search for a generic "Hits" term which works well.
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

export const findNeteaseMusic = async (trackName: string, artistName: string): Promise<{ url: string, lyrics: string, duration: number } | null> => {
  const cleanTrack = cleanTitle(trackName);
  const queries = [
      `${trackName} ${artistName}`,
      `${cleanTrack} ${artistName}`,
      `${cleanTrack}`,
  ];
  
  const uniqueQueries = [...new Set(queries)];

  for (const q of uniqueQueries) {
      try {
        const query = encodeURIComponent(q);
        const timestamp = Date.now();
        
        const searchRes = await fetch(`${NCM_API_BASE}/cloudsearch?keywords=${query}&limit=3&timestamp=${timestamp}`);
        const searchData = await searchRes.json();
        const songs = searchData.result?.songs || [];
        
        for (const song of songs) {
            const ncmSongId = song.id;
            const ncmDuration = song.dt ? song.dt / 1000 : 0; 
            
            if (ncmDuration < 60) continue;

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
