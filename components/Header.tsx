
import React, { useEffect, useState } from 'react';
import { Persona } from '../types';

interface HeaderProps {
  personas: Persona[];
  activePersona: Persona;
  onOpenProfile: () => void;
  onSwitchPersona: (id: string) => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  personas, 
  activePersona, 
  onOpenProfile, 
  onSwitchPersona,
  onOpenSettings 
}) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time based on persona timezone
  const getPersonaTime = () => {
    try {
        return time.toLocaleTimeString('en-GB', { 
            timeZone: activePersona.timezone || undefined,
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (e) {
        // Fallback if timezone is invalid
        return time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  };

  return (
    <div className="w-full flex flex-col border-b border-black bg-gray-100 select-none shrink-0">
      {/* Top Status Bar */}
      <div className="flex justify-between items-center px-2 py-1 bg-blue-700 text-white font-mono text-[10px] uppercase tracking-wider">
        <span>MUSE_OS v3.1 // ID_MATRIX</span>
        <div className="flex items-center gap-3">
            <button onClick={onOpenSettings} className="hover:text-yellow-300 transition-colors">
                [ CONFIG ]
            </button>
            <span className="animate-pulse text-green-300">● LIVE</span>
        </div>
      </div>

      {/* Main Info HUD */}
      <div className="relative p-3 font-mono text-xs flex gap-3 items-stretch border-b border-black bg-gray-50">
        
        {/* AVATAR SECTION - 100x100 */}
        <div 
            onClick={onOpenProfile}
            className="group relative w-[100px] h-[100px] shrink-0 bg-gray-200 border border-black cursor-pointer hover:bg-gray-300 overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
            title="Click to Configure Persona"
        >
            {activePersona.avatar ? (
                <img src={activePersona.avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
                    <span className="text-xl font-bold opacity-20">NO</span>
                    <span className="text-xl font-bold opacity-20">IMG</span>
                </div>
            )}
            {/* Hover Hint Overlay */}
            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-[10px] text-white uppercase font-bold text-center leading-none">
                CONFIGURE<br/>IDENTITY
            </div>
        </div>

        {/* INFO & SWITCHER SECTION */}
        <div className="flex-1 flex flex-col min-w-0 justify-between py-0.5">
            
            {/* Row 1: Dropdown + Time Display */}
            <div className="flex items-center gap-2 border-b border-gray-300 pb-2 mb-1">
                {/* Styled Dropdown */}
                <div className="relative flex-1">
                    <select
                        value={activePersona.id}
                        onChange={(e) => onSwitchPersona(e.target.value)}
                        className="w-full appearance-none bg-white border border-black px-2 py-1.5 pr-8 text-sm font-bold uppercase font-mono cursor-pointer hover:bg-gray-50 focus:outline-none focus:bg-blue-50 focus:border-blue-700 transition-colors shadow-sm"
                    >
                        {personas.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name.toUpperCase()}
                            </option>
                        ))}
                    </select>
                    {/* Custom Arrow Indicator */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-black">
                        <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                        </svg>
                    </div>
                </div>

                {/* Digital Clock Box */}
                <div className="shrink-0 flex items-center bg-black text-white border border-black px-2 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]" title="Local Persona Time">
                    <span className="text-[10px] text-gray-400 mr-2 uppercase tracking-tight">LOC_TIME</span>
                    <span className="text-sm font-bold font-mono tracking-widest">{getPersonaTime()}</span>
                </div>
            </div>

            {/* Row 2: Stats (Values Only, Left Aligned, Bold) */}
            <div className="text-[10px] text-gray-600 font-bold uppercase tracking-tight truncate leading-tight flex items-center gap-2 mb-1 pl-1">
                <span className="text-black">{activePersona.age}</span>
                <span className="text-gray-300 font-normal">|</span> 
                <span className="truncate max-w-[140px] text-black">{activePersona.occupation}</span>
                <span className="text-gray-300 font-normal">|</span> 
                <span className="truncate max-w-[120px] text-black">{activePersona.location}</span>
            </div>

            {/* Row 3: Emoji Preference (No Label) */}
            <div className="mt-auto">
                 <div className="w-full text-[10px] text-gray-500 truncate flex items-center bg-white p-1 border border-gray-300 shadow-sm h-7">
                      <span className="truncate text-black font-medium">{activePersona.emojiStyle}</span>
                 </div>
            </div>
        </div>

      </div>
    </div>
  );
};
