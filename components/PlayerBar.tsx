import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, ListMusic, Volume1, Heart, Shuffle, Repeat, Loader2 } from 'lucide-react';
import { Song, PlayerState } from '../types';

interface PlayerBarProps {
  playerState: PlayerState;
  isLiked: boolean;
  onPlayPause: () => void;
  onVolumeChange: (vol: number) => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleLyrics: () => void;
  onToggleLike: (song: Song) => void;
}

const PlayerBar: React.FC<PlayerBarProps> = ({
  playerState,
  isLiked,
  onPlayPause,
  onVolumeChange,
  onTimeUpdate,
  onDurationChange,
  onNext,
  onPrev,
  onToggleLyrics,
  onToggleLike
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { currentSong, isPlaying, isLoading, volume, currentTime, duration } = playerState;
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  
  // Ref to throttle time updates. 
  // We use a small threshold (0.1s) to ensure lyrics sync is smooth while not over-rendering.
  const lastTimeUpdateRef = useRef<number>(0);

  // Sync Audio Playback
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && !isLoading) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Playback prevented or interrupted:", error);
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isLoading, currentSong]);

  // Sync Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Sync Source
  useEffect(() => {
      if (currentSong && audioRef.current) {
          if (audioRef.current.src !== currentSong.previewUrl) {
              audioRef.current.src = currentSong.previewUrl;
              lastTimeUpdateRef.current = 0; 
          }
      }
  }, [currentSong]);

  // Update slider when time updates (only if not seeking)
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
      // High frequency update for lyrics (every ~100ms)
      if (Math.abs(time - lastTimeUpdateRef.current) > 0.1 || time < 1) {
          lastTimeUpdateRef.current = time;
          onTimeUpdate(time);
      }
  };

  if (!currentSong) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-auto md:right-8 md:w-[calc(100%-18rem)] md:max-w-4xl md:mx-auto h-[100px] md:h-[88px] bg-white/95 backdrop-blur-xl border-t md:border border-white/50 shadow-[0_-4px_30px_rgba(0,0,0,0.08)] md:shadow-[0_12px_40px_-4px_rgba(0,0,0,0.15)] z-[100] md:rounded-[2.5rem] transition-all duration-500 flex items-center px-4 md:px-8 pb-safe md:pb-0">
      <audio
        ref={audioRef}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
        onEnded={onNext}
        onError={(e) => console.error("Audio playback error", e)}
      />

      {/* Album Art & Info */}
      <div className="flex items-center gap-4 w-1/3 min-w-0 pr-4">
        <div 
            className="relative group cursor-pointer shrink-0" 
            onClick={onToggleLyrics}
        >
             <div className={`relative w-14 h-14 rounded-full shadow-lg border-[3px] border-slate-900 bg-slate-900 overflow-hidden ${isPlaying && !isLoading ? 'animate-[spin_6s_linear_infinite]' : ''}`}>
                 <img
                    src={currentSong.artworkUrl100.replace('100x100', '150x150')}
                    alt={currentSong.trackName}
                    className="w-full h-full object-cover opacity-90"
                 />
                 <div className="absolute inset-0 m-auto w-3 h-3 bg-slate-100 rounded-full z-10 border border-slate-300" />
             </div>
        </div>
       
        <div className="min-w-0 flex flex-col justify-center gap-0.5">
            <h4 className="text-slate-900 font-extrabold truncate text-sm cursor-pointer hover:text-indigo-600 transition-colors" onClick={onToggleLyrics}>
                {currentSong.trackName}
            </h4>
            <div className="flex items-center gap-2">
                <p className="text-slate-500 text-xs truncate font-medium">{currentSong.artistName}</p>
                <button 
                    onClick={() => onToggleLike(currentSong)}
                    className={`transition-all hover:scale-110 active:scale-90 ${isLiked ? 'text-rose-500' : 'text-slate-300 hover:text-rose-400'}`}
                >
                    <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                </button>
            </div>
        </div>
      </div>

      {/* Center Controls & Progress */}
      <div className="flex flex-col items-center justify-center gap-1 w-1/3 -mt-1">
        <div className="flex items-center justify-center gap-5 md:gap-6 mb-1">
           <button className="text-slate-300 hover:text-indigo-500 transition-colors hidden md:block" title="随机播放">
             <Shuffle size={16} />
           </button>
           
           <button onClick={onPrev} className="text-slate-800 hover:text-indigo-600 transition-colors hover:scale-110 active:scale-95">
             <SkipBack size={22} fill="currentColor" className="stroke-none" />
           </button>
           
           <button
             onClick={onPlayPause}
             disabled={isLoading}
             className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl shadow-indigo-200 
                ${isLoading 
                    ? 'bg-white border-2 border-indigo-100 cursor-wait' 
                    : 'bg-indigo-600 text-white hover:scale-105 active:scale-95 hover:bg-indigo-700 hover:shadow-indigo-500/30'
                }`}
           >
             {isLoading ? (
                 <Loader2 size={20} className="animate-spin text-indigo-500" />
             ) : isPlaying ? (
                 <Pause size={20} fill="currentColor" className="stroke-none" />
             ) : (
                 <Play size={20} fill="currentColor" className="stroke-none ml-1" />
             )}
           </button>
           
           <button onClick={onNext} className="text-slate-800 hover:text-indigo-600 transition-colors hover:scale-110 active:scale-95">
             <SkipForward size={22} fill="currentColor" className="stroke-none" />
           </button>
           
           <button className="text-slate-300 hover:text-indigo-500 transition-colors hidden md:block" title="循环播放">
             <Repeat size={16} />
           </button>
        </div>
        
        {/* Dynamic Progress Bar */}
        <div className="w-full flex items-center gap-3 text-[10px] font-bold text-slate-400 tabular-nums">
          <span className="w-8 text-right">{formatTime(seekValue)}</span>
          
          <div className="flex-1 relative h-6 md:h-5 flex items-center group cursor-pointer">
             <input
                type="range"
                min="0"
                max={duration || 100}
                value={seekValue}
                onChange={handleSeek}
                onMouseDown={() => setIsSeeking(true)}
                onMouseUp={() => setIsSeeking(false)}
                onTouchStart={() => setIsSeeking(true)}
                onTouchEnd={() => setIsSeeking(false)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
             />
             <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden pointer-events-none transition-all duration-300 ease-out group-hover:h-2">
             </div>
             <div 
                className="absolute left-0 h-1 bg-indigo-500 rounded-full pointer-events-none transition-all duration-300 ease-out group-hover:h-2"
                style={{ width: `${(seekValue / (duration || 1)) * 100}%` }}
             >
                 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform duration-200 flex items-center justify-center border border-indigo-50">
                    <div className="w-1 h-1 bg-indigo-500 rounded-full" />
                 </div>
             </div>
          </div>
          
          <span className="w-8">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right Tools */}
      <div className="flex w-1/3 justify-end items-center gap-3 pl-4">
        <div className="hidden md:flex items-center gap-2 group bg-slate-50 hover:bg-white px-3 py-1.5 rounded-full border border-transparent hover:border-slate-100 transition-all hover:shadow-sm">
            {volume === 0 ? <Volume2 size={16} className="text-slate-400" /> : <Volume1 size={16} className="text-slate-600" />}
            <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-20 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-slate-200 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
            />
        </div>
        <button 
            onClick={onToggleLyrics} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-transparent hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-all" 
            title="查看歌词"
        >
             <ListMusic size={20} />
        </button>
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