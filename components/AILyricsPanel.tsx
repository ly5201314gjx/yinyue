import React, { useEffect, useState, useRef } from 'react';
import { X, Disc, Music, Zap } from 'lucide-react';
import { Song } from '../types';

interface AILyricsPanelProps {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
  currentTime: number;
  onSeek: (time: number) => void;
}

interface LyricLine {
    time: number;
    text: string;
}

const parseLrc = (lrc: string): LyricLine[] => {
    if (!lrc) return [];
    const lines = lrc.split('\n');
    const result: LyricLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    
    for (const line of lines) {
        const match = timeRegex.exec(line);
        if (match) {
            const min = parseInt(match[1]);
            const sec = parseInt(match[2]);
            const msStr = match[3].padEnd(3, '0'); 
            const ms = parseInt(msStr);
            const time = min * 60 + sec + ms / 1000;
            const text = line.replace(/\[.*?\]/g, '').trim();
            if (text) {
                result.push({ time, text });
            }
        }
    }
    return result;
};

const AILyricsPanel: React.FC<AILyricsPanelProps> = ({ song, isOpen, onClose, currentTime, onSeek }) => {
  const [lyricsLines, setLyricsLines] = useState<LyricLine[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(-1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  
  // Triple click detection refs
  const clickCountRef = useRef(0);
  const lastClickTimeRef = useRef(0);

  useEffect(() => {
      if (song?.lyrics) {
          const parsed = parseLrc(song.lyrics);
          setLyricsLines(parsed);
          setActiveLineIndex(-1);
      } else {
          setLyricsLines([]);
      }
  }, [song]);

  useEffect(() => {
      if (lyricsLines.length === 0) return;
      let index = -1;
      for (let i = 0; i < lyricsLines.length; i++) {
          if (lyricsLines[i].time <= currentTime + 0.2) { 
              index = i;
          } else {
              break;
          }
      }
      setActiveLineIndex(index);
  }, [currentTime, lyricsLines]);

  useEffect(() => {
      if (activeLineIndex !== -1 && activeLineRef.current && scrollContainerRef.current) {
          activeLineRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
          });
      }
  }, [activeLineIndex]);

  const handleLineClick = (time: number) => {
      const now = Date.now();
      
      // Reset count if time difference is too large (e.g., > 400ms)
      if (now - lastClickTimeRef.current > 400) {
          clickCountRef.current = 0;
      }

      clickCountRef.current += 1;
      lastClickTimeRef.current = now;

      if (clickCountRef.current === 3) {
          // Trigger seek on 3rd click
          onSeek(time);
          clickCountRef.current = 0; // Reset
      }
  };

  if (!isOpen) return null;

  return (
    <>
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md z-[120] md:hidden" onClick={onClose} />
        
        <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.1)] z-[130] transform transition-transform duration-500 ease-[cubic-bezier(0.2,0,0,1)] flex flex-col border-l border-slate-100">
        
        {/* Header - Cleaned up */}
        <div className="p-5 flex items-start justify-end bg-white/95 backdrop-blur-md z-10 shrink-0 sticky top-0">
            {/* Left side info removed as requested */}
            
            {/* Close Button - Moved down slightly with mt-2 */}
            <button onClick={onClose} className="w-10 h-10 mt-4 rounded-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-all">
                <X size={22} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-0 scroll-smooth bg-[#fdfdfd] custom-scrollbar" ref={scrollContainerRef}>
            {!song ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                <Disc size={64} className="opacity-20" />
                <p className="font-bold">请选择一首歌曲开始播放</p>
            </div>
            ) : (
            <div className="animate-fade-in pb-24">
                {/* Artwork Section */}
                <div className="px-8 pt-4 pb-8 flex flex-col items-center text-center bg-gradient-to-b from-white via-slate-50/50 to-[#fdfdfd]">
                    <div className="relative group mb-8">
                        <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 rounded-full transform scale-105 group-hover:opacity-30 transition-opacity"></div>
                        <img 
                            src={song.artworkUrl100.replace('100x100', '400x400')} 
                            className={`relative w-64 h-64 md:w-72 md:h-72 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] object-cover border border-slate-100/50 transition-all duration-700 ${song.isFullVersion ? 'ring-4 ring-indigo-50/50' : ''}`}
                        />
                         {song.isFullVersion && (
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white text-indigo-600 border border-indigo-100 text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap z-10">
                                <Zap size={10} fill="currentColor" />
                                完整版音源
                            </div>
                        )}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight mb-2 px-6">{song.trackName}</h3>
                    <p className="text-lg text-slate-500 font-bold">{song.artistName}</p>
                </div>
                
                <div className="px-6 relative">
                    {/* Lyrics List */}
                    <div className="mb-8">
                        {lyricsLines.length > 0 ? (
                            <div className="flex flex-col gap-8 py-4 text-center">
                                {lyricsLines.map((line, index) => {
                                    const isActive = index === activeLineIndex;
                                    return (
                                        <div 
                                            key={index}
                                            ref={isActive ? activeLineRef : null}
                                            className={`transition-all duration-500 ease-out font-[Noto Sans SC] cursor-pointer px-4 select-none
                                                ${isActive 
                                                    ? 'text-indigo-600 text-xl md:text-2xl font-black scale-105 opacity-100 leading-snug drop-shadow-sm' 
                                                    : 'text-slate-400 text-sm md:text-base font-bold opacity-60 hover:text-slate-600 hover:opacity-90'
                                                }`}
                                            onClick={() => handleLineClick(line.time)}
                                        >
                                            {line.text}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="min-h-[200px] p-8 bg-slate-50 rounded-[2rem] border border-slate-100 mt-4 flex items-center justify-center">
                                <div className="whitespace-pre-wrap text-center leading-loose text-slate-500 font-bold font-[Noto Sans SC] text-sm">
                                    {song.lyrics ? (
                                        song.lyrics.replace(/\[.*?\]/g, '')
                                    ) : (
                                        <span className="flex flex-col items-center gap-2 opacity-60">
                                            <Music size={32} />
                                            {song.isFullVersion ? "纯音乐 / 暂无歌词" : "正在加载歌词..."}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            )}
        </div>
        </div>
    </>
  );
};

export default AILyricsPanel;