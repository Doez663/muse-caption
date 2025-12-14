
import React, { useState, useEffect } from 'react';
import { playSound } from '../services/soundService';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [masked, setMasked] = useState(true);

  useEffect(() => {
    const storedKey = localStorage.getItem('user_gemini_key');
    if (storedKey) setApiKey(storedKey);
    
    const storedUrl = localStorage.getItem('user_gemini_baseurl');
    if (storedUrl) setBaseUrl(storedUrl);
  }, []);

  const handleSave = () => {
    playSound.success();
    if (apiKey.trim()) {
      localStorage.setItem('user_gemini_key', apiKey.trim());
    } else {
      localStorage.removeItem('user_gemini_key');
    }

    if (baseUrl.trim()) {
        localStorage.setItem('user_gemini_baseurl', baseUrl.trim());
    } else {
        localStorage.removeItem('user_gemini_baseurl');
    }
    onClose();
  };

  const handleClear = () => {
    playSound.glitch();
    setApiKey('');
    setBaseUrl('');
    localStorage.removeItem('user_gemini_key');
    localStorage.removeItem('user_gemini_baseurl');
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm font-mono">
      <div className="w-[400px] max-w-[90vw] bg-gray-100 border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
        
        {/* Header */}
        <div className="bg-black text-white px-3 py-2 flex justify-between items-center select-none">
          <span className="text-xs uppercase tracking-wider font-bold">&gt;&gt; SYSTEM_CONFIG</span>
          <button onClick={onClose} className="hover:text-red-400 text-xs font-bold">[X]</button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          
          <div className="bg-blue-50 border border-blue-400 p-3 text-[10px] text-blue-900 leading-relaxed">
            <strong>⚠ REGION BLOCK FIX:</strong><br/>
            If you see "400 User location is not supported", please enter a custom Base URL (Proxy).
          </div>

          <div>
            <label className="text-[10px] uppercase text-blue-700 font-bold block mb-1">
              GEMINI_API_KEY
            </label>
            <div className="relative">
              <input 
                type={masked ? "password" : "text"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full bg-white border border-gray-400 p-2 text-xs font-mono outline-none focus:border-blue-600 focus:bg-blue-50 transition-colors pr-8"
              />
              <button 
                onClick={() => setMasked(!masked)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
              >
                {masked ? '👁' : '⚔'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase text-blue-700 font-bold block mb-1">
              CUSTOM_BASE_URL (OPTIONAL)
            </label>
            <input 
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="e.g. https://my-proxy.workers.dev"
                className="w-full bg-white border border-gray-400 p-2 text-xs font-mono outline-none focus:border-blue-600 focus:bg-blue-50 transition-colors"
            />
            <div className="text-[9px] text-gray-500 mt-1">
               Use this if you need to route requests through a proxy.
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-black bg-gray-200 flex justify-between items-center">
            <button 
                onClick={handleClear}
                className="px-3 py-2 text-[10px] uppercase text-red-600 border border-transparent hover:border-red-600 hover:bg-red-50"
            >
                RESET ALL
            </button>
            <div className="flex gap-2">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 border border-black bg-white text-xs uppercase hover:bg-gray-50"
                >
                    CANCEL
                </button>
                <button 
                    onClick={handleSave}
                    className="px-4 py-2 border border-black bg-blue-600 text-white text-xs uppercase hover:bg-blue-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none"
                >
                    SAVE CONFIG
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
