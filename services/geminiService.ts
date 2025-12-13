
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ImagePreview, GenerationResult, CaptionStyle, Persona, GeminiModel } from "../types";

declare var process: any;

// Strict Schema Definition for robust JSON generation
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    captions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tone: { type: Type.STRING, description: "The tone label for this caption (e.g. 'witty', 'confident')" },
          text: { type: Type.STRING, description: "The caption text ONLY. Do NOT include the emoji here." },
          translation: { type: Type.STRING, description: "A concise Chinese translation of the caption. Modern, authentic, NOT machine-translated style." },
          emoji: { type: Type.STRING, description: "A single matching emoji" },
        },
        required: ["tone", "text", "translation", "emoji"],
      },
    },
    hashtags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["captions", "hashtags"],
};

const generateSocialInstruction = (p: Persona) => `
You are ${p.name}, a ${p.age}-year-old ${p.occupation} based in ${p.location}.
Your Bio/Vibe: "${p.bio}".
Your Aesthetic: "${p.aesthetic}".
Your Speaking Style: "${p.voiceTone}".

Your Task: 
1. Write exactly 10 captions for the user's photo.
2. Generate 5-8 relevant, aesthetic hashtags.

CRITICAL CAPTION RULES:
1. LENGTH: Ultra-short. 2-8 words max.
2. AESTHETIC: Lowercase only. Minimalist.
3. TONE: ${p.voiceTone} (Mix of witty, confident, mysterious).
4. NO CLICHÉS: No "vibes", "goals", or influencer speak.
5. TRANSLATION: Provide a Chinese translation for each caption.
   - It should sound like something a cool Chinese netizen would say (Xiaohongshu style).
   - Casual, maybe slightly abstract, not rigid translation.
6. EMOJI RULE: Select exactly one matching emoji.
   - Place this emoji ONLY in the 'emoji' JSON field.
   - Do NOT include the emoji in the 'text' field.
   - PREFERRED STYLE: "${p.emojiStyle}".
   - IMPORTANT: If the style includes specific examples (e.g. "👾, 💿"), use them as INSPIRATION ONLY. 
   - YOU MUST generate a DIVERSE range of emojis that fit the vibe. Do not simply repeat the same emoji 10 times.

HASHTAG STRATEGY:
1. PRIORITIZE TRENDS: Use hashtags popular in the last 6 months.
2. AVOID GENERIC: Do NOT use generic tags like #love, #happy.
3. RELEVANCE: Ensure tags strictly relate to the visual content.
`;

const generatePoeticInstruction = (_p: Persona) => `
You are a sharp, intelligent observer with a confident, slightly dry wit.
Ignore the user's specific "Persona" details. In this mode, you embody pure "Observational Wit".

Your Task:
Generate 10 "One-Liner" captions based on the provided image.

CORE PHILOSOPHY (The "One-Liner" Way):
1. **One-liner & Witty**: Captions must be sharp, intelligent, and punchy. They should deliver a punch.
2. **Observational Wit**: Do NOT just describe feelings. Make a clever or unexpected observation about the scene. Make the audience think, "Huh, I never thought of it that way."
3. **Confidence is Key**: The tone is confident, sometimes a bit sarcastic or dry. It's the kind of line you'd say with a smirk.
4. **Subtext over Text**: Hint at a bigger story.

FORMATTING RULES:
1. **Lowercase Aesthetic**: All captions must be lowercase.
2. **No Periods**: Do not end lines with a period (unless it adds dramatic effect).
3. **TRANSLATION**: Provide a Chinese translation.
   - It should be poetic, cinematic, and moody.
   - Think "Wong Kar-wai movie subtitles".
   - Short, punchy, abstract.
4. **Emoji Variety (CRITICAL)**: 
   - Do NOT use the user's "preferred emoji style" strictly if it limits creativity.
   - You MUST select a **unique** emoji for EACH caption that specifically matches the content of that line.
   - Do not repeat emojis.
   - Place the emoji ONLY in the 'emoji' field, NOT in the 'text' field.

TONE EXAMPLES (Aim for these vibes):
- "elevator pitch for my ego"
- "texture as a love language"
- "waiting for the doors to open on a better timeline"
- "vanity is just visual journaling"
`;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const makeApiCall = async (ai: GoogleGenAI, model: string, instruction: string, image: ImagePreview, style: string) => {
  return await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: image.mimeType,
            data: image.base64,
          },
        },
        {
          text: `Generate 10 captions in the requested style (${style}). Return strictly valid JSON with English text and Chinese translation. Do not use Markdown formatting.`,
        },
      ],
    },
    config: {
      systemInstruction: instruction,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.9, // Increased creativity for emoji variety
      maxOutputTokens: 4000, 
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    },
  });
};

/**
 * Robust JSON cleaner that fixes common LLM output errors:
 * - Markdown backticks
 * - Unquoted keys (JavaScript object style)
 * - Trailing commas
 */
const cleanAndParseJson = (text: string): any => {
  if (!text) throw new Error("Empty response");

  // 1. Strip Markdown
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');

  // 2. Extract JSON object
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  }

  // 3. Fix Trailing Commas (e.g., "key": "value", } -> "key": "value" })
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  // 4. Fix Unquoted Keys (e.g., { tone: "witty" } -> { "tone": "witty" })
  // Regex looks for words followed by a colon, ensuring they aren't already quoted
  cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+?)\s*:/g, '$1"$2":');

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse failed on cleaned string:", cleaned);
    throw e;
  }
};

export const generateCaptions = async (
  image: ImagePreview, 
  style: CaptionStyle, 
  persona: Persona, 
  model: GeminiModel,
  signal?: AbortSignal
): Promise<GenerationResult> => {
  
  // BYOK Logic: Check LocalStorage first, then Env Var
  const userKey = localStorage.getItem('user_gemini_key');
  
  const envKey = process.env.API_KEY;
  const apiKey = userKey || envKey;

  if (!apiKey) {
    throw new Error("MISSING_API_KEY"); // Specialized error to be caught by UI
  }

  const ai = new GoogleGenAI({ apiKey });
  const instruction = style === CaptionStyle.POETIC 
    ? generatePoeticInstruction(persona) 
    : generateSocialInstruction(persona);

  let attempt = 0;
  const maxAttempts = 10; 
  let usedModel = model;

  while (attempt < maxAttempts) {
    if (signal?.aborted) {
        throw new Error("ABORTED");
    }

    try {
      const response = await makeApiCall(ai, usedModel, instruction, image, style);

      if (signal?.aborted) {
        throw new Error("ABORTED");
      }

      // Check for empty candidates (often caused by safety filters)
      if (!response.candidates || response.candidates.length === 0) {
          // Attempt to extract safety ratings for debugging
          console.warn(`Blocked response from ${usedModel}. Candidates empty.`);
          throw new Error("Safety/Block filter triggered (Empty Candidate)");
      }

      const text = response.text;
      if (!text) {
        throw new Error(`No response text received from Gemini (${usedModel}).`);
      }

      // Use robust parser
      let parsed;
      try {
        parsed = cleanAndParseJson(text);
      } catch (e) {
        console.error("JSON Parse Error Details:", e);
        console.debug("Raw Text:", text);
        throw new Error("Failed to parse API response: Invalid JSON format");
      }
      
      const captions = Array.isArray(parsed.captions) 
        ? parsed.captions.map((item: any, index: number) => {
            let text = item.text || "...";
            const emoji = item.emoji || "";
            const tone = item.tone || "vibe";
            const translation = item.translation || "";

            // CLEANING LOGIC FOR FLASH MODEL HALLUCINATIONS
            if (emoji) {
              text = text.split(emoji).join("").trim();
            }
            if (text.startsWith('"') && text.endsWith('"')) {
                text = text.slice(1, -1).trim();
            }
            text = text.replace(/["']+$/, "").trim();

            return {
              id: `cap-${Date.now()}-${index}`,
              text: text,
              translation: translation,
              emoji: emoji,
              tone: tone,
            };
          })
        : [];

      const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];

      if (captions.length === 0) {
         throw new Error("Invalid JSON structure: missing captions");
      }

      // Return result with the actual model used AND the style used
      return { captions, hashtags, timestamp: Date.now(), model: usedModel, style: style };

    } catch (error: any) {
      if (error.message === "ABORTED") throw error;

      // DEEP ERROR INSPECTION & ROBUST STATUS EXTRACTION
      let rawStatus = error.status;
      let apiError = error.error || error.body?.error;

      if (!apiError && (error.code || error.status)) {
        apiError = error;
      }

      if (apiError) {
        rawStatus = rawStatus || apiError.code || apiError.status;
      }
      
      const errorMessage = (error.message || apiError?.message || JSON.stringify(error)).toLowerCase();
      
      const isStatus = (code: number) => rawStatus == code;

      // 1. QUOTA / RATE LIMIT (429)
      const isQuota = 
        isStatus(429) || 
        rawStatus === 'RESOURCE_EXHAUSTED' ||
        errorMessage.includes('429') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('resource_exhausted') ||
        errorMessage.includes('too many requests');

      // 2. SERVER ERRORS, EMPTY RESPONSE, SAFETY BLOCKS, OR BAD FORMAT
      const isServerSide = 
        isStatus(500) || 
        isStatus(502) || 
        isStatus(503) || 
        isStatus(504) ||
        rawStatus === 'INTERNAL' ||
        errorMessage.includes('internal server error') ||
        errorMessage.includes('overloaded') ||
        errorMessage.includes('no response text') ||
        errorMessage.includes('safety') || 
        errorMessage.includes('blocked') ||
        errorMessage.includes('response did not contain a json object') ||
        errorMessage.includes('failed to parse api response') ||
        errorMessage.includes('invalid json structure'); 
      
      const isNotFound = 
        isStatus(404) || 
        errorMessage.includes('not found');
      
      const isRetryable = (isQuota || isServerSide || isNotFound) && attempt < maxAttempts - 1;

      if (isRetryable) {
          console.log(`[Auto-Retry] Attempt ${attempt + 1} failed with ${usedModel}. Retrying... (${errorMessage.substring(0, 100)}...)`);
      } else {
          console.error(`[Fatal] Attempt ${attempt + 1} failed with ${usedModel}.`, error);
      }

      // FALLBACK STRATEGY
      if (isRetryable) {
         // Downgrade Pro 3 -> Pro 2.5
         if (usedModel === GeminiModel.PRO_3_0) {
             usedModel = GeminiModel.PRO_2_5;
             attempt++; await delay(1000); continue;
         }
         // Downgrade Pro 2.5 -> Flash
         if (usedModel === GeminiModel.PRO_2_5) {
             usedModel = GeminiModel.FLASH;
             attempt++; await delay(1000); continue;
         }
         // Downgrade Flash -> Lite
         if (usedModel === GeminiModel.FLASH) {
             usedModel = GeminiModel.LITE;
             attempt++; await delay(1000); continue;
         }
         // SIDEGRADE Lite -> Flash (if Lite is unstable, try standard Flash)
         if (usedModel === GeminiModel.LITE) {
             usedModel = GeminiModel.FLASH;
             attempt++; await delay(1000); continue;
         }

         const baseWait = 2000 * Math.pow(1.5, attempt); 
         const jitter = Math.random() * 2000; 
         const waitTime = Math.min(baseWait + jitter, 60000); 
         await delay(waitTime);
         attempt++;
         continue;
      }

      if (attempt === maxAttempts - 1 || !isRetryable) {
        throw error;
      }
      
      attempt++;
      await delay(2000);
    }
  }

  throw new Error("Failed to generate captions after multiple attempts.");
};
