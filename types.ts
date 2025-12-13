
export enum CaptionStyle {
  SOCIAL = 'Social',
  POETIC = 'One-Liner',
}

export enum GeminiModel {
  FLASH = 'gemini-2.5-flash',
  LITE = 'gemini-2.5-flash-lite',
  PRO_2_5 = 'gemini-2.5-pro',
  PRO_3_0 = 'gemini-3-pro-preview',
}

export interface Persona {
  id: string; // Unique identifier
  name: string;
  age: string;
  occupation: string;
  location: string;
  timezone: string; // IANA Timezone string (e.g. 'America/Los_Angeles')
  bio: string;
  aesthetic: string;
  voiceTone: string;
  emojiStyle: string;
  avatar?: string; // Base64 string for the ID Card photo
}

export interface GeneratedCaption {
  id: string;
  text: string;
  translation: string; // New field for Chinese translation
  emoji: string;
  tone: string;
}

export interface GenerationResult {
  captions: GeneratedCaption[];
  hashtags: string[];
  timestamp: number;
  model: string; // Added to track which model generated this result
  style: CaptionStyle; // Added to track which style mode generated this
}

export interface ImagePreview {
  file: File;
  url: string;
  base64: string;
  mimeType: string;
}

export interface CanvasItem {
  id: string;
  image: ImagePreview;
  history: GenerationResult[];
  viewIndex: number; // Track which history entry is visible
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
}
