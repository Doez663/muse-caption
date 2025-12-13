import React from 'react';
import { CanvasItem } from '../types';

interface DraggableImageProps {
  item: CanvasItem;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onDelete: (id: string) => void;
  onMaximize: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onDoubleClick: (id: string) => void;
  width: number;
}

export const DraggableImage: React.FC<DraggableImageProps> = ({ 
  item, 
  isSelected, 
  onMouseDown,
  onContextMenu,
  onDoubleClick,
  width
}) => {
  return (
    <div
      data-item-id={item.id}
      onMouseDown={(e) => onMouseDown(e, item.id)}
      onContextMenu={(e) => onContextMenu(e, item.id)}
      onDoubleClick={() => onDoubleClick(item.id)}
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        zIndex: item.zIndex,
        transform: `rotate(${item.rotation}deg)`,
        width: `${width}px`, 
      }}
      className={`
        group flex flex-col select-none cursor-default
        ${isSelected ? 'z-50' : 'hover:z-40'}
      `}
    >
      {/* Image Container */}
      <div 
        className={`
          relative w-full aspect-[3/4] overflow-hidden bg-black transition-none shadow-md
          ${isSelected 
              ? 'border-[4px] border-blue-700' // Selected: Blue Border (Sidebar Match)
              : 'border-[4px] border-white'    // Default: White Border + Shadow
          }
        `}
      >
        {/* Base Image */}
        <img 
          src={item.image.url} 
          alt={item.image.file.name}
          className={`
              w-full h-full object-cover block pointer-events-none select-none transition-none
              ${isSelected 
                  ? 'brightness-110' // Increased brightness, normal color
                  : 'filter grayscale-[0.5] contrast-125 opacity-90' 
              } 
          `} 
          style={{
              imageRendering: 'pixelated'
          }}
          draggable={false}
        />
        
        {/* Filename Label (Matches Sidebar Header Blue) */}
        {isSelected && (
            <div className="absolute bottom-0 left-0 right-0 bg-blue-700 text-white text-[10px] font-mono text-center px-1 py-0.5 truncate z-20 leading-none">
                {item.image.file.name.toUpperCase()}
            </div>
        )}
      </div>
    </div>
  );
};