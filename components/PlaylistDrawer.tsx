import React, { useEffect, useRef } from 'react';
import { X, Play, BarChart3, Trash2 } from 'lucide-react';
import { Song, PlayMode } from '../types';

interface PlaylistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Song[];
  currentSong: Song | null;
  onPlay: (song: Song) => void;
  onClearQueue: () => void;
  playMode: PlayMode;
}

const PlaylistDrawer: React.FC<PlaylistDrawerProps> = ({ 
  isOpen, 
  onClose, 
  queue, 
  currentSong, 
  onPlay, 
  onClearQueue,
  playMode 
}) => {
  const activeRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current song when opened or song changes
  useEffect(() => {
    if (isOpen && activeRef.current && listRef.current) {
        setTimeout(() => {
            activeRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }, 100);
    }
  }, [isOpen, currentSong]);

  if (!isOpen) return null;

  const getModeLabel = (mode: PlayMode) => {
      switch(mode) {
          case 'sequence': return '列表循环';
          case 'shuffle': return '随机播放';
          case 'single': return '单曲循环';
          default: return '列表循环';
      }
  };

  return (
    <div className="fixed inset-0 z-[110] flex flex-col justify-end md:justify-end md:items-end md:bottom-[100px] md:right-8 pointer-events-none">
       {/* Mobile Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm md:hidden pointer-events-auto transition-opacity animate-fade-in" 
        onClick={onClose}
      />

      {/* Panel */}
      <div className="
            pointer-events-auto 
            w-full md:w-[360px] 
            h-[65vh] md:h-[65vh] md:max-h-[550px]
            bg-white/95 backdrop-blur-2xl
            rounded-t-[2rem] md:rounded-[2rem] 
            shadow-[0_-10px_60px_-15px_rgba(0,0,0,0.2)] md:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] 
            border border-slate-200/50
            flex flex-col overflow-hidden 
            animate-fade-in origin-bottom
            transition-all duration-300
        ">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/80">
            <div className="flex flex-col gap-0.5">
                <h3 className="text-base font-black text-slate-800 font-[Noto Sans SC] flex items-center gap-2">
                    当前播放
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                        {queue.length}
                    </span>
                </h3>
                <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                     模式: {getModeLabel(playMode)}
                </span>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={onClearQueue}
                    className="p-2 rounded-full bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    title="清空列表"
                >
                    <Trash2 size={16} />
                </button>
                <button 
                    onClick={onClose}
                    className="md:hidden p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                >
                    <X size={18} />
                </button>
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1" ref={listRef}>
            {queue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 pb-12">
                    <div className="p-5 bg-slate-50 rounded-full border border-slate-100">
                        <BarChart3 size={32} className="opacity-40" />
                    </div>
                    <p className="text-sm font-bold text-slate-400">列表空空如也</p>
                </div>
            ) : (
                queue.map((song, index) => {
                    const isActive = currentSong?.trackId === song.trackId;
                    return (
                        <div 
                            key={`${song.trackId}-${index}`}
                            ref={isActive ? activeRef : null}
                            onClick={() => onPlay(song)}
                            className={`group flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200
                                ${isActive 
                                    ? 'bg-indigo-50/80 shadow-sm border border-indigo-100/50' 
                                    : 'hover:bg-slate-50 border border-transparent'
                                }`
                            }
                        >
                             {/* Playing Indicator / Index */}
                            <div className="w-6 flex justify-center shrink-0">
                                {isActive ? (
                                    <div className="flex items-end gap-0.5 h-3">
                                        <div className="w-0.5 bg-indigo-600 rounded-t animate-[music-bar_0.6s_ease-in-out_infinite] h-2"></div>
                                        <div className="w-0.5 bg-indigo-600 rounded-t animate-[music-bar_0.6s_ease-in-out_infinite_0.2s] h-3"></div>
                                        <div className="w-0.5 bg-indigo-600 rounded-t animate-[music-bar_0.6s_ease-in-out_infinite_0.4s] h-1.5"></div>
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-400 font-bold tabular-nums group-hover:hidden">
                                        {index + 1}
                                    </span>
                                )}
                                {!isActive && (
                                    <Play size={12} className="hidden group-hover:block text-slate-500 fill-slate-500" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                <span className={`text-xs font-bold truncate transition-colors ${isActive ? 'text-indigo-700' : 'text-slate-700 group-hover:text-slate-900'}`}>
                                    {song.trackName}
                                </span>
                                <span className={`text-[10px] truncate transition-colors font-medium ${isActive ? 'text-indigo-500' : 'text-slate-400'}`}>
                                    {song.artistName}
                                </span>
                            </div>

                            {/* Duration */}
                            {song.trackTimeMillis && (
                                <span className="text-[10px] text-slate-300 font-bold tabular-nums px-1">
                                    {Math.floor(song.trackTimeMillis / 1000 / 60)}:{String(Math.floor(song.trackTimeMillis / 1000 % 60)).padStart(2, '0')}
                                </span>
                            )}
                        </div>
                    );
                })
            )}
        </div>
      </div>
    </div>
  );
};

export default PlaylistDrawer;