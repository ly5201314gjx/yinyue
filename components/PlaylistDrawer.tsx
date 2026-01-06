import React, { useEffect, useRef, useState } from 'react';
import { X, Play, BarChart3, Trash2, CheckCircle2, Circle, ListChecks } from 'lucide-react';
import { Song, PlayMode } from '../types';

interface PlaylistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Song[];
  currentSong: Song | null;
  onPlay: (song: Song) => void;
  onClearQueue: () => void;
  onRemoveSongs: (trackIds: number[]) => void;
  playMode: PlayMode;
}

const PlaylistDrawer: React.FC<PlaylistDrawerProps> = ({ 
  isOpen, 
  onClose, 
  queue, 
  currentSong, 
  onPlay, 
  onClearQueue,
  onRemoveSongs,
  playMode 
}) => {
  const activeRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Auto-scroll to current song when opened or song changes
  useEffect(() => {
    if (isOpen && activeRef.current && listRef.current && !isSelectionMode) {
        setTimeout(() => {
            activeRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }, 100);
    }
  }, [isOpen, currentSong, isSelectionMode]);
  
  // Reset selection mode when closing
  useEffect(() => {
      if (!isOpen) {
          setIsSelectionMode(false);
          setSelectedIds(new Set());
      }
  }, [isOpen]);

  const toggleSelection = (id: number) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === queue.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(queue.map(s => s.trackId)));
      }
  };

  const handleDeleteSelected = () => {
      onRemoveSongs(Array.from(selectedIds));
      setIsSelectionMode(false);
      setSelectedIds(new Set());
  };

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
    <div className="fixed inset-0 z-[110] flex flex-col justify-end md:justify-end md:items-end md:bottom-[100px] md:right-24 pointer-events-none">
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
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/80">
            <div className="flex flex-col gap-0.5">
                <h3 className="text-base font-black text-slate-800 font-[Noto Sans SC] flex items-center gap-2">
                    {isSelectionMode ? `已选择 ${selectedIds.size} 首` : '当前播放'}
                    {!isSelectionMode && (
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                            {queue.length}
                        </span>
                    )}
                </h3>
                {!isSelectionMode && (
                    <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                        模式: {getModeLabel(playMode)}
                    </span>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                {isSelectionMode ? (
                    <>
                         <button 
                            onClick={handleDeleteSelected}
                            disabled={selectedIds.size === 0}
                            className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-full disabled:opacity-50 hover:bg-red-100 transition-colors"
                        >
                            删除
                        </button>
                        <button 
                            onClick={() => setIsSelectionMode(false)}
                            className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors"
                        >
                            取消
                        </button>
                    </>
                ) : (
                    <>
                        <button 
                            onClick={() => setIsSelectionMode(true)}
                            className="p-2 rounded-full bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                            title="批量管理"
                        >
                            <ListChecks size={16} />
                        </button>
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
                    </>
                )}
            </div>
        </div>
        
        {/* Selection Toolbar (Only in Select Mode) */}
        {isSelectionMode && (
            <div className="px-5 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
                <button 
                    onClick={toggleSelectAll}
                    className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 hover:text-indigo-600"
                >
                    {selectedIds.size === queue.length ? <CheckCircle2 size={14} className="text-indigo-600"/> : <Circle size={14} />}
                    全选
                </button>
            </div>
        )}

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
                    const isSelected = selectedIds.has(song.trackId);
                    
                    return (
                        <div 
                            key={`${song.trackId}-${index}`}
                            ref={isActive ? activeRef : null}
                            onClick={() => {
                                if (isSelectionMode) {
                                    toggleSelection(song.trackId);
                                } else {
                                    onPlay(song);
                                }
                            }}
                            className={`group flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200
                                ${isActive && !isSelectionMode
                                    ? 'bg-indigo-50/80 shadow-sm border border-indigo-100/50' 
                                    : 'hover:bg-slate-50 border border-transparent'
                                }
                                ${isSelectionMode && isSelected ? 'bg-indigo-50 border-indigo-100' : ''}
                            `}
                        >
                             {/* Left Icon: Playing Indicator / Index / Checkbox */}
                            <div className="w-6 flex justify-center shrink-0">
                                {isSelectionMode ? (
                                    <div className={`transition-colors ${isSelected ? 'text-indigo-600' : 'text-slate-300'}`}>
                                        {isSelected ? <CheckCircle2 size={18} fill="currentColor" className="text-white" strokeWidth={1.5} /> : <Circle size={18} />}
                                    </div>
                                ) : isActive ? (
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
                                {!isActive && !isSelectionMode && (
                                    <Play size={12} className="hidden group-hover:block text-slate-500 fill-slate-500" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                <span className={`text-xs font-bold truncate transition-colors ${isActive && !isSelectionMode ? 'text-indigo-700' : 'text-slate-700 group-hover:text-slate-900'}`}>
                                    {song.trackName}
                                </span>
                                <span className={`text-[10px] truncate transition-colors font-medium ${isActive && !isSelectionMode ? 'text-indigo-500' : 'text-slate-400'}`}>
                                    {song.artistName}
                                </span>
                            </div>

                            {/* Right Actions: Duration or Single Delete */}
                            {!isSelectionMode ? (
                                <div className="flex items-center">
                                    <div className="hidden group-hover:flex items-center">
                                         <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveSongs([song.trackId]);
                                            }}
                                            className="p-1.5 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                            title="移除歌曲"
                                         >
                                             <Trash2 size={14} />
                                         </button>
                                    </div>
                                    <span className="text-[10px] text-slate-300 font-bold tabular-nums px-1 group-hover:hidden">
                                        {song.trackTimeMillis ? `${Math.floor(song.trackTimeMillis / 1000 / 60)}:${String(Math.floor(song.trackTimeMillis / 1000 % 60)).padStart(2, '0')}` : ''}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-[10px] text-slate-300 font-bold tabular-nums px-1">
                                    {song.trackTimeMillis ? `${Math.floor(song.trackTimeMillis / 1000 / 60)}:${String(Math.floor(song.trackTimeMillis / 1000 % 60)).padStart(2, '0')}` : ''}
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