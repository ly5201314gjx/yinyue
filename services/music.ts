import { Song } from '../types';

const ITUNES_API_BASE = 'https://itunes.apple.com/search';
// 使用 Vercel Rewrite 路径，避免直接请求第三方域名可能带来的 SSL/CORS 问题，或者使用更稳定的公共 API
// 这里我们保留直接链接，但建议使用支持 HTTPS 的稳定实例
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
    console.warn("iTunes Search failed:", error);
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
      // Optimistic URL. Will be upgraded to real CDN URL in App.tsx playSong
      previewUrl: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`,
      trackTimeMillis: song.dt || 0,
      // CRITICAL: Only mark as full/ready if it is actually free.
      isFullVersion: song.fee === 0 || song.fee === 8, 
      source: 'netease',
      originalId: song.id,
      fee: song.fee 
    }));
  } catch (error) {
    console.warn("Netease Search failed:", error);
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

  // Interleave results or prioritize NCM for Asian content
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

/**
 * 获取真实的播放链接，并尝试强制升级为 HTTPS 以避免 Mixed Content 错误。
 */
export const getMusicUrl = async (id: number): Promise<string> => {
    try {
        // 请求标准音质
        const res = await fetch(`${NCM_API_BASE}/song/url?id=${id}`);
        const data = await res.json();
        const url = data.data?.[0]?.url;
        
        if (url) {
            // 关键：强制将 http 替换为 https。网易云 CDN 大多支持 https。
            return url.replace(/^http:/, 'https:');
        }
        // 如果 API 没有返回 URL，退回到官方外链（它通常会自动重定向，但也可能 403）
        return `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
    } catch (e) {
        console.warn("Fetch music url failed, fallback to outer link", e);
        return `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
    }
}

const cleanTitle = (title: string) => {
  return title
    .replace(/\(.*\)/g, '') 
    .replace(/\[.*\]/g, '') 
    .replace(/feat\..*/i, '')
    .replace(/ft\..*/i, '')
    .trim();
}

/**
 * Checks song details to filter out VIP/Paid songs that cannot be played directly.
 * Fee: 0=Free, 8=Free(LowQ), 1=VIP, 4=PaidAlbum
 */
const checkSongDetails = async (ids: number[]): Promise<Set<number>> => {
    if (ids.length === 0) return new Set();
    try {
        const res = await fetch(`${NCM_API_BASE}/song/detail?ids=${ids.join(',')}`);
        const data = await res.json();
        const playableIds = new Set<number>();
        
        data.songs?.forEach((song: any) => {
            // Strictly allow only Free (0) or Free LowQ (8)
            if (song.fee === 0 || song.fee === 8) {
                playableIds.add(song.id);
            }
        });
        return playableIds;
    } catch (e) {
        console.warn("Detail check failed", e);
        return new Set(ids);
    }
}

/**
 * Intelligent Song Finder
 * Returns full metadata including Name/Artist because we might switch to a Cover version.
 */
export const findNeteaseMusic = async (trackName: string, artistName: string): Promise<{ url: string, lyrics: string, duration: number, id: number, name: string, artist: string } | null> => {
  const cleanTrack = cleanTitle(trackName);
  
  // Search Strategies
  const searchQueries = [
      `${trackName} ${artistName}`, // 1. Exact
      `${cleanTrack} ${artistName}`, // 2. Clean Exact
      `${cleanTrack} 翻唱`,          // 3. Cover (High success rate for VIP songs)
      `${cleanTrack} Live`,           // 4. Live
      `${cleanTrack} Remix`,
      `${cleanTrack}`                 // 5. Broad
  ];
  
  // Dedup queries
  const uniqueQueries = [...new Set(searchQueries)];

  for (const q of uniqueQueries) {
      try {
        const query = encodeURIComponent(q);
        const searchRes = await fetch(`${NCM_API_BASE}/cloudsearch?keywords=${query}&limit=6`);
        const searchData = await searchRes.json();
        const songs = searchData.result?.songs || [];
        
        if (songs.length === 0) continue;

        const songIds = songs.map((s: any) => s.id);
        const playableIds = await checkSongDetails(songIds);

        // Iterate through songs and pick the best playable one
        for (const song of songs) {
            const ncmSongId = song.id;
            const ncmDuration = song.dt ? song.dt / 1000 : 0; 
            
            // Skip very short clips (< 45s) unless it looks like a skit
            if (ncmDuration < 45) continue;

            // CRITICAL: Only accept songs confirmed as playable
            if (!playableIds.has(ncmSongId)) {
                continue; 
            }

            // Get Real HTTPS URL
            const songUrl = await getMusicUrl(ncmSongId);
            const rawLyrics = await getNeteaseLyrics(ncmSongId);

            console.log(`[MusicService] Found playable version for "${trackName}": ${song.name} (ID: ${ncmSongId})`);

            return {
                url: songUrl,
                lyrics: rawLyrics,
                duration: ncmDuration,
                id: ncmSongId,
                name: song.name, // Return actual name (e.g. "Song (Live)")
                artist: song.ar?.map((a: any) => a.name).join(', ') || 'Unknown'
            };
        }
      } catch (error) {
        console.error(`Netease API Search Error for query "${q}":`, error);
      }
      
      // Small delay between strategies
      await new Promise(r => setTimeout(r, 100));
  }
  
  return null;
};