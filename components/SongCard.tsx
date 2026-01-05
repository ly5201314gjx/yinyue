import React, { useState } from 'react';
import { Play, Pause, Download, Loader2, Heart, Music2 } from 'lucide-react';
import { Song } from '../types';

interface SongCardProps {
  song: Song;
  isPlaying: boolean;
  isLoading?: boolean;
  isLiked: boolean;
  onPlay: (song: Song) => void;
  onToggleLike: (song: Song) => void;
}

const SongCard: React.FC<SongCardProps> = ({ song, isPlaying, isLoading = false, isLiked, onPlay, onToggleLike }) => {
  const handleLike = (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleLike(song);
  }

  return (
    <div 
      className="group relative flex flex-col p-3 rounded-3xl transition-all duration-300 hover:bg-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer"
      onClick={() => onPlay(song)}
    >
      <div className="relative aspect-square mb-4 overflow-hidden rounded-2xl bg-slate-100">
        <img 
          src={song.artworkUrl100.replace('100x100', '400x400')} 
          alt={song.trackName}
          className={`w-full h-full object-cover transition-transform duration-700 ease-out ${isPlaying && !isLoading ? 'scale-105' : 'group-hover:scale-105'}`}
          loading="lazy"
        />
        
        {/* Play Button Overlay */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isPlaying || isLoading ? 'bg-black/20 opacity-100' : 'bg-black/10 opacity-0 group-hover:opacity-100'}`}>
          <div className={`w-14 h-14 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg transform transition-all duration-300 ${isPlaying || isLoading ? 'scale-100' : 'scale-90 group-hover:scale-100 group-hover:-translate-y-1'}`}>
            {isLoading ? (
                <Loader2 size={24} className="text-indigo-600 animate-spin" />
            ) : isPlaying ? (
               <div className="flex gap-1">
                   <div className="w-1.5 h-5 bg-indigo-600 rounded-full animate-[music-bar_0.8s_ease-in-out_infinite]"></div>
                   <div className="w-1.5 h-5 bg-indigo-600 rounded-full animate-[music-bar_0.8s_ease-in-out_infinite_0.2s]"></div>
                   <div className="w-1.5 h-5 bg-indigo-600 rounded-full animate-[music-bar_0.8s_ease-in-out_infinite_0.4s]"></div>
               </div>
            ) : (
                <Play size={24} className="text-slate-900 ml-1" fill="currentColor" />
            )}
          </div>
        </div>

         {/* Like Button */}
         <button 
            onClick={handleLike}
            className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-md transition-all duration-300 shadow-sm transform ${
                isLiked 
                ? 'bg-white text-rose-500 opacity-100 scale-100' 
                : 'bg-white/90 text-slate-400 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 hover:text-rose-400'
            }`}
        >
            <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="flex flex-col gap-1 px-1">
        <h3 className={`font-bold truncate text-[15px] leading-tight transition-colors ${isPlaying ? 'text-indigo-600' : 'text-slate-800'}`} title={song.trackName}>
            {song.trackName}
        </h3>
        <p className="text-xs text-slate-500 truncate font-medium flex items-center gap-1">
            {song.artistName}
        </p>
      </div>
    </div>
  );
};

export default SongCard;