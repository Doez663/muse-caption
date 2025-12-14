
import React from 'react';
import { CanvasItem, CaptionStyle, GeminiModel, Persona } from '../types';
import { CaptionTag } from './CaptionTag';
import { HashtagGroup } from './HashtagGroup';

interface PostModalProps {
  item: CanvasItem;
  isOpen: boolean;
  onClose: () => void;
  style: CaptionStyle;
  onStyleChange: (s: CaptionStyle) => void;
  model: GeminiModel;
  onModelToggle: () => void;
  onGenerate: () => void;
  loading: boolean;
  onDelete: () => void;
  error: string | null;
  activePersona: Persona;
}

export const PostModal: React.FC<PostModalProps> = ({
  item,
  isOpen,
  onClose,
  style,
  onStyleChange,
  model,
  onModelToggle,
  onGenerate,
  loading,
  onDelete,
  error,
  activePersona
}) => {
  if (!isOpen) return null;

  const historyEntry = item.history[item.viewIndex];
  const isMatchingStyle = historyEntry && (historyEntry.style === style || (!historyEntry.style && style === CaptionStyle.SOCIAL));
  const captions = isMatchingStyle ? historyEntry.captions : [];
  const hashtags = isMatchingStyle ? historyEntry.hashtags : [];

  return (
    <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/60 backdrop-blur-sm md:p-8" onClick={onClose}>
      
      {/* Container: Full screen on mobile, Window on Desktop */}
      <div 
        className="w-full h-full md:h-auto md:max-h-[90vh] md:w-full md:max-w-5xl bg-[#c0c0c0] md:border-2 md:border-white md:shadow-[4px_4px_0px_black] flex flex-col md:flex-row overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        
        {/* MOBILE TOP BAR */}
        <div className="md:hidden bg-blue-900 text-white px-3 py-2 flex justify-between items-center border-b-2 border-white shadow-[0_2px_0_black] shrink-0 z-10">
            <span className="font-bold font-mono text-sm">Post_View.exe</span>
            <button onClick={onClose} className="bg-[#c0c0c0] text-black w-6 h-6 flex items-center justify-center text-xs font-bold border border-white shadow-[1px_1px_0px_black] active:translate-y-[1px]">X</button>
        </div>

        {/* IMAGE SECTION */}
        <div className="w-full md:w-[55%] h-[45%] md:h-auto bg-black flex items-center justify-center relative group overflow-hidden shrink-0 border-b-2 border-gray-600 md:border-none">
             <img 
                src={item.image.url} 
                className="w-full h-full object-contain md:object-contain" 
                alt="Post"
             />
        </div>

        {/* CONTROLS SECTION */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#e0e0e0] md:border-l-2 md:border-gray-500">
            
            {/* Desktop Header */}
            <div className="hidden md:flex bg-blue-900 text-white px-3 py-1 justify-between items-center border-b-2 border-white shadow-[0_2px_0_#808080] shrink-0">
                <div className="flex gap-2 items-center">
                    <img src={activePersona.avatar || ''} className="w-6 h-6 rounded-full border border-white bg-gray-400" />
                    <span className="font-bold text-sm tracking-tight">{activePersona.name}</span>
                </div>
                <button onClick={onClose} className="hover:text-red-300 font-mono">[X]</button>
            </div>

            {/* TOOLBAR / TABS */}
            <div className="p-2 md:p-3 border-b-2 border-gray-400 bg-[#c0c0c0] flex flex-col gap-2 shrink-0 shadow-[0_2px_5px_rgba(0,0,0,0.1)] z-10">
                {/* Tabs Row */}
                <div className="flex justify-between items-stretch">
                    <div className="flex gap-0 md:gap-1 bg-gray-400 md:bg-gray-600 p-1 md:p-0.5 rounded-none md:rounded-sm shadow-[inset_1px_1px_2px_black] w-full md:w-auto">
                        {Object.values(CaptionStyle).map((s) => (
                            <button
                                key={s}
                                onClick={() => onStyleChange(s)}
                                className={`
                                    flex-1 md:flex-none px-4 py-2 md:py-1 text-[10px] font-bold uppercase transition-all border border-transparent
                                    ${style === s 
                                        ? 'bg-[#e0e0e0] text-black border-white shadow-[1px_1px_0px_black]' 
                                        : 'text-gray-200 md:text-gray-300 hover:text-white'
                                    }
                                `}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    
                    <button onClick={onDelete} className="hidden md:block text-red-600 text-[10px] font-bold hover:underline px-2">
                        DELETE POST
                    </button>
                </div>

                {/* Info Row */}
                <div className="flex justify-between items-center text-[10px] font-mono text-gray-600 px-1">
                     <span>MODEL: <span className="font-bold text-blue-800 cursor-pointer" onClick={onModelToggle}>{model.replace('gemini-', '')}</span></span>
                     <span className="md:block hidden">{new Date().toLocaleTimeString()}</span>
                     <button onClick={onDelete} className="md:hidden text-red-600 font-bold">DELETE POST</button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-0 bg-white shadow-[inset_2px_2px_4px_#808080] relative">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <span className="font-mono text-xs animate-pulse">GENERATING...</span>
                    </div>
                ) : null}

                {error && (
                    <div className="p-4 bg-red-100 text-red-600 text-xs font-mono border-b border-red-200">
                        ERROR: {error}
                    </div>
                )}

                {!loading && captions.length === 0 && !error && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                        <div className="text-4xl mb-2 grayscale">✨</div>
                        <p className="text-xs font-mono">
                            "{style}" mode selected.<br/>
                            <span className="font-bold text-black mt-2 block">TAP GENERATE BELOW</span>
                        </p>
                    </div>
                )}

                <div className="divide-y divide-dashed divide-gray-300 pb-20 md:pb-0">
                    {captions.map((cap, i) => (
                        <CaptionTag key={cap.id} caption={cap} index={i} />
                    ))}
                    {hashtags.length > 0 && (
                        <div className="border-t-2 border-gray-200 mt-2">
                            <HashtagGroup hashtags={hashtags} />
                        </div>
                    )}
                </div>
            </div>

            {/* FOOTER BUTTON */}
            <div className="p-3 bg-[#c0c0c0] border-t-2 border-white shadow-[0_-2px_0_#808080] shrink-0 absolute bottom-0 left-0 right-0 md:relative">
                <button
                    onClick={onGenerate}
                    disabled={loading}
                    className="w-full py-3 md:py-2 bg-blue-700 text-white font-bold border-2 border-white shadow-[2px_2px_0px_black] active:shadow-[inset_2px_2px_0px_black] active:translate-y-[1px] disabled:opacity-5