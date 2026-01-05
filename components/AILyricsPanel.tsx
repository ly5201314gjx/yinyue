import React, { useEffect, useState, useRef } from 'react';
import { X, Disc, Music, Zap } from 'lucide-react';
import { Song } from '../types';

interface AILyricsPanelProps {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
  currentTime: number;
}

interface LyricLine {
    time: number;
    text: string;
}

const parseLrc = (lrc: string): LyricLine[] => {
    if (!lrc) return [];
    const lines = lrc.split('\n');
    const result: LyricLine[] = [];
    // Regex to match [mm:ss.xx] or [mm:ss.xxx]
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    
    for (const line of lines) {
        const match = timeRegex.exec(line);
        if (match) {
            const min = parseInt(match[1]);
            const sec = parseInt(match[2]);
            // Pad to 3 digits to handle milliseconds correctly (e.g. .20 -> 200ms)
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

const AILyricsPanel: React.FC<AILyricsPanelProps> = ({ song, isOpen, onClose, currentTime }) => {
  const [lyricsLines, setLyricsLines] = useState<LyricLine[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(-1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Parse Lyrics when song changes
  useEffect(() => {
      if (song?.lyrics) {
          const parsed = parseLrc(song.lyrics);
          setLyricsLines(parsed);
          setActiveLineIndex(-1);
      } else {
          setLyricsLines([]);
      }
  }, [song]);

  // Sync active line based on currentTime
  useEffect(() => {
      if (lyricsLines.length === 0) return;

      // Find the last line whose time is <= currentTime
      // We iterate to find the precise active line
      let index = -1;
      for (let i = 0; i < lyricsLines.length; i++) {
          if (lyricsLines[i].time <= currentTime + 0.2) { // Small offset for human perception
              index = i;
          } else {
              break;
          }
      }
      setActiveLineIndex(index);
  }, [currentTime, lyricsLines]);

  // Auto-scroll
  useEffect(() => {
      if (activeLineIndex !== -1 && activeLineRef.current && scrollContainerRef.current) {
          activeLineRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
          });
      }
  }, [activeLineIndex]);

  if (!isOpen) return null;

  return (
    <>
        {/* Backdrop for mobile */}
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden" onClick={onClose} />
        
        <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.05)] z-[60] transform transition-transform duration-500 ease-[cubic-bezier(0.2,0,0,1)] flex flex-col border-l border-slate-100">
        <div className="p-6 flex items-center justify-between bg-white z-10 shrink-0 border-b border-slate-50">
            <div className="flex items-center gap-2.5">
                <Music size={20} className="text-indigo-600" />
                <span className="text-lg font-bold text-slate-800 tracking-tight font-[Noto Sans SC]">播放详情</span>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-all">
                <X size={20} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-0 scroll-smooth bg-white custom-scrollbar" ref={scrollContainerRef}>
            {!song ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                <Disc size={48} className="opacity-20" />
                <p>请选择一首歌曲开始播放</p>
            </div>
            ) : (
            <div className="animate-fade-in pb-20">
                {/* Header Image */}
                <div className="px-8 pt-8 pb-6 flex flex-col items-center text-center bg-gradient-to-b from-slate-50 to-white">
                    <div className="relative group mb-6">
                        <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 rounded-full transform scale-110 group-hover:opacity-30 transition-opacity"></div>
                        <img 
                            src={song.artworkUrl100.replace('100x100', '400x400')} 
                            className={`relative w-64 h-64 rounded-3xl shadow-2xl shadow-indigo-500/10 object-cover border border-slate-100 transition-all duration-700 ${song.isFullVersion ? 'ring-4 ring-indigo-50' : ''}`}
                        />
                         {song.isFullVersion && (
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                                <Zap size={10} fill="currentColor" />
                                完整版音源
                            </div>
                        )}
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 leading-tight mb-2 px-4">{song.trackName}</h3>
                    <p className="text-lg text-slate-500 font-medium">{song.artistName}</p>
                </div>
                
                <div className="px-6">
                    {/* Lyrics Section */}
                    <div className="mb-8">
                        {lyricsLines.length > 0 ? (
                            <div className="flex flex-col gap-6 py-4 text-center">
                                {lyricsLines.map((line, index) => {
                                    const isActive = index === activeLineIndex;
                                    return (
                                        <div 
                                            key={index}
                                            ref={isActive ? activeLineRef : null}
                                            className={`transition-all duration-500 ease-out font-medium font-[Noto Sans SC] cursor-pointer hover:text-slate-600 px-4
                                                ${isActive 
                                                    ? 'text-indigo-600 text-2xl font-black scale-105 opacity-100 py-3 shadow-sm' 
                                                    : 'text-slate-300 text-sm opacity-50 blur-[0.3px] hover:blur-0'
                                                }`}
                                            onClick={() => {
                                                // Optional: Tap to seek could be added here
                                            }}
                                        >
                                            {line.text}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="min-h-[200px] p-6 bg-slate-50/50 rounded-3xl border border-slate-100/80 mt-4 flex items-center justify-center">
                                <div className="whitespace-pre-wrap text-center leading-loose text-slate-700 font-medium font-[Noto Sans SC] opacity-90 text-sm">
                                    {song.lyrics ? (
                                        // Display raw text if parsing failed
                                        song.lyrics.replace(/\[.*?\]/g, '')
                                    ) : (
                                        song.isFullVersion ? "暂无歌词" : "正在自动匹配完整版与歌词..."
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