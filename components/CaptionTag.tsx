
import React, { useState } from 'react';
import { GeneratedCaption } from '../types';
import { playSound } from '../services/soundService';

interface CaptionTagProps {
  caption: GeneratedCaption;
  index: number;
}

export const CaptionTag: React.FC<CaptionTagProps> = ({ caption, index }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // Modified: Only copy "English Text + Emoji"
    // The translation is excluded so the user can paste directly to Instagram/Threads without editing.
    const fullText = `${caption.text} ${caption.emoji}`;
    navigator.clipboard.writeText(fullText);
    
    // Play Sound
    playSound.snap();
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={handleCopy}
      className={`
        w-full text-left cursor-pointer
        py-3 px-3 
        font-mono text-xs
        hover:bg-blue-50
        group
        border-b border-dashed border-gray-300
      `}
    >
      <div className="flex gap-2 text-gray-500 mb-1">
         <span className="font-bold">{`> 0${index + 1}`}</span>
         <span>[{caption.tone.toUpperCase()}]</span>
         {copied && <span className="text-blue-600 font-bold ml-auto">--COPIED--</span>}
      </div>
      
      {/* Main English Caption */}
      <p className="text-sm font-normal text-black pl-4 leading-relaxed">
        "{caption.text}" <span className="opacity-70">{caption.emoji}</span>
      </p>

      {/* Chinese Translation (Visual Only - Not Copied) */}
      {/* Added select-none to reinforce that this is 'metadata' and not part of the payload */}
      {caption.translation && (
        <p className="text-[10px] text-gray-400 pl-4 mt-1 font-normal tracking-wide select-none opacity-80">
          {caption.translation}
        </p>
      )}
    </div>
  );
};
