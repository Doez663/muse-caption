import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { DraggableImage } from './components/DraggableImage';
import { CaptionTag } from './components/CaptionTag';
import { HashtagGroup } from './components/HashtagGroup';
import { PersonaProfile } from './components/PersonaProfile';
import { SettingsModal } from './components/SettingsModal';
import { ImagePreview, CaptionStyle, CanvasItem, Persona, GeminiModel } from './types';
import { generateCaptions } from './services/geminiService';
import { getPersonasFromDB, savePersonasToDB, getItemsFromDB, saveItemsToDB } from './services/storageService';
import { playSound } from './services/soundService';

const DEFAULT_PERSONA: Persona = {
  id: "default_gigi",
  name: "Gigi",
  age: "28",
  occupation: "Creative Director",
  location: "Los Angeles",
  timezone: "America/Los_Angeles",
  bio: "Less is more. Digital artist obsessed with brutalism and matcha.",
  aesthetic: "Minimalist, Industrial, Raw",
  voiceTone: "Witty, Nonchalant",
  emojiStyle: "Minimalist (🖤, 🌫, ⚓️)",
  avatar: "" // Default empty avatar
};

// --- SYSTEM LOADER COMPONENT ---
const LOADING_MESSAGES = [
  "INITIALIZING_NEURAL_NET...",
  "SCANNING_PIXEL_DATA...",
  "QUANTIZING_COLORS...",
  "EXTRACTING_AESTHETIC_VIBE...",
  "CONSULTING_PERSONA_DB...",
  "GENERATING_WIT...",
  "APPLYING_TONE_FILTERS...",
  "FINALIZING_OUTPUT_STREAM..."
];

const SystemLoader: React.FC<{ onAbort: () => void }> = ({ onAbort }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Message cycling
    const textInterval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 600);

    // Progress bar simulation (asymptotic to 95%)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return 95;
        const remaining = 100 - prev;
        return prev + (remaining * 0.15) + Math.random() * 3;
      });
    }, 200);

    return () => {
      clearInterval(textInterval);
      clearInterval(progressInterval);
    };
  }, []);

  // Generate ASCII Progress Bar (Reduced length for Sidebar width)
  const totalChars = 20;
  const filledChars = Math.floor((progress / 100) * totalChars);
  // Use non-breaking spaces for empty slots to maintain width
  const progressBar = "[" + ">".repeat(filledChars) + ".".repeat(totalChars - filledChars) + "]";

  return (
    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-[100] flex flex-col items-center justify-center cursor-wait select-none text-black">
       <div className="font-mono text-xs flex flex-col gap-2 max-w-[280px] text-center">
          
          {/* Status Line */}
          <div className="flex flex-col items-center gap-1 mb-2">
            <span className="animate-pulse text-blue-600 text-2xl">⚡</span>
            <span className="uppercase font-bold tracking-tight text-[10px]">
              {LOADING_MESSAGES[msgIndex]}
            </span>
          </div>

          {/* ASCII Bar */}
          <div className="font-mono whitespace-pre tracking-tighter text-blue-800">
             {progressBar}
          </div>
          <div className="font-bold">
            {Math.floor(progress)}%
          </div>

          {/* Abort Action (Text based) */}
          <div className="mt-6 text-center">
             <button 
                onClick={onAbort}
                className="text-[9px] uppercase hover:bg-red-600 hover:text-white px-2 py-1 border border-gray-300 hover:border-red-600 transition-colors"
             >
                [ CANCEL OPERATION ]
             </button>
          </div>

       </div>
    </div>
  );
};

interface ViewState {
    x: number;
    y: number;
    scale: number;
}

interface SelectionBox {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    active: boolean;
}

const App: React.FC = () => {
  // --- STATE ---
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  
  // Selection States
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [maximizedItemId, setMaximizedItemId] = useState<string | null>(null);

  const [style, setStyle] = useState<CaptionStyle>(CaptionStyle.SOCIAL);
  const [currentModel, setCurrentModel] = useState<GeminiModel>(GeminiModel.LITE);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // VIEWPORT STATE (Zoom & Pan)
  const [view, setView] = useState<ViewState>({ x: 0, y: 0, scale: 1 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Selection Box State
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  // Display Settings
  const [iconSize, setIconSize] = useState(150);
  const [gridGap, setGridGap] = useState(20);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);

  // Dragging State
  const [isDraggingFile, setIsDraggingFile] = useState(false); // External file drop
  const dragCounter = useRef(0); // Fix for flicker issue
  
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    type: 'ITEM' | 'CANVAS' | null;
    itemId: string | null;
    startX: number;
    startY: number;
    initialItemX: number; // For Items
    initialItemY: number; // For Items
    initialViewX: number; // For Canvas
    initialViewY: number; // For Canvas
    hasMoved: boolean;
  }>({ 
      isDragging: false, 
      type: null,
      itemId: null, 
      startX: 0, 
      startY: 0, 
      initialItemX: 0, 
      initialItemY: 0, 
      initialViewX: 0, 
      initialViewY: 0, 
      hasMoved: false 
  });
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; type: 'CANVAS' | 'ITEM' | 'MULTI'; itemId?: string } | null>(null);

  // --- PERSONA MANAGEMENT STATE ---
  const [personas, setPersonas] = useState<Persona[]>([DEFAULT_PERSONA]);
  const [activePersonaId, setActivePersonaId] = useState<string>(() => {
    return localStorage.getItem('muse_active_persona_id') || DEFAULT_PERSONA.id;
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Derived State
  const activePersona = personas.find(p => p.id === activePersonaId) || personas[0] || DEFAULT_PERSONA;
  const primarySelectedId = selectedIds.size === 1 ? Array.from(selectedIds)[0] : null;
  const selectedItem = items.find(i => i.id === primarySelectedId);
  const isMultiSelection = selectedIds.size > 1;
  const selectedItemsList = items.filter(i => selectedIds.has(i.id));

  // Logic to determine if current history item matches current style
  const rawCurrentResult = selectedItem && selectedItem.history.length > 0 
    ? selectedItem.history[selectedItem.viewIndex] 
    : null;

  // Filter: Only show the result if it matches the current style (or if style is undefined for legacy items)
  // If undefined, we assume it matches standard Social for now.
  const isValidStyle = rawCurrentResult && (rawCurrentResult.style === style || (!rawCurrentResult.style && style === CaptionStyle.SOCIAL));
  
  const currentResult = isValidStyle ? rawCurrentResult : null;
  
  const captions = currentResult?.captions || [];
  const hashtags = currentResult?.hashtags || [];
  
  const maximizedItem = items.find(i => i.id === maximizedItemId);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // --- PERSISTENCE (INDEXEDDB) ---
  
  useEffect(() => {
    const initData = async () => {
      try {
        const [loadedPersonas, loadedItems] = await Promise.all([
          getPersonasFromDB(),
          getItemsFromDB()
        ]);
        if (loadedPersonas.length > 0) setPersonas(loadedPersonas);
        if (loadedItems.length > 0) setItems(loadedItems);
      } catch (e) {
        console.error("Failed to load data from IndexedDB", e);
      } finally {
        setIsDbLoaded(true);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    if (!isDbLoaded) return;
    const timer = setTimeout(() => {
      savePersonasToDB(personas).catch(err => console.error("Save Personas Failed", err));
    }, 1000);
    return () => clearTimeout(timer);
  }, [personas, isDbLoaded]);

  useEffect(() => {
    if (!isDbLoaded) return;
    const timer = setTimeout(() => {
      saveItemsToDB(items).catch(err => console.error("Save Items Failed", err));
    }, 1000);
    return () => clearTimeout(timer);
  }, [items, isDbLoaded]);

  useEffect(() => {
    localStorage.setItem('muse_active_persona_id', activePersonaId);
  }, [activePersonaId]);

  // --- KEYBOARD LISTENERS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && !e.repeat && document.activeElement === document.body) {
             e.preventDefault(); 
             setIsSpacePressed(true);
        }
        if (e.key === 'Escape') {
            setMaximizedItemId(null);
            setShowDisplaySettings(false);
            setContextMenu(null);
            return;
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && !isProfileOpen && selectedIds.size > 0) {
             handleBulkDelete();
             return;
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
             setIsSpacePressed(false);
             if (dragState.isDragging && dragState.type === 'CANVAS') {
                 setDragState(prev => ({ ...prev, isDragging: false, type: null }));
             }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedIds, isProfileOpen, isSpacePressed, dragState.isDragging]);

  // --- SYNC VIEW INDEX ON SELECTION CHANGE ---
  // Fix for bug: When switching to an item that has history for the current style
  // but is currently viewing a different style's history, the UI would be blank.
  useEffect(() => {
      if (!primarySelectedId) return;

      setItems(prev => {
          const item = prev.find(i => i.id === primarySelectedId);
          if (!item || item.history.length === 0) return prev;

          // Helper to check match
          const matchesStyle = (h: any) => h && (h.style === style || (!h.style && style === CaptionStyle.SOCIAL));

          const currentEntry = item.history[item.viewIndex];

          // If currently viewing a valid entry for this style, do nothing
          if (matchesStyle(currentEntry)) return prev;

          // Otherwise, find the latest entry that matches the current style
          for (let i = item.history.length - 1; i >= 0; i--) {
              if (matchesStyle(item.history[i])) {
                  // Found a better view index, update it
                  return prev.map(p => p.id === primarySelectedId ? { ...p, viewIndex: i } : p);
              }
          }

          return prev;
      });
  }, [primarySelectedId, style]); 

  // --- UTILS ---
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 800; 
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.6));
          } else {
            reject(new Error("Canvas context failed"));
          }
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleUpdatePersona = (updated: Persona) => {
    setPersonas(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleCreatePersona = () => {
    const newId = Date.now().toString();
    const newPersona: Persona = { 
        ...DEFAULT_PERSONA, 
        id: newId, 
        name: "New Identity",
        avatar: "" 
    };
    setPersonas(prev => [...prev, newPersona]);
  };

  const handleDeletePersona = (id: string) => {
      if (personas.length <= 1) {
          alert("Cannot delete the last persona.");
          return;
      }
      const newPersonas = personas.filter(p => p.id !== id);
      setPersonas(newPersonas);
      if (activePersonaId === id) {
          setActivePersonaId(newPersonas[0].id);
      }
  };

  const arrangeGrid = () => {
    playSound.click();
    if (!canvasRef.current) return;
    
    const itemTotalWidth = iconSize + gridGap;
    const itemTotalHeight = (iconSize * (4/3)) + gridGap; 
    const worldWidth = canvasRef.current.clientWidth / view.scale;
    const cols = Math.floor((worldWidth - gridGap) / itemTotalWidth);
    const safeCols = Math.max(1, cols);

    setItems(prev => prev.map((item, index) => ({
      ...item,
      x: (index % safeCols) * itemTotalWidth,
      y: Math.floor(index / safeCols) * itemTotalHeight,
      rotation: 0
    })));
    setContextMenu(null);
  };

  const findSmartPosition = (currentItems: CanvasItem[], width: number, height: number) => {
    const itemTotalW = width + gridGap;
    const itemTotalH = height + gridGap;
    const cols = 4; 
    let index = 0;
    while (true) {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const candidateX = col * itemTotalW; 
        const candidateY = row * itemTotalH; 

        const isOccupied = currentItems.some(item => 
            Math.abs(item.x - candidateX) < (width * 0.5) && 
            Math.abs(item.y - candidateY) < (height * 0.5)
        );
        if (!isOccupied) return { x: candidateX, y: candidateY };
        index++;
        if (index > 2000) return { x: Math.random() * 500, y: Math.random() * 500 };
    }
  };

  // --- HANDLERS ---
  const handleTriggerUpload = () => {
      setContextMenu(null);
      playSound.click();
      if (uploadInputRef.current) {
          uploadInputRef.current.click();
      }
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          Array.from(e.target.files).forEach(file => handleImageFile(file as File));
      }
      e.target.value = '';
  };

  const handleImageFile = async (file: File, overrides?: { x?: number, y?: number, rotation?: number }) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const compressedBase64 = await compressImage(file);
      const base64Data = compressedBase64.split(',')[1];
      let dropX = 0;
      let dropY = 0;
      let rotation = 0;

      if (overrides && overrides.x !== undefined && overrides.y !== undefined) {
          dropX = overrides.x;
          dropY = overrides.y;
      } else {
         const itemH = iconSize * (4/3);
         const smartPos = findSmartPosition(items, iconSize, itemH);
         dropX = smartPos.x;
         dropY = smartPos.y;
      }
      if (overrides?.rotation !== undefined) rotation = overrides.rotation;

      const newImage: ImagePreview = {
        file,
        url: URL.createObjectURL(file), 
        base64: base64Data,
        mimeType: 'image/jpeg'
      };

      const newItem: CanvasItem = {
        id: Date.now().toString() + Math.random().toString().slice(2,5),
        image: newImage,
        history: [], 
        viewIndex: -1, // No view initially
        x: dropX,
        y: dropY,
        rotation: rotation, 
        zIndex: items.length + 1,
      };

      setItems(prev => [...prev, newItem]);
      setSelectedIds(prev => new Set(prev).add(newItem.id)); 
      playSound.upload(); 
    } catch (error) {
      console.error("Image processing error:", error);
      setError("Failed to process image.");
    }
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setLoading(false);
        setError(">> OP_CANCELLED_BY_USER");
        playSound.glitch();
    }
  };

  const generateSingleItem = async (item: CanvasItem, signal: AbortSignal) => {
      try {
        const result = await generateCaptions(item.image, style, activePersona, currentModel, signal);
        const resultWithTimestamp = { ...result, timestamp: Date.now() };
        setItems(prevItems => prevItems.map(i => {
            if (i.id === item.id) {
                const newHistory = [...i.history, resultWithTimestamp];
                // Automatically switch view to the new result
                return { ...i, history: newHistory, viewIndex: newHistory.length - 1 };
            }
            return i;
        }));
      } catch (err: any) {
          if (err.message !== "ABORTED") throw err;
      }
  };

  const handleGenerate = async (targetItems: CanvasItem[]) => {
    playSound.click();
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setError(null);

    try {
        await Promise.all(targetItems.map(item => generateSingleItem(item, controller.signal)));
        playSound.success(); 
    } catch (err: any) {
        if (err.message === "ABORTED") {
            setError(">> OP_CANCELLED_BY_USER");
        } else if (err.message === "MISSING_API_KEY") {
            setError(">> SYSTEM ERROR: MISSING API KEY. PLEASE CONFIGURE SETTINGS.");
            playSound.glitch();
            setIsSettingsOpen(true); // Auto open settings
        } else {
            setError(`>> API_FAIL: ${err.message}`);
            playSound.glitch();
        }
    } finally {
        if (abortControllerRef.current === controller) {
            setLoading(false);
            abortControllerRef.current = null;
        }
    }
  };

  const handleBulkGenerate = () => {
      const targets = items.filter(i => selectedIds.has(i.id));
      if (targets.length > 0) handleGenerate(targets);
  };

  const handleBulkDelete = () => {
      playSound.glitch();
      setItems(prev => prev.filter(i => !selectedIds.has(i.id)));
      setSelectedIds(new Set());
      setContextMenu(null);
  };

  const handleToggleModel = () => {
    playSound.click();
    setCurrentModel(prev => {
        if (prev === GeminiModel.PRO_3_0) return GeminiModel.PRO_2_5;
        if (prev === GeminiModel.PRO_2_5) return GeminiModel.FLASH;
        if (prev === GeminiModel.FLASH) return GeminiModel.LITE;
        return GeminiModel.PRO_3_0;
    });
  };

  const getModelLabel = (m: string) => {
      switch(m) {
          case GeminiModel.PRO_3_0: return 'ULTRA (3.0 PRO)';
          case GeminiModel.PRO_2_5: return 'PRECISION (2.5 PRO)';
          case GeminiModel.FLASH: return 'TURBO (2.5 FLASH)';
          case GeminiModel.LITE: return 'LITE (2.5 LITE)';
          default: return m.replace('gemini-', '').toUpperCase();
      }
  };

  // --- MOUSE / TOUCH / DRAG HANDLERS ---
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || !e.shiftKey) { // Zoom
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const newScale = Math.min(Math.max(view.scale * (1 + delta), 0.1), 5);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = (mouseX - view.x) / view.scale;
        const worldY = (mouseY - view.y) / view.scale;
        const newViewX = mouseX - worldX * newScale;
        const newViewY = mouseY - worldY * newScale;
        setView({ scale: newScale, x: newViewX, y: newViewY });
    } else {
        setView(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (e.button === 0 && !isSpacePressed) {
          setSelectedIds(new Set()); 
          setSelectionBox({
              startX: mouseX,
              startY: mouseY,
              currentX: mouseX,
              currentY: mouseY,
              active: true
          });
          return;
      }
      if (e.button === 1 || isSpacePressed) {
          setDragState({
              isDragging: true,
              type: 'CANVAS',
              itemId: null,
              startX: e.clientX,
              startY: e.clientY,
              initialItemX: 0,
              initialItemY: 0,
              initialViewX: view.x,
              initialViewY: view.y,
              hasMoved: false
          });
      }
  };

  const handleItemMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    if (isSpacePressed) return; 
    
    if (!selectedIds.has(id)) {
        playSound.select(); 
        if (!e.shiftKey) {
            setSelectedIds(new Set([id]));
        } else {
            setSelectedIds(prev => new Set(prev).add(id));
        }
    } else if (e.shiftKey) {
        const newSet = new Set(selectedIds);
        newSet.delete(id);
        setSelectedIds(newSet);
        return; 
    }
    const item = items.find(i => i.id === id);
    if (!item) return;

    setDragState({
      isDragging: true,
      type: 'ITEM',
      itemId: id,
      startX: e.clientX,
      startY: e.clientY,
      initialItemX: item.x,
      initialItemY: item.y,
      initialViewX: 0,
      initialViewY: 0,
      hasMoved: false
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (selectionBox && selectionBox.active) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const newBox = { ...selectionBox, currentX: mouseX, currentY: mouseY };
            setSelectionBox(newBox);
            const boxLeft = Math.min(newBox.startX, newBox.currentX);
            const boxTop = Math.min(newBox.startY, newBox.currentY);
            const boxRight = Math.max(newBox.startX, newBox.currentX);
            const boxBottom = Math.max(newBox.startY, newBox.currentY);
            const newSelection = new Set<string>();
            items.forEach(item => {
                const screenX = (item.x * view.scale) + view.x;
                const screenY = (item.y * view.scale) + view.y;
                const screenW = iconSize * view.scale; 
                const screenH = (iconSize * 1.33) * view.scale; 
                if (
                    screenX < boxRight &&
                    screenX + screenW > boxLeft &&
                    screenY < boxBottom &&
                    screenY + screenH > boxTop
                ) {
                    newSelection.add(item.id);
                }
            });
            setSelectedIds(newSelection);
        }
        return;
    }
    if (!dragState.isDragging) return;
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
       setDragState(prev => ({ ...prev, hasMoved: true }));
       if (dragState.type === 'CANVAS') {
           setView({
               ...view,
               x: dragState.initialViewX + deltaX,
               y: dragState.initialViewY + deltaY
           });
       }
       else if (dragState.type === 'ITEM' && dragState.itemId) {
           const dragTargetSelected = selectedIds.has(dragState.itemId);
           if (dragTargetSelected) {
                setItems(prev => prev.map(i => {
                    if (i.id === dragState.itemId) {
                       let newX = dragState.initialItemX + (deltaX / view.scale);
                       let newY = dragState.initialItemY + (deltaY / view.scale);
                       if (snapToGrid) {
                         const snapSize = 20; 
                         newX = Math.round(newX / snapSize) * snapSize;
                         newY = Math.round(newY / snapSize) * snapSize;
                       }
                       return { ...i, x: newX, y: newY };
                    }
                    return i;
                }));
           }
       }
    }
  };

  const handleMouseUp = () => {
    if (selectionBox) setSelectionBox(null);
    setDragState({ 
        isDragging: false, 
        type: null,
        itemId: null, 
        startX: 0, 
        startY: 0, 
        initialItemX: 0, 
        initialItemY: 0, 
        initialViewX: 0, 
        initialViewY: 0, 
        hasMoved: false 
    });
  };

  // --- TOUCH HANDLERS (Kept for trackpad/hybrid laptops, but stripped of mobile-specific layout logic) ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const target = e.target as HTMLElement;
    const itemContainer = target.closest('[data-item-id]');
    
    if (itemContainer) {
        e.preventDefault();
        const id = (itemContainer as HTMLElement).dataset.itemId!;
        const item = items.find(i => i.id === id);
        if (!item) return;
        if (!selectedIds.has(id)) setSelectedIds(new Set([id]));
        setDragState({
            isDragging: true,
            type: 'ITEM',
            itemId: id,
            startX: touch.clientX,
            startY: touch.clientY,
            initialItemX: item.x,
            initialItemY: item.y,
            initialViewX: 0,
            initialViewY: 0,
            hasMoved: false
        });
    } else {
        setDragState({
            isDragging: true,
            type: 'CANVAS',
            itemId: null,
            startX: touch.clientX,
            startY: touch.clientY,
            initialItemX: 0,
            initialItemY: 0,
            initialViewX: view.x,
            initialViewY: view.y,
            hasMoved: false
        });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!dragState.isDragging || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragState.startX;
      const deltaY = touch.clientY - dragState.startY;
      if (dragState.type === 'CANVAS') {
          setView({
              ...view,
              x: dragState.initialViewX + deltaX,
              y: dragState.initialViewY + deltaY
          });
      } else if (dragState.type === 'ITEM' && dragState.itemId) {
          setItems(prev => prev.map(i => {
              if (i.id === dragState.itemId) {
                  const newX = dragState.initialItemX + (deltaX / view.scale);
                  const newY = dragState.initialItemY + (deltaY / view.scale);
                  return { ...i, x: newX, y: newY };
              }
              return i;
          }));
      }
  };

  const handleTouchEnd = () => {
      setDragState(prev => ({ ...prev, isDragging: false, type: null, itemId: null }));
  };

  // --- CONTEXT MENUS ---
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, type: 'CANVAS' });
  };

  const handleItemContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedIds.has(id)) {
        if (selectedIds.size > 1) {
            setContextMenu({ visible: true, x: e.clientX, y: e.clientY, type: 'MULTI', itemId: id });
        } else {
            setContextMenu({ visible: true, x: e.clientX, y: e.clientY, type: 'ITEM', itemId: id });
        }
    } else {
        setSelectedIds(new Set([id]));
        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, type: 'ITEM', itemId: id });
    }
  };

  const handleItemDoubleClick = (id: string) => {
    handleMaximizeItem(id);
  };

  const closeContextMenu = () => setContextMenu(null);

  // --- GENERAL ACTIONS ---
  const handleDeleteItem = (id: string) => {
    playSound.glitch();
    setItems(prev => prev.filter(item => item.id !== id));
    setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
    });
    setContextMenu(null);
  };

  const handleMaximizeItem = (id: string) => {
    playSound.click();
    setMaximizedItemId(id);
    setContextMenu(null);
  };

  const handleRefresh = () => {
    if (selectedItem && !loading) {
      handleGenerate([selectedItem]);
    }
  };

  const handlePrevHistory = () => {
    playSound.click();
    if (!selectedItem) return;
    
    // Find PREVIOUS history item that matches CURRENT style
    // Iterate backwards from current viewIndex - 1
    for (let i = selectedItem.viewIndex - 1; i >= 0; i--) {
        const h = selectedItem.history[i];
        if (h.style === style || (!h.style && style === CaptionStyle.SOCIAL)) {
            setItems(prev => prev.map(item => item.id === selectedItem.id ? { ...item, viewIndex: i } : item));
            return;
        }
    }
  };

  const handleNextHistory = () => {
    playSound.click();
    if (!selectedItem) return;

    // Find NEXT history item that matches CURRENT style
    // Iterate forwards from current viewIndex + 1
    for (let i = selectedItem.viewIndex + 1; i < selectedItem.history.length; i++) {
        const h = selectedItem.history[i];
        if (h.style === style || (!h.style && style === CaptionStyle.SOCIAL)) {
            setItems(prev => prev.map(item => item.id === selectedItem.id ? { ...item, viewIndex: i } : item));
            return;
        }
    }
  };

  const handleStyleChange = (newStyle: CaptionStyle) => {
    playSound.click();
    setStyle(newStyle);

    // When changing style, try to find the LATEST history entry that matches this style
    // and switch viewIndex to it.
    if (selectedItem && selectedItem.history.length > 0) {
        // Iterate backwards from end to find most recent
        for (let i = selectedItem.history.length - 1; i >= 0; i--) {
             const h = selectedItem.history[i];
             // Match style OR assume legacy items (undefined style) are Social
             if (h.style === newStyle || (!h.style && newStyle === CaptionStyle.SOCIAL)) {
                 setItems(prev => prev.map(item => item.id === selectedItem.id ? { ...item, viewIndex: i } : item));
                 return;
             }
        }
    }
  };

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDraggingFile(true);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
        setIsDraggingFile(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    dragCounter.current = 0; 
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        const rect = canvasRef.current?.getBoundingClientRect();
        let startX = 0;
        let startY = 0;
        if (rect) {
             startX = (e.clientX - rect.left - view.x) / view.scale;
             startY = (e.clientY - rect.top - view.y) / view.scale;
             startX -= (iconSize / 2);
             startY -= ((iconSize * 1.33) / 2);
        }
        const COLS = 4;
        setSelectedIds(new Set());
        files.forEach((file, index) => {
             const col = index % COLS;
             const row = Math.floor(index / COLS);
             const posX = startX + (col * (iconSize + gridGap));
             const posY = startY + (row * ((iconSize * 1.33) + gridGap));
             handleImageFile(file as File, { x: posX, y: posY });
        });
    }
  }, [style, activePersona, iconSize, view, items, gridGap]);

  const resetView = () => {
      playSound.click();
      setView({ x: 50, y: 50, scale: 1 });
  }
  
  // Calculate navigation state for currently selected style
  let canGoPrev = false;
  let canGoNext = false;
  let styleVersionCount = 0;
  let styleVersionCurrent = 0;
  
  if (selectedItem) {
      const styleHistory = selectedItem.history.map((h, idx) => ({...h, originalIndex: idx}))
          .filter(h => h.style === style || (!h.style && style === CaptionStyle.SOCIAL));
      
      styleVersionCount = styleHistory.length;
      
      if (currentResult && styleVersionCount > 0) {
          const currentInStyleIndex = styleHistory.findIndex(h => h.originalIndex === selectedItem.viewIndex);
          if (currentInStyleIndex !== -1) {
              styleVersionCurrent = currentInStyleIndex + 1;
              canGoPrev = currentInStyleIndex > 0;
              canGoNext = currentInStyleIndex < styleHistory.length - 1;
          }
      }
  }

  return (
    <div 
      className="flex w-screen h-screen bg-[#E0E0E0] text-black overflow-hidden font-sans"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={closeContextMenu} 
    >
      
      {/* Hidden File Input for Manual Import via Context Menu */}
      <input 
          type="file" 
          ref={uploadInputRef}
          onChange={handleManualUpload}
          accept="image/*"
          multiple
          className="hidden"
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}

      {/* Persona Modal */}
      {isProfileOpen && (
        <PersonaProfile 
          personas={personas}
          activeId={activePersonaId}
          onUpdate={handleUpdatePersona}
          onCreate={handleCreatePersona}
          onDelete={handleDeletePersona}
          onSetActive={setActivePersonaId}
          onClose={() => setIsProfileOpen(false)} 
        />
      )}

      {/* Maximized View Modal */}
      {maximizedItem && (
        <div 
            className="fixed inset-0 z-[2000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-8 font-mono" 
            onClick={() => setMaximizedItemId(null)}
        >
           <div 
                className="relative bg-gray-100 border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col max-w-[90vw] max-h-[90vh]"
                onClick={e => e.stopPropagation()}
           >
              <div className="flex justify-between items-center bg-blue-700 text-white p-2 border-b border-black">
                  <span>PREVIEW: {maximizedItem.image.file.name.toUpperCase()}</span>
                  <button onClick={() => setMaximizedItemId(null)} className="hover:text-red-300 px-2">[CLOSE]</button>
              </div>
              <div className="p-4 overflow-auto flex items-center justify-center bg-white min-h-[300px]">
                  <img src={maximizedItem.image.url} className="max-w-full max-h-[70vh] object-contain shadow-lg" />
              </div>
           </div>
        </div>
      )}

      {/* Context Menus */}
      {contextMenu && contextMenu.visible && (
        <div 
            className="fixed z-[9999] bg-white border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col min-w-[160px] py-1 font-mono text-xs"
            style={{ left: contextMenu.x, top: contextMenu.y }}
        >
             {contextMenu.type === 'CANVAS' && (
                 <>
                    <button onClick={handleTriggerUpload} className="px-3 py-2 hover:bg-blue-600 hover:text-white text-left font-bold border-b border-gray-100">
                        + IMPORT_IMAGES
                    </button>
                    <button onClick={arrangeGrid} className="px-3 py-2 hover:bg-blue-600 hover:text-white text-left">ARRANGE_GRID</button>
                    <button onClick={resetView} className="px-3 py-2 hover:bg-blue-600 hover:text-white text-left">RESET_VIEW</button>
                    <button onClick={() => setShowDisplaySettings(true)} className="px-3 py-2 hover:bg-blue-600 hover:text-white text-left border-t border-gray-200">VIEW_SETTINGS</button>
                 </>
             )}
             {contextMenu.type === 'ITEM' && contextMenu.itemId && (
                 <>
                    <button onClick={() => handleMaximizeItem(contextMenu.itemId!)} className="px-3 py-2 hover:bg-blue-600 hover:text-white text-left font-bold">OPEN_PREVIEW</button>
                    <button onClick={handleRefresh} className="px-3 py-2 hover:bg-blue-600 hover:text-white text-left">REGENERATE_CAPTION</button>
                    <button onClick={() => handleDeleteItem(contextMenu.itemId!)} className="px-3 py-2 hover:bg-red-600 hover:text-white text-left border-t border-gray-200 text-red-600">DELETE</button>
                 </>
             )}
             {contextMenu.type === 'MULTI' && (
                 <>
                    <div className="px-3 py-2 text-gray-400 bg-gray-50 border-b border-gray-100">
                        SELECTION_SIZE: {selectedIds.size}
                    </div>
                    <button onClick={handleBulkGenerate} className="px-3 py-2 hover:bg-blue-600 hover:text-white text-left">BATCH_GENERATE</button>
                    <button onClick={handleBulkDelete} className="px-3 py-2 hover:bg-red-600 hover:text-white text-left border-t border-gray-200 text-red-600">BATCH_DELETE</button>
                 </>
             )}
        </div>
      )}

      {/* --- CANVAS AREA (LEFT/CENTER) --- */}
      <div 
        className="flex-1 relative bg-[#E0E0E0] overflow-hidden cursor-crosshair touch-none"
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onTouchStart={handleTouchStart}
        onContextMenu={handleCanvasContextMenu}
        onWheel={handleWheel}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Grid Background */}
        <div 
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
                backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                backgroundSize: `${40 * view.scale}px ${40 * view.scale}px`, // Dynamic Size
                backgroundPosition: `${view.x}px ${view.y}px`, // Dynamic Pan
            }}
        />

        {/* Drag Hint Overlay */}
        {isDraggingFile && (
            <div className="absolute inset-0 z-50 bg-blue-600/20 backdrop-blur-sm border-4 border-blue-600 border-dashed m-4 flex items-center justify-center pointer-events-none">
                <div className="text-4xl font-bold text-blue-800 bg-white/80 px-8 py-4 shadow-xl">
                    DROP_IMAGE_DATA
                </div>
            </div>
        )}

        {/* Display Settings Panel */}
        {showDisplaySettings && (
             <div className="absolute top-4 left-4 z-[100] bg-white border border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-64 text-xs font-mono">
                 <div className="flex justify-between items-center mb-4">
                     <span className="font-bold uppercase">VIEW_CONFIG</span>
                     <button onClick={() => setShowDisplaySettings(false)} className="text-red-500 hover:underline">[X]</button>
                 </div>
                 <div className="space-y-4">
                     <div>
                         <label className="block mb-1">ICON_SIZE ({iconSize}px)</label>
                         <input type="range" min="80" max="300" value={iconSize} onChange={(e) => setIconSize(Number(e.target.value))} className="w-full" />
                     </div>
                     <div>
                         <label className="block mb-1">GRID_GAP ({gridGap}px)</label>
                         <input type="range" min="0" max="100" value={gridGap} onChange={(e) => setGridGap(Number(e.target.value))} className="w-full" />
                     </div>
                     <div className="flex items-center gap-2">
                         <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />
                         <label>SNAP_TO_GRID</label>
                     </div>
                 </div>
             </div>
        )}

        {/* Canvas Items */}
        <div 
            style={{ 
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                transformOrigin: '0 0',
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0
            }}
        >
            {items.map(item => (
                <DraggableImage 
                    key={item.id} 
                    item={item} 
                    isSelected={selectedIds.has(item.id)}
                    width={iconSize}
                    onMouseDown={handleItemMouseDown}
                    onDelete={handleDeleteItem}
                    onMaximize={handleMaximizeItem}
                    onContextMenu={handleItemContextMenu}
                    onDoubleClick={handleItemDoubleClick}
                />
            ))}
        </div>

        {/* Selection Box Visual */}
        {selectionBox && selectionBox.active && (
            <div 
                className="absolute border border-blue-600 bg-blue-400/20 z-[9999] pointer-events-none"
                style={{
                    left: Math.min(selectionBox.startX, selectionBox.currentX),
                    top: Math.min(selectionBox.startY, selectionBox.currentY),
                    width: Math.abs(selectionBox.currentX - selectionBox.startX),
                    height: Math.abs(selectionBox.currentY - selectionBox.startY),
                }}
            />
        )}
      </div>

      {/* --- RIGHT SIDEBAR (CONTROLS & RESULTS) --- */}
      <div className="w-[380px] h-full border-l border-black bg-white flex flex-col z-20 shadow-[-4px_0px_10px_rgba(0,0,0,0.1)] shrink-0 relative">
         <Header 
            personas={personas} 
            activePersona={activePersona}
            onOpenProfile={() => setIsProfileOpen(true)}
            onSwitchPersona={(id) => { playSound.click(); setActivePersonaId(id); }}
            onOpenSettings={() => { playSound.click(); setIsSettingsOpen(true); }}
         />

         {/* Content Area */}
         <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col">
            
            {/* Empty State */}
            {selectedIds.size === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center opacity-50">
                    <div className="text-4xl mb-2 font-light">∅</div>
                    <div className="text-xs font-mono uppercase tracking-widest">
                        NO_SELECTION<br/>SELECT_OBJECT_TO_ANALYZE
                    </div>
                </div>
            )}

            {/* Multi Selection State */}
            {isMultiSelection && (
                <div className="p-4 flex-1 flex flex-col">
                    <div className="mb-4 pb-2 border-b border-black flex justify-between items-center">
                        <span className="font-mono text-xs font-bold uppercase">&gt;&gt; BATCH_SELECTION ({selectedIds.size})</span>
                        <button onClick={handleBulkDelete} className="text-[10px] text-red-500 hover:bg-red-100 px-2 py-1 uppercase border border-transparent hover:border-red-200">
                            Clear Selected
                        </button>
                    </div>
                    
                    {/* Grid of Thumbnails - COLORED & FIXED SIZE */}
                    <div className="flex flex-wrap gap-2 content-start mb-4">
                         {selectedItemsList.map(item => (
                             <div 
                                key={item.id} 
                                className="relative group w-20 h-20 shadow-sm border border-gray-300 bg-gray-100 cursor-pointer hover:border-blue-500 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Click a thumb in multi-view to select only that one?
                                    // Or maybe just highlight? Let's assume select single.
                                    setSelectedIds(new Set([item.id]));
                                }}
                             >
                                 <img 
                                    src={item.image.url} 
                                    className="w-full h-full object-cover" // Full color, consistent size
                                    style={{ imageRendering: 'pixelated' }}
                                 />
                                 <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 pointer-events-none" />
                             </div>
                         ))}
                    </div>

                    <div className="mt-auto border-t border-black pt-4">
                        <button 
                            onClick={handleBulkGenerate}
                            disabled={loading}
                            className="w-full py-4 bg-black text-white font-mono text-sm uppercase hover:bg-blue-700 transition-all active:scale-[0.99]"
                        >
                            {loading ? "PROCESSING..." : `GENERATE ALL (${selectedIds.size})`}
                        </button>
                    </div>
                </div>
            )}

            {/* Single Selection State */}
            {!isMultiSelection && selectedItem && (
                <>
                    {/* Item Context Header - Added Thumbnail here for consistency */}
                    <div className="p-3 border-b border-gray-200 bg-gray-50 flex gap-3 items-center">
                         {/* Mini Thumbnail for Single View Consistency */}
                         <div className="w-20 h-20 border border-gray-300 shadow-sm shrink-0 bg-white">
                             <img 
                                src={selectedItem.image.url} 
                                className="w-full h-full object-cover" 
                                style={{ imageRendering: 'pixelated' }}
                             />
                         </div>
                         
                         <div className="flex-1 min-w-0 font-mono">
                             <div className="text-[10px] text-gray-500 uppercase">TARGET_ID</div>
                             <div className="text-xs font-bold truncate text-blue-700" title={selectedItem.image.file.name}>
                                 {selectedItem.image.file.name}
                             </div>
                             <div className="flex gap-2 mt-2">
                                <button onClick={() => handleDeleteItem(selectedItem.id)} className="text-[9px] uppercase hover:bg-red-500 hover:text-white px-1 border border-gray-300 text-red-500">
                                    [DELETE]
                                </button>
                                <button onClick={() => handleMaximizeItem(selectedItem.id)} className="text-[9px] uppercase hover:bg-black hover:text-white px-1 border border-gray-300 text-gray-500">
                                    [VIEW]
                                </button>
                             </div>
                         </div>
                    </div>

                    {/* Controls */}
                    <div className="p-3 border-b border-black bg-white space-y-3">
                        {/* Style Selector */}
                        <div className="grid grid-cols-2 gap-2">
                            {Object.values(CaptionStyle).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => handleStyleChange(s)}
                                    className={`
                                        py-2 text-[10px] font-mono uppercase tracking-wider border transition-all
                                        ${style === s 
                                            ? 'bg-black text-white border-black' 
                                            : 'bg-white text-gray-500 border-gray-300 hover:border-black'
                                        }
                                    `}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        {/* Model Toggles */}
                        <div 
                            onClick={handleToggleModel}
                            className="flex items-center justify-between border border-gray-300 p-2 cursor-pointer hover:bg-gray-50 group select-none"
                            title="Click to cycle Model Tier"
                        >
                            <span className="text-[10px] font-mono font-bold text-gray-500 uppercase">MODEL_ENGINE</span>
                            <span className="text-[10px] font-mono text-blue-700 group-hover:underline">
                                {getModelLabel(currentModel)}
                            </span>
                        </div>
                    </div>

                    {/* Results Area */}
                    <div className="flex-1 overflow-y-auto bg-white min-h-0">
                        {/* History Navigation - Filtered by Style */}
                        {styleVersionCount > 0 && (
                            <div className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200 px-3 py-1 flex justify-between items-center text-[10px] font-mono">
                                <button 
                                    onClick={handlePrevHistory}
                                    disabled={!canGoPrev}
                                    className="disabled:opacity-20 hover:text-blue-600 px-2 cursor-pointer disabled:cursor-default"
                                >
                                    {"< PREV"}
                                </button>
                                <span className="text-gray-500">
                                    VER {styleVersionCurrent}/{styleVersionCount}
                                </span>
                                <button 
                                    onClick={handleNextHistory}
                                    disabled={!canGoNext}
                                    className="disabled:opacity-20 hover:text-blue-600 px-2 cursor-pointer disabled:cursor-default"
                                >
                                    {"NEXT >"}
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 text-xs font-mono text-red-600 bg-red-50 border-b border-red-100 break-words">
                                {error}
                            </div>
                        )}

                        {captions.length > 0 ? (
                            <>
                                <div className="">
                                    {captions.map((cap, i) => (
                                        <CaptionTag 
                                            key={cap.id} 
                                            caption={cap} 
                                            index={i} 
                                        />
                                    ))}
                                </div>
                                <div className="pb-8">
                                    <HashtagGroup hashtags={hashtags} />
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 p-8 text-center min-h-[200px]">
                                <span className="text-2xl mb-2 opacity-50">⌨️</span>
                                <span className="text-[10px] font-mono uppercase mb-1">
                                    NO_DATA_FOR_MODE:<br/><span className="text-blue-600 font-bold">{style}</span>
                                </span>
                                <span className="text-[9px] text-gray-400">
                                    PRESS GENERATE TO INITIALIZE
                                </span>
                            </div>
                        )}
                    </div>
                    
                    {/* Generate Button Footer */}
                    <div className="p-3 border-t border-black bg-gray-50">
                        <button
                            onClick={() => handleGenerate([selectedItem])}
                            disabled={loading}
                            className={`
                                w-full py-3 
                                font-mono text-xs font-bold uppercase tracking-widest
                                transition-all duration-200
                                border border-black
                                shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                                active:translate-y-[1px] active:shadow-none
                                ${loading 
                                    ? 'bg-gray-100 text-gray-400 cursor-wait' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }
                            `}
                        >
                            {loading ? (
                                <span className="animate-pulse">PROCESSING...</span>
                            ) : (
                                `GENERATE ${style}`
                            )}
                        </button>
                    </div>
                </>
            )}
            
            {/* Loading Overlay - INSIDE CONTENT CONTAINER */}
            {loading && (
                <SystemLoader onAbort={handleCancelGeneration} />
            )}
         </div>

      </div>
    </div>
  );
};

export default App;