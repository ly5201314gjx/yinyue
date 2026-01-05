import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import SongCard from './components/SongCard';
import AILyricsPanel from './components/AILyricsPanel';
import SourceManager from './components/SourceManager';
import { searchMusic, getTopCharts, findNeteaseMusic, getNeteaseLyrics } from './services/music';
import { Song, PlayerState, ViewMode, MusicSource } from './types';
import { Search, Music, Heart, Clock, Menu } from 'lucide-react';

const DEFAULT_SOURCES: MusicSource[] = [
  { id: 'm1', name: 'MyFreeMP3', url: 'https://tools.liumingye.cn/music/#/search/M/song/[KEY]', isCustom: false, description: '免费下载/试听/无损' },
  { id: 'm2', name: 'HIFINI', url: 'https://www.hifini.com/search-[KEY]-1.htm', isCustom: false, description: '高品质音乐论坛' },
  { id: 'm3', name: '铜钟音乐', url: 'https://tonzhon.com/search?keyword=[KEY]', isCustom: false, description: '多平台聚合' },
  { id: 'm4', name: 'ZMusic (网易云)', url: 'https://zmusic.zhenxin.me/#/music/search?keywords=[KEY]', isCustom: false, description: '网易云镜像 UI' },
  { id: 'm5', name: 'MusicFree 官网', url: 'https://github.com/maotoumao/MusicFree', isCustom: false, description: '开源插件化播放器' },
  { id: 'm6', name: '下歌吧', url: 'https://xiageba.com/search?q=[KEY]', isCustom: false, description: '无损音乐下载' },
  { id: 'm7', name: '歌词适配', url: 'https://www.geci.me/search?q=[KEY]', isCustom: false, description: 'LRC 歌词下载' },
  { id: 'm8', name: 'QQ音乐 (官方)', url: 'https://y.qq.com/n/ryqq/search?w=[KEY]', isCustom: false },
  { id: 'm9', name: '种子音乐', url: 'https://www.zz123.com/search/?key=[KEY]', isCustom: false, description: '高品质试听' },
  { id: 'm10', name: 'Listen 1', url: 'https://listen1.github.io/listen1/', isCustom: false, description: '全网聚合播放器' },
];

function App() {
  // State
  const [view, setView] = useState<ViewMode>(ViewMode.HOME);
  const [songs, setSongs] = useState<Song[]>([]); 
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Panels
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSourceManagerOpen, setIsSourceManagerOpen] = useState(false);

  // Data persistence
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [musicSources, setMusicSources] = useState<MusicSource[]>(DEFAULT_SOURCES);
  
  // Cache
  const [homeSongs, setHomeSongs] = useState<Song[]>([]);
  const [searchResultSongs, setSearchResultSongs] = useState<Song[]>([]);

  // Player State
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentSong: null,
    isPlaying: false,
    isLoading: false,
    volume: 0.5,
    progress: 0,
    duration: 0,
    currentTime: 0
  });

  // Initial Load & Persistence
  useEffect(() => {
    loadInitialData();
    const savedSources = localStorage.getItem('onemusic_sources');
    if (savedSources) {
        setMusicSources(JSON.parse(savedSources));
    }
  }, []);

  // Update song list based on view
  useEffect(() => {
      switch(view) {
          case ViewMode.HOME:
              setSongs(homeSongs);
              break;
          case ViewMode.SEARCH:
              setSongs(searchResultSongs);
              break;
          case ViewMode.LIBRARY:
              setSongs(likedSongs);
              break;
          case ViewMode.RECENT:
              setSongs(recentSongs);
              break;
      }
  }, [view, homeSongs, searchResultSongs, likedSongs, recentSongs]);

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

  const loadInitialData = async () => {
    setLoading(true);
    const results = await getTopCharts();
    setHomeSongs(results);
    if (view === ViewMode.HOME) setSongs(results);
    setLoading(false);
  };

  // Search Logic
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setView(ViewMode.SEARCH);
    setIsSidebarOpen(false); 

    const results = await searchMusic(searchQuery);
    setSearchResultSongs(results);
    setSongs(results);
    setLoading(false);
  };

  // Helper to update lists
  const updateSongInLists = (updatedSong: Song) => {
      const updateList = (list: Song[]) => list.map(s => s.trackId === updatedSong.trackId ? updatedSong : s);
      setHomeSongs(prev => updateList(prev));
      setSearchResultSongs(prev => updateList(prev));
      setLikedSongs(prev => updateList(prev));
      setRecentSongs(prev => updateList(prev));
  };

  // Player Handlers
  const playSong = async (song: Song) => {
    // Case 1: Toggling the same song
    if (playerState.currentSong?.trackId === song.trackId) {
        setPlayerState(prev => ({
            ...prev,
            isPlaying: !prev.isPlaying
        }));
        return;
    }

    // Case 2: New song selected
    // Start with loading state.
    // IMPORTANT: Clear the previewUrl initially to prevent the 30s preview from playing
    // while we search for the full version. We strictly want full version only.
    // Note: If source is Netease, the URL is likely valid, but we might want to check lyrics.
    const loadingSong = { ...song, previewUrl: song.source === 'netease' ? song.previewUrl : '' };

    setPlayerState(prev => ({ 
        ...prev, 
        currentSong: loadingSong, 
        isPlaying: false, 
        isLoading: true,
        currentTime: 0,
        progress: 0,
        duration: 0 
    }));

    let songToPlay: Song | null = null;

    if (song.isFullVersion) {
        songToPlay = song;
        // If it's a Netease song but missing lyrics, fetch them now
        if (song.source === 'netease' && !song.lyrics) {
             try {
                const lyrics = await getNeteaseLyrics(song.trackId);
                songToPlay = { ...songToPlay, lyrics };
                // Update cache with lyrics
                updateSongInLists(songToPlay);
             } catch (e) {
                 console.log("Lazy lyrics fetch failed", e);
             }
        }
    } else {
        try {
            const fullData = await findNeteaseMusic(song.trackName, song.artistName);
            
            if (fullData && fullData.url) {
                // We found a match!
                songToPlay = {
                    ...song,
                    previewUrl: fullData.url, // Full MP3 URL
                    isFullVersion: true,
                    lyrics: fullData.lyrics,
                    trackTimeMillis: fullData.duration * 1000, // Update metadata with actual full duration
                    source: 'netease' // Mark as fulfilled by Netease
                };
                updateSongInLists(songToPlay);
            } else {
                console.warn("Full version not found.");
            }
        } catch (e) {
            console.error("Failed to fetch full version:", e);
        }
    }

    // Update state based on result
    setPlayerState(prev => {
        // Only update if user hasn't switched songs while waiting
        if (prev.currentSong?.trackId === song.trackId) {
            if (songToPlay) {
                return {
                    ...prev,
                    currentSong: songToPlay,
                    isPlaying: true,
                    isLoading: false,
                    duration: songToPlay.trackTimeMillis ? songToPlay.trackTimeMillis / 1000 : 0
                };
            } else {
                // FAILED to find full version.
                alert("抱歉，未找到该歌曲的完整免费音源。");
                return {
                    ...prev,
                    currentSong: null,
                    isPlaying: false,
                    isLoading: false
                };
            }
        }
        return prev;
    });

    if (songToPlay) {
        setRecentSongs(prev => {
            const filtered = prev.filter(s => s.trackId !== song.trackId);
            return [songToPlay!, ...filtered].slice(0, 50); 
        });
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

  const handleNext = () => {
    if (!playerState.currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.trackId === playerState.currentSong?.trackId);
    let nextIndex = 0;
    if (currentIndex !== -1) {
        nextIndex = (currentIndex + 1) % songs.length;
    }
    playSong(songs[nextIndex]);
  };

  const handlePrev = () => {
    if (!playerState.currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.trackId === playerState.currentSong?.trackId);
    let prevIndex = 0;
    if (currentIndex !== -1) {
        prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    }
    playSong(songs[prevIndex]);
  };

  const updateTime = (time: number) => {
    setPlayerState(prev => ({ ...prev, currentTime: time }));
  };

  const updateDuration = (duration: number) => {
    // Simply update duration. We only play full versions now, 
    // so no need to hide/mask 30s preview durations.
    setPlayerState(prev => ({ ...prev, duration }));
  };

  const isLiked = (songId: number) => likedSongs.some(s => s.trackId === songId);

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
              placeholder="搜索歌曲、歌手或专辑..."
              className="w-full bg-white border border-slate-200/80 hover:border-indigo-300/50 rounded-2xl py-3.5 pl-14 pr-6 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-800 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] font-[Noto Sans SC]"
            />
          </form>
          
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition shrink-0 shadow-sm text-indigo-600 hover:shadow-md hover:scale-105 duration-300">
                <Music size={20} />
             </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-32">
          
          <div className="mb-8 flex items-end justify-between max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-black tracking-tight text-slate-900 font-[Noto Sans SC]">
                {view === ViewMode.HOME ? '发现' : 
                view === ViewMode.SEARCH ? '搜索结果' : 
                view === ViewMode.LIBRARY ? '我的收藏' : '最近播放'}
                </h2>
                {view === ViewMode.HOME && <p className="text-slate-500 text-sm font-medium">今日热门流行金曲</p>}
            </div>
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-8 max-w-[1600px] mx-auto">
                {songs.map(song => (
                    <SongCard 
                    key={song.trackId} 
                    song={song} 
                    isPlaying={playerState.currentSong?.trackId === song.trackId && playerState.isPlaying}
                    isLoading={playerState.currentSong?.trackId === song.trackId && playerState.isLoading}
                    isLiked={isLiked(song.trackId)}
                    onPlay={playSong}
                    onToggleLike={toggleLike}
                    />
                ))}
                </div>

                {/* Empty States */}
                {!loading && songs.length === 0 && (
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
                             <p className="text-slate-500 font-medium">未找到相关歌曲</p>
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
          isLiked={playerState.currentSong ? isLiked(playerState.currentSong.trackId) : false}
          onPlayPause={togglePlayPause}
          onVolumeChange={(v) => setPlayerState(p => ({...p, volume: v}))}
          onTimeUpdate={updateTime}
          onDurationChange={updateDuration}
          onNext={handleNext}
          onPrev={handlePrev}
          onToggleLyrics={() => setIsLyricsOpen(!isLyricsOpen)}
          onToggleLike={toggleLike}
        />
      </div>
    </div>
  );
}

export default App;