
import React, { useState, useRef, useEffect } from 'react';
import { Persona } from '../types';
import { playSound } from '../services/soundService';

interface PersonaProfileProps {
  personas: Persona[];
  activeId: string;
  onUpdate: (p: Persona) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string) => void;
  onClose: () => void;
}

const AESTHETIC_TAGS = ["Minimalist", "Dark Academia", "Old Money", "Y2K", "Cyberpunk", "Clean Girl", "Grunge", "Corporate Baddie"];
const TONE_TAGS = ["Nonchalant", "Witty", "Mysterious", "Direct", "Poetic", "Sarcastic", "Whimsical", "Cold"];

const EMOJI_PRESETS = [
  { label: "Minimalist (🖤, ⚓️)", value: "Minimalist Aesthetic" },
  { label: "Coquette (🎀, 🦢)", value: "Coquette/Soft Aesthetic" },
  { label: "Y2K (👾, 💿)", value: "Y2K/Cyber Aesthetic" },
  { label: "Edgy (⛓️, 🩸)", value: "Edgy/Dark Aesthetic" },
  { label: "Soft (☁️, 🧸)", value: "Soft/Pastel Aesthetic" },
  { label: "Nature (🌿, 🍄)", value: "Nature/Goblincore Aesthetic" }
];

const resizeAvatar = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
          const img = new Image();
          img.src = e.target?.result as string;
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_SIZE = 300; 
              let width = img.width;
              let height = img.height;
              if (width > height) {
                  if (width > MAX_SIZE) {
                      height *= MAX_SIZE / width;
                      width = MAX_SIZE;
                  }
              } else {
                  if (height > MAX_SIZE) {
                      width *= MAX_SIZE / height;
                      height = MAX_SIZE;
                  }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
          img.onerror = reject;
      };
      reader.onerror = reject;
  });
};

export const PersonaProfile: React.FC<PersonaProfileProps> = ({ 
    personas, 
    activeId, 
    onUpdate, 
    onCreate, 
    onDelete, 
    onSetActive,
    onClose 
}) => {
  // We strictly track the editing ID separately from the active "generation" ID
  const [editingId, setEditingId] = useState<string>(activeId);
  const [formData, setFormData] = useState<Persona | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data when switching editing target
  useEffect(() => {
    const target = personas.find(p => p.id === editingId);
    if (target) {
        setFormData(target);
    } else if (personas.length > 0) {
        setEditingId(personas[0].id); // Fallback
    }
  }, [editingId, personas]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!formData) return;
    const newData = { ...formData, [e.target.name]: e.target.value };
    setFormData(newData);
    // Auto-save on change to prevent data loss when switching
    onUpdate(newData);
  };

  const handleTagClick = (field: 'aesthetic' | 'voiceTone' | 'emojiStyle', value: string) => {
    playSound.click(); // Sound
    if (!formData) return;
    const currentVal = (formData as any)[field];
    const newVal = currentVal ? `${currentVal}, ${value}` : value;
    const newData = { ...formData, [field]: newVal };
    setFormData(newData);
    onUpdate(newData);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && formData) {
          try {
              const resizedBase64 = await resizeAvatar(e.target.files[0]);
              const newData = { ...formData, avatar: resizedBase64 };
              setFormData(newData);
              onUpdate(newData);
              playSound.upload(); // Sound
          } catch (err) {
              console.error("Avatar upload failed", err);
          }
      }
  };

  const handleRemoveAvatar = () => {
      playSound.glitch(); // Sound
      if (!formData) return;
      const newData = { ...formData, avatar: "" };
      setFormData(newData);
      onUpdate(newData);
      if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreateNew = () => {
      playSound.click();
      onCreate();
  };

  // Switcher Logic
  const handleSelectPersona = (id: string) => {
      playSound.click();
      setEditingId(id);
  };

  const handleOnClose = () => {
      playSound.click();
      onClose();
  };

  const handleActionClick = (action: () => void, soundType: 'click' | 'glitch' = 'click') => {
      if(soundType === 'glitch') playSound.glitch();
      else playSound.click();
      action();
  };

  if (!formData) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm font-mono">
      <div className="w-[90vw] max-w-4xl h-[600px] max-h-[90vh] bg-gray-100 border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
        
        {/* Retro Window Header */}
        <div className="bg-blue-700 text-white px-2 py-1 flex justify-between items-center border-b border-black select-none shrink-0">
          <span className="text-[10px] uppercase tracking-wider">>> IDENTITY_CONFIG_TOOL.EXE</span>
          <button 
            onClick={handleOnClose} 
            className="hover:bg-red-600 px-2 h-full flex items-center text-[10px] border-l border-blue-800"
          >
            [X]
          </button>
        </div>

        {/* Main Split Layout */}
        <div className="flex flex-1 overflow-hidden">
            
            {/* SIDEBAR: LIST */}
            <div className="w-1/3 min-w-[220px] bg-gray-200 border-r border-black flex flex-col">
                <div className="p-2 border-b border-gray-300 text-[10px] text-gray-500 font-bold uppercase">
                    >> DATABASE_ENTRIES
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                    {personas.map(p => (
                        <div 
                            key={p.id}
                            onClick={() => handleSelectPersona(p.id)}
                            className={`
                                relative p-2 border cursor-pointer flex items-center gap-3 transition-all
                                ${editingId === p.id 
                                    ? 'bg-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                                    : 'bg-gray-100 border-transparent hover:border-gray-400 hover:bg-gray-50'}
                            `}
                        >
                            {/* Avatar Thumb */}
                            <div className="w-8 h-8 bg-gray-300 border border-black shrink-0 overflow-hidden">
                                {p.avatar ? (
                                    <img src={p.avatar} alt="av" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-[8px]">+</div>
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold truncate">{p.name || 'UNTITLED'}</div>
                                <div className="text-[9px] text-gray-500 truncate">{p.occupation || 'N/A'}</div>
                            </div>

                            {/* Active Indicator */}
                            {activeId === p.id && (
                                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500 border border-black" title="System Active"></div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-2 border-t border-gray-300">
                    <button 
                        onClick={handleCreateNew}
                        className="w-full py-2 border border-black border-dashed bg-white hover:bg-black hover:text-white text-xs uppercase"
                    >
                        + NEW ENTRY
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT: FORM */}
            <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">
                
                {/* Editing Header */}
                <div className="px-4 py-2 border-b border-black bg-white flex justify-between items-center shrink-0">
                    <div>
                        <span className="text-[10px] text-gray-400 block">EDITING_TARGET_ID: {editingId}</span>
                        <h2 className="text-sm font-bold uppercase">{formData.name || 'UNKNOWN'}</h2>
                    </div>
                    
                    <div className="flex gap-2">
                         {activeId !== editingId ? (
                             <button 
                                onClick={() => handleActionClick(() => onSetActive(editingId))}
                                className="px-3 py-1 bg-white border border-black text-[10px] hover:bg-green-600 hover:text-white transition-colors uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
                             >
                                [ SET AS SYSTEM ACTIVE ]
                             </button>
                         ) : (
                             <div className="px-3 py-1 bg-green-100 border border-green-600 text-green-800 text-[10px] font-bold uppercase">
                                >> SYSTEM_ACTIVE
                             </div>
                         )}

                         <button 
                            onClick={() => handleActionClick(() => onDelete(editingId), 'glitch')}
                            className="px-2 py-1 bg-white border border-red-500 text-red-500 text-[10px] hover:bg-red-600 hover:text-white uppercase"
                         >
                            [ DEL ]
                         </button>
                    </div>
                </div>

                {/* Form Scroll Area */}
                <div className="flex-1 overflow-y-auto p-6 no-scrollbar space-y-6">
                    
                    {/* Section 1: Core Data */}
                    <div>
                        <div className="text-[10px] text-gray-500 mb-3 border-b border-gray-300 pb-1 uppercase">
                        > SECTION_01: CORE_ATTRIBUTES
                        </div>
                        
                        <div className="flex items-start gap-6">
                            {/* AVATAR */}
                            <div className="shrink-0 flex flex-col gap-2">
                                <div 
                                    onClick={() => !formData.avatar && fileInputRef.current?.click()}
                                    className={`
                                        w-32 h-40 
                                        bg-gray-200 border border-black 
                                        flex flex-col items-center justify-center
                                        relative overflow-hidden
                                        ${!formData.avatar ? 'cursor-pointer hover:bg-gray-300 border-dashed' : 'border-solid'}
                                    `}
                                >
                                    {formData.avatar ? (
                                        <img src={formData.avatar} alt="ID" className="w-full h-full object-cover block" />
                                    ) : (
                                        <div className="text-center p-2 opacity-60">
                                            <span className="text-3xl text-gray-500 mb-1 block font-light">+</span>
                                            <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tight leading-none block">
                                                UPLOAD<br/>ID PHOTO
                                            </span>
                                        </div>
                                    )}
                                    <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                                </div>
                                
                                {formData.avatar && (
                                    <button onClick={handleRemoveAvatar} className="w-full text-[9px] uppercase border border-red-600 text-red-600 hover:bg-red-600 hover:text-white py-1">
                                        [ REMOVE ]
                                    </button>
                                )}
                            </div>

                            {/* TEXT INPUTS */}
                            <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-3">
                                {['name', 'age', 'occupation', 'location'].map((field) => (
                                    <div key={field} className="flex flex-col">
                                        <label className="text-[10px] uppercase text-blue-700 mb-1 font-bold">
                                            {field}
                                        </label>
                                        <input 
                                            name={field}
                                            value={(formData as any)[field] || ''}
                                            onChange={handleChange}
                                            className="w-full bg-white border border-gray-400 p-2 text-xs focus:bg-blue-50 focus:border-blue-600 outline-none shadow-sm placeholder:text-gray-300 transition-colors"
                                            placeholder={`ENTER ${field.toUpperCase()}...`}
                                        />
                                    </div>
                                ))}
                                <div className="flex flex-col col-span-2">
                                     <label className="text-[10px] uppercase text-blue-700 mb-1 font-bold">
                                        TIMEZONE (IANA FORMAT)
                                     </label>
                                     <input 
                                        name="timezone"
                                        value={formData.timezone || ''}
                                        onChange={handleChange}
                                        placeholder="e.g. America/New_York or Asia/Shanghai"
                                        className="w-full bg-white border border-gray-400 p-2 text-xs focus:bg-blue-50 focus:border-blue-600 outline-none shadow-sm placeholder:text-gray-300 transition-colors"
                                     />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Style */}
                    <div>
                        <div className="text-[10px] text-gray-500 mb-2 border-b border-gray-300 pb-1 uppercase">
                        > SECTION_02: STYLE_PARAMETERS
                        </div>
                        
                        <div className="mb-4">
                            <label className="text-[10px] uppercase text-blue-700 mb-1 font-bold block">AESTHETIC_MODE</label>
                            <input name="aesthetic" value={formData.aesthetic || ''} onChange={handleChange} className="w-full bg-white border border-gray-400 p-2 text-xs outline-none mb-2"/>
                            <div className="flex flex-wrap gap-2 p-2 bg-gray-200 border border-gray-300">
                                <span className="text-[9px] text-gray-500 w-full mb-1">>> PRESETS:</span>
                                {AESTHETIC_TAGS.map(tag => (
                                <button key={tag} onClick={() => handleTagClick('aesthetic', tag)} className="text-[10px] border border-gray-400 bg-white px-2 py-px hover:bg-black hover:text-white transition-colors">[{tag}]</button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="text-[10px] uppercase text-blue-700 mb-1 font-bold block">VOICE_MODULATION</label>
                            <input name="voiceTone" value={formData.voiceTone || ''} onChange={handleChange} className="w-full bg-white border border-gray-400 p-2 text-xs outline-none mb-2"/>
                            <div className="flex flex-wrap gap-2 p-2 bg-gray-200 border border-gray-300">
                                <span className="text-[9px] text-gray-500 w-full mb-1">>> PRESETS:</span>
                                {TONE_TAGS.map(tag => (
                                <button key={tag} onClick={() => handleTagClick('voiceTone', tag)} className="text-[10px] border border-gray-400 bg-white px-2 py-px hover:bg-black hover:text-white transition-colors">[{tag}]</button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] uppercase text-blue-700 mb-1 font-bold block">EMOJI_PREFERENCE</label>
                            <input name="emojiStyle" value={formData.emojiStyle || ''} onChange={handleChange} placeholder="e.g. Minimalist" className="w-full bg-white border border-gray-400 p-2 text-xs outline-none mb-2"/>
                            <div className="flex flex-wrap gap-2 p-2 bg-gray-200 border border-gray-300">
                                <span className="text-[9px] text-gray-500 w-full mb-1">>> PRESETS:</span>
                                {EMOJI_PRESETS.map((preset) => (
                                <button key={preset.label} onClick={() => handleTagClick('emojiStyle', preset.value)} className="text-[10px] border border-gray-400 bg-white px-2 py-px hover:bg-black hover:text-white transition-colors">[{preset.label}]</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Logic */}
                    <div>
                        <div className="text-[10px] text-gray-500 mb-2 border-b border-gray-300 pb-1 uppercase">
                        > SECTION_03: BACKGROUND_LOGIC
                        </div>
                        <textarea 
                        name="bio"
                        value={formData.bio || ''}
                        onChange={handleChange}
                        rows={3}
                        className="w-full bg-white border border-gray-400 p-2 text-xs focus:bg-blue-50 focus:border-blue-600 outline-none resize-none font-mono leading-relaxed"
                        placeholder="ENTER ANALYSIS DATA..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-black bg-gray-200 flex justify-end gap-3 shrink-0">
                    <button 
                        onClick={handleOnClose}
                        className="px-6 py-2 border border-black bg-blue-600 text-white text-xs hover:bg-blue-700 uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none"
                    >
                        [ CLOSE & SAVE ]
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
