import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, ListMusic, Volume1, Heart, Repeat, Repeat1, Shuffle, Loader2 } from 'lucide-react';
import { Song, PlayerState, PlayMode } from '../types';

interface PlayerBarProps {
  playerState: PlayerState;
  playMode: PlayMode;
  isLiked: boolean;
  isPlaylistOpen: boolean;
  onPlayPause: () => void;
  onVolumeChange: (vol: number) => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onNext: () => void; // Manual Next
  onEnded: () => void; // Auto Next (Song Finished)
  onPrev: () => void;
  onToggleLyrics: () => void;
  onToggleLike: (song: Song) => void;
  onLatencyChange: (latency: number) => void;
  onToggleMode: () => void;
  onTogglePlaylist: () => void;
  onPlayError: () => void;
  onPlaybackStalled: () => void; // New prop for retry logic
}

const PlayerBar: React.FC<PlayerBarProps> = ({
  playerState,
  playMode,
  isLiked,
  isPlaylistOpen,
  onPlayPause,
  onVolumeChange,
  onTimeUpdate,
  onDurationChange,
  onNext,
  onEnded,
  onPrev,
  onToggleLyrics,
  onToggleLike,
  onLatencyChange,
  onToggleMode,
  onTogglePlaylist,
  onPlayError,
  onPlaybackStalled
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { currentSong, isPlaying, isLoading, volume, currentTime, duration } = playerState;
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const loadStartTimeRef = useRef<number>(0);
  const lastTimeUpdateRef = useRef<number>(0);
  const [errorRetries, setErrorRetries] = useState(0);
  const pendingSeekTimeRef = useRef<number | null>(null);
  
  // Watchdog timer reference
  const watchdogTimerRef = useRef<any>(null);

  // Reset retries when song changes
  useEffect(() => {
    setErrorRetries(0);
  }, [currentSong?.trackId]);

  // --- Watchdog: Auto-retry if not playing after 2 seconds ---
  useEffect(() => {
    // Clear existing timer whenever state changes
    if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
    }

    if (isPlaying && !isLoading && currentSong) {
        watchdogTimerRef.current = setTimeout(() => {
            if (audioRef.current) {
                // If strictly paused OR stuck at 0:00 despite being "playing" state
                const isStuck = audioRef.current.paused || (audioRef.current.currentTime < 0.1 && !audioRef.current.ended && (!currentSong.startTime || currentSong.startTime < 0.1));
                
                if (isStuck) {
                    console.warn("[PlayerBar] Watchdog triggered: Playback stalled, requesting retry.");
                    onPlaybackStalled();
                }
            }
        }, 2500); // 2.5 seconds tolerance
    }

    return () => {
        if (watchdogTimerRef.current) {
            clearTimeout(watchdogTimerRef.current);
        }
    };
  }, [isPlaying, isLoading, currentSong?.trackId, currentSong?.previewUrl, onPlaybackStalled]);


  // Sync Audio Playback State
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && !isLoading) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Playback prevented or interrupted:", error);
            // Don't error immediately, let the watchdog handle it if it persists
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isLoading]);

  // Sync Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Sync Source (URL Change)
  useEffect(() => {
      if (currentSong && audioRef.current) {
          if (audioRef.current.src !== currentSong.previewUrl) {
              loadStartTimeRef.current = performance.now();
              audioRef.current.src = currentSong.previewUrl;
              
              // Register start time if present (e.g. for refresh)
              if (currentSong.startTime !== undefined) {
                  pendingSeekTimeRef.current = currentSong.startTime;
                  // Try setting it immediately (some browsers allow it)
                  audioRef.current.currentTime = currentSong.startTime;
              } else {
                  pendingSeekTimeRef.current = null;
              }

              audioRef.current.load(); // Explicit load helps some browsers
              lastTimeUpdateRef.current = 0; 
              onLatencyChange(0);
          }
      }
  }, [currentSong?.previewUrl, currentSong?.startTime]);

  // Handle Forced Replay or Seek Trigger (Same URL, different _playId)
  useEffect(() => {
      if (currentSong?._playId && audioRef.current) {
          // Check if we have a specific start time for this "play action"
          const seekTo = currentSong.startTime !== undefined ? currentSong.startTime : 0;
          
          // Only apply if URL is same (otherwise the Sync Source effect handles it)
          if (audioRef.current.src === currentSong.previewUrl) {
              audioRef.current.currentTime = seekTo;
              if (isPlaying && !isLoading) {
                  const playPromise = audioRef.current.play();
                  if (playPromise !== undefined) {
                      playPromise.catch(e => console.log("Replay failed", e));
                  }
              }
          }
      }
  }, [currentSong?._playId]);

  useEffect(() => {
      if (!isSeeking) {
          setSeekValue(currentTime);
      }
  }, [currentTime, isSeeking]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      setSeekValue(time);
      
      if (audioRef.current) {
          const validTime = Math.min(time, (audioRef.current.duration || duration) - 0.5);
          if (validTime >= 0) {
              audioRef.current.currentTime = validTime;
          }
      }
      onTimeUpdate(time);
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
      if (isSeeking) return;
      const time = e.currentTarget.currentTime;
      
      if (Math.abs(time - lastTimeUpdateRef.current) > 0.1 || time < 1) {
          lastTimeUpdateRef.current = time;
          onTimeUpdate(time);
      }
  };

  const handleCanPlay = () => {
     if (loadStartTimeRef.current > 0) {
         const latency = Math.round(performance.now() - loadStartTimeRef.current);
         onLatencyChange(latency);
         loadStartTimeRef.current = 0; 
     }

     // Apply pending seek if any (double check for refresh reliability)
     if (pendingSeekTimeRef.current !== null && audioRef.current) {
         if (Math.abs(audioRef.current.currentTime - pendingSeekTimeRef.current) > 0.5) {
             audioRef.current.currentTime = pendingSeekTimeRef.current;
         }
         pendingSeekTimeRef.current = null;
     }
     
     // CRITICAL FIX: If state says playing, force it now that we can play.
     if (isPlaying && audioRef.current && audioRef.current.paused) {
         audioRef.current.play().catch(e => console.warn("Auto-play on canPlay failed", e));
     }
  };

  const handleError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
      const err = e.currentTarget.error;
      console.error("Audio playback error:", err);
      
      // If error occurs, try to trigger the retry logic via parent
      if (errorRetries < 2) { 
          setErrorRetries(prev => prev + 1);
          onPlayError(); // This effectively asks App to retry
      }
  };

  const getModeIcon = () => {
      switch (playMode) {
          case 'sequence': return <Repeat size={15} />;
          case 'shuffle': return <Shuffle size={15} />;
          case 'single': return <Repeat1 size={15} />;
      }
  };

  const getModeTitle = () => {
      switch (playMode) {
          case 'sequence': return '列表循环';
          case 'shuffle': return '随机播放';
          case 'single': return '单曲循环';
      }
  };

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-auto md:right-8 md:w-[calc(100%-18rem)] md:max-w-5xl md:mx-auto h-[90px] md:h-[80px] bg-white/95 backdrop-blur-2xl border-t md:border border-white/60 shadow-[0_-4px_30px_rgba(0,0,0,0.06)] md:shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-[100] md:rounded-[2rem] transition-all duration-500 flex items-center px-4 md:px-6 pb-safe md:pb-0 gap-3 md:gap-4">
      <audio
        ref={audioRef}
        preload="auto"
        crossOrigin="anonymous"
        // @ts-ignore
        referrerPolicy="no-referrer"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
        onCanPlay={handleCanPlay}
        onEnded={onEnded}
        onError={handleError}
      />

      {/* --- LEFT SECTION: Art & Basic Controls --- */}
      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        {/* Album Art (Spinning) */}
        <div 
            className="relative group cursor-pointer" 
            onClick={onToggleLyrics}
        >
             <div className={`relative w-11 h-11 md:w-14 md:h-14 rounded-full shadow-md border-[2px] border-slate-800 bg-slate-900 overflow-hidden ${isPlaying && !isLoading ? 'animate-[spin_8s_linear_infinite]' : ''}`}>
                 <img
                    src={currentSong.artworkUrl100.replace('100x100', '150x150')}
                    alt={currentSong.trackName}
                    className="w-full h-full object-cover opacity-90"
                 />
                 <div className="absolute inset-0 m-auto w-2.5 h-2.5 bg-slate-100 rounded-full z-10 border border-slate-300" />
             </div>
        </div>

        {/* Controls Group */}
        <div className="flex items-center gap-2 md:gap-3">
             <button 
                onClick={() => onToggleLike(currentSong)}
                className={`transition-all hover:scale-110 active:scale-90 ${isLiked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-400'}`}
            >
                <Heart size={18} fill={isLiked ? "currentColor" : "none"} strokeWidth={2.5} />
            </button>
            
            <button onClick={onPrev} className="text-slate-700 hover:text-indigo-600 transition-colors hover:scale-110 active:scale-95">
             <SkipBack size={20} fill="currentColor" className="stroke-none" />
           </button>
           
           <button
             onClick={onPlayPause}
             disabled={isLoading}
             className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg shadow-indigo-100 
                ${isLoading 
                    ? 'bg-white border-2 border-indigo-100 cursor-wait' 
                    : 'bg-indigo-600 text-white hover:scale-105 active:scale-95 hover:bg-indigo-700 hover:shadow-indigo-500/30'
                }`}
           >
             {isLoading ? (
                 <Loader2 size={18} className="animate-spin text-indigo-500" />
             ) : isPlaying ? (
                 <Pause size={18} fill="currentColor" className="stroke-none" />
             ) : (
                 <Play size={18} fill="currentColor" className="stroke-none ml-0.5" />
             )}
           </button>
           
           <button onClick={onNext} className="text-slate-700 hover:text-indigo-600 transition-colors hover:scale-110 active:scale-95">
             <SkipForward size={20} fill="currentColor" className="stroke-none" />
           </button>

           <button 
             onClick={onToggleMode}
             className="text-slate-400 hover:text-indigo-500 transition-colors active:scale-90 ml-1" 
             title={getModeTitle()}
           >
             {getModeIcon()}
           </button>
        </div>
      </div>

      {/* --- CENTER SECTION: Precision Progress Bar --- */}
      <div className="flex-1 flex flex-col justify-center h-full max-w-2xl px-2">
        <div className="group relative w-full h-8 flex items-center cursor-pointer">
            {/* Background Track */}
            <div className="absolute inset-x-0 h-[3px] md:h-1 bg-slate-200 rounded-full overflow-hidden transition-all duration-300 ease-out group-hover:h-3 group-hover:bg-slate-200/80">
                {/* Active Progress */}
                <div 
                    className="h-full bg-slate-800 rounded-full transition-all duration-100 ease-linear group-hover:bg-indigo-500"
                    style={{ width: `${(seekValue / (duration || 1)) * 100}%` }}
                />
            </div>

            {/* Thumb (Only visible on hover/drag) */}
            <div 
                className="absolute h-3 w-3 bg-white shadow-md border border-slate-100 rounded-full pointer-events-none transition-all duration-200 opacity-0 group-hover:opacity-100 group-hover:scale-125 z-20"
                style={{ 
                    left: `${(seekValue / (duration || 1)) * 100}%`,
                    transform: 'translateX(-50%)' 
                }}
            />

            {/* The Invisible Input Range for Interaction */}
            <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.01" // High precision
                value={seekValue}
                onChange={handleSeek}
                onMouseDown={() => setIsSeeking(true)}
                onMouseUp={() => setIsSeeking(false)}
                onTouchStart={() => setIsSeeking(true)}
                onTouchEnd={() => setIsSeeking(false)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-col-resize z-30"
                title="拖动精准调节进度"
            />
        </div>
        
        {/* Time Labels underneath */}
        <div className="flex justify-between items-center text-[9px] font-bold text-slate-300 -mt-2.5 px-0.5 select-none pointer-events-none">
            <span>{formatTime(seekValue)}</span>
            <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* --- RIGHT SECTION: Just Volume & Playlist (Removed Song Text) --- */}
      <div className="flex items-center justify-end gap-3 md:gap-4 shrink-0">
        
        {/* Tools Divider */}
        <div className="w-px h-5 bg-slate-200/60 hidden md:block"></div>

        {/* Volume & Playlist */}
        <div className="flex items-center gap-1 md:gap-2">
            <div className="hidden md:flex items-center gap-1 group/vol">
                <button className="text-slate-400 hover:text-slate-600">
                    {volume === 0 ? <Volume2 size={16} /> : <Volume1 size={16} />}
                </button>
                <div className="w-0 overflow-hidden group-hover/vol:w-16 transition-all duration-300 ease-out">
                     <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                        className="w-14 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 ml-1"
                    />
                </div>
            </div>

            <button 
                onClick={onTogglePlaylist}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${isPlaylistOpen ? 'bg-indigo-100 text-indigo-600' : 'bg-transparent hover:bg-slate-100 text-slate-400 hover:text-slate-800'}`}
                title="播放列表"
            >
                <ListMusic size={18} strokeWidth={2.5} />
            </button>
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default PlayerBar;