
import React, { useState } from 'react';
import { playSound } from '../services/soundService';

interface HashtagGroupProps {
  hashtags: string[];
}

export const HashtagGroup: React.FC<HashtagGroupProps> = ({ hashtags }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (tag: string, index: number) => {
    navigator.clipboard.writeText(tag);
    playSound.snap(); // Play Sound
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  if (!hashtags || hashtags.length === 0) return null;

  return (
    <div className="p-3 font-mono text-xs">
      <div className="text-gray-500 mb-2 uppercase">
        <span className="font-bold">> KEYWORDS_ARRAY</span> [{hashtags.length}]
      </div>
      <div className="flex flex-wrap gap-2 pl-4">
        {hashtags.map((tag, index) => (
          <button
            key={index}
            onClick={() => handleCopy(tag, index)}
            className={`
              hover:bg-blue-600 hover:text-white
              ${copiedIndex === index ? 'bg-black text-white' : 'text-blue-700'}
            `}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
};
