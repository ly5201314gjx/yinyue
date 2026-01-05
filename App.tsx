import React, { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import SongCard from './components/SongCard';
import AILyricsPanel from './components/AILyricsPanel';
import SourceManager from './components/SourceManager';
import PlaylistDrawer from './components/PlaylistDrawer';
import { searchMusic, getTopCharts, findNeteaseMusic, getNeteaseLyrics } from './services/music';
import { Song, PlayerState, ViewMode, MusicSource, PlayMode } from './types';
import { Search, Music, Heart, Clock, Menu, ListFilter, User, X, Loader2, RefreshCw } from 'lucide-react';

const DEFAULT_SOURCES: MusicSource[] = [
  // --- High Quality Aggregators ---
  { id: 'm1', name: 'MyFreeMP3', url: 'https://tools.liumingye.cn/music/#/search/M/song/[KEY]', isCustom: false, description: '最强推荐/无损下载/多源' },
  { id: 'm2', name: 'HIFINI', url: 'https://www.hifini.com/search-[KEY]-1.htm', isCustom: false, description: '音乐磁场/高品质论坛' },
  { id: 'm3', name: '铜钟音乐', url: 'https://tonzhon.com/search?keyword=[KEY]', isCustom: false, description: '简洁/多平台聚合' },
  { id: 'm4', name: 'MusicFree', url: 'http://musicfree.app/', isCustom: false, description: '开源插件化播放器(神级)' },
  { id: 'm5', name: '下歌吧', url: 'https://xiageba.com/search?q=[KEY]', isCustom: false, description: '无损FLAC/MP3直链' },
  
  // --- Platform Mirrors & Tools ---
  { id: 'm6', name: 'Listen 1', url: 'https://listen1.github.io/listen1/', isCustom: false, description: '浏览器扩展/全网聚合' },
  { id: 'm7', name: '歌词适配', url: 'https://www.geci.me/search?q=[KEY]', isCustom: false, description: 'LRC歌词/音频下载' },
  { id: 'm8', name: 'MKOnline', url: 'https://music.sl167.com/?name=[KEY]&type=netease', isCustom: false, description: '在线网页播放器' },
  { id: 'm9', name: 'Slider.kz', url: 'https://slider.kz/#/search/[KEY]', isCustom: false, description: 'VK资源/国际无损' },
  { id: 'm10', name: 'Y2Mate', url: 'https://www.y2mate.com/search/[KEY]', isCustom: false, description: 'YouTube转MP3神器' },
  
  // --- Direct Search Links ---
  { id: 'm11', name: 'QQ音乐', url: 'https://y.qq.com/n/ryqq/search?w=[KEY]', isCustom: false },
  { id: 'm12', name: '网易云', url: 'https://music.163.com/#/search/m/?s=[KEY]', isCustom: false },
  { id: 'm13', name: '酷狗音乐', url: 'https://www.kugou.com/yy/html/search.html#searchType=song&searchKey=[KEY]', isCustom: false },
  { id: 'm14', name: '酷我音乐', url: 'http://www.kuwo.cn/search/list?key=[KEY]', isCustom: false },
  { id: 'm15', name: 'Bilibili', url: 'https://search.bilibili.com/all?keyword=[KEY]&order=click', isCustom: false, description: '二次元/现场/MV' },
  
  // --- International / Niche ---
  { id: 'm16', name: 'SoundCloud', url: 'https://soundcloud.com/search?q=[KEY]', isCustom: false, description: '原创/独立音乐' },
  { id: 'm17', name: 'Spotify', url: 'https://open.spotify.com/search/[KEY]', isCustom: false, description: '全球流媒体' },
  { id: 'm18', name: '5sing', url: 'http://5sing.kugou.com/search/song/?keyword=[KEY]', isCustom: false, description: '古风/原创/翻唱' },
  { id: 'm19', name: 'Audiomack', url: 'https://audiomack.com/search?q=[KEY]', isCustom: false, description: '免费Mixtape/HipHop' },
  { id: 'm20', name: 'Bandcamp', url: 'https://bandcamp.com/search?q=[KEY]', isCustom: false, description: '支持独立音乐人' },
  { id: 'm21', name: 'Jamendo', url: 'https://www.jamendo.com/search?q=[KEY]', isCustom: false, description: '版权免费音乐' },
  { id: 'm22', name: 'Freesound', url: 'https://freesound.org/search/?q=[KEY]', isCustom: false, description: '音效/采样' },
  
  // --- Download Tools ---
  { id: 'm23', name: 'X2Download', url: 'https://x2download.app/en/mp3', isCustom: false, description: '通用视频转音频' },
  { id: 'm24', name: 'TikDown', url: 'https://tikdown.org/', isCustom: false, description: 'TikTok音频下载' },
  { id: 'm25', name: 'Soggfy', url: 'https://github.com/Rafiuth/Soggfy', isCustom: false, description: 'Spotify下载插件' },
  { id: 'm26', name: 'SpotDL', url: 'https://github.com/spotDL/spotify-downloader', isCustom: false, description: 'Spotify命令行下载' },
  { id: 'm27', name: 'Seal', url: 'https://github.com/JunkFood02/Seal', isCustom: false, description: 'Android通用下载器' },
  { id: 'm28', name: 'SaveFrom', url: 'https://en.savefrom.net/', isCustom: false, description: '老牌下载工具' },
];

interface PlayOptions {
  forceReload?: boolean;
  keepQueue?: boolean;
  toggle?: boolean;
}

function App() {
  // State
  const [view, setView] = useState<ViewMode>(ViewMode.HOME);
  const [songs, setSongs] = useState<Song[]>([]); 
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Secondary Filters
  const [trackFilter, setTrackFilter] = useState('');
  const [artistFilter, setArtistFilter] = useState('');
  const [isTrackFilterOpen, setIsTrackFilterOpen] = useState(false);
  const [isArtistFilterOpen, setIsArtistFilterOpen] = useState(false);
  
  // Panels
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSourceManagerOpen, setIsSourceManagerOpen] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);

  // Data persistence
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [musicSources, setMusicSources] = useState<MusicSource[]>(DEFAULT_SOURCES);
  
  // Cache
  const [homeSongs, setHomeSongs] = useState<Song[]>([]);
  const [searchResultSongs, setSearchResultSongs] = useState<Song[]>([]);

  // Playback Control
  const [playMode, setPlayMode] = useState<PlayMode>('sequence');
  const [playbackQueue, setPlaybackQueue] = useState<Song[]>([]);
  
  // Flag to differentiate auto-next from manual-next (for Single Loop)
  const isAutoPlayRef = useRef(false);

  // Player State
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentSong: null,
    isPlaying: false,
    isLoading: false,
    volume: 0.5,
    progress: 0,
    duration: 0,
    currentTime: 0,
    latency: undefined
  });

  // Filtered Songs Computation (Used for display AND setting queue)
  const displayedSongs = useMemo(() => {
    let result: Song[] = [];
    
    // Select base list
    switch(view) {
        case ViewMode.HOME:
            result = homeSongs;
            break;
        case ViewMode.SEARCH:
            result = searchResultSongs;
            break;
        case ViewMode.LIBRARY:
            result = likedSongs;
            break;
        case ViewMode.RECENT:
            result = recentSongs;
            break;
        default:
            result = songs;
    }
    
    // Apply Secondary Filters
    if (trackFilter.trim()) {
        const tf = trackFilter.toLowerCase();
        result = result.filter(s => s.trackName.toLowerCase().includes(tf));
    }
    if (artistFilter.trim()) {
        const af = artistFilter.toLowerCase();
        result = result.filter(s => s.artistName.toLowerCase().includes(af));
    }

    return result;
  }, [view, homeSongs, searchResultSongs, likedSongs, recentSongs, songs, trackFilter, artistFilter]);

  // Extract unique artists for chips from search results
  const availableArtists = useMemo(() => {
    if (view !== ViewMode.SEARCH) return [];
    
    const counts: Record<string, number> = {};
    searchResultSongs.forEach(s => {
        const mainArtist = s.artistName.split(/[,&]/)[0].trim();
        counts[mainArtist] = (counts[mainArtist] || 0) + 1;
    });

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1]) // Sort by frequency
        .map(([name]) => name)
        .slice(0, 15); 
  }, [searchResultSongs, view]);

  // Initial Load & Persistence
  useEffect(() => {
    loadInitialData();
    
    // Load persisted data
    try {
        const savedSources = localStorage.getItem('onemusic_sources');
        if (savedSources) setMusicSources(JSON.parse(savedSources));
        
        const savedLiked = localStorage.getItem('onemusic_liked');
        if (savedLiked) setLikedSongs(JSON.parse(savedLiked));
        
        const savedRecent = localStorage.getItem('onemusic_recent');
        if (savedRecent) setRecentSongs(JSON.parse(savedRecent));
    } catch (e) {
        console.error("Failed to load local data", e);
    }
  }, []);

  // Persist Liked Songs
  useEffect(() => {
      localStorage.setItem('onemusic_liked', JSON.stringify(likedSongs));
  }, [likedSongs]);

  // Persist Recent Songs
  useEffect(() => {
      localStorage.setItem('onemusic_recent', JSON.stringify(recentSongs));
  }, [recentSongs]);

  // Source Management
  const addSource = (name: string, url: string) => {
    const newSource: MusicSource = {
        id: Date.now().toString(),
        name,
        url,
        isCustom: true
    };
    const updated = [...musicSources, newSource];
    setMusicSources(updated);
    localStorage.setItem('onemusic_sources', JSON.stringify(updated));
  };

  const removeSource = (id: string) => {
      const updated = musicSources.filter(s => s.id !== id);
      setMusicSources(updated);
      localStorage.setItem('onemusic_sources', JSON.stringify(updated));
  };

  const handleResetData = () => {
      // Clear Local Storage
      localStorage.removeItem('onemusic_sources');
      localStorage.removeItem('onemusic_liked');
      localStorage.removeItem('onemusic_recent');
      
      // Reset State
      setMusicSources(DEFAULT_SOURCES);
      setLikedSongs([]);
      setRecentSongs([]);
      setPlaybackQueue([]);
      setPlayerState(prev => ({ ...prev, currentSong: null, isPlaying: false, currentTime: 0 }));
      
      // Reset Views
      setView(ViewMode.HOME);
      loadInitialData(); // Reload home data
  };

  const loadInitialData = async () => {
    setLoading(true);
    const results = await getTopCharts();
    setHomeSongs(results);
    setLoading(false);
  };

  // Search Logic
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setView(ViewMode.SEARCH);
    
    // Reset filters
    setTrackFilter('');
    setArtistFilter('');
    setIsTrackFilterOpen(false);
    setIsArtistFilterOpen(false);
    
    setIsSidebarOpen(false); 

    const results = await searchMusic(searchQuery);
    setSearchResultSongs(results);
    setLoading(false);
  };

  // Helper to update lists
  const updateSongInLists = (updatedSong: Song) => {
      const updateList = (list: Song[]) => list.map(s => s.trackId === updatedSong.trackId ? updatedSong : s);
      setHomeSongs(prev => updateList(prev));
      setSearchResultSongs(prev => updateList(prev));
      setLikedSongs(prev => updateList(prev));
      setRecentSongs(prev => updateList(prev));
      setPlaybackQueue(prev => updateList(prev));
  };

  // Player Handlers
  const playSong = async (song: Song, options: PlayOptions = {}) => {
    const { forceReload = false, keepQueue = false, toggle = true } = options;

    // Determine the queue: if from main list click, update queue. If internal play (next/prev), keep queue.
    if (!keepQueue) {
        // If clicking from a list, update the playback queue to match current filtered view
        setPlaybackQueue(displayedSongs);
    }

    const playId = Date.now(); // Generate a new Play ID for every play request

    // Check if same song
    if (!forceReload && playerState.currentSong?.trackId === song.trackId) {
        // If toggle is true (manual play/pause click), we just toggle state
        if (toggle) {
            setPlayerState(prev => ({
                ...prev,
                isPlaying: !prev.isPlaying
            }));
            return;
        } 
        // If toggle is false (e.g. Next Button, or Auto Loop), we want to force replay.
        // We update the currentSong with a new _playId to trigger effects in PlayerBar.
        else {
             setPlayerState(prev => ({
                ...prev,
                currentSong: { ...prev.currentSong!, _playId: playId },
                isPlaying: true,
                currentTime: 0 // Optimistic reset
            }));
            return;
        }
    }

    const loadingSong = { 
        ...song, 
        // If forceReload is true, we wipe the previewUrl to force a new fetch.
        previewUrl: (forceReload) ? '' : song.previewUrl,
        _playId: playId
    };

    setPlayerState(prev => ({ 
        ...prev, 
        currentSong: loadingSong, 
        isPlaying: false, 
        isLoading: true,
        currentTime: 0,
        progress: 0,
        duration: 0,
        latency: undefined
    }));

    let songToPlay: Song | null = null;

    // IMPORTANT: Always try to find a "Playable" version now if not explicitly marked full.
    // The previous implementation trusted 'isFullVersion' too much.
    // Now 'isFullVersion' is strictly checked against fee=0/8 in searchNetease.
    
    // Fast path: Only if verified as FREE full version.
    if (!forceReload && song.isFullVersion && song.previewUrl) {
        songToPlay = { ...song, _playId: playId };
        
        // Lazy lyrics fetch
        if (song.source === 'netease' && !song.lyrics) {
             getNeteaseLyrics(song.trackId).then(lyrics => {
                 if(lyrics && songToPlay) updateSongInLists({ ...songToPlay, lyrics });
             }).catch(console.warn);
        }

    } else {
        // Slow path: It's VIP (fee=1/4) or snippet.
        // Trigger smart search to ensure we get a FREE/LIVE/COVER version.
        try {
            const fullData = await findNeteaseMusic(song.trackName, song.artistName);
            
            if (fullData && fullData.url) {
                songToPlay = {
                    ...song,
                    // IMPORTANT: We KEEP the original trackId so the UI doesn't jump or lose highlight.
                    // We are just swapping the underlying audio source.
                    trackId: song.trackId, 
                    
                    // We also keep the original Name/Artist to prevent the UI from flashing a different name
                    // unless you want to explicitly show it's a cover.
                    // For stability, we keep original metadata but play the fallback audio.
                    // trackName: fullData.name, 
                    // artistName: fullData.artist,
                    
                    previewUrl: fullData.url,
                    isFullVersion: true,
                    lyrics: fullData.lyrics,
                    trackTimeMillis: fullData.duration * 1000,
                    source: 'netease',
                    _playId: playId
                };
            } else {
                // Fallback: Use what we have if search failed
                console.warn("Smart search failed, falling back to original source.");
                songToPlay = { ...song, _playId: playId };
            }
        } catch (e) {
            console.error("Failed to fetch full version:", e);
            songToPlay = { ...song, _playId: playId };
        }
    }

    setPlayerState(prev => {
        // Ensure we are still trying to play *this* song (race condition check)
        // We check playId implicitly via closure scope
        if (songToPlay) {
            return {
                ...prev,
                currentSong: songToPlay,
                isPlaying: true,
                isLoading: false,
                duration: songToPlay.trackTimeMillis ? songToPlay.trackTimeMillis / 1000 : 0
            };
        } else {
            return {
                ...prev,
                isPlaying: false,
                isLoading: false
            };
        }
    });

    if (songToPlay) {
        setRecentSongs(prev => {
            const filtered = prev.filter(s => s.trackId !== song.trackId);
            return [songToPlay!, ...filtered].slice(0, 50); 
        });
    }
  };

  const handlePlayError = () => {
      if (playerState.currentSong) {
          console.log("Playback error detected.");
          // STOP playback on error instead of jumping to next song.
          // This fixes the "jumping to other songs" issue.
          setPlayerState(prev => ({
              ...prev,
              isPlaying: false,
              isLoading: false
          }));
          // Optional: You could show a toast here "Playback failed"
      }
  };

  const refreshCurrentSong = () => {
      if (playerState.currentSong) {
          playSong(playerState.currentSong, { forceReload: true, keepQueue: true, toggle: false });
      }
  };

  const togglePlayPause = () => {
    setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const toggleLike = (song: Song) => {
      setLikedSongs(prev => {
          const isLiked = prev.some(s => s.trackId === song.trackId);
          if (isLiked) {
              return prev.filter(s => s.trackId !== song.trackId);
          } else {
              return [song, ...prev];
          }
      });
  };

  // Logic for finding next song based on Mode
  const handleNext = (isAuto = false) => {
    isAutoPlayRef.current = isAuto;
    
    // Safety check for empty queue or no song
    if (playbackQueue.length === 0) return;

    // Use current song from state, or fallback to first in queue
    const currentId = playerState.currentSong?.trackId;
    const len = playbackQueue.length;
    const currentIndex = currentId ? playbackQueue.findIndex(s => s.trackId === currentId) : -1;
    
    let nextIndex = -1;

    if (playMode === 'single') {
        // Single Loop
        if (isAuto) {
            // Song ended naturally -> Replay same song
            if (playerState.currentSong) {
                playSong(playerState.currentSong, { keepQueue: true, toggle: false });
            }
            return;
        } else {
            // Manual click -> Go to next song (Standard behavior)
            if (currentIndex !== -1) nextIndex = (currentIndex + 1) % len;
        }
    } else if (playMode === 'shuffle') {
        // Shuffle: Pick random index
        if (len === 1) {
            nextIndex = 0;
        } else {
            // Simple random distinct from current
            do {
                nextIndex = Math.floor(Math.random() * len);
            } while (len > 1 && nextIndex === currentIndex);
        }
    } else {
        // Sequence (Loop List): 1->2->3->1
        if (currentIndex !== -1) {
            nextIndex = (currentIndex + 1) % len;
        }
    }

    if (nextIndex !== -1) {
        playSong(playbackQueue[nextIndex], { keepQueue: true, toggle: false });
    } else {
        // Fallback: If current index not found or error, restart list from 0
        playSong(playbackQueue[0], { keepQueue: true, toggle: false });
    }
  };

  const handlePrev = () => {
    if (playbackQueue.length === 0) return;
    
    const len = playbackQueue.length;
    const currentIndex = playerState.currentSong ? playbackQueue.findIndex(s => s.trackId === playerState.currentSong?.trackId) : -1;
    let prevIndex = -1;

    if (playMode === 'shuffle') {
         // Shuffle prev: Random again
         if (len === 1) {
             prevIndex = 0;
         } else {
             do {
                 prevIndex = Math.floor(Math.random() * len);
             } while (len > 1 && prevIndex === currentIndex);
         }
    } else {
         // Loop List or Single (Manual prev goes to prev song)
         if (currentIndex !== -1) {
            prevIndex = (currentIndex - 1 + len) % len;
         }
    }
    
    if (prevIndex !== -1) {
        playSong(playbackQueue[prevIndex], { keepQueue: true, toggle: false });
    } else {
        playSong(playbackQueue[0], { keepQueue: true, toggle: false });
    }
  };

  const togglePlayMode = () => {
      const modes: PlayMode[] = ['sequence', 'shuffle', 'single'];
      const nextMode = modes[(modes.indexOf(playMode) + 1) % modes.length];
      setPlayMode(nextMode);
  };

  const updateTime = (time: number) => {
    setPlayerState(prev => ({ ...prev, currentTime: time }));
  };

  const updateDuration = (duration: number) => {
    setPlayerState(prev => ({ ...prev, duration }));
  };

  const isLiked = (songId: number) => likedSongs.some(s => s.trackId === songId);

  // --- Media Session API Implementation ---
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    
    const { currentSong, isPlaying } = playerState;

    if (currentSong) {
      // 1. Update Metadata (Title, Artist, Artwork)
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.trackName,
        artist: currentSong.artistName,
        album: currentSong.collectionName || 'Lg Music',
        artwork: [
            { src: currentSong.artworkUrl100.replace('100x100', '96x96'), sizes: '96x96', type: 'image/jpeg' },
            { src: currentSong.artworkUrl100.replace('100x100', '128x128'), sizes: '128x128', type: 'image/jpeg' },
            { src: currentSong.artworkUrl100.replace('100x100', '192x192'), sizes: '192x192', type: 'image/jpeg' },
            { src: currentSong.artworkUrl100.replace('100x100', '256x256'), sizes: '256x256', type: 'image/jpeg' },
            { src: currentSong.artworkUrl100.replace('100x100', '384x384'), sizes: '384x384', type: 'image/jpeg' },
            { src: currentSong.artworkUrl100.replace('100x100', '512x512'), sizes: '512x512', type: 'image/jpeg' },
        ]
      });

      // 2. Update Playback State
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      // 3. Set Action Handlers
      // We wrap these in functions to ensure they access the latest state/logic via the effect dependencies
      navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNext(false));
      
      // Note: "Collect/Like" is not a standard MediaSession action supported in system notifications.
    }
  }, [playerState.currentSong, playerState.isPlaying, handleNext, handlePrev, togglePlayPause]);

  return (
    <div className="flex h-screen bg-[#f5f7fa] text-slate-800 font-sans overflow-hidden selection:bg-indigo-100 relative">
      
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-gradient-to-br from-indigo-50/50 via-white to-slate-50" />

      <Sidebar 
        currentView={view} 
        onChangeView={setView} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenSourceManager={() => setIsSourceManagerOpen(true)}
      />

      <SourceManager 
        isOpen={isSourceManagerOpen}
        onClose={() => setIsSourceManagerOpen(false)}
        sources={musicSources}
        onAddSource={addSource}
        onRemoveSource={removeSource}
        onResetData={handleResetData}
      />

      {/* Playlist Sidebar */}
      <PlaylistDrawer 
          isOpen={isPlaylistOpen}
          onClose={() => setIsPlaylistOpen(false)}
          queue={playbackQueue}
          currentSong={playerState.currentSong}
          onPlay={(s) => playSong(s, { keepQueue: true, toggle: false })} // Click in queue = always play
          onClearQueue={() => setPlaybackQueue([])}
          playMode={playMode}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        
        {/* Header / Search */}
        <header className="h-[96px] flex items-center px-4 md:px-10 z-30 shrink-0 gap-6">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-slate-600 transition-colors"
          >
            <Menu size={20} />
          </button>

          <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索 歌名 / 歌手 / 歌名+歌手 ..."
              className="w-full bg-white border border-slate-200/80 hover:border-indigo-300/50 rounded-2xl py-3.5 pl-14 pr-6 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-800 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] font-[Noto Sans SC]"
            />
          </form>
          
          <div className="flex items-center gap-4">
             <div 
                onClick={refreshCurrentSong}
                className={`w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition shrink-0 shadow-sm text-indigo-600 hover:shadow-md hover:scale-105 duration-300 relative group overflow-hidden ${playerState.isLoading ? 'cursor-wait' : ''}`}
                title="点击刷新当前播放连接"
             >
                 {playerState.isLoading ? (
                     <Loader2 size={20} className="animate-spin" />
                 ) : playerState.latency !== undefined && playerState.isPlaying ? (
                     <div className="flex flex-col items-center justify-center leading-none">
                         <span className="text-[10px] font-black">{playerState.latency}</span>
                         <span className="text-[8px] scale-75 font-bold opacity-60">ms</span>
                         <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 flex items-center justify-center backdrop-blur-[1px] transition-opacity">
                            <RefreshCw size={16} />
                         </div>
                     </div>
                 ) : (
                    <Music size={20} />
                 )}
             </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-32">
          
          <div className="mb-6 flex flex-col justify-between max-w-[1600px] mx-auto gap-4">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-black tracking-tight text-slate-900 font-[Noto Sans SC]">
                {view === ViewMode.HOME ? '发现' : 
                view === ViewMode.SEARCH ? '搜索结果' : 
                view === ViewMode.LIBRARY ? '我的收藏' : '最近播放'}
                </h2>
                {view === ViewMode.HOME && <p className="text-slate-500 text-sm font-medium">今日热门流行金曲</p>}
            </div>

            {/* Secondary Filter Bar - Visible only in Search View and when results exist */}
            {view === ViewMode.SEARCH && !loading && searchResultSongs.length > 0 && (
                <div className="flex flex-col gap-3 mt-2 animate-fade-in">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Expandable Song Name Filter */}
                        <div 
                            className={`flex items-center bg-white border border-slate-200 rounded-full py-2 transition-all duration-300 shadow-sm ${isTrackFilterOpen ? 'w-full md:w-64 px-4 ring-2 ring-indigo-500/10 border-indigo-200' : 'w-10 px-0 justify-center hover:bg-slate-50 cursor-pointer'}`}
                        >
                            <Music 
                                size={16} 
                                className={`shrink-0 transition-colors ${trackFilter || isTrackFilterOpen ? 'text-indigo-600' : 'text-slate-400'}`} 
                                onClick={(e) => { e.stopPropagation(); setIsTrackFilterOpen(true); }}
                            />
                            <input 
                                type="text"
                                placeholder="输入歌名筛选..."
                                value={trackFilter}
                                onChange={(e) => setTrackFilter(e.target.value)}
                                onBlur={() => !trackFilter && setIsTrackFilterOpen(false)}
                                autoFocus={isTrackFilterOpen}
                                className={`bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400/80 transition-all duration-300 ml-2 ${isTrackFilterOpen ? 'w-full opacity-100' : 'w-0 opacity-0 hidden'}`}
                            />
                            {trackFilter && isTrackFilterOpen && (
                                <X size={14} className="shrink-0 text-slate-300 hover:text-slate-500 cursor-pointer ml-2" onClick={() => setTrackFilter('')} />
                            )}
                        </div>

                        {/* Expandable Artist Filter */}
                        <div 
                            className={`flex items-center bg-white border border-slate-200 rounded-full py-2 transition-all duration-300 shadow-sm ${isArtistFilterOpen ? 'w-full md:w-64 px-4 ring-2 ring-indigo-500/10 border-indigo-200' : 'w-10 px-0 justify-center hover:bg-slate-50 cursor-pointer'}`}
                        >
                            <User 
                                size={16} 
                                className={`shrink-0 transition-colors ${artistFilter || isArtistFilterOpen ? 'text-indigo-600' : 'text-slate-400'}`} 
                                onClick={(e) => { e.stopPropagation(); setIsArtistFilterOpen(true); }}
                            />
                            <input 
                                type="text"
                                placeholder="输入歌手筛选..."
                                value={artistFilter}
                                onChange={(e) => setArtistFilter(e.target.value)}
                                onBlur={() => !artistFilter && setIsArtistFilterOpen(false)}
                                autoFocus={isArtistFilterOpen}
                                className={`bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400/80 transition-all duration-300 ml-2 ${isArtistFilterOpen ? 'w-full opacity-100' : 'w-0 opacity-0 hidden'}`}
                            />
                            {artistFilter && isArtistFilterOpen && (
                                <X size={14} className="shrink-0 text-slate-300 hover:text-slate-500 cursor-pointer ml-2" onClick={() => setArtistFilter('')} />
                            )}
                        </div>
                    </div>

                    {/* Quick Artist Chips */}
                    {availableArtists.length > 0 && (
                         <div className="flex flex-wrap gap-2 pt-1">
                             {availableArtists.map(artist => (
                                 <button
                                     key={artist}
                                     onClick={() => setArtistFilter(artist === artistFilter ? '' : artist)}
                                     className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                                         artistFilter === artist 
                                         ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 scale-105' 
                                         : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50'
                                     }`}
                                 >
                                     {artist}
                                 </button>
                             ))}
                         </div>
                    )}
                </div>
            )}
          </div>

          {loading ? (
            <div className="h-[50vh] flex flex-col items-center justify-center gap-6">
                <div className="flex gap-2">
                    <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"></div>
                </div>
                <p className="text-slate-400 text-xs">正在搜索全网资源...</p>
            </div>
          ) : (
            <>
                {/* Modified Grid: 3 columns on mobile (grid-cols-3), 4 on md, 5 on lg */}
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-6 max-w-[1600px] mx-auto">
                {displayedSongs.map(song => (
                    <SongCard 
                    key={song.trackId} 
                    song={song} 
                    isPlaying={playerState.currentSong?.trackId === song.trackId && playerState.isPlaying}
                    isLoading={playerState.currentSong?.trackId === song.trackId && playerState.isLoading}
                    isLiked={isLiked(song.trackId)}
                    onPlay={(s) => playSong(s, { keepQueue: false, toggle: true })} // Click from list -> update queue, allow toggle
                    onToggleLike={toggleLike}
                    />
                ))}
                </div>

                {/* Empty States */}
                {!loading && displayedSongs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 md:py-32 text-slate-400 gap-4 text-center">
                        {view === ViewMode.LIBRARY ? (
                            <>
                                <div className="p-6 bg-white rounded-full shadow-sm border border-slate-100 mb-2"><Heart size={32} className="text-slate-300" /></div>
                                <p className="text-slate-600 font-bold">暂无收藏</p>
                                <button onClick={() => setView(ViewMode.HOME)} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-full text-sm font-bold text-white transition shadow-lg shadow-indigo-200 mt-2">去发现音乐</button>
                            </>
                        ) : view === ViewMode.RECENT ? (
                            <>
                                <div className="p-6 bg-white rounded-full shadow-sm border border-slate-100 mb-2"><Clock size={32} className="text-slate-300" /></div>
                                <p className="text-slate-600 font-bold">暂无播放记录</p>
                            </>
                        ) : (
                             <div className="flex flex-col items-center">
                                <ListFilter size={32} className="text-slate-200 mb-2" />
                                <p className="text-slate-500 font-medium">未找到符合条件的歌曲</p>
                                <p className="text-xs text-slate-400 mt-1">尝试切换筛选条件或关键词</p>
                             </div>
                        )}
                    </div>
                )}
            </>
          )}
        </main>

        <AILyricsPanel 
            isOpen={isLyricsOpen} 
            onClose={() => setIsLyricsOpen(false)} 
            song={playerState.currentSong}
            currentTime={playerState.currentTime}
        />

        <PlayerBar 
          playerState={playerState}
          playMode={playMode}
          isLiked={playerState.currentSong ? isLiked(playerState.currentSong.trackId) : false}
          isPlaylistOpen={isPlaylistOpen}
          onPlayPause={togglePlayPause}
          onVolumeChange={(v) => setPlayerState(p => ({...p, volume: v}))}
          onTimeUpdate={updateTime}
          onDurationChange={updateDuration}
          onNext={() => handleNext(false)} // Manual Next
          onEnded={() => handleNext(true)} // Auto Next (Ends)
          onPrev={handlePrev}
          onToggleLyrics={() => setIsLyricsOpen(!isLyricsOpen)}
          onToggleLike={toggleLike}
          onLatencyChange={(l) => setPlayerState(prev => ({...prev, latency: l}))}
          onToggleMode={togglePlayMode}
          onTogglePlaylist={() => setIsPlaylistOpen(!isPlaylistOpen)}
          onPlayError={handlePlayError}
        />
      </div>
    </div>
  );
}

export default App;