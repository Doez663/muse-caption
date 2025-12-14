
import React from 'react';
import { Persona } from '../types';

interface ProfileHeaderProps {
  persona: Persona;
  postCount: number;
  onEditProfile: () => void;
  onUpload: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ 
  persona, 
  postCount, 
  onEditProfile, 
  onUpload 
}) => {
  return (
    <div className="flex flex-col bg-white text-black font-sans pb-2">
      {/* Top Row: Avatar + Stats */}
      <div className="flex items-center px-4 pt-4 pb-2">
        {/* Avatar */}
        <div className="shrink-0 mr-6 md:mr-8" onClick={onEditProfile}>
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border border-gray-200 p-0.5 cursor-pointer">
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 border border-gray-100">
                    {persona.avatar ? (
                        <img src={persona.avatar} alt="profile" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-300">+</div>
                    )}
                </div>
            </div>
        </div>

        {/* Stats & Action (Right Side) */}
        <div className="flex-1 flex justify-around items-center text-center">
             <div className="flex flex-col">
                 <span className="font-bold text-lg md:text-xl leading-none">{postCount}</span>
                 <span className="text-[13px] md:text-sm text-gray-700">posts</span>
             </div>
             <div className="flex flex-col">
                 <span className="font-bold text-lg md:text-xl leading-none">13.9M</span>
                 <span className="text-[13px] md:text-sm text-gray-700">followers</span>
             </div>
             <div className="flex flex-col">
                 <span className="font-bold text-lg md:text-xl leading-none">12</span>
                 <span className="text-[13px] md:text-sm text-gray-700">following</span>
             </div>
        </div>
      </div>

      {/* Bio Section */}
      <div className="px-4 text-sm">
          <div className="font-bold text-sm">{persona.name}</div>
          <div className="text-gray-500 text-xs mb-0.5">{persona.occupation} • {persona.location}</div>
          <div className="whitespace-pre-line leading-snug text-sm">{persona.bio}</div>
          {persona.emojiStyle && (
            <div className="text-xs text-blue-800 mt-1 font-medium">{persona.emojiStyle}</div>
          )}
          <a href="#" className="text-blue-900 text-xs font-bold mt-1 block hover:underline">
              www.{persona.name.toLowerCase().replace(/[^a-z]/g, '')}.com
          </a>
      </div>

      {/* Action Buttons */}
      <div className="px-4 mt-4 flex gap-2">
           <button 
              onClick={onEditProfile}
              className="flex-1 bg-[#efefef] text-black font-bold text-xs md:text-sm py-1.5 rounded-md active:bg-gray-300 transition-colors"
           >
              Edit profile
           </button>
           <button 
              onClick={onEditProfile} 
              className="flex-1 bg-[#efefef] text-black font-bold text-xs md:text-sm py-1.5 rounded-md active:bg-gray-300 transition-colors"
           >
              Share profile
           </button>
           <button 
              onClick={onUpload}
              className="w-9 flex items-center justify-center bg-[#efefef] rounded-md active:bg-gray-300"
           >
              <span className="text-sm">📷</span>
           </button>
      </div>

      {/* Highlights Placeholder */}
      <div className="mt-4 px-4 flex gap-4 overflow-x-auto no-scrollbar pb-2">
           {[1,2,3,4].map(i => (
               <div key={i} className="flex flex-col items-center gap-1 shrink-0 opacity-40 grayscale">
                   <div className="w-16 h-16 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center">
                       <div className="w-14 h-14 rounded-full bg-gray-200"></div>
                   </div>
                   <div className="w-12 h-2 bg-gray-100 rounded"></div>
               </div>
           ))}
      </div>
    </div>
  );
};
