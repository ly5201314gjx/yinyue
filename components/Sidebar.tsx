import React from 'react';
import { Home, Search, Library, Heart, Clock, X, Settings2, Sparkles, Command, Music2 } from 'lucide-react';
import { ViewMode } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  onChangeView: (view: ViewMode) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenSourceManager: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, onClose, onOpenSourceManager }) => {
  const handleViewChange = (view: ViewMode) => {
    onChangeView(view);
    onClose();
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewMode; icon: any; label: string }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => handleViewChange(view)}
        className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]
          ${isActive 
            ? 'bg-white text-indigo-600 shadow-[0_4px_20px_-12px_rgba(79,70,229,0.3)] scale-[1.02]' 
            : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
          }`}
      >
        {/* Icon Container */}
        <div className={`relative flex items-center justify-center transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"} />
            {isActive && <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full" />}
        </div>
        
        {/* Label */}
        <span className={`text-[13px] tracking-wide transition-all duration-300 ${isActive ? 'font-bold translate-x-1' : 'font-medium group-hover:translate-x-1'}`}>
            {label}
        </span>

        {/* Active Indicator Dot */}
        {isActive && (
            <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm animate-fade-in" />
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 h-screen flex flex-col 
        bg-[#fbfbfd] md:bg-transparent border-r border-slate-100/80
        transform transition-transform duration-500 cubic-bezier(0.19, 1, 0.22, 1)
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* Header / Logo */}
        <div className="h-24 flex items-center px-6">
          <div className="flex items-center gap-3 select-none group cursor-pointer">
            <div className="relative w-8 h-8 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg shadow-lg shadow-indigo-500/30 transform transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"></div>
                <Music2 className="relative text-white" size={16} strokeWidth={2.5} />
            </div>
            <div>
                 <h1 className="text-base font-black tracking-tight text-slate-800 font-[Noto Sans SC] leading-none">Lg 音乐</h1>
                 <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-0.5 scale-90 origin-left">Studio</p>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden ml-auto p-1.5 text-slate-400 hover:bg-slate-100 rounded-full">
            <X size={18} />
          </button>
        </div>

        {/* Navigation Area */}
        <div className="flex-1 px-4 space-y-6 overflow-y-auto custom-scrollbar py-2">
            
            {/* Group 1: Discover */}
            <div className="space-y-1">
                <div className="px-3 mb-2 flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-widest">Discover</span>
                </div>
                <NavItem view={ViewMode.HOME} icon={Home} label="推荐" />
                <NavItem view={ViewMode.SEARCH} icon={Search} label="搜索" />
            </div>

            {/* Group 2: Library */}
            <div className="space-y-1">
                <div className="px-3 mb-2 mt-6 flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-widest">Library</span>
                </div>
                <NavItem view={ViewMode.LIBRARY} icon={Heart} label="收藏" />
                <NavItem view={ViewMode.RECENT} icon={Clock} label="最近" />
            </div>
        </div>

        {/* Bottom Actions - Refined Minimalist Style */}
        <div className="p-4 pb-6">
            <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-1">
                <button 
                    onClick={onOpenSourceManager}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all duration-300">
                            <Settings2 size={14} />
                        </div>
                        <div className="text-left">
                            <span className="block text-xs font-bold text-slate-700 group-hover:text-indigo-900">音源配置</span>
                            <span className="block text-[9px] text-slate-400 font-medium">Custom Sources</span>
                        </div>
                    </div>
                    <Command size={12} className="text-slate-300 mr-1" />
                </button>
            </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;