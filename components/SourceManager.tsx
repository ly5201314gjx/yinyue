import React, { useState } from 'react';
import { X, Plus, Trash2, Check, Globe, AlertCircle } from 'lucide-react';
import { MusicSource } from '../types';

interface SourceManagerProps {
  isOpen: boolean;
  onClose: () => void;
  sources: MusicSource[];
  onAddSource: (name: string, url: string) => void;
  onRemoveSource: (id: string) => void;
}

const SourceManager: React.FC<SourceManagerProps> = ({ isOpen, onClose, sources, onAddSource, onRemoveSource }) => {
  const [newByName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newByName.trim() && newUrl.trim()) {
      onAddSource(newByName, newUrl);
      setNewName('');
      setNewUrl('');
    }
  };

  const handleDeleteClick = (id: string) => {
    if (deleteConfirmId === id) {
      onRemoveSource(id);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      // Auto reset confirmation after 3 seconds
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in border border-slate-100">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
                <h2 className="text-lg font-bold text-slate-800">音源配置</h2>
                <p className="text-xs text-slate-500 mt-0.5">管理外部音乐搜索源，点击歌曲时可跳转</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200/50 text-slate-400 hover:text-slate-800 transition-all">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {/* List */}
            <div className="space-y-3">
                {sources.map(source => (
                    <div key={source.id} className="group flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-500/5 bg-white transition-all duration-300">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${source.isCustom ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-50 text-slate-500'}`}>
                                <Globe size={18} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-slate-700 text-sm truncate">{source.name}</h3>
                                <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{source.url}</p>
                            </div>
                        </div>

                        <button 
                            onClick={() => handleDeleteClick(source.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                                deleteConfirmId === source.id 
                                ? 'bg-red-500 text-white shadow-lg shadow-red-200' 
                                : 'bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500'
                            }`}
                        >
                            {deleteConfirmId === source.id ? (
                                <>
                                    <Check size={12} />
                                    <span>确认删除</span>
                                </>
                            ) : (
                                <Trash2 size={14} />
                            )}
                        </button>
                    </div>
                ))}
            </div>
        </div>

        {/* Add Form */}
        <div className="p-6 bg-slate-50 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">添加新源</h3>
            <form onSubmit={handleAdd} className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-3">
                    <input 
                        type="text" 
                        placeholder="源名称 (如: 某某音乐)" 
                        value={newByName}
                        onChange={e => setNewName(e.target.value)}
                        className="col-span-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <input 
                        type="text" 
                        placeholder="搜索链接 (关键词用 [KEY] 代替)" 
                        value={newUrl}
                        onChange={e => setNewUrl(e.target.value)}
                        className="col-span-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                </div>
                <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <AlertCircle size={10} />
                        <span>链接将会自动拼接歌曲关键词进行跳转</span>
                    </p>
                    <button 
                        type="submit" 
                        disabled={!newByName || !newUrl}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"
                    >
                        <Plus size={16} />
                        添加
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default SourceManager;